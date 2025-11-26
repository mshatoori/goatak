package main

import (
	"database/sql"
	"fmt"
	"os"
	"strings"
	"time"

	"context"

	"github.com/kdudkov/goatak/internal/client"
	"github.com/kdudkov/goatak/pkg/model"
	"github.com/kdudkov/goatak/pkg/sensors"
)

// initializeDatabase opens and initializes the database connection
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

// createDatabaseTables creates all necessary database tables
func (app *App) createDatabaseTables(db *sql.DB) error {
	// Create resend tables
	if err := createResendTables(db); err != nil {
		return fmt.Errorf("failed to create resend tables: %w", err)
	}

	return nil
}

// loadFlowsFromConfig loads flows from configuration
func (app *App) loadFlowsFromConfig() {
	if app.config == nil {
		app.logger.Error("config not initialized")
		return
	}

	for _, flowConfig := range app.config.Flows {
		// Default to "udp" if type is not specified for backward compatibility
		if flowConfig.Type == "" {
			flowConfig.Type = "udp"
		}
		// Set default direction if not specified
		if flowConfig.Direction == 0 {
			flowConfig.Direction = int(client.BOTH)
		}
		app.addFlow(flowConfig)
		app.logger.Info("Flow added from config", "title", flowConfig.Title, "addr", fmt.Sprintf("%s:%d", flowConfig.Addr, flowConfig.Port), "type", flowConfig.Type, "direction", flowConfig.Direction)
	}
}

// createTrackingTables creates tracking-related tables
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

// loadSensorsFromConfig loads sensors from configuration
func (app *App) loadSensorsFromConfig() {
	if app.config == nil {
		app.logger.Error("config not initialized")
		return
	}

	for _, sensorConfig := range app.config.Sensors {
		sensorInstance, err := app.createSensorInstance(&model.SensorModel{
			Title:    sensorConfig.Title,
			UID:      sensorConfig.UID,
			Addr:     sensorConfig.Addr,
			Port:     sensorConfig.Port,
			Type:     sensorConfig.Type,
			Interval: sensorConfig.Interval,
		})
		if err != nil {
			app.logger.Error("failed to create sensor instance from config", "error", err, "sensor", sensorConfig)
			continue
		}

		sensorInstance.Initialize()
		app.sensors = append(app.sensors, sensorInstance)
		go sensorInstance.Start(app.sensorCallback)
		app.logger.Info("Sensor added from config", "title", sensorConfig.Title, "type", sensorConfig.Type)
	}
}

// createSensorInstance creates a sensor instance from configuration
func (app *App) createSensorInstance(sensorConfig *model.SensorModel) (sensors.BaseSensor, error) {
	switch strings.ToLower(sensorConfig.Type) {
	case "gps":
		return &sensors.GpsdSensor{
			Addr:     fmt.Sprintf("%s:%d", sensorConfig.Addr, sensorConfig.Port),
			Conn:     nil,
			Logger:   app.logger.With("logger", "gpsd"),
			Reader:   nil,
			Type:     sensorConfig.Type,
			UID:      sensorConfig.UID,
			Interval: time.Second * time.Duration(sensorConfig.Interval),
			Ctx:      context.Background(), // TODO: Use app context
			Title:    sensorConfig.Title,
			// SerialPort and TCPProxyAddr are not in SensorModel yet, need to consider how to handle sensor-specific configs
		}, nil
	case "radar":
		return sensors.NewRadarSensor(sensorConfig, app.logger.With("logger", "radar")), nil
	case "ais":
		return sensors.NewAISSensor(sensorConfig, app.logger.With("logger", "ais")), nil
	default:
		return nil, fmt.Errorf("unsupported sensor type: %s", sensorConfig.Type)
	}
}

// addFlow adds a flow configuration to the application
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
