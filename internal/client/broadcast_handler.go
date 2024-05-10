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

	"github.com/kdudkov/goatak/pkg/cot"
	"github.com/kdudkov/goatak/pkg/cotproto"
)

type BroadcastHandlerConfig struct {
	// User         *model.User
	// Serial       string
	// UID          string
	// IsClient     bool
	MessageCb func(msg *cot.CotMessage)
	// RemoveCb     func(ch ClientHandler)
	// NewContactCb func(uid, callsign string)
	// RoutePings   bool
	// Logger       *slog.Logger
}

type BroadcastHandler struct {
	cancel   context.CancelFunc
	conn     *net.UDPConn
	addr     string
	localUID string
	ver      int32
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
	logger *slog.Logger
}

func NewBroadcastHandler(config *BroadcastHandlerConfig) *BroadcastHandler {
	addr, err := net.ResolveUDPAddr("udp", "192.168.1.255:6970")
	if err != nil {
		return nil
	}
	m := &BroadcastHandler{
		active:   1,
		logger:   slog.Default(),
		sendChan: make(chan []byte, 10),
	}

	m.conn, _ = net.DialUDP("udp", nil, addr)
	// TODO: set version using all mesh clients according to TAK protocol
	m.SetVersion(1)

	if config != nil {
		m.messageCb = config.MessageCb
	}

	return m
}

func (h *BroadcastHandler) IsActive() bool {
	return atomic.LoadInt32(&h.active) == 1
}

func (h *BroadcastHandler) Start() {
	h.logger.Info("starting")

	var ctx context.Context
	ctx, h.cancel = context.WithCancel(context.Background())

	go h.handleWrite()
	go h.handleRead(ctx)

	// if h.isClient {
	// go h.pinger(ctx)
	// }

	// if !h.isClient {
	// 	h.logger.Debug("send version msg")

	// 	if err := h.sendEvent(cot.VersionSupportMsg(1)); err != nil {
	// 		h.logger.Error("error sending ver req", "error", err.Error())
	// 	}
	// }
}

func (h *BroadcastHandler) pinger(ctx context.Context) {
	ticker := time.NewTicker(pingTimeout)
	defer ticker.Stop()

	for ctx.Err() == nil {
		select {
		case <-ticker.C:
			h.logger.Debug("ping")

			if err := h.SendCot(cot.MakePing(h.localUID)); err != nil {
				h.logger.Debug("sendMsg error", "error", err)
			}
		case <-ctx.Done():
			return
		}
	}
}

func (h *BroadcastHandler) handleRead(ctx context.Context) {
	h.logger.Debug("Handling read")
	defer h.stopHandle()

	addr, err := net.ResolveUDPAddr("udp", ":6970")
	if err != nil {
		return
	}

	readConn, err := net.ListenUDP("udp", addr)
	if err != nil {
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

		msg.From = h.addr
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

		// // ping
		// if msg.GetType() == "t-x-c-t" {
		// 	h.logger.Debug(fmt.Sprintf("ping from %s %s", h.addr, msg.GetUID()))

		// 	if err := h.SendCot(cot.MakePong()); err != nil {
		// 		h.logger.Error("SendMsg error", "error", err)
		// 	}

		// 	if !h.routePings {
		// 		continue
		// 	}
		// }

		// // pong
		// if msg.GetType() == "t-x-c-t-r" {
		// 	continue
		// }

		h.messageCb(msg)
	}
}

func (h *BroadcastHandler) processXMLRead(r *cot.TagReader) (*cot.CotMessage, error) {
	return nil, nil
}

func (h *BroadcastHandler) processProtoRead(r *cot.ProtoReader) (*cot.CotMessage, error) {
	msg, err := r.ReadProtoBuf()
	if err != nil {
		return nil, err
	}

	var d *cot.Node
	d, err = cot.DetailsFromString(msg.GetCotEvent().GetDetail().GetXmlDetail())

	h.logger.Debug(fmt.Sprintf("proto msg: %s", msg))

	return &cot.CotMessage{TakMessage: msg, Detail: d}, err
}

func (h *BroadcastHandler) SetVersion(n int32) {
	atomic.StoreInt32(&h.ver, n)
}

func (h *BroadcastHandler) GetVersion() int32 {
	return atomic.LoadInt32(&h.ver)
}

func (h *BroadcastHandler) handleWrite() {
	for msg := range h.sendChan {
		h.logger.Debug("handleWrite")
		if _, err := h.conn.Write(msg); err != nil {
			h.logger.Debug(fmt.Sprintf("client %s write error %v", h.addr, err))
			h.stopHandle()

			break
		}
	}
}

func (h *BroadcastHandler) stopHandle() {
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

// func (h *BroadcastHandler) sendEvent(evt *cot.Event) error {
// 	if h.GetVersion() != 0 {
// 		return fmt.Errorf("bad client version")
// 	}

// 	msg, err := xml.Marshal(evt)
// 	if err != nil {
// 		return err
// 	}

// 	h.logger.Debug("sending " + string(msg))

// 	if h.tryAddPacket(msg) {
// 		return nil
// 	}

// 	return fmt.Errorf("client is off")
// }

func (h *BroadcastHandler) SendMsg(msg *cot.CotMessage) error {
	// if msg.IsLocal() || h.CanSeeScope(msg.Scope) {
	// 	return h.SendCot(msg.GetTakMessage())
	// }

	// if viper.GetBool("interscope_chat") && (msg.IsChat() || msg.IsChatReceipt()) {
	// 	return h.SendCot(cot.CloneMessageNoCoords(msg.GetTakMessage()))
	// }

	return nil
}

func (h *BroadcastHandler) SendCot(msg *cotproto.TakMessage) error {
	h.logger.Debug("SendCot")
	switch h.GetVersion() {
	case 0:
		h.logger.Debug("SendCot v0")
		buf, err := xml.Marshal(cot.ProtoToEvent(msg))
		if err != nil {
			return err
		}

		if h.tryAddPacket(buf) {
			return nil
		}
	case 1:
		h.logger.Debug("SendCot v1")
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

func (h *BroadcastHandler) tryAddPacket(msg []byte) bool {
	h.logger.Debug("BroadcastHandler tryAddPacket", "active", h.IsActive())
	if !h.IsActive() {
		return false
	}
	select {
	case h.sendChan <- msg:
	default:
	}

	return true
}
