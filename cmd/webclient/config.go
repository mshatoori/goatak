package main

import (
	"log/slog"
	"os"
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
	Title string `mapstructure:"uid"`
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
	var c ApplicationConfig

	viper.SetConfigFile(configFile)

	defaults.SetDefaults(&c)
	viper.Unmarshal(&c)

	return c, nil
}

func (cm *ConfigManager) Save(c ApplicationConfig) error {
	cm.mutex.Lock()
	defer cm.mutex.Unlock()

	fileContent, err := yaml.Marshal(c)
	if err != nil {
		return err
	}

	// Create backup if file exists
	if _, err := os.Stat(cm.configFile); err == nil {
		backupFile := cm.configFile + ".bak"
		if err := os.Rename(cm.configFile, backupFile); err != nil {
			return err
		}
	}

	// Write the file
	return os.WriteFile(cm.configFile, fileContent, 0644)
}

// AddFlow adds a new flow configuration
func (cm *ConfigManager) AddFlow(config *ApplicationConfig, flow FlowConfig) {
	cm.mutex.Lock()
	defer cm.mutex.Unlock()

	config.Flows = append(config.Flows, flow)
}

// RemoveFlow removes a flow by UID
func (cm *ConfigManager) RemoveFlow(config *ApplicationConfig, uid string) bool {
	cm.mutex.Lock()
	defer cm.mutex.Unlock()

	for i, flow := range config.Flows {
		if flow.UID == uid {
			config.Flows = append(config.Flows[:i], config.Flows[i+1:]...)
			return true
		}
	}
	return false
}

// UpdateFlow updates an existing flow configuration
func (cm *ConfigManager) UpdateFlow(config *ApplicationConfig, uid string, updatedFlow FlowConfig) bool {
	cm.mutex.Lock()
	defer cm.mutex.Unlock()

	for i, flow := range config.Flows {
		if flow.UID == uid {
			config.Flows[i] = updatedFlow
			return true
		}
	}
	return false
}

// AddSensor adds a new sensor configuration
func (cm *ConfigManager) AddSensor(config *ApplicationConfig, sensor SensorConfig) {
	cm.mutex.Lock()
	defer cm.mutex.Unlock()

	config.Sensors = append(config.Sensors, sensor)
}

// RemoveSensor removes a sensor by UID
func (cm *ConfigManager) RemoveSensor(config *ApplicationConfig, uid string) bool {
	cm.mutex.Lock()
	defer cm.mutex.Unlock()

	for i, sensor := range config.Sensors {
		if sensor.UID == uid {
			config.Sensors = append(config.Sensors[:i], config.Sensors[i+1:]...)
			return true
		}
	}
	return false
}

// UpdateSensor updates an existing sensor configuration
func (cm *ConfigManager) UpdateSensor(config *ApplicationConfig, uid string, updatedSensor SensorConfig) bool {
	cm.mutex.Lock()
	defer cm.mutex.Unlock()

	for i, sensor := range config.Sensors {
		if sensor.UID == uid {
			config.Sensors[i] = updatedSensor
			return true
		}
	}
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
