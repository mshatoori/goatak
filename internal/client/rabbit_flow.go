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
	"net"
	"sync/atomic"
	"time"

	"github.com/kdudkov/goatak/internal/dnsproxy"
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
	UID string
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
	Destinations []model.SendItemDest // TODO: WHY IS THIS AN ARRAY???
	ClientInfo   *cotproto.ClientInfo
	DNSProxy     *dnsproxy.DnsServiceProxy
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
	dnsProxy     *dnsproxy.DnsServiceProxy
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
	// println("RABBIT READER REEEEADING")
	d := <-r.deliveryChannel
	// println("RABBIT READER REEEEAD:" + d.MessageId)
	var newBuffer bytes.Buffer
	newBuffer.Write(d.Body)
	var rabbitMsg RabbitMsg
	err = json.NewDecoder(&newBuffer).Decode(&rabbitMsg)
	n = 0
	if err != nil {
		// println("RABBIT READER ERROR:" + err.Error())
		return
	}

	n, err = base64.StdEncoding.Decode(b, []byte(rabbitMsg.PayLoadData))
	// println("RABBIT READER RETURNS: " + strconv.Itoa(n))
	return
}

func NewRabbitFlow(config *RabbitFlowConfig) *RabbitFlow {
	uid := uuid.NewString()
	if len(config.UID) > 0 {
		uid = config.UID
	}

	m := &RabbitFlow{
		active:       1,
		logger:       slog.Default(),
		sendChan:     make(chan []byte, 10),
		Addr:         config.Addr,
		Direction:    config.Direction,
		UID:          uid,
		sendExchange: config.SendExchange,
		recvQueue:    config.RecvQueue,
		Title:        config.Title,
		msgCounter:   0,
		Destinations: config.Destinations,
		ClientInfo:   config.ClientInfo,
		dnsProxy:     config.DNSProxy,
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
				h.logger.Info("EOF, attempting reconnection...")
			} else {
				h.logger.Warn("read error, attempting reconnection", "error", err.Error())
			}

			// Attempt to reconnect (will retry forever until successful or context cancelled)
			h.reconnect(ctx)

			// Check if context was cancelled during reconnection
			if ctx.Err() != nil {
				break
			}

			// Re-setup the read infrastructure after reconnection
			q, err := h.ch.QueueDeclare(
				h.recvQueue, // name
				true,        // durable
				false,       // delete when unused
				false,       // exclusive
				false,       // no-wait
				nil,         // arguments
			)
			if h.failOnError(err, "Failed to declare a queue after reconnect") {
				continue
			}

			err = h.ch.QueueBind(q.Name, "#", "EventBus.Messages.Events:VmfMessageReceivedEvent", false, nil)
			if h.failOnError(err, "Failed to bind a queue after reconnect") {
				continue
			}

			msgs, err := h.ch.Consume(
				q.Name,
				"",
				true, // TODO: check
				false,
				false,
				false,
				nil,
			)
			if h.failOnError(err, "Failed to register a consumer after reconnect") {
				continue
			}

			pr = cot.NewProtoReader(&RabbitReader{
				deliveryChannel: msgs,
			})
			continue
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

func (h *RabbitFlow) failOnError(err error, msg string) bool {
	if err != nil {
		h.logger.Error("%s: %s", msg, err)
		return true
	}
	return false
}

func (h *RabbitFlow) reconnect(ctx context.Context) {
	h.logger.Info("Starting reconnection process to RabbitMQ...")

	// Close existing connections if they exist
	if h.ch != nil {
		h.ch.Close()
	}
	if h.conn != nil {
		h.conn.Close()
	}

	attempt := 1
	for ctx.Err() == nil {
		h.logger.Info("Attempting to reconnect to RabbitMQ", "attempt", attempt)

		// Attempt to re-establish connection
		var err error
		h.conn, err = amqp.Dial(h.Addr)
		if err != nil {
			h.logger.Error("Failed to reconnect to RabbitMQ", "error", err, "attempt", attempt)
			attempt++
			// Wait before next attempt, but respect context cancellation
			select {
			case <-ctx.Done():
				return
			case <-time.After(5 * time.Second):
				continue
			}
		}

		h.ch, err = h.conn.Channel()
		if err != nil {
			h.logger.Error("Failed to create channel after reconnect", "error", err, "attempt", attempt)
			if h.conn != nil {
				h.conn.Close()
			}
			attempt++
			// Wait before next attempt, but respect context cancellation
			select {
			case <-ctx.Done():
				return
			case <-time.After(5 * time.Second):
				continue
			}
		}

		h.logger.Info("Successfully reconnected to RabbitMQ", "after_attempts", attempt)
		return
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

			// Attempt to reconnect (will retry forever until successful or context cancelled)
			h.reconnect(ctx)

			// Check if context was cancelled during reconnection
			if ctx.Err() != nil {
				break
			}

			// Re-declare the queue after reconnection
			q, err = h.ch.QueueDeclare(
				h.sendExchange,
				true,
				false,
				false,
				false,
				nil,
			)
			if h.failOnError(err, "Failed to declare queue after write reconnect") {
				// If queue declaration fails after reconnect, try reconnecting again
				continue
			}
			// Don't retry the failed message, just continue with the next one
			continue
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
	return h.SendCotToDestinations(msg, h.Destinations, nil)
}

func (h *RabbitFlow) SendCotToDestinations(msg *cotproto.TakMessage, destinations []model.SendItemDest, source *model.SendItemDest) error {
	h.logger.Debug(fmt.Sprintf("RabbitFlow SendCotToDestinations version: %d", h.GetVersion()))
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

		if h.tryAddPacket(h.wrapMessage(buf, msg, destinations, source)) {
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

// selectSourceForDestinations gets this node's addresses from DNSProxy (by URN).
// Uses the IP that is in the same network (mask 255.255.255.0) as the destination IP addresses,
// if such an IP exists. If not, defaults to `clientInfo.GetIpAddress()`
func (h *RabbitFlow) selectSourceForDestinations(destinations []model.SendItemDest) model.SendItemDest {
	clientInfo := h.ClientInfo
	defaultResult := model.SendItemDest{
		URN:  int(clientInfo.GetUrn()),
		Addr: clientInfo.GetIpAddress(),
	}

	// TODO: Clean this up!
	// if len(destinations) == 1 && destinations[0].URN == 16777215 && destinations[0].Addr != "255.255.255.255" {
	// 	return model.SendItemDest{
	// 		URN:  int(clientInfo.GetUrn()),
	// 		Addr: destinations[0].Addr, // NOTE: CLEAN THIS UP! VERY CONFUSING AND DIRTY!
	// 	}
	// }

	// If no DNS proxy is configured, return default
	if h.dnsProxy == nil {
		return defaultResult
	}

	// Get addresses for this node's URN from DNSProxy
	nodeAddresses, err := h.dnsProxy.GetAddressesByUrn(int(clientInfo.GetUrn()))
	if err != nil {
		h.logger.Warn("Failed to get addresses from DNSProxy", "urn", clientInfo.GetUrn(), "error", err)
		return defaultResult
	}

	// If no addresses found, return default
	if len(nodeAddresses) == 0 {
		return defaultResult
	}

	// Try to find an IP address that is in the same network as any destination
	for _, dest := range destinations {
		destIP := net.ParseIP(dest.Addr)
		if destIP == nil {
			continue
		}

		// Check each node address to see if it's in the same /24 network as this destination
		for _, nodeAddr := range nodeAddresses {
			if nodeAddr.IPAddress == nil {
				continue
			}

			nodeIP := net.ParseIP(*nodeAddr.IPAddress)
			if nodeIP == nil {
				continue
			}

			// Check if both IPs are in the same /24 network (255.255.255.0 mask)
			if h.sameNetwork(nodeIP, destIP, net.CIDRMask(24, 32)) {
				return model.SendItemDest{
					URN:  int(clientInfo.GetUrn()),
					Addr: *nodeAddr.IPAddress,
				}
			}
		}
	}

	// No matching network found, return default
	return defaultResult
}

// TODO: CLEAN THIS UP ALSO! This shouldn't be needed! AT ALL! Also, there's always only one destination!
// func (h *RabbitFlow) selectDestinationForDestinations(destinations []model.SendItemDest) []model.SendItemDest {
// 	defaultResult := model.SendItemDest{
// 		URN:  destinations[0].URN,
// 		Addr: destinations[0].Addr,
// 	}

// 	if defaultResult.URN == 16777215 {
// 		// Sigh! This should've been a broadcast address...
// 		defaultResult.Addr = "255.255.255.255"
// 	}

// 	result := make([]model.SendItemDest, 1)
// 	result[0] = defaultResult

// 	return result
// }

// sameNetwork checks if two IP addresses are in the same network given a subnet mask
func (h *RabbitFlow) sameNetwork(ip1, ip2 net.IP, mask net.IPMask) bool {
	// Ensure both IPs are the same version (IPv4 or IPv6)
	ip1 = ip1.To4()
	ip2 = ip2.To4()

	if ip1 == nil || ip2 == nil {
		return false
	}

	// Apply mask to both IPs and compare
	network1 := ip1.Mask(mask)
	network2 := ip2.Mask(mask)

	return network1.Equal(network2)
}

func (h *RabbitFlow) wrapMessage(buf []byte, _msg *cotproto.TakMessage, destinations []model.SendItemDest, source *model.SendItemDest) []byte {
	var newBuffer bytes.Buffer
	clientInfo := h.ClientInfo

	var msgSource model.SendItemDest

	if source != nil {
		msgSource = *source
	} else {
		msgSource = h.selectSourceForDestinations(destinations)
	}

	rabbitMsg := RabbitMsg{
		MessageId:      uuid.NewString(),
		Fad:            1,
		MessageNumber:  5,
		MessageSubtype: nil,
		PayLoadData:    base64.StdEncoding.EncodeToString(buf),
		Source:         msgSource,
		Destinations:   destinations,
		CommandId:      "00000000-0000-0000-0000-000000000001",
		CreationDate:   "2023-06-11T14:27:43.7958539+03:30",
		Version:        "1.0",
		Type:           SEND_VMF_COMMAND,
		SourceSystem:   "SA",
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
