package main

import (
	"context"
	"crypto/md5"
	"crypto/tls"
	"crypto/x509"
	"database/sql"
	"encoding/hex"
	"flag"
	"fmt"
	"log/slog"
	"math/rand"
	"net"
	"os"
	"os/signal"
	"strings"
	"sync"
	"sync/atomic"
	"syscall"
	"time"

	"github.com/kdudkov/goatak/internal/resend"
	"github.com/kdudkov/goatak/internal/tracking"
	"github.com/kdudkov/goatak/internal/wshandler"
	_ "modernc.org/sqlite"

	"github.com/google/uuid"

	"github.com/kdudkov/goatak/pkg/sensors"
	"google.golang.org/protobuf/proto"

	"github.com/spf13/viper"

	"github.com/kdudkov/goatak/internal/client"
	"github.com/kdudkov/goatak/internal/dnsproxy"
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
	dialTimeout      time.Duration
	host             string
	tcpPort          string
	webPort          int
	logger           *slog.Logger
	ch               chan []byte
	items            repository.ItemsRepository
	chatMessages     *model.ChatMessages
	tls              bool
	tlsCert          *tls.Certificate
	cas              *x509.CertPool
	cl               *client.ConnClientHandler
	mesh             *client.MeshHandler
	changeCb         *callback.Callback[*model.Item]
	deleteCb         *callback.Callback[string]
	chatCb           *callback.Callback[*model.ChatMessage]
	trackingUpdateCb *callback.Callback[*wshandler.TrackingUpdateData]
	eventProcessors  []*EventProcessor
	remoteAPI        *RemoteAPI
	saveFile         string
	connected        uint32
	mapServer        string

	flows             []client.CoTFlow
	sensors           []sensors.BaseSensor
	defaultRabbitFlow *client.RabbitFlow

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

	DB              *sql.DB
	trackingService *tracking.TrackingService
	dnsServiceProxy *dnsproxy.DnsServiceProxy
	resendService   *resend.ResendService
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

type FlowConfig struct {
	UID          string `mapstructure:"uid,omitempty"`
	Title        string `mapstructure:"title,omitempty"`
	Addr         string `mapstructure:"address"`
	Port         int    `mapstructure:"port"`
	Type         string `mapstructure:"type,omitempty"`
	Direction    int    `mapstructure:"direction,omitempty"`
	SendExchange string `mapstructure:"sendExchange,omitempty"`
	RecvQueue    string `mapstructure:"recvQueue,omitempty"`
}

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
		logger:           logger,
		callsign:         callsign,
		uid:              uid,
		host:             parts[0],
		tcpPort:          parts[1],
		tls:              tlsConn,
		webPort:          webPort,
		items:            repository.NewItemsMemoryRepo(),
		dialTimeout:      time.Second * 5,
		changeCb:         callback.New[*model.Item](),
		deleteCb:         callback.New[string](),
		chatCb:           callback.New[*model.ChatMessage](),
		trackingUpdateCb: callback.New[*wshandler.TrackingUpdateData](),
		chatMessages:     model.NewChatMessages(uid),
		eventProcessors:  make([]*EventProcessor, 0),
		pos:              atomic.Pointer[model.Pos]{},
		mapServer:        mapServer,
		ipAddress:        ipAddress,
		urn:              urn,
		flows:            make([]client.CoTFlow, 0),

		selfPosEventMutators: sync.Map{},
		alarms:               make([]string, 0),
	}
}

func (app *App) Init() {
	app.remoteAPI = NewRemoteAPI(app.host, app.logger.With("logger", "api"))

	if app.tls {
		app.remoteAPI.SetTLS(app.getTLSConfig())
	}

	app.InitServices()

	app.ch = make(chan []byte, 20)
	app.InitMessageProcessors()

	initFlowsSensorsAndConfig(app)

	// Ensure default rabbit flow is created if no rabbit flows were loaded
	hasRabbitFlow := false
	for _, flow := range app.flows {
		if rabbitFlow, ok := flow.(*client.RabbitFlow); ok {
			hasRabbitFlow = true
			app.defaultRabbitFlow = rabbitFlow
			break
		}
	}
	if !hasRabbitFlow {
		app.createDefaultRabbitFlow()
	}

	app.changeCb.Subscribe(app.checkGeofences)
	app.deleteCb.Subscribe(app.updateGeofencesAfterDelete)

	// Load contacts from DNS service
	app.loadContactsFromDNS()
}

func (app *App) InitServices() {
	dnsServiceURL := viper.GetString("dns_service.url")
	app.dnsServiceProxy = dnsproxy.NewDnsServiceProxy(dnsServiceURL)

	// Initialize resend service
	app.resendService = resend.NewResendService(&resend.Config{
		DB:                app.DB,
		Logger:            app.logger.With("service", "resend"),
		SendToDestination: app.SendMsgToDestination,
		ItemsRepository:   app.items,
	})

	// Start the resend service
	if err := app.resendService.Start(); err != nil {
		app.logger.Error("Failed to start resend service", "error", err)
	} else {
		app.logger.Info("Resend service started successfully")
	}
}

func initFlowsSensorsAndConfig(app *App) {
	dbPath := viper.GetString("database.path")
	if dbPath == "" {
		app.logger.Error("database.path not set in config")
		app.loadFlowsFromConfig()
		return
	}

	db, dbExists, err := app.initializeDatabase(dbPath)
	if err != nil {
		app.logger.Error("failed to initialize database", "error", err)
		app.loadFlowsFromConfig()
		return
	}

	app.DB = db

	// Initialize database tables
	if err := app.createDatabaseTables(db); err != nil {
		app.logger.Error("failed to create database tables", "error", err)
		app.loadFlowsFromConfig()
		app.loadSensorsFromConfig()
		return
	}

	// Load sensors from database
	if err := app.loadSensorsFromDatabase(db); err != nil {
		app.logger.Error("failed to load sensors from database", "error", err)
		app.loadSensorsFromConfig()
	}

	// Load config from database
	app.loadConfigFromDatabase(db)

	// Load flows from database or config
	app.loadFlowsFromDatabaseOrConfig(db, dbExists)

	// Create tracking tables if they don't exist
	if err := app.createTrackingTables(db); err != nil {
		app.logger.Error("failed to create tracking tables", "error", err)
		// Continue without tracking functionality
	} else {
		// Initialize tracking service
		app.trackingService = tracking.NewTrackingService(db, app.logger)
		app.logger.Info("Tracking service initialized")

		// Start periodic cleanup of old tracking data
		go app.startTrackingCleanup()
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

	// Check if any GPS sensors were loaded from the database
	hasExistingGPSSensor := false
	for _, sensor := range app.sensors {
		if sensor.GetType() == "GPS" {
			hasExistingGPSSensor = true
			break
		}
	}

	// If no GPS sensors were loaded from the database, create the default one from config
	if !hasExistingGPSSensor {
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
				TCPProxyAddr: "", // Disable TCP Proxy
			}
			app.sensors = append(app.sensors, gpsdSensor)

			gpsdSensor.Initialize()
			go gpsdSensor.Start(app.sensorCallback)
		}
	}

	/* app.mesh = client.NewMeshHandler(&client.MeshHandlerConfig{
		MessageCb: app.ProcessEvent,
	})
	app.mesh.Start() */

	for _, flow := range app.flows {
		flow.Start()
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

func (app *App) createDefaultRabbitFlow() {
	destinations := make([]model.SendItemDest, 1)
	destinations[0] = model.SendItemDest{
		Addr: viper.GetString("default_dest_ip"),
		URN:  viper.GetInt("default_dest_urn"),
	}

	newFlow := client.NewRabbitFlow(&client.RabbitFlowConfig{
		MessageCb:    app.ProcessEvent,
		Addr:         fmt.Sprintf("amqp://rabbitmqserver:5672/%d", app.urn),
		Direction:    client.BOTH,
		RecvQueue:    "SituationalAwarenessReceiveQueue",
		SendExchange: "SendVmfCommand",
		Title:        "DataLink",
		Destinations: destinations,
		ClientInfo: &cotproto.ClientInfo{
			IpAddress: app.ipAddress,
			Urn:       app.urn,
		},
	})

	app.defaultRabbitFlow = newFlow
	app.flows = append([]client.CoTFlow{newFlow}, app.flows...)
}

func (app *App) forceLocationUpdate() {
	for _, sensor := range app.sensors {
		if sensor.GetType() == "GPS" {
			sensor.(*sensors.GpsdSensor).ForceUpdate()
		}
	}
}

func (app *App) startTrackingCleanup() {
	if app.trackingService == nil {
		return
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
	viper.SetDefault("me.zoom", 12)
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

	viper.SetDefault("dns_service.url", "http://dns.api")
	viper.BindEnv("dns_service.url", "DNS_SERVICE_URL")

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
