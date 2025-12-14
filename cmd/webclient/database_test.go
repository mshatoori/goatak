package main

import (
	"database/sql"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// TestDatabaseOperations tests database initialization and operations
func TestDatabaseOperations(t *testing.T) {
	t.Run("Database Initialization", func(t *testing.T) {
		// Create in-memory SQLite database
		db, err := sql.Open("sqlite", ":memory:")
		require.NoError(t, err)
		defer db.Close()

		// Test database connection
		err = db.Ping()
		require.NoError(t, err, "Database should be reachable")

		// Test creating tables
		err = createResendTables(db)
		require.NoError(t, err, "Should create resend tables without error")

		// Verify tables were created
		var tableCount int
		err = db.QueryRow("SELECT COUNT(*) FROM sqlite_master WHERE type='table'").Scan(&tableCount)
		require.NoError(t, err)
		assert.Greater(t, tableCount, 0, "Should have created tables")
	})

	t.Run("Resend Tables Creation", func(t *testing.T) {
		db, err := sql.Open("sqlite", ":memory:")
		require.NoError(t, err)
		defer db.Close()

		err = createResendTables(db)
		require.NoError(t, err)

		// Verify resend_configs table
		var exists int
		err = db.QueryRow("SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='resend_configs'").Scan(&exists)
		require.NoError(t, err)
		assert.Equal(t, 1, exists, "resend_configs table should exist")

		// Verify resend_filters table
		err = db.QueryRow("SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='resend_filters'").Scan(&exists)
		require.NoError(t, err)
		assert.Equal(t, 1, exists, "resend_filters table should exist")

		// Verify resend_predicates table
		err = db.QueryRow("SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='resend_predicates'").Scan(&exists)
		require.NoError(t, err)
		assert.Equal(t, 1, exists, "resend_predicates table should exist")
	})

	t.Run("Tracking Tables Creation", func(t *testing.T) {
		// Note: createTrackingTables is a method on App struct, not available as standalone function
		// This test would need to be implemented using the full App initialization
		t.Skip("createTrackingTables requires App instance - implement with full test setup")
	})

	t.Run("Resend Config Database Operations", func(t *testing.T) {
		db, err := sql.Open("sqlite", ":memory:")
		require.NoError(t, err)
		defer db.Close()

		err = createResendTables(db)
		require.NoError(t, err)

		// Create test config
		config := &ResendConfigDTO{
			UID:     "test-config-123",
			Name:    "Test Configuration",
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
					ID: "filter-1",
					Predicates: []PredicateDTO{
						{
							Type:  "type",
							Value: "a-f-G-U-C",
						},
					},
				},
			},
		}

		// Test save operation
		err = saveResendConfigToDatabase(db, config)
		require.NoError(t, err, "Should save config without error")

		// Verify config was saved
		var count int
		err = db.QueryRow("SELECT COUNT(*) FROM resend_configs WHERE uid = ?", config.UID).Scan(&count)
		require.NoError(t, err)
		assert.Equal(t, 1, count, "Config should be saved in database")

		// Verify filter was saved
		err = db.QueryRow("SELECT COUNT(*) FROM resend_filters WHERE config_uid = ?", config.UID).Scan(&count)
		require.NoError(t, err)
		assert.Equal(t, 1, count, "Filter should be saved")

		// Verify predicate was saved
		err = db.QueryRow("SELECT COUNT(*) FROM resend_predicates WHERE filter_id IN (SELECT id FROM resend_filters WHERE config_uid = ?)", config.UID).Scan(&count)
		require.NoError(t, err)
		assert.Equal(t, 1, count, "Predicate should be saved")

		// Test update operation
		config.Name = "Updated Configuration"
		config.Enabled = false
		err = updateResendConfigInDatabase(db, config)
		require.NoError(t, err, "Should update config without error")

		// Verify update
		var name string
		var enabled bool
		err = db.QueryRow("SELECT name, enabled FROM resend_configs WHERE uid = ?", config.UID).Scan(&name, &enabled)
		require.NoError(t, err)
		assert.Equal(t, "Updated Configuration", name)
		assert.Equal(t, false, enabled)

		// Test delete operation
		err = deleteResendConfigFromDatabase(db, config.UID)
		require.NoError(t, err, "Should delete config without error")

		// Verify deletion
		err = db.QueryRow("SELECT COUNT(*) FROM resend_configs WHERE uid = ?", config.UID).Scan(&count)
		require.NoError(t, err)
		assert.Equal(t, 0, count, "Config should be deleted")

		// Verify cascade deletion of filters and predicates
		err = db.QueryRow("SELECT COUNT(*) FROM resend_filters WHERE config_uid = ?", config.UID).Scan(&count)
		require.NoError(t, err)
		assert.Equal(t, 0, count, "Filters should be cascade deleted")

		err = db.QueryRow("SELECT COUNT(*) FROM resend_predicates WHERE filter_id IN (SELECT id FROM resend_filters WHERE config_uid = ?)", config.UID).Scan(&count)
		require.NoError(t, err)
		assert.Equal(t, 0, count, "Predicates should be cascade deleted")
	})

	t.Run("Transaction Rollback on Error", func(t *testing.T) {
		db, err := sql.Open("sqlite", ":memory:")
		require.NoError(t, err)
		defer db.Close()

		err = createResendTables(db)
		require.NoError(t, err)

		// Create a config that will cause an error (duplicate UID)
		config1 := &ResendConfigDTO{
			UID:     "duplicate-test",
			Name:    "First Config",
			Enabled: true,
			Destination: &NetworkAddressDTO{
				Type: "udp",
				IP:   "192.168.1.100",
				URN:  12345,
			},
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		}

		config2 := &ResendConfigDTO{
			UID:     "duplicate-test", // Same UID
			Name:    "Second Config",
			Enabled: false,
			Destination: &NetworkAddressDTO{
				Type: "udp",
				IP:   "192.168.1.200",
				URN:  54321,
			},
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		}

		// Save first config successfully
		err = saveResendConfigToDatabase(db, config1)
		require.NoError(t, err)

		// Try to save second config with same UID (should fail)
		err = saveResendConfigToDatabase(db, config2)
		require.Error(t, err, "Should fail due to duplicate UID")

		// Verify only one config exists (transaction should rollback)
		var count int
		err = db.QueryRow("SELECT COUNT(*) FROM resend_configs WHERE uid = 'duplicate-test'").Scan(&count)
		require.NoError(t, err)
		assert.Equal(t, 1, count, "Should still have only one config after rollback")
	})

	t.Run("Complex Filter and Predicate Operations", func(t *testing.T) {
		db, err := sql.Open("sqlite", ":memory:")
		require.NoError(t, err)
		defer db.Close()

		err = createResendTables(db)
		require.NoError(t, err)

		// Create config with multiple filters and predicates
		config := &ResendConfigDTO{
			UID:     "complex-test",
			Name:    "Complex Configuration",
			Enabled: true,
			Destination: &NetworkAddressDTO{
				Type: "udp",
				IP:   "192.168.1.100",
				URN:  12345,
			},
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
			Filters: []FilterDTO{
				{
					ID: "filter-1",
					Predicates: []PredicateDTO{
						{Type: "type", Value: "a-f-G-U-C"},
						{Type: "callsign", Value: "TestUnit"},
					},
				},
				{
					ID: "filter-2",
					Predicates: []PredicateDTO{
						{Type: "type", Value: "a-f-G-P"},
						{Type: "team", Value: "Blue"},
					},
				},
			},
		}

		// Save complex config
		err = saveResendConfigToDatabase(db, config)
		require.NoError(t, err)

		// Verify multiple filters
		var filterCount int
		err = db.QueryRow("SELECT COUNT(*) FROM resend_filters WHERE config_uid = ?", config.UID).Scan(&filterCount)
		require.NoError(t, err)
		assert.Equal(t, 2, filterCount, "Should have 2 filters")

		// Verify multiple predicates
		var predicateCount int
		err = db.QueryRow("SELECT COUNT(*) FROM resend_predicates WHERE filter_id IN (SELECT id FROM resend_filters WHERE config_uid = ?)", config.UID).Scan(&predicateCount)
		require.NoError(t, err)
		assert.Equal(t, 4, predicateCount, "Should have 4 predicates")

		// Update with different filter structure
		config.Filters = []FilterDTO{
			{
				ID: "filter-3",
				Predicates: []PredicateDTO{
					{Type: "type", Value: "a-f-G-A"},
				},
			},
		}

		err = updateResendConfigInDatabase(db, config)
		require.NoError(t, err)

		// Verify old filters/predicates were deleted and new ones added
		err = db.QueryRow("SELECT COUNT(*) FROM resend_filters WHERE config_uid = ?", config.UID).Scan(&filterCount)
		require.NoError(t, err)
		assert.Equal(t, 1, filterCount, "Should have 1 filter after update")

		err = db.QueryRow("SELECT COUNT(*) FROM resend_predicates WHERE filter_id IN (SELECT id FROM resend_filters WHERE config_uid = ?)", config.UID).Scan(&predicateCount)
		require.NoError(t, err)
		assert.Equal(t, 1, predicateCount, "Should have 1 predicate after update")
	})

	t.Run("Database Constraints and Validation", func(t *testing.T) {
		db, err := sql.Open("sqlite", ":memory:")
		require.NoError(t, err)
		defer db.Close()

		err = createResendTables(db)
		require.NoError(t, err)

		// Test foreign key constraint
		_, err = db.Exec("INSERT INTO resend_filters (id, config_uid) VALUES (?, ?)", "orphan-filter", "non-existent-config")
		require.Error(t, err, "Should fail due to foreign key constraint")

		// Test NOT NULL constraint
		_, err = db.Exec("INSERT INTO resend_configs (uid, name, destination_type, destination_ip) VALUES (?, ?, ?, ?)", "", "", "udp", "192.168.1.100")
		require.Error(t, err, "Should fail due to NOT NULL constraint")

		// Test valid insertion
		_, err = db.Exec("INSERT INTO resend_configs (uid, name, destination_type, destination_ip, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
			"valid-test", "Valid Config", "udp", "192.168.1.100", time.Now(), time.Now())
		require.NoError(t, err, "Should succeed with valid data")
	})
}

// TestDatabasePerformance tests database performance characteristics
func TestDatabasePerformance(t *testing.T) {
	t.Run("Bulk Insert Performance", func(t *testing.T) {
		db, err := sql.Open("sqlite", ":memory:")
		require.NoError(t, err)
		defer db.Close()

		err = createResendTables(db)
		require.NoError(t, err)

		// Create multiple configs for performance testing
		numConfigs := 100
		start := time.Now()

		for i := 0; i < numConfigs; i++ {
			config := &ResendConfigDTO{
				UID:     "perf-test-" + string(rune(i)),
				Name:    "Performance Test Config " + string(rune(i)),
				Enabled: true,
				Destination: &NetworkAddressDTO{
					Type: "udp",
					IP:   "192.168.1.100",
					URN:  12345,
				},
				CreatedAt: time.Now(),
				UpdatedAt: time.Now(),
			}

			err = saveResendConfigToDatabase(db, config)
			require.NoError(t, err)
		}

		elapsed := time.Since(start)
		t.Logf("Inserted %d configs in %v", numConfigs, elapsed)

		// Verify all configs were inserted
		var count int
		err = db.QueryRow("SELECT COUNT(*) FROM resend_configs WHERE uid LIKE 'perf-test-%'").Scan(&count)
		require.NoError(t, err)
		assert.Equal(t, numConfigs, count, "All configs should be inserted")
	})

	t.Run("Query Performance", func(t *testing.T) {
		db, err := sql.Open("sqlite", ":memory:")
		require.NoError(t, err)
		defer db.Close()

		err = createResendTables(db)
		require.NoError(t, err)

		// Insert test data
		for i := 0; i < 50; i++ {
			config := &ResendConfigDTO{
				UID:     "query-test-" + string(rune(i)),
				Name:    "Query Test Config " + string(rune(i)),
				Enabled: i%2 == 0, // Alternate enabled/disabled
				Destination: &NetworkAddressDTO{
					Type: "udp",
					IP:   "192.168.1.100",
					URN:  12345,
				},
				CreatedAt: time.Now(),
				UpdatedAt: time.Now(),
			}

			err = saveResendConfigToDatabase(db, config)
			require.NoError(t, err)
		}

		// Test query performance
		start := time.Now()

		rows, err := db.Query("SELECT uid, name, enabled FROM resend_configs WHERE uid LIKE 'query-test-%' ORDER BY name")
		require.NoError(t, err)
		defer rows.Close()

		var configs []struct {
			UID, Name string
			Enabled   bool
		}
		for rows.Next() {
			var config struct {
				UID, Name string
				Enabled   bool
			}
			err = rows.Scan(&config.UID, &config.Name, &config.Enabled)
			require.NoError(t, err)
			configs = append(configs, config)
		}

		elapsed := time.Since(start)
		t.Logf("Queried %d configs in %v", len(configs), elapsed)

		assert.Equal(t, 50, len(configs), "Should retrieve all configs")
	})
}

// TestDatabaseConcurrency tests database operations under concurrent access
func TestDatabaseConcurrency(t *testing.T) {
	t.Run("Concurrent Reads and Writes", func(t *testing.T) {
		db, err := sql.Open("sqlite", ":memory:")
		require.NoError(t, err)
		defer db.Close()

		err = createResendTables(db)
		require.NoError(t, err)

		// Create initial config
		config := &ResendConfigDTO{
			UID:     "concurrent-test",
			Name:    "Concurrent Test",
			Enabled: true,
			Destination: &NetworkAddressDTO{
				Type: "udp",
				IP:   "192.168.1.100",
				URN:  12345,
			},
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		}

		err = saveResendConfigToDatabase(db, config)
		require.NoError(t, err)

		// Perform concurrent operations
		done := make(chan bool, 4)

		// Concurrent read
		go func() {
			for i := 0; i < 10; i++ {
				var name string
				err := db.QueryRow("SELECT name FROM resend_configs WHERE uid = ?", config.UID).Scan(&name)
				require.NoError(t, err)
				assert.Equal(t, config.Name, name)
			}
			done <- true
		}()

		// Concurrent update
		go func() {
			for i := 0; i < 10; i++ {
				config.Name = "Updated " + string(rune(i))
				err := updateResendConfigInDatabase(db, config)
				require.NoError(t, err)
			}
			done <- true
		}()

		// Concurrent insert
		go func() {
			for i := 0; i < 10; i++ {
				newConfig := &ResendConfigDTO{
					UID:     "concurrent-insert-" + string(rune(i)),
					Name:    "Concurrent Insert " + string(rune(i)),
					Enabled: true,
					Destination: &NetworkAddressDTO{
						Type: "udp",
						IP:   "192.168.1.100",
						URN:  12345,
					},
					CreatedAt: time.Now(),
					UpdatedAt: time.Now(),
				}
				err := saveResendConfigToDatabase(db, newConfig)
				require.NoError(t, err)
			}
			done <- true
		}()

		// Concurrent delete
		go func() {
			for i := 0; i < 5; i++ {
				err := deleteResendConfigFromDatabase(db, "concurrent-insert-"+string(rune(i)))
				require.NoError(t, err)
			}
			done <- true
		}()

		// Wait for all goroutines to complete
		for i := 0; i < 4; i++ {
			<-done
		}

		// Verify final state
		var count int
		err = db.QueryRow("SELECT COUNT(*) FROM resend_configs WHERE uid LIKE 'concurrent-%'").Scan(&count)
		require.NoError(t, err)
		assert.Equal(t, 5, count, "Should have 5 remaining concurrent configs")
	})
}
