package model

import "time"

// TrackingPosition represents a single position record in a unit's trail
type TrackingPosition struct {
	ID        int64     `json:"id" db:"id"`
	UnitUID   string    `json:"unit_uid" db:"unit_uid"`
	Latitude  float64   `json:"latitude" db:"latitude"`
	Longitude float64   `json:"longitude" db:"longitude"`
	Altitude  *float64  `json:"altitude,omitempty" db:"altitude"`
	Speed     *float64  `json:"speed,omitempty" db:"speed"`
	Course    *float64  `json:"course,omitempty" db:"course"`
	Timestamp time.Time `json:"timestamp" db:"timestamp"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
}

// TrackingConfig represents tracking configuration for a specific unit
type TrackingConfig struct {
	UnitUID        string    `json:"unit_uid" db:"unit_uid"`
	Enabled        bool      `json:"enabled" db:"enabled"`
	TrailLength    int       `json:"trail_length" db:"trail_length"`
	UpdateInterval int       `json:"update_interval" db:"update_interval"` // seconds
	TrailColor     string    `json:"trail_color" db:"trail_color"`
	TrailWidth     int       `json:"trail_width" db:"trail_width"`
	CreatedAt      time.Time `json:"created_at" db:"created_at"`
	UpdatedAt      time.Time `json:"updated_at" db:"updated_at"`
}

// TrackingTrail represents a complete trail for a unit including positions and config
type TrackingTrail struct {
	UnitUID   string             `json:"unit_uid"`
	Callsign  string             `json:"callsign,omitempty"`
	Positions []TrackingPosition `json:"positions"`
	Config    TrackingConfig     `json:"config"`
}

// TrackingSettings represents global tracking settings
type TrackingSettings struct {
	GlobalEnabled         bool `json:"global_enabled"`
	DefaultTrailLength    int  `json:"default_trail_length"`
	DefaultUpdateInterval int  `json:"default_update_interval"`
	CleanupInterval       int  `json:"cleanup_interval"` // hours
}
