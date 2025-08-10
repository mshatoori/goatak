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
	"slices"
	"strconv"
	"strings"
	"sync"
	"sync/atomic"
	"syscall"
	"time"

	"github.com/kdudkov/goatak/internal/tracking"
	"github.com/kdudkov/goatak/internal/wshandler"
	_ "modernc.org/sqlite"

	"github.com/peterstace/simplefeatures/geom"

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

	// Initialize DNS service proxy
	dnsServiceURL := viper.GetString("dns_service.url")
	app.dnsServiceProxy = dnsproxy.NewDnsServiceProxy(dnsServiceURL)

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

func (app *App) loadContactsFromDNS() {
	if app.dnsServiceProxy == nil {
		app.logger.Warn("DNS service proxy not initialized, skipping contact loading")
		return
	}

	app.logger.Info("Loading contacts from DNS service")
	addresses, err := app.dnsServiceProxy.GetAddresses()
	if err != nil {
		app.logger.Error("Failed to get addresses from DNS service", "error", err)
		return
	}

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

		urnToIPs[urn] = append(urnToIPs[urn], ip)

		// Use UnitName if available, otherwise use URN as name
		if addr.UnitName != nil && *addr.UnitName != "" {
			urnToName[urn] = *addr.UnitName
		} else if _, exists := urnToName[urn]; !exists {
			urnToName[urn] = fmt.Sprintf("Node-%d", urn)
		}
	}

	// Create CONTACT items for each unique URN
	for urn, ips := range urnToIPs {
		// Concatenate all IPs with comma
		concatenatedIPs := strings.Join(ips, ",")
		callsign := urnToName[urn]

		// TODO: This should be temporary. Also the other fileds that are set here.
		uid := fmt.Sprintf("DNS-CONTACT-%d", urn)

		// Create CotEvent for this contact
		msg := cot.BasicMsg("a-f-X", uid, time.Hour*24) // CONTACT type with 24h stale time
		msg.CotEvent.Detail = &cotproto.Detail{
			Contact: &cotproto.Contact{
				Endpoint: "*:-1:stcp",
				Callsign: callsign,
				ClientInfo: &cotproto.ClientInfo{
					IpAddress: concatenatedIPs,
					Urn:       urn,
				},
			},
			Group: &cotproto.Group{
				Name: "contacts",
				Role: "",
			},
		}

		// Convert to CotMessage and then to Item
		cotMsg := cot.LocalCotMessage(msg)
		item := model.FromMsg(cotMsg)
		item.GetClass()
		if item != nil {
			app.items.Store(item)
			app.changeCb.AddMessage(item)
			app.logger.Info("Created contact from DNS", "urn", urn, "callsign", callsign, "ips", concatenatedIPs)
		}
	}

	app.logger.Info("Finished loading contacts from DNS service", "contacts_created", len(urnToIPs))
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

func (app *App) initializeDatabase(dbPath string) (*sql.DB, bool, error) {
	dbExists := false
	if _, err := os.Stat(dbPath); err == nil {
		dbExists = true
	}

	db, err := sql.Open("sqlite", dbPath)
	if err != nil {
		return nil, false, fmt.Errorf("failed to open database: %w", err)
	}

	return db, dbExists, nil
}

func (app *App) createDatabaseTables(db *sql.DB) error {
	// Create flows table
	createFlowsTableSQL := `CREATE TABLE IF NOT EXISTS flows (
		title TEXT,
		uid TEXT,
		addr TEXT NOT NULL,
		port INTEGER NOT NULL,
		type TEXT NOT NULL,
		direction INTEGER NOT NULL DEFAULT 3,
		sendExchange TEXT,
		recvQueue TEXT
	);`
	if _, err := db.Exec(createFlowsTableSQL); err != nil {
		return fmt.Errorf("failed to create flows table: %w", err)
	}

	// Add direction column to existing flows table if it doesn't exist
	if err := app.migrateFlowsTable(db); err != nil {
		return fmt.Errorf("failed to migrate flows table: %w", err)
	}

	// Create sensors table
	if err := app.createSensorsTable(db); err != nil {
		return fmt.Errorf("failed to create sensors table: %w", err)
	}

	// Create config table
	createConfigTableSQL := `CREATE TABLE IF NOT EXISTS config (
		key TEXT PRIMARY KEY,
		value TEXT
	);`
	if _, err := db.Exec(createConfigTableSQL); err != nil {
		return fmt.Errorf("failed to create config table: %w", err)
	}

	return nil
}

func (app *App) migrateFlowsTable(db *sql.DB) error {
	// Check if direction column exists
	rows, err := db.Query("PRAGMA table_info(flows)")
	if err != nil {
		return fmt.Errorf("failed to get table info: %w", err)
	}
	defer rows.Close()

	hasDirectionColumn := false
	for rows.Next() {
		var cid int
		var name, dataType string
		var notNull, pk int
		var defaultValue sql.NullString

		if err := rows.Scan(&cid, &name, &dataType, &notNull, &defaultValue, &pk); err != nil {
			continue
		}

		if name == "direction" {
			hasDirectionColumn = true
			break
		}
	}

	// Add direction column if it doesn't exist
	if !hasDirectionColumn {
		app.logger.Info("Adding direction column to flows table")
		if _, err := db.Exec("ALTER TABLE flows ADD COLUMN direction INTEGER NOT NULL DEFAULT 3"); err != nil {
			return fmt.Errorf("failed to add direction column: %w", err)
		}
	}

	return nil
}

func (app *App) loadConfigFromDatabase(db *sql.DB) {
	app.logger.Info("Loading config from database")
	rows, err := db.Query("SELECT key, value FROM config")
	if err != nil {
		app.logger.Error("failed to query config from database", "error", err)
		return
	}
	defer rows.Close()

	configMap := make(map[string]string)
	for rows.Next() {
		var key, value string
		if err := rows.Scan(&key, &value); err != nil {
			app.logger.Error("failed to scan config row", "error", err)
			continue
		}
		configMap[key] = value
	}

	if err := rows.Err(); err != nil {
		app.logger.Error("error during database rows iteration for config", "error", err)
		return
	}

	app.applyConfigFromDatabase(configMap)
}

func (app *App) applyConfigFromDatabase(configMap map[string]string) {
	if uid, ok := configMap["app.uid"]; ok {
		app.uid = uid
		app.logger.Info("Loaded app.uid from database", "value", app.uid)
	}
	if callsign, ok := configMap["app.callsign"]; ok {
		app.callsign = callsign
		app.logger.Info("Loaded app.callsign from database", "value", app.callsign)
	}
	if ipAddress, ok := configMap["app.ipAddress"]; ok {
		app.ipAddress = ipAddress
		app.logger.Info("Loaded app.ipAddress from database", "value", app.ipAddress)
	}
	if urnStr, ok := configMap["app.urn"]; ok {
		if urn, err := strconv.ParseInt(urnStr, 10, 32); err == nil {
			app.urn = int32(urn)
			app.logger.Info("Loaded app.urn from database", "value", app.urn)
		} else {
			app.logger.Error("failed to parse app.urn from database", "error", err, "value", urnStr)
		}
	}
}

func (app *App) loadFlowsFromDatabaseOrConfig(db *sql.DB, dbExists bool) {
	if dbExists {
		app.loadFlowsFromDatabase(db)
	} else {
		app.logger.Info("Database not found, loading flows from config and saving to database")
		app.loadFlowsFromConfig()
		app.saveFlowsToDatabase(db)
	}
}

func (app *App) loadFlowsFromDatabase(db *sql.DB) {
	app.logger.Info("Loading flows from database")
	rows, err := db.Query("SELECT uid, title, addr, port, type, direction, sendExchange, recvQueue FROM flows")
	if err != nil {
		app.logger.Error("failed to query flows from database", "error", err)
		app.loadFlowsFromConfig()
		return
	}
	defer rows.Close()

	for rows.Next() {
		var flowConfig FlowConfig
		if err := rows.Scan(&flowConfig.UID, &flowConfig.Title, &flowConfig.Addr, &flowConfig.Port, &flowConfig.Type, &flowConfig.Direction, &flowConfig.SendExchange, &flowConfig.RecvQueue); err != nil {
			app.logger.Error("failed to scan flow row", "error", err)
			continue
		}
		app.addFlow(flowConfig)
	}

	if err := rows.Err(); err != nil {
		app.logger.Error("error during database rows iteration", "error", err)
	}
}

func (app *App) loadFlowsFromConfig() {
	var outgoingFlowConfigs []FlowConfig
	var incomingFlowConfigs []FlowConfig

	if err := viper.UnmarshalKey("flows.outgoing", &outgoingFlowConfigs); err != nil {
		app.logger.Error("failed to unmarshal outgoing flows from config", "error", err)
	} else {
		for _, flowConfig := range outgoingFlowConfigs {
			// Default to "udp" if type is not specified for backward compatibility
			if flowConfig.Type == "" {
				flowConfig.Type = "udp"
			}
			// Set direction to OUTGOING if not specified
			if flowConfig.Direction == 0 {
				flowConfig.Direction = int(client.OUTGOING)
			}
			app.addFlow(flowConfig)
			app.logger.Info("Outgoing flow added from config", "addr", fmt.Sprintf("%s:%d", flowConfig.Addr, flowConfig.Port), "type", flowConfig.Type, "direction", flowConfig.Direction)
		}
	}

	if err := viper.UnmarshalKey("flows.incoming", &incomingFlowConfigs); err != nil {
		app.logger.Error("failed to unmarshal incoming flows from config", "error", err)
	} else {
		for _, flowConfig := range incomingFlowConfigs {
			// Default to "udp" if type is not specified for backward compatibility
			if flowConfig.Type == "" {
				flowConfig.Type = "udp"
			}
			// Set direction to INCOMING if not specified
			if flowConfig.Direction == 0 {
				flowConfig.Direction = int(client.INCOMING)
			}
			app.addFlow(flowConfig)
			app.logger.Info("Incoming flow added from config", "addr", fmt.Sprintf("%s:%d", flowConfig.Addr, flowConfig.Port), "type", flowConfig.Type, "direction", flowConfig.Direction)
		}
	}
}

func (app *App) saveFlowsToDatabase(db *sql.DB) {
	app.logger.Info("Saving flows to database")
	tx, err := db.Begin()
	if err != nil {
		app.logger.Error("failed to begin transaction for saving flows", "error", err)
		return
	}
	defer tx.Rollback() // Rollback if not committed

	stmt, err := tx.Prepare("INSERT INTO flows(title, uid, addr, port, type, direction, sendExchange, recvQueue) VALUES(?, ?, ?, ?, ?, ?, ?, ?)")
	if err != nil {
		app.logger.Error("failed to prepare insert statement for flows", "error", err)
		return
	}
	defer stmt.Close()

	for _, flow := range app.flows {
		var flowConfig FlowConfig
		switch f := flow.(type) {
		case *client.UDPFlow:
			flowConfig = FlowConfig{
				Title:     f.Title, // Use the Title field from UDPFlow
				Addr:      f.Addr.IP.String(),
				Port:      f.Addr.Port,
				Type:      "udp",
				Direction: int(f.Direction),
			}
		case *client.RabbitFlow:
			rabbitModel := f.ToCoTFlowModel()
			flowConfig = FlowConfig{
				Title:        rabbitModel.Title,
				Addr:         rabbitModel.Addr,
				Port:         0, // RabbitMQ uses Addr as connection string, Port is not a separate field
				Type:         "rabbit",
				Direction:    rabbitModel.Direction,
				SendExchange: rabbitModel.SendExchange,
				RecvQueue:    rabbitModel.RecvQueue,
			}
		default:
			app.logger.Warn("unknown flow type, skipping save to database")
			continue
		}

		_, err := stmt.Exec(flowConfig.Title, flow.ToCoTFlowModel().UID, flowConfig.Addr, flowConfig.Port, flowConfig.Type, flowConfig.Direction, flowConfig.SendExchange, flowConfig.RecvQueue)
		if err != nil {
			app.logger.Error("failed to insert flow into database", "error", err, "flow", flowConfig)
			return // Stop saving on first error
		}
	}

	err = tx.Commit()
	if err != nil {
		app.logger.Error("failed to commit transaction for saving flows", "error", err)
	}
}

func (app *App) createSensorsTable(db *sql.DB) error {
	createTableSQL := `CREATE TABLE IF NOT EXISTS sensors (
		title TEXT,
		uid TEXT PRIMARY KEY,
		addr TEXT NOT NULL,
		port INTEGER NOT NULL,
		type TEXT NOT NULL,
		interval INTEGER
	);`
	_, err := db.Exec(createTableSQL)
	return err
}

func (app *App) createTrackingTables(db *sql.DB) error {
	// Create tracking_positions table
	createPositionsTableSQL := `CREATE TABLE IF NOT EXISTS tracking_positions (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		unit_uid TEXT NOT NULL,
		latitude REAL NOT NULL,
		longitude REAL NOT NULL,
		altitude REAL,
		speed REAL,
		course REAL,
		timestamp DATETIME NOT NULL,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);`

	if _, err := db.Exec(createPositionsTableSQL); err != nil {
		return fmt.Errorf("failed to create tracking_positions table: %w", err)
	}

	// Create indexes for tracking_positions
	createIndexSQL := `CREATE INDEX IF NOT EXISTS idx_tracking_unit_timestamp ON tracking_positions(unit_uid, timestamp);`
	if _, err := db.Exec(createIndexSQL); err != nil {
		return fmt.Errorf("failed to create tracking_positions index: %w", err)
	}

	createTimestampIndexSQL := `CREATE INDEX IF NOT EXISTS idx_tracking_timestamp ON tracking_positions(timestamp);`
	if _, err := db.Exec(createTimestampIndexSQL); err != nil {
		return fmt.Errorf("failed to create tracking_positions timestamp index: %w", err)
	}

	// Create tracking_config table
	createConfigTableSQL := `CREATE TABLE IF NOT EXISTS tracking_config (
		unit_uid TEXT PRIMARY KEY,
		enabled BOOLEAN DEFAULT TRUE,
		trail_length INTEGER DEFAULT 50,
		update_interval INTEGER DEFAULT 30,
		trail_color TEXT DEFAULT '#FF0000',
		trail_width INTEGER DEFAULT 2,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);`

	if _, err := db.Exec(createConfigTableSQL); err != nil {
		return fmt.Errorf("failed to create tracking_config table: %w", err)
	}

	// Create tracking_settings table
	createSettingsTableSQL := `CREATE TABLE IF NOT EXISTS tracking_settings (
		key TEXT PRIMARY KEY,
		value TEXT NOT NULL,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);`

	if _, err := db.Exec(createSettingsTableSQL); err != nil {
		return fmt.Errorf("failed to create tracking_settings table: %w", err)
	}

	// Insert default settings if they don't exist
	defaultSettings := []struct {
		key   string
		value string
	}{
		{"global_enabled", "true"},
		{"default_trail_length", "50"},
		{"default_update_interval", "30"},
		{"cleanup_interval_hours", "24"},
	}

	for _, setting := range defaultSettings {
		insertSettingSQL := `INSERT OR IGNORE INTO tracking_settings (key, value) VALUES (?, ?)`
		if _, err := db.Exec(insertSettingSQL, setting.key, setting.value); err != nil {
			return fmt.Errorf("failed to insert default setting %s: %w", setting.key, err)
		}
	}

	return nil
}

func (app *App) loadSensorsFromDatabase(db *sql.DB) error {
	app.logger.Info("Loading sensors from database")
	rows, err := db.Query("SELECT title, uid, addr, port, type, interval FROM sensors")
	if err != nil {
		return fmt.Errorf("failed to query sensors from database: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var sensorConfig model.SensorModel
		if err := rows.Scan(&sensorConfig.Title, &sensorConfig.UID, &sensorConfig.Addr, &sensorConfig.Port, &sensorConfig.Type, &sensorConfig.Interval); err != nil {
			app.logger.Error("failed to scan sensor row", "error", err)
			continue
		}

		sensorInstance, err := app.createSensorInstance(&sensorConfig)
		if err != nil {
			app.logger.Error("failed to create sensor instance from database config", "error", err, "sensor", sensorConfig)
			continue
		}

		sensorInstance.Initialize()
		app.sensors = append(app.sensors, sensorInstance)
		go sensorInstance.Start(app.sensorCallback)
	}

	if err := rows.Err(); err != nil {
		return fmt.Errorf("error during database rows iteration for sensors: %w", err)
	}

	return nil
}

func (app *App) loadSensorsFromConfig() {
	// TODO: Implement loading sensors from config
	app.logger.Info("Loading sensors from config (not implemented yet)")
}

func (app *App) saveSensorToDatabase(sensorConfig *model.SensorModel) error {
	app.logger.Info("Saving sensor to database", "uid", sensorConfig.UID)
	_, err := app.DB.Exec("INSERT OR REPLACE INTO sensors(title, uid, addr, port, type, interval) VALUES(?, ?, ?, ?, ?, ?)",
		sensorConfig.Title, sensorConfig.UID, sensorConfig.Addr, sensorConfig.Port, sensorConfig.Type, sensorConfig.Interval)
	if err != nil {
		return fmt.Errorf("failed to insert or replace sensor in database: %w", err)
	}
	return nil
}

func (app *App) deleteSensorFromDatabase(uid string) error {
	app.logger.Info("Deleting sensor from database", "uid", uid)
	_, err := app.DB.Exec("DELETE FROM sensors WHERE uid = ?", uid)
	if err != nil {
		return fmt.Errorf("failed to delete sensor from database: %w", err)
	}
	return nil
}

func (app *App) createSensorInstance(sensorConfig *model.SensorModel) (sensors.BaseSensor, error) {
	switch strings.ToLower(sensorConfig.Type) {
	case "gps", "ais":
		return &sensors.GpsdSensor{
			Addr:     fmt.Sprintf("%s:%d", sensorConfig.Addr, sensorConfig.Port),
			Conn:     nil,
			Logger:   app.logger.With("logger", "gpsd"), // TODO: Make logger name dynamic
			Reader:   nil,
			Type:     sensorConfig.Type,
			UID:      sensorConfig.UID,
			Interval: time.Second * time.Duration(sensorConfig.Interval),
			Ctx:      context.Background(), // TODO: Use app context
			Title:    sensorConfig.Title,
			// SerialPort and TCPProxyAddr are not in SensorModel yet, need to consider how to handle sensor-specific configs
		}, nil
	case "radar":
		// Assuming NewRadarSensor can take SensorModel and logger
		return sensors.NewRadarSensor(sensorConfig, app.logger.With("logger", "radar")), nil // TODO: Make logger name dynamic
	default:
		return nil, fmt.Errorf("unsupported sensor type: %s", sensorConfig.Type)
	}
}

func (app *App) addFlow(flowConfig FlowConfig) {
	switch strings.ToLower(flowConfig.Type) {
	case "udp":
		udpConfig := &client.UDPFlowConfig{
			UID:   flowConfig.UID,
			Title: flowConfig.Title,
			Addr:  flowConfig.Addr,
			Port:  flowConfig.Port,
		}

		// Use direction from config if specified, otherwise fall back to legacy logic
		if flowConfig.Direction != 0 {
			udpConfig.Direction = client.FlowDirection(flowConfig.Direction)
		} else if flowConfig.RecvQueue != "" { // Legacy: RecvQueue indicates incoming for UDP
			udpConfig.Direction = client.INCOMING
		} else {
			udpConfig.Direction = client.OUTGOING
		}

		// Set message callback for incoming flows
		if udpConfig.Direction&client.INCOMING != 0 {
			udpConfig.MessageCb = app.ProcessEvent
		}

		app.flows = append(app.flows, client.NewUDPFlow(udpConfig))
	case "rabbit":
		rabbitConfig := &client.RabbitFlowConfig{
			UID:          flowConfig.UID,
			Title:        flowConfig.Title,
			Addr:         flowConfig.Addr,
			SendExchange: flowConfig.SendExchange,
			RecvQueue:    flowConfig.RecvQueue,
		}

		// Use direction from config if specified, otherwise default to BOTH
		if flowConfig.Direction != 0 {
			rabbitConfig.Direction = client.FlowDirection(flowConfig.Direction)
		} else {
			rabbitConfig.Direction = client.BOTH
		}

		// Set message callback for incoming flows
		if rabbitConfig.Direction&client.INCOMING != 0 {
			rabbitConfig.MessageCb = app.ProcessEvent
		}

		app.flows = append(app.flows, client.NewRabbitFlow(rabbitConfig))
	default:
		app.logger.Warn("unknown flow type in config or database", "type", flowConfig.Type)
	}
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

func (app *App) myPosSender(ctx context.Context) {
	app.SendMsg(app.MakeMe())

	ticker := time.NewTicker(time.Second * 10)
	defer ticker.Stop()

	my_ticker := time.NewTicker(time.Second * time.Duration(viper.GetInt("me.interval")))
	defer my_ticker.Stop()

	for ctx.Err() == nil {
		select {
		case <-ctx.Done():
			return
		case <-my_ticker.C:
			app.logger.Debug("Sending my pos")
			app.SendMsg(app.MakeMe())
		case <-ticker.C:
			app.logger.Debug("Sending other objects")
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

	for _, flow := range app.flows {
		if err := flow.SendCot(msg); err != nil {
			app.logger.Error("flow send error", "error", err, "flow", flow)
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
		// Takv: &cotproto.Takv{
		// 	Device:   app.device,
		// 	Platform: app.platform,
		// 	Os:       app.os,
		// 	Version:  app.version,
		// },
		// Track: &cotproto.Track{
		// 	Speed:  pos.GetSpeed(),
		// 	Course: pos.GetTrack(),
		// },
		// PrecisionLocation: &cotproto.PrecisionLocation{
		// 	Geopointsrc: "GPS",
		// 	Altsrc:      "GPS",
		// },
		// Status: &cotproto.Status{Battery: 39},
	}
	// ev.CotEvent.Detail.XmlDetail = fmt.Sprintf("<uid Droid=\"%s\"></uid>", app.callsign)

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
		if item.ShouldSend() {
			app.SendMsg(item.GetMsg().GetTakMessage())
			item.SetLastSent()
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
						alarmMsg.CotEvent.Lat = lat
						alarmMsg.CotEvent.Lon = lng
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

// broadcastTrackingUpdate sends tracking updates to all connected WebSocket clients
func (app *App) broadcastTrackingUpdate(unitUID, callsign string, lat, lon, alt, speed, course float64) {
	// Create tracking update data
	update := &wshandler.TrackingUpdateData{
		UnitUID:   unitUID,
		Callsign:  callsign,
		Latitude:  lat,
		Longitude: lon,
		Timestamp: time.Now().Format(time.RFC3339),
	}

	// Add optional fields if they have valid values
	if alt != 0 {
		update.Altitude = &alt
	}
	if speed != 0 {
		update.Speed = &speed
	}
	if course != 0 {
		update.Course = &course
	}

	// Broadcast to all WebSocket clients via the callback system
	app.trackingUpdateCb.AddMessage(update)
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
