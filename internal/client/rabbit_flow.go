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

type RabbitFlowConfig struct {
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
	Direction    FlowDirection
	SendExchange string
	RecvQueue    string
	Title        string
	Destinations []model.SendItemDest
	ClientInfo   *cotproto.ClientInfo
}

type RabbitFlow struct {
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
	Direction    FlowDirection
	sendExchange string
	recvQueue    string
	Title        string
	msgCounter   int
	Destinations []model.SendItemDest
	ClientInfo   *cotproto.ClientInfo
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
	SourceSystem   string               `json:"sourceSystem"`
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

func NewRabbitFlow(config *RabbitFlowConfig) *RabbitFlow {
	m := &RabbitFlow{
		active:       1,
		logger:       slog.Default(),
		sendChan:     make(chan []byte, 10),
		Addr:         config.Addr,
		Direction:    config.Direction,
		UID:          uuid.NewString(),
		sendExchange: config.SendExchange,
		recvQueue:    config.RecvQueue,
		Title:        config.Title,
		msgCounter:   0,
		Destinations: config.Destinations,
		ClientInfo:   config.ClientInfo,
	}

	var err error = nil
	m.conn, err = amqp.Dial(config.Addr)

	if err != nil {
		m.logger.Error("RabbitFlow connection failed!", "error", err)
		m.active = 0
		return m
	}

	m.ch, err = m.conn.Channel()

	if err != nil {
		m.logger.Error("RabbitFlow channel failed")
		m.active = 0
		return m
	}

	m.SetVersion(1)

	if config != nil && config.Direction&INCOMING > 0 {
		m.messageCb = config.MessageCb
	}

	return m
}

func (h *RabbitFlow) IsActive() bool {
	return atomic.LoadInt32(&h.active) == 1
}
func (h *RabbitFlow) GetType() string {
	return "Rabbit"
}

func (h *RabbitFlow) ToCoTFlowModel() *model.CoTFlow {
	return &model.CoTFlow{
		UID:          h.UID,
		Addr:         h.Addr,
		Direction:    int(h.Direction),
		RecvQueue:    h.recvQueue,
		SendExchange: h.sendExchange,
		Type:         h.GetType(),
		Title:        h.Title,
	}
}

func (h *RabbitFlow) Start() {
	h.logger.Info("RabbitFlow starting")

	var ctx context.Context
	ctx, h.cancel = context.WithCancel(context.Background())

	if !h.IsActive() {
		h.logger.Error("RabbitFlow connection failed!")
		return
	}

	go h.handleWrite(ctx)
	go h.handleRead(ctx)
}

func (h *RabbitFlow) handleRead(ctx context.Context) {
	if h.Direction&INCOMING == 0 {
		h.logger.Debug("RabbitFlow Ignoring read")
		return
	}

	h.logger.Debug("RabbitFlow Handling read")
	defer h.Stop()

	q, err := h.ch.QueueDeclare(
		h.recvQueue, // name
		true,        // durable
		false,       // delete when unused
		false,       // exclusive
		false,       // no-wait
		nil,         // arguments
	)
	h.failOnError(err, "Failed to declare a queue")

	err = h.ch.QueueBind(q.Name, "#", "EventBus.Messages.Events:VmfMessageReceivedEvent", false, nil)
	h.failOnError(err, "Failed to bind a queue")

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
		h.logger.Debug("RabbitFlow Reading Message...")
		msg, err = h.processProtoRead(pr)
		h.logger.Debug("RabbitFlow Read Message")
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

func (h *RabbitFlow) processXMLRead(r *cot.TagReader) (*cot.CotMessage, error) {
	return nil, nil
}

func (h *RabbitFlow) processProtoRead(r *cot.ProtoReader) (*cot.CotMessage, error) {
	msg, err := r.ReadProtoBuf()
	if err != nil {
		return nil, err
	}

	var d *cot.Node
	d, err = cot.DetailsFromString(msg.GetCotEvent().GetDetail().GetXmlDetail())

	h.logger.Debug(fmt.Sprintf("proto msg: %s", msg))

	return &cot.CotMessage{TakMessage: msg, Detail: d}, err
}

func (h *RabbitFlow) SetVersion(n int32) {
	atomic.StoreInt32(&h.ver, n)
}

func (h *RabbitFlow) GetVersion() int32 {
	return atomic.LoadInt32(&h.ver)
}

func (h *RabbitFlow) failOnError(err error, msg string) {
	if err != nil {
		h.logger.Error("%s: %s", msg, err)
	}
}

func (h *RabbitFlow) handleWrite(ctx context.Context) {
	if h.Direction&OUTGOING == 0 {
		h.logger.Debug("RabbitFlow Ignoring write")
		return
	}

	q, err := h.ch.QueueDeclare(
		h.sendExchange,
		true,
		false,
		false,
		false,
		nil,
	)
	h.failOnError(err, "Failed to declare a queue")

	for msg := range h.sendChan {
		h.logger.Debug("RabbitFlow handleWrite")

		err = h.ch.PublishWithContext(ctx,
			"", // TODO: check
			q.Name,
			false,
			false,
			amqp.Publishing{
				ContentType: "application/json",
				Body:        msg,
			})

		if err != nil {
			h.logger.Debug(fmt.Sprintf("RabbitFlow client %s write error %v", h.Addr, err))
			h.Stop()

			break
		}
	}
}

func (h *RabbitFlow) Stop() {
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

func (h *RabbitFlow) SendCot(msg *cotproto.TakMessage) error {
	h.logger.Debug(fmt.Sprintf("RabbitFlow SendCot version: %d", h.GetVersion()))
	if h.Direction&OUTGOING == 0 {
		h.logger.Debug("RabbitFlow Ignoring write")
		return nil
	}
	switch h.GetVersion() {
	case 0:
		//h.logger.Debug("RabbitFlow SendCot v0")
		buf, err := xml.Marshal(cot.ProtoToEvent(msg))
		if err != nil {
			return err
		}

		if h.tryAddPacket(buf) {
			return nil
		}
	case 1:
		//h.logger.Debug("RabbitFlow SendCot v1")
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

func (h *RabbitFlow) tryAddPacket(msg []byte) bool {
	h.logger.Debug("RabbitFlow tryAddPacket", "active", h.IsActive())
	if !h.IsActive() {
		return false
	}
	select {
	case h.sendChan <- msg:
	default:
	}

	return true
}

func (h *RabbitFlow) wrapMessage(buf []byte, _msg *cotproto.TakMessage) []byte {
	var newBuffer bytes.Buffer
	clientInfo := h.ClientInfo

	rabbitMsg := RabbitMsg{
		MessageId:      uuid.NewString(),
		Fad:            1,
		MessageNumber:  5,
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
		SourceSystem: "SA",
	}

	err := json.NewEncoder(&newBuffer).Encode(rabbitMsg)
	if err != nil {
		return nil
	}

	h.logger.Debug("RabbitFlow wrapMessage", "msg", rabbitMsg, "from", clientInfo.GetIpAddress(), "result", newBuffer.Bytes())

	return newBuffer.Bytes()
}

func (h *RabbitFlow) nextMsgNum() int {
	defer func() {
		h.msgCounter += 1
	}()
	return h.msgCounter
}
