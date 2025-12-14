package main

import (
	"net/http"
	"strings"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// TestHTTPTrackingEndpoints tests all HTTP endpoints in http_tracking.go
func TestHTTPTrackingEndpoints(t *testing.T) {
	testApp := CreateTestApp(t)
	defer testApp.CleanupTestApp(t)

	// Set up HTTP request helper with valid auth token
	httpHelper := NewHTTPRequestHelper(testApp.HTTPTestServer.URL)
	validToken := "valid-test-token"
	httpHelper.SetAuthToken(validToken)

	// Test data factory
	factory := NewTestDataFactory()

	t.Run("GET /api/tracking/trails - Success", func(t *testing.T) {
		// Add some tracking data first
		unitUID := "test-unit-" + CreateTestUID()
		err := testApp.TrackingSvc.AddPosition(unitUID, 40.7128, -74.0060, 100.0, 10.0, 90.0)
		require.NoError(t, err)

		// Add another position
		time.Sleep(10 * time.Millisecond)
		err = testApp.TrackingSvc.AddPosition(unitUID, 40.7130, -74.0058, 105.0, 12.0, 95.0)
		require.NoError(t, err)

		resp := httpHelper.MakeRequest(t, "GET", "/api/tracking/trails", nil)
		defer resp.Body.Close()

		AssertResponseStatus(t, resp, http.StatusOK)
		AssertCORSHeaders(t, resp)

		var result map[string]interface{}
		AssertResponseJSON(t, resp, &result)

		// Verify response structure
		assert.Equal(t, true, result["success"])
		assert.Contains(t, result, "data")

		data := result["data"].([]interface{})
		assert.NotEmpty(t, data, "Should have at least one trail")

		// Verify trail structure
		if len(data) > 0 {
			trail := data[0].(map[string]interface{})
			assert.Contains(t, trail, "unit_uid")
			assert.Contains(t, trail, "positions")
			assert.Contains(t, trail, "config")
		}
	})

	t.Run("GET /api/tracking/trails - Service Unavailable", func(t *testing.T) {
		// Temporarily disable tracking service
		originalService := testApp.App.trackingService
		testApp.App.trackingService = nil

		resp := httpHelper.MakeRequest(t, "GET", "/api/tracking/trails", nil)
		defer resp.Body.Close()

		// Restore service
		testApp.App.trackingService = originalService

		AssertResponseStatus(t, resp, http.StatusServiceUnavailable)
		var result map[string]interface{}
		AssertResponseJSON(t, resp, &result)

		assert.Equal(t, false, result["success"])
		assert.Contains(t, result, "error")
		assert.Contains(t, result["error"], "Tracking service not available")
	})

	t.Run("GET /api/tracking/trail/:uid - Success", func(t *testing.T) {
		// Add tracking data for specific unit
		unitUID := "test-unit-" + CreateTestUID()
		err := testApp.TrackingSvc.AddPosition(unitUID, 40.7128, -74.0060, 100.0, 10.0, 90.0)
		require.NoError(t, err)

		resp := httpHelper.MakeRequest(t, "GET", "/api/tracking/trail/"+unitUID, nil)
		defer resp.Body.Close()

		AssertResponseStatus(t, resp, http.StatusOK)
		AssertCORSHeaders(t, resp)

		var result map[string]interface{}
		AssertResponseJSON(t, resp, &result)

		// Verify response structure
		assert.Equal(t, true, result["success"])
		assert.Contains(t, result, "data")

		data := result["data"].(map[string]interface{})
		assert.Contains(t, data, "unit_uid")
		assert.Contains(t, data, "callsign")
		assert.Contains(t, data, "positions")
		assert.Contains(t, data, "config")

		// Verify values
		assert.Equal(t, unitUID, data["unit_uid"])
		positions := data["positions"].([]interface{})
		assert.NotEmpty(t, positions, "Should have at least one position")

		if len(positions) > 0 {
			pos := positions[0].(map[string]interface{})
			assert.Contains(t, pos, "latitude")
			assert.Contains(t, pos, "longitude")
			assert.Contains(t, pos, "timestamp")
		}
	})

	t.Run("GET /api/tracking/trail/:uid - Missing UID", func(t *testing.T) {
		resp := httpHelper.MakeRequest(t, "GET", "/api/tracking/trail/", nil)
		defer resp.Body.Close()

		AssertResponseStatus(t, resp, http.StatusBadRequest)
		var result map[string]interface{}
		AssertResponseJSON(t, resp, &result)

		assert.Equal(t, false, result["success"])
		assert.Contains(t, result, "error")
		assert.Contains(t, result["error"], "Missing uid parameter")
	})

	t.Run("GET /api/tracking/trail/:uid - Service Unavailable", func(t *testing.T) {
		// Temporarily disable tracking service
		originalService := testApp.App.trackingService
		testApp.App.trackingService = nil

		resp := httpHelper.MakeRequest(t, "GET", "/api/tracking/trail/test-unit", nil)
		defer resp.Body.Close()

		// Restore service
		testApp.App.trackingService = originalService

		AssertResponseStatus(t, resp, http.StatusServiceUnavailable)
		var result map[string]interface{}
		AssertResponseJSON(t, resp, &result)

		assert.Equal(t, false, result["success"])
		assert.Contains(t, result, "error")
		assert.Contains(t, result["error"], "Tracking service not available")
	})

	t.Run("GET /api/tracking/trail/:uid - Non-existent Unit", func(t *testing.T) {
		nonExistentUID := "non-existent-unit-" + CreateTestUID()

		resp := httpHelper.MakeRequest(t, "GET", "/api/tracking/trail/"+nonExistentUID, nil)
		defer resp.Body.Close()

		// Should return empty trail, not error
		AssertResponseStatus(t, resp, http.StatusOK)
		var result map[string]interface{}
		AssertResponseJSON(t, resp, &result)

		assert.Equal(t, true, result["success"])
		data := result["data"].(map[string]interface{})
		assert.Equal(t, nonExistentUID, data["unit_uid"])
		positions := data["positions"].([]interface{})
		assert.Empty(t, positions, "Should have no positions for non-existent unit")
	})

	t.Run("POST /api/tracking/config/:uid - Success", func(t *testing.T) {
		unitUID := "test-unit-" + CreateTestUID()
		config := factory.CreateTrackingConfig()
		config.UnitUID = unitUID

		resp := httpHelper.MakeRequest(t, "POST", "/api/tracking/config/"+unitUID, config)
		defer resp.Body.Close()

		AssertResponseStatus(t, resp, http.StatusOK)
		AssertCORSHeaders(t, resp)

		var result map[string]interface{}
		AssertResponseJSON(t, resp, &result)

		assert.Equal(t, true, result["success"])
		assert.Contains(t, result, "data")

		// Verify the config was updated
		updatedConfig := result["data"].(map[string]interface{})
		assert.Equal(t, unitUID, updatedConfig["unit_uid"])
		assert.Equal(t, config.Enabled, updatedConfig["enabled"])
		assert.Equal(t, config.TrailLength, int(updatedConfig["trail_length"].(float64)))
		assert.Equal(t, config.UpdateInterval, int(updatedConfig["update_interval"].(float64)))
		assert.Equal(t, config.TrailColor, updatedConfig["trail_color"])
		assert.Equal(t, config.TrailWidth, int(updatedConfig["trail_width"].(float64)))
	})

	t.Run("POST /api/tracking/config/:uid - Missing UID", func(t *testing.T) {
		config := factory.CreateTrackingConfig()

		resp := httpHelper.MakeRequest(t, "POST", "/api/tracking/config/", config)
		defer resp.Body.Close()

		AssertResponseStatus(t, resp, http.StatusBadRequest)
		var result map[string]interface{}
		AssertResponseJSON(t, resp, &result)

		assert.Equal(t, false, result["success"])
		assert.Contains(t, result, "error")
		assert.Contains(t, result["error"], "Missing uid parameter")
	})

	t.Run("POST /api/tracking/config/:uid - Missing Body", func(t *testing.T) {
		unitUID := "test-unit-" + CreateTestUID()

		resp := httpHelper.MakeRequest(t, "POST", "/api/tracking/config/"+unitUID, nil)
		defer resp.Body.Close()

		AssertResponseStatus(t, resp, http.StatusBadRequest)
		var result map[string]interface{}
		AssertResponseJSON(t, resp, &result)

		assert.Equal(t, false, result["success"])
		assert.Contains(t, result, "error")
		assert.Contains(t, result["error"], "Missing request body")
	})

	t.Run("POST /api/tracking/config/:uid - Invalid JSON", func(t *testing.T) {
		unitUID := "test-unit-" + CreateTestUID()

		// Create request with invalid JSON
		req, err := http.NewRequest("POST", testApp.HTTPTestServer.URL+"/api/tracking/config/"+unitUID,
			strings.NewReader("{invalid json"))
		require.NoError(t, err)
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Authorization", "Bearer "+validToken)

		resp, err := httpHelper.Client.Do(req)
		require.NoError(t, err)
		defer resp.Body.Close()

		AssertResponseStatus(t, resp, http.StatusBadRequest)
		var result map[string]interface{}
		AssertResponseJSON(t, resp, &result)

		assert.Equal(t, false, result["success"])
		assert.Contains(t, result, "error")
	})

	t.Run("POST /api/tracking/config/:uid - Service Unavailable", func(t *testing.T) {
		unitUID := "test-unit-" + CreateTestUID()
		config := factory.CreateTrackingConfig()
		config.UnitUID = unitUID

		// Temporarily disable tracking service
		originalService := testApp.App.trackingService
		testApp.App.trackingService = nil

		resp := httpHelper.MakeRequest(t, "POST", "/api/tracking/config/"+unitUID, config)
		defer resp.Body.Close()

		// Restore service
		testApp.App.trackingService = originalService

		AssertResponseStatus(t, resp, http.StatusServiceUnavailable)
		var result map[string]interface{}
		AssertResponseJSON(t, resp, &result)

		assert.Equal(t, false, result["success"])
		assert.Contains(t, result, "error")
		assert.Contains(t, result["error"], "Tracking service not available")
	})

	t.Run("POST /api/tracking/config/:uid - Validation Errors", func(t *testing.T) {
		unitUID := "test-unit-" + CreateTestUID()

		t.Run("Invalid Trail Length - Too Small", func(t *testing.T) {
			config := factory.CreateTrackingConfig()
			config.UnitUID = unitUID
			config.TrailLength = 0 // Below minimum

			resp := httpHelper.MakeRequest(t, "POST", "/api/tracking/config/"+unitUID, config)
			defer resp.Body.Close()

			AssertResponseStatus(t, resp, http.StatusBadRequest)
			var result map[string]interface{}
			AssertResponseJSON(t, resp, &result)

			assert.Equal(t, false, result["success"])
			assert.Contains(t, result["error"], "Trail length must be between 1 and 1000")
		})

		t.Run("Invalid Trail Length - Too Large", func(t *testing.T) {
			config := factory.CreateTrackingConfig()
			config.UnitUID = unitUID
			config.TrailLength = 1001 // Above maximum

			resp := httpHelper.MakeRequest(t, "POST", "/api/tracking/config/"+unitUID, config)
			defer resp.Body.Close()

			AssertResponseStatus(t, resp, http.StatusBadRequest)
			var result map[string]interface{}
			AssertResponseJSON(t, resp, &result)

			assert.Equal(t, false, result["success"])
			assert.Contains(t, result["error"], "Trail length must be between 1 and 1000")
		})

		t.Run("Invalid Update Interval - Too Small", func(t *testing.T) {
			config := factory.CreateTrackingConfig()
			config.UnitUID = unitUID
			config.UpdateInterval = 0 // Below minimum

			resp := httpHelper.MakeRequest(t, "POST", "/api/tracking/config/"+unitUID, config)
			defer resp.Body.Close()

			AssertResponseStatus(t, resp, http.StatusBadRequest)
			var result map[string]interface{}
			AssertResponseJSON(t, resp, &result)

			assert.Equal(t, false, result["success"])
			assert.Contains(t, result["error"], "Update interval must be between 1 and 3600 seconds")
		})

		t.Run("Invalid Update Interval - Too Large", func(t *testing.T) {
			config := factory.CreateTrackingConfig()
			config.UnitUID = unitUID
			config.UpdateInterval = 3601 // Above maximum

			resp := httpHelper.MakeRequest(t, "POST", "/api/tracking/config/"+unitUID, config)
			defer resp.Body.Close()

			AssertResponseStatus(t, resp, http.StatusBadRequest)
			var result map[string]interface{}
			AssertResponseJSON(t, resp, &result)

			assert.Equal(t, false, result["success"])
			assert.Contains(t, result["error"], "Update interval must be between 1 and 3600 seconds")
		})

		t.Run("Invalid Trail Width - Too Small", func(t *testing.T) {
			config := factory.CreateTrackingConfig()
			config.UnitUID = unitUID
			config.TrailWidth = 0 // Below minimum

			resp := httpHelper.MakeRequest(t, "POST", "/api/tracking/config/"+unitUID, config)
			defer resp.Body.Close()

			AssertResponseStatus(t, resp, http.StatusBadRequest)
			var result map[string]interface{}
			AssertResponseJSON(t, resp, &result)

			assert.Equal(t, false, result["success"])
			assert.Contains(t, result["error"], "Trail width must be between 1 and 10")
		})

		t.Run("Invalid Trail Width - Too Large", func(t *testing.T) {
			config := factory.CreateTrackingConfig()
			config.UnitUID = unitUID
			config.TrailWidth = 11 // Above maximum

			resp := httpHelper.MakeRequest(t, "POST", "/api/tracking/config/"+unitUID, config)
			defer resp.Body.Close()

			AssertResponseStatus(t, resp, http.StatusBadRequest)
			var result map[string]interface{}
			AssertResponseJSON(t, resp, &result)

			assert.Equal(t, false, result["success"])
			assert.Contains(t, result["error"], "Trail width must be between 1 and 10")
		})
	})

	t.Run("POST /api/tracking/config/:uid - Default Values", func(t *testing.T) {
		unitUID := "test-unit-" + CreateTestUID()
		config := factory.CreateTrackingConfig()
		config.UnitUID = unitUID
		config.TrailColor = "" // Empty color should get default

		resp := httpHelper.MakeRequest(t, "POST", "/api/tracking/config/"+unitUID, config)
		defer resp.Body.Close()

		AssertResponseStatus(t, resp, http.StatusOK)
		var result map[string]interface{}
		AssertResponseJSON(t, resp, &result)

		// Should get default color
		updatedConfig := result["data"].(map[string]interface{})
		assert.Equal(t, "#FF0000", updatedConfig["trail_color"])
	})
}

// TestTrackingIntegration tests integration between tracking endpoints and database
func TestTrackingIntegration(t *testing.T) {
	testApp := CreateTestApp(t)
	defer testApp.CleanupTestApp(t)

	httpHelper := NewHTTPRequestHelper(testApp.HTTPTestServer.URL)
	validToken := "valid-test-token"
	httpHelper.SetAuthToken(validToken)

	factory := NewTestDataFactory()

	t.Run("End-to-end tracking workflow", func(t *testing.T) {
		unitUID := "test-unit-" + CreateTestUID()

		// 1. Add tracking position directly to service
		err := testApp.TrackingSvc.AddPosition(unitUID, 40.7128, -74.0060, 100.0, 10.0, 90.0)
		require.NoError(t, err)

		// 2. Update tracking configuration
		config := factory.CreateTrackingConfig()
		config.UnitUID = unitUID
		config.TrailLength = 25
		config.TrailColor = "#00FF00"

		resp := httpHelper.MakeRequest(t, "POST", "/api/tracking/config/"+unitUID, config)
		defer resp.Body.Close()

		AssertResponseStatus(t, resp, http.StatusOK)
		var configResult map[string]interface{}
		AssertResponseJSON(t, resp, &configResult)
		assert.Equal(t, true, configResult["success"])

		// 3. Retrieve trail for the unit
		resp = httpHelper.MakeRequest(t, "GET", "/api/tracking/trail/"+unitUID, nil)
		defer resp.Body.Close()

		var trailResult map[string]interface{}
		AssertResponseJSON(t, resp, &trailResult)
		assert.Equal(t, true, trailResult["success"])

		data := trailResult["data"].(map[string]interface{})
		assert.Equal(t, unitUID, data["unit_uid"])

		// Verify configuration was applied
		trailConfig := data["config"].(map[string]interface{})
		assert.Equal(t, 25, int(trailConfig["trail_length"].(float64)))
		assert.Equal(t, "#00FF00", trailConfig["trail_color"])

		// Verify position data
		positions := data["positions"].([]interface{})
		assert.Len(t, positions, 1)

		pos := positions[0].(map[string]interface{})
		assert.Equal(t, 40.7128, pos["latitude"])
		assert.Equal(t, -74.0060, pos["longitude"])
		assert.Equal(t, 100.0, pos["altitude"])
		assert.Equal(t, 10.0, pos["speed"])
		assert.Equal(t, 90.0, pos["course"])

		// 4. Get all trails
		resp = httpHelper.MakeRequest(t, "GET", "/api/tracking/trails", nil)
		defer resp.Body.Close()

		var allTrailsResult map[string]interface{}
		AssertResponseJSON(t, resp, &allTrailsResult)
		assert.Equal(t, true, allTrailsResult["success"])

		trails := allTrailsResult["data"].([]interface{})
		assert.Len(t, trails, 1)

		// 5. Add another position
		time.Sleep(10 * time.Millisecond)
		err = testApp.TrackingSvc.AddPosition(unitUID, 40.7130, -74.0058, 105.0, 12.0, 95.0)
		require.NoError(t, err)

		// 6. Verify trail now has 2 positions
		resp = httpHelper.MakeRequest(t, "GET", "/api/tracking/trail/"+unitUID, nil)
		defer resp.Body.Close()

		var updatedTrailResult map[string]interface{}
		AssertResponseJSON(t, resp, &updatedTrailResult)
		assert.Equal(t, true, updatedTrailResult["success"])

		updatedData := updatedTrailResult["data"].(map[string]interface{})
		updatedPositions := updatedData["positions"].([]interface{})
		assert.Len(t, updatedPositions, 2)

		// Verify positions are in chronological order
		firstPos := updatedPositions[0].(map[string]interface{})
		secondPos := updatedPositions[1].(map[string]interface{})

		firstTime, err := time.Parse(time.RFC3339, firstPos["timestamp"].(string))
		require.NoError(t, err)
		secondTime, err := time.Parse(time.RFC3339, secondPos["timestamp"].(string))
		require.NoError(t, err)

		assert.True(t, firstTime.Before(secondTime), "Positions should be in chronological order")
	})
}
