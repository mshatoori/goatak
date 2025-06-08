package wshandler

import (
	"encoding/json"
	"sync/atomic"

	"github.com/aofei/air"
	"github.com/kdudkov/goatak/internal/model"
	pkgmodel "github.com/kdudkov/goatak/pkg/model"
)

type WebMessage struct {
	Typ         string                `json:"type"`
	Unit        *pkgmodel.WebUnit     `json:"unit,omitempty"`
	UID         string                `json:"uid,omitempty"`
	ChatMessage *pkgmodel.ChatMessage `json:"chat_msg,omitempty"`
	// Tracking-related fields
	TrackingUpdate *TrackingUpdateData   `json:"tracking_update,omitempty"`
	TrackingConfig *model.TrackingConfig `json:"tracking_config,omitempty"`
	TrackingTrail  *model.TrackingTrail  `json:"tracking_trail,omitempty"`
	Error          string                `json:"error,omitempty"`
}

// TrackingUpdateData represents real-time tracking position updates
type TrackingUpdateData struct {
	UnitUID   string   `json:"unit_uid"`
	Callsign  string   `json:"callsign,omitempty"`
	Latitude  float64  `json:"latitude"`
	Longitude float64  `json:"longitude"`
	Altitude  *float64 `json:"altitude,omitempty"`
	Speed     *float64 `json:"speed,omitempty"`
	Course    *float64 `json:"course,omitempty"`
	Timestamp string   `json:"timestamp"`
}

// TrackingRequestData represents incoming tracking requests from clients
type TrackingRequestData struct {
	UnitUID string `json:"unit_uid"`
	Action  string `json:"action"` // "get_trail", "subscribe", "unsubscribe"
}

// TrackingMessageHandler interface for handling tracking-related WebSocket messages
type TrackingMessageHandler interface {
	HandleTrackingRequest(request *TrackingRequestData) error
	GetTrail(unitUID string) (*model.TrackingTrail, error)
	GetConfig(unitUID string) (*model.TrackingConfig, error)
}

type JSONWsHandler struct {
	name            string
	ws              *air.WebSocket
	ch              chan *WebMessage
	active          int32
	trackingHandler TrackingMessageHandler
}

func NewHandler(name string, ws *air.WebSocket) *JSONWsHandler {
	return &JSONWsHandler{
		name:   name,
		ws:     ws,
		ch:     make(chan *WebMessage, 10),
		active: 1,
	}
}

func NewHandlerWithTracking(name string, ws *air.WebSocket, trackingHandler TrackingMessageHandler) *JSONWsHandler {
	return &JSONWsHandler{
		name:            name,
		ws:              ws,
		ch:              make(chan *WebMessage, 10),
		active:          1,
		trackingHandler: trackingHandler,
	}
}

func (w *JSONWsHandler) IsActive() bool {
	return w != nil && atomic.LoadInt32(&w.active) == 1
}

func (w *JSONWsHandler) stop() {
	if atomic.CompareAndSwapInt32(&w.active, 1, 0) {
		close(w.ch)
		w.ws.Close()
	}
}

func (w *JSONWsHandler) writer() {
	defer w.stop()

	for item := range w.ch {
		if w.ws.Closed {
			return
		}

		if item == nil {
			continue
		}

		if b, err := json.Marshal(item); err == nil {
			if w.ws.WriteText(string(b)) != nil {
				return
			}
		} else {
			return
		}
	}
}

func (w *JSONWsHandler) SendItem(i *pkgmodel.Item) bool {
	if w == nil || !w.IsActive() {
		return false
	}

	select {
	case w.ch <- &WebMessage{Typ: "unit", Unit: i.ToWeb()}:
	default:
	}

	return true
}

func (w *JSONWsHandler) DeleteItem(uid string) bool {
	if w == nil || !w.IsActive() {
		return false
	}

	select {
	case w.ch <- &WebMessage{Typ: "delete", UID: uid}:
	default:
	}

	return true
}

func (w *JSONWsHandler) NewChatMessage(msg *pkgmodel.ChatMessage) bool {
	if w == nil || !w.IsActive() {
		return false
	}

	select {
	case w.ch <- &WebMessage{Typ: "chat", ChatMessage: msg}:
	default:
	}

	return true
}

func (w *JSONWsHandler) Listen() {
	if w.ws.Closed {
		return
	}

	defer w.stop()

	go w.writer()
	w.ws.Listen()
}

// SendTrackingUpdate sends a real-time tracking position update to the client
func (w *JSONWsHandler) SendTrackingUpdate(update *TrackingUpdateData) bool {
	if w == nil || !w.IsActive() {
		return false
	}

	select {
	case w.ch <- &WebMessage{Typ: "tracking_update", TrackingUpdate: update}:
	default:
	}

	return true
}

// SendTrackingConfigUpdate sends tracking configuration changes to the client
func (w *JSONWsHandler) SendTrackingConfigUpdate(config *model.TrackingConfig) bool {
	if w == nil || !w.IsActive() {
		return false
	}

	select {
	case w.ch <- &WebMessage{Typ: "tracking_config_update", TrackingConfig: config}:
	default:
	}

	return true
}

// SendTrackingTrail sends complete trail data to the client
func (w *JSONWsHandler) SendTrackingTrail(trail *model.TrackingTrail) bool {
	if w == nil || !w.IsActive() {
		return false
	}

	select {
	case w.ch <- &WebMessage{Typ: "tracking_trail", TrackingTrail: trail}:
	default:
	}

	return true
}

// SendTrackingError sends tracking-related error messages to the client
func (w *JSONWsHandler) SendTrackingError(errorMsg string) bool {
	if w == nil || !w.IsActive() {
		return false
	}

	select {
	case w.ch <- &WebMessage{Typ: "tracking_error", Error: errorMsg}:
	default:
	}

	return true
}
