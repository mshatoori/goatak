# Distance Calculation API Implementation

## Overview

This document describes the implementation of backend API endpoints for calculating distances to complex map objects (routes and drawings/polygons) in the GoATAK system.

## API Endpoint

### GET /api/navigation/distance/{itemId}

Calculates the closest point and navigation data for complex objects.

**Parameters:**
- `itemId` (path parameter): The UID of the item to calculate distance to
- `userLat` (query parameter): User's latitude coordinate
- `userLon` (query parameter): User's longitude coordinate

**Response Format:**
```json
{
  "success": true,
  "data": {
    "closestPoint": {"lat": 12.345, "lon": 67.890},
    "distance": 1234.56,
    "bearing": 045.0,
    "itemType": "route|drawing|point"
  }
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Error message description"
}
```

## Implementation Details

### Distance Calculation Logic

The implementation handles three types of objects:

#### 1. Routes (`model.ROUTE`)
- Extracts coordinate points from `link` elements in the item's detail XML
- Parses coordinates from the `point` attribute (format: "lat,lon,elevation")
- Calculates distance to each route point
- For multi-segment routes, also calculates distance to line segments between points
- Returns the closest point found on the entire route path

#### 2. Drawings/Polygons (`model.DRAWING`)
- Similar to routes, extracts coordinates from `link` elements
- Calculates distance to each polygon vertex
- For polygons with multiple points, also calculates distance to polygon edges
- Uses modular arithmetic to handle polygon edge wrapping (last point connects to first)

#### 3. Simple Points (other types)
- Uses the item's primary coordinates directly
- Calculates straight-line distance and bearing

### Geometric Algorithms

#### Point-to-Line Segment Distance
The `closestPointOnSegment` function implements the standard algorithm for finding the closest point on a line segment:

1. Projects the user point onto the infinite line containing the segment
2. Calculates parameter `t` representing position along the segment (0 = start, 1 = end)
3. Clamps `t` to [0,1] to ensure the point stays on the segment
4. Returns the coordinates of the closest point

#### Distance and Bearing Calculation
Uses the existing `model.DistBea` function which implements the Haversine formula for:
- Great circle distance between two points on Earth
- Initial bearing from one point to another

### Data Access

The implementation accesses data through:
- `app.items.Get(itemId)` - Retrieves items from the repository
- `item.GetMsg().GetDetail()` - Accesses the item's detail XML structure
- `detail.GetAll("link")` - Extracts coordinate link elements
- `link.GetAttr("point")` - Gets coordinate strings from link attributes

### Error Handling

The API handles various error conditions:
- Missing or invalid item IDs (404 Not Found)
- Invalid user coordinates (400 Bad Request)
- Items with no coordinate data (500 Internal Server Error)
- Malformed coordinate strings (gracefully skipped)

### Performance Considerations

- **Coordinate Parsing**: Efficiently parses coordinate strings with error handling
- **Distance Calculations**: Uses optimized geometric algorithms
- **Memory Usage**: Processes coordinates incrementally without storing large arrays
- **Complexity Limits**: Naturally limited by the number of points in routes/drawings

## Integration Points

### Existing Systems
- **Item Repository**: Uses the existing `repository.ItemsRepository` interface
- **CoT Message Structure**: Leverages the existing `cot.CotMessage` and `cot.Node` XML parsing
- **Distance Functions**: Reuses the existing `model.DistBea` function
- **HTTP Framework**: Integrates with the existing `air` HTTP framework

### Authentication
The endpoint follows the same authentication patterns as other API endpoints in the system.

### Coordinate Systems
Uses the same WGS84 coordinate system and units (meters for distance, degrees for bearing) as the rest of the application.

## Usage Examples

### Calculate Distance to a Route
```bash
curl "http://localhost:8080/api/navigation/distance/route-123?userLat=35.7796&userLon=51.4211"
```

### Calculate Distance to a Drawing
```bash
curl "http://localhost:8080/api/navigation/distance/drawing-456?userLat=35.7796&userLon=51.4211"
```

### Frontend Integration
```javascript
async function getNavigationDistance(itemId, userLat, userLon) {
    const response = await fetch(
        `/api/navigation/distance/${itemId}?userLat=${userLat}&userLon=${userLon}`
    );
    const data = await response.json();
    
    if (data.success) {
        return {
            closestPoint: data.data.closestPoint,
            distance: data.data.distance,
            bearing: data.data.bearing,
            itemType: data.data.itemType
        };
    } else {
        throw new Error(data.error);
    }
}
```

## Testing

A test page (`test_distance_api.html`) is provided to manually test the API functionality. The test page allows:
- Input of item ID and user coordinates
- Real-time API testing
- Display of formatted results
- Error handling demonstration

## Future Enhancements

Potential improvements for future versions:
- **Caching**: Cache distance calculations for frequently accessed items
- **Batch Operations**: Support calculating distances to multiple items in one request
- **Advanced Geometries**: Support for more complex geometric shapes
- **Optimization**: Spatial indexing for very large routes/polygons
- **Precision**: Higher precision coordinate calculations for very long distances

## Files Modified

- `cmd/webclient/http_server.go`: Added the new API endpoint and distance calculation functions
- `test_distance_api.html`: Created test page for manual API testing
- `doc/distance_api_implementation.md`: This documentation file