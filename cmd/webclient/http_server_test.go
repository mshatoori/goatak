package main

import (
	"fmt"
	"io"
	"net/http"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/kdudkov/goatak/internal/client"
	"github.com/kdudkov/goatak/pkg/cot"
	"github.com/kdudkov/goatak/pkg/model"
)

// TestHTTPServerEndpoints tests all HTTP endpoints in http_server.go
func TestHTTPServerEndpoints(t *testing.T) {
	testApp := CreateTestApp(t)
	defer testApp.CleanupTestApp(t)

	// Set up HTTP request helper with valid auth token
	httpHelper := NewHTTPRequestHelper(testApp.HTTPTestServer.URL)
	validToken := "valid-test-token"
	httpHelper.SetAuthToken(validToken)

	// Test data factory
	factory := NewTestDataFactory()

	t.Run("GET /config", func(t *testing.T) {
		resp := httpHelper.MakeRequest(t, "GET", "/config", nil)
		defer resp.Body.Close()

		AssertResponseStatus(t, resp, http.StatusOK)
		AssertCORSHeaders(t, resp)

		var config map[string]interface{}
		AssertResponseJSON(t, resp, &config)

		// Verify expected fields
		assert.Contains(t, config, "version")
		assert.Contains(t, config, "uid")
		assert.Contains(t, config, "lat")
		assert.Contains(t, config, "lon")
		assert.Contains(t, config, "zoom")
		assert.Contains(t, config, "myuid")
		assert.Contains(t, config, "callsign")
		assert.Contains(t, config, "team")
		assert.Contains(t, config, "role")
		assert.Contains(t, config, "layers")
		assert.Contains(t, config, "ip_address")
		assert.Contains(t, config, "urn")

		// Verify values
		assert.Equal(t, testApp.App.uid, config["uid"])
		assert.Equal(t, testApp.App.callsign, config["callsign"])
		assert.Equal(t, testApp.App.team, config["team"])
		assert.Equal(t, testApp.App.role, config["role"])
	})

	t.Run("PATCH /config", func(t *testing.T) {
		updateData := map[string]string{
			"uid":        "updated-uid",
			"callsign":   "UpdatedUnit",
			"ip_address": "192.168.1.100",
			"urn":        "54321",
		}

		resp := httpHelper.MakeRequest(t, "PATCH", "/config", updateData)
		defer resp.Body.Close()

		AssertResponseStatus(t, resp, http.StatusOK)
		AssertCORSHeaders(t, resp)

		// Verify the response is "Ok"
		body, err := io.ReadAll(resp.Body)
		require.NoError(t, err)
		assert.Equal(t, "Ok", strings.TrimSpace(string(body)))

		// Verify the config was updated
		assert.Equal(t, "updated-uid", testApp.App.uid)
		assert.Equal(t, "UpdatedUnit", testApp.App.callsign)
		assert.Equal(t, "192.168.1.100", testApp.App.ipAddress)
		assert.Equal(t, int32(54321), testApp.App.urn)
	})

	t.Run("GET /types", func(t *testing.T) {
		resp := httpHelper.MakeRequest(t, "GET", "/types", nil)
		defer resp.Body.Close()

		AssertResponseStatus(t, resp, http.StatusOK)
		AssertCORSHeaders(t, resp)

		// Should return CoT types data
		var types interface{}
		AssertResponseJSON(t, resp, &types)
		assert.NotNil(t, types)
	})

	t.Run("POST /dp", func(t *testing.T) {
		dpData := &struct {
			Name string  `json:"name"`
			Lat  float64 `json:"lat"`
			Lon  float64 `json:"lon"`
		}{
			Name: "TestPoint",
			Lat:  40.7128,
			Lon:  -74.0060,
		}

		resp := httpHelper.MakeRequest(t, "POST", "/dp", dpData)
		defer resp.Body.Close()

		AssertResponseStatus(t, resp, http.StatusOK)
		AssertCORSHeaders(t, resp)

		// Should return "Ok"
		body, err := io.ReadAll(resp.Body)
		require.NoError(t, err)
		assert.Equal(t, "Ok", strings.TrimSpace(string(body)))
	})

	t.Run("GET /pos", func(t *testing.T) {
		resp := httpHelper.MakeRequest(t, "GET", "/pos", nil)
		defer resp.Body.Close()

		AssertResponseStatus(t, resp, http.StatusOK)
		AssertCORSHeaders(t, resp)

		var posData map[string]interface{}
		AssertResponseJSON(t, resp, &posData)

		assert.Contains(t, posData, "lat")
		assert.Contains(t, posData, "lon")
	})

	t.Run("POST /pos", func(t *testing.T) {
		posData := map[string]float64{
			"lat": 41.7128,
			"lon": -73.0060,
		}

		resp := httpHelper.MakeRequest(t, "POST", "/pos", posData)
		defer resp.Body.Close()

		AssertResponseStatus(t, resp, http.StatusOK)
		AssertCORSHeaders(t, resp)

		// Should return "Ok"
		body, err := io.ReadAll(resp.Body)
		require.NoError(t, err)
		assert.Equal(t, "Ok", strings.TrimSpace(string(body)))
	})

	t.Run("GET /unit", func(t *testing.T) {
		// First add a unit
		webUnit := factory.CreateWebUnit()
		testApp.App.items.Store(model.FromMsg(cot.LocalCotMessage(webUnit.ToMsg())))

		resp := httpHelper.MakeRequest(t, "GET", "/unit", nil)
		defer resp.Body.Close()

		AssertResponseStatus(t, resp, http.StatusOK)
		AssertCORSHeaders(t, resp)

		var units []interface{}
		AssertResponseJSON(t, resp, &units)
		assert.NotNil(t, units)
	})

	t.Run("POST /unit", func(t *testing.T) {
		webUnit := factory.CreateWebUnit()

		resp := httpHelper.MakeRequest(t, "POST", "/unit", webUnit)
		defer resp.Body.Close()

		AssertResponseStatus(t, resp, http.StatusOK)
		AssertCORSHeaders(t, resp)

		var result map[string]interface{}
		AssertResponseJSON(t, resp, &result)

		// Verify the unit was created
		assert.Contains(t, result, "uid")
		assert.Contains(t, result, "type")
		assert.Contains(t, result, "callsign")
	})

	t.Run("DELETE /unit/:uid", func(t *testing.T) {
		// First create a unit
		webUnit := factory.CreateWebUnit()
		testApp.App.items.Store(model.FromMsg(cot.LocalCotMessage(webUnit.ToMsg())))

		resp := httpHelper.MakeRequest(t, "DELETE", "/unit/"+webUnit.UID, nil)
		defer resp.Body.Close()

		AssertResponseStatus(t, resp, http.StatusOK)
		AssertCORSHeaders(t, resp)

		var result map[string]interface{}
		AssertResponseJSON(t, resp, &result)

		// Verify the unit was deleted
		assert.Contains(t, result, "units")
		assert.Contains(t, result, "messages")
	})

	t.Run("GET /message", func(t *testing.T) {
		resp := httpHelper.MakeRequest(t, "GET", "/message", nil)
		defer resp.Body.Close()

		AssertResponseStatus(t, resp, http.StatusOK)
		AssertCORSHeaders(t, resp)

		var messages []interface{}
		AssertResponseJSON(t, resp, &messages)
		assert.NotNil(t, messages)
	})

	t.Run("POST /message", func(t *testing.T) {
		chatMessage := factory.CreateChatMessage()

		resp := httpHelper.MakeRequest(t, "POST", "/message", chatMessage)
		defer resp.Body.Close()

		AssertResponseStatus(t, resp, http.StatusOK)
		AssertCORSHeaders(t, resp)

		var messages []interface{}
		AssertResponseJSON(t, resp, &messages)
		assert.NotNil(t, messages)
	})

	t.Run("GET /flows", func(t *testing.T) {
		resp := httpHelper.MakeRequest(t, "GET", "/flows", nil)
		defer resp.Body.Close()

		AssertResponseStatus(t, resp, http.StatusOK)
		AssertCORSHeaders(t, resp)

		var flows []interface{}
		AssertResponseJSON(t, resp, &flows)
		assert.NotNil(t, flows)
	})

	t.Run("POST /flows", func(t *testing.T) {
		flowConfig := factory.CreateFlowConfig()

		resp := httpHelper.MakeRequest(t, "POST", "/flows", flowConfig)
		defer resp.Body.Close()

		AssertResponseStatus(t, resp, http.StatusOK)
		AssertCORSHeaders(t, resp)

		var flows []interface{}
		AssertResponseJSON(t, resp, &flows)
		assert.NotNil(t, flows)
	})

	t.Run("DELETE /flows/:uid", func(t *testing.T) {
		// First create a flow
		flowConfig := factory.CreateFlowConfig()
		testApp.App.flows = append(testApp.App.flows, client.NewUDPFlow(&client.UDPFlowConfig{
			UID:   flowConfig.UID,
			Title: flowConfig.Title,
			Addr:  flowConfig.Addr,
			Port:  flowConfig.Port,
		}))

		resp := httpHelper.MakeRequest(t, "DELETE", "/flows/"+flowConfig.UID, nil)
		defer resp.Body.Close()

		AssertResponseStatus(t, resp, http.StatusOK)
		AssertCORSHeaders(t, resp)

		// Should return success message
		body, err := io.ReadAll(resp.Body)
		require.NoError(t, err)
		assert.Contains(t, string(body), "Flow deleted successfully")
	})

	t.Run("GET /stack", func(t *testing.T) {
		resp := httpHelper.MakeRequest(t, "GET", "/stack", nil)
		defer resp.Body.Close()

		AssertResponseStatus(t, resp, http.StatusOK)
		AssertCORSHeaders(t, resp)

		// Should return goroutine stack information
		body, err := io.ReadAll(resp.Body)
		require.NoError(t, err)
		assert.Contains(t, string(body), "goroutine")
	})

	t.Run("GET /api/navigation/distance/:itemId", func(t *testing.T) {
		// Create a test item first
		webUnit := factory.CreateWebUnit()
		testApp.App.items.Store(model.FromMsg(cot.LocalCotMessage(webUnit.ToMsg())))

		// Test with valid parameters
		resp := httpHelper.MakeRequest(t, "GET",
			fmt.Sprintf("/api/navigation/distance/%s?userLat=40.7128&userLon=-74.0060", webUnit.UID),
			nil)
		defer resp.Body.Close()

		var result map[string]interface{}
		AssertResponseJSON(t, resp, &result)

		// Should return success response
		assert.Contains(t, result, "success")
		assert.Contains(t, result, "data")
	})

	t.Run("GET /destinations", func(t *testing.T) {
		resp := httpHelper.MakeRequest(t, "GET", "/destinations", nil)
		defer resp.Body.Close()

		var result map[string]interface{}
		AssertResponseJSON(t, resp, &result)

		// Should return destinations data
		assert.Contains(t, result, "success")
		assert.Contains(t, result, "ownAddresses")
		assert.Contains(t, result, "directDestinations")
	})
}

// TestAuthenticationMiddleware tests the authentication middleware
func TestAuthenticationMiddleware(t *testing.T) {
	testApp := CreateTestApp(t)
	defer testApp.CleanupTestApp(t)

	t.Run("Valid token", func(t *testing.T) {
		httpHelper := NewHTTPRequestHelper(testApp.HTTPTestServer.URL)
		validToken := "valid-test-token"
		httpHelper.SetAuthToken(validToken)

		resp := httpHelper.MakeRequest(t, "GET", "/config", nil)
		defer resp.Body.Close()

		AssertResponseStatus(t, resp, http.StatusOK)
	})

	t.Run("Invalid token", func(t *testing.T) {
		httpHelper := NewHTTPRequestHelper(testApp.HTTPTestServer.URL)
		httpHelper.SetAuthToken("invalid-token")

		resp := httpHelper.MakeRequest(t, "GET", "/config", nil)
		defer resp.Body.Close()

		AssertResponseStatus(t, resp, http.StatusUnauthorized)
	})

	t.Run("Missing token", func(t *testing.T) {
		httpHelper := NewHTTPRequestHelper(testApp.HTTPTestServer.URL)
		// No token set

		resp := httpHelper.MakeRequest(t, "GET", "/config", nil)
		defer resp.Body.Close()

		AssertResponseStatus(t, resp, http.StatusUnauthorized)
	})

	t.Run("OPTIONS request bypasses auth", func(t *testing.T) {
		httpHelper := NewHTTPRequestHelper(testApp.HTTPTestServer.URL)
		// No token set

		resp := httpHelper.MakeRequest(t, "OPTIONS", "/config", nil)
		defer resp.Body.Close()

		// OPTIONS should succeed even without auth
		AssertResponseStatus(t, resp, http.StatusOK)
	})

	t.Run("Query parameter token for WebSocket", func(t *testing.T) {
		httpHelper := NewHTTPRequestHelper(testApp.HTTPTestServer.URL)
		validToken := "valid-test-token"

		// Make request with token as query parameter
		req, err := http.NewRequest("GET", testApp.HTTPTestServer.URL+"/ws?token="+validToken, nil)
		require.NoError(t, err)

		resp, err := httpHelper.Client.Do(req)
		require.NoError(t, err)
		defer resp.Body.Close()

		// Should succeed with query parameter token
		// Note: This might fail due to WebSocket upgrade, but auth should pass
		assert.NotEqual(t, http.StatusUnauthorized, resp.StatusCode)
	})
}

// TestCORSHeaders tests CORS header handling
func TestCORSHeaders(t *testing.T) {
	testApp := CreateTestApp(t)
	defer testApp.CleanupTestApp(t)

	httpHelper := NewHTTPRequestHelper(testApp.HTTPTestServer.URL)
	validToken := "valid-test-token"
	httpHelper.SetAuthToken(validToken)

	t.Run("CORS headers on GET", func(t *testing.T) {
		resp := httpHelper.MakeRequest(t, "GET", "/config", nil)
		defer resp.Body.Close()

		AssertCORSHeaders(t, resp)
	})

	t.Run("CORS headers on POST", func(t *testing.T) {
		webUnit := NewTestDataFactory().CreateWebUnit()
		resp := httpHelper.MakeRequest(t, "POST", "/unit", webUnit)
		defer resp.Body.Close()

		AssertCORSHeaders(t, resp)
	})

	t.Run("CORS headers on OPTIONS", func(t *testing.T) {
		resp := httpHelper.MakeRequest(t, "OPTIONS", "/config", nil)
		defer resp.Body.Close()

		// OPTIONS should have CORS headers
		assert.Equal(t, "*", resp.Header.Get("Access-Control-Allow-Origin"))
		assert.Contains(t, resp.Header.Get("Access-Control-Allow-Methods"), "GET")
		assert.Contains(t, resp.Header.Get("Access-Control-Allow-Methods"), "POST")
		assert.Contains(t, resp.Header.Get("Access-Control-Allow-Methods"), "PUT")
		assert.Contains(t, resp.Header.Get("Access-Control-Allow-Methods"), "DELETE")
		assert.Contains(t, resp.Header.Get("Access-Control-Allow-Methods"), "OPTIONS")
	})
}

// TestErrorHandling tests error handling in HTTP endpoints
func TestErrorHandling(t *testing.T) {
	testApp := CreateTestApp(t)
	defer testApp.CleanupTestApp(t)

	httpHelper := NewHTTPRequestHelper(testApp.HTTPTestServer.URL)
	validToken := "valid-test-token"
	httpHelper.SetAuthToken(validToken)

	t.Run("Invalid JSON in request body", func(t *testing.T) {
		// Create request with invalid JSON
		req, err := http.NewRequest("POST", testApp.HTTPTestServer.URL+"/unit",
			strings.NewReader("{invalid json"))
		require.NoError(t, err)
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Authorization", "Bearer "+validToken)

		resp, err := httpHelper.Client.Do(req)
		require.NoError(t, err)
		defer resp.Body.Close()

		// Should return error status
		assert.NotEqual(t, http.StatusOK, resp.StatusCode)
	})

	t.Run("Missing required fields", func(t *testing.T) {
		// Send empty body where fields are required
		resp := httpHelper.MakeRequest(t, "POST", "/dp", map[string]interface{}{})
		defer resp.Body.Close()

		// Should handle gracefully
		assert.NotEqual(t, http.StatusOK, resp.StatusCode)
	})

	t.Run("Non-existent resource", func(t *testing.T) {
		resp := httpHelper.MakeRequest(t, "DELETE", "/unit/non-existent-uid", nil)
		defer resp.Body.Close()

		// Should handle gracefully
		assert.NotEqual(t, http.StatusOK, resp.StatusCode)
	})
}

// TestParameterValidation tests parameter validation in HTTP endpoints
func TestParameterValidation(t *testing.T) {
	testApp := CreateTestApp(t)
	defer testApp.CleanupTestApp(t)

	httpHelper := NewHTTPRequestHelper(testApp.HTTPTestServer.URL)
	validToken := "valid-test-token"
	httpHelper.SetAuthToken(validToken)

	t.Run("Navigation distance with missing parameters", func(t *testing.T) {
		// Test missing userLat
		resp := httpHelper.MakeRequest(t, "GET", "/api/navigation/distance/test-item?userLon=-74.0060", nil)
		defer resp.Body.Close()

		var result map[string]interface{}
		AssertResponseJSON(t, resp, &result)

		assert.Equal(t, false, result["success"])
		assert.Contains(t, result["error"], "Missing userLat")
	})

	t.Run("Navigation distance with invalid coordinates", func(t *testing.T) {
		// Test invalid lat
		resp := httpHelper.MakeRequest(t, "GET",
			"/api/navigation/distance/test-item?userLat=invalid&userLon=-74.0060", nil)
		defer resp.Body.Close()

		var result map[string]interface{}
		AssertResponseJSON(t, resp, &result)

		assert.Equal(t, false, result["success"])
		assert.Contains(t, result["error"], "Invalid userLat")
	})

	t.Run("Navigation distance with non-existent item", func(t *testing.T) {
		resp := httpHelper.MakeRequest(t, "GET",
			"/api/navigation/distance/non-existent-item?userLat=40.7128&userLon=-74.0060", nil)
		defer resp.Body.Close()

		var result map[string]interface{}
		AssertResponseJSON(t, resp, &result)

		assert.Equal(t, false, result["success"])
		assert.Contains(t, result["error"], "Item not found")
	})
}
