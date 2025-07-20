package main

import (
	"encoding/json"
	"fmt"

	imodel "github.com/kdudkov/goatak/internal/model"

	"github.com/aofei/air"
)

// getTrackingTrailsHandler handles GET /api/tracking/trails - Get all active trails
func getTrackingTrailsHandler(app *App) air.Handler {
	return func(req *air.Request, res *air.Response) error {
		if app.trackingService == nil {
			res.Status = 503
			return res.WriteJSON(map[string]any{
				"success": false,
				"error":   "Tracking service not available",
			})
		}

		trails, err := app.trackingService.GetAllTrails()
		if err != nil {
			res.Status = 500
			return res.WriteJSON(map[string]any{
				"success": false,
				"error":   fmt.Sprintf("Failed to get trails: %v", err),
			})
		}

		return res.WriteJSON(map[string]any{
			"success": true,
			"data":    trails,
		})
	}
}

// getTrackingTrailHandler handles GET /api/tracking/trail/:uid - Get trail for specific unit
func getTrackingTrailHandler(app *App) air.Handler {
	return func(req *air.Request, res *air.Response) error {
		if app.trackingService == nil {
			res.Status = 503
			return res.WriteJSON(map[string]any{
				"success": false,
				"error":   "Tracking service not available",
			})
		}

		uid := getStringParam(req, "uid")
		if uid == "" {
			res.Status = 400
			return res.WriteJSON(map[string]any{
				"success": false,
				"error":   "Missing uid parameter",
			})
		}

		// Get trail length from config or use default
		config, err := app.trackingService.GetConfig(uid)
		if err != nil {
			app.logger.Error("failed to get tracking config", "error", err, "uid", uid)
			// Use default trail length if config retrieval fails
			config.TrailLength = 50
		}

		positions, err := app.trackingService.GetTrail(uid, config.TrailLength)
		if err != nil {
			res.Status = 500
			return res.WriteJSON(map[string]any{
				"success": false,
				"error":   fmt.Sprintf("Failed to get trail: %v", err),
			})
		}

		// Get callsign from items repository if available
		callsign := ""
		if item := app.items.Get(uid); item != nil {
			callsign = item.GetCallsign()
		}

		trail := map[string]any{
			"unit_uid":  uid,
			"callsign":  callsign,
			"positions": positions,
			"config":    config,
		}

		return res.WriteJSON(map[string]any{
			"success": true,
			"data":    trail,
		})
	}
}

// updateTrackingConfigHandler handles POST /api/tracking/config/:uid - Update tracking configuration
func updateTrackingConfigHandler(app *App) air.Handler {
	return func(req *air.Request, res *air.Response) error {
		if app.trackingService == nil {
			res.Status = 503
			return res.WriteJSON(map[string]any{
				"success": false,
				"error":   "Tracking service not available",
			})
		}

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

		var config imodel.TrackingConfig
		if err := json.NewDecoder(req.Body).Decode(&config); err != nil {
			res.Status = 400
			return res.WriteJSON(map[string]any{
				"success": false,
				"error":   fmt.Sprintf("Invalid JSON: %v", err),
			})
		}

		// Validate configuration values
		if config.TrailLength < 1 || config.TrailLength > 1000 {
			res.Status = 400
			return res.WriteJSON(map[string]any{
				"success": false,
				"error":   "Trail length must be between 1 and 1000",
			})
		}

		if config.UpdateInterval < 1 || config.UpdateInterval > 3600 {
			res.Status = 400
			return res.WriteJSON(map[string]any{
				"success": false,
				"error":   "Update interval must be between 1 and 3600 seconds",
			})
		}

		if config.TrailWidth < 1 || config.TrailWidth > 10 {
			res.Status = 400
			return res.WriteJSON(map[string]any{
				"success": false,
				"error":   "Trail width must be between 1 and 10",
			})
		}

		// Set default color if not provided
		if config.TrailColor == "" {
			config.TrailColor = "#FF0000"
		}

		err := app.trackingService.UpdateConfig(uid, config)
		if err != nil {
			res.Status = 500
			return res.WriteJSON(map[string]any{
				"success": false,
				"error":   fmt.Sprintf("Failed to update config: %v", err),
			})
		}

		// Return the updated config
		updatedConfig, err := app.trackingService.GetConfig(uid)
		if err != nil {
			app.logger.Error("failed to get updated config", "error", err, "uid", uid)
			// Return success anyway since the update succeeded
			return res.WriteJSON(map[string]any{
				"success": true,
				"message": "Configuration updated successfully",
			})
		}

		return res.WriteJSON(map[string]any{
			"success": true,
			"data":    updatedConfig,
		})
	}
}
