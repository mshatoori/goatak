package main

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/aofei/air"
	"github.com/google/uuid"
	"github.com/kdudkov/goatak/internal/authclient"
	"github.com/kdudkov/goatak/internal/client"
	"github.com/kdudkov/goatak/internal/model"
	"github.com/kdudkov/goatak/internal/tracking"
	"github.com/kdudkov/goatak/internal/wshandler"
	"github.com/kdudkov/goatak/pkg/cot"
	"github.com/kdudkov/goatak/pkg/cotproto"
	"github.com/kdudkov/goatak/pkg/model"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"modernc.org/sqlite"
)

// TestApp provides a complete test application instance for testing
type TestApp struct {
	App           *App
	DB            *sql.DB
	AuthClient    *MockAuthClient
	TrackingSvc   *tracking.TrackingService
	Logger        *slog.Logger
	WSHandler     *wshandler.Handler
	HTTPTestServer *httptest.Server
	TempDir       string
}

// MockAuthClient provides a mock authentication client for testing
type MockAuthClient struct {
	mu       sync.RWMutex
	tokens   map[string]bool
	users    map[string]*model.User
}

func NewMockAuthClient() *MockAuthClient {
	return &MockAuthClient{
		tokens: make(map[string]bool),
		users:  make(map[string]*model.User),
	}
}

func (m *MockAuthClient) ValidateToken(token string) (*model.User, bool, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	// Remove "Bearer " prefix if present
	if strings.HasPrefix(token, "Bearer ") {
		token = token[7:]
	}

	if valid, exists := m.tokens[token]; exists && valid {
		// Return a mock user
		return &model.User{
			ID:       "test-user-id",
			Username: "testuser",
			Role:     "admin",
		}, true, nil
	}

	return nil, false, fmt.Errorf("invalid token")
}

func (m *MockAuthClient) AddToken(token string) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.tokens[token] = true
}

func (m *MockAuthClient) InvalidateToken(token string) {
	m.mu.Lock()
	defer m.mu.Unlock()
	delete(m.tokens, token)
}

// CreateTestApp creates a complete test application with all necessary components
func CreateTestApp(t *testing.T) *TestApp {
	t.Helper()

	// Create temporary directory for test files
	tempDir, err := os.MkdirTemp("", "goatak-test-*")
	require.NoError(t, err)

	// Create logger
	logger := slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{
		Level: slog.LevelDebug,
	}))

	// Create in-memory SQLite database
	db, err := sql.Open("sqlite", ":memory:")
	require.NoError(t, err)

	// Create mock auth client
	authClient := NewMockAuthClient()
	validToken := "valid-test-token"
	authClient.AddToken(validToken)

	// Create tracking service
	trackingSvc := tracking.NewTrackingService(db, logger)

	// Create test app
	app := &App{
		uid:            "test-uid-" + uuid.NewString()[:8],
		typ:            "a-f-G-U-C",
		callsign:       "TestUnit",
		team:           "Blue",
		role:           "HQ",
		ipAddress:      "127.0.0.1",
		urn:            12345,
		zoom:           12,
		pos:            &sync.Map{},
		items:          model.NewItems(),
		flows:          make([]client.CoTFlow, 0),
		sensors:        make([]any, 0),
		alarms:         make([]string, 0),
		eventProcessors: make([]*EventProcessor, 0),
		selfPosEventMutators: &sync.Map{},
		chatMessages:   model.NewChatMessages(),
		authClient:     authClient,
		trackingService: trackingSvc,
		logger:         logger,
		configManager:  NewConfigManager("", logger),
		changeCb:       wshandler.NewChangeCallback(),
		deleteCb:       wshandler.NewDeleteCallback(),
		chatCb:         wshandler.NewChatCallback(),
		trackingUpdateCb: wshandler.NewTrackingUpdateCallback(),
	}

	// Initialize position
	app.pos.Store(model.NewPos(40.7128, -74.0060))

	// Create HTTP server
	httpSrv := NewHttp(app, ":0") // Use :0 to get random available port

	// Create test server
	testServer := httptest.NewServer(httpSrv)

	// Create database tables
	err = createTestDatabaseTables(db)
	require.NoError(t, err)

	return &TestApp{
		App:            app,
		DB:             db,
		AuthClient:     authClient,
		TrackingSvc:    trackingSvc,
		Logger:         logger,
		HTTPTestServer: testServer,
		TempDir:        tempDir,
	}
}

// CleanupTestApp cleans up test resources
func (ta *TestApp) CleanupTestApp(t *testing.T) {
	t.Helper()

	if ta.HTTPTestServer != nil {
		ta.HTTPTestServer.Close()
	}

	if ta.DB != nil {
		ta.DB.Close()
	}

	if ta.TempDir != "" {
		os.RemoveAll(ta.TempDir)
	}
}

// createTestDatabaseTables creates all necessary database tables for testing
func createTestDatabaseTables(db *sql.DB) error {
	// Create resend tables
	if err := createResendTables(db); err != nil {
		return fmt.Errorf("failed to create resend tables: %w", err)
	}

	// Create tracking tables
	if err := createTrackingTables(db); err != nil {
		return fmt.Errorf("failed to create tracking tables: %w", err)
	}

	return nil
}

// HTTPRequestHelper provides helper methods for making HTTP requests in tests
type HTTPRequestHelper struct {
	BaseURL   string
	AuthToken string
	Client    *http.Client
}

func NewHTTPRequestHelper(baseURL string) *HTTPRequestHelper {
	return &HTTPRequestHelper{
		BaseURL: baseURL,
		Client:  &http.Client{},
	}
}

func (h *HTTPRequestHelper) SetAuthToken(token string) {
	h.AuthToken = token
}

func (h *HTTPRequestHelper) MakeRequest(t *testing.T, method, path string, body interface{}) *http.Response {
	t.Helper()

	var reqBody io.Reader
	if body != nil {
		jsonBody, err := json.Marshal(body)
		require.NoError(t, err)
		reqBody = bytes.NewReader(jsonBody)
	}

	req, err := http.NewRequest(method, h.BaseURL+path, reqBody)
	require.NoError(t, err)

	if h.AuthToken != "" {
		req.Header.Set("Authorization", "Bearer "+h.AuthToken)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := h.Client.Do(req)
	require.NoError(t, err)

	return resp
}

func (h *HTTPRequestHelper) GetJSON(t *testing.T, path string, result interface{}) {
	t.Helper()

	resp := h.MakeRequest(t, "GET", path, nil)
	defer resp.Body.Close()

	assert.Equal(t, http.StatusOK, resp.StatusCode)

	err := json.NewDecoder(resp.Body).Decode(result)
	require.NoError(t, err)
}

func (h *HTTPRequestHelper) PostJSON(t *testing.T, path string, body, result interface{}) {
	t.Helper()

	resp := h.MakeRequest(t, "POST", path, body)
	defer resp.Body.Close()

	assert.Equal(t, http.StatusOK, resp.StatusCode)

	if result != nil {
		err := json.NewDecoder(resp.Body).Decode(result)
		require.NoError(t, err)
	}
}

func (h *HTTPRequestHelper) PutJSON(t *testing.T, path string, body, result interface{}) {
	t.Helper()

	resp := h.MakeRequest(t, "PUT", path, body)
	defer resp.Body.Close()

	assert.Equal(t, http.StatusOK, resp.StatusCode)

	if result != nil {
		err := json.NewDecoder(resp.Body).Decode(result)
		require.NoError(t, err)
	}
}

func (h *HTTPRequestHelper) Delete(t *testing.T, path string) {
	t.Helper()

	resp := h.MakeRequest(t, "DELETE", path, nil)
	defer resp.Body.Close()

	assert.Equal(t, http.StatusOK, resp.StatusCode)
}

// TestDataFactory provides factory methods for creating test data
type TestDataFactory struct{}

func NewTestDataFactory() *TestDataFactory {
	return &TestDataFactory{}
}

func (f *TestDataFactory) CreateWebUnit() *model.WebUnit {
	return &model.WebUnit{
		UID:       "test-unit-" + uuid.NewString()[:8],
		Type:      "a-f-G-U-C",
		Callsign:  "TestUnit",
		Lat:       40.7128,
		Lon:       -74.0060,
		Send:      true,
		SendMode:  "broadcast",
		SendToAll: true,
	}
}

func (f *TestDataFactory) CreateChatMessage() *model.ChatMessage {
	return &model.ChatMessage{
		ID:       uuid.NewString(),
		From:     "test-user",
		To:       "all",
		Message:  "Test message",
		Time:     time.Now(),
		Chatroom: "all",
	}
}

func (f *TestDataFactory) CreateSensorModel() *model.SensorModel {
	return &model.SensorModel{
		UID:      "test-sensor-" + uuid.NewString()[:8],
		Title:    "Test Sensor",
		Type:     "GPS",
		Addr:     "localhost",
		Port:     2947,
		Interval: 10,
	}
}

func (f *TestDataFactory) CreateFlowConfig() *FlowConfig {
	return &FlowConfig{
		UID:       "test-flow-" + uuid.NewString()[:8],
		Title:     "Test Flow",
		Addr:      "127.0.0.1",
		Port:      8087,
		Type:      "udp",
		Direction: int(client.BOTH),
	}
}

func (f *TestDataFactory) CreateCotMessage() *cot.CotMessage {
	return cot.BasicMsg("a-f-G-U-C", "test-uid-"+uuid.NewString()[:8], time.Hour)
}

func (f *TestDataFactory) CreateTrackingConfig() *model.TrackingConfig {
	return &model.TrackingConfig{
		UnitUID:        "test-unit-" + uuid.NewString()[:8],
		Enabled:        true,
		TrailLength:    50,
		UpdateInterval: 30,
		TrailColor:     "#FF0000",
		TrailWidth:     2,
	}
}

// Assertion helpers for common test patterns
func AssertResponseStatus(t *testing.T, resp *http.Response, expectedStatus int) {
	t.Helper()
	assert.Equal(t, expectedStatus, resp.StatusCode, "Expected status %d, got %d", expectedStatus, resp.StatusCode)
}

func AssertResponseJSON(t *testing.T, resp *http.Response, result interface{}) {
	t.Helper()
	assert.Equal(t, "application/json", resp.Header.Get("Content-Type"))

	err := json.NewDecoder(resp.Body).Decode(result)
	require.NoError(t, err)
}

func AssertCORSHeaders(t *testing.T, resp *http.Response) {
	t.Helper()
	assert.Equal(t, "*", resp.Header.Get("Access-Control-Allow-Origin"))
	assert.Contains(t, resp.Header.Get("Access-Control-Allow-Methods"), "GET")
	assert.Contains(t, resp.Header.Get("Access-Control-Allow-Methods"), "POST")
	assert.Contains(t, resp.Header.Get("Access-Control-Allow-Methods"), "PUT")
	assert.Contains(t, resp.Header.Get("Access-Control-Allow-Methods"), "DELETE")
	assert.Contains(t, resp.Header.Get("Access-Control-Allow-Methods"), "OPTIONS")
}

// WaitForCondition waits for a condition to be true with timeout
func WaitForCondition(t *testing.T, condition func() bool, timeout time.Duration, message string) {
	t.Helper()

	ctx, cancel := context.WithTimeout(context.Background(), timeout)
	defer cancel()

	for {
		if condition() {
			return
		}

		select {
		case <-ctx.Done():
			t.Fatalf("Timeout waiting for condition: %s", message)
		case <-time.After(10 * time.Millisecond):
			// Continue checking
		}
	}
}

// CreateTestUID generates a unique test UID
func CreateTestUID() string {
	return "test-" + uuid.NewString()[:8]
}