package main

import (
	"context"
	"crypto/md5"
	"crypto/tls"
	"crypto/x509"
	"encoding/hex"
	"flag"
	"fmt"
	"github.com/peterstace/simplefeatures/geom"
	"log/slog"
	"math/rand"
	"net"
	"os"
	"os/signal"
	"slices"
	"strings"
	"sync"
	"sync/atomic"
	"syscall"
	"time"

	"github.com/google/uuid"

	"github.com/kdudkov/goatak/pkg/sensors"
	"google.golang.org/protobuf/proto"

	"github.com/spf13/viper"

	"github.com/kdudkov/goatak/internal/client"
	"github.com/kdudkov/goatak/internal/repository"
	"github.com/kdudkov/goatak/pkg/cot"
	"github.com/kdudkov/goatak/pkg/cotproto"
	"github.com/kdudkov/goatak/pkg/log"
	"github.com/kdudkov/goatak/pkg/model"
	"github.com/kdudkov/goatak/pkg/tlsutil"
	"github.com/kdudkov/goutils/callback"
)

const (
	selfPosSendPeriod      = time.Minute * 2
	lastSeenOfflineTimeout = time.Minute * 15
	alfaNum                = "abcdefghijklmnopqrstuvwxyz012346789"
)

type App struct {
	dialTimeout     time.Duration
	host            string
	tcpPort         string
	webPort         int
	logger          *slog.Logger
	ch              chan []byte
	items           repository.ItemsRepository
	chatMessages    *model.ChatMessages
	tls             bool
	tlsCert         *tls.Certificate
	cas             *x509.CertPool
	cl              *client.ConnClientHandler
	mesh            *client.MeshHandler
	changeCb        *callback.Callback[*model.Item]
	deleteCb        *callback.Callback[string]
	chatCb          *callback.Callback[*model.ChatMessage]
	eventProcessors []*EventProcessor
	remoteAPI       *RemoteAPI
	saveFile        string
	connected       uint32
	mapServer       string

	feeds   []client.CoTFeed
	sensors []sensors.BaseSensor

	alarms []string

	selfPosEventMutators sync.Map

	callsign string
	uid      string
	typ      string
	team     string
	device   string
	version  string
	platform string
	os       string
	role     string
	pos      atomic.Pointer[model.Pos]
	zoom     int8

	ipAddress string
	urn       int32
}

type CoTEventMutator struct {
	mutation *cotproto.CotEvent
	logger   *slog.Logger
}

func (m *CoTEventMutator) mutate(event *cotproto.CotEvent) bool {
	// m.logger.Debug("Started mutating")
	if m.mutation.GetStaleTime() == 0 || m.mutation.GetStaleTime() > cot.TimeToMillis(time.Now()) {
		// m.logger.Debug("... Valid mutation")
		if mutationCopy, ok := proto.Clone(m.mutation).(*cotproto.CotEvent); ok {
			// m.logger.Debug("... Copied CotEvent ->" + mutationCopy.String())
			mutationCopy.Uid = ""
			mutationCopy.StaleTime = 0
			// m.logger.Debug("... Removed Fields")
			proto.Merge(event, mutationCopy)
			// m.logger.Debug("... Merged")
			return true
		}
	}

	return false
}

type FeedConfig struct {
	Title     string `mapstructure:"title,omitempty"`
	Addr      string `mapstructure:"address"`
	Port      int    `mapstructure:"port"`
	Type      string `mapstructure:"type,omitempty"`
	SendQueue string `mapstructure:"sendQueue,omitempty"`
	RecvQueue string `mapstructure:"recvQueue,omitempty"`
}

// type FeedsConfig struct {
// 	incoming []FeedConfig `mapstructure:"incoming"`
// 	outgoing []FeedConfig `mapstructure:"outgoing"`
// }

// Get preferred outbound ip of this machine
func getOutboundIP() net.IP {
	logger := slog.Default()
	conn, err := net.Dial("udp", "8.8.8.8:80")
	if err != nil {
		logger.Error(err.Error())
	}
	defer func(conn net.Conn) {
		err := conn.Close()
		if err != nil {

		}
	}(conn)

	localAddr := conn.LocalAddr().(*net.UDPAddr)

	return localAddr.IP
}

func NewApp(uid string, callsign string, connectStr string, webPort int, mapServer string, urn int32, ipAddress string) *App {
	logger := slog.Default()
	parts := strings.Split(connectStr, ":")

	if len(parts) != 3 {
		logger.Error("invalid connect string: " + connectStr)

		return nil
	}

	var tlsConn bool

	switch parts[2] {
	case "tcp":
		tlsConn = false
	case "ssl":
		tlsConn = true
	default:
		logger.Error("invalid connect string " + connectStr)

		return nil
	}

	return &App{
		logger:          logger,
		callsign:        callsign,
		uid:             uid,
		host:            parts[0],
		tcpPort:         parts[1],
		tls:             tlsConn,
		webPort:         webPort,
		items:           repository.NewItemsMemoryRepo(),
		dialTimeout:     time.Second * 5,
		changeCb:        callback.New[*model.Item](),
		deleteCb:        callback.New[string](),
		chatCb:          callback.New[*model.ChatMessage](),
		chatMessages:    model.NewChatMessages(uid),
		eventProcessors: make([]*EventProcessor, 0),
		pos:             atomic.Pointer[model.Pos]{},
		mapServer:       mapServer,
		ipAddress:       ipAddress,
		urn:             urn,
		feeds:           make([]client.CoTFeed, 0),

		selfPosEventMutators: sync.Map{},
		alarms:               make([]string, 0),
	}
}

func (app *App) Init() {
	app.remoteAPI = NewRemoteAPI(app.host, app.logger.With("logger", "api"))

	if app.tls {
		app.remoteAPI.SetTLS(app.getTLSConfig())
	}

	app.ch = make(chan []byte, 20)
	app.InitMessageProcessors()

	var outgoingFeedConfigs []FeedConfig
	var incomingFeedConfigs []FeedConfig

	if err := viper.UnmarshalKey("feeds.outgoing", &outgoingFeedConfigs); err != nil {
		panic(err)
	}

	// TODO: rabbit
	for _, feedConfig := range outgoingFeedConfigs {
		app.feeds = append(app.feeds, client.NewUDPFeed(&client.UDPFeedConfig{
			Addr:      feedConfig.Addr,
			Port:      feedConfig.Port,
			Direction: client.OUTGOING,
		}))
		app.logger.Info("Outgoing feed added", "addr", fmt.Sprintf("%s:%d", feedConfig.Addr, feedConfig.Port))
	}

	if err := viper.UnmarshalKey("feeds.incoming", &incomingFeedConfigs); err != nil {
		panic(err)
	}

	// TODO: rabbit
	for _, feedConfig := range incomingFeedConfigs {
		app.feeds = append(app.feeds, client.NewUDPFeed(&client.UDPFeedConfig{
			MessageCb: app.ProcessEvent,
			Addr:      feedConfig.Addr,
			Port:      feedConfig.Port,
			Direction: client.INCOMING,
		}))
		app.logger.Info("Incoming feed added", "addr", fmt.Sprintf("%s:%d", feedConfig.Addr, feedConfig.Port))
	}

	app.createDefaultRabbitFeed()

	app.changeCb.Subscribe(app.checkGeofences)
	app.deleteCb.Subscribe(app.updateGeofencesAfterDelete)
}

func (app *App) sensorCallback(data any) {
	switch data := data.(type) {
	case *cotproto.CotEvent:
		if strings.HasPrefix(data.GetUid(), "$self") {
			if data.GetUid() == "$self.pos" {
				app.pos.Store(model.NewPosFull(data.Lat, data.Lon, data.Hae, data.Detail.Track.Speed, data.Detail.Track.Course))
				app.logger.Info("position from gpsd", "lat", data.Lat, "lon", data.Lon, "alt", data.Hae, "speed", data.Detail.Track.Speed, "track", data.Detail.Track.Course)
				app.changeCb.AddMessage(model.FromMsg(cot.LocalCotMessage(app.MakeMe())))
			}
			app.selfPosEventMutators.Store(data.GetUid(), CoTEventMutator{
				mutation: data,
				logger:   app.logger.With("logger", "mutators"+data.GetUid()),
			})
			app.SendMsg(app.MakeMe()) // TODO: should we send such a big message every time???
		} else {
			data.SendTime = cot.TimeToMillis(time.Now())
			takMessage := &cotproto.TakMessage{CotEvent: data}
			app.ProcessEvent(cot.LocalCotMessage(takMessage))
			app.SendMsg(takMessage)
		}
	default:
		app.logger.Info("Unknown sensor data")
	}
}

func (app *App) Run(ctx context.Context) {
	if app.webPort >= 0 {
		go func() {
			addr := fmt.Sprintf(":%d", app.webPort)
			app.logger.Info("listening " + addr)

			if err := NewHttp(app, addr).Serve(); err != nil {
				panic(err)
			}
		}()
	}

	go app.cleaner()

	app.logger.Debug("GPSD", "addr", viper.GetString("gpsd"))

	if addr := viper.GetString("gpsd"); addr != "" {
		var gpsdSensor = &sensors.GpsdSensor{
			Addr:         addr,
			Conn:         nil,
			Logger:       app.logger.With("logger", "gpsd"),
			Reader:       nil,
			Type:         "GPS",
			UID:          uuid.New().String(),
			Interval:     time.Duration(15) * time.Second,
			Ctx:          ctx,
			Title:        "مکان‌یاب",
			SerialPort:   viper.GetString("gps_port"),
			TCPProxyAddr: "host.docker.internal:4040",
		}
		app.sensors = append(app.sensors, gpsdSensor)

		gpsdSensor.Initialize()
		go gpsdSensor.Start(app.sensorCallback)
	}

	/* app.mesh = client.NewMeshHandler(&client.MeshHandlerConfig{
		MessageCb: app.ProcessEvent,
	})
	app.mesh.Start() */

	for _, feed := range app.feeds {
		feed.Start()
	}

	go app.myPosSender(ctx)

	for ctx.Err() == nil {
		conn, err := app.connect()
		if err != nil {
			app.logger.Error("connect error", "error", err)
			time.Sleep(time.Second * 5)

			continue
		}

		app.SetConnected(true)
		app.logger.Info("connected")

		wg := new(sync.WaitGroup)
		wg.Add(1)

		ctx1, cancel1 := context.WithCancel(ctx)

		app.cl = client.NewConnClientHandler(fmt.Sprintf("%s:%s", app.host, app.tcpPort), conn, &client.HandlerConfig{
			MessageCb: app.ProcessEvent,
			RemoveCb: func(ch client.ClientHandler) {
				app.SetConnected(false)
				wg.Done()
				cancel1()
				app.logger.Info("disconnected")
			},
			IsClient: true,
			UID:      app.uid,
		})

		go app.cl.Start()
		go app.periodicGetter(ctx1)

		wg.Wait()
	}
}

func (app *App) SetConnected(connected bool) {
	if connected {
		atomic.StoreUint32(&app.connected, 1)
	} else {
		atomic.StoreUint32(&app.connected, 0)
	}
}

func (app *App) IsConnected() bool {
	return atomic.LoadUint32(&app.connected) != 0
}

func makeUID(callsign string) string {
	s := hex.EncodeToString(md5.New().Sum([]byte(callsign)))

	return "ANDROID-" + s[:16]
}

func (app *App) myPosSender(ctx context.Context) {
	app.SendMsg(app.MakeMe())

	ticker := time.NewTicker(time.Second * time.Duration(viper.GetInt("me.interval")))
	defer ticker.Stop()

	for ctx.Err() == nil {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			app.logger.Debug("sending pos")
			app.SendMsg(app.MakeMe())
			app.sendMyPoints()
		}
	}
}

func (app *App) SendMsg(msg *cotproto.TakMessage) {
	app.logger.Debug("sending...")
	if app.mesh != nil {
		if err := app.mesh.SendCot(msg); err != nil {
			app.logger.Error("mesh send error", "error", err)
		}
	}
	if app.cl != nil {
		if err := app.cl.SendCot(msg); err != nil {
			app.logger.Error("client send error", "error", err)
		}
	}

	for _, feed := range app.feeds {
		if err := feed.SendCot(msg); err != nil {
			app.logger.Error("feed send error", "error", err, "feed", feed)
		}
	}
}

func (app *App) ProcessEvent(msg *cot.CotMessage) {
	for _, prc := range app.eventProcessors {
		if cot.MatchAnyPattern(msg.GetType(), prc.include...) {
			app.logger.Debug("msg is processed by " + prc.name)
			prc.cb(msg)
		}
	}
}

func (app *App) MutateSelfPosMessage(msg *cotproto.CotEvent) {
	// app.logger.Debug("Mutate self pos message...")
	app.selfPosEventMutators.Range(func(key, value any) bool {
		if mutator, ok := value.(CoTEventMutator); ok {
			// app.logger.Debug("Mutator -> " + mutator.mutation.String())
			if !mutator.mutate(msg) {
				app.selfPosEventMutators.LoadAndDelete(key.(string))
			}
		}
		return true
	})
}

func (app *App) MakeMe() *cotproto.TakMessage {
	ev := cot.BasicMsg(app.typ, app.uid, time.Minute*2)
	pos := app.pos.Load()

	ev.CotEvent.Lat = pos.GetLat()
	ev.CotEvent.Lon = pos.GetLon()
	ev.CotEvent.Hae = pos.GetAlt()
	ev.CotEvent.Ce = pos.GetCe()

	ev.CotEvent.Detail = &cotproto.Detail{
		Contact: &cotproto.Contact{
			Endpoint: "*:-1:stcp",
			Callsign: app.callsign,
			ClientInfo: &cotproto.ClientInfo{
				IpAddress: app.ipAddress,
				Urn:       app.urn,
			},
		},
		Group: &cotproto.Group{
			Name: app.team,
			Role: app.role,
		},
		Takv: &cotproto.Takv{
			Device:   app.device,
			Platform: app.platform,
			Os:       app.os,
			Version:  app.version,
		},
		// Track: &cotproto.Track{
		// 	Speed:  pos.GetSpeed(),
		// 	Course: pos.GetTrack(),
		// },
		// PrecisionLocation: &cotproto.PrecisionLocation{
		// 	Geopointsrc: "GPS",
		// 	Altsrc:      "GPS",
		// },
		Status: &cotproto.Status{Battery: 39},
	}
	ev.CotEvent.Detail.XmlDetail = fmt.Sprintf("<uid Droid=\"%s\"></uid>", app.callsign)

	app.MutateSelfPosMessage(ev.CotEvent)

	// TODO: Refactor this and make it configurable...
	//app.MakeFenceAroundMe()

	return ev
}

func (app *App) GetVersion() string {
	return fmt.Sprintf("%s %s", app.platform, app.version)
}

func RandString(strlen int) string {
	result := make([]byte, strlen)
	for i := 0; i < strlen; i++ {
		result[i] = alfaNum[rand.Intn(len(alfaNum))]
	}

	return string(result)
}

func (app *App) cleaner() {
	for range time.Tick(time.Minute) {
		app.cleanOldUnits()
	}
}

func (app *App) cleanOldUnits() {
	toDelete := make([]string, 0)

	app.items.ForEach(func(item *model.Item) bool {
		switch item.GetClass() {
		case model.UNIT, model.POINT:
			if item.IsOld() {
				toDelete = append(toDelete, item.GetUID())
				app.logger.Debug(fmt.Sprintf("removing %s %s", item.GetClass(), item.GetUID()))
			}
		case model.CONTACT:
			if item.IsOld() {
				toDelete = append(toDelete, item.GetUID())
				app.logger.Debug("removing contact " + item.GetUID())
			} else if item.IsOnline() && item.GetLastSeen().Add(lastSeenOfflineTimeout).Before(time.Now()) {
				item.SetOffline()
				app.changeCb.AddMessage(item)
			}
		}

		return true
	})

	for _, uid := range toDelete {
		app.items.Remove(uid)
		app.deleteCb.AddMessage(uid)
	}
}

func (app *App) sendMyPoints() {
	app.items.ForEach(func(item *model.Item) bool {
		if item.IsSend() {
			app.SendMsg(item.GetMsg().GetTakMessage())
		}

		return true
	})
}

func (app *App) getTLSConfig() *tls.Config {
	conf := &tls.Config{ //nolint:exhaustruct
		Certificates: []tls.Certificate{*app.tlsCert},
		RootCAs:      app.cas,
		ClientCAs:    app.cas,
	}

	if !viper.GetBool("ssl.strict") {
		conf.InsecureSkipVerify = true
	}

	return conf
}

func (app *App) updateGeofencesAfterDelete(uid string) bool {
	if !strings.HasPrefix(uid, "ALARM.") && len(uid) > 8 {
		toDelete := make([]string, 0)
		app.items.ForEach(func(item *model.Item) bool {
			uidPart := uid
			if len(uidPart) > 8 {
				uidPart = uidPart[:8]
			}
			if item.GetClass() == model.ALARM && strings.Contains(item.GetUID(), uidPart) {
				toDelete = append(toDelete, item.GetUID())
			}
			return true
		})
		for _, uid := range toDelete {
			// TODO remove from app.alarms!!
			app.items.Remove(uid)
			app.deleteCb.AddMessage(uid)
		}
	}
	return true
}

func (app *App) checkGeofences(changedItem *model.Item) bool {
	app.logger.Info("Checking Geofences")
	if changedItem.GetClass() != model.UNIT && changedItem.GetClass() != model.CONTACT {
		//app.logger.Info("Not Unit")
		return true
	}

	app.items.ForEach(func(item *model.Item) bool {
		//app.logger.Info(" Checking item: " + item.GetUID())
		if item.GetClass() == model.DRAWING && item.GetMsg().IsGeofenceActive() {
			//app.logger.Info("  HAS GEOFENCE")
			if links := item.GetMsg().Detail.GetAll("link"); len(links) > 0 {
				linksList := make([]string, 0)
				for _, link := range links {
					point := link.GetAttr("point")
					if len(point) > 0 {
						linksList = append(linksList, strings.ReplaceAll(point, ",", " "))
					}
				}
				linksList = append(linksList, linksList[0])
				wkt := "POLYGON((" + strings.Join(linksList, ", ") + "))"
				//app.logger.Info("  WKT: " + wkt)
				polygon, _ := geom.UnmarshalWKT(wkt)
				//app.logger.Info("  Geofence Aff: " + item.GetMsg().GetGeofenceAff() + " Unit type: " + changedItem.GetType())
				if item.GetMsg().GetGeofenceAff() == "All" || (item.GetMsg().GetGeofenceAff() == "Friendly" && changedItem.GetMsg().Is(cot.FRIENDLY)) || (item.GetMsg().GetGeofenceAff() == "Hostile" && changedItem.GetMsg().Is(cot.HOSTILE)) {
					//app.logger.Info("  Compatible! => Checking...")
					lat, lng := changedItem.GetLanLon()
					//app.logger.Info("  LATLNG", "lat", lat, "lng", lng)
					//app.logger.Info("  POLYGON: " + polygon.String() + " POINT: " + geom.NewPointXY(lat, lng).AsText())
					contains, _ := geom.Contains(polygon, geom.NewPointXY(lat, lng).AsGeometry())
					//app.logger.Info("  CONTAINS? ", "contains", contains, "err", err)
					if contains {
						alarmMsg := cot.MakeAlarmMsg(changedItem.GetUID(), item.GetUID())
						alarmItem := model.FromMsg(cot.LocalCotMessage(alarmMsg))
						if !slices.Contains(app.alarms, alarmItem.GetUID()) {
							//app.logger.Info("  *** ALARM ***  " + alarmItem.String())
							fmt.Printf("%c\n", 7)
							app.items.Store(alarmItem)
							app.changeCb.AddMessage(alarmItem)
						}
					}
				}
			} else {
				//app.logger.Info("  !!! NO LINKS !!!  ")
				return true
			}
		}
		return true
	})

	return true
}

func (app *App) MakeFenceAroundMe() {
	var u *model.Item
	pos := app.pos.Load()
	app.items.Remove(app.uid + "-fence")
	fenceMsg := cot.MakeFenceMsg(app.uid+"-fence", pos.Lat, pos.Lon, 0.01)
	u = model.FromMsg(cot.LocalCotMessage(fenceMsg))
	app.items.Store(u)
	app.changeCb.AddMessage(u)
}

func (app *App) createDefaultRabbitFeed() {
	destinations := make([]model.SendItemDest, 1)
	destinations[0] = model.SendItemDest{
		Addr: viper.GetString("default_dest_ip"),
		URN:  viper.GetInt("default_dest_urn"),
	}

	newFeed := client.NewRabbitFeed(&client.RabbitFeedConfig{
		MessageCb:    app.ProcessEvent,
		Addr:         fmt.Sprintf("amqp://rabbitmqserver:5672/%d", app.urn),
		Direction:    client.BOTH,
		RecvQueue:    "SituationalAwarenessReceiveQueue",
		SendQueue:    "SendVmfCommand",
		Title:        "DataLink",
		Destinations: destinations,
		ClientInfo: &cotproto.ClientInfo{
			IpAddress: app.ipAddress,
			Urn:       app.urn,
		},
	})

	app.feeds = append(app.feeds, newFeed)
}

func (app *App) forceLocationUpdate() {
	for _, sensor := range app.sensors {
		if sensor.GetType() == "GPS" {
			sensor.(*sensors.GpsdSensor).ForceUpdate()
		}
	}
}

func main() {
	conf := flag.String("config", "goatak_client.yml", "name of config file")
	noweb := flag.Bool("noweb", false, "do not start web server")
	debug := flag.Bool("debug", false, "debug")
	saveFile := flag.String("file", "", "record all events to file")
	flag.Parse()

	viper.SetConfigFile(*conf)

	viper.SetDefault("server_address", "127.0.0.1:8087:tcp")
	viper.BindEnv("server_address")

	viper.SetDefault("web_port", 8080)
	viper.BindEnv("web_port")

	viper.SetDefault("me.callsign", RandString(10))
	viper.BindEnv("me.callsign", "CALLSIGN")

	viper.SetDefault("me.lat", 0.0)
	viper.BindEnv("me.lat", "LAT")
	viper.SetDefault("me.lon", 0.0)
	viper.BindEnv("me.lon", "LON")
	viper.SetDefault("me.zoom", 5)
	viper.BindEnv("me.zoom", "ZOOM")
	viper.SetDefault("me.type", "a-f-G-U-C")
	viper.BindEnv("me.type", "TYPE")
	viper.SetDefault("me.team", "Blue")
	viper.BindEnv("me.team", "TEAM")
	viper.SetDefault("me.role", "HQ")
	viper.BindEnv("me.role", "ROLE")
	viper.SetDefault("me.platform", "GoATAK_client")
	viper.BindEnv("platform", "PLATFORM")
	viper.SetDefault("me.version", getVersion())
	viper.BindEnv("me.version", "VERSION")
	viper.SetDefault("ssl.password", "atakatak")
	viper.BindEnv("ssl.password", "SSL_PASSWORD")
	viper.SetDefault("ssl.save_cert", true)
	viper.BindEnv("ssl.save_cert", "SSL_SAVE_CERT")
	viper.SetDefault("ssl.strict", false)
	viper.BindEnv("ssl.strict", "SSL_STRICT")
	viper.SetDefault("map_server", "127.0.0.1:8000")
	viper.BindEnv("map_server", "MAP_SERVER")

	viper.SetDefault("gpsd", "gpsd:2947")
	viper.BindEnv("gpsd", "GPSD")

	viper.BindEnv("me.uid", "ME_UID")
	viper.BindEnv("me.OS", "OS")
	viper.BindEnv("ssl.enroll_user", "SSL_ENROLL_USER")
	viper.BindEnv("ssl.enroll_password", "SSL_ENROLL_PASSWORD")
	viper.BindEnv("ssl.cert", "SSL_CERT")

	viper.BindEnv("me.urn", "URN")
	viper.BindEnv("me.ip", "ME_IP")

	viper.SetDefault("me.interval", 15)

	viper.BindEnv("default_dest_ip", "DEFAULT_DEST_IP")
	viper.BindEnv("default_dest_urn", "DEFAULT_DEST_URN")
	viper.SetDefault("default_dest_ip", "255.255.255.255")
	viper.SetDefault("default_dest_urn", 16777215)

	err := viper.ReadInConfig()
	if err != nil {
		panic(fmt.Errorf("fatal error config file: %w", err))
	}

	var h slog.Handler
	if *debug {
		h = log.NewHandler(&slog.HandlerOptions{Level: slog.LevelDebug})
	} else {
		h = log.NewHandler(&slog.HandlerOptions{Level: slog.LevelInfo})
	}

	slog.SetDefault(slog.New(h))

	uid := viper.GetString("me.uid")
	if uid == "auto" || uid == "" {
		uid = makeUID(viper.GetString("me.callsign"))
	}

	app := NewApp(
		uid,
		viper.GetString("me.callsign"),
		viper.GetString("server_address"),
		viper.GetInt("web_port"),
		viper.GetString("map_server"),
		viper.GetInt32("me.urn"),
		viper.GetString("me.ip"),
	)

	app.saveFile = *saveFile

	if *noweb {
		app.webPort = -1
	}

	app.pos.Store(model.NewPos(viper.GetFloat64("me.lat"), viper.GetFloat64("me.lon")))
	app.zoom = int8(viper.GetInt("me.zoom"))
	app.typ = viper.GetString("me.type")
	app.team = viper.GetString("me.team")
	app.role = viper.GetString("me.role")

	app.device = viper.GetString("me.device")
	app.version = viper.GetString("me.version")
	app.platform = viper.GetString("me.platform")
	app.os = viper.GetString("me.os")

	app.logger.Info("callsign: " + app.callsign)
	app.logger.Info("uid: " + app.uid)
	app.logger.Info("team: " + app.team)
	app.logger.Info("role: " + app.role)
	app.logger.Info("server: " + viper.GetString("server_address"))

	ctx, cancel := context.WithCancel(context.Background())

	if app.tls {
		if user := viper.GetString("ssl.enroll_user"); user != "" {
			passw := viper.GetString("ssl.enroll_password")
			if passw == "" {
				fmt.Println("no enroll_password")

				return
			}

			enr := client.NewEnroller(app.host, user, passw, viper.GetBool("ssl.save_cert"))

			cert, cas, err := enr.GetOrEnrollCert(ctx, app.uid, app.GetVersion())
			if err != nil {
				app.logger.Error("error while enroll cert: " + err.Error())

				return
			}

			app.tlsCert = cert
			app.cas = tlsutil.MakeCertPool(cas...)
		} else {
			app.logger.Info("loading cert from file " + viper.GetString("ssl.cert"))

			cert, cas, err := client.LoadP12(viper.GetString("ssl.cert"), viper.GetString("ssl.password"))
			if err != nil {
				app.logger.Error("error while loading cert: " + err.Error())

				return
			}

			tlsutil.LogCert(app.logger, "loaded cert", cert.Leaf)
			app.tlsCert = cert
			app.cas = tlsutil.MakeCertPool(cas...)
		}
	}

	app.Init()

	go app.Run(ctx)

	c := make(chan os.Signal, 1)
	signal.Notify(c, syscall.SIGINT, syscall.SIGTERM)
	<-c

	cancel()
}
