package main

import (
	"fmt"
	"log/slog"
	"os"
	"strings"
	"sync"

	"github.com/mcuadros/go-defaults"
	"github.com/spf13/viper"
	"gopkg.in/yaml.v3"
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
	Title string `mapstructure:"title"`
	// TODO: Change Addr & Port with a general config map
	Addr string `mapstructure:"addr"`

	Port int    `mapstructure:"port"`
	UID  string `mapstructure:"uid"`
	Type string `mapstructure:"type"`

	Interval int `mapstructure:"interval"`
}

type UnitConfig struct {
	Callsign string  `mapstructure:"callsign" default:""`
	Lat      float64 `mapstructure:"lat" default:"0.0"`
	Lon      float64 `mapstructure:"lon" default:"0.0"`
	Zoom     int     `mapstructure:"zoom" default:"12"`
	Type     string  `mapstructure:"type" default:"a-f-G-U-C"`
	Team     string  `mapstructure:"team" default:"Blue"`
	Role     string  `mapstructure:"role" default:"HQ"`
	Platform string  `mapstructure:"platform" default:"GoATAK_client"`
	Version  string  `mapstructure:"version" default:"unknown"`
	Urn      int     `mapstructure:"urn" default:"0"`
	Ip       string  `mapstructure:"ip" default:""`
	Uid      string  `mapstructure:"uid" default:"auto"`
	OS       string  `mapstructure:"os" default:""`
	Interval int     `mapstructure:"interval" default:"15"`
	Device   string  `mapstructure:"device" default:""`
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
	Flows   []FlowConfig   `mapstructure:"flows"`
	Sensors []SensorConfig `mapstructure:"sensors"`

	Me UnitConfig `mapstructure:"me"`

	WebPort           int    `mapstructure:"web_port" default:"8080"`
	Debug             bool   `mapstructure:"debug" default:"false"`
	NoWeb             bool   `mapstructure:"no_web" default:"false"`
	File              string `mapstructure:"file" default:""`
	ServerAddress     string `mapstructure:"server_address" default:"127.0.0.1:8087:tcp"`
	Gpsd              string `mapstructure:"gpsd" default:"gpsd:2947"`
	DnsServiceURL     string `mapstructure:"dns_service.url" default:"http://dns.api"`
	GpsPort           string `mapstructure:"gps_port" default:""`
	MapServer         string `mapstructure:"map_server" default:"127.0.0.1:8000"`
	SslEnrollUser     string `mapstructure:"ssl.enroll_user,omitempty"`
	SslEnrollPassword string `mapstructure:"ssl.enroll_password,omitempty"`
	SslCert           string `mapstructure:"ssl.cert,omitempty"`
	SslPassword       string `mapstructure:"ssl.password,omitempty"`
	SslSaveCert       bool   `mapstructure:"ssl.save_cert,omitempty"`
	SslStrict         bool   `mapstructure:"ssl.strict,omitempty"`
	DefaultDestIP     string `mapstructure:"default_dest_ip,omitempty"`
	DefaultDestURN    int    `mapstructure:"default_dest_urn,omitempty"`

	Tracking TrackingConfig `mapstructure:"tracking,omitempty"`
	Resend   ResendConfig   `mapstructure:"resend,omitempty"`
}

// ConfigManager handles centralized configuration management with file persistence
type ConfigManager struct {
	configFile string
	logger     *slog.Logger
	mutex      sync.RWMutex
}

// NewConfigManager creates a new configuration manager instance
func NewConfigManager(configFile string, logger *slog.Logger) *ConfigManager {
	return &ConfigManager{
		configFile: configFile,
		logger:     logger.With("component", "config_manager"),
	}
}

func (cm *ConfigManager) Load(configFile string) (ApplicationConfig, error) {
	cm.logger.Info("Loading configuration from file", "file", configFile)

	var c ApplicationConfig

	viper.SetConfigFile(configFile)

	defaults.SetDefaults(&c)

	if err := viper.ReadInConfig(); err != nil {
		cm.logger.Error("Failed to read configuration file", "error", err, "file", configFile)
		return c, err
	}

	err := viper.Unmarshal(&c)
	if err != nil {
		cm.logger.Error("Failed to unmarshal configuration", "error", err, "file", configFile)
		return c, err
	}

	cm.logger.Info("Configuration loaded successfully", "file", configFile, "flows", len(c.Flows), "sensors", len(c.Sensors))
	cm.logConfig(c)

	return c, nil
}

func (cm *ConfigManager) Save(c ApplicationConfig) error {
	cm.mutex.Lock()
	defer cm.mutex.Unlock()

	cm.logger.Info("Saving configuration to file", "file", cm.configFile, "flows", len(c.Flows), "sensors", len(c.Sensors))

	fileContent, err := yaml.Marshal(c)
	if err != nil {
		cm.logger.Error("Failed to marshal configuration", "error", err)
		return err
	}

	// Create backup if file exists
	if _, err := os.Stat(cm.configFile); err == nil {
		backupFile := cm.configFile + ".bak"
		if err := os.Rename(cm.configFile, backupFile); err != nil {
			cm.logger.Error("Failed to create backup file", "error", err, "backup", backupFile)
			return err
		}
		cm.logger.Debug("Created backup file", "backup", backupFile)
	}

	// Write the file
	err = os.WriteFile(cm.configFile, fileContent, 0644)
	if err != nil {
		cm.logger.Error("Failed to write configuration file", "error", err, "file", cm.configFile)
		return err
	}

	cm.logger.Info("Configuration saved successfully", "file", cm.configFile)
	return nil
}

// AddFlow adds a new flow configuration
func (cm *ConfigManager) AddFlow(config *ApplicationConfig, flow FlowConfig) {
	cm.mutex.Lock()
	defer cm.mutex.Unlock()

	config.Flows = append(config.Flows, flow)
	cm.logger.Info("Added flow configuration", "title", flow.Title, "type", flow.Type, "total_flows", len(config.Flows))
}

// RemoveFlow removes a flow by UID
func (cm *ConfigManager) RemoveFlow(config *ApplicationConfig, uid string) bool {
	cm.mutex.Lock()
	defer cm.mutex.Unlock()

	for i, flow := range config.Flows {
		if flow.UID == uid {
			config.Flows = append(config.Flows[:i], config.Flows[i+1:]...)
			cm.logger.Info("Removed flow configuration", "uid", uid, "title", flow.Title, "remaining_flows", len(config.Flows))
			return true
		}
	}
	cm.logger.Warn("Flow not found for removal", "uid", uid)
	return false
}

// UpdateFlow updates an existing flow configuration
func (cm *ConfigManager) UpdateFlow(config *ApplicationConfig, uid string, updatedFlow FlowConfig) bool {
	cm.mutex.Lock()
	defer cm.mutex.Unlock()

	for i, flow := range config.Flows {
		if flow.UID == uid {
			config.Flows[i] = updatedFlow
			cm.logger.Info("Updated flow configuration", "uid", uid, "title", updatedFlow.Title, "type", updatedFlow.Type)
			return true
		}
	}
	cm.logger.Warn("Flow not found for update", "uid", uid)
	return false
}

// AddSensor adds a new sensor configuration
func (cm *ConfigManager) AddSensor(config *ApplicationConfig, sensor SensorConfig) {
	cm.mutex.Lock()
	defer cm.mutex.Unlock()

	config.Sensors = append(config.Sensors, sensor)
	cm.logger.Info("Added sensor configuration", "title", sensor.Title, "type", sensor.Type, "total_sensors", len(config.Sensors))
}

// RemoveSensor removes a sensor by UID
func (cm *ConfigManager) RemoveSensor(config *ApplicationConfig, uid string) bool {
	cm.mutex.Lock()
	defer cm.mutex.Unlock()

	for i, sensor := range config.Sensors {
		if sensor.UID == uid {
			config.Sensors = append(config.Sensors[:i], config.Sensors[i+1:]...)
			cm.logger.Info("Removed sensor configuration", "uid", uid, "title", sensor.Title, "remaining_sensors", len(config.Sensors))
			return true
		}
	}
	cm.logger.Warn("Sensor not found for removal", "uid", uid)
	return false
}

// UpdateSensor updates an existing sensor configuration
func (cm *ConfigManager) UpdateSensor(config *ApplicationConfig, uid string, updatedSensor SensorConfig) bool {
	cm.mutex.Lock()
	defer cm.mutex.Unlock()

	for i, sensor := range config.Sensors {
		if sensor.UID == uid {
			config.Sensors[i] = updatedSensor
			cm.logger.Info("Updated sensor configuration", "uid", uid, "title", updatedSensor.Title, "type", updatedSensor.Type)
			return true
		}
	}
	cm.logger.Warn("Sensor not found for update", "uid", uid)
	return false
}

// GetFlows returns all flow configurations
func (cm *ConfigManager) GetFlows(config *ApplicationConfig) []FlowConfig {
	cm.mutex.RLock()
	defer cm.mutex.RUnlock()

	flows := make([]FlowConfig, len(config.Flows))
	copy(flows, config.Flows)
	return flows
}

// GetSensors returns all sensor configurations
func (cm *ConfigManager) GetSensors(config *ApplicationConfig) []SensorConfig {
	cm.mutex.RLock()
	defer cm.mutex.RUnlock()

	sensors := make([]SensorConfig, len(config.Sensors))
	copy(sensors, config.Sensors)
	return sensors
}

// logConfig logs the ApplicationConfig in a pretty ASCII table format
func (cm *ConfigManager) logConfig(cfg ApplicationConfig) {
	var sb strings.Builder

	// Header
	sb.WriteString("\n")
	sb.WriteString("╔════════════════════════════════════════════════════════════════════════════════════════╗\n")
	sb.WriteString("║                           APPLICATION CONFIGURATION                                    ║\n")
	sb.WriteString("╠════════════════════════════════════════════════════════════════════════════════════════╣\n")

	// General Settings Section
	sb.WriteString("║ GENERAL SETTINGS                                                                       ║\n")
	sb.WriteString("╟────────────────────────────────────────┬───────────────────────────────────────────────╢\n")
	sb.WriteString(fmt.Sprintf("║ %-38s │ %-45s ║\n", "Web Port", fmt.Sprintf("%d", cfg.WebPort)))
	sb.WriteString(fmt.Sprintf("║ %-38s │ %-45s ║\n", "Debug", fmt.Sprintf("%t", cfg.Debug)))
	sb.WriteString(fmt.Sprintf("║ %-38s │ %-45s ║\n", "No Web", fmt.Sprintf("%t", cfg.NoWeb)))
	sb.WriteString(fmt.Sprintf("║ %-38s │ %-45s ║\n", "Config File", truncate(cfg.File, 45)))
	sb.WriteString(fmt.Sprintf("║ %-38s │ %-45s ║\n", "Server Address", truncate(cfg.ServerAddress, 45)))
	sb.WriteString(fmt.Sprintf("║ %-38s │ %-45s ║\n", "GPSD", truncate(cfg.Gpsd, 45)))
	sb.WriteString(fmt.Sprintf("║ %-38s │ %-45s ║\n", "GPS Port", truncate(cfg.GpsPort, 45)))
	sb.WriteString(fmt.Sprintf("║ %-38s │ %-45s ║\n", "Map Server", truncate(cfg.MapServer, 45)))
	sb.WriteString(fmt.Sprintf("║ %-38s │ %-45s ║\n", "DNS Service URL", truncate(cfg.DnsServiceURL, 45)))

	// SSL Settings Section
	sb.WriteString("╟────────────────────────────────────────┴───────────────────────────────────────────────╢\n")
	sb.WriteString("║ SSL SETTINGS                                                                           ║\n")
	sb.WriteString("╟────────────────────────────────────────┬───────────────────────────────────────────────╢\n")
	sb.WriteString(fmt.Sprintf("║ %-38s │ %-45s ║\n", "Enroll User", truncate(cfg.SslEnrollUser, 45)))
	sb.WriteString(fmt.Sprintf("║ %-38s │ %-45s ║\n", "Enroll Password", maskPassword(cfg.SslEnrollPassword)))
	sb.WriteString(fmt.Sprintf("║ %-38s │ %-45s ║\n", "Certificate", truncate(cfg.SslCert, 45)))
	sb.WriteString(fmt.Sprintf("║ %-38s │ %-45s ║\n", "Password", maskPassword(cfg.SslPassword)))
	sb.WriteString(fmt.Sprintf("║ %-38s │ %-45s ║\n", "Save Certificate", fmt.Sprintf("%t", cfg.SslSaveCert)))
	sb.WriteString(fmt.Sprintf("║ %-38s │ %-45s ║\n", "Strict SSL", fmt.Sprintf("%t", cfg.SslStrict)))

	// Default Destination Section
	sb.WriteString("╟────────────────────────────────────────┴───────────────────────────────────────────────╢\n")
	sb.WriteString("║ DEFAULT DESTINATION                                                                    ║\n")
	sb.WriteString("╟────────────────────────────────────────┬───────────────────────────────────────────────╢\n")
	sb.WriteString(fmt.Sprintf("║ %-38s │ %-45s ║\n", "Default Dest IP", truncate(cfg.DefaultDestIP, 45)))
	sb.WriteString(fmt.Sprintf("║ %-38s │ %-45s ║\n", "Default Dest URN", fmt.Sprintf("%d", cfg.DefaultDestURN)))

	// Unit Configuration Section
	sb.WriteString("╟────────────────────────────────────────┴───────────────────────────────────────────────╢\n")
	sb.WriteString("║ UNIT CONFIGURATION (ME)                                                                ║\n")
	sb.WriteString("╟────────────────────────────────────────┬───────────────────────────────────────────────╢\n")
	sb.WriteString(fmt.Sprintf("║ %-38s │ %-45s ║\n", "Callsign", truncate(cfg.Me.Callsign, 45)))
	sb.WriteString(fmt.Sprintf("║ %-38s │ %-45s ║\n", "Position", fmt.Sprintf("%.6f, %.6f", cfg.Me.Lat, cfg.Me.Lon)))
	sb.WriteString(fmt.Sprintf("║ %-38s │ %-45s ║\n", "Zoom", fmt.Sprintf("%d", cfg.Me.Zoom)))
	sb.WriteString(fmt.Sprintf("║ %-38s │ %-45s ║\n", "Type", truncate(cfg.Me.Type, 45)))
	sb.WriteString(fmt.Sprintf("║ %-38s │ %-45s ║\n", "Team", truncate(cfg.Me.Team, 45)))
	sb.WriteString(fmt.Sprintf("║ %-38s │ %-45s ║\n", "Role", truncate(cfg.Me.Role, 45)))
	sb.WriteString(fmt.Sprintf("║ %-38s │ %-45s ║\n", "Platform", truncate(cfg.Me.Platform, 45)))
	sb.WriteString(fmt.Sprintf("║ %-38s │ %-45s ║\n", "Version", truncate(cfg.Me.Version, 45)))
	sb.WriteString(fmt.Sprintf("║ %-38s │ %-45s ║\n", "UID", truncate(cfg.Me.Uid, 45)))
	sb.WriteString(fmt.Sprintf("║ %-38s │ %-45s ║\n", "URN", fmt.Sprintf("%d", cfg.Me.Urn)))
	sb.WriteString(fmt.Sprintf("║ %-38s │ %-45s ║\n", "IP", truncate(cfg.Me.Ip, 45)))
	sb.WriteString(fmt.Sprintf("║ %-38s │ %-45s ║\n", "OS", truncate(cfg.Me.OS, 45)))
	sb.WriteString(fmt.Sprintf("║ %-38s │ %-45s ║\n", "Interval", fmt.Sprintf("%d seconds", cfg.Me.Interval)))
	sb.WriteString(fmt.Sprintf("║ %-38s │ %-45s ║\n", "Device", truncate(cfg.Me.Device, 45)))

	// Tracking Configuration Section
	sb.WriteString("╟────────────────────────────────────────┴───────────────────────────────────────────────╢\n")
	sb.WriteString("║ TRACKING CONFIGURATION                                                                 ║\n")
	sb.WriteString("╟────────────────────────────────────────┬───────────────────────────────────────────────╢\n")
	sb.WriteString(fmt.Sprintf("║ %-38s │ %-45s ║\n", "Enabled", fmt.Sprintf("%t", cfg.Tracking.Enabled)))
	sb.WriteString(fmt.Sprintf("║ %-38s │ %-45s ║\n", "Default Trail Length", fmt.Sprintf("%d", cfg.Tracking.DefaultTrailLength)))
	sb.WriteString(fmt.Sprintf("║ %-38s │ %-45s ║\n", "Default Update Interval", fmt.Sprintf("%d seconds", cfg.Tracking.DefaultUpdateInterval)))
	sb.WriteString(fmt.Sprintf("║ %-38s │ %-45s ║\n", "Default Trail Color", truncate(cfg.Tracking.DefaultTrailColor, 45)))
	sb.WriteString(fmt.Sprintf("║ %-38s │ %-45s ║\n", "Default Trail Width", fmt.Sprintf("%d", cfg.Tracking.DefaultTrailWidth)))

	// Resend Configuration Section
	sb.WriteString("╟────────────────────────────────────────┴───────────────────────────────────────────────╢\n")
	sb.WriteString("║ RESEND CONFIGURATION                                                                   ║\n")
	sb.WriteString("╟────────────────────────────────────────┬───────────────────────────────────────────────╢\n")
	sb.WriteString(fmt.Sprintf("║ %-38s │ %-45s ║\n", "Enabled", fmt.Sprintf("%t", cfg.Resend.Enabled)))
	sb.WriteString(fmt.Sprintf("║ %-38s │ %-45s ║\n", "Max Filters Per Config", fmt.Sprintf("%d", cfg.Resend.MaxFiltersPerConfig)))

	// Flows Section
	sb.WriteString("╟────────────────────────────────────────┴───────────────────────────────────────────────╢\n")
	sb.WriteString(fmt.Sprintf("║ FLOWS (%d configured)%-67s║\n", len(cfg.Flows), ""))
	sb.WriteString("╟────────────────────────────────────────────────────────────────────────────────────────╢\n")

	if len(cfg.Flows) == 0 {
		sb.WriteString("║ No flows configured                                                                    ║\n")
	} else {
		for i, flow := range cfg.Flows {
			sb.WriteString(fmt.Sprintf("║ Flow #%-2d                                                                              ║\n", i+1))
			sb.WriteString("╟────────────────────────────────────────┬───────────────────────────────────────────────╢\n")
			sb.WriteString(fmt.Sprintf("║ %-38s │ %-45s ║\n", "  UID", truncate(flow.UID, 45)))
			sb.WriteString(fmt.Sprintf("║ %-38s │ %-45s ║\n", "  Title", truncate(flow.Title, 45)))
			sb.WriteString(fmt.Sprintf("║ %-38s │ %-45s ║\n", "  Address", truncate(flow.Addr, 45)))
			sb.WriteString(fmt.Sprintf("║ %-38s │ %-45s ║\n", "  Port", fmt.Sprintf("%d", flow.Port)))
			sb.WriteString(fmt.Sprintf("║ %-38s │ %-45s ║\n", "  Type", truncate(flow.Type, 45)))
			sb.WriteString(fmt.Sprintf("║ %-38s │ %-45s ║\n", "  Direction", fmt.Sprintf("%d", flow.Direction)))
			sb.WriteString(fmt.Sprintf("║ %-38s │ %-45s ║\n", "  Send Exchange", truncate(flow.SendExchange, 45)))
			sb.WriteString(fmt.Sprintf("║ %-38s │ %-45s ║\n", "  Recv Queue", truncate(flow.RecvQueue, 45)))
			if i < len(cfg.Flows)-1 {
				sb.WriteString("╟────────────────────────────────────────┴───────────────────────────────────────────────╢\n")
			}
		}
	}

	// Sensors Section
	sb.WriteString("╟────────────────────────────────────────────────────────────────────────────────────────╢\n")
	sb.WriteString(fmt.Sprintf("║ SENSORS (%d configured)%-64s║\n", len(cfg.Sensors), ""))
	sb.WriteString("╟────────────────────────────────────────────────────────────────────────────────────────╢\n")

	if len(cfg.Sensors) == 0 {
		sb.WriteString("║ No sensors configured                                                                  ║\n")
	} else {
		for i, sensor := range cfg.Sensors {
			sb.WriteString(fmt.Sprintf("║ Sensor #%-2d                                                                            ║\n", i+1))
			sb.WriteString("╟────────────────────────────────────────┬───────────────────────────────────────────────╢\n")
			sb.WriteString(fmt.Sprintf("║ %-38s │ %-45s ║\n", "  UID", truncate(sensor.UID, 45)))
			sb.WriteString(fmt.Sprintf("║ %-38s │ %-45s ║\n", "  Title", truncate(sensor.Title, 45)))
			sb.WriteString(fmt.Sprintf("║ %-38s │ %-45s ║\n", "  Address", truncate(sensor.Addr, 45)))
			sb.WriteString(fmt.Sprintf("║ %-38s │ %-45s ║\n", "  Port", fmt.Sprintf("%d", sensor.Port)))
			sb.WriteString(fmt.Sprintf("║ %-38s │ %-45s ║\n", "  Type", truncate(sensor.Type, 45)))
			sb.WriteString(fmt.Sprintf("║ %-38s │ %-45s ║\n", "  Interval", fmt.Sprintf("%d seconds", sensor.Interval)))
			if i < len(cfg.Sensors)-1 {
				sb.WriteString("╟────────────────────────────────────────┴───────────────────────────────────────────────╢\n")
			}
		}
	}

	// Footer
	sb.WriteString("╚════════════════════════════════════════════════════════════════════════════════════════╝\n")

	// Log the table
	cm.logger.Debug(sb.String())
}

// truncate truncates a string to maxLen, adding "..." if necessary
func truncate(s string, maxLen int) string {
	if s == "" {
		return "-"
	}
	if len(s) <= maxLen {
		return s
	}
	if maxLen <= 3 {
		return s[:maxLen]
	}
	return s[:maxLen-3] + "..."
}

// maskPassword masks a password string for display
func maskPassword(password string) string {
	if password == "" {
		return "-"
	}
	return "********"
}
