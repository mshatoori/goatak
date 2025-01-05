package client

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"encoding/xml"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"strconv"
	"sync/atomic"
	"time"

	"github.com/kdudkov/goatak/pkg/model"
	amqp "github.com/rabbitmq/amqp091-go"

	"github.com/google/uuid"
	"github.com/kdudkov/goatak/pkg/cot"
	"github.com/kdudkov/goatak/pkg/cotproto"
)

const (
	SEND_VMF_COMMAND           = "SendVmfCommand"
	VMF_MESSAGE_RECEIVED_EVENT = "VmfMessageReceivedEvent"
)

type RabbitFeedConfig struct {
	// User         *model.User
	// Serial       string
	// UID          string
	// IsClient     bool
	MessageCb func(msg *cot.CotMessage)
	// RemoveCb     func(ch ClientHandler)
	// NewContactCb func(uid, callsign string)
	// RoutePings   bool
	// Logger       *slog.Logger
	Addr         string
	Direction    FeedDirection
	SendQueue    string
	RecvQueue    string
	Title        string
	Destinations []model.SendItemDest
}

type RabbitFeed struct {
	cancel context.CancelFunc
	conn   *amqp.Connection
	ch     *amqp.Channel
	Addr   string
	UID    string
	ver    int32
	//routePings   bool
	//uids         sync.Map
	//lastActivity atomic.Pointer[time.Time]
	closeTimer *time.Timer
	sendChan   chan []byte
	active     int32
	//user         *model.User
	//serial       string
	messageCb func(msg *cot.CotMessage)
	// removeCb     func(ch ClientHandler)
	//newContactCb func(uid, callsign string)
	logger       *slog.Logger
	Direction    FeedDirection
	sendQueue    string
	recvQueue    string
	Title        string
	msgCounter   int
	Destinations []model.SendItemDest
}

type RabbitReader struct {
	deliveryChannel <-chan amqp.Delivery
}

type RabbitMsg struct {
	MessageId      string               `json:"messageId"`
	Fad            int                  `json:"fad"`
	MessageNumber  int                  `json:"messageNumber"`
	MessageSubtype *string              `json:"messageSubtype"`
	PayLoadData    string               `json:"payLoadData"` // Encoded in Base64
	Source         model.SendItemDest   `json:"source"`
	Destinations   []model.SendItemDest `json:"destinations"`
	CommandId      string               `json:"commandId"`
	CreationDate   string               `json:"creationDate"` // datetime?
	Version        string               `json:"version"`
	Type           string               `json:"type"`
}

func (r *RabbitReader) Read(b []byte) (n int, err error) {
	println("RABBIT READER REEEEADING")
	d := <-r.deliveryChannel
	println("RABBIT READER REEEEAD:" + d.MessageId)
	var newBuffer bytes.Buffer
	newBuffer.Write(d.Body)
	var rabbitMsg RabbitMsg
	err = json.NewDecoder(&newBuffer).Decode(&rabbitMsg)
	n = 0
	if err != nil {
		println("RABBIT READER ERROR:" + err.Error())
		return
	}

	n, err = base64.StdEncoding.Decode(b, []byte(rabbitMsg.PayLoadData))
	println("RABBIT READER RETURNS: " + strconv.Itoa(n))
	return
}

func NewRabbitFeed(config *RabbitFeedConfig) *RabbitFeed {
	m := &RabbitFeed{
		active:       1,
		logger:       slog.Default(),
		sendChan:     make(chan []byte, 10),
		Addr:         config.Addr,
		Direction:    config.Direction,
		UID:          uuid.NewString(),
		sendQueue:    config.SendQueue,
		recvQueue:    config.RecvQueue,
		Title:        config.Title,
		msgCounter:   0,
		Destinations: config.Destinations,
	}

	var err error = nil
	m.conn, err = amqp.Dial(config.Addr)

	if err != nil {
		m.logger.Error("RabbitFeed connection failed!", "error", err)
		m.active = 0
		return m
	}

	m.ch, err = m.conn.Channel()

	if err != nil {
		m.logger.Error("RabbitFeed channel failed")
		m.active = 0
		return m
	}

	m.SetVersion(1)

	if config != nil && config.Direction&INCOMING > 0 {
		m.messageCb = config.MessageCb
	}

	return m
}

func (h *RabbitFeed) IsActive() bool {
	return atomic.LoadInt32(&h.active) == 1
}
func (h *RabbitFeed) GetType() string {
	return "Rabbit"
}

func (h *RabbitFeed) ToCoTFeedModel() *model.CoTFeed {
	return &model.CoTFeed{
		UID:       h.UID,
		Addr:      h.Addr,
		Direction: int(h.Direction),
		RecvQueue: h.recvQueue,
		SendQueue: h.sendQueue,
		Type:      h.GetType(),
		Title:     h.Title,
	}
}

func (h *RabbitFeed) Start() {
	h.logger.Info("RabbitFeed starting")

	var ctx context.Context
	ctx, h.cancel = context.WithCancel(context.Background())

	go h.handleWrite(ctx)
	go h.handleRead(ctx)
}

func (h *RabbitFeed) handleRead(ctx context.Context) {
	if h.Direction&INCOMING == 0 {
		h.logger.Debug("RabbitFeed Ignoring read")
		return
	}

	h.logger.Debug("RabbitFeed Handling read")
	defer h.stopHandle()

	q, err := h.ch.QueueDeclare(
		h.recvQueue, // name
		false,       // durable
		false,       // delete when unused
		false,       // exclusive
		false,       // no-wait
		nil,         // arguments
	)
	h.failOnError(err, "Failed to declare a queue")

	msgs, err := h.ch.Consume(
		q.Name,
		"",
		true, // TODO: check
		false,
		false,
		false,
		nil,
	)
	h.failOnError(err, "Failed to register a consumer")

	pr := cot.NewProtoReader(&RabbitReader{
		deliveryChannel: msgs,
	})

	for ctx.Err() == nil {
		var msg *cot.CotMessage
		var err error
		h.logger.Debug("RabbitFeed Reading Message...")
		msg, err = h.processProtoRead(pr)
		h.logger.Debug("RabbitFeed Read Message")
		if err != nil {
			if errors.Is(err, io.EOF) {
				h.logger.Info("EOF")

				break
			}
			h.logger.Warn("error", "error", err.Error())
			break
		}

		if msg == nil {
			continue
		}

		h.messageCb(msg)
	}
}

//func NewRabbitReader(msgs <-chan amqp.Delivery) io.Reader {
//	bufio.NewReader(r)
//	rabbitReader := &RabbitReader{deliveryChannel: msgs}
//
//}

func (h *RabbitFeed) processXMLRead(r *cot.TagReader) (*cot.CotMessage, error) {
	return nil, nil
}

func (h *RabbitFeed) processProtoRead(r *cot.ProtoReader) (*cot.CotMessage, error) {
	msg, err := r.ReadProtoBuf()
	if err != nil {
		return nil, err
	}

	var d *cot.Node
	d, err = cot.DetailsFromString(msg.GetCotEvent().GetDetail().GetXmlDetail())

	h.logger.Debug(fmt.Sprintf("proto msg: %s", msg))

	return &cot.CotMessage{TakMessage: msg, Detail: d}, err
}

func (h *RabbitFeed) SetVersion(n int32) {
	atomic.StoreInt32(&h.ver, n)
}

func (h *RabbitFeed) GetVersion() int32 {
	return atomic.LoadInt32(&h.ver)
}

func (h *RabbitFeed) failOnError(err error, msg string) {
	if err != nil {
		h.logger.Error("%s: %s", msg, err)
	}
}

func (h *RabbitFeed) handleWrite(ctx context.Context) {
	if h.Direction&OUTGOING == 0 {
		h.logger.Debug("RabbitFeed Ignoring write")
		return
	}

	q, err := h.ch.QueueDeclare(
		h.sendQueue,
		false,
		false,
		false,
		false,
		nil,
	)
	h.failOnError(err, "Failed to declare a queue")

	for msg := range h.sendChan {
		h.logger.Debug("RabbitFeed handleWrite")

		err = h.ch.PublishWithContext(ctx,
			"", // TODO: check
			q.Name,
			false,
			false,
			amqp.Publishing{
				ContentType: "text/plain", // TODO: check
				Body:        msg,          // TODO: prepare msg
			})

		if err != nil {
			h.logger.Debug(fmt.Sprintf("RabbitFeed client %s write error %v", h.Addr, err))
			h.stopHandle()

			break
		}
	}
}

func (h *RabbitFeed) stopHandle() {
	if atomic.CompareAndSwapInt32(&h.active, 1, 0) {
		h.logger.Info("stopping")
		h.cancel()

		close(h.sendChan)

		if h.conn != nil {
			_ = h.conn.Close()
		}

		// h.removeCb(h)

		if h.closeTimer != nil {
			h.closeTimer.Stop()
		}
	}
}

func (h *RabbitFeed) SendCot(msg *cotproto.TakMessage) error {
	h.logger.Debug(fmt.Sprintf("RabbitFeed SendCot version: %d", h.GetVersion()))
	if h.Direction&OUTGOING == 0 {
		h.logger.Debug("RabbitFeed Ignoring write")
		return nil
	}
	switch h.GetVersion() {
	case 0:
		//h.logger.Debug("RabbitFeed SendCot v0")
		buf, err := xml.Marshal(cot.ProtoToEvent(msg))
		if err != nil {
			return err
		}

		if h.tryAddPacket(buf) {
			return nil
		}
	case 1:
		//h.logger.Debug("RabbitFeed SendCot v1")
		buf, err := cot.MakeProtoPacket(msg)
		if err != nil {
			return err
		}

		if h.tryAddPacket(h.wrapMessage(buf, msg)) {
			return nil
		}
	}

	return fmt.Errorf("client is off")
}

func (h *RabbitFeed) tryAddPacket(msg []byte) bool {
	h.logger.Debug("RabbitFeed tryAddPacket", "active", h.IsActive())
	if !h.IsActive() {
		return false
	}
	select {
	case h.sendChan <- msg:
	default:
	}

	return true
}

func (h *RabbitFeed) wrapMessage(buf []byte, _msg *cotproto.TakMessage) []byte {
	var newBuffer bytes.Buffer
	clientInfo := _msg.GetCotEvent().GetDetail().GetContact().GetClientInfo()

	rabbitMsg := RabbitMsg{
		MessageId:      uuid.NewString(),
		Fad:            1,
		MessageNumber:  h.nextMsgNum(),
		MessageSubtype: nil,
		PayLoadData:    base64.StdEncoding.EncodeToString(buf),
		Source: model.SendItemDest{
			URN:  int(clientInfo.GetUrn()),
			Addr: clientInfo.GetIpAddress(),
		},
		Destinations: h.Destinations,
		CommandId:    "00000000-0000-0000-0000-000000000001",
		CreationDate: "2023-06-11T14:27:43.7958539+03:30",
		Version:      "1.0",
		Type:         SEND_VMF_COMMAND,
	}

	err := json.NewEncoder(&newBuffer).Encode(rabbitMsg)
	if err != nil {
		return nil
	}

	h.logger.Debug("RabbitFeed wrapMessage", "msg", rabbitMsg, "result", newBuffer.Bytes())

	return newBuffer.Bytes()
}

func (h *RabbitFeed) nextMsgNum() int {
	defer func() {
		h.msgCounter += 1
	}()
	return h.msgCounter
}
