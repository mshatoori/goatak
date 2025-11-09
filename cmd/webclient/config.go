package main

import (
	"database/sql"
	"log/slog"
	"sync"

	"github.com/mcuadros/go-defaults"
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
	flows   []FlowConfig   `mapstructure:"flows"`
	sensors []SensorConfig `mapstructure:"sensors"`

	me UnitConfig `mapstructure:"me"`

	webPort        int    `mapstructure:"web_port" default:"8080"`
	debug          bool   `mapstructure:"debug" default:"false"`
	noWeb          bool   `mapstructure:"no_web" default:"false"`
	file           string `mapstructure:"file" default:""`
	serverAddress  string `mapstructure:"server_address" default:"127.0.0.1:8087:tcp"`
	gpsd           string `mapstructure:"gpsd" default:"gpsd:2947"`
	dnsServiceURL  string `mapstructure:"dns_service.url" default:"http://dns.api"`
	gpsPort        string `mapstructure:"gps_port" default:""`
	mapServer      string `mapstructure:"map_server" default:"127.0.0.1:8000"`
	sslPassword    string `mapstructure:"ssl.password,omitempty"`
	sslSaveCert    bool   `mapstructure:"ssl.save_cert,omitempty"`
	sslStrict      bool   `mapstructure:"ssl.strict,omitempty"`
	defaultDestIP  string `mapstructure:"default_dest_ip,omitempty"`
	defaultDestURN int    `mapstructure:"default_dest_urn,omitempty"`

	tracking TrackingConfig `mapstructure:"tracking,omitempty"`
	resend   ResendConfig   `mapstructure:"resend,omitempty"`
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

func (cm *ConfigManager) Load(viper *viper.Viper) (ApplicationConfig, error) {
	var c ApplicationConfig

	defaults.SetDefaults(&c)
	viper.Unmarshal(&c)

	return c, nil
}
