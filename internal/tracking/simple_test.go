package tracking

import (
	"database/sql"
	"log/slog"
	"os"
	"testing"

	_ "modernc.org/sqlite"
)

func TestSimpleDatabase(t *testing.T) {
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

	// Create table directly
	createTableSQL := `CREATE TABLE IF NOT EXISTS tracking_positions (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		unit_uid TEXT NOT NULL,
		latitude REAL NOT NULL,
		longitude REAL NOT NULL,
		altitude REAL,
		speed REAL,
		course REAL,
		timestamp DATETIME NOT NULL,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);`

	_, err = db.Exec(createTableSQL)
	if err != nil {
		t.Fatalf("Failed to create table: %v", err)
	}

	// Test direct insert
	_, err = db.Exec("INSERT INTO tracking_positions (unit_uid, latitude, longitude, timestamp) VALUES (?, ?, ?, ?)",
		"test-123", 40.7128, -74.0060, "2025-06-02 00:00:00")
	if err != nil {
		t.Fatalf("Failed to insert directly: %v", err)
	}

	// Test direct query
	var count int
	err = db.QueryRow("SELECT COUNT(*) FROM tracking_positions").Scan(&count)
	if err != nil {
		t.Fatalf("Failed to query directly: %v", err)
	}
	t.Logf("Direct query count: %d", count)

	// Test service query
	trail, err := service.GetTrail("test-123", 10)
	if err != nil {
		t.Fatalf("Service query failed: %v", err)
	}
	t.Logf("Service query returned %d positions", len(trail))
}
