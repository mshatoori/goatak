package main

import (
	"database/sql"
	"fmt"
	"log/slog"
	"strconv"
	"sync"
	"time"

	"github.com/spf13/viper"
)

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

type SensorConfig struct {
	Title string `mapstructure:"uid"`
	// TODO: Change Addr & Port with a general config map
	Addr string `mapstructure:"addr"`

	Port int    `mapstructure:"port"`
	UID  string `mapstructure:"uid"`
	Type string `mapstructure:"type"`

	Interval int `mapstructure:"interval"`
}

type UnitConfig struct {
	Callsign string  `mapstructure:"callsign"`
	Lat      float64 `mapstructure:"lat"`
	Lon      float64 `mapstructure:"lon"`
	Zoom     int     `mapstructure:"zoom"`
	Type     string  `mapstructure:"type"`
	Team     string  `mapstructure:"team"`
	Role     string  `mapstructure:"role"`
	Platform string  `mapstructure:"platform"`
	Version  string  `mapstructure:"version"`
	Urn      int     `mapstructure:"urn"`
	Ip       string  `mapstructure:"ip"`
	Uid      string  `mapstructure:"uid"`
	OS       string  `mapstructure:"os"`
	Interval int     `mapstructure:"interval"`
	Device   string  `mapstructure:"device"`
}

type TrackingConfig struct {
	Enabled               bool   `mapstructure:"enabled"`
	DefaultTrailLength    int    `mapstructure:"default_trail_length"`
	DefaultUpdateInterval int    `mapstructure:"default_update_interval"`
	DefaultTrailColor     string `mapstructure:"default_trail_color"`
	DefaultTrailWidth     int    `mapstructure:"default_trail_width"`
}

type ResendConfig struct {
	Enabled             bool `mapstructure:"enabled"`
	MaxFiltersPerConfig int  `mapstructure:"max_filters_per_config"`
}

type ApplicationConfig struct {
	flows   []FlowConfig   `mapstructure:"flows"`
	sensors []SensorConfig `mapstructure:"sensors"`

	me UnitConfig `mapstructure:"me"`

	webPort        int    `mapstructure:"web_port"`
	debug          bool   `mapstructure:"debug"`
	noWeb          bool   `mapstructure:"no_web"`
	file           string `mapstructure:"file"`
	serverAddress  string `mapstructure:"server_address"`
	gpsd           string `mapstructure:"gpsd"`
	dnsServiceURL  string `mapstructure:"dns_service.url"`
	gpsPort        string `mapstructure:"gps_port"`
	mapServer      string `mapstructure:"map_server"`
	sslPassword    string `mapstructure:"ssl.password"`
	sslSaveCert    bool   `mapstructure:"ssl.save_cert"`
	sslStrict      bool   `mapstructure:"ssl.strict"`
	defaultDestIP  string `mapstructure:"default_dest_ip"`
	defaultDestURN int    `mapstructure:"default_dest_urn"`

	tracking TrackingConfig `mapstructure:"tracking"`
	resend   ResendConfig   `mapstructure:"resend"`
}

// ConfigManager handles centralized configuration management with database persistence
type ConfigManager struct {
	db     *sql.DB
	logger *slog.Logger
	mutex  sync.RWMutex
}

// NewConfigManager creates a new configuration manager instance
func NewConfigManager(db *sql.DB, logger *slog.Logger) *ConfigManager {
	return &ConfigManager{
		db:     db,
		logger: logger.With("component", "config_manager"),
	}
}

// InitDatabaseTables creates the config table if it doesn't exist
func (cm *ConfigManager) InitDatabaseTables() error {
	createTableSQL := `CREATE TABLE IF NOT EXISTS config (
		key TEXT PRIMARY KEY,
		value TEXT NOT NULL,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
	)`

	_, err := cm.db.Exec(createTableSQL)
	if err != nil {
		return fmt.Errorf("failed to create config table: %w", err)
	}

	cm.logger.Info("Config table initialized")
	return nil
}

// GetString retrieves a string configuration value
func (cm *ConfigManager) GetString(key string) (string, error) {
	cm.mutex.RLock()
	defer cm.mutex.RUnlock()

	var value string
	err := cm.db.QueryRow("SELECT value FROM config WHERE key = ?", key).Scan(&value)
	if err == sql.ErrNoRows {
		return "", fmt.Errorf("config key not found: %s", key)
	}
	if err != nil {
		return "", fmt.Errorf("failed to get config %s: %w", key, err)
	}

	return value, nil
}

// GetStringWithDefault retrieves a string configuration value with a default
func (cm *ConfigManager) GetStringWithDefault(key, defaultValue string) string {
	value, err := cm.GetString(key)
	if err != nil {
		return defaultValue
	}
	return value
}

// SetString sets a string configuration value
func (cm *ConfigManager) SetString(key, value string) error {
	cm.mutex.Lock()
	defer cm.mutex.Unlock()

	_, err := cm.db.Exec("INSERT OR REPLACE INTO config (key, value, updated_at) VALUES (?, ?, ?)",
		key, value, time.Now().Format("2006-01-02 15:04:05"))
	if err != nil {
		return fmt.Errorf("failed to set config %s: %w", key, err)
	}

	cm.logger.Debug("Set config", "key", key, "value", value)
	return nil
}

// GetInt retrieves an integer configuration value
func (cm *ConfigManager) GetInt(key string) (int, error) {
	strValue, err := cm.GetString(key)
	if err != nil {
		return 0, err
	}

	value, err := strconv.Atoi(strValue)
	if err != nil {
		return 0, fmt.Errorf("failed to parse int config %s: %w", key, err)
	}

	return value, nil
}

// GetIntWithDefault retrieves an integer configuration value with a default
func (cm *ConfigManager) GetIntWithDefault(key string, defaultValue int) int {
	value, err := cm.GetInt(key)
	if err != nil {
		return defaultValue
	}
	return value
}

// SetInt sets an integer configuration value
func (cm *ConfigManager) SetInt(key string, value int) error {
	return cm.SetString(key, strconv.Itoa(value))
}

// GetBool retrieves a boolean configuration value
func (cm *ConfigManager) GetBool(key string) (bool, error) {
	strValue, err := cm.GetString(key)
	if err != nil {
		return false, err
	}

	value, err := strconv.ParseBool(strValue)
	if err != nil {
		return false, fmt.Errorf("failed to parse bool config %s: %w", key, err)
	}

	return value, nil
}

// GetBoolWithDefault retrieves a boolean configuration value with a default
func (cm *ConfigManager) GetBoolWithDefault(key string, defaultValue bool) bool {
	value, err := cm.GetBool(key)
	if err != nil {
		return defaultValue
	}
	return value
}

// SetBool sets a boolean configuration value
func (cm *ConfigManager) SetBool(key string, value bool) error {
	return cm.SetString(key, strconv.FormatBool(value))
}

// GetFloat64 retrieves a float64 configuration value
func (cm *ConfigManager) GetFloat64(key string) (float64, error) {
	strValue, err := cm.GetString(key)
	if err != nil {
		return 0, err
	}

	value, err := strconv.ParseFloat(strValue, 64)
	if err != nil {
		return 0, fmt.Errorf("failed to parse float64 config %s: %w", key, err)
	}

	return value, nil
}

// GetFloat64WithDefault retrieves a float64 configuration value with a default
func (cm *ConfigManager) GetFloat64WithDefault(key string, defaultValue float64) float64 {
	value, err := cm.GetFloat64(key)
	if err != nil {
		return defaultValue
	}
	return value
}

// SetFloat64 sets a float64 configuration value
func (cm *ConfigManager) SetFloat64(key string, value float64) error {
	return cm.SetString(key, strconv.FormatFloat(value, 'f', -1, 64))
}

// LoadBasicSettings loads basic application settings
func (cm *ConfigManager) LoadBasicSettings() error {
	// Load from viper first, then override with database values if they exist
	viper.SetDefault("web_port", 8080)
	viper.SetDefault("debug", false)
	viper.SetDefault("no_web", false)
	viper.SetDefault("file", "")

	// Try to load from database and set in viper
	if webPort, err := cm.GetInt("web_port"); err == nil {
		viper.Set("web_port", webPort)
	}
	if debug, err := cm.GetBool("debug"); err == nil {
		viper.Set("debug", debug)
	}
	if noWeb, err := cm.GetBool("no_web"); err == nil {
		viper.Set("no_web", noWeb)
	}
	if file, err := cm.GetString("file"); err == nil {
		viper.Set("file", file)
	}

	cm.logger.Info("Basic settings loaded")
	return nil
}

// SaveBasicSettings saves basic application settings
func (cm *ConfigManager) SaveBasicSettings() error {
	if err := cm.SetInt("web_port", viper.GetInt("web_port")); err != nil {
		return err
	}
	if err := cm.SetBool("debug", viper.GetBool("debug")); err != nil {
		return err
	}
	if err := cm.SetBool("no_web", viper.GetBool("no_web")); err != nil {
		return err
	}
	if err := cm.SetString("file", viper.GetString("file")); err != nil {
		return err
	}

	cm.logger.Info("Basic settings saved")
	return nil
}

// LoadDependencySettings loads dependency-related settings
func (cm *ConfigManager) LoadDependencySettings() error {
	viper.SetDefault("server_address", "127.0.0.1:8087:tcp")
	viper.SetDefault("gpsd", "gpsd:2947")
	viper.SetDefault("dns_service.url", "http://dns.api")

	if serverAddr, err := cm.GetString("server_address"); err == nil {
		viper.Set("server_address", serverAddr)
	}
	if gpsd, err := cm.GetString("gpsd"); err == nil {
		viper.Set("gpsd", gpsd)
	}
	if dnsURL, err := cm.GetString("dns_service.url"); err == nil {
		viper.Set("dns_service.url", dnsURL)
	}

	cm.logger.Info("Dependency settings loaded")
	return nil
}

// SaveDependencySettings saves dependency-related settings
func (cm *ConfigManager) SaveDependencySettings() error {
	if err := cm.SetString("server_address", viper.GetString("server_address")); err != nil {
		return err
	}
	if err := cm.SetString("gpsd", viper.GetString("gpsd")); err != nil {
		return err
	}
	if err := cm.SetString("dns_service.url", viper.GetString("dns_service.url")); err != nil {
		return err
	}

	cm.logger.Info("Dependency settings saved")
	return nil
}

// LoadUserSettings loads user default settings (me.* namespace)
func (cm *ConfigManager) LoadUserSettings() error {
	// Set defaults
	viper.SetDefault("me.callsign", "GoATAK")
	viper.SetDefault("me.lat", 0.0)
	viper.SetDefault("me.lon", 0.0)
	viper.SetDefault("me.zoom", 12)
	viper.SetDefault("me.type", "a-f-G-U-C")
	viper.SetDefault("me.team", "Blue")
	viper.SetDefault("me.role", "HQ")
	viper.SetDefault("me.platform", "GoATAK_client")
	viper.SetDefault("me.version", "1.0.0")
	viper.SetDefault("me.urn", 0)
	viper.SetDefault("me.ip", "")

	// Load from database
	if callsign, err := cm.GetString("me.callsign"); err == nil {
		viper.Set("me.callsign", callsign)
	}
	if lat, err := cm.GetFloat64("me.lat"); err == nil {
		viper.Set("me.lat", lat)
	}
	if lon, err := cm.GetFloat64("me.lon"); err == nil {
		viper.Set("me.lon", lon)
	}
	if zoom, err := cm.GetInt("me.zoom"); err == nil {
		viper.Set("me.zoom", zoom)
	}
	if typ, err := cm.GetString("me.type"); err == nil {
		viper.Set("me.type", typ)
	}
	if team, err := cm.GetString("me.team"); err == nil {
		viper.Set("me.team", team)
	}
	if role, err := cm.GetString("me.role"); err == nil {
		viper.Set("me.role", role)
	}
	if platform, err := cm.GetString("me.platform"); err == nil {
		viper.Set("me.platform", platform)
	}
	if version, err := cm.GetString("me.version"); err == nil {
		viper.Set("me.version", version)
	}
	if urn, err := cm.GetInt("me.urn"); err == nil {
		viper.Set("me.urn", urn)
	}
	if ip, err := cm.GetString("me.ip"); err == nil {
		viper.Set("me.ip", ip)
	}

	cm.logger.Info("User settings loaded")
	return nil
}

// SaveUserSettings saves user default settings
func (cm *ConfigManager) SaveUserSettings() error {
	if err := cm.SetString("me.callsign", viper.GetString("me.callsign")); err != nil {
		return err
	}
	if err := cm.SetFloat64("me.lat", viper.GetFloat64("me.lat")); err != nil {
		return err
	}
	if err := cm.SetFloat64("me.lon", viper.GetFloat64("me.lon")); err != nil {
		return err
	}
	if err := cm.SetInt("me.zoom", viper.GetInt("me.zoom")); err != nil {
		return err
	}
	if err := cm.SetString("me.type", viper.GetString("me.type")); err != nil {
		return err
	}
	if err := cm.SetString("me.team", viper.GetString("me.team")); err != nil {
		return err
	}
	if err := cm.SetString("me.role", viper.GetString("me.role")); err != nil {
		return err
	}
	if err := cm.SetString("me.platform", viper.GetString("me.platform")); err != nil {
		return err
	}
	if err := cm.SetString("me.version", viper.GetString("me.version")); err != nil {
		return err
	}
	if err := cm.SetInt("me.urn", viper.GetInt("me.urn")); err != nil {
		return err
	}
	if err := cm.SetString("me.ip", viper.GetString("me.ip")); err != nil {
		return err
	}

	cm.logger.Info("User settings saved")
	return nil
}

// GetAllConfigs returns all configuration key-value pairs
func (cm *ConfigManager) GetAllConfigs() (map[string]string, error) {
	cm.mutex.RLock()
	defer cm.mutex.RUnlock()

	rows, err := cm.db.Query("SELECT key, value FROM config ORDER BY key")
	if err != nil {
		return nil, fmt.Errorf("failed to query configs: %w", err)
	}
	defer rows.Close()

	configs := make(map[string]string)
	for rows.Next() {
		var key, value string
		if err := rows.Scan(&key, &value); err != nil {
			return nil, fmt.Errorf("failed to scan config row: %w", err)
		}
		configs[key] = value
	}

	return configs, nil
}

// DeleteConfig removes a configuration key
func (cm *ConfigManager) DeleteConfig(key string) error {
	cm.mutex.Lock()
	defer cm.mutex.Unlock()

	result, err := cm.db.Exec("DELETE FROM config WHERE key = ?", key)
	if err != nil {
		return fmt.Errorf("failed to delete config %s: %w", key, err)
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		return fmt.Errorf("config key not found: %s", key)
	}

	cm.logger.Debug("Deleted config", "key", key)
	return nil
}

// GetConfigKeysByPrefix returns all config keys that start with the given prefix
func (cm *ConfigManager) GetConfigKeysByPrefix(prefix string) ([]string, error) {
	cm.mutex.RLock()
	defer cm.mutex.RUnlock()

	rows, err := cm.db.Query("SELECT key FROM config WHERE key LIKE ? ORDER BY key", prefix+"%")
	if err != nil {
		return nil, fmt.Errorf("failed to query config keys with prefix %s: %w", prefix, err)
	}
	defer rows.Close()

	var keys []string
	for rows.Next() {
		var key string
		if err := rows.Scan(&key); err != nil {
			return nil, fmt.Errorf("failed to scan config key: %w", err)
		}
		keys = append(keys, key)
	}

	return keys, nil
}

// BulkSet sets multiple configuration values at once
func (cm *ConfigManager) BulkSet(configs map[string]string) error {
	cm.mutex.Lock()
	defer cm.mutex.Unlock()

	tx, err := cm.db.Begin()
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback()

	now := time.Now().Format("2006-01-02 15:04:05")
	for key, value := range configs {
		_, err = tx.Exec("INSERT OR REPLACE INTO config (key, value, updated_at) VALUES (?, ?, ?)",
			key, value, now)
		if err != nil {
			return fmt.Errorf("failed to set config %s: %w", key, err)
		}
	}

	if err = tx.Commit(); err != nil {
		return fmt.Errorf("failed to commit transaction: %w", err)
	}

	cm.logger.Debug("Bulk set configs", "count", len(configs))
	return nil
}

// LoadFlowSettings loads flow-related settings
func (cm *ConfigManager) LoadFlowSettings() error {
	// Flow settings are typically stored as JSON arrays in viper
	// We can store individual flow configs with prefixed keys
	viper.SetDefault("flows.outgoing", []FlowConfig{})
	viper.SetDefault("flows.incoming", []FlowConfig{})

	// For now, flows are handled separately in the database
	// This method can be extended when flow configs need to be stored in the main config table
	cm.logger.Info("Flow settings loaded")
	return nil
}

// SaveFlowSettings saves flow-related settings
func (cm *ConfigManager) SaveFlowSettings() error {
	// Flow settings are handled separately in dedicated tables
	// This method can be extended when needed
	cm.logger.Info("Flow settings saved")
	return nil
}

// LoadSensorSettings loads sensor-related settings
func (cm *ConfigManager) LoadSensorSettings() error {
	// Sensor settings are stored in dedicated sensor tables
	// We can store sensor-related global configs here
	viper.SetDefault("gpsd", "gpsd:2947")
	viper.SetDefault("gps_port", "")

	if gpsd, err := cm.GetString("gpsd"); err == nil {
		viper.Set("gpsd", gpsd)
	}
	if gpsPort, err := cm.GetString("gps_port"); err == nil {
		viper.Set("gps_port", gpsPort)
	}

	cm.logger.Info("Sensor settings loaded")
	return nil
}

// SaveSensorSettings saves sensor-related settings
func (cm *ConfigManager) SaveSensorSettings() error {
	if err := cm.SetString("gpsd", viper.GetString("gpsd")); err != nil {
		return err
	}
	if err := cm.SetString("gps_port", viper.GetString("gps_port")); err != nil {
		return err
	}

	cm.logger.Info("Sensor settings saved")
	return nil
}

// LoadFeatureSettings loads feature-related settings (tracking, resend, etc.)
func (cm *ConfigManager) LoadFeatureSettings() error {
	// Tracking settings
	viper.SetDefault("tracking.enabled", true)
	viper.SetDefault("tracking.default_trail_length", 50)
	viper.SetDefault("tracking.default_update_interval", 30)
	viper.SetDefault("tracking.default_trail_color", "#FF0000")
	viper.SetDefault("tracking.default_trail_width", 3)

	if trackingEnabled, err := cm.GetBool("tracking.enabled"); err == nil {
		viper.Set("tracking.enabled", trackingEnabled)
	}
	if trailLength, err := cm.GetInt("tracking.default_trail_length"); err == nil {
		viper.Set("tracking.default_trail_length", trailLength)
	}
	if updateInterval, err := cm.GetInt("tracking.default_update_interval"); err == nil {
		viper.Set("tracking.default_update_interval", updateInterval)
	}
	if trailColor, err := cm.GetString("tracking.default_trail_color"); err == nil {
		viper.Set("tracking.default_trail_color", trailColor)
	}
	if trailWidth, err := cm.GetInt("tracking.default_trail_width"); err == nil {
		viper.Set("tracking.default_trail_width", trailWidth)
	}

	// Resend settings
	viper.SetDefault("resend.enabled", true)
	viper.SetDefault("resend.max_filters_per_config", 10)

	if resendEnabled, err := cm.GetBool("resend.enabled"); err == nil {
		viper.Set("resend.enabled", resendEnabled)
	}
	if maxFilters, err := cm.GetInt("resend.max_filters_per_config"); err == nil {
		viper.Set("resend.max_filters_per_config", maxFilters)
	}

	cm.logger.Info("Feature settings loaded")
	return nil
}

// SaveFeatureSettings saves feature-related settings
func (cm *ConfigManager) SaveFeatureSettings() error {
	// Tracking settings
	if err := cm.SetBool("tracking.enabled", viper.GetBool("tracking.enabled")); err != nil {
		return err
	}
	if err := cm.SetInt("tracking.default_trail_length", viper.GetInt("tracking.default_trail_length")); err != nil {
		return err
	}
	if err := cm.SetInt("tracking.default_update_interval", viper.GetInt("tracking.default_update_interval")); err != nil {
		return err
	}
	if err := cm.SetString("tracking.default_trail_color", viper.GetString("tracking.default_trail_color")); err != nil {
		return err
	}
	if err := cm.SetInt("tracking.default_trail_width", viper.GetInt("tracking.default_trail_width")); err != nil {
		return err
	}

	// Resend settings
	if err := cm.SetBool("resend.enabled", viper.GetBool("resend.enabled")); err != nil {
		return err
	}
	if err := cm.SetInt("resend.max_filters_per_config", viper.GetInt("resend.max_filters_per_config")); err != nil {
		return err
	}

	cm.logger.Info("Feature settings saved")
	return nil
}

// LoadFromFile loads configuration from a file into viper
func (cm *ConfigManager) LoadFromFile(configFile string) error {
	viper.SetConfigFile(configFile)
	err := viper.ReadInConfig()
	if err != nil {
		return fmt.Errorf("failed to read config file %s: %w", configFile, err)
	}
	cm.logger.Info("Configuration loaded from file", "file", configFile)
	return nil
}

// LoadFromDB loads all settings from database into viper
func (cm *ConfigManager) LoadFromDB() error {
	if err := cm.LoadBasicSettings(); err != nil {
		cm.logger.Error("Failed to load basic settings", "error", err)
	}
	if err := cm.LoadDependencySettings(); err != nil {
		cm.logger.Error("Failed to load dependency settings", "error", err)
	}
	if err := cm.LoadUserSettings(); err != nil {
		cm.logger.Error("Failed to load user settings", "error", err)
	}
	if err := cm.LoadFlowSettings(); err != nil {
		cm.logger.Error("Failed to load flow settings", "error", err)
	}
	if err := cm.LoadSensorSettings(); err != nil {
		cm.logger.Error("Failed to load sensor settings", "error", err)
	}
	if err := cm.LoadFeatureSettings(); err != nil {
		cm.logger.Error("Failed to load feature settings", "error", err)
	}

	cm.logger.Info("All settings loaded from database")
	return nil
}

// SaveToDB saves all current viper settings to database
func (cm *ConfigManager) SaveToDB() error {
	if err := cm.SaveBasicSettings(); err != nil {
		return err
	}
	if err := cm.SaveDependencySettings(); err != nil {
		return err
	}
	if err := cm.SaveUserSettings(); err != nil {
		return err
	}
	if err := cm.SaveFlowSettings(); err != nil {
		return err
	}
	if err := cm.SaveSensorSettings(); err != nil {
		return err
	}
	if err := cm.SaveFeatureSettings(); err != nil {
		return err
	}

	cm.logger.Info("All settings saved to database")
	return nil
}

// ClearAllConfigs removes all configuration entries
func (cm *ConfigManager) ClearAllConfigs() error {
	cm.mutex.Lock()
	defer cm.mutex.Unlock()

	_, err := cm.db.Exec("DELETE FROM config")
	if err != nil {
		return fmt.Errorf("failed to clear all configs: %w", err)
	}

	cm.logger.Info("All configs cleared")
	return nil
}
