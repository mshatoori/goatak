package main

import (
	"net/http"
	"strings"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// TestHTTPResendEndpoints tests all HTTP endpoints in http_resend.go
func TestHTTPResendEndpoints(t *testing.T) {
	testApp := CreateTestApp(t)
	defer testApp.CleanupTestApp(t)

	// Set up HTTP request helper with valid auth token
	httpHelper := NewHTTPRequestHelper(testApp.HTTPTestServer.URL)
	validToken := "valid-test-token"
	httpHelper.SetAuthToken(validToken)

	t.Run("GET /api/resend/configs - Success", func(t *testing.T) {
		resp := httpHelper.MakeRequest(t, "GET", "/api/resend/configs", nil)
		defer resp.Body.Close()

		AssertResponseStatus(t, resp, http.StatusOK)
		AssertCORSHeaders(t, resp)

		var result map[string]interface{}
		AssertResponseJSON(t, resp, &result)

		// Verify response structure
		assert.Equal(t, true, result["success"])
		assert.Contains(t, result, "data")

		data := result["data"].([]interface{})
		assert.NotNil(t, data, "Should return an array")
	})

	t.Run("GET /api/resend/configs - Database Unavailable", func(t *testing.T) {
		// Temporarily disable database
		originalDB := testApp.App.DB
		testApp.App.DB = nil

		resp := httpHelper.MakeRequest(t, "GET", "/api/resend/configs", nil)
		defer resp.Body.Close()

		// Restore database
		testApp.App.DB = originalDB

		AssertResponseStatus(t, resp, http.StatusServiceUnavailable)
		var result map[string]interface{}
		AssertResponseJSON(t, resp, &result)

		assert.Equal(t, false, result["success"])
		assert.Contains(t, result, "error")
		assert.Contains(t, result["error"], "Database not available")
	})

	t.Run("GET /api/resend/configs - Service Unavailable", func(t *testing.T) {
		// Temporarily disable resend service
		originalService := testApp.App.resendService
		testApp.App.resendService = nil

		resp := httpHelper.MakeRequest(t, "GET", "/api/resend/configs", nil)
		defer resp.Body.Close()

		// Restore service
		testApp.App.resendService = originalService

		AssertResponseStatus(t, resp, http.StatusServiceUnavailable)
		var result map[string]interface{}
		AssertResponseJSON(t, resp, &result)

		assert.Equal(t, false, result["success"])
		assert.Contains(t, result, "error")
		assert.Contains(t, result["error"], "Resend service not available")
	})

	t.Run("GET /api/resend/configs/:uid - Success", func(t *testing.T) {
		// First create a config
		config := createTestResendConfig()
		err := saveResendConfigToDatabase(testApp.DB, config)
		require.NoError(t, err)

		// Update service cache
		if testApp.App.resendService != nil {
			testApp.App.resendService.UpdateConfiguration(config)
		}

		resp := httpHelper.MakeRequest(t, "GET", "/api/resend/configs/"+config.UID, nil)
		defer resp.Body.Close()

		AssertResponseStatus(t, resp, http.StatusOK)
		AssertCORSHeaders(t, resp)

		var result map[string]interface{}
		AssertResponseJSON(t, resp, &result)

		// Verify response structure
		assert.Equal(t, true, result["success"])
		assert.Contains(t, result, "data")

		data := result["data"].(map[string]interface{})
		assert.Equal(t, config.UID, data["uid"])
		assert.Equal(t, config.Name, data["name"])
		assert.Equal(t, config.Enabled, data["enabled"])
	})

	t.Run("GET /api/resend/configs/:uid - Missing UID", func(t *testing.T) {
		resp := httpHelper.MakeRequest(t, "GET", "/api/resend/configs/", nil)
		defer resp.Body.Close()

		AssertResponseStatus(t, resp, http.StatusBadRequest)
		var result map[string]interface{}
		AssertResponseJSON(t, resp, &result)

		assert.Equal(t, false, result["success"])
		assert.Contains(t, result, "error")
		assert.Contains(t, result["error"], "Missing uid parameter")
	})

	t.Run("GET /api/resend/configs/:uid - Not Found", func(t *testing.T) {
		nonExistentUID := "non-existent-config-" + CreateTestUID()

		resp := httpHelper.MakeRequest(t, "GET", "/api/resend/configs/"+nonExistentUID, nil)
		defer resp.Body.Close()

		AssertResponseStatus(t, resp, http.StatusNotFound)
		var result map[string]interface{}
		AssertResponseJSON(t, resp, &result)

		assert.Equal(t, false, result["success"])
		assert.Contains(t, result, "error")
		assert.Contains(t, result["error"], "Resend config not found")
	})

	t.Run("POST /api/resend/configs - Success", func(t *testing.T) {
		config := &ResendConfigDTO{
			Name:    "Test Resend Config",
			Enabled: true,
			Destination: &NetworkAddressDTO{
				Type: "udp",
				IP:   "192.168.1.100",
				URN:  12345,
			},
		}

		resp := httpHelper.MakeRequest(t, "POST", "/api/resend/configs", config)
		defer resp.Body.Close()

		AssertResponseStatus(t, resp, http.StatusOK)
		AssertCORSHeaders(t, resp)

		var result map[string]interface{}
		AssertResponseJSON(t, resp, &result)

		assert.Equal(t, true, result["success"])
		assert.Contains(t, result, "data")

		// Verify the config was created
		data := result["data"].(map[string]interface{})
		assert.NotEmpty(t, data["uid"], "Should have generated UID")
		assert.Equal(t, config.Name, data["name"])
		assert.Equal(t, config.Enabled, data["enabled"])
		assert.NotNil(t, data["created_at"], "Should have created timestamp")
		assert.NotNil(t, data["updated_at"], "Should have updated timestamp")
	})

	t.Run("POST /api/resend/configs - Missing Body", func(t *testing.T) {
		resp := httpHelper.MakeRequest(t, "POST", "/api/resend/configs", nil)
		defer resp.Body.Close()

		AssertResponseStatus(t, resp, http.StatusBadRequest)
		var result map[string]interface{}
		AssertResponseJSON(t, resp, &result)

		assert.Equal(t, false, result["success"])
		assert.Contains(t, result, "error")
		assert.Contains(t, result["error"], "Missing request body")
	})

	t.Run("POST /api/resend/configs - Invalid JSON", func(t *testing.T) {
		// Create request with invalid JSON
		req, err := http.NewRequest("POST", testApp.HTTPTestServer.URL+"/api/resend/configs",
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

	t.Run("POST /api/resend/configs - Validation Errors", func(t *testing.T) {
		t.Run("Missing Name", func(t *testing.T) {
			config := &ResendConfigDTO{
				// Name is empty
				Enabled: true,
				Destination: &NetworkAddressDTO{
					Type: "udp",
					IP:   "192.168.1.100",
					URN:  12345,
				},
			}

			resp := httpHelper.MakeRequest(t, "POST", "/api/resend/configs", config)
			defer resp.Body.Close()

			AssertResponseStatus(t, resp, http.StatusBadRequest)
			var result map[string]interface{}
			AssertResponseJSON(t, resp, &result)

			assert.Equal(t, false, result["success"])
			assert.Contains(t, result, "error")
			assert.Contains(t, result["error"], "Name is required")
		})

		t.Run("Missing Destination", func(t *testing.T) {
			config := &ResendConfigDTO{
				Name:    "Test Config",
				Enabled: true,
				// Destination is nil
			}

			resp := httpHelper.MakeRequest(t, "POST", "/api/resend/configs", config)
			defer resp.Body.Close()

			AssertResponseStatus(t, resp, http.StatusBadRequest)
			var result map[string]interface{}
			AssertResponseJSON(t, resp, &result)

			assert.Equal(t, false, result["success"])
			assert.Contains(t, result, "error")
			assert.Contains(t, result["error"], "Destination is required")
		})
	})

	t.Run("PUT /api/resend/configs/:uid - Success", func(t *testing.T) {
		// First create a config
		config := createTestResendConfig()
		err := saveResendConfigToDatabase(testApp.DB, config)
		require.NoError(t, err)

		// Update service cache
		if testApp.App.resendService != nil {
			testApp.App.resendService.UpdateConfiguration(config)
		}

		// Update the config
		updatedConfig := &ResendConfigDTO{
			UID:     config.UID,
			Name:    "Updated Test Config",
			Enabled: false,
			Destination: &NetworkAddressDTO{
				Type: "udp",
				IP:   "192.168.1.200",
				URN:  54321,
			},
		}

		resp := httpHelper.MakeRequest(t, "PUT", "/api/resend/configs/"+config.UID, updatedConfig)
		defer resp.Body.Close()

		AssertResponseStatus(t, resp, http.StatusOK)
		AssertCORSHeaders(t, resp)

		var result map[string]interface{}
		AssertResponseJSON(t, resp, &result)

		assert.Equal(t, true, result["success"])
		assert.Contains(t, result, "data")

		// Verify the config was updated
		data := result["data"].(map[string]interface{})
		assert.Equal(t, config.UID, data["uid"])
		assert.Equal(t, updatedConfig.Name, data["name"])
		assert.Equal(t, updatedConfig.Enabled, data["enabled"])
	})

	t.Run("PUT /api/resend/configs/:uid - Missing UID", func(t *testing.T) {
		config := &ResendConfigDTO{
			Name:    "Test Config",
			Enabled: true,
			Destination: &NetworkAddressDTO{
				Type: "udp",
				IP:   "192.168.1.100",
				URN:  12345,
			},
		}

		resp := httpHelper.MakeRequest(t, "PUT", "/api/resend/configs/", config)
		defer resp.Body.Close()

		AssertResponseStatus(t, resp, http.StatusBadRequest)
		var result map[string]interface{}
		AssertResponseJSON(t, resp, &result)

		assert.Equal(t, false, result["success"])
		assert.Contains(t, result, "error")
		assert.Contains(t, result["error"], "Missing uid parameter")
	})

	t.Run("PUT /api/resend/configs/:uid - Not Found", func(t *testing.T) {
		nonExistentUID := "non-existent-config-" + CreateTestUID()
		config := &ResendConfigDTO{
			UID:     nonExistentUID,
			Name:    "Test Config",
			Enabled: true,
			Destination: &NetworkAddressDTO{
				Type: "udp",
				IP:   "192.168.1.100",
				URN:  12345,
			},
		}

		resp := httpHelper.MakeRequest(t, "PUT", "/api/resend/configs/"+nonExistentUID, config)
		defer resp.Body.Close()

		AssertResponseStatus(t, resp, http.StatusNotFound)
		var result map[string]interface{}
		AssertResponseJSON(t, resp, &result)

		assert.Equal(t, false, result["success"])
		assert.Contains(t, result, "error")
		assert.Contains(t, result["error"], "Resend config not found")
	})

	t.Run("DELETE /api/resend/configs/:uid - Success", func(t *testing.T) {
		// First create a config
		config := createTestResendConfig()
		err := saveResendConfigToDatabase(testApp.DB, config)
		require.NoError(t, err)

		// Update service cache
		if testApp.App.resendService != nil {
			testApp.App.resendService.UpdateConfiguration(config)
		}

		resp := httpHelper.MakeRequest(t, "DELETE", "/api/resend/configs/"+config.UID, nil)
		defer resp.Body.Close()

		AssertResponseStatus(t, resp, http.StatusOK)
		AssertCORSHeaders(t, resp)

		var result map[string]interface{}
		AssertResponseJSON(t, resp, &result)

		assert.Equal(t, true, result["success"])
		assert.Contains(t, result, "message")
		assert.Contains(t, result["message"], "Resend config deleted successfully")

		// Verify the config was deleted from database
		var count int
		err = testApp.DB.QueryRow("SELECT COUNT(*) FROM resend_configs WHERE uid = ?", config.UID).Scan(&count)
		require.NoError(t, err)
		assert.Equal(t, 0, count, "Config should be deleted from database")
	})

	t.Run("DELETE /api/resend/configs/:uid - Missing UID", func(t *testing.T) {
		resp := httpHelper.MakeRequest(t, "DELETE", "/api/resend/configs/", nil)
		defer resp.Body.Close()

		AssertResponseStatus(t, resp, http.StatusBadRequest)
		var result map[string]interface{}
		AssertResponseJSON(t, resp, &result)

		assert.Equal(t, false, result["success"])
		assert.Contains(t, result, "error")
		assert.Contains(t, result["error"], "Missing uid parameter")
	})

	t.Run("DELETE /api/resend/configs/:uid - Not Found", func(t *testing.T) {
		nonExistentUID := "non-existent-config-" + CreateTestUID()

		resp := httpHelper.MakeRequest(t, "DELETE", "/api/resend/configs/"+nonExistentUID, nil)
		defer resp.Body.Close()

		AssertResponseStatus(t, resp, http.StatusNotFound)
		var result map[string]interface{}
		AssertResponseJSON(t, resp, &result)

		assert.Equal(t, false, result["success"])
		assert.Contains(t, result, "error")
		assert.Contains(t, result["error"], "Resend config not found")
	})
}

// TestResendIntegration tests integration between resend endpoints and database
func TestResendIntegration(t *testing.T) {
	testApp := CreateTestApp(t)
	defer testApp.CleanupTestApp(t)

	httpHelper := NewHTTPRequestHelper(testApp.HTTPTestServer.URL)
	validToken := "valid-test-token"
	httpHelper.SetAuthToken(validToken)

	t.Run("End-to-end resend config workflow", func(t *testing.T) {
		// 1. Create a new resend config
		config := &ResendConfigDTO{
			Name:    "Integration Test Config",
			Enabled: true,
			Source: &NetworkAddressDTO{
				Type: "udp",
				IP:   "192.168.1.50",
				URN:  11111,
			},
			Destination: &NetworkAddressDTO{
				Type: "udp",
				IP:   "192.168.1.100",
				URN:  12345,
			},
			Filters: []FilterDTO{
				{
					ID: "test-filter-1",
					Predicates: []PredicateDTO{
						{
							Type:  "type",
							Value: "a-f-G-U-C",
						},
					},
				},
			},
		}

		// Create config via API
		resp := httpHelper.MakeRequest(t, "POST", "/api/resend/configs", config)
		defer resp.Body.Close()

		var createResult map[string]interface{}
		AssertResponseJSON(t, resp, &createResult)
		assert.Equal(t, true, createResult["success"])

		createdConfig := createResult["data"].(map[string]interface{})
		configUID := createdConfig["uid"].(string)
		assert.NotEmpty(t, configUID, "Should have generated UID")

		// 2. Retrieve the config
		resp = httpHelper.MakeRequest(t, "GET", "/api/resend/configs/"+configUID, nil)
		defer resp.Body.Close()

		var getResult map[string]interface{}
		AssertResponseJSON(t, resp, &getResult)
		assert.Equal(t, true, getResult["success"])

		retrievedConfig := getResult["data"].(map[string]interface{})
		assert.Equal(t, config.Name, retrievedConfig["name"])
		assert.Equal(t, config.Enabled, retrievedConfig["enabled"])

		// 3. Update the config
		updatedConfig := &ResendConfigDTO{
			UID:     configUID,
			Name:    "Updated Integration Test Config",
			Enabled: false,
			Destination: &NetworkAddressDTO{
				Type: "udp",
				IP:   "192.168.1.200",
				URN:  54321,
			},
		}

		resp = httpHelper.MakeRequest(t, "PUT", "/api/resend/configs/"+configUID, updatedConfig)
		defer resp.Body.Close()

		var updateResult map[string]interface{}
		AssertResponseJSON(t, resp, &updateResult)
		assert.Equal(t, true, updateResult["success"])

		// 4. Verify the update
		resp = httpHelper.MakeRequest(t, "GET", "/api/resend/configs/"+configUID, nil)
		defer resp.Body.Close()

		var verifyResult map[string]interface{}
		AssertResponseJSON(t, resp, &verifyResult)
		assert.Equal(t, true, verifyResult["success"])

		verifiedConfig := verifyResult["data"].(map[string]interface{})
		assert.Equal(t, updatedConfig.Name, verifiedConfig["name"])
		assert.Equal(t, updatedConfig.Enabled, verifiedConfig["enabled"])

		// 5. Get all configs and verify our config is in the list
		resp = httpHelper.MakeRequest(t, "GET", "/api/resend/configs", nil)
		defer resp.Body.Close()

		var allConfigsResult map[string]interface{}
		AssertResponseJSON(t, resp, &allConfigsResult)
		assert.Equal(t, true, allConfigsResult["success"])

		allConfigs := allConfigsResult["data"].([]interface{})
		assert.NotEmpty(t, allConfigs, "Should have at least one config")

		// Find our config in the list
		var found bool
		for _, configData := range allConfigs {
			if configData.(map[string]interface{})["uid"] == configUID {
				found = true
				break
			}
		}
		assert.True(t, found, "Should find our config in the list")

		// 6. Delete the config
		resp = httpHelper.MakeRequest(t, "DELETE", "/api/resend/configs/"+configUID, nil)
		defer resp.Body.Close()

		var deleteResult map[string]interface{}
		AssertResponseJSON(t, resp, &deleteResult)
		assert.Equal(t, true, deleteResult["success"])

		// 7. Verify the config is deleted
		resp = httpHelper.MakeRequest(t, "GET", "/api/resend/configs/"+configUID, nil)
		defer resp.Body.Close()

		var deleteVerifyResult map[string]interface{}
		AssertResponseJSON(t, resp, &deleteVerifyResult)
		assert.Equal(t, false, deleteVerifyResult["success"])
		assert.Contains(t, deleteVerifyResult["error"], "Resend config not found")
	})
}

// Helper function to create a test resend configuration
func createTestResendConfig() *ResendConfigDTO {
	return &ResendConfigDTO{
		UID:     "test-config-" + CreateTestUID(),
		Name:    "Test Resend Configuration",
		Enabled: true,
		Source: &NetworkAddressDTO{
			Type: "udp",
			IP:   "192.168.1.50",
			URN:  11111,
		},
		Destination: &NetworkAddressDTO{
			Type: "udp",
			IP:   "192.168.1.100",
			URN:  12345,
		},
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
		Filters: []FilterDTO{
			{
				ID: "test-filter-1",
				Predicates: []PredicateDTO{
					{
						Type:  "type",
						Value: "a-f-G-U-C",
					},
					{
						Type:  "callsign",
						Value: "TestUnit",
					},
				},
			},
		},
	}
}
