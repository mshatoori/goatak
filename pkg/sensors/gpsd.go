package sensors

import (
	"bufio"
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net"
	"time"

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
	Addr   string
	Conn   net.Conn
	Logger *slog.Logger
	Reader *bufio.Reader
}

func (sensor *GpsdSensor) Initialize(ctx context.Context) bool {
	return true
}

func (sensor *GpsdSensor) Start(ctx context.Context, cb func(data any)) {
	sensor.connect(ctx)
	
	for ctx.Err() == nil {
		if sensor.Conn == nil {
			if !sensor.connect(ctx) {
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
			var r *TPVMsg
			if err1 := json.Unmarshal(data, &r); err1 != nil {
				sensor.Logger.Error("JSON decode error", "error", err1)
			}

			if cb != nil {
				var posCoTEvent = &cotproto.CotEvent{
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
				cb(posCoTEvent)
			}
		case "AIS":
			if cb != nil {
				sensorData := make([]*cotproto.SensorData, 1)
				sensorData = append(sensorData, &cotproto.SensorData{
					SensorName: "AIS",
					Value:      string(data),
				})

				var aisCoTEvent = &cotproto.CotEvent{
					Uid:       "$self.ais",
					StaleTime: cot.TimeToMillis(time.Now().Add(StaleTime)),
					Detail:    &cotproto.Detail{SensorData: sensorData},
				}
				cb(aisCoTEvent)
			}
		case "VERSION":
			var r *VERSIONMsg
			if err1 := json.Unmarshal(data, &r); err1 != nil {
				sensor.Logger.Error("JSON decode error", "error", err1)
			}
			sensor.Logger.Info(fmt.Sprintf("got version %s, rev. %s", r.Release, r.Rev))
		}
	}
}

func (sensor *GpsdSensor) connect(ctx context.Context) bool {
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
		case <-ctx.Done():
			sensor.Logger.Error("stop connection attempts")
			return false
		}

		if timeout < time.Minute {
			timeout = timeout * 2
		}
	}
}
