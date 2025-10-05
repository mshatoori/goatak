package resend

import (
	"fmt"
	"log/slog"

	"github.com/kdudkov/goatak/internal/repository"
	"github.com/kdudkov/goatak/pkg/cot"
)

// FilterEngine evaluates message filters
type FilterEngine struct {
	logger *slog.Logger
	items  repository.ItemsRepository
}

// NewFilterEngine creates a new FilterEngine
func NewFilterEngine(logger *slog.Logger, items repository.ItemsRepository) *FilterEngine {
	return &FilterEngine{
		logger: logger,
		items:  items,
	}
}

// EvaluateConfig checks if a message matches any filter in the configuration
// Uses OR logic: if any filter matches, the config matches
func (f *FilterEngine) EvaluateConfig(msg *cot.CotMessage, config *ResendConfigDTO) bool {
	if msg == nil || config == nil {
		return false
	}

	if !config.Enabled {
		return false
	}

	// If no filters are defined, match all messages
	if len(config.Filters) == 0 {
		f.logger.Debug("No filters defined, matching all messages", "config", config.UID)
		return true
	}

	// OR logic: any filter matches means resend
	for _, filter := range config.Filters {
		if f.EvaluateFilter(msg, filter) {
			f.logger.Debug("Filter matched", "config", config.UID, "filter", filter.ID)
			return true
		}
	}

	f.logger.Debug("No filters matched", "config", config.UID, "message_type", msg.GetType())
	return false
}

// EvaluateFilter checks if a message matches all predicates in a filter
// Uses AND logic: all predicates must match
func (f *FilterEngine) EvaluateFilter(msg *cot.CotMessage, filter FilterDTO) bool {
	if msg == nil {
		return false
	}

	// If no predicates are defined, match all messages
	if len(filter.Predicates) == 0 {
		f.logger.Debug("No predicates defined in filter, matching all messages", "filter", filter.ID)
		return true
	}

	// AND logic: all predicates must match
	for _, predicate := range filter.Predicates {
		if !f.EvaluatePredicate(msg, predicate) {
			f.logger.Debug("Predicate failed", "filter", filter.ID, "predicate", predicate.Type, "value", predicate.Value)
			return false
		}
	}

	f.logger.Debug("All predicates matched", "filter", filter.ID)
	return true
}

// EvaluatePredicate checks if a message matches a specific predicate
func (f *FilterEngine) EvaluatePredicate(msg *cot.CotMessage, predicate PredicateDTO) bool {
	if msg == nil {
		return false
	}

	// Create the appropriate predicate instance based on type and evaluate
	switch predicate.Type {
	case "item_type":
		p := &ItemTypePredicate{ItemType: predicate.Value}
		return p.Evaluate(msg)
	case "side":
		p := &SidePredicate{Side: predicate.Value}
		return p.Evaluate(msg)
	case "unit_type":
		p := &UnitTypePredicate{UnitType: predicate.Value}
		return p.Evaluate(msg)
	case "location_boundary":
		p := &LocationBoundaryPredicate{PolygonID: predicate.Value, items: f.items}
		return p.Evaluate(msg)
	default:
		f.logger.Warn("Unknown predicate type", "type", predicate.Type, "value", predicate.Value)
		return false
	}
}

// ConvertDTOToResendConfig converts a ResendConfigDTO to ResendConfig for use with existing interfaces
func (f *FilterEngine) ConvertDTOToResendConfig(dto *ResendConfigDTO) *ResendConfig {
	if dto == nil {
		return nil
	}

	config := &ResendConfig{
		UID:     dto.UID,
		Logger:  f.logger.With("config", dto.UID),
		Filters: make([]Filter, 0, len(dto.Filters)),
	}

	// Convert source
	if dto.Source != nil {
		config.Source = f.convertDTOToNetworkAddress(dto.Source)
	}

	// Convert destination
	if dto.Destination != nil {
		config.Destination = f.convertDTOToNetworkAddress(dto.Destination)
	}

	// Convert filters
	for _, filterDTO := range dto.Filters {
		filter := f.convertDTOToFilter(filterDTO)
		if filter != nil {
			config.Filters = append(config.Filters, filter)
		}
	}

	return config
}

// convertDTOToNetworkAddress converts NetworkAddressDTO to NetworkAddress
func (f *FilterEngine) convertDTOToNetworkAddress(dto *NetworkAddressDTO) NetworkAddress {
	if dto == nil {
		return nil
	}

	switch dto.Type {
	case "node":
		return &NodeNetworkAddress{
			IP:  dto.IP,
			URN: dto.URN,
		}
	case "subnet":
		return &SubnetNetworkAddress{
			SubnetIP: dto.IP,
		}
	default:
		f.logger.Warn("Unknown network address type", "type", dto.Type)
		return nil
	}
}

// convertDTOToFilter converts FilterDTO to Filter
func (f *FilterEngine) convertDTOToFilter(dto FilterDTO) Filter {
	filter := &ResendFilter{
		Predicates: make([]Predicate, 0, len(dto.Predicates)),
	}

	for _, predicateDTO := range dto.Predicates {
		predicate := f.convertDTOToPredicate(predicateDTO)
		if predicate != nil {
			filter.Predicates = append(filter.Predicates, predicate)
		}
	}

	return filter
}

// convertDTOToPredicate converts PredicateDTO to Predicate
func (f *FilterEngine) convertDTOToPredicate(dto PredicateDTO) Predicate {
	switch dto.Type {
	case "item_type":
		return &ItemTypePredicate{ItemType: dto.Value}
	case "side":
		return &SidePredicate{Side: dto.Value}
	case "unit_type":
		return &UnitTypePredicate{UnitType: dto.Value}
	case "location_boundary":
		return &LocationBoundaryPredicate{PolygonID: dto.Value, items: f.items}
	default:
		f.logger.Warn("Unknown predicate type", "type", dto.Type)
		return nil
	}
}

// ValidatePredicate validates a predicate DTO
func (f *FilterEngine) ValidatePredicate(predicate PredicateDTO) error {
	switch predicate.Type {
	case "item_type":
		validValues := []string{"unit", "drawing", "contact", "alert"}
		for _, valid := range validValues {
			if predicate.Value == valid {
				return nil
			}
		}
		return fmt.Errorf("invalid item_type value: %s, must be one of: %v", predicate.Value, validValues)
	case "side":
		validValues := []string{"friendly", "hostile", "neutral", "unknown"}
		for _, valid := range validValues {
			if predicate.Value == valid {
				return nil
			}
		}
		return fmt.Errorf("invalid side value: %s, must be one of: %v", predicate.Value, validValues)
	case "unit_type":
		validValues := []string{"air", "ground", "sea", "space"}
		for _, valid := range validValues {
			if predicate.Value == valid {
				return nil
			}
		}
		return fmt.Errorf("invalid unit_type value: %s, must be one of: %v", predicate.Value, validValues)
	case "location_boundary":
		if predicate.Value == "" {
			return fmt.Errorf("location_boundary value cannot be empty")
		}
		return nil
	default:
		return fmt.Errorf("unknown predicate type: %s", predicate.Type)
	}
}
