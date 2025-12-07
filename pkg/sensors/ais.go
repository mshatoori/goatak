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
	"sync/atomic"
	"time"

	ais "github.com/BertoldVdb/go-ais"
	"github.com/BertoldVdb/go-ais/aisnmea"
	"github.com/kdudkov/goatak/pkg/cot"
	"github.com/kdudkov/goatak/pkg/cotproto"
	"github.com/kdudkov/goatak/pkg/model"
)

const (
	AISStaleTime = time.Second * 3600
	AISType      = "AIS"
	DebugAIS     = true
)

// AISVessel holds vessel information from static and position reports
type AISVessel struct {
	MMSI      uint32
	Name      string
	CallSign  string
	Lat       float64
	Lon       float64
	Speed     float64
	Course    float64
	Heading   uint16
	Timestamp time.Time
}

type AISSensor struct {
	active   int32
	Addr     string
	Conn     net.Conn
	Logger   *slog.Logger
	UID      string
	Interval time.Duration
	Ctx      context.Context

	sendBuffer map[uint32]*cotproto.CotEvent
	vesselData map[uint32]*AISVessel

	mu         sync.Mutex
	cancelFunc context.CancelFunc

	Title string

	codec     *ais.Codec
	nmeaCodec *aisnmea.NMEACodec
}

func NewAISSensor(sensorModel *model.SensorModel, logger *slog.Logger) *AISSensor {
	return &AISSensor{
		Addr:     fmt.Sprintf(":%d", sensorModel.Port),
		Conn:     nil,
		Logger:   logger,
		UID:      sensorModel.UID,
		Interval: time.Second * time.Duration(sensorModel.Interval),
		Ctx:      context.Background(),
		Title:    sensorModel.Title,
		active:   0,
	}
}

func (sensor *AISSensor) Initialize() bool {
	if DebugAIS {
		sensor.Logger.Debug("AISSensor.Initialize", "addr", sensor.Addr)
	}

	addr, err := net.ResolveUDPAddr("udp", sensor.Addr)
	if err != nil {
		if DebugAIS {
			sensor.Logger.Debug("AISSensor can't resolve")
		}
		return false
	}

	sensor.Conn, err = net.ListenUDP("udp", addr)
	if err != nil {
		if DebugAIS {
			sensor.Logger.Debug("AISSensor can't listen", "error", err.Error())
		}
		return false
	}

	sensor.Ctx, sensor.cancelFunc = context.WithCancel(sensor.Ctx)
	sensor.sendBuffer = make(map[uint32]*cotproto.CotEvent)
	sensor.vesselData = make(map[uint32]*AISVessel)

	// Initialize AIS codec
	sensor.codec = ais.CodecNew(false, false)
	sensor.codec.DropSpace = true

	// Initialize NMEA codec for parsing AIVDM sentences
	sensor.nmeaCodec = aisnmea.NMEACodecNew(sensor.codec)

	sensor.active = 1

	return true
}

func (sensor *AISSensor) sendLoop(cb func(data any)) {
	ticker := time.NewTicker(sensor.Interval)
	for {
		select {
		case <-ticker.C:
			if DebugAIS {
				sensor.Logger.Debug(fmt.Sprintf("AISSensor [%s] tick", sensor.UID))
			}

			sensor.mu.Lock()
			for _, event := range sensor.sendBuffer {
				if DebugAIS {
					sensor.Logger.Warn("AISSensor sending data: ", "data", event.String())
				}
				cb(event)
			}
			sensor.sendBuffer = make(map[uint32]*cotproto.CotEvent)
			sensor.mu.Unlock()

		case <-sensor.Ctx.Done():
			return
		}
	}
}

func (sensor *AISSensor) Start(cb func(data any)) {
	if sensor.active == 1 {
		go sensor.sendLoop(cb)
		go sensor.handleRead()
	} else {
		sensor.Logger.Error("AISSensor inactive!")
	}
}

func (sensor *AISSensor) handleRead() {
	reader := bufio.NewReader(sensor.Conn)

	for sensor.Ctx.Err() == nil {
		if DebugAIS {
			sensor.Logger.Debug("AISSensor TryingRead")
		}

		sentenceStr, err := reader.ReadString('\n')
		if err != nil {
			if DebugAIS {
				sensor.Logger.Debug("AISSensor read error", "error", err.Error())
			}
			continue
		}

		sentenceStr = strings.TrimSpace(sentenceStr)
		if DebugAIS {
			sensor.Logger.Debug(fmt.Sprintf("AISSensor Read [%s] %s", sensor.UID, sentenceStr))
		}

		// Parse AIVDM/AIVDO sentence
		if !strings.HasPrefix(sentenceStr, "!AIVDM") && !strings.HasPrefix(sentenceStr, "!AIVDO") {
			continue
		}

		result, err := sensor.nmeaCodec.ParseSentence(sentenceStr)
		if err != nil {
			if DebugAIS {
				sensor.Logger.Debug("AISSensor parse error", "error", err.Error())
			}
			continue
		}

		if result == nil {
			if DebugAIS {
				sensor.Logger.Debug("AISSensor: incomplete or invalid sentence")
			}
			continue
		}

		sensor.processAISMessage(result)
	}

	if DebugAIS {
		sensor.Logger.Debug("AISSensor stopping")
	}
}

func (sensor *AISSensor) processAISMessage(result *aisnmea.VdmPacket) {
	if result.Packet == nil {
		return
	}

	// Get the decoded AIS message
	packet := result.Packet

	sensor.mu.Lock()
	defer sensor.mu.Unlock()

	now := time.Now()

	// Handle different AIS message types
	switch msg := packet.(type) {
	case ais.PositionReport:
		// Message types 1, 2, 3 - Class A Position Report
		mmsi := msg.Header.UserID
		lat := float64(msg.Latitude)  // / 600000.0
		lon := float64(msg.Longitude) // / 600000.0

		// Validate coordinates
		if lat < -90 || lat > 90 || lon < -180 || lon > 180 {
			return
		}

		// Skip invalid positions (91, 181 indicate unavailable)
		if lat > 90 || lon > 180 {
			return
		}

		vessel, exists := sensor.vesselData[mmsi]
		if !exists {
			vessel = &AISVessel{MMSI: mmsi}
			sensor.vesselData[mmsi] = vessel
		}

		vessel.Lat = lat
		vessel.Lon = lon
		vessel.Speed = float64(msg.Sog) / 10.0 // Speed in knots * 10
		vessel.Course = float64(msg.Cog) / 10.0
		vessel.Heading = msg.TrueHeading
		vessel.Timestamp = now

		sensor.createCotEvent(vessel)

	case ais.ShipStaticData:
		// Message type 5 - Ship Static and Voyage Related Data
		mmsi := msg.Header.UserID

		vessel, exists := sensor.vesselData[mmsi]
		if !exists {
			vessel = &AISVessel{MMSI: mmsi}
			sensor.vesselData[mmsi] = vessel
		}

		vessel.Name = strings.TrimSpace(msg.Name)
		vessel.CallSign = strings.TrimSpace(msg.CallSign)

		// If we have position data, create/update the event
		if vessel.Lat != 0 || vessel.Lon != 0 {
			sensor.createCotEvent(vessel)
		}

	case ais.StandardClassBPositionReport:
		// Message type 18 - Standard Class B CS Position Report
		mmsi := msg.Header.UserID
		lat := float64(msg.Latitude)  // / 600000.0
		lon := float64(msg.Longitude) // / 600000.0

		if lat < -90 || lat > 90 || lon < -180 || lon > 180 {
			return
		}

		vessel, exists := sensor.vesselData[mmsi]
		if !exists {
			vessel = &AISVessel{MMSI: mmsi}
			sensor.vesselData[mmsi] = vessel
		}

		vessel.Lat = lat
		vessel.Lon = lon
		vessel.Speed = float64(msg.Sog) / 10.0
		vessel.Course = float64(msg.Cog) / 10.0
		vessel.Heading = msg.TrueHeading
		vessel.Timestamp = now

		sensor.createCotEvent(vessel)

	case ais.ExtendedClassBPositionReport:
		// Message type 19 - Extended Class B CS Position Report
		mmsi := msg.Header.UserID
		lat := float64(msg.Latitude)  // / 600000.0
		lon := float64(msg.Longitude) // / 600000.0

		if lat < -90 || lat > 90 || lon < -180 || lon > 180 {
			return
		}

		vessel, exists := sensor.vesselData[mmsi]
		if !exists {
			vessel = &AISVessel{MMSI: mmsi}
			sensor.vesselData[mmsi] = vessel
		}

		vessel.Lat = lat
		vessel.Lon = lon
		vessel.Speed = float64(msg.Sog) / 10.0
		vessel.Course = float64(msg.Cog) / 10.0
		vessel.Heading = msg.TrueHeading
		vessel.Name = strings.TrimSpace(msg.Name)
		vessel.Timestamp = now

		sensor.createCotEvent(vessel)

	case ais.StaticDataReport:
		// Message type 24 - Class B CS Static Data Report
		mmsi := msg.Header.UserID

		vessel, exists := sensor.vesselData[mmsi]
		if !exists {
			vessel = &AISVessel{MMSI: mmsi}
			sensor.vesselData[mmsi] = vessel
		}

		if msg.Valid {
			if !msg.PartNumber {
				// Part A (PartNumber == false)
				vessel.Name = strings.TrimSpace(msg.ReportA.Name)
			} else {
				// Part B (PartNumber == true)
				vessel.CallSign = strings.TrimSpace(msg.ReportB.CallSign)
			}
		}

		if vessel.Lat != 0 || vessel.Lon != 0 {
			sensor.createCotEvent(vessel)
		}
	}
}

func (sensor *AISSensor) createCotEvent(vessel *AISVessel) {
	callsign := vessel.Name
	if callsign == "" {
		callsign = fmt.Sprintf("MMSI-%d", vessel.MMSI)
	}
	if vessel.CallSign != "" && vessel.Name != "" {
		callsign = fmt.Sprintf("%s (%s)", vessel.Name, vessel.CallSign)
	}

	// a-n-S-X-M is the CoT type for neutral/surface/vessel
	sensor.sendBuffer[vessel.MMSI] = &cotproto.CotEvent{
		Type:      "a-n-S-X-M",
		Uid:       fmt.Sprintf("AIS-%d", vessel.MMSI),
		How:       "m-g",
		Lat:       vessel.Lat,
		Lon:       vessel.Lon,
		Hae:       0,
		Ce:        999999,
		Le:        999999,
		StartTime: cot.TimeToMillis(vessel.Timestamp),
		StaleTime: cot.TimeToMillis(vessel.Timestamp.Add(AISStaleTime)),
		Detail: &cotproto.Detail{
			Contact: &cotproto.Contact{
				Callsign: callsign,
			},
			Track: &cotproto.Track{
				Speed:  vessel.Speed * 0.514444, // Convert knots to m/s
				Course: vessel.Course,
			},
		},
	}
}

func (sensor *AISSensor) GetType() string {
	return AISType
}

func (sensor *AISSensor) ToSensorModel() *model.SensorModel {
	addrParts := strings.Split(sensor.Addr, ":")
	port, _ := strconv.Atoi(addrParts[1])

	sensorModel := model.SensorModel{
		Addr:     addrParts[0],
		Port:     port,
		UID:      sensor.UID,
		Type:     AISType,
		Interval: int(sensor.Interval / time.Second),
		Title:    sensor.Title,
	}

	return &sensorModel
}

func (sensor *AISSensor) GetUID() string {
	return sensor.UID
}

func (sensor *AISSensor) Stop() {
	if atomic.CompareAndSwapInt32(&sensor.active, 1, 0) {
		sensor.Conn.Close()
		sensor.cancelFunc()
	}
}

func (sensor *AISSensor) IsActive() bool {
	return atomic.LoadInt32(&sensor.active) == 1
}
