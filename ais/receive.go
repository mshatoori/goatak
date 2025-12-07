package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net"
	"strings"
	"time"

	ais "github.com/BertoldVdb/go-ais"
	"github.com/BertoldVdb/go-ais/aisnmea"
	aisstream "github.com/aisstream/ais-message-models/golang/aisStream"
	"github.com/gorilla/websocket"
)

const (
	apiKey          = "410ed83aabd8f071b2dbfa28199d7c7f1506a650"
	streamURL       = "wss://stream.aisstream.io/v0/stream"
	boundingBoxLat1 = 25.0
	boundingBoxLon1 = 43.0
	boundingBoxLat2 = 40.0
	boundingBoxLon2 = 63.0
	udpTarget       = "localhost:1234"
)

// convertPositionReport converts aisstream PositionReport to go-ais PositionReport
func convertPositionReport(src *aisstream.PositionReport) ais.Packet {
	return ais.PositionReport{
		Header: ais.Header{
			MessageID:       uint8(src.MessageID),
			RepeatIndicator: uint8(src.RepeatIndicator),
			UserID:          uint32(src.UserID),
		},
		Valid:                     true,
		NavigationalStatus:        uint8(src.NavigationalStatus),
		RateOfTurn:                int16(src.RateOfTurn),
		Sog:                       ais.Field10(src.Sog),
		PositionAccuracy:          src.PositionAccuracy,
		Longitude:                 ais.FieldLatLonFine(src.Longitude),
		Latitude:                  ais.FieldLatLonFine(src.Latitude),
		Cog:                       ais.Field10(src.Cog),
		TrueHeading:               uint16(src.TrueHeading),
		Timestamp:                 uint8(src.Timestamp),
		SpecialManoeuvreIndicator: uint8(src.SpecialManoeuvreIndicator),
		Raim:                      src.Raim,
		CommunicationStateNoItdma: ais.CommunicationStateNoItdma{
			CommunicationState: uint32(src.CommunicationState),
		},
	}
}

// convertShipStaticData converts aisstream ShipStaticData to go-ais ShipStaticData
func convertShipStaticData(src *aisstream.ShipStaticData) ais.Packet {
	dimension := ais.FieldDimension{
		A: uint16(src.Dimension.A),
		B: uint16(src.Dimension.B),
		C: uint8(src.Dimension.C),
		D: uint8(src.Dimension.D),
	}

	eta := ais.FieldETA{
		Month:  uint8(src.Eta.Month),
		Day:    uint8(src.Eta.Day),
		Hour:   uint8(src.Eta.Hour),
		Minute: uint8(src.Eta.Minute),
	}

	return ais.ShipStaticData{
		Header: ais.Header{
			MessageID:       uint8(src.MessageID),
			RepeatIndicator: uint8(src.RepeatIndicator),
			UserID:          uint32(src.UserID),
		},
		Valid:                true,
		AisVersion:           uint8(src.AisVersion),
		ImoNumber:            uint32(src.ImoNumber),
		CallSign:             src.CallSign,
		Name:                 src.Name,
		Type:                 uint8(src.Type),
		Dimension:            dimension,
		FixType:              uint8(src.FixType),
		Eta:                  eta,
		MaximumStaticDraught: ais.Field10(src.MaximumStaticDraught),
		Destination:          src.Destination,
		Dte:                  src.Dte,
	}
}

// convertStandardClassBPositionReport converts aisstream StandardClassBPositionReport to go-ais
func convertStandardClassBPositionReport(src *aisstream.StandardClassBPositionReport) ais.Packet {
	return ais.StandardClassBPositionReport{
		Header: ais.Header{
			MessageID:       uint8(src.MessageID),
			RepeatIndicator: uint8(src.RepeatIndicator),
			UserID:          uint32(src.UserID),
		},
		Valid:            true,
		Sog:              ais.Field10(src.Sog),
		PositionAccuracy: src.PositionAccuracy,
		Longitude:        ais.FieldLatLonFine(src.Longitude),
		Latitude:         ais.FieldLatLonFine(src.Latitude),
		Cog:              ais.Field10(src.Cog),
		TrueHeading:      uint16(src.TrueHeading),
		Timestamp:        uint8(src.Timestamp),
		ClassBUnit:       src.ClassBUnit,
		ClassBDisplay:    src.ClassBDisplay,
		ClassBDsc:        src.ClassBDsc,
		ClassBBand:       src.ClassBBand,
		ClassBMsg22:      src.ClassBMsg22,
		AssignedMode:     src.AssignedMode,
		Raim:             src.Raim,
		CommunicationStateItdma: ais.CommunicationStateItdma{
			CommunicationStateIsItdma: src.CommunicationStateIsItdma,
			CommunicationState:        uint32(src.CommunicationState),
		},
	}
}

// convertStaticDataReport converts aisstream StaticDataReport to go-ais
func convertStaticDataReport(src *aisstream.StaticDataReport) ais.Packet {
	result := ais.StaticDataReport{
		Header: ais.Header{
			MessageID:       uint8(src.MessageID),
			RepeatIndicator: uint8(src.RepeatIndicator),
			UserID:          uint32(src.UserID),
		},
		Valid:      true,
		PartNumber: src.PartNumber,
	}

	if !src.PartNumber {
		// Part A
		result.ReportA = ais.StaticDataReportA{
			Valid: true,
			Name:  src.ReportA.Name,
		}
	} else {
		// Part B
		dimension := ais.FieldDimension{
			A: uint16(src.ReportB.Dimension.A),
			B: uint16(src.ReportB.Dimension.B),
			C: uint8(src.ReportB.Dimension.C),
			D: uint8(src.ReportB.Dimension.D),
		}
		result.ReportB = ais.StaticDataReportB{
			Valid:          true,
			ShipType:       uint8(src.ReportB.ShipType),
			VendorIDName:   src.ReportB.VendorIDName,
			VenderIDModel:  uint8(src.ReportB.VenderIDModel),
			VenderIDSerial: uint32(src.ReportB.VenderIDSerial),
			CallSign:       src.ReportB.CallSign,
			Dimension:      dimension,
			FixType:        uint8(src.ReportB.FixType),
		}
	}

	return result
}

// encodeAndSend encodes an AIS packet to NMEA and sends it via UDP
func encodeAndSend(nmeaCodec *aisnmea.NMEACodec, packet ais.Packet, udpConn *net.UDPConn) {
	vdmPacket := aisnmea.VdmPacket{
		TalkerID:    "AI",
		MessageType: "VDM",
		Packet:      packet,
		Channel:     1, // Channel A
	}

	sentences := nmeaCodec.EncodeSentence(vdmPacket)
	for _, sentence := range sentences {
		// Ensure the NMEA sentence ends with CRLF
		if !strings.HasSuffix(sentence, "\r\n") {
			sentence = sentence + "\r\n"
		}
		_, err := udpConn.Write([]byte(sentence))
		if err != nil {
			log.Printf("Error sending UDP packet: %v", err)
		} else {
			log.Printf("Sent NMEA: %s", strings.TrimSpace(sentence))
		}
	}
}

func connectAISStream() error {
	log.Printf("[%s] Starting AIS stream connection to %s", time.Now().Format(time.RFC3339), streamURL)

	// Initialize AIS codec
	codec := ais.CodecNew(false, false)
	nmeaCodec := aisnmea.NMEACodecNew(codec)

	// Setup UDP connection
	udpAddr, err := net.ResolveUDPAddr("udp", udpTarget)
	if err != nil {
		return fmt.Errorf("failed to resolve UDP address: %w", err)
	}
	udpConn, err := net.DialUDP("udp", nil, udpAddr)
	if err != nil {
		return fmt.Errorf("failed to create UDP connection: %w", err)
	}
	defer udpConn.Close()
	log.Printf("[%s] UDP connection established to %s", time.Now().Format(time.RFC3339), udpTarget)

	// Connect to WebSocket
	log.Printf("[%s] Establishing WebSocket connection...", time.Now().Format(time.RFC3339))
	conn, _, err := websocket.DefaultDialer.Dial(streamURL, nil)
	if err != nil {
		log.Printf("[%s] Failed to connect to WebSocket: %v", time.Now().Format(time.RFC3339), err)
		return fmt.Errorf("failed to connect to WebSocket: %w", err)
	}
	defer conn.Close()
	log.Printf("[%s] WebSocket connection established successfully", time.Now().Format(time.RFC3339))

	// Create subscription message
	log.Printf("[%s] Creating subscription message with bounding box [[%.1f,%.1f],[%.1f,%.1f]]", time.Now().Format(time.RFC3339), boundingBoxLat1, boundingBoxLon1, boundingBoxLat2, boundingBoxLon2)
	subscribeMsg := aisstream.SubscriptionMessage{
		APIKey: apiKey,
		BoundingBoxes: [][][]float64{
			{{boundingBoxLat1, boundingBoxLon1}, {boundingBoxLat2, boundingBoxLon2}},
		},
	}

	// Send subscription message
	log.Printf("[%s] Sending subscription message to AIS stream...", time.Now().Format(time.RFC3339))
	if err := conn.WriteJSON(subscribeMsg); err != nil {
		log.Printf("[%s] Failed to send subscription message: %v", time.Now().Format(time.RFC3339), err)
		return fmt.Errorf("failed to send subscription message: %w", err)
	}
	log.Printf("[%s] Subscription message sent successfully. Waiting for AIS data...", time.Now().Format(time.RFC3339))

	// Receive and process messages
	for {
		_, messageData, err := conn.ReadMessage()
		if err != nil {
			return fmt.Errorf("error reading message: %w", err)
		}

		var packet aisstream.AisStreamMessage
		if err := json.Unmarshal(messageData, &packet); err != nil {
			log.Printf("Error unmarshaling message: %v", err)
			continue
		}

		// Convert aisstream message to go-ais packet and encode to NMEA
		var aisPacket ais.Packet

		switch packet.MessageType {
		case aisstream.POSITION_REPORT:
			if packet.Message.PositionReport != nil {
				aisPacket = convertPositionReport(packet.Message.PositionReport)
			}
		case aisstream.SHIP_STATIC_DATA:
			if packet.Message.ShipStaticData != nil {
				aisPacket = convertShipStaticData(packet.Message.ShipStaticData)
			}
		case aisstream.STANDARD_CLASS_B_POSITION_REPORT:
			if packet.Message.StandardClassBPositionReport != nil {
				aisPacket = convertStandardClassBPositionReport(packet.Message.StandardClassBPositionReport)
			}
		case aisstream.STATIC_DATA_REPORT:
			if packet.Message.StaticDataReport != nil {
				aisPacket = convertStaticDataReport(packet.Message.StaticDataReport)
			}
		default:
			log.Printf("Unsupported message type: %s", packet.MessageType)
			continue
		}

		if aisPacket != nil {
			encodeAndSend(nmeaCodec, aisPacket, udpConn)
		}
	}
}

func main() {
	const reconnectDelay = 1 * time.Second

	for {
		err := connectAISStream()
		if err != nil {
			log.Printf("[%s] Connection error: %v", time.Now().Format(time.RFC3339), err)
			log.Printf("[%s] Reconnecting in %v...", time.Now().Format(time.RFC3339), reconnectDelay)
			time.Sleep(reconnectDelay)
		}
	}
}
