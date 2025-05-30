# GoATAK Coordinate and Navigation Analysis

## Current Coordinate Data Structures

### 1. Base Item Coordinate Structure
All map items in GoATAK follow a consistent coordinate structure defined in [`createMapItem()`](staticfiles/static/js/utils.js:518):

```javascript
const baseItem = {
  lat: options.lat || 0,        // Latitude in decimal degrees
  lon: options.lon || 0,        // Longitude in decimal degrees  
  hae: options.hae || 0,        // Height Above Ellipsoid in meters
  speed: options.speed || 0,    // Speed in m/s
  course: options.course || 0,  // Course/heading in degrees
  // ... other properties
};
```

### 2. Item Type Coordinate Usage

#### Units (UnitDetails.js)
- **Position**: `item.lat`, `item.lon` (decimal degrees)
- **Altitude**: `item.hae` (meters)
- **Movement**: `item.speed` (m/s), `item.course` (degrees)
- **Display**: Shows coordinates, speed (converted to km/h), altitude

#### Points (PointDetails.js)
- **Position**: `item.lat`, `item.lon` (decimal degrees)
- **Static**: No speed/course data
- **Display**: Shows coordinates only

#### Casevac Reports (CasevacDetails.js)
- **Position**: `item.lat`, `item.lon` (decimal degrees)
- **Static**: Location-based, no movement data
- **Display**: Shows coordinates in both view and edit modes

#### Drawings/Routes (DrawingDetails.js)
- **Center Position**: `item.lat`, `item.lon` (calculated centroid)
- **Geometry**: `item.links[]` array of "lat,lon" strings
- **Complex**: Multi-point geometries with calculated center

### 3. User Location Tracking

#### Current User Position
The user's position is tracked in the main [`app.config`](staticfiles/static/js/map.js:262) object:

```javascript
vm.config = {
  lat: data.lat,     // User latitude
  lon: data.lon,     // User longitude
  zoom: data.zoom,   // Map zoom level
  uid: data.uid,     // User identifier
  callsign: data.callsign
};
```

#### User Marker Management
- **Self Marker**: [`vm.me`](staticfiles/static/js/map.js:267) - RotatedMarker with course rotation
- **Info Marker**: [`vm.myInfoMarker`](staticfiles/static/js/map.js:290) - Shows callsign/IP/URN
- **Updates**: Position updated via [`processMe()`](staticfiles/static/js/map.js:538) from WebSocket

#### Mouse Cursor Tracking
Real-time cursor position tracked in [`app.coords`](staticfiles/static/js/map.js:731):

```javascript
mouseMove: function (e) {
  this.coords = e.latlng;  // Leaflet LatLng object
}
```

## Current Distance/Bearing Calculations

### 1. Core Calculation Function
The main distance/bearing calculation is implemented in [`Utils.distBea()`](staticfiles/static/js/utils.js:192):

```javascript
function distBea(p1, p2) {
  let toRadian = Math.PI / 180;
  
  // Bearing calculation using atan2
  let y = Math.sin((p2.lng - p1.lng) * toRadian) * Math.cos(p2.lat * toRadian);
  let x = Math.cos(p1.lat * toRadian) * Math.sin(p2.lat * toRadian) -
          Math.sin(p1.lat * toRadian) * Math.cos(p2.lat * toRadian) * 
          Math.cos((p2.lng - p1.lng) * toRadian);
  let brng = (Math.atan2(y, x) * 180) / Math.PI;
  brng += brng < 0 ? 360 : 0;  // Normalize to 0-360°
  
  // Distance calculation using Haversine formula
  let R = 6371000; // Earth radius in meters
  let deltaF = (p2.lat - p1.lat) * toRadian;
  let deltaL = (p2.lng - p1.lng) * toRadian;
  let a = Math.sin(deltaF / 2) * Math.sin(deltaF / 2) +
          Math.cos(p1.lat * toRadian) * Math.cos(p2.lat * toRadian) *
          Math.sin(deltaL / 2) * Math.sin(deltaL / 2);
  let c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  let distance = R * c;
  
  // Format output
  return (distance < 10000 
    ? distance.toFixed(0) + "m " 
    : (distance / 1000).toFixed(1) + "km ") + 
    brng.toFixed(1) + "°T";
}
```

### 2. Current Usage Patterns

#### In Detail Components
All detail components show distance/bearing to cursor position:

**UnitDetails.js** (lines 224-227):
```javascript
<span v-if="coords">
  ({{ Utils.distBea(Utils.latlng(item.lat, item.lon), coords) }} تا نشانگر)
</span>
```

**PointDetails.js** (lines 171-174):
```javascript
<span v-if="coords">
  ({{ Utils.distBea(Utils.latlng(item.lat, item.lon), coords) }} تا نشانگر)
</span>
```

**UserInfo.js** (lines 149-152):
```javascript
<span v-if="coords">
  ({{ Utils.distBea(Utils.latlng(config.lat, config.lon), coords) }} تا نشانگر)
</span>
```

#### Coordinate Formatting
Two coordinate display functions are available:

1. **Decimal Degrees**: [`Utils.printCoords(lat, lng)`](staticfiles/static/js/utils.js:184)
   ```javascript
   function printCoords(lat, lng) {
     return lat.toFixed(6) + "," + lng.toFixed(6);
   }
   ```

2. **ISO 6709 Format**: [`Utils.latLongToIso6709(lat, lon)`](staticfiles/static/js/utils.js:272)
   ```javascript
   // Returns: "35°35'25.27"N 51°23'45.67"E"
   ```

### 3. Coordinate System Standards

#### Input/Storage Format
- **Latitude/Longitude**: Decimal degrees (WGS84)
- **Altitude**: Meters above ellipsoid (HAE)
- **Bearing**: True bearing in degrees (0-360°)
- **Distance**: Meters (displayed as m/km based on magnitude)

#### Leaflet Integration
- **LatLng Objects**: Created via [`Utils.latlng(lat, lon)`](staticfiles/static/js/utils.js:188)
- **Map Coordinates**: Direct Leaflet coordinate system integration
- **Projections**: Handled automatically by Leaflet

## Integration Points for Navigation Features

### 1. Data Structure Extensions
To add navigation data to items, extend the base item structure:

```javascript
// Proposed navigation extension
const navigationData = {
  // Distance/bearing to user
  distanceToUser: 0,        // meters
  bearingToUser: 0,         // degrees true
  bearingFromUser: 0,       // degrees true
  
  // Distance/bearing to cursor
  distanceToCursor: 0,      // meters  
  bearingToCursor: 0,       // degrees true
  bearingFromCursor: 0,     // degrees true
  
  // Calculated fields
  lastCalculated: null,     // timestamp
  isStale: false           // calculation freshness
};
```

### 2. Calculation Integration Points

#### Real-time Updates
Hook into existing mouse movement handler in [`map.js:731`](staticfiles/static/js/map.js:731):

```javascript
mouseMove: function (e) {
  this.coords = e.latlng;
  // Add: Update navigation data for active item
  this.updateNavigationData();
}
```

#### User Position Updates
Hook into [`processMe()`](staticfiles/static/js/map.js:538) for user position changes:

```javascript
processMe: function (u) {
  // Existing position update code
  this.config.lat = u.lat;
  this.config.lon = u.lon;
  
  // Add: Recalculate navigation data for all items
  this.updateAllNavigationData();
}
```

### 3. Component Integration Strategy

#### Consistent Navigation Display
Create a reusable navigation component that can be included in all detail components:

```javascript
Vue.component("NavigationInfo", {
  props: ["item", "userPosition", "cursorPosition"],
  computed: {
    navigationData() {
      return this.calculateNavigation(this.item, this.userPosition, this.cursorPosition);
    }
  }
});
```

#### Template Integration
Add navigation sections to existing detail component templates:

```html
<!-- Add to UnitDetails.js, PointDetails.js, etc. -->
<div class="form-group row">
  <label class="col-sm-4 col-form-label font-weight-bold">
    <strong>ناوبری</strong>
  </label>
  <div class="col-sm-8">
    <navigation-info 
      :item="item" 
      :user-position="config" 
      :cursor-position="coords">
    </navigation-info>
  </div>
</div>
```

### 4. Performance Considerations

#### Calculation Frequency
- **Mouse Movement**: Throttle calculations to ~10Hz to avoid performance issues
- **User Position**: Calculate immediately on position updates
- **Batch Updates**: Update all visible items when user moves significantly

#### Caching Strategy
- **Cache Results**: Store calculated values with timestamps
- **Invalidation**: Recalculate when positions change beyond threshold
- **Selective Updates**: Only update navigation data for visible/active items

## Recommendations for Implementation

### 1. Extend Utils.distBea()
Create separate functions for different navigation calculations:

```javascript
// Enhanced navigation utilities
Utils.getDistance(p1, p2)      // Distance only
Utils.getBearing(p1, p2)       // Bearing only  
Utils.getNavigation(p1, p2)    // Complete navigation object
Utils.formatNavigation(navObj) // Formatted display string
```

### 2. Add Navigation State Management
Extend the store to track navigation preferences:

```javascript
store.state.navigation = {
  showBearing: true,
  showDistance: true,
  units: 'metric',           // metric/imperial
  bearingFormat: 'true',     // true/magnetic
  updateFrequency: 100       // milliseconds
};
```

### 3. Component Architecture
- **NavigationMixin**: Shared navigation calculation logic
- **NavigationDisplay**: Reusable display component
- **NavigationSettings**: User preference management

This analysis provides the foundation for implementing consistent navigation features across all GoATAK item types while leveraging the existing coordinate system and calculation infrastructure.