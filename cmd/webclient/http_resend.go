package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"time"

	"github.com/aofei/air"
	"github.com/google/uuid"
	"github.com/kdudkov/goatak/internal/resend"
)

// Use the DTOs from the internal resend package
type ResendConfigDTO = resend.ResendConfigDTO
type NetworkAddressDTO = resend.NetworkAddressDTO
type FilterDTO = resend.FilterDTO
type PredicateDTO = resend.PredicateDTO

// getResendConfigsHandler handles GET /api/resend/configs - Get all resend configurations
func getResendConfigsHandler(app *App) air.Handler {
	return func(req *air.Request, res *air.Response) error {
		setCORSHeaders(res)

		if app.DB == nil {
			res.Status = 503
			return res.WriteJSON(map[string]any{
				"success": false,
				"error":   "Database not available",
			})
		}

		if app.resendService == nil {
			res.Status = 503
			return res.WriteJSON(map[string]any{
				"success": false,
				"error":   "Resend service not available",
			})
		}

		configs := app.resendService.GetAllConfigurations()

		return res.WriteJSON(map[string]any{
			"success": true,
			"data":    configs,
		})
	}
}

// getResendConfigHandler handles GET /api/resend/configs/:uid - Get specific resend configuration
func getResendConfigHandler(app *App) air.Handler {
	return func(req *air.Request, res *air.Response) error {
		setCORSHeaders(res)

		uid := getStringParam(req, "uid")
		if uid == "" {
			res.Status = 400
			return res.WriteJSON(map[string]any{
				"success": false,
				"error":   "Missing uid parameter",
			})
		}

		if app.DB == nil {
			res.Status = 503
			return res.WriteJSON(map[string]any{
				"success": false,
				"error":   "Database not available",
			})
		}

		if app.resendService == nil {
			res.Status = 503
			return res.WriteJSON(map[string]any{
				"success": false,
				"error":   "Resend service not available",
			})
		}

		config, exists := app.resendService.GetConfiguration(uid)
		if !exists {
			res.Status = 404
			return res.WriteJSON(map[string]any{
				"success": false,
				"error":   "Resend config not found",
			})
		}

		return res.WriteJSON(map[string]any{
			"success": true,
			"data":    config,
		})
	}
}

// createResendConfigHandler handles POST /api/resend/configs - Create new resend configuration
func createResendConfigHandler(app *App) air.Handler {
	return func(req *air.Request, res *air.Response) error {
		setCORSHeaders(res)

		if req.Body == nil {
			res.Status = 400
			return res.WriteJSON(map[string]any{
				"success": false,
				"error":   "Missing request body",
			})
		}

		var configDTO ResendConfigDTO
		if err := json.NewDecoder(req.Body).Decode(&configDTO); err != nil {
			res.Status = 400
			return res.WriteJSON(map[string]any{
				"success": false,
				"error":   fmt.Sprintf("Invalid JSON: %v", err),
			})
		}

		// Validate required fields
		if configDTO.Name == "" {
			res.Status = 400
			return res.WriteJSON(map[string]any{
				"success": false,
				"error":   "Name is required",
			})
		}

		if configDTO.Destination == nil {
			res.Status = 400
			return res.WriteJSON(map[string]any{
				"success": false,
				"error":   "Destination is required",
			})
		}

		// Generate UID if not provided
		if configDTO.UID == "" {
			configDTO.UID = uuid.NewString()
		}

		// Set timestamps
		now := time.Now()
		configDTO.CreatedAt = now
		configDTO.UpdatedAt = now

		if app.DB == nil {
			res.Status = 503
			return res.WriteJSON(map[string]any{
				"success": false,
				"error":   "Database not available",
			})
		}

		err := saveResendConfigToDatabase(app.DB, &configDTO)
		if err != nil {
			res.Status = 500
			return res.WriteJSON(map[string]any{
				"success": false,
				"error":   fmt.Sprintf("Failed to save resend config: %v", err),
			})
		}

		app.logger.Info("Resend config created", "uid", configDTO.UID, "name", configDTO.Name)

		// Update resend service cache
		if app.resendService != nil {
			app.resendService.UpdateConfiguration(&configDTO)
		}

		return res.WriteJSON(map[string]any{
			"success": true,
			"data":    configDTO,
		})
	}
}

// updateResendConfigHandler handles PUT /api/resend/configs/:uid - Update resend configuration
func updateResendConfigHandler(app *App) air.Handler {
	return func(req *air.Request, res *air.Response) error {
		setCORSHeaders(res)

		uid := getStringParam(req, "uid")
		if uid == "" {
			res.Status = 400
			return res.WriteJSON(map[string]any{
				"success": false,
				"error":   "Missing uid parameter",
			})
		}

		if req.Body == nil {
			res.Status = 400
			return res.WriteJSON(map[string]any{
				"success": false,
				"error":   "Missing request body",
			})
		}

		var configDTO ResendConfigDTO
		if err := json.NewDecoder(req.Body).Decode(&configDTO); err != nil {
			res.Status = 400
			return res.WriteJSON(map[string]any{
				"success": false,
				"error":   fmt.Sprintf("Invalid JSON: %v", err),
			})
		}

		// Validate required fields
		if configDTO.Name == "" {
			res.Status = 400
			return res.WriteJSON(map[string]any{
				"success": false,
				"error":   "Name is required",
			})
		}

		if configDTO.Destination == nil {
			res.Status = 400
			return res.WriteJSON(map[string]any{
				"success": false,
				"error":   "Destination is required",
			})
		}

		// Ensure UID matches the URL parameter
		configDTO.UID = uid
		configDTO.UpdatedAt = time.Now()

		if app.DB == nil {
			res.Status = 503
			return res.WriteJSON(map[string]any{
				"success": false,
				"error":   "Database not available",
			})
		}

		// Check if config exists
		if app.resendService != nil {
			_, exists := app.resendService.GetConfiguration(uid)
			if !exists {
				res.Status = 404
				return res.WriteJSON(map[string]any{
					"success": false,
					"error":   "Resend config not found",
				})
			}
		}

		err := updateResendConfigInDatabase(app.DB, &configDTO)
		if err != nil {
			res.Status = 500
			return res.WriteJSON(map[string]any{
				"success": false,
				"error":   fmt.Sprintf("Failed to update resend config: %v", err),
			})
		}

		app.logger.Info("Resend config updated", "uid", configDTO.UID, "name", configDTO.Name)

		// Update resend service cache
		if app.resendService != nil {
			app.resendService.UpdateConfiguration(&configDTO)
		}

		return res.WriteJSON(map[string]any{
			"success": true,
			"data":    configDTO,
		})
	}
}

// deleteResendConfigHandler handles DELETE /api/resend/configs/:uid - Delete resend configuration
func deleteResendConfigHandler(app *App) air.Handler {
	return func(req *air.Request, res *air.Response) error {
		setCORSHeaders(res)

		uid := getStringParam(req, "uid")
		if uid == "" {
			res.Status = 400
			return res.WriteJSON(map[string]any{
				"success": false,
				"error":   "Missing uid parameter",
			})
		}

		if app.DB == nil {
			res.Status = 503
			return res.WriteJSON(map[string]any{
				"success": false,
				"error":   "Database not available",
			})
		}

		// Check if config exists
		var config *ResendConfigDTO
		if app.resendService != nil {
			var exists bool
			config, exists = app.resendService.GetConfiguration(uid)
			if !exists {
				res.Status = 404
				return res.WriteJSON(map[string]any{
					"success": false,
					"error":   "Resend config not found",
				})
			}
		} else {
			res.Status = 503
			return res.WriteJSON(map[string]any{
				"success": false,
				"error":   "Resend service not available",
			})
		}

		err := deleteResendConfigFromDatabase(app.DB, uid)
		if err != nil {
			res.Status = 500
			return res.WriteJSON(map[string]any{
				"success": false,
				"error":   fmt.Sprintf("Failed to delete resend config: %v", err),
			})
		}

		app.logger.Info("Resend config deleted", "uid", uid, "name", config.Name)

		// Remove from resend service cache
		if app.resendService != nil {
			app.resendService.DeleteConfiguration(uid)
		}

		return res.WriteJSON(map[string]any{
			"success": true,
			"message": "Resend config deleted successfully",
		})
	}
}

// Database operations

// createResendTables creates the necessary tables for resend configurations
func createResendTables(db *sql.DB) error {
	// Create resend_configs table
	createConfigsTableSQL := `CREATE TABLE IF NOT EXISTS resend_configs (
		uid TEXT PRIMARY KEY,
		name TEXT NOT NULL,
		enabled BOOLEAN DEFAULT TRUE,
		source_type TEXT,
		source_ip TEXT,
		source_urn INTEGER,
		source_subnet_mask TEXT,
		destination_type TEXT NOT NULL,
		destination_ip TEXT NOT NULL,
		destination_urn INTEGER,
		destination_subnet_mask TEXT,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);`

	if _, err := db.Exec(createConfigsTableSQL); err != nil {
		return fmt.Errorf("failed to create resend_configs table: %w", err)
	}

	// Create resend_filters table
	createFiltersTableSQL := `CREATE TABLE IF NOT EXISTS resend_filters (
		id TEXT PRIMARY KEY,
		config_uid TEXT NOT NULL,
		FOREIGN KEY (config_uid) REFERENCES resend_configs(uid) ON DELETE CASCADE
	);`

	if _, err := db.Exec(createFiltersTableSQL); err != nil {
		return fmt.Errorf("failed to create resend_filters table: %w", err)
	}

	// Create resend_predicates table
	createPredicatesTableSQL := `CREATE TABLE IF NOT EXISTS resend_predicates (
		id TEXT PRIMARY KEY,
		filter_id TEXT NOT NULL,
		type TEXT NOT NULL,
		value TEXT NOT NULL,
		FOREIGN KEY (filter_id) REFERENCES resend_filters(id) ON DELETE CASCADE
	);`

	if _, err := db.Exec(createPredicatesTableSQL); err != nil {
		return fmt.Errorf("failed to create resend_predicates table: %w", err)
	}

	return nil
}

// saveResendConfigToDatabase saves a resend configuration to the database
func saveResendConfigToDatabase(db *sql.DB, config *ResendConfigDTO) error {
	tx, err := db.Begin()
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback()

	// Insert main config
	insertConfigSQL := `INSERT INTO resend_configs 
		(uid, name, enabled, source_type, source_ip, source_urn, source_subnet_mask,
		 destination_type, destination_ip, destination_urn, destination_subnet_mask, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`

	var sourceType, sourceIP, sourceSubnetMask sql.NullString
	var sourceURN sql.NullInt32
	if config.Source != nil {
		sourceType = sql.NullString{String: config.Source.Type, Valid: true}
		sourceIP = sql.NullString{String: config.Source.IP, Valid: true}
		sourceURN = sql.NullInt32{Int32: config.Source.URN, Valid: config.Source.URN != 0}
		sourceSubnetMask = sql.NullString{String: config.Source.SubnetMask, Valid: config.Source.SubnetMask != ""}
	}

	var destURN sql.NullInt32
	var destSubnetMask sql.NullString
	if config.Destination.URN != 0 {
		destURN = sql.NullInt32{Int32: config.Destination.URN, Valid: true}
	}
	if config.Destination.SubnetMask != "" {
		destSubnetMask = sql.NullString{String: config.Destination.SubnetMask, Valid: true}
	}

	_, err = tx.Exec(insertConfigSQL, config.UID, config.Name, config.Enabled,
		sourceType, sourceIP, sourceURN, sourceSubnetMask,
		config.Destination.Type, config.Destination.IP, destURN, destSubnetMask,
		config.CreatedAt, config.UpdatedAt)
	if err != nil {
		return fmt.Errorf("failed to insert resend config: %w", err)
	}

	// Insert filters and predicates
	for _, filter := range config.Filters {
		if filter.ID == "" {
			filter.ID = uuid.NewString()
		}

		_, err = tx.Exec("INSERT INTO resend_filters (id, config_uid) VALUES (?, ?)", filter.ID, config.UID)
		if err != nil {
			return fmt.Errorf("failed to insert filter: %w", err)
		}

		for _, predicate := range filter.Predicates {
			if predicate.ID == "" {
				predicate.ID = uuid.NewString()
			}

			_, err = tx.Exec("INSERT INTO resend_predicates (id, filter_id, type, value) VALUES (?, ?, ?, ?)",
				predicate.ID, filter.ID, predicate.Type, predicate.Value)
			if err != nil {
				return fmt.Errorf("failed to insert predicate: %w", err)
			}
		}
	}

	return tx.Commit()
}

// loadResendConfigsFromDatabase loads all resend configurations from the database
func loadResendConfigsFromDatabase(db *sql.DB) ([]ResendConfigDTO, error) {
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

		// Initialize destination to avoid nil pointer dereference
		config.Destination = &NetworkAddressDTO{}

		err := rows.Scan(&config.UID, &config.Name, &config.Enabled,
			&sourceType, &sourceIP, &sourceURN, &sourceSubnetMask,
			&destType, &destIP, &destURN, &destSubnetMask,
			&config.CreatedAt, &config.UpdatedAt)
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
		filters, err := loadFiltersForConfig(db, config.UID)
		if err != nil {
			return nil, fmt.Errorf("failed to load filters for config %s: %w", config.UID, err)
		}
		config.Filters = filters

		configs = append(configs, config)
	}

	return configs, nil
}

// loadResendConfigFromDatabase loads a specific resend configuration from the database
func loadResendConfigFromDatabase(db *sql.DB, uid string) (*ResendConfigDTO, error) {
	var config ResendConfigDTO
	var sourceType, sourceIP, sourceSubnetMask sql.NullString
	var sourceURN sql.NullInt32
	var destURN sql.NullInt32
	var destSubnetMask sql.NullString
	var destType, destIP string

	// Initialize destination to avoid nil pointer dereference
	config.Destination = &NetworkAddressDTO{}

	row := db.QueryRow(`SELECT uid, name, enabled, source_type, source_ip, source_urn, source_subnet_mask,
		destination_type, destination_ip, destination_urn, destination_subnet_mask, created_at, updated_at
		FROM resend_configs WHERE uid = ?`, uid)

	err := row.Scan(&config.UID, &config.Name, &config.Enabled,
		&sourceType, &sourceIP, &sourceURN, &sourceSubnetMask,
		&destType, &destIP, &destURN, &destSubnetMask,
		&config.CreatedAt, &config.UpdatedAt)
	if err != nil {
		return nil, err
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
	filters, err := loadFiltersForConfig(db, config.UID)
	if err != nil {
		return nil, fmt.Errorf("failed to load filters for config %s: %w", config.UID, err)
	}
	config.Filters = filters

	return &config, nil
}

// loadFiltersForConfig loads filters and predicates for a specific config
func loadFiltersForConfig(db *sql.DB, configUID string) ([]FilterDTO, error) {
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
		predicates, err := loadPredicatesForFilter(db, filter.ID)
		if err != nil {
			return nil, fmt.Errorf("failed to load predicates for filter %s: %w", filter.ID, err)
		}
		filter.Predicates = predicates

		filters = append(filters, filter)
	}

	return filters, nil
}

// loadPredicatesForFilter loads predicates for a specific filter
func loadPredicatesForFilter(db *sql.DB, filterID string) ([]PredicateDTO, error) {
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

// updateResendConfigInDatabase updates a resend configuration in the database
func updateResendConfigInDatabase(db *sql.DB, config *ResendConfigDTO) error {
	tx, err := db.Begin()
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback()

	// Update main config
	updateConfigSQL := `UPDATE resend_configs SET 
		name = ?, enabled = ?, source_type = ?, source_ip = ?, source_urn = ?, source_subnet_mask = ?,
		destination_type = ?, destination_ip = ?, destination_urn = ?, destination_subnet_mask = ?, updated_at = ?
		WHERE uid = ?`

	var sourceType, sourceIP, sourceSubnetMask sql.NullString
	var sourceURN sql.NullInt32
	if config.Source != nil {
		sourceType = sql.NullString{String: config.Source.Type, Valid: true}
		sourceIP = sql.NullString{String: config.Source.IP, Valid: true}
		sourceURN = sql.NullInt32{Int32: config.Source.URN, Valid: config.Source.URN != 0}
		sourceSubnetMask = sql.NullString{String: config.Source.SubnetMask, Valid: config.Source.SubnetMask != ""}
	}

	var destURN sql.NullInt32
	var destSubnetMask sql.NullString
	if config.Destination.URN != 0 {
		destURN = sql.NullInt32{Int32: config.Destination.URN, Valid: true}
	}
	if config.Destination.SubnetMask != "" {
		destSubnetMask = sql.NullString{String: config.Destination.SubnetMask, Valid: true}
	}

	_, err = tx.Exec(updateConfigSQL, config.Name, config.Enabled,
		sourceType, sourceIP, sourceURN, sourceSubnetMask,
		config.Destination.Type, config.Destination.IP, destURN, destSubnetMask,
		config.UpdatedAt, config.UID)
	if err != nil {
		return fmt.Errorf("failed to update resend config: %w", err)
	}

	// Delete existing filters and predicates
	_, err = tx.Exec("DELETE FROM resend_predicates WHERE filter_id IN (SELECT id FROM resend_filters WHERE config_uid = ?)", config.UID)
	if err != nil {
		return fmt.Errorf("failed to delete predicates: %w", err)
	}

	_, err = tx.Exec("DELETE FROM resend_filters WHERE config_uid = ?", config.UID)
	if err != nil {
		return fmt.Errorf("failed to delete filters: %w", err)
	}

	// Insert new filters and predicates
	for _, filter := range config.Filters {
		if filter.ID == "" {
			filter.ID = uuid.NewString()
		}

		_, err = tx.Exec("INSERT INTO resend_filters (id, config_uid) VALUES (?, ?)", filter.ID, config.UID)
		if err != nil {
			return fmt.Errorf("failed to insert filter: %w", err)
		}

		for _, predicate := range filter.Predicates {
			if predicate.ID == "" {
				predicate.ID = uuid.NewString()
			}

			_, err = tx.Exec("INSERT INTO resend_predicates (id, filter_id, type, value) VALUES (?, ?, ?, ?)",
				predicate.ID, filter.ID, predicate.Type, predicate.Value)
			if err != nil {
				return fmt.Errorf("failed to insert predicate: %w", err)
			}
		}
	}

	return tx.Commit()
}

// deleteResendConfigFromDatabase deletes a resend configuration from the database
func deleteResendConfigFromDatabase(db *sql.DB, uid string) error {
	tx, err := db.Begin()
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback()

	// Delete predicates first (foreign key constraint)
	_, err = tx.Exec("DELETE FROM resend_predicates WHERE filter_id IN (SELECT id FROM resend_filters WHERE config_uid = ?)", uid)
	if err != nil {
		return fmt.Errorf("failed to delete predicates: %w", err)
	}

	// Delete filters
	_, err = tx.Exec("DELETE FROM resend_filters WHERE config_uid = ?", uid)
	if err != nil {
		return fmt.Errorf("failed to delete filters: %w", err)
	}

	// Delete config
	_, err = tx.Exec("DELETE FROM resend_configs WHERE uid = ?", uid)
	if err != nil {
		return fmt.Errorf("failed to delete config: %w", err)
	}

	return tx.Commit()
}
