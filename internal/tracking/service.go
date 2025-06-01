package tracking

import (
	"database/sql"
	"fmt"
	"log/slog"
	"time"

	"github.com/kdudkov/goatak/internal/model"
)

// TrackingService handles all tracking-related database operations
type TrackingService struct {
	db     *sql.DB
	logger *slog.Logger
}

// NewTrackingService creates a new tracking service instance
func NewTrackingService(db *sql.DB, logger *slog.Logger) *TrackingService {
	return &TrackingService{
		db:     db,
		logger: logger,
	}
}

// AddPosition adds a new position record for a unit
func (s *TrackingService) AddPosition(unitUID string, lat, lon, alt, speed, course float64) error {
	if s.db == nil {
		return fmt.Errorf("database not available")
	}

	// Check if tracking is enabled for this unit
	enabled, err := s.IsTrackingEnabled(unitUID)
	if err != nil {
		return fmt.Errorf("failed to check tracking status: %w", err)
	}
	if !enabled {
		return nil // Silently skip if tracking is disabled
	}

	query := `INSERT INTO tracking_positions (unit_uid, latitude, longitude, altitude, speed, course, timestamp, created_at)
			  VALUES (?, ?, ?, ?, ?, ?, ?, ?)`

	now := time.Now()
	_, err = s.db.Exec(query, unitUID, lat, lon,
		nullableFloat64(alt), nullableFloat64(speed), nullableFloat64(course),
		now.Format("2006-01-02 15:04:05"), now.Format("2006-01-02 15:04:05"))

	if err != nil {
		s.logger.Error("failed to insert tracking position", "error", err, "unit_uid", unitUID)
		return fmt.Errorf("failed to insert tracking position: %w", err)
	}

	s.logger.Debug("added tracking position", "unit_uid", unitUID, "lat", lat, "lon", lon)
	return nil
}

// GetTrail retrieves trail data for a specific unit
func (s *TrackingService) GetTrail(unitUID string, limit int) ([]model.TrackingPosition, error) {
	if s.db == nil {
		return nil, fmt.Errorf("database not available")
	}

	query := `SELECT id, unit_uid, latitude, longitude, altitude, speed, course, timestamp, created_at 
			  FROM tracking_positions 
			  WHERE unit_uid = ? 
			  ORDER BY timestamp DESC 
			  LIMIT ?`

	rows, err := s.db.Query(query, unitUID, limit)
	if err != nil {
		return nil, fmt.Errorf("failed to query trail data: %w", err)
	}
	defer rows.Close()

	var positions []model.TrackingPosition
	for rows.Next() {
		var pos model.TrackingPosition
		var altitude, speed, course sql.NullFloat64
		var timestampStr, createdAtStr string

		err := rows.Scan(&pos.ID, &pos.UnitUID, &pos.Latitude, &pos.Longitude,
			&altitude, &speed, &course, &timestampStr, &createdAtStr)
		if err != nil {
			return nil, fmt.Errorf("failed to scan position row: %w", err)
		}

		// Parse timestamp strings
		if pos.Timestamp, err = time.Parse("2006-01-02 15:04:05", timestampStr); err != nil {
			// Try RFC3339 format as fallback
			if pos.Timestamp, err = time.Parse(time.RFC3339, timestampStr); err != nil {
				return nil, fmt.Errorf("failed to parse timestamp: %w", err)
			}
		}

		if pos.CreatedAt, err = time.Parse("2006-01-02 15:04:05", createdAtStr); err != nil {
			// Try RFC3339 format as fallback
			if pos.CreatedAt, err = time.Parse(time.RFC3339, createdAtStr); err != nil {
				return nil, fmt.Errorf("failed to parse created_at: %w", err)
			}
		}

		pos.Altitude = nullableFloat64ToPointer(altitude)
		pos.Speed = nullableFloat64ToPointer(speed)
		pos.Course = nullableFloat64ToPointer(course)

		positions = append(positions, pos)
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating position rows: %w", err)
	}

	// Reverse to get chronological order (oldest first)
	for i, j := 0, len(positions)-1; i < j; i, j = i+1, j-1 {
		positions[i], positions[j] = positions[j], positions[i]
	}

	return positions, nil
}

// GetAllTrails retrieves trail data for all units that have tracking enabled
func (s *TrackingService) GetAllTrails() ([]model.TrackingTrail, error) {
	if s.db == nil {
		return nil, fmt.Errorf("database not available")
	}

	// Get all units with tracking enabled
	configQuery := `SELECT unit_uid, enabled, trail_length, update_interval, trail_color, trail_width, created_at, updated_at 
					FROM tracking_config 
					WHERE enabled = 1`

	rows, err := s.db.Query(configQuery)
	if err != nil {
		return nil, fmt.Errorf("failed to query tracking configs: %w", err)
	}
	defer rows.Close()

	var trails []model.TrackingTrail
	for rows.Next() {
		var config model.TrackingConfig
		var createdAtStr, updatedAtStr string
		err := rows.Scan(&config.UnitUID, &config.Enabled, &config.TrailLength,
			&config.UpdateInterval, &config.TrailColor, &config.TrailWidth,
			&createdAtStr, &updatedAtStr)
		if err != nil {
			s.logger.Error("failed to scan config row", "error", err)
			continue
		}

		// Parse timestamp strings
		if config.CreatedAt, err = time.Parse("2006-01-02 15:04:05", createdAtStr); err != nil {
			if config.CreatedAt, err = time.Parse(time.RFC3339, createdAtStr); err != nil {
				s.logger.Error("failed to parse created_at", "error", err)
				continue
			}
		}

		if config.UpdatedAt, err = time.Parse("2006-01-02 15:04:05", updatedAtStr); err != nil {
			if config.UpdatedAt, err = time.Parse(time.RFC3339, updatedAtStr); err != nil {
				s.logger.Error("failed to parse updated_at", "error", err)
				continue
			}
		}

		// Get positions for this unit
		positions, err := s.GetTrail(config.UnitUID, config.TrailLength)
		if err != nil {
			s.logger.Error("failed to get trail for unit", "error", err, "unit_uid", config.UnitUID)
			continue
		}

		trail := model.TrackingTrail{
			UnitUID:   config.UnitUID,
			Positions: positions,
			Config:    config,
		}

		trails = append(trails, trail)
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating config rows: %w", err)
	}

	return trails, nil
}

// UpdateConfig updates or creates tracking configuration for a unit
func (s *TrackingService) UpdateConfig(unitUID string, config model.TrackingConfig) error {
	if s.db == nil {
		return fmt.Errorf("database not available")
	}

	config.UnitUID = unitUID
	config.UpdatedAt = time.Now()

	query := `INSERT OR REPLACE INTO tracking_config
			  (unit_uid, enabled, trail_length, update_interval, trail_color, trail_width, created_at, updated_at)
			  VALUES (?, ?, ?, ?, ?, ?, COALESCE((SELECT created_at FROM tracking_config WHERE unit_uid = ?), ?), ?)`

	_, err := s.db.Exec(query, config.UnitUID, config.Enabled, config.TrailLength,
		config.UpdateInterval, config.TrailColor, config.TrailWidth,
		config.UnitUID, config.UpdatedAt.Format("2006-01-02 15:04:05"), config.UpdatedAt.Format("2006-01-02 15:04:05"))

	if err != nil {
		s.logger.Error("failed to update tracking config", "error", err, "unit_uid", unitUID)
		return fmt.Errorf("failed to update tracking config: %w", err)
	}

	s.logger.Info("updated tracking config", "unit_uid", unitUID, "enabled", config.Enabled)
	return nil
}

// CleanupOldData removes tracking data older than 24 hours
func (s *TrackingService) CleanupOldData() error {
	if s.db == nil {
		return fmt.Errorf("database not available")
	}

	cutoff := time.Now().Add(-24 * time.Hour)

	result, err := s.db.Exec("DELETE FROM tracking_positions WHERE timestamp < ?", cutoff)
	if err != nil {
		s.logger.Error("failed to cleanup old tracking data", "error", err)
		return fmt.Errorf("failed to cleanup old tracking data: %w", err)
	}

	rowsAffected, _ := result.RowsAffected()
	s.logger.Info("cleaned up old tracking data", "rows_deleted", rowsAffected, "cutoff", cutoff)

	return nil
}

// IsTrackingEnabled checks if tracking is enabled for a specific unit
func (s *TrackingService) IsTrackingEnabled(unitUID string) (bool, error) {
	if s.db == nil {
		return false, fmt.Errorf("database not available")
	}

	var enabled bool
	query := `SELECT enabled FROM tracking_config WHERE unit_uid = ?`

	err := s.db.QueryRow(query, unitUID).Scan(&enabled)
	if err == sql.ErrNoRows {
		// No config found, create default config
		defaultConfig := s.getDefaultConfig()
		defaultConfig.UnitUID = unitUID
		if err := s.UpdateConfig(unitUID, defaultConfig); err != nil {
			return false, fmt.Errorf("failed to create default config: %w", err)
		}
		return defaultConfig.Enabled, nil
	}
	if err != nil {
		return false, fmt.Errorf("failed to check tracking status: %w", err)
	}

	return enabled, nil
}

// GetConfig retrieves tracking configuration for a unit
func (s *TrackingService) GetConfig(unitUID string) (model.TrackingConfig, error) {
	if s.db == nil {
		return model.TrackingConfig{}, fmt.Errorf("database not available")
	}

	var config model.TrackingConfig
	var createdAtStr, updatedAtStr string
	query := `SELECT unit_uid, enabled, trail_length, update_interval, trail_color, trail_width, created_at, updated_at
			  FROM tracking_config WHERE unit_uid = ?`

	err := s.db.QueryRow(query, unitUID).Scan(&config.UnitUID, &config.Enabled,
		&config.TrailLength, &config.UpdateInterval, &config.TrailColor,
		&config.TrailWidth, &createdAtStr, &updatedAtStr)

	if err == sql.ErrNoRows {
		// Return default config
		config = s.getDefaultConfig()
		config.UnitUID = unitUID
		return config, nil
	}
	if err != nil {
		return model.TrackingConfig{}, fmt.Errorf("failed to get tracking config: %w", err)
	}

	// Parse timestamp strings
	if config.CreatedAt, err = time.Parse("2006-01-02 15:04:05", createdAtStr); err != nil {
		if config.CreatedAt, err = time.Parse(time.RFC3339, createdAtStr); err != nil {
			return model.TrackingConfig{}, fmt.Errorf("failed to parse created_at: %w", err)
		}
	}

	if config.UpdatedAt, err = time.Parse("2006-01-02 15:04:05", updatedAtStr); err != nil {
		if config.UpdatedAt, err = time.Parse(time.RFC3339, updatedAtStr); err != nil {
			return model.TrackingConfig{}, fmt.Errorf("failed to parse updated_at: %w", err)
		}
	}

	return config, nil
}

// getDefaultConfig returns default tracking configuration
func (s *TrackingService) getDefaultConfig() model.TrackingConfig {
	now := time.Now()
	return model.TrackingConfig{
		Enabled:        true,
		TrailLength:    50,
		UpdateInterval: 30,
		TrailColor:     "#FF0000",
		TrailWidth:     2,
		CreatedAt:      now,
		UpdatedAt:      now,
	}
}

// Helper functions for handling nullable float64 values
func nullableFloat64(val float64) sql.NullFloat64 {
	if val == 0 {
		return sql.NullFloat64{Valid: false}
	}
	return sql.NullFloat64{Float64: val, Valid: true}
}

func nullableFloat64ToPointer(val sql.NullFloat64) *float64 {
	if !val.Valid {
		return nil
	}
	return &val.Float64
}
