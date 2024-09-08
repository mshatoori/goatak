package sensors

import (
	"bufio"
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/kdudkov/goatak/pkg/model"

	"github.com/kdudkov/goatak/pkg/cot"
	"github.com/kdudkov/goatak/pkg/cotproto"
)

const (
	DefaultAddress = "localhost:2947"
	DialTimeout    = time.Millisecond * 500
	StaleTime      = time.Second * 3600
)

type BaseMsg struct {
	Class string `json:"class"`
}

type TPVMsg struct {
	Class  string    `json:"class"`
	Tag    string    `json:"tag"`
	Device string    `json:"device"`
	Mode   int       `json:"mode"`
	Time   time.Time `json:"time"`
	Ept    float64   `json:"ept"`
	Lat    float64   `json:"lat"`
	Lon    float64   `json:"lon"`
	Alt    float64   `json:"alt"`
	Epx    float64   `json:"epx"`
	Epy    float64   `json:"epy"`
	Epv    float64   `json:"epv"`
	Track  float64   `json:"track"`
	Speed  float64   `json:"speed"`
	Climb  float64   `json:"climb"`
	Epd    float64   `json:"epd"`
	Eps    float64   `json:"eps"`
	Epc    float64   `json:"epc"`
	Eph    float64   `json:"eph"`
}

type VERSIONMsg struct {
	Class      string `json:"class"`
	Release    string `json:"release"`
	Rev        string `json:"rev"`
	ProtoMajor int    `json:"proto_major"`
	ProtoMinor int    `json:"proto_minor"`
	Remote     string `json:"remote"`
}

type GpsdSensor struct {
	Addr        string
	Conn        net.Conn
	Logger      *slog.Logger
	Reader      *bufio.Reader
	Type        string // Could be GPS or AIS
	UID         string
	Interval    time.Duration
	Ctx         context.Context
	latestEvent *cotproto.CotEvent

	mu         sync.Mutex
	cancelFunc context.CancelFunc

	Title string
}

func (sensor *GpsdSensor) Stop() {
	sensor.cancelFunc()
}

func (sensor *GpsdSensor) Initialize() bool {
	sensor.Ctx, sensor.cancelFunc = context.WithCancel(sensor.Ctx)
	return true
}

func (sensor *GpsdSensor) sendLoop(cb func(data any)) {
	ticker := time.NewTicker(sensor.Interval)
	for {
		select {
		case <-ticker.C:
			sensor.Logger.Warn(fmt.Sprintf("GPS sensor [%s] tick", sensor.UID))
			sensor.mu.Lock()
			if sensor.latestEvent != nil {
				sensor.Logger.Warn("GPS sensor sending data")
				cb(sensor.latestEvent)
				sensor.latestEvent = nil
			}
			sensor.mu.Unlock()
		case <-sensor.Ctx.Done():
			return
		}
	}
}

func (sensor *GpsdSensor) Start(cb func(data any)) {
	sensor.connect()

	go sensor.sendLoop(cb)

	for sensor.Ctx.Err() == nil {
		if sensor.Conn == nil {
			if !sensor.connect() {
				return
			}
		}

		line, err := sensor.Reader.ReadString('\n')

		if err != nil {
			sensor.Logger.Error("error", "error", err)

			_ = sensor.Conn.Close()
			sensor.Conn = nil
			continue
		}

		data := []byte(line)

		var msg BaseMsg

		if err1 := json.Unmarshal(data, &msg); err1 != nil {
			sensor.Logger.Error("JSON decode error", "error", err1)
			sensor.Logger.Debug("bad json: " + line)
			_ = sensor.Conn.Close()
			sensor.Conn = nil
			continue
		}

		sensor.Logger.Info(fmt.Sprintf("got gpsd msg %s %s", msg, data))

		switch msg.Class {
		case "TPV":
			if sensor.Type != "GPS" {
				continue
			}
			var r *TPVMsg
			if err1 := json.Unmarshal(data, &r); err1 != nil {
				sensor.Logger.Error("JSON decode error", "error", err1)
			}

			sensor.mu.Lock()
			sensor.latestEvent = &cotproto.CotEvent{
				Uid:       "$self.pos",
				How:       "m-g",
				Lat:       r.Lat,
				Lon:       r.Lon,
				Hae:       r.Alt,
				StaleTime: cot.TimeToMillis(time.Now().Add(StaleTime)),
				Detail: &cotproto.Detail{
					Track: &cotproto.Track{
						Speed:  r.Speed,
						Course: r.Track,
					},
					PrecisionLocation: &cotproto.PrecisionLocation{
						Geopointsrc: "GPS",
						Altsrc:      "GPS",
					},
				},
			}
			sensor.mu.Unlock()

		case "AIS":
			if sensor.Type != "AIS" {
				continue
			}

			sensorData := make([]*cotproto.SensorData, 0)
			sensorData = append(sensorData, &cotproto.SensorData{
				SensorName: "AIS",
				Value:      string(data),
			})

			sensor.mu.Lock()
			sensor.latestEvent = &cotproto.CotEvent{
				Uid:       "$self.ais",
				StaleTime: cot.TimeToMillis(time.Now().Add(StaleTime)),
				Detail:    &cotproto.Detail{SensorData: sensorData},
			}
			sensor.mu.Unlock()

		case "VERSION":
			var r *VERSIONMsg
			if err1 := json.Unmarshal(data, &r); err1 != nil {
				sensor.Logger.Error("JSON decode error", "error", err1)
			}
			sensor.Logger.Info(fmt.Sprintf("got version %s, rev. %s", r.Release, r.Rev))
		}
	}
}

func (sensor *GpsdSensor) connect() bool {
	timeout := time.Second * 5

	for {
		conn, err := net.DialTimeout("tcp4", sensor.Addr, DialTimeout)

		if err == nil {
			sensor.Conn = conn
			sensor.Reader = bufio.NewReader(sensor.Conn)

			_, _ = fmt.Fprintf(sensor.Conn, "?WATCH={\"enable\":true,\"json\":true}")

			return true
		}

		sensor.Logger.Error("dial error", "error", err)

		select {
		case <-time.After(timeout):
		case <-sensor.Ctx.Done():
			sensor.Logger.Error("stop connection attempts")
			return false
		}

		if timeout < time.Minute {
			timeout = timeout * 2
		}
	}
}

func (sensor *GpsdSensor) GetType() string {
	return sensor.Type
}

func (sensor *GpsdSensor) ToSensorModel() *model.SensorModel {
	gpsAddrParts := strings.Split(sensor.Addr, ":")
	gpsPort, _ := strconv.Atoi(gpsAddrParts[1])
	sensorModel := model.SensorModel{
		Addr:     gpsAddrParts[0],
		Port:     gpsPort,
		UID:      sensor.UID,
		Type:     sensor.Type,
		Interval: int(sensor.Interval / time.Second),
		Title:    sensor.Title,
	}
	return &sensorModel
}

func (sensor *GpsdSensor) GetUID() string {
	return sensor.UID
}
