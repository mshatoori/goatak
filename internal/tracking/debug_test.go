package tracking

import (
	"database/sql"
	"log/slog"
	"os"
	"testing"

	"github.com/kdudkov/goatak/internal/model"
	_ "modernc.org/sqlite"
)

func TestGetAllTrailsIssue(t *testing.T) {
	// Create in-memory SQLite database for testing
	db, err := sql.Open("sqlite", ":memory:")
	if err != nil {
		t.Fatalf("Failed to open test database: %v", err)
	}
	defer db.Close()

	// Create logger
	logger := slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelDebug}))

	// Create tracking service
	service := NewTrackingService(db, logger)

	// Create tracking tables
	if err := createTestTrackingTables(db); err != nil {
		t.Fatalf("Failed to create tracking tables: %v", err)
	}

	unitUID := "test-unit-123"

	// Add a position
	err = service.AddPosition(unitUID, 40.7128, -74.0060, 10.0, 5.5, 90.0)
	if err != nil {
		t.Fatalf("Failed to add position: %v", err)
	}

	// Update config to ensure tracking is enabled
	config := model.TrackingConfig{
		UnitUID:        unitUID,
		Enabled:        true,
		TrailLength:    25,
		UpdateInterval: 60,
		TrailColor:     "#00FF00",
		TrailWidth:     3,
	}

	err = service.UpdateConfig(unitUID, config)
	if err != nil {
		t.Fatalf("Failed to update config: %v", err)
	}

	// Test GetTrail directly first
	t.Logf("Testing GetTrail directly...")
	trail, err := service.GetTrail(unitUID, 10)
	if err != nil {
		t.Fatalf("GetTrail failed: %v", err)
	}
	t.Logf("GetTrail returned %d positions", len(trail))

	// Check if tables still exist
	var tableName string
	err = db.QueryRow("SELECT name FROM sqlite_master WHERE type='table' AND name='tracking_positions'").Scan(&tableName)
	if err != nil {
		t.Fatalf("tracking_positions table missing before GetAllTrails: %v", err)
	}
	t.Logf("tracking_positions table exists: %s", tableName)

	// Test GetAllTrails
	t.Logf("Testing GetAllTrails...")
	allTrails, err := service.GetAllTrails()
	if err != nil {
		t.Fatalf("GetAllTrails failed: %v", err)
	}
	t.Logf("GetAllTrails returned %d trails", len(allTrails))
}
