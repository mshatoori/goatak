# TrackingManager Implementation

This document describes the TrackingManager JavaScript class and related components for map integration and trail visualization in the GoATAK web client.

## Overview

The TrackingManager provides comprehensive trail management functionality including:

- Adding/updating/removing trails on Leaflet maps
- Trail rendering with customizable colors, widths, and lengths
- Real-time trail updates via WebSocket integration
- Trail data management and caching
- Performance optimization for large trail datasets

## Components

### 1. TrackingManager.js

The core class that manages trail visualization on Leaflet maps.

**Key Features:**

- Trail data storage and management
- Leaflet polyline rendering
- Real-time updates with performance optimization
- Trail configuration management
- Data export/import functionality
- Automatic cleanup of old trail data

**Usage:**

```javascript
// Initialize TrackingManager
const trackingManager = new TrackingManager(map, {
  trailLength: 50,
  trailColor: "#FF0000",
  trailWidth: 2,
  trailOpacity: 0.7,
});

// Add a trail
trackingManager.addTrail("unit-123", positions, config);

// Update trail with new position
trackingManager.updateTrail("unit-123", {
  lat: 35.7,
  lon: 51.4,
  timestamp: new Date().toISOString(),
});

// Remove trail
trackingManager.removeTrail("unit-123");
```

### 2. TrackingControl.js

Vue component providing global tracking controls and trail management UI.

**Features:**

- Global tracking enable/disable
- Default trail settings configuration
- Active trails list with statistics
- Trail export/import functionality
- Advanced settings panel

**Usage:**

```html
<tracking-control :map="map" :tracking-manager="trackingManager">
</tracking-control>
```

### 3. UnitTrackingControl.js

Vue component for unit-specific tracking controls.

**Features:**

- Per-unit tracking enable/disable
- Trail appearance configuration
- Trail statistics display
- Individual trail export/clear functions

**Usage:**

```html
<unit-tracking-control :unit="unit" :tracking-manager="trackingManager">
</unit-tracking-control>
```

## Integration

### Map.js Integration

The TrackingManager is integrated into the main Vue app in `map.js`:

```javascript
// Initialize TrackingManager
this.trackingManager = new TrackingManager(this.map, {
  trailLength: 50,
  trailColor: "#FF0000",
  trailWidth: 2,
  trailOpacity: 0.7,
});

// WebSocket message handling
if (u.type === "tracking_update" && this.trackingManager) {
  this.trackingManager.handleTrackingUpdate(u);
}
```

### UnitDetails Integration

The UnitTrackingControl component is integrated into UnitDetails:

```html
<unit-tracking-control
  v-if="!editing && item.category === 'unit'"
  :unit="item"
  :tracking-manager="$parent.trackingManager"
>
</unit-tracking-control>
```

## API Reference

### TrackingManager Methods

#### `addTrail(unitUid, positions, config)`

Add a new trail to the map.

- `unitUid`: Unique identifier for the unit
- `positions`: Array of position objects `{lat, lon, timestamp}`
- `config`: Trail configuration options

#### `updateTrail(unitUid, newPosition)`

Update existing trail with new position.

- `unitUid`: Unique identifier for the unit
- `newPosition`: New position object `{lat, lon, timestamp}`

#### `removeTrail(unitUid)`

Remove trail from map.

- `unitUid`: Unique identifier for the unit

#### `setTrailConfig(unitUid, config)`

Update trail configuration.

- `unitUid`: Unique identifier for the unit
- `config`: New configuration options

#### `clearAllTrails()`

Clear all trails from map.

#### `handleTrackingUpdate(data)`

Handle WebSocket tracking update message.

- `data`: WebSocket message data

#### `exportTrailData(unitUid, format)`

Export trail data for a unit.

- `unitUid`: Unique identifier for the unit
- `format`: Export format ('json', 'csv', 'gpx')

#### `importTrailData(unitUid, data, format)`

Import trail data for a unit.

- `unitUid`: Unique identifier for the unit
- `data`: Import data
- `format`: Import format ('json', 'csv')

### Configuration Options

```javascript
const config = {
  enabled: true, // Enable/disable trail
  trailLength: 50, // Maximum number of trail points
  trailColor: "#FF0000", // Trail color
  trailWidth: 2, // Trail line width
  trailOpacity: 0.7, // Trail opacity
  updateInterval: 30000, // Update interval in milliseconds
  maxAge: 24 * 60 * 60 * 1000, // Maximum age for trail data
  smoothUpdates: true, // Enable smooth trail updates
};
```

## WebSocket Integration

The TrackingManager expects WebSocket messages in the following format:

```javascript
{
  type: 'tracking_update',
  unit_uid: 'unit-123',
  latitude: 35.7,
  longitude: 51.4,
  timestamp: '2023-12-07T10:30:00Z',
  speed: 15.5,
  course: 270
}
```

## Performance Considerations

### Update Optimization

- Trail updates are queued and processed using `requestAnimationFrame`
- Multiple updates for the same unit are batched
- Trail length is limited to prevent memory issues

### Memory Management

- Automatic cleanup of old trail data
- Trail data is limited by `maxAge` configuration
- Cleanup runs every 5 minutes by default

### Rendering Optimization

- Leaflet polylines are reused when possible
- Trail smoothing can be disabled for better performance
- CSS transitions provide smooth visual updates

## Styling

Trail-specific CSS classes are available for customization:

```css
.tracking-trail {
  cursor: pointer;
  transition: opacity 0.3s ease;
}

.tracking-trail:hover {
  opacity: 1 !important;
}

.tracking-trail.updating {
  animation: trailUpdate 0.5s ease-in-out;
}
```

## Demo and Testing

Use the `tracking-demo.js` file for testing and demonstration:

```javascript
// Initialize demo
TrackingDemo.initDemo();

// Available demo commands
trackingDemo.addRandomTrail(); // Add random trail
trackingDemo.clearDemo(); // Clear all demo trails
trackingDemo.startSimulation(); // Start real-time updates
trackingDemo.stopSimulation(); // Stop real-time updates
trackingDemo.exportDemo(); // Export demo data
trackingDemo.showStats(); // Show trail statistics
```

## Error Handling

The TrackingManager includes comprehensive error handling:

- Invalid parameters are logged and ignored
- Missing trail data is handled gracefully
- WebSocket connection issues don't affect existing trails
- Export/import errors are caught and reported

## Browser Compatibility

The TrackingManager is compatible with:

- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

## Future Enhancements

Planned features for future versions:

- Historical trail playback
- Trail filtering by time/date
- Geofencing integration
- Advanced trail analysis
- WebGL rendering for large datasets
- Real-time collaboration features

## Troubleshooting

### Common Issues

1. **Trails not appearing**: Check that TrackingManager is properly initialized and trail data is valid
2. **Performance issues**: Reduce trail length or disable smooth updates
3. **Memory usage**: Enable automatic cleanup and reduce maxAge setting
4. **WebSocket updates not working**: Verify message format and connection status

### Debug Mode

Enable debug logging:

```javascript
trackingManager.debugMode = true;
```

This will log all trail operations to the console for troubleshooting.
