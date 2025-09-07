package main

import (
	"database/sql"
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"

	"context"

	"github.com/kdudkov/goatak/internal/client"
	"github.com/kdudkov/goatak/pkg/model"
	"github.com/kdudkov/goatak/pkg/sensors"
	"github.com/spf13/viper"
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

	// Create resend tables
	if err := createResendTables(db); err != nil {
		return fmt.Errorf("failed to create resend tables: %w", err)
	}

	return nil
}

// migrateFlowsTable adds missing columns to flows table
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

// loadConfigFromDatabase loads configuration from database
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

// applyConfigFromDatabase applies loaded configuration to the app
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

// loadFlowsFromDatabaseOrConfig loads flows from database if it exists, otherwise from config
func (app *App) loadFlowsFromDatabaseOrConfig(db *sql.DB, dbExists bool) {
	if dbExists {
		app.loadFlowsFromDatabase(db)
	} else {
		app.logger.Info("Database not found, loading flows from config and saving to database")
		app.loadFlowsFromConfig()
		app.saveFlowsToDatabase(db)
	}
}

// loadFlowsFromDatabase loads flows from database
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

// loadFlowsFromConfig loads flows from configuration files
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

// saveFlowsToDatabase saves current flows to database
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

// createSensorsTable creates the sensors table
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

// loadSensorsFromDatabase loads sensors from database
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

// loadSensorsFromConfig loads sensors from configuration files
func (app *App) loadSensorsFromConfig() {
	// TODO: Implement loading sensors from config
	app.logger.Info("Loading sensors from config (not implemented yet)")
}

// saveSensorToDatabase saves a sensor configuration to database
func (app *App) saveSensorToDatabase(sensorConfig *model.SensorModel) error {
	app.logger.Info("Saving sensor to database", "uid", sensorConfig.UID)
	_, err := app.DB.Exec("INSERT OR REPLACE INTO sensors(title, uid, addr, port, type, interval) VALUES(?, ?, ?, ?, ?, ?)",
		sensorConfig.Title, sensorConfig.UID, sensorConfig.Addr, sensorConfig.Port, sensorConfig.Type, sensorConfig.Interval)
	if err != nil {
		return fmt.Errorf("failed to insert or replace sensor in database: %w", err)
	}
	return nil
}

// deleteSensorFromDatabase removes a sensor from database
func (app *App) deleteSensorFromDatabase(uid string) error {
	app.logger.Info("Deleting sensor from database", "uid", uid)
	_, err := app.DB.Exec("DELETE FROM sensors WHERE uid = ?", uid)
	if err != nil {
		return fmt.Errorf("failed to delete sensor from database: %w", err)
	}
	return nil
}

// createSensorInstance creates a sensor instance from configuration
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
