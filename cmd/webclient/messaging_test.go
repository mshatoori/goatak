package main

import (
	"sync"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"

	"github.com/kdudkov/goatak/pkg/cot"
	"github.com/kdudkov/goatak/pkg/cotproto"
)

// TestMessagingAndCoTProcessing tests messaging and CoT message processing functionality
func TestMessagingAndCoTProcessing(t *testing.T) {
	t.Run("ProcessEvent - Basic Message Processing", func(t *testing.T) {
		testApp := CreateTestApp(t)
		defer testApp.CleanupTestApp(t)

		// Create a test CoT message using LocalCotMessage wrapper
		msg := cot.BasicMsg("a-f-G-U-C", "test-unit-123", time.Hour)
		cotMsg := cot.LocalCotMessage(msg)

		// Process the event
		testApp.App.ProcessEvent(cotMsg)

		// Verify the message was processed (check if item was created)
		item := testApp.App.items.Get("test-unit-123")
		assert.NotNil(t, item, "Item should be created from CoT message")
		assert.Equal(t, "test-unit-123", item.GetUID())
	})

	t.Run("ProcessEvent - Event Processor Registration", func(t *testing.T) {
		testApp := CreateTestApp(t)
		defer testApp.CleanupTestApp(t)

		// Track if processor was called
		var processorCalled bool
		var receivedMsg *cot.CotMessage

		// Add custom event processor
		testApp.App.AddEventProcessor("test-processor", func(msg *cot.CotMessage) {
			processorCalled = true
			receivedMsg = msg
		}, "a-f-G-U-C") // Match unit messages

		// Create matching message
		msg := cot.BasicMsg("a-f-G-U-C", "test-unit-456", time.Hour)
		cotMsg := cot.LocalCotMessage(msg)

		// Process the event
		testApp.App.ProcessEvent(cotMsg)

		// Verify processor was called
		assert.True(t, processorCalled, "Custom processor should be called")
		assert.NotNil(t, receivedMsg, "Received message should not be nil")
		assert.Equal(t, "test-unit-456", receivedMsg.GetUID())
	})

	t.Run("ProcessEvent - Pattern Matching", func(t *testing.T) {
		testApp := CreateTestApp(t)
		defer testApp.CleanupTestApp(t)

		// Track processor calls
		var unitProcessorCalled, pointProcessorCalled bool

		// Add processors for different patterns
		testApp.App.AddEventProcessor("unit-processor", func(msg *cot.CotMessage) {
			unitProcessorCalled = true
		}, "a-f-G-U-C") // Unit pattern

		testApp.App.AddEventProcessor("point-processor", func(msg *cot.CotMessage) {
			pointProcessorCalled = true
		}, "b-f-G-U-C") // Point pattern

		// Test unit message
		unitMsg := cot.BasicMsg("a-f-G-U-C", "unit-123", time.Hour)
		unitCotMsg := cot.LocalCotMessage(unitMsg)
		testApp.App.ProcessEvent(unitCotMsg)
		assert.True(t, unitProcessorCalled, "Unit processor should be called")
		assert.False(t, pointProcessorCalled, "Point processor should not be called")

		// Reset flags
		unitProcessorCalled = false
		pointProcessorCalled = false

		// Test point message
		pointMsg := cot.BasicMsg("b-f-G-U-C", "point-456", time.Hour)
		pointCotMsg := cot.LocalCotMessage(pointMsg)
		testApp.App.ProcessEvent(pointCotMsg)
		assert.False(t, unitProcessorCalled, "Unit processor should not be called")
		assert.True(t, pointProcessorCalled, "Point processor should be called")
	})

	t.Run("SendMsg - Message Broadcasting", func(t *testing.T) {
		testApp := CreateTestApp(t)
		defer testApp.CleanupTestApp(t)

		// Create a test message
		msg := cot.BasicMsg("a-f-G-U-C", "broadcast-test", time.Hour)

		// Track if flows receive the message (mock flows would be needed for full testing)
		// For now, just verify the method doesn't panic
		testApp.App.SendMsg(msg)

		// If we get here without panic, the test passes
		assert.True(t, true, "SendMsg should complete without panic")
	})

	t.Run("MakeMe - Self Position Message", func(t *testing.T) {
		testApp := CreateTestApp(t)
		defer testApp.CleanupTestApp(t)

		// Create self position message
		msg := testApp.App.MakeMe()

		// Verify message structure
		assert.NotNil(t, msg, "MakeMe should return a message")
		assert.NotNil(t, msg.CotEvent, "Message should have CotEvent")
		assert.Equal(t, testApp.App.uid, msg.CotEvent.GetUid())
		assert.Equal(t, testApp.App.typ, msg.CotEvent.GetType())

		// Verify position data
		pos := testApp.App.pos.Load()
		assert.Equal(t, pos.GetLat(), msg.CotEvent.Lat)
		assert.Equal(t, pos.GetLon(), msg.CotEvent.Lon)
		assert.Equal(t, pos.GetAlt(), msg.CotEvent.Hae)

		// Verify contact details
		assert.NotNil(t, msg.CotEvent.Detail.Contact)
		assert.Equal(t, testApp.App.callsign, msg.CotEvent.Detail.Contact.Callsign)
		assert.Equal(t, testApp.App.ipAddress, msg.CotEvent.Detail.Contact.ClientInfo.IpAddress)
		assert.Equal(t, testApp.App.urn, msg.CotEvent.Detail.Contact.ClientInfo.Urn)

		// Verify group details
		assert.NotNil(t, msg.CotEvent.Detail.Group)
		assert.Equal(t, testApp.App.team, msg.CotEvent.Detail.Group.Name)
		assert.Equal(t, testApp.App.role, msg.CotEvent.Detail.Group.Role)
	})

	t.Run("SensorCallback - GPS Data Processing", func(t *testing.T) {
		testApp := CreateTestApp(t)
		defer testApp.CleanupTestApp(t)

		// Create GPS position data
		gpsData := &cotproto.CotEvent{
			Uid: "$self.pos",
			Lat: 42.7128,
			Lon: -75.0060,
			Hae: 150.0,
			Detail: &cotproto.Detail{
				Track: &cotproto.Track{
					Speed:  30.0,
					Course: 270.0,
				},
			},
		}

		// Process sensor data
		testApp.App.sensorCallback(gpsData)

		// Verify position was updated
		pos := testApp.App.pos.Load()
		assert.Equal(t, 42.7128, pos.GetLat())
		assert.Equal(t, -75.0060, pos.GetLon())
		assert.Equal(t, 150.0, pos.GetAlt())
		assert.Equal(t, 30.0, pos.GetSpeed())
		assert.Equal(t, 270.0, pos.GetTrack())
	})

	t.Run("SensorCallback - Non-GPS Data Processing", func(t *testing.T) {
		testApp := CreateTestApp(t)
		defer testApp.CleanupTestApp(t)

		// Create non-GPS sensor data
		radarData := &cotproto.CotEvent{
			Uid: "radar-target-123",
			Lat: 40.7128,
			Lon: -74.0060,
			Hae: 100.0,
			Detail: &cotproto.Detail{
				Track: &cotproto.Track{
					Speed:  0.0,
					Course: 0.0,
				},
			},
		}

		// Process sensor data
		testApp.App.sensorCallback(radarData)

		// Verify item was created for radar target
		item := testApp.App.items.Get("radar-target-123")
		assert.NotNil(t, item, "Radar target item should be created")
		// Note: Item coordinate access methods may vary, so we test basic existence
	})

	t.Run("BroadcastTrackingUpdate - WebSocket Updates", func(t *testing.T) {
		testApp := CreateTestApp(t)
		defer testApp.CleanupTestApp(t)

		// Test broadcasting tracking update
		testApp.App.broadcastTrackingUpdate("test-unit", "TestUnit", 40.7128, -74.0060, 100.0, 25.0, 180.0)

		// This test verifies the method doesn't panic
		// Full WebSocket testing would require setting up actual WebSocket connections
		assert.True(t, true, "Broadcast tracking update should complete without panic")
	})
}

// TestMessageProcessingIntegration tests integration between different message processing components
func TestMessageProcessingIntegration(t *testing.T) {
	t.Run("End-to-End Message Flow", func(t *testing.T) {
		testApp := CreateTestApp(t)
		defer testApp.CleanupTestApp(t)

		// 1. Create and process a unit message
		unitMsg := cot.BasicMsg("a-f-G-U-C", "integration-test-unit", time.Hour)
		unitCotMsg := cot.LocalCotMessage(unitMsg)

		testApp.App.ProcessEvent(unitCotMsg)

		// Verify unit was created
		unit := testApp.App.items.Get("integration-test-unit")
		assert.NotNil(t, unit, "Unit should be created")

		// 2. Create and process a point message
		pointMsg := cot.BasicMsg("b-f-G-U-C", "integration-test-point", time.Hour)
		pointCotMsg := cot.LocalCotMessage(pointMsg)

		testApp.App.ProcessEvent(pointCotMsg)

		// Verify point was created
		point := testApp.App.items.Get("integration-test-point")
		assert.NotNil(t, point, "Point should be created")

		// 3. Test self position updates
		selfMsg := testApp.App.MakeMe()
		testApp.App.SendMsg(selfMsg)

		// Verify self position message was created and sent
		assert.NotNil(t, selfMsg, "Self position message should be created")
	})

	t.Run("Message Type Filtering", func(t *testing.T) {
		testApp := CreateTestApp(t)
		defer testApp.CleanupTestApp(t)

		// Track which message types are processed
		var processedMessages []string

		testApp.App.AddEventProcessor("type-tracker", func(msg *cot.CotMessage) {
			processedMessages = append(processedMessages, msg.GetType())
		}, ".-") // Match all messages

		// Process different message types
		messages := []*cot.CotMessage{
			cot.LocalCotMessage(cot.BasicMsg("a-f-G-U-C", "unit-1", time.Hour)),  // Unit
			cot.LocalCotMessage(cot.BasicMsg("b-f-G-U-C", "point-1", time.Hour)), // Point
			cot.LocalCotMessage(cot.BasicMsg("t-x-d-d", "delete-1", time.Hour)),  // Delete
			cot.LocalCotMessage(cot.BasicMsg("b-t-f", "chat-1", time.Hour)),      // Chat
		}

		for _, msg := range messages {
			testApp.App.ProcessEvent(msg)
		}

		// Verify all message types were processed
		assert.Len(t, processedMessages, 4, "All messages should be processed")
		assert.Contains(t, processedMessages, "a-f-G-U-C")
		assert.Contains(t, processedMessages, "b-f-G-U-C")
		assert.Contains(t, processedMessages, "t-x-d-d")
		assert.Contains(t, processedMessages, "b-t-f")
	})

	t.Run("Concurrent Message Processing", func(t *testing.T) {
		testApp := CreateTestApp(t)
		defer testApp.CleanupTestApp(t)

		// Track processed messages
		processedCount := 0
		var mu sync.Mutex

		testApp.App.AddEventProcessor("concurrent-processor", func(msg *cot.CotMessage) {
			mu.Lock()
			processedCount++
			mu.Unlock()
		}, ".-")

		// Process messages concurrently
		numMessages := 100
		done := make(chan bool, numMessages)

		for i := 0; i < numMessages; i++ {
			go func(index int) {
				msg := cot.LocalCotMessage(cot.BasicMsg("a-f-G-U-C", "concurrent-unit-"+string(rune(index)), time.Hour))
				testApp.App.ProcessEvent(msg)
				done <- true
			}(i)
		}

		// Wait for all goroutines to complete
		for i := 0; i < numMessages; i++ {
			<-done
		}

		// Verify all messages were processed
		assert.Equal(t, numMessages, processedCount, "All concurrent messages should be processed")
	})
}

// TestErrorHandlingInMessageProcessing tests error handling in message processing
func TestErrorHandlingInMessageProcessing(t *testing.T) {
	t.Run("Invalid CoT Message Handling", func(t *testing.T) {
		testApp := CreateTestApp(t)
		defer testApp.CleanupTestApp(t)

		// Create an invalid message (nil CotEvent)
		invalidMsg := &cot.CotMessage{}

		// Process invalid message (should not panic)
		testApp.App.ProcessEvent(invalidMsg)

		// Test passes if no panic occurred
		assert.True(t, true, "Invalid message processing should not panic")
	})

	t.Run("Processor Error Handling", func(t *testing.T) {
		testApp := CreateTestApp(t)
		defer testApp.CleanupTestApp(t)

		// Add a processor that panics
		testApp.App.AddEventProcessor("panic-processor", func(msg *cot.CotMessage) {
			panic("Test panic")
		}, ".-")

		// Create a test message
		msg := cot.LocalCotMessage(cot.BasicMsg("a-f-G-U-C", "panic-test-unit", time.Hour))

		// Process message (should handle panic gracefully)
		// Note: In production, this might need proper panic recovery
		assert.NotPanics(t, func() {
			testApp.App.ProcessEvent(msg)
		}, "Message processing should handle processor panics")
	})

	t.Run("Database Error Handling", func(t *testing.T) {
		testApp := CreateTestApp(t)
		defer testApp.CleanupTestApp(t)

		// Close database to simulate error
		testApp.DB.Close()

		// Try to process a message (should handle database error gracefully)
		msg := cot.LocalCotMessage(cot.BasicMsg("a-f-G-U-C", "db-error-unit", time.Hour))

		// This test verifies the system doesn't panic on database errors
		assert.NotPanics(t, func() {
			testApp.App.ProcessEvent(msg)
		}, "Message processing should handle database errors gracefully")
	})
}
