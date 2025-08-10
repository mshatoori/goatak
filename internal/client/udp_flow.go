package client

import (
	"context"
	"encoding/xml"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net"
	"sync/atomic"
	"time"

	"github.com/kdudkov/goatak/pkg/model"

	"github.com/google/uuid"
	"github.com/kdudkov/goatak/pkg/cot"
	"github.com/kdudkov/goatak/pkg/cotproto"
)

type FlowDirection int

const (
	INCOMING FlowDirection = 1 << iota // 1
	OUTGOING FlowDirection = 1 << iota // 2
	BOTH     FlowDirection = INCOMING | OUTGOING
)

type CoTFlow interface {
	Start()
	SendCot(msg *cotproto.TakMessage) error
	GetType() string
	ToCoTFlowModel() *model.CoTFlow
	Stop()
}

type UDPFlowConfig struct {
	// User         *model.User
	// Serial       string
	UID string
	// IsClient     bool
	MessageCb func(msg *cot.CotMessage)
	// RemoveCb     func(ch ClientHandler)
	// NewContactCb func(uid, callsign string)
	// RoutePings   bool
	// Logger       *slog.Logger
	Addr      string
	Port      int
	Direction FlowDirection
	Title     string
}

type UDPFlow struct {
	cancel context.CancelFunc
	conn   *net.UDPConn
	Addr   *net.UDPAddr
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
	logger    *slog.Logger
	Direction FlowDirection
	Title     string
}

func NewUDPFlow(config *UDPFlowConfig) *UDPFlow {
	uid := uuid.NewString()
	if len(config.UID) > 0 {
		uid = config.UID
	}

	addr, err := net.ResolveUDPAddr("udp", fmt.Sprintf("%s:%d", config.Addr, config.Port))
	if err != nil {
		return nil
	}
	m := &UDPFlow{
		active:    1,
		logger:    slog.Default(),
		sendChan:  make(chan []byte, 10),
		Addr:      addr,
		Direction: config.Direction,
		UID:       uid,
		Title:     config.Title,
	}

	// TODO: set version using all mesh clients according to TAK protocol
	m.SetVersion(1)

	if config != nil && config.Direction&INCOMING != 0 {
		m.messageCb = config.MessageCb
	}

	return m
}

func (h *UDPFlow) IsActive() bool {
	return atomic.LoadInt32(&h.active) == 1
}
func (h *UDPFlow) GetType() string {
	return "UDP"
}

func (h *UDPFlow) ToCoTFlowModel() *model.CoTFlow {
	return &model.CoTFlow{
		UID:       h.UID,
		Addr:      h.Addr.IP.String(),
		Port:      h.Addr.Port,
		Direction: int(h.Direction),
		Type:      h.GetType(),
		Title:     h.Title,
	}
}

func (h *UDPFlow) Start() {
	h.logger.Info("UDPFlow starting")

	var ctx context.Context
	ctx, h.cancel = context.WithCancel(context.Background())

	go h.handleWrite()
	go h.handleRead(ctx)
}

func (h *UDPFlow) handleRead(ctx context.Context) {
	if h.Direction&INCOMING == 0 {
		h.logger.Debug("UDPFlow Ignoring read")
		return
	}

	h.logger.Debug("UDPFlow Handling read")
	defer h.Stop()

	addr, err := net.ResolveUDPAddr("udp", fmt.Sprintf(":%d", h.Addr.Port))
	if err != nil {
		h.logger.Debug("UDPFlow can't resolve")
		return
	}

	readConn, err := net.ListenUDP("udp", addr)
	if err != nil {
		h.logger.Debug("UDPFlow can't listen", "error", err.Error())
		return
	}

	er := cot.NewTagReader(readConn)
	pr := cot.NewProtoReader(readConn)

	for ctx.Err() == nil {
		var msg *cot.CotMessage

		var err error

		// TODO: Handle read
		switch h.GetVersion() {
		case 0:
			msg, err = h.processXMLRead(er)
		case 1:
			msg, err = h.processProtoRead(pr)
		}

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

		msg.From = h.Addr.String()
		// TODO
		// msg.Scope = h.GetUser().GetScope()
		msg.Scope = ""

		// add new contact uid
		// if msg.IsContact() {
		// 	uid := msg.GetUID()
		// 	uid = strings.TrimSuffix(uid, "-ping")

		// 	if _, present := h.uids.Swap(uid, msg.GetCallsign()); !present {
		// 		if h.newContactCb != nil {
		// 			h.newContactCb(uid, msg.GetCallsign())
		// 		}
		// 	}
		// }

		// // remove contact
		// if msg.GetType() == "t-x-d-d" && msg.GetDetail().Has("link") {
		// 	uid := msg.GetDetail().GetFirst("link").GetAttr("uid")
		// 	h.logger.Debug(fmt.Sprintf("delete uid %s by message", uid))
		// 	h.uids.Delete(uid)
		// }

		h.messageCb(msg)
	}
}

func (h *UDPFlow) processXMLRead(r *cot.TagReader) (*cot.CotMessage, error) {
	return nil, nil
}

func (h *UDPFlow) processProtoRead(r *cot.ProtoReader) (*cot.CotMessage, error) {
	msg, err := r.ReadProtoBuf()
	if err != nil {
		return nil, err
	}

	var d *cot.Node
	d, err = cot.DetailsFromString(msg.GetCotEvent().GetDetail().GetXmlDetail())

	h.logger.Debug(fmt.Sprintf("proto msg: %s", msg))

	return &cot.CotMessage{TakMessage: msg, Detail: d}, err
}

func (h *UDPFlow) SetVersion(n int32) {
	atomic.StoreInt32(&h.ver, n)
}

func (h *UDPFlow) GetVersion() int32 {
	return atomic.LoadInt32(&h.ver)
}

func (h *UDPFlow) handleWrite() {
	if h.Direction&OUTGOING == 0 {
		h.logger.Debug("UDPFlow Ignoring write")
		return
	}

	for msg := range h.sendChan {
		h.logger.Debug("UDPFlow handleWrite")
		h.conn, _ = net.DialUDP("udp", nil, h.Addr)
		if _, err := h.conn.Write(msg); err != nil {
			h.logger.Debug(fmt.Sprintf("UDPFlow client %s write error %v", h.Addr, err))
			h.Stop()

			break
		}
		h.conn.Close()
	}
}

func (h *UDPFlow) Stop() {
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

func (h *UDPFlow) SendCot(msg *cotproto.TakMessage) error {
	h.logger.Debug("UDPFlow SendCot")
	switch h.GetVersion() {
	case 0:
		h.logger.Debug("UDPFlow SendCot v0")
		buf, err := xml.Marshal(cot.ProtoToEvent(msg))
		if err != nil {
			return err
		}

		if h.tryAddPacket(buf) {
			return nil
		}
	case 1:
		h.logger.Debug("UDPFlow SendCot v1")
		buf, err := cot.MakeProtoPacket(msg)
		if err != nil {
			return err
		}

		if h.tryAddPacket(buf) {
			return nil
		}
	}

	return fmt.Errorf("client is off")
}

func (h *UDPFlow) tryAddPacket(msg []byte) bool {
	h.logger.Debug("UDPFlow tryAddPacket", "active", h.IsActive())
	if !h.IsActive() {
		return false
	}
	select {
	case h.sendChan <- msg:
	default:
	}

	return true
}
