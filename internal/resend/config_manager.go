package resend

import (
	"database/sql"
	"fmt"
	"log/slog"
	"sync"
	"time"
)

// ConfigManager manages resend configurations in memory
type ConfigManager struct {
	configs map[string]*ResendConfigDTO
	mutex   sync.RWMutex
	logger  *slog.Logger
}

// ResendConfigDTO represents the data transfer object for ResendConfig
type ResendConfigDTO struct {
	UID         string             `json:"uid"`
	Name        string             `json:"name"`
	Enabled     bool               `json:"enabled"`
	Source      *NetworkAddressDTO `json:"source,omitempty"`
	Destination *NetworkAddressDTO `json:"destination"`
	Filters     []FilterDTO        `json:"filters"`
	CreatedAt   time.Time          `json:"created_at"`
	UpdatedAt   time.Time          `json:"updated_at"`
}

// NetworkAddressDTO represents the data transfer object for NetworkAddress
type NetworkAddressDTO struct {
	Type       string `json:"type"` // "node" or "subnet"
	IP         string `json:"ip"`
	URN        int32  `json:"urn,omitempty"`
	SubnetMask string `json:"subnet_mask,omitempty"` // Only for subnet type
}

// FilterDTO represents the data transfer object for Filter
type FilterDTO struct {
	ID         string         `json:"id"`
	Predicates []PredicateDTO `json:"predicates"`
}

// PredicateDTO represents the data transfer object for Predicate
type PredicateDTO struct {
	ID    string `json:"id"`
	Type  string `json:"type"` // "item_type", "side", "unit_type", "location_boundary"
	Value string `json:"value"`
}

// NewConfigManager creates a new ConfigManager
func NewConfigManager(logger *slog.Logger) *ConfigManager {
	return &ConfigManager{
		configs: make(map[string]*ResendConfigDTO),
		logger:  logger,
	}
}

// GetActiveConfigs returns all enabled configurations
func (c *ConfigManager) GetActiveConfigs() []*ResendConfigDTO {
	c.mutex.RLock()
	defer c.mutex.RUnlock()

	active := make([]*ResendConfigDTO, 0)
	for _, config := range c.configs {
		if config.Enabled {
			active = append(active, config)
		}
	}
	return active
}

// GetAllConfigs returns all configurations regardless of enabled status
func (c *ConfigManager) GetAllConfigs() []*ResendConfigDTO {
	c.mutex.RLock()
	defer c.mutex.RUnlock()

	configs := make([]*ResendConfigDTO, 0, len(c.configs))
	for _, config := range c.configs {
		configs = append(configs, config)
	}
	return configs
}

// GetConfig returns a specific configuration by UID
func (c *ConfigManager) GetConfig(uid string) (*ResendConfigDTO, bool) {
	c.mutex.RLock()
	defer c.mutex.RUnlock()

	config, exists := c.configs[uid]
	return config, exists
}

// UpdateConfig adds or updates a configuration in the cache
func (c *ConfigManager) UpdateConfig(config *ResendConfigDTO) {
	c.mutex.Lock()
	defer c.mutex.Unlock()

	c.configs[config.UID] = config
	c.logger.Debug("Config updated in cache", "uid", config.UID, "name", config.Name)
}

// DeleteConfig removes a configuration from the cache
func (c *ConfigManager) DeleteConfig(uid string) {
	c.mutex.Lock()
	defer c.mutex.Unlock()

	if config, exists := c.configs[uid]; exists {
		delete(c.configs, uid)
		c.logger.Debug("Config deleted from cache", "uid", uid, "name", config.Name)
	}
}

// LoadFromDatabase loads all configurations from the database into the cache
func (c *ConfigManager) LoadFromDatabase(db *sql.DB) error {
	c.logger.Info("Loading resend configurations from database")

	configs, err := c.loadResendConfigsFromDatabase(db)
	if err != nil {
		return fmt.Errorf("failed to load configs from database: %w", err)
	}

	c.mutex.Lock()
	defer c.mutex.Unlock()

	// Clear existing configs
	c.configs = make(map[string]*ResendConfigDTO)

	// Load new configs
	for _, config := range configs {
		c.configs[config.UID] = &config
	}

	c.logger.Info("Loaded resend configurations from database", "count", len(configs))
	return nil
}

// GetConfigCount returns the number of configurations in cache
func (c *ConfigManager) GetConfigCount() int {
	c.mutex.RLock()
	defer c.mutex.RUnlock()
	return len(c.configs)
}

// Database loading functions - these mirror the functions from http_resend.go
// We need these here to avoid circular dependencies

func (c *ConfigManager) loadResendConfigsFromDatabase(db *sql.DB) ([]ResendConfigDTO, error) {
	rows, err := db.Query(`SELECT uid, name, enabled, source_type, source_ip, source_urn, source_subnet_mask,
		destination_type, destination_ip, destination_urn, destination_subnet_mask, created_at, updated_at
		FROM resend_configs ORDER BY created_at DESC`)
	if err != nil {
		return nil, fmt.Errorf("failed to query resend configs: %w", err)
	}
	defer rows.Close()

	var configs []ResendConfigDTO
	for rows.Next() {
		var config ResendConfigDTO
		var sourceType, sourceIP, sourceSubnetMask sql.NullString
		var sourceURN sql.NullInt32
		var destURN sql.NullInt32
		var destSubnetMask sql.NullString
		var destType, destIP string
		var createdAt, updatedAt sql.NullTime

		// Initialize destination to avoid nil pointer dereference
		config.Destination = &NetworkAddressDTO{}

		err := rows.Scan(&config.UID, &config.Name, &config.Enabled,
			&sourceType, &sourceIP, &sourceURN, &sourceSubnetMask,
			&destType, &destIP, &destURN, &destSubnetMask,
			&createdAt, &updatedAt)
		if err != nil {
			return nil, fmt.Errorf("failed to scan config row: %w", err)
		}

		// Set destination values
		config.Destination.Type = destType
		config.Destination.IP = destIP

		if destURN.Valid {
			config.Destination.URN = destURN.Int32
		}
		if destSubnetMask.Valid {
			config.Destination.SubnetMask = destSubnetMask.String
		}

		// Set timestamps
		if createdAt.Valid {
			config.CreatedAt = createdAt.Time
		}
		if updatedAt.Valid {
			config.UpdatedAt = updatedAt.Time
		}

		// Set up source if it exists
		if sourceType.Valid {
			config.Source = &NetworkAddressDTO{
				Type: sourceType.String,
				IP:   sourceIP.String,
			}
			if sourceURN.Valid {
				config.Source.URN = sourceURN.Int32
			}
			if sourceSubnetMask.Valid {
				config.Source.SubnetMask = sourceSubnetMask.String
			}
		}

		// Load filters for this config
		filters, err := c.loadFiltersForConfig(db, config.UID)
		if err != nil {
			return nil, fmt.Errorf("failed to load filters for config %s: %w", config.UID, err)
		}
		config.Filters = filters

		configs = append(configs, config)
	}

	return configs, nil
}

func (c *ConfigManager) loadFiltersForConfig(db *sql.DB, configUID string) ([]FilterDTO, error) {
	rows, err := db.Query("SELECT id FROM resend_filters WHERE config_uid = ?", configUID)
	if err != nil {
		return nil, fmt.Errorf("failed to query filters: %w", err)
	}
	defer rows.Close()

	var filters []FilterDTO
	for rows.Next() {
		var filter FilterDTO
		err := rows.Scan(&filter.ID)
		if err != nil {
			return nil, fmt.Errorf("failed to scan filter row: %w", err)
		}

		// Load predicates for this filter
		predicates, err := c.loadPredicatesForFilter(db, filter.ID)
		if err != nil {
			return nil, fmt.Errorf("failed to load predicates for filter %s: %w", filter.ID, err)
		}
		filter.Predicates = predicates

		filters = append(filters, filter)
	}

	return filters, nil
}

func (c *ConfigManager) loadPredicatesForFilter(db *sql.DB, filterID string) ([]PredicateDTO, error) {
	rows, err := db.Query("SELECT id, type, value FROM resend_predicates WHERE filter_id = ?", filterID)
	if err != nil {
		return nil, fmt.Errorf("failed to query predicates: %w", err)
	}
	defer rows.Close()

	var predicates []PredicateDTO
	for rows.Next() {
		var predicate PredicateDTO
		err := rows.Scan(&predicate.ID, &predicate.Type, &predicate.Value)
		if err != nil {
			return nil, fmt.Errorf("failed to scan predicate row: %w", err)
		}
		predicates = append(predicates, predicate)
	}

	return predicates, nil
}
