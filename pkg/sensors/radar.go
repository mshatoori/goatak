package sensors

import (
	"bufio"
	"context"
	"fmt"
	"log/slog"
	"net"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/adrianmo/go-nmea"
	"github.com/google/uuid"
	"github.com/kdudkov/goatak/pkg/cot"
	"github.com/kdudkov/goatak/pkg/cotproto"
	"github.com/kdudkov/goatak/pkg/model"
)

const (
	RadarStaleTime = time.Second * 3600
	RadarType      = "Radar"
	DebugRadar     = false
)

type RadarSensor struct {
	Addr     string
	Conn     net.Conn
	Logger   *slog.Logger
	UID      string
	Interval time.Duration
	Ctx      context.Context

	sendBuffer map[int]*cotproto.CotEvent

	mu         sync.Mutex
	cancelFunc context.CancelFunc

	Title string
}

func NewRadarSensor(sensorModel *model.SensorModel, logger *slog.Logger) *RadarSensor {
	return &RadarSensor{
		Addr:     fmt.Sprintf(":%d", sensorModel.Port), // Skipping IP
		Conn:     nil,
		Logger:   logger,
		UID:      uuid.New().String(),
		Interval: time.Second * time.Duration(sensorModel.Interval),
		Ctx:      context.Background(),
		Title:    sensorModel.Title,
	}
}

func (sensor *RadarSensor) Initialize() bool {
	if DebugRadar {
		sensor.Logger.Debug("RadarSensor.Initialize", "addr", sensor.Addr)
	}
	addr, err := net.ResolveUDPAddr("udp", sensor.Addr)
	if err != nil {
		if DebugRadar {
			sensor.Logger.Debug("RadarSensor can't resolve")
		}
		return false
	}

	sensor.Conn, err = net.ListenUDP("udp", addr)
	if err != nil {
		if DebugRadar {
			sensor.Logger.Debug("RadarSensor can't listen", "error", err.Error())
		}
		return false
	}

	sensor.Ctx, sensor.cancelFunc = context.WithCancel(sensor.Ctx)
	sensor.sendBuffer = make(map[int]*cotproto.CotEvent)

	return true
}

func (sensor *RadarSensor) sendLoop(cb func(data any)) {
	ticker := time.NewTicker(sensor.Interval)
	for {
		select {
		case <-ticker.C:
			if DebugRadar {
				sensor.Logger.Debug(fmt.Sprintf("RadarSensor [%s] tick", sensor.UID))
			}

			sensor.mu.Lock()
			for _, event := range sensor.sendBuffer {
				if DebugRadar {
					sensor.Logger.Warn("RadarSensor sending data: ", "data", event.String())
				}
				cb(event)
			}
			sensor.sendBuffer = make(map[int]*cotproto.CotEvent)
			sensor.mu.Unlock()

		case <-sensor.Ctx.Done():
			return
		}
	}
}

func (sensor *RadarSensor) Start(cb func(data any)) {
	go sensor.sendLoop(cb)
	go sensor.handleRead()
}

func (sensor *RadarSensor) handleRead() {
	reader := bufio.NewReader(sensor.Conn)

	for sensor.Ctx.Err() == nil {
		if DebugRadar {
			sensor.Logger.Debug(fmt.Sprintf("RadarSensor TryingRead"))
		}
		sentenceStr, _ := reader.ReadString('\n')
		if DebugRadar {
			sensor.Logger.Debug(fmt.Sprintf("RadarSensor Read [%s] %s", sensor.UID, sentenceStr))
		}
		sentence, _ := nmea.Parse(sentenceStr)
		switch sentence.(type) {
		case nmea.TLL:
			ttlSentence := sentence.(nmea.TLL)

			today := nmea.Date{
				Valid: true,
				DD:    time.Now().UTC().Day(),
				MM:    int(time.Now().UTC().Month()),
				YY:    time.Now().UTC().Year(),
			}

			startTime := nmea.DateTime(0, today, ttlSentence.TimeUTC)

			sensor.mu.Lock()
			sensor.sendBuffer[int(ttlSentence.TargetNumber)] = &cotproto.CotEvent{
				Type:      "a-u-X",
				Uid:       fmt.Sprintf("RADAR-TARGET-%d", ttlSentence.TargetNumber),
				How:       "m-g", // TODO: Is this correct?
				Lat:       ttlSentence.TargetLatitude,
				Lon:       ttlSentence.TargetLongitude,
				Hae:       999999,
				Ce:        999999,
				Le:        999999,
				StartTime: cot.TimeToMillis(startTime),
				// SendTime:  cot.TimeToMillis(startTime),  // SendTime should be set when sending event
				StaleTime: cot.TimeToMillis(startTime.Add(RadarStaleTime)),
				Detail: &cotproto.Detail{
					Contact: &cotproto.Contact{
						Callsign: ttlSentence.TargetName,
					},
				},
			}
			sensor.mu.Unlock()

		case nmea.TTM:
			if DebugRadar {
				sensor.Logger.Debug("RadarSensor TTM messages are not supported yet!")
			}
		}
	}
	if DebugRadar {
		sensor.Logger.Debug("RadarSensor stopping")
	}
}

func (sensor *RadarSensor) GetType() string {
	return RadarType
}

func (sensor *RadarSensor) ToSensorModel() *model.SensorModel {
	addrParts := strings.Split(sensor.Addr, ":")
	gpsPort, _ := strconv.Atoi(addrParts[1])

	sensorModel := model.SensorModel{
		Addr:     addrParts[0],
		Port:     gpsPort,
		UID:      sensor.UID,
		Type:     RadarType,
		Interval: int(sensor.Interval / time.Second),
		Title:    sensor.Title,
	}

	return &sensorModel
}

func (sensor *RadarSensor) GetUID() string {
	return sensor.UID
}

func (sensor *RadarSensor) Stop() {
	sensor.Conn.Close()
	sensor.cancelFunc()
}
