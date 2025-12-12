package main

import (
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
)

func NewHttp(app *App, address string) *air.Air {
	srv := air.New()
	srv.Address = address
	srv.DebugMode = true

	srv.OPTIONS("/config", optionsHandler())
	srv.GET("/config", authMiddleware(app, getConfigHandler(app)))
	srv.PATCH("/config", authMiddleware(app, changeConfigHandler(app)))
	srv.OPTIONS("/types", optionsHandler())
	srv.GET("/types", authMiddleware(app, getTypes))
	srv.OPTIONS("/dp", optionsHandler())
	srv.POST("/dp", authMiddleware(app, getDpHandler(app)))
	srv.OPTIONS("/pos", optionsHandler())
	srv.GET("/pos", authMiddleware(app, getPosHandler(app)))
	srv.POST("/pos", authMiddleware(app, changePosHandler(app)))

	srv.OPTIONS("/ws", optionsHandler())
	srv.GET("/ws", authMiddleware(app, getWsHandler(app)))

	srv.GET("/unit", authMiddleware(app, getUnitsHandler(app)))
	srv.POST("/unit", authMiddleware(app, addItemHandler(app)))
	srv.OPTIONS("/unit", optionsHandler())
	srv.OPTIONS("/unit/:uid", optionsHandler())
	srv.OPTIONS("/message", optionsHandler())
	srv.GET("/message", authMiddleware(app, getMessagesHandler(app)))
	srv.POST("/message", authMiddleware(app, addMessageHandler(app)))
	srv.DELETE("/unit/:uid", authMiddleware(app, deleteItemHandler(app)))
	srv.POST("/unit/:uid/send/", authMiddleware(app, sendItemHandler(app)))

	srv.OPTIONS("/flows", optionsHandler())
	srv.GET("/flows", authMiddleware(app, getFlowsHandler(app)))
	srv.POST("/flows", authMiddleware(app, addFlowHandler(app)))
	srv.OPTIONS("/flows/:uid", optionsHandler())
	srv.DELETE("/flows/:uid", authMiddleware(app, deleteFlowHandler(app)))

	srv.GET("/sensors", authMiddleware(app, getSensorsHandler(app)))
	srv.POST("/sensors", authMiddleware(app, addSensorHandler(app)))
	srv.OPTIONS("/sensors", optionsHandler())
	srv.DELETE("/sensors/:uid", authMiddleware(app, deleteSensorHandler(app)))
	srv.PUT("/sensors/:uid", authMiddleware(app, editSensorHandler(app)))
	srv.OPTIONS("/sensors/:uid", optionsHandler())

	// Navigation distance calculation endpoints
	srv.OPTIONS("/api/navigation/distance/:itemId", optionsHandler())
	srv.GET("/api/navigation/distance/:itemId", authMiddleware(app, getNavigationDistanceHandler(app)))

	// Tracking API endpoints
	srv.OPTIONS("/api/tracking/trails", optionsHandler())
	srv.GET("/api/tracking/trails", authMiddleware(app, getTrackingTrailsHandler(app)))
	srv.OPTIONS("/api/tracking/trail/:uid", optionsHandler())
	srv.GET("/api/tracking/trail/:uid", authMiddleware(app, getTrackingTrailHandler(app)))
	srv.OPTIONS("/api/tracking/config/:uid", optionsHandler())
	srv.POST("/api/tracking/config/:uid", authMiddleware(app, updateTrackingConfigHandler(app)))
	srv.OPTIONS("/api/tracking/settings", optionsHandler())

	// Resend configuration API endpoints
	srv.OPTIONS("/api/resend/configs", optionsHandler())
	srv.GET("/api/resend/configs", authMiddleware(app, getResendConfigsHandler(app)))
	srv.POST("/api/resend/configs", authMiddleware(app, createResendConfigHandler(app)))
	srv.OPTIONS("/api/resend/configs/:uid", optionsHandler())
	srv.GET("/api/resend/configs/:uid", authMiddleware(app, getResendConfigHandler(app)))
	srv.PUT("/api/resend/configs/:uid", authMiddleware(app, updateResendConfigHandler(app)))
	srv.DELETE("/api/resend/configs/:uid", authMiddleware(app, deleteResendConfigHandler(app)))

	srv.OPTIONS("/stack", optionsHandler())
	srv.GET("/stack", authMiddleware(app, getStackHandler()))

	srv.OPTIONS("/destinations", optionsHandler())
	srv.GET("/destinations", authMiddleware(app, getDestinationsHandler(app)))

	srv.RendererTemplateLeftDelim = "[["
	srv.RendererTemplateRightDelim = "]]"

	return srv
}

func authMiddleware(app *App, h air.Handler) air.Handler {
	return func(req *air.Request, res *air.Response) error {
		if req.Method == "OPTIONS" {
			return h(req, res)
		}

		if app.authClient == nil {
			// Fail open if auth not configured? Or fail closed?
			// User requirement implies strict auth.
			// However, if we fail closed, dev without keys is broken.
			// But keys are mandatory.
			res.Status = 500
			return res.WriteJSON(map[string]string{"error": "Auth not configured"})
		}

		authHeader := req.Header.Get("Authorization")
		if authHeader == "" {
			// Check query param for WebSocket as common fallback, but plans said Headers.
			// WS usually needs query token or cookie. Header is hard in standard JS WebSocket API.
			// But for now, sticking to Header. 'getWsHandler' might fail.
			// I'll add query param check for WS since it's common practice.
			// "access_token" param.
			token := req.HTTPRequest().URL.Query().Get("token")
			if token != "" {
				authHeader = "Bearer " + token
			}
		}

		if authHeader == "" {
			res.Status = 401
			return res.WriteJSON(map[string]string{"error": "Unauthorized"})
		}

		_, _, err := app.authClient.ValidateToken(authHeader)
		if err != nil {
			res.Status = 401
			return res.WriteJSON(map[string]string{"error": "Unauthorized"})
		}

		return h(req, res)
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

		// Update config and save to file
		app.config.Me.Uid = app.uid
		app.config.Me.Callsign = app.callsign
		app.config.Me.Ip = app.ipAddress
		app.config.Me.Urn = int(app.urn)

		if err := app.configManager.Save(*app.config); err != nil {
			app.logger.Error("failed to save config to file", "error", err)
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

		// Save the new flow to config
		if newFlow != nil {
			var flowConfig FlowConfig
			switch flow := newFlow.(type) {
			case *client.UDPFlow:
				flowConfig = FlowConfig{
					Title:     flow.Title,
					UID:       newFlow.ToCoTFlowModel().UID,
					Addr:      flow.Addr.IP.String(),
					Port:      flow.Addr.Port,
					Type:      "udp",
					Direction: int(flow.Direction),
				}
			case *client.RabbitFlow:
				rabbitModel := flow.ToCoTFlowModel()
				flowConfig = FlowConfig{
					Title:        rabbitModel.Title,
					UID:          rabbitModel.UID,
					Addr:         rabbitModel.Addr,
					Port:         0,
					Type:         "rabbit",
					Direction:    rabbitModel.Direction,
					SendExchange: rabbitModel.SendExchange,
					RecvQueue:    rabbitModel.RecvQueue,
				}
			}

			app.configManager.AddFlow(app.config, flowConfig)

			// Save config to file
			if err := app.configManager.Save(*app.config); err != nil {
				app.logger.Error("failed to save flow to config file", "error", err)
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

		// Handle different send modes
		switch wu.SendMode {
		case "broadcast":
			app.SendMsg(msg.GetTakMessage())
		case "subnet":
			if wu.SelectedSubnet != "" {
				dest := model.SendItemDest{
					Addr: wu.SelectedSubnet,
					URN:  16777215, // Broadcast URN for subnet
				}
				if err := app.SendMsgToDestination(msg.GetTakMessage(), dest); err != nil {
					app.logger.Error("failed to send to subnet", "error", err, "subnet", wu.SelectedSubnet)
				}
			}
		case "direct":
			if wu.SelectedIP != "" && wu.SelectedUrn != 0 {
				dest := model.SendItemDest{
					Addr: wu.SelectedIP,
					URN:  int(wu.SelectedUrn),
				}
				if err := app.SendMsgToDestination(msg.GetTakMessage(), dest); err != nil {
					app.logger.Error("failed to send to direct destination", "error", err, "ip", wu.SelectedIP, "urn", wu.SelectedUrn)
				}
			}
		case "none":
			// Don't send, local only
		default:
			// For backward compatibility, if SendMode is not set but Send is true, use broadcast
			if wu.Send {
				app.SendMsg(msg.GetTakMessage())
			}
		}

		app.logger.Debug("processing item", "uid", msg.GetUID(), "sendMode", wu.SendMode)

		var u *model.Item
		if u = app.items.Get(msg.GetUID()); u != nil {
			u.Update(msg)
			u.SetSend(wu.Send)
			u.SetLastSent()
			u.SetSendMode(wu.SendMode)
			u.SetSelectedSubnet(wu.SelectedSubnet)
			u.SetSelectedUrn(wu.SelectedUrn)
			u.SetSelectedIP(wu.SelectedIP)
			app.items.Store(u)
			app.changeCb.AddMessage(u)
		} else {
			u = model.FromMsg(msg)
			u.SetLocal(true)
			u.SetSend(wu.Send)
			u.SetLastSent()
			u.SetSendMode(wu.SendMode)
			u.SetSelectedSubnet(wu.SelectedSubnet)
			u.SetSelectedUrn(wu.SelectedUrn)
			u.SetSelectedIP(wu.SelectedIP)
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

		uid := getStringParam(req, "uid")
		item := app.items.Get(uid)
		if item == nil {
			return nil
		}

		err := rabbitmq.SendCotToDestinations(item.GetMsg().GetTakMessage(), destinations)
		if err != nil {
			return err
		}

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

		// Remove the flow from the slice
		app.flows = append(app.flows[:foundIndex], app.flows[foundIndex+1:]...)

		// Delete the flow from config
		app.configManager.RemoveFlow(app.config, uid)

		// Save config to file
		if err := app.configManager.Save(*app.config); err != nil {
			app.logger.Error("failed to save flow deletion to config file", "error", err)
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

func getDestinationsHandler(app *App) air.Handler {
	return func(req *air.Request, res *air.Response) error {
		setCORSHeaders(res)

		if app.dnsServiceProxy == nil {
			res.Status = 500
			return res.WriteJSON(map[string]any{
				"success": false,
				"error":   "DNS service proxy not initialized",
			})
		}

		// Get our own addresses for subnet broadcast options
		ownAddresses := make([]string, 0)
		ownAddrs, err := app.dnsServiceProxy.GetAddressesByUrn(int(app.urn))
		app.logger.Info("GET ADDR BY URN", "ownAddrs", ownAddrs, "err", err)
		if err == nil && ownAddrs != nil {
			// Handle multiple addresses returned for our URN
			for _, addr := range ownAddrs {
				if addr.IPAddress != nil {
					// Handle comma-separated IP addresses pattern
					ips := strings.Split(*addr.IPAddress, ",")
					for _, ip := range ips {
						ip = strings.TrimSpace(ip)
						if ip != "" {
							ownAddresses = append(ownAddresses, ip)
						}
					}
				}
			}
		}

		// Get all addresses for direct destination options
		directDestinations := make([]map[string]any, 0)
		addresses, err := app.dnsServiceProxy.GetAddresses()
		if err == nil {
			// Group IP addresses by URN, excluding our own URN
			urnToIPs := make(map[int32][]string)
			urnToName := make(map[int32]string)

			for _, addr := range addresses {
				if addr.Urn == nil || addr.IPAddress == nil {
					continue
				}

				// Skip addresses with our URN
				if *addr.Urn == app.urn {
					continue
				}

				urn := *addr.Urn
				ip := *addr.IPAddress

				// Handle comma-separated IP addresses pattern
				ips := strings.Split(ip, ",")
				for _, singleIP := range ips {
					singleIP = strings.TrimSpace(singleIP)
					if singleIP != "" {
						urnToIPs[urn] = append(urnToIPs[urn], singleIP)
					}
				}

				// Use UnitName if available, otherwise use URN as name
				if addr.UnitName != nil && *addr.UnitName != "" {
					urnToName[urn] = *addr.UnitName
				} else if _, exists := urnToName[urn]; !exists {
					urnToName[urn] = fmt.Sprintf("Node-%d", urn)
				}
			}

			// Create direct destination entries for each unique URN
			for urn, ips := range urnToIPs {
				name := urnToName[urn]
				for _, ip := range ips {
					directDestinations = append(directDestinations, map[string]any{
						"urn":  urn,
						"ip":   ip,
						"name": name,
					})
				}
			}
		}

		response := map[string]any{
			"success":            true,
			"ownAddresses":       ownAddresses,
			"directDestinations": directDestinations,
		}

		return res.WriteJSON(response)
	}
}
