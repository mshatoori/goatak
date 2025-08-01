package main

import (
	"embed"
	"encoding/json"
	"fmt"
	"runtime/pprof"
	"strconv"
	"strings"
	"time"

	"github.com/kdudkov/goatak/internal/client"
	"github.com/kdudkov/goatak/internal/geo"
	"github.com/kdudkov/goatak/internal/wshandler"

	"github.com/aofei/air"
	"github.com/google/uuid"

	"github.com/kdudkov/goatak/pkg/cot"
	"github.com/kdudkov/goatak/pkg/cotproto"
	"github.com/kdudkov/goatak/pkg/model"
	"github.com/kdudkov/goatak/staticfiles"
)

// DnsContact holds the URN and a list of IP addresses for a DNS contact.
type DnsContact struct {
	Urn      int32    `json:"urn"`
	IPs      []string `json:"ips"`
	Callsign string   `json:"callsign"`
}

//go:embed templates
var templates embed.FS

func NewHttp(app *App, address string) *air.Air {
	srv := air.New()
	srv.Address = address
	srv.DebugMode = true

	staticfiles.EmbedFiles(srv, "/static")
	renderer := new(staticfiles.Renderer)
	renderer.LeftDelimeter = "[["
	renderer.RightDelimeter = "]]"
	_ = renderer.Load(templates)

	srv.OPTIONS("/", optionsHandler())
	srv.GET("/", getIndexHandler(app, renderer))
	srv.OPTIONS("/config", optionsHandler())
	srv.GET("/config", getConfigHandler(app))
	srv.PATCH("/config", changeConfigHandler(app))
	srv.OPTIONS("/types", optionsHandler())
	srv.GET("/types", getTypes)
	srv.OPTIONS("/dp", optionsHandler())
	srv.POST("/dp", getDpHandler(app))
	srv.OPTIONS("/pos", optionsHandler())
	srv.GET("/pos", getPosHandler(app))
	srv.POST("/pos", changePosHandler(app))

	srv.OPTIONS("/ws", optionsHandler())
	srv.GET("/ws", getWsHandler(app))

	srv.GET("/unit", getUnitsHandler(app))
	srv.POST("/unit", addItemHandler(app))
	srv.OPTIONS("/unit", optionsHandler())
	srv.OPTIONS("/unit/:uid", optionsHandler())
	srv.OPTIONS("/message", optionsHandler())
	srv.GET("/message", getMessagesHandler(app))
	srv.POST("/message", addMessageHandler(app))
	srv.DELETE("/unit/:uid", deleteItemHandler(app))
	srv.POST("/unit/:uid/send/", sendItemHandler(app))

	srv.OPTIONS("/api/dns/contacts", optionsHandler())
	srv.GET("/api/dns/contacts", getDnsContactsHandler(app))

	srv.OPTIONS("/flows", optionsHandler())
	srv.GET("/flows", getFlowsHandler(app))
	srv.POST("/flows", addFlowHandler(app))
	srv.OPTIONS("/flows/:uid", optionsHandler())
	srv.DELETE("/flows/:uid", deleteFlowHandler(app))

	srv.GET("/sensors", getSensorsHandler(app))
	srv.POST("/sensors", addSensorHandler(app))
	srv.OPTIONS("/sensors", optionsHandler())
	srv.DELETE("/sensors/:uid", deleteSensorHandler(app))
	srv.PUT("/sensors/:uid", editSensorHandler(app))
	srv.OPTIONS("/sensors/:uid", optionsHandler())

	// Navigation distance calculation endpoints
	srv.OPTIONS("/api/navigation/distance/:itemId", optionsHandler())
	srv.GET("/api/navigation/distance/:itemId", getNavigationDistanceHandler(app))

	// Tracking API endpoints
	srv.OPTIONS("/api/tracking/trails", optionsHandler())
	srv.GET("/api/tracking/trails", getTrackingTrailsHandler(app))
	srv.OPTIONS("/api/tracking/trail/:uid", optionsHandler())
	srv.GET("/api/tracking/trail/:uid", getTrackingTrailHandler(app))
	srv.OPTIONS("/api/tracking/config/:uid", optionsHandler())
	srv.POST("/api/tracking/config/:uid", updateTrackingConfigHandler(app))
	srv.OPTIONS("/api/tracking/settings", optionsHandler())

	srv.OPTIONS("/stack", optionsHandler())
	srv.GET("/stack", getStackHandler())

	srv.RendererTemplateLeftDelim = "[["
	srv.RendererTemplateRightDelim = "]]"

	return srv
}

func getDnsContactsHandler(app *App) air.Handler {
	return func(req *air.Request, res *air.Response) error {
		setCORSHeaders(res)

		contactsMap := make(map[int32][]string)
		contactsList := make([]DnsContact, 0)

		app.items.ForEach(func(item *model.Item) bool {
			if item.GetClass() == model.CONTACT {
				cotMsg := item.GetMsg().GetTakMessage().GetCotEvent()
				if cotMsg != nil && cotMsg.Detail != nil && cotMsg.Detail.Contact != nil && cotMsg.Detail.Contact.ClientInfo != nil {
					urn := cotMsg.Detail.Contact.ClientInfo.Urn
					ip := cotMsg.Detail.Contact.ClientInfo.IpAddress
					callsign := cotMsg.Detail.Contact.Callsign

					if urn != 0 && ip != "" {
						// Split IPs and add each one
						ips := strings.Split(ip, ",")
						currentIPs := contactsMap[urn]
						for _, singleIP := range ips {
							found := false
							for _, existingIP := range currentIPs {
								if existingIP == singleIP {
									found = true
									break
								}
							}
							if !found {
								currentIPs = append(currentIPs, singleIP)
							}
						}
						contactsMap[urn] = currentIPs

						// Update callsing if not set or if it's generic
						if _, exists := contactsMap[urn]; !exists || !strings.HasPrefix(callsign, "Node-") {
							// If a more specific callsign is available, use it
							// If not already set, or if current is generic "Node-X" and new is better
							// This logic is a bit more complex. For simplicity, just store the first non-generic one.
						}
					}
				}
			}
			return true
		})

		// Convert map to slice for consistent JSON output
		for urn, ips := range contactsMap {
			// Find the corresponding callsign. Assume the latest update by dnsProxy had the best callsign.
			// This is a simplification; a more robust solution might store callsigns with the IPs.
			var callsign string
			app.items.ForEach(func(item *model.Item) bool {
				if item.GetClass() == model.CONTACT {
					cotMsg := item.GetMsg().GetTakMessage().GetCotEvent()
					if cotMsg != nil && cotMsg.Detail != nil && cotMsg.Detail.Contact != nil && cotMsg.Detail.Contact.ClientInfo != nil {
						if cotMsg.Detail.Contact.ClientInfo.Urn == urn {
							callsign = cotMsg.Detail.Contact.Callsign
							return false // Found, stop iteration
						}
					}
				}
				return true
			})
			contactsList = append(contactsList, DnsContact{Urn: urn, IPs: ips, Callsign: callsign})
		}

		return res.WriteJSON(contactsList)
	}
}

func getIndexHandler(app *App, r *staticfiles.Renderer) air.Handler {
	return func(req *air.Request, res *air.Response) error {
		data := map[string]any{
			"js": []string{
				// "utils.js", "store.js", "map.js"
			},
		}

		// compf, err := staticfiles.StaticFiles.ReadDir("static/js/components")
		// if err != nil {
		// 	return err
		// }
		// for _, f := range compf {
		// 	data["js"] = append(data["js"].([]string), fmt.Sprintf("components/%s", f.Name()))
		// }

		s, err := r.Render(data, "map.html", "header.html")
		if err != nil {
			return err
		}

		return res.WriteHTML(s)
	}
}

func getUnitsHandler(app *App) air.Handler {
	return func(req *air.Request, res *air.Response) error {
		setCORSHeaders(res)
		return res.WriteJSON(getUnits(app))
	}
}

func getFlowsHandler(app *App) air.Handler {
	return func(req *air.Request, res *air.Response) error {
		setCORSHeaders(res)
		return res.WriteJSON(getFlows(app))
	}
}

func getMessagesHandler(app *App) air.Handler {
	return func(req *air.Request, res *air.Response) error {
		setCORSHeaders(res)
		return res.WriteJSON(app.chatMessages.Chats)
	}
}

func getConfigHandler(app *App) air.Handler {
	return func(req *air.Request, res *air.Response) error {
		setCORSHeaders(res)
		m := make(map[string]any, 0)
		m["version"] = getVersion()
		m["uid"] = app.uid
		lat, lon := app.pos.Load().GetCoord()
		m["lat"] = lat
		m["lon"] = lon
		m["zoom"] = app.zoom
		m["myuid"] = app.uid
		m["callsign"] = app.callsign
		m["team"] = app.team
		m["role"] = app.role

		parts := strings.Split(req.Authority, ":")

		m["layers"] = getLayers(parts[0] + ":8000")

		m["ip_address"] = app.ipAddress
		m["urn"] = app.urn

		return res.WriteJSON(m)
	}
}

func changeConfigHandler(app *App) air.Handler {
	return func(req *air.Request, res *air.Response) error {
		setCORSHeaders(res)
		wu := make(map[string]string)

		if req.Body == nil {
			return nil
		}

		if err := json.NewDecoder(req.Body).Decode(&wu); err != nil {
			return err
		}

		app.uid = wu["uid"]
		app.callsign = wu["callsign"]
		app.ipAddress = wu["ip_address"]
		newUrn, _ := strconv.ParseInt(wu["urn"], 10, 32)
		app.urn = int32(newUrn)

		// Save updated config to database
		if app.DB != nil {
			stmt, err := app.DB.Prepare("INSERT OR REPLACE INTO config(key, value) VALUES(?, ?)")
			if err != nil {
				app.logger.Error("failed to prepare insert statement for config", "error", err)
				// Continue without saving to DB, but log the error
			} else {
				defer stmt.Close()
				configsToSave := map[string]string{
					"app.uid":       app.uid,
					"app.callsign":  app.callsign,
					"app.ipAddress": app.ipAddress,
					"app.urn":       strconv.Itoa(int(app.urn)),
				}
				for key, value := range configsToSave {
					_, err := stmt.Exec(key, value)
					if err != nil {
						app.logger.Error("failed to insert or replace config in database", "error", err, "key", key)
						// Continue without saving this specific key, but log the error
					} else {
						app.logger.Info("Config saved to database", "key", key, "value", value)
					}
				}
			}
		}

		if app.defaultRabbitFlow != nil {
			app.defaultRabbitFlow.ClientInfo.IpAddress = wu["ip_address"]
			app.defaultRabbitFlow.ClientInfo.Urn = int32(newUrn)
		}

		return res.WriteString("Ok")
	}
}

func getDpHandler(app *App) air.Handler {
	return func(req *air.Request, res *air.Response) error {
		setCORSHeaders(res)
		dp := new(model.DigitalPointer)

		if req.Body == nil {
			return nil
		}

		if err := json.NewDecoder(req.Body).Decode(dp); err != nil {
			return err
		}

		msg := cot.MakeDpMsg(app.uid, app.typ, app.callsign+"."+dp.Name, dp.Lat, dp.Lon)
		app.SendMsg(msg)

		return res.WriteString("Ok")
	}
}

func getPosHandler(app *App) air.Handler {
	return func(req *air.Request, res *air.Response) error {
		setCORSHeaders(res)
		m := make(map[string]any, 0)

		app.forceLocationUpdate()

		// TODO: Is location updated here?
		lat, lon := app.pos.Load().GetCoord()
		m["lat"] = lat
		m["lon"] = lon

		return res.WriteJSON(m)
	}
}

func changePosHandler(app *App) air.Handler {
	return func(req *air.Request, res *air.Response) error {
		setCORSHeaders(res)
		pos := make(map[string]float64)

		if req.Body == nil {
			return nil
		}

		if err := json.NewDecoder(req.Body).Decode(&pos); err != nil {
			return err
		}

		lat, latOk := pos["lat"]
		lon, lonOk := pos["lon"]

		if latOk && lonOk {
			app.logger.Info(fmt.Sprintf("new my coords: %.5f,%.5f", lat, lon))
			app.pos.Store(model.NewPos(lat, lon))
		}

		app.SendMsg(app.MakeMe())

		return res.WriteString("Ok")
	}
}

func addFlowHandler(app *App) air.Handler {
	return func(req *air.Request, res *air.Response) error {
		setCORSHeaders(res)
		f := new(model.CoTFlow)

		if req.Body == nil {
			return nil
		}

		if err := json.NewDecoder(req.Body).Decode(f); err != nil {
			return err
		}

		// TODO: Broadcast for now
		destinations := make([]model.SendItemDest, 1)
		destinations[0] = model.SendItemDest{
			Addr: "255.255.255.255",
			URN:  16777215,
		}

		var newFlow client.CoTFlow

		if len(f.Type) > 0 && f.Type == "Rabbit" {
			newFlow = client.NewRabbitFlow(&client.RabbitFlowConfig{
				MessageCb:    app.ProcessEvent,
				Addr:         f.Addr,
				Direction:    client.FlowDirection(f.Direction),
				RecvQueue:    f.RecvQueue,
				SendExchange: f.SendExchange,
				Title:        f.Title,
				Destinations: destinations,
				ClientInfo: &cotproto.ClientInfo{
					IpAddress: app.ipAddress,
					Urn:       app.urn,
				},
			})

			app.flows = append(app.flows, newFlow)
			if rabbitFlow, ok := newFlow.(*client.RabbitFlow); ok && rabbitFlow.IsActive() {
				rabbitFlow.Start()
			}
		} else if len(f.Type) == 0 || f.Type == "UDP" {
			newFlow = client.NewUDPFlow(&client.UDPFlowConfig{
				MessageCb: app.ProcessEvent,
				Addr:      f.Addr,
				Port:      f.Port,
				Direction: client.FlowDirection(f.Direction),
				Title:     f.Title,
			})

			app.flows = append(app.flows, newFlow)
			newFlow.Start()
		}

		// Save the new flow to the database
		if app.DB != nil && newFlow != nil {
			stmt, err := app.DB.Prepare("INSERT INTO flows(title, uid, addr, port, type, sendExchange, recvQueue) VALUES(?, ?, ?, ?, ?, ?, ?)")
			if err != nil {
				app.logger.Error("failed to prepare insert statement for flow", "error", err)
				// Continue without saving to DB, but log the error
			} else {
				defer stmt.Close()
				var flowConfig FlowConfig
				switch flow := newFlow.(type) {
				case *client.UDPFlow:
					flowConfig = FlowConfig{
						Title: flow.Title,
						Addr:  flow.Addr.IP.String(),
						Port:  flow.Addr.Port,
						Type:  "udp",
					}
				case *client.RabbitFlow:
					rabbitModel := flow.ToCoTFlowModel()
					flowConfig = FlowConfig{
						Title:        rabbitModel.Title,
						Addr:         rabbitModel.Addr,
						Port:         0,
						Type:         "rabbit",
						SendExchange: rabbitModel.SendExchange,
						RecvQueue:    rabbitModel.RecvQueue,
					}
				}
				_, err := stmt.Exec(flowConfig.Title, newFlow.ToCoTFlowModel().UID, flowConfig.Addr, flowConfig.Port, flowConfig.Type, flowConfig.SendExchange, flowConfig.RecvQueue)
				if err != nil {
					app.logger.Error("failed to insert flow into database", "error", err, "flow", flowConfig)
					// Continue without saving to DB, but log the error
				} else {
					app.logger.Info("Flow saved to database", "flow", flowConfig)
				}
			}
		}

		return res.WriteJSON(getFlows(app))
	}
}
func addItemHandler(app *App) air.Handler {
	return func(req *air.Request, res *air.Response) error {
		setCORSHeaders(res)
		wu := new(model.WebUnit)

		if req.Body == nil {
			return nil
		}

		if err := json.NewDecoder(req.Body).Decode(wu); err != nil {
			return err
		}

		msg := wu.ToMsg()

		if wu.Send {
			app.SendMsg(msg.GetTakMessage())
		}

		app.logger.Error("ERRRRRR", "msg", msg == nil)
		app.logger.Error("ORRRRRR", "wu", wu)

		var u *model.Item
		if u = app.items.Get(msg.GetUID()); u != nil {
			u.Update(msg)
			u.SetSend(wu.Send)
			app.items.Store(u)
			app.changeCb.AddMessage(u)
		} else {
			u = model.FromMsg(msg)
			u.SetLocal(true)
			u.SetSend(wu.Send)
			app.items.Store(u)
			app.changeCb.AddMessage(u)
		}

		return res.WriteJSON(u.ToWeb())
	}
}

func addMessageHandler(app *App) air.Handler {
	return func(req *air.Request, res *air.Response) error {
		setCORSHeaders(res)
		msg := new(model.ChatMessage)

		if req.Body == nil {
			return nil
		}

		defer req.Body.Close()

		if err := json.NewDecoder(req.Body).Decode(msg); err != nil {
			return err
		}

		if msg.ID == "" {
			msg.ID = uuid.NewString()
		}

		if msg.Time.IsZero() {
			msg.Time = time.Now()
		}

		if msg.Chatroom != msg.ToUID {
			msg.Direct = true
		}

		m := model.MakeChatMessage(msg)

		app.logger.Debug(m.String())
		app.SendMsg(m)
		app.chatMessages.Add(msg)

		return res.WriteJSON(app.chatMessages.Chats)
	}
}

func deleteItemHandler(app *App) air.Handler {
	return func(req *air.Request, res *air.Response) error {
		setCORSHeaders(res)
		uid := getStringParam(req, "uid")
		app.items.Remove(uid)
		app.updateGeofencesAfterDelete(uid)

		r := make(map[string]any, 0)
		r["units"] = getUnits(app)
		r["messages"] = app.chatMessages

		return res.WriteJSON(r)
	}
}

func sendItemHandler(app *App) air.Handler {
	return func(req *air.Request, res *air.Response) error {
		setCORSHeaders(res)
		dest := new(model.SendItemDest)

		if req.Body == nil {
			return nil
		}

		if err := json.NewDecoder(req.Body).Decode(dest); err != nil {
			return err
		}

		destinations := make([]model.SendItemDest, 1)
		destinations[0] = *dest

		var rabbitmq *client.RabbitFlow

		for _, flow := range app.flows {
			if flow.GetType() == "Rabbit" {
				rabbitmq = flow.(*client.RabbitFlow)
			}
		}

		prevDest := rabbitmq.Destinations
		rabbitmq.Destinations = destinations

		uid := getStringParam(req, "uid")
		item := app.items.Get(uid)
		if item == nil {
			return nil
		}

		item.GetMsg().GetTakMessage().CotEvent.Detail.Contact = &cotproto.Contact{
			Endpoint: "*:-1:stcp",
			Callsign: app.callsign,
			ClientInfo: &cotproto.ClientInfo{
				IpAddress: app.ipAddress,
				Urn:       app.urn,
			},
		}

		err := rabbitmq.SendCot(item.GetMsg().GetTakMessage())
		if err != nil {
			return err
		}

		rabbitmq.Destinations = prevDest

		return res.WriteJSON("OK")
	}
}

func getStackHandler() air.Handler {
	return func(req *air.Request, res *air.Response) error {
		setCORSHeaders(res)
		return pprof.Lookup("goroutine").WriteTo(res.Body, 1)
	}
}

func getWsHandler(app *App) air.Handler {
	return func(req *air.Request, res *air.Response) error {
		setCORSHeaders(res)
		ws, err := res.WebSocket()
		if err != nil {
			return err
		}

		name := uuid.NewString()

		h := wshandler.NewHandler(name, ws)

		app.logger.Debug("ws listener connected")
		app.changeCb.SubscribeNamed(name, h.SendItem)
		app.deleteCb.SubscribeNamed(name, h.DeleteItem)
		app.chatCb.SubscribeNamed(name, h.NewChatMessage)
		app.trackingUpdateCb.SubscribeNamed(name, h.SendTrackingUpdate)
		h.Listen()
		app.logger.Debug("ws listener disconnected")

		return nil
	}
}

func getUnits(app *App) []*model.WebUnit {
	units := make([]*model.WebUnit, 0)

	app.items.ForEach(func(item *model.Item) bool {
		units = append(units, item.ToWeb())

		return true
	})

	return units
}

func getFlows(app *App) []*model.CoTFlow {
	cotFlows := make([]*model.CoTFlow, 0)

	for _, flow := range app.flows {
		cotFlows = append(cotFlows, flow.ToCoTFlowModel())
	}

	return cotFlows
}

func deleteFlowHandler(app *App) air.Handler {
	return func(req *air.Request, res *air.Response) error {
		setCORSHeaders(res)
		uid := getStringParam(req, "uid")

		// Find and remove the flow from the slice
		foundIndex := -1
		for i, flow := range app.flows {
			if flow.ToCoTFlowModel().UID == uid {
				// Stop the flow before removing it
				flow.Stop()
				foundIndex = i
				break
			}
		}

		if foundIndex == -1 {
			res.Status = 404
			return res.WriteString(fmt.Sprintf("Flow with UID %s not found", uid))
		}

		// Get flow details before removing from slice
		flowToDelete := app.flows[foundIndex]
		var flowConfig FlowConfig
		switch flow := flowToDelete.(type) {
		case *client.UDPFlow:
			flowConfig = FlowConfig{
				Title: flow.Title,
				Addr:  flow.Addr.IP.String(),
				Type:  "udp",
			}
		case *client.RabbitFlow:
			rabbitModel := flow.ToCoTFlowModel()
			flowConfig = FlowConfig{
				Title: rabbitModel.Title,
				Addr:  rabbitModel.Addr,
				Type:  "rabbit",
			}
		}

		// Remove the flow from the slice
		app.flows = append(app.flows[:foundIndex], app.flows[foundIndex+1:]...)

		// Delete the flow from the database
		if app.DB != nil {
			stmt, err := app.DB.Prepare("DELETE FROM flows WHERE uid = ?")
			if err != nil {
				app.logger.Error("failed to prepare delete statement for flow", "error", err)
				// Continue without deleting from DB, but log the error
			} else {
				defer stmt.Close()
				_, err := stmt.Exec(uid)
				if err != nil {
					app.logger.Error("failed to delete flow from database", "error", err, "flow", flowConfig)
					// Continue without deleting from DB, but log the error
				} else {
					app.logger.Info("Flow deleted from database", "flow", flowConfig)
				}
			}
		}

		res.Status = 200
		return res.WriteString("Flow deleted successfully")
	}
}

func getStringParam(req *air.Request, name string) string {
	p := req.Param(name)
	if p == nil {
		return ""
	}

	return p.Value().String()
}

func getTypes(_ *air.Request, res *air.Response) error {
	setCORSHeaders(res)
	return res.WriteJSON(cot.Root)
}

func getLayers(mapServer string) []map[string]any {
	layers := []map[string]any{
		{
			"name":    "Local Server",
			"url":     fmt.Sprintf("http://%s/{z}/{x}/{y}.png", mapServer),
			"maxZoom": 16,
		},
		{
			"name":    "Google Hybrid",
			"url":     "http://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}&s=Galileo",
			"maxZoom": 16,
			"parts":   []string{"0", "1", "2", "3"},
		},
		{
			"name":    "OSM",
			"url":     "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
			"maxZoom": 16,
			"parts":   []string{"a", "b", "c"},
		},
		//{
		//	"name":    "Opentopo.cz",
		//	"url":     "https://tile-{s}.opentopomap.cz/{z}/{x}/{y}.png",
		//	"maxZoom": 18,
		//	"parts":   []string{"a", "b", "c"},
		//},
		//{
		//	"name":    "Yandex maps",
		//	"url":     "https://core-renderer-tiles.maps.yandex.net/tiles?l=map&x={x}&y={y}&z={z}&scale=1&lang=ru_RU&projection=web_mercator",
		//	"maxZoom": 20,
		//},
	}

	//layers = append(layers, map[string]any)

	return layers
}

func optionsHandler() air.Handler {
	return func(req *air.Request, res *air.Response) error {
		// Set CORS headers
		res.Header.Set("Access-Control-Allow-Origin", "*")
		res.Header.Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS, DELETE, PUT, PATCH")
		res.Header.Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With")
		res.Header.Set("Access-Control-Max-Age", "86400") // 24 hours

		// Return 200 OK status for preflight requests
		res.Status = 200
		return nil
	}
}

// setCORSHeaders sets CORS headers to allow all origins
func setCORSHeaders(res *air.Response) {
	res.Header.Set("Access-Control-Allow-Origin", "*")
	res.Header.Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS, DELETE, PUT, PATCH")
	res.Header.Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With")
	res.Header.Set("Access-Control-Expose-Headers", "Content-Length, Content-Type")
}

func getNavigationDistanceHandler(app *App) air.Handler {
	return func(req *air.Request, res *air.Response) error {
		setCORSHeaders(res)
		itemId := getStringParam(req, "itemId")
		if itemId == "" {
			res.Status = 400
			return res.WriteJSON(map[string]any{
				"success": false,
				"error":   "Missing itemId parameter",
			})
		}

		// Get user coordinates from query parameters
		httpReq := req.HTTPRequest()
		userLatStr := httpReq.URL.Query().Get("userLat")
		userLonStr := httpReq.URL.Query().Get("userLon")

		if userLatStr == "" || userLonStr == "" {
			res.Status = 400
			return res.WriteJSON(map[string]any{
				"success": false,
				"error":   "Missing userLat or userLon query parameters",
			})
		}

		userLat, err := strconv.ParseFloat(userLatStr, 64)
		if err != nil {
			res.Status = 400
			return res.WriteJSON(map[string]any{
				"success": false,
				"error":   "Invalid userLat parameter",
			})
		}

		userLon, err := strconv.ParseFloat(userLonStr, 64)
		if err != nil {
			res.Status = 400
			return res.WriteJSON(map[string]any{
				"success": false,
				"error":   "Invalid userLon parameter",
			})
		}

		// Get the item from the repository
		item := app.items.Get(itemId)
		if item == nil {
			res.Status = 404
			return res.WriteJSON(map[string]any{
				"success": false,
				"error":   "Item not found",
			})
		}

		// Calculate distance based on item type
		result, err := geo.CalculateNavigationDistance(item, userLat, userLon)
		if err != nil {
			res.Status = 500
			return res.WriteJSON(map[string]any{
				"success": false,
				"error":   err.Error(),
			})
		}

		return res.WriteJSON(map[string]any{
			"success": true,
			"data":    result,
		})
	}
}
