package main

import (
	"io"
	"net/http"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/kdudkov/goatak/pkg/model"
)

// TestHTTPSensorsEndpoints tests all HTTP endpoints in http_sensors.go
func TestHTTPSensorsEndpoints(t *testing.T) {
	testApp := CreateTestApp(t)
	defer testApp.CleanupTestApp(t)

	// Set up HTTP request helper with valid auth token
	httpHelper := NewHTTPRequestHelper(testApp.HTTPTestServer.URL)
	validToken := "valid-test-token"
	httpHelper.SetAuthToken(validToken)

	// Test data factory
	factory := NewTestDataFactory()

	t.Run("GET /sensors - Success", func(t *testing.T) {
		resp := httpHelper.MakeRequest(t, "GET", "/sensors", nil)
		defer resp.Body.Close()

		AssertResponseStatus(t, resp, http.StatusOK)
		AssertCORSHeaders(t, resp)

		var sensors []interface{}
		AssertResponseJSON(t, resp, &sensors)

		// Should return an empty array initially
		assert.NotNil(t, sensors, "Should return an array")
		assert.Empty(t, sensors, "Should be empty initially")
	})

	t.Run("POST /sensors - Success GPS", func(t *testing.T) {
		sensor := factory.CreateSensorModel()
		sensor.Type = "GPS"

		resp := httpHelper.MakeRequest(t, "POST", "/sensors", sensor)
		defer resp.Body.Close()

		AssertResponseStatus(t, resp, http.StatusOK)
		AssertCORSHeaders(t, resp)

		var sensors []interface{}
		AssertResponseJSON(t, resp, &sensors)

		// Should have one sensor
		assert.Len(t, sensors, 1, "Should have one sensor")

		// Verify sensor data
		sensorData := sensors[0].(map[string]interface{})
		assert.Equal(t, sensor.Title, sensorData["title"])
		assert.Equal(t, sensor.Type, sensorData["type"])
		assert.Equal(t, sensor.Addr, sensorData["addr"])
		assert.Equal(t, sensor.Port, int(sensorData["port"].(float64)))
		assert.Equal(t, sensor.Interval, int(sensorData["interval"].(float64)))
	})

	t.Run("POST /sensors - Success Radar", func(t *testing.T) {
		sensor := factory.CreateSensorModel()
		sensor.Type = "Radar"

		resp := httpHelper.MakeRequest(t, "POST", "/sensors", sensor)
		defer resp.Body.Close()

		AssertResponseStatus(t, resp, http.StatusOK)
		var sensors []interface{}
		AssertResponseJSON(t, resp, &sensors)

		assert.Len(t, sensors, 1, "Should have one sensor")
		sensorData := sensors[0].(map[string]interface{})
		assert.Equal(t, "Radar", sensorData["type"])
	})

	t.Run("POST /sensors - Success AIS", func(t *testing.T) {
		sensor := factory.CreateSensorModel()
		sensor.Type = "AIS"

		resp := httpHelper.MakeRequest(t, "POST", "/sensors", sensor)
		defer resp.Body.Close()

		AssertResponseStatus(t, resp, http.StatusOK)
		var sensors []interface{}
		AssertResponseJSON(t, resp, &sensors)

		assert.Len(t, sensors, 1, "Should have one sensor")
		sensorData := sensors[0].(map[string]interface{})
		assert.Equal(t, "AIS", sensorData["type"])
	})

	t.Run("POST /sensors - Unsupported Type", func(t *testing.T) {
		sensor := factory.CreateSensorModel()
		sensor.Type = "UnsupportedType"

		resp := httpHelper.MakeRequest(t, "POST", "/sensors", sensor)
		defer resp.Body.Close()

		// Should return error for unsupported type
		assert.NotEqual(t, http.StatusOK, resp.StatusCode)

		// Check response body for error message
		body, err := io.ReadAll(resp.Body)
		require.NoError(t, err)
		assert.Contains(t, string(body), "unsupported sensor type")
	})

	t.Run("POST /sensors - Missing Body", func(t *testing.T) {
		resp := httpHelper.MakeRequest(t, "POST", "/sensors", nil)
		defer resp.Body.Close()

		// Should handle gracefully
		assert.NotEqual(t, http.StatusOK, resp.StatusCode)
	})

	t.Run("POST /sensors - Invalid JSON", func(t *testing.T) {
		// Create request with invalid JSON
		req, err := http.NewRequest("POST", testApp.HTTPTestServer.URL+"/sensors",
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

	t.Run("POST /sensors - Auto-generate UID", func(t *testing.T) {
		sensor := factory.CreateSensorModel()
		sensor.UID = "" // Empty UID should be auto-generated

		resp := httpHelper.MakeRequest(t, "POST", "/sensors", sensor)
		defer resp.Body.Close()

		AssertResponseStatus(t, resp, http.StatusOK)
		var sensors []interface{}
		AssertResponseJSON(t, resp, &sensors)

		// Should have generated UID
		sensorData := sensors[0].(map[string]interface{})
		assert.NotEmpty(t, sensorData["uid"], "Should have generated UID")
		assert.NotEqual(t, "", sensorData["uid"], "UID should not be empty")
	})

	t.Run("PUT /sensors/:uid - Success", func(t *testing.T) {
		// First create a sensor
		sensor := factory.CreateSensorModel()
		sensor.Type = "GPS"

		// Create sensor via POST
		resp := httpHelper.MakeRequest(t, "POST", "/sensors", sensor)
		defer resp.Body.Close()

		var sensors []interface{}
		AssertResponseJSON(t, resp, &sensors)
		createdSensor := sensors[0].(map[string]interface{})
		sensorUID := createdSensor["uid"].(string)

		// Update the sensor
		updatedSensor := &model.SensorModel{
			UID:      sensorUID,
			Title:    "Updated Sensor",
			Type:     "GPS",
			Addr:     "192.168.1.100",
			Port:     9999,
			Interval: 30,
		}

		resp = httpHelper.MakeRequest(t, "PUT", "/sensors/"+sensorUID, updatedSensor)
		defer resp.Body.Close()

		AssertResponseStatus(t, resp, http.StatusOK)
		var updatedSensors []interface{}
		AssertResponseJSON(t, resp, &updatedSensors)

		// Verify the update
		assert.Len(t, updatedSensors, 1, "Should still have one sensor")
		updatedSensorData := updatedSensors[0].(map[string]interface{})
		assert.Equal(t, "Updated Sensor", updatedSensorData["title"])
		assert.Equal(t, "192.168.1.100", updatedSensorData["addr"])
		assert.Equal(t, 9999, int(updatedSensorData["port"].(float64)))
		assert.Equal(t, 30, int(updatedSensorData["interval"].(float64)))
	})

	t.Run("PUT /sensors/:uid - Missing UID", func(t *testing.T) {
		sensor := factory.CreateSensorModel()

		resp := httpHelper.MakeRequest(t, "PUT", "/sensors/", sensor)
		defer resp.Body.Close()

		// Should return bad request
		body, err := io.ReadAll(resp.Body)
		require.NoError(t, err)
		assert.Contains(t, string(body), "missing sensor UID")
	})

	t.Run("PUT /sensors/:uid - Not Found", func(t *testing.T) {
		nonExistentUID := "non-existent-sensor-" + CreateTestUID()
		sensor := &model.SensorModel{
			UID:      nonExistentUID,
			Title:    "Test Sensor",
			Type:     "GPS",
			Addr:     "localhost",
			Port:     2947,
			Interval: 10,
		}

		resp := httpHelper.MakeRequest(t, "PUT", "/sensors/"+nonExistentUID, sensor)
		defer resp.Body.Close()

		// Should return not found
		body, err := io.ReadAll(resp.Body)
		require.NoError(t, err)
		assert.Contains(t, string(body), "sensor with UID")
		assert.Contains(t, string(body), "not found")
	})

	t.Run("PUT /sensors/:uid - Unsupported Type", func(t *testing.T) {
		// First create a sensor
		sensor := factory.CreateSensorModel()
		sensor.Type = "GPS"

		resp := httpHelper.MakeRequest(t, "POST", "/sensors", sensor)
		defer resp.Body.Close()

		var sensors []interface{}
		AssertResponseJSON(t, resp, &sensors)
		createdSensor := sensors[0].(map[string]interface{})
		sensorUID := createdSensor["uid"].(string)

		// Try to update with unsupported type
		updatedSensor := &model.SensorModel{
			UID:      sensorUID,
			Title:    "Test Sensor",
			Type:     "UnsupportedType",
			Addr:     "localhost",
			Port:     2947,
			Interval: 10,
		}

		resp = httpHelper.MakeRequest(t, "PUT", "/sensors/"+sensorUID, updatedSensor)
		defer resp.Body.Close()

		// Should return error for unsupported type
		body, err := io.ReadAll(resp.Body)
		require.NoError(t, err)
		assert.Contains(t, string(body), "unsupported sensor type")
	})

	t.Run("DELETE /sensors/:uid - Success", func(t *testing.T) {
		// First create a sensor
		sensor := factory.CreateSensorModel()

		resp := httpHelper.MakeRequest(t, "POST", "/sensors", sensor)
		defer resp.Body.Close()

		var sensors []interface{}
		AssertResponseJSON(t, resp, &sensors)
		createdSensor := sensors[0].(map[string]interface{})
		sensorUID := createdSensor["uid"].(string)

		// Delete the sensor
		resp = httpHelper.MakeRequest(t, "DELETE", "/sensors/"+sensorUID, nil)
		defer resp.Body.Close()

		AssertResponseStatus(t, resp, http.StatusOK)
		var deletedSensors []interface{}
		AssertResponseJSON(t, resp, &deletedSensors)

		// Should be empty after deletion
		assert.Empty(t, deletedSensors, "Should be empty after deletion")
	})

	t.Run("DELETE /sensors/:uid - Not Found", func(t *testing.T) {
		nonExistentUID := "non-existent-sensor-" + CreateTestUID()

		resp := httpHelper.MakeRequest(t, "DELETE", "/sensors/"+nonExistentUID, nil)
		defer resp.Body.Close()

		// Should return not found
		body, err := io.ReadAll(resp.Body)
		require.NoError(t, err)
		assert.Contains(t, string(body), "sensor with UID")
		assert.Contains(t, string(body), "not found")
	})

	t.Run("Multiple sensors management", func(t *testing.T) {
		// Create multiple sensors
		sensor1 := factory.CreateSensorModel()
		sensor1.Type = "GPS"
		sensor1.Title = "GPS Sensor 1"

		sensor2 := factory.CreateSensorModel()
		sensor2.Type = "Radar"
		sensor2.Title = "Radar Sensor 1"

		sensor3 := factory.CreateSensorModel()
		sensor3.Type = "AIS"
		sensor3.Title = "AIS Sensor 1"

		// Add all sensors
		resp := httpHelper.MakeRequest(t, "POST", "/sensors", sensor1)
		defer resp.Body.Close()

		resp = httpHelper.MakeRequest(t, "POST", "/sensors", sensor2)
		defer resp.Body.Close()

		resp = httpHelper.MakeRequest(t, "POST", "/sensors", sensor3)
		defer resp.Body.Close()

		// Get all sensors
		resp = httpHelper.MakeRequest(t, "GET", "/sensors", nil)
		defer resp.Body.Close()

		var sensors []interface{}
		AssertResponseJSON(t, resp, &sensors)

		assert.Len(t, sensors, 3, "Should have 3 sensors")

		// Verify all sensors are present
		var foundGPS, foundRadar, foundAIS bool
		for _, sensorData := range sensors {
			sensor := sensorData.(map[string]interface{})
			switch sensor["type"] {
			case "GPS":
				foundGPS = true
				assert.Equal(t, "GPS Sensor 1", sensor["title"])
			case "Radar":
				foundRadar = true
				assert.Equal(t, "Radar Sensor 1", sensor["title"])
			case "AIS":
				foundAIS = true
				assert.Equal(t, "AIS Sensor 1", sensor["title"])
			}
		}

		assert.True(t, foundGPS, "Should find GPS sensor")
		assert.True(t, foundRadar, "Should find Radar sensor")
		assert.True(t, foundAIS, "Should find AIS sensor")
	})
}

// TestSensorsIntegration tests integration between sensors endpoints and internal state
func TestSensorsIntegration(t *testing.T) {
	testApp := CreateTestApp(t)
	defer testApp.CleanupTestApp(t)

	httpHelper := NewHTTPRequestHelper(testApp.HTTPTestServer.URL)
	validToken := "valid-test-token"
	httpHelper.SetAuthToken(validToken)

	factory := NewTestDataFactory()

	t.Run("End-to-end sensor workflow", func(t *testing.T) {
		// 1. Create a GPS sensor
		gpsSensor := factory.CreateSensorModel()
		gpsSensor.Type = "GPS"
		gpsSensor.Title = "Test GPS"

		resp := httpHelper.MakeRequest(t, "POST", "/sensors", gpsSensor)
		defer resp.Body.Close()

		var createResult []interface{}
		AssertResponseJSON(t, resp, &createResult)
		assert.Len(t, createResult, 1, "Should have one sensor")

		createdSensor := createResult[0].(map[string]interface{})
		sensorUID := createdSensor["uid"].(string)

		// 2. Verify sensor is in internal state
		assert.Len(t, testApp.App.sensors, 1, "Should have one sensor in app state")

		// 3. Update the sensor
		updatedSensor := &model.SensorModel{
			UID:      sensorUID,
			Title:    "Updated GPS",
			Type:     "GPS",
			Addr:     "192.168.1.100",
			Port:     9999,
			Interval: 30,
		}

		resp = httpHelper.MakeRequest(t, "PUT", "/sensors/"+sensorUID, updatedSensor)
		defer resp.Body.Close()

		var updateResult []interface{}
		AssertResponseJSON(t, resp, &updateResult)
		assert.Len(t, updateResult, 1, "Should still have one sensor")

		// 4. Verify the update
		updatedSensorData := updateResult[0].(map[string]interface{})
		assert.Equal(t, "Updated GPS", updatedSensorData["title"])
		assert.Equal(t, "192.168.1.100", updatedSensorData["addr"])

		// 5. Add another sensor
		radarSensor := factory.CreateSensorModel()
		radarSensor.Type = "Radar"
		radarSensor.Title = "Test Radar"

		resp = httpHelper.MakeRequest(t, "POST", "/sensors", radarSensor)
		defer resp.Body.Close()

		var addResult []interface{}
		AssertResponseJSON(t, resp, &addResult)
		assert.Len(t, addResult, 2, "Should have two sensors")

		// 6. Verify both sensors are in internal state
		assert.Len(t, testApp.App.sensors, 2, "Should have two sensors in app state")

		// 7. Delete the GPS sensor
		resp = httpHelper.MakeRequest(t, "DELETE", "/sensors/"+sensorUID, nil)
		defer resp.Body.Close()

		var deleteResult []interface{}
		AssertResponseJSON(t, resp, &deleteResult)
		assert.Len(t, deleteResult, 1, "Should have one sensor after deletion")

		// 8. Verify only radar sensor remains
		remainingSensor := deleteResult[0].(map[string]interface{})
		assert.Equal(t, "Radar", remainingSensor["type"])
		assert.Equal(t, "Test Radar", remainingSensor["title"])

		// 9. Verify internal state is updated
		assert.Len(t, testApp.App.sensors, 1, "Should have one sensor in app state after deletion")
	})

	t.Run("Sensor configuration persistence", func(t *testing.T) {
		// Create a sensor
		sensor := factory.CreateSensorModel()
		sensor.Type = "GPS"
		sensor.Title = "Persistent Sensor"

		resp := httpHelper.MakeRequest(t, "POST", "/sensors", sensor)
		defer resp.Body.Close()

		var result []interface{}
		AssertResponseJSON(t, resp, &result)

		// Verify sensor was added to config
		assert.Len(t, testApp.App.config.Sensors, 1, "Should have one sensor in config")

		// Verify sensor data in config
		configSensor := testApp.App.config.Sensors[0]
		assert.Equal(t, sensor.Title, configSensor.Title)
		assert.Equal(t, sensor.Type, configSensor.Type)
		assert.Equal(t, sensor.Addr, configSensor.Addr)
		assert.Equal(t, sensor.Port, configSensor.Port)
		assert.Equal(t, sensor.Interval, configSensor.Interval)
	})
}
