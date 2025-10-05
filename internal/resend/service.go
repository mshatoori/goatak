package resend

import (
	"database/sql"
	"fmt"
	"log/slog"

	"github.com/kdudkov/goatak/internal/repository"
	"github.com/kdudkov/goatak/pkg/cot"
	"github.com/kdudkov/goatak/pkg/cotproto"
	"github.com/kdudkov/goatak/pkg/model"
)

// ResendService is the main orchestrator for resend functionality
type ResendService struct {
	db            *sql.DB
	logger        *slog.Logger
	configManager *ConfigManager
	filterEngine  *FilterEngine
	router        *MessageRouter
}

// Config holds the configuration for ResendService
type Config struct {
	DB                *sql.DB
	Logger            *slog.Logger
	SendToDestination func(msg *cotproto.TakMessage, dest model.SendItemDest) error
	ItemsRepository   repository.ItemsRepository
}

// NewResendService creates a new ResendService instance
func NewResendService(config *Config) *ResendService {
	if config == nil {
		panic("ResendService config cannot be nil")
	}

	if config.Logger == nil {
		panic("Logger cannot be nil")
	}

	if config.SendToDestination == nil {
		panic("SendToDestination function cannot be nil")
	}

	service := &ResendService{
		db:            config.DB,
		logger:        config.Logger,
		configManager: NewConfigManager(config.Logger.With("component", "config_manager")),
		filterEngine:  NewFilterEngine(config.Logger.With("component", "filter_engine"), config.ItemsRepository),
		router:        NewMessageRouter(config.SendToDestination, config.Logger.With("component", "router")),
	}

	return service
}

// Start initializes the resend service by loading configurations from database
func (s *ResendService) Start() error {
	if s.db == nil {
		s.logger.Warn("Database not available, resend service will operate without persistence")
		return nil
	}

	s.logger.Info("Starting resend service")

	// Load configurations from database into memory cache
	if err := s.configManager.LoadFromDatabase(s.db); err != nil {
		return fmt.Errorf("failed to load configurations from database: %w", err)
	}

	s.logger.Info("Resend service started successfully", "configs_loaded", s.configManager.GetConfigCount())
	return nil
}

// ProcessMessage processes an incoming CoT message and evaluates it against all active configurations
// This is the main entry point called by the event processing pipeline
func (s *ResendService) ProcessMessage(msg *cot.CotMessage) {
	if msg == nil {
		s.logger.Debug("Received nil message, skipping")
		return
	}

	// Skip local messages to avoid loops
	if msg.IsLocal() {
		s.logger.Debug("Skipping local message", "uid", msg.GetUID(), "type", msg.GetType())
		return
	}

	// Skip control messages (pings, etc.) to reduce noise
	if msg.IsControl() {
		s.logger.Debug("Skipping control message", "uid", msg.GetUID(), "type", msg.GetType())
		return
	}

	s.logger.Debug("Processing message for resend",
		"uid", msg.GetUID(),
		"type", msg.GetType(),
		"from", msg.From)

	// Get all active configurations
	configs := s.configManager.GetActiveConfigs()
	if len(configs) == 0 {
		s.logger.Debug("No active resend configurations found")
		return
	}

	// Evaluate message against each configuration
	matchedConfigs := 0
	for _, config := range configs {
		if s.filterEngine.EvaluateConfig(msg, config) {
			matchedConfigs++
			s.logger.Debug("Configuration matched message",
				"config", config.UID,
				"config_name", config.Name,
				"message_type", msg.GetType(),
				"message_uid", msg.GetUID())

			// Route the message to the configured destination
			if err := s.router.RouteMessage(msg, config); err != nil {
				s.logger.Error("Failed to route message",
					"error", err,
					"config", config.UID,
					"config_name", config.Name,
					"message_type", msg.GetType(),
					"message_uid", msg.GetUID())
			} else {
				s.logger.Info("Successfully resent message",
					"config", config.UID,
					"config_name", config.Name,
					"message_type", msg.GetType(),
					"message_uid", msg.GetUID(),
					"destination", config.Destination.IP)
			}
		}
	}

	if matchedConfigs == 0 {
		s.logger.Debug("No configurations matched message",
			"message_type", msg.GetType(),
			"message_uid", msg.GetUID(),
			"total_configs", len(configs))
	}
}

// RefreshConfigurations reloads configurations from the database
// This is called when configurations are updated via the API
func (s *ResendService) RefreshConfigurations() error {
	if s.db == nil {
		s.logger.Warn("Database not available, cannot refresh configurations")
		return fmt.Errorf("database not available")
	}

	s.logger.Info("Refreshing resend configurations")

	if err := s.configManager.LoadFromDatabase(s.db); err != nil {
		s.logger.Error("Failed to refresh configurations", "error", err)
		return fmt.Errorf("failed to refresh configurations: %w", err)
	}

	s.logger.Info("Configurations refreshed successfully", "configs_loaded", s.configManager.GetConfigCount())
	return nil
}

// GetActiveConfigurations returns all active configurations
func (s *ResendService) GetActiveConfigurations() []*ResendConfigDTO {
	return s.configManager.GetActiveConfigs()
}

// GetAllConfigurations returns all configurations regardless of enabled status
func (s *ResendService) GetAllConfigurations() []*ResendConfigDTO {
	return s.configManager.GetAllConfigs()
}

// GetConfiguration returns a specific configuration by UID
func (s *ResendService) GetConfiguration(uid string) (*ResendConfigDTO, bool) {
	return s.configManager.GetConfig(uid)
}

// UpdateConfiguration updates a configuration in the cache
// This should be called after updating the configuration in the database
func (s *ResendService) UpdateConfiguration(config *ResendConfigDTO) {
	if config == nil {
		s.logger.Warn("Attempted to update nil configuration")
		return
	}

	s.configManager.UpdateConfig(config)
	s.logger.Info("Configuration updated in cache", "uid", config.UID, "name", config.Name)
}

// DeleteConfiguration removes a configuration from the cache
// This should be called after deleting the configuration from the database
func (s *ResendService) DeleteConfiguration(uid string) {
	s.configManager.DeleteConfig(uid)
	s.logger.Info("Configuration deleted from cache", "uid", uid)
}

// ValidateConfiguration validates a configuration before saving
func (s *ResendService) ValidateConfiguration(config *ResendConfigDTO) error {
	if config == nil {
		return fmt.Errorf("configuration is nil")
	}

	if config.UID == "" {
		return fmt.Errorf("configuration UID is required")
	}

	if config.Name == "" {
		return fmt.Errorf("configuration name is required")
	}

	if config.Destination == nil {
		return fmt.Errorf("destination is required")
	}

	// Validate destination
	if err := s.router.ValidateDestination(config.Destination); err != nil {
		return fmt.Errorf("invalid destination: %w", err)
	}

	// Validate source if provided
	if config.Source != nil {
		if err := s.router.ValidateDestination(config.Source); err != nil {
			return fmt.Errorf("invalid source: %w", err)
		}
	}

	// Validate filters and predicates
	for i, filter := range config.Filters {
		for j, predicate := range filter.Predicates {
			if err := s.filterEngine.ValidatePredicate(predicate); err != nil {
				return fmt.Errorf("invalid predicate in filter %d, predicate %d: %w", i, j, err)
			}
		}
	}

	return nil
}

// Stop gracefully stops the resend service
func (s *ResendService) Stop() {
	s.logger.Info("Stopping resend service")
	// Currently no cleanup needed, but this method is provided for future use
}
