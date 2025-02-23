package main

import (
	"embed"
	"encoding/json"
	"fmt"
	"runtime/pprof"
	"strconv"
	"time"

	"github.com/kdudkov/goatak/internal/client"
	"github.com/kdudkov/goatak/internal/wshandler"

	"github.com/aofei/air"
	"github.com/google/uuid"

	"github.com/kdudkov/goatak/pkg/cot"
	"github.com/kdudkov/goatak/pkg/model"
	"github.com/kdudkov/goatak/staticfiles"
)

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

	srv.GET("/", getIndexHandler(app, renderer))
	srv.GET("/config", getConfigHandler(app))
	srv.PATCH("/config", changeConfigHandler(app))
	srv.GET("/types", getTypes)
	srv.POST("/dp", getDpHandler(app))
	srv.POST("/pos", getPosHandler(app))

	srv.GET("/ws", getWsHandler(app))

	srv.GET("/unit", getUnitsHandler(app))
	srv.POST("/unit", addItemHandler(app))
	srv.GET("/message", getMessagesHandler(app))
	srv.POST("/message", addMessageHandler(app))
	srv.DELETE("/unit/:uid", deleteItemHandler(app))

	srv.GET("/feeds", getFeedsHandler(app))
	srv.POST("/feeds", addFeedHandler(app))
	// srv.DELETE("/feeds/:uid", deleteFeedHandler(app))  // TODO

	srv.GET("/sensors", getSensorsHandler(app))
	srv.POST("/sensors", addSensorHandler(app))
	srv.DELETE("/sensors/:uid", deleteSensorHandler(app))

	srv.GET("/stack", getStackHandler())

	srv.RendererTemplateLeftDelim = "[["
	srv.RendererTemplateRightDelim = "]]"

	return srv
}

func getIndexHandler(app *App, r *staticfiles.Renderer) air.Handler {
	return func(req *air.Request, res *air.Response) error {
		data := map[string]any{
			"js": []string{"util.js", "components.js", "map.js"},
		}

		compf, err := staticfiles.StaticFiles.ReadDir("static/js/components")
		if err != nil {
			return err
		}
		for _, f := range compf {
			data["js"] = append(data["js"].([]string), fmt.Sprintf("components/%s", f.Name()))
		}

		s, err := r.Render(data, "map.html", "header.html")
		if err != nil {
			return err
		}

		return res.WriteHTML(s)
	}
}

func getUnitsHandler(app *App) air.Handler {
	return func(req *air.Request, res *air.Response) error {
		return res.WriteJSON(getUnits(app))
	}
}

func getFeedsHandler(app *App) air.Handler {
	return func(req *air.Request, res *air.Response) error {
		return res.WriteJSON(getFeeds(app))
	}
}

func getMessagesHandler(app *App) air.Handler {
	return func(req *air.Request, res *air.Response) error {
		return res.WriteJSON(app.chatMessages.Chats)
	}
}

func getConfigHandler(app *App) air.Handler {
	return func(req *air.Request, res *air.Response) error {
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

		m["layers"] = getLayers(app.mapServer)

		m["ip_address"] = app.ipAddress
		m["urn"] = app.urn

		return res.WriteJSON(m)
	}
}

func changeConfigHandler(app *App) air.Handler {
	return func(req *air.Request, res *air.Response) error {
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

		return res.WriteString("Ok")
	}
}

func getDpHandler(app *App) air.Handler {
	return func(req *air.Request, res *air.Response) error {
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

func addFeedHandler(app *App) air.Handler {
	return func(req *air.Request, res *air.Response) error {
		f := new(model.CoTFeed)

		if req.Body == nil {
			return nil
		}

		if err := json.NewDecoder(req.Body).Decode(f); err != nil {
			return err
		}

		if len(f.Type) > 0 && f.Type == "Rabbit" {
			newFeed := client.NewRabbitFeed(&client.RabbitFeedConfig{
				MessageCb: app.ProcessEvent,
				Addr:      f.Addr,
				Direction: client.FeedDirection(f.Direction),
				RecvQueue: f.RecvQueue,
				SendQueue: f.SendQueue,
				Title:     f.Title,
			})

			app.feeds = append(app.feeds, newFeed)
			if newFeed.IsActive() {
				newFeed.Start()
			}
		} else if len(f.Type) == 0 || f.Type == "UDP" {
			newFeed := client.NewUDPFeed(&client.UDPFeedConfig{
				MessageCb: app.ProcessEvent,
				Addr:      f.Addr,
				Port:      f.Port,
				Direction: client.FeedDirection(f.Direction),
				Title:     f.Title,
				Version:   1,
			})

			app.feeds = append(app.feeds, newFeed)
			newFeed.Start()
		}

		return res.WriteJSON(getFeeds(app))
	}
}

func addItemHandler(app *App) air.Handler {
	return func(req *air.Request, res *air.Response) error {
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

		var u *model.Item
		if wu.Category == "unit" || wu.Category == "point" || wu.Category == "drawing" {
			if u = app.items.Get(msg.GetUID()); u != nil {
				u.Update(msg)
				u.SetSend(wu.Send)
				app.items.Store(u)
			} else {
				u = model.FromMsg(msg)
				u.SetLocal(true)
				u.SetSend(wu.Send)
				app.items.Store(u)
			}
		}

		return res.WriteJSON(u.ToWeb())
	}
}

func addMessageHandler(app *App) air.Handler {
	return func(req *air.Request, res *air.Response) error {
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
		uid := getStringParam(req, "uid")
		app.items.Remove(uid)

		r := make(map[string]any, 0)
		r["units"] = getUnits(app)
		r["messages"] = app.chatMessages

		return res.WriteJSON(r)
	}
}

func getStackHandler() air.Handler {
	return func(req *air.Request, res *air.Response) error {
		return pprof.Lookup("goroutine").WriteTo(res.Body, 1)
	}
}

func getWsHandler(app *App) air.Handler {
	return func(req *air.Request, res *air.Response) error {
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

func getFeeds(app *App) []*model.CoTFeed {
	cotFeeds := make([]*model.CoTFeed, 0)

	for _, feed := range app.feeds {
		cotFeeds = append(cotFeeds, feed.ToCoTFeedModel())
	}

	return cotFeeds
}

func getStringParam(req *air.Request, name string) string {
	p := req.Param(name)
	if p == nil {
		return ""
	}

	return p.Value().String()
}

func getTypes(_ *air.Request, res *air.Response) error {
	return res.WriteJSON(cot.Root)
}

func getLayers(mapServer string) []map[string]any {
	layers := []map[string]any{
		{
			"name":    "Google Hybrid",
			"url":     "http://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}&s=Galileo",
			"maxZoom": 20,
			"parts":   []string{"0", "1", "2", "3"},
		},
		{
			"name":    "OSM",
			"url":     "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
			"maxZoom": 19,
			"parts":   []string{"a", "b", "c"},
		},
		{
			"name":    "Opentopo.cz",
			"url":     "https://tile-{s}.opentopomap.cz/{z}/{x}/{y}.png",
			"maxZoom": 18,
			"parts":   []string{"a", "b", "c"},
		},
		{
			"name":    "Yandex maps",
			"url":     "https://core-renderer-tiles.maps.yandex.net/tiles?l=map&x={x}&y={y}&z={z}&scale=1&lang=ru_RU&projection=web_mercator",
			"maxZoom": 20,
		},
	}

	if len(mapServer) > 0 {
		layers = append([]map[string]any{
			{
				"name":    "Local Server",
				"url":     fmt.Sprintf("http://%s/{z}/{x}/{y}.png", mapServer),
				"maxZoom": 13,
			},
		}, layers...)
	}

	return layers
}
