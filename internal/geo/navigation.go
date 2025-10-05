package geo

import (
	"fmt"
	"math"
	"strconv"
	"strings"

	"github.com/kdudkov/goatak/pkg/model"
)

// NavigationResult represents the result of distance calculation
type NavigationResult struct {
	ClosestPoint struct {
		Lat float64 `json:"lat"`
		Lon float64 `json:"lon"`
	} `json:"closestPoint"`
	Distance float64 `json:"distance"`
	Bearing  float64 `json:"bearing"`
	ItemType string  `json:"itemType"`
}

// calculateNavigationDistance calculates the closest point and distance for complex objects
func CalculateNavigationDistance(item *model.Item, userLat, userLon float64) (*NavigationResult, error) {
	if item == nil {
		return nil, fmt.Errorf("item is nil")
	}

	itemClass := item.GetClass()
	result := &NavigationResult{
		ItemType: itemClass,
	}

	switch itemClass {
	case model.ROUTE:
		return calculateRouteDistance(item, userLat, userLon)
	case model.DRAWING:
		return calculateDrawingDistance(item, userLat, userLon)
	default:
		// For simple points, use the item's coordinates directly
		itemLat, itemLon := item.GetLanLon()
		if itemLat == 0 && itemLon == 0 {
			return nil, fmt.Errorf("item has no valid coordinates")
		}

		distance, bearing := model.DistBea(userLat, userLon, itemLat, itemLon)
		result.ClosestPoint.Lat = itemLat
		result.ClosestPoint.Lon = itemLon
		result.Distance = distance
		result.Bearing = bearing
		result.ItemType = "point"

		return result, nil
	}
}

// calculateRouteDistance finds the closest point on a route
func calculateRouteDistance(item *model.Item, userLat, userLon float64) (*NavigationResult, error) {
	msg := item.GetMsg()
	if msg == nil {
		return nil, fmt.Errorf("item has no message")
	}

	detail := msg.GetDetail()
	if detail == nil {
		return nil, fmt.Errorf("item has no detail")
	}

	// Get all link elements that contain route points
	links := detail.GetAll("link")
	if len(links) == 0 {
		return nil, fmt.Errorf("route has no link points")
	}

	var routePoints []struct {
		lat, lon float64
	}

	// Parse coordinates from link elements
	for _, link := range links {
		pointStr := link.GetAttr("point")
		if pointStr == "" {
			continue
		}

		// Parse point format: "lat,lon,elevation"
		coords := strings.Split(pointStr, ",")
		if len(coords) < 2 {
			continue
		}

		lat, err := strconv.ParseFloat(coords[0], 64)
		if err != nil {
			continue
		}

		lon, err := strconv.ParseFloat(coords[1], 64)
		if err != nil {
			continue
		}

		routePoints = append(routePoints, struct{ lat, lon float64 }{lat, lon})
	}

	if len(routePoints) == 0 {
		return nil, fmt.Errorf("route has no valid coordinate points")
	}

	// Find the closest point on the route
	minDistance := math.Inf(1)
	var closestLat, closestLon, bearing float64

	// Check distance to each route point
	for _, point := range routePoints {
		distance, bear := model.DistBea(userLat, userLon, point.lat, point.lon)
		if distance < minDistance {
			minDistance = distance
			closestLat = point.lat
			closestLon = point.lon
			bearing = bear
		}
	}

	// For routes with multiple segments, also check distance to line segments
	if len(routePoints) > 1 {
		for i := 0; i < len(routePoints)-1; i++ {
			p1 := routePoints[i]
			p2 := routePoints[i+1]

			// Find closest point on line segment
			segmentLat, segmentLon := closestPointOnSegment(userLat, userLon, p1.lat, p1.lon, p2.lat, p2.lon)
			distance, bear := model.DistBea(userLat, userLon, segmentLat, segmentLon)

			if distance < minDistance {
				minDistance = distance
				closestLat = segmentLat
				closestLon = segmentLon
				bearing = bear
			}
		}
	}

	return &NavigationResult{
		ClosestPoint: struct {
			Lat float64 `json:"lat"`
			Lon float64 `json:"lon"`
		}{closestLat, closestLon},
		Distance: minDistance,
		Bearing:  bearing,
		ItemType: "route",
	}, nil
}

// calculateDrawingDistance finds the closest point on a drawing/polygon
func calculateDrawingDistance(item *model.Item, userLat, userLon float64) (*NavigationResult, error) {
	msg := item.GetMsg()
	if msg == nil {
		return nil, fmt.Errorf("item has no message")
	}

	detail := msg.GetDetail()
	if detail == nil {
		return nil, fmt.Errorf("item has no detail")
	}

	// Get all link elements that contain drawing points
	links := detail.GetAll("link")
	if len(links) == 0 {
		return nil, fmt.Errorf("drawing has no link points")
	}

	var drawingPoints []struct {
		lat, lon float64
	}

	// Parse coordinates from link elements
	for _, link := range links {
		pointStr := link.GetAttr("point")
		if pointStr == "" {
			continue
		}

		// Parse point format: "lat,lon,elevation"
		coords := strings.Split(pointStr, ",")
		if len(coords) < 2 {
			continue
		}

		lat, err := strconv.ParseFloat(coords[0], 64)
		if err != nil {
			continue
		}

		lon, err := strconv.ParseFloat(coords[1], 64)
		if err != nil {
			continue
		}

		drawingPoints = append(drawingPoints, struct{ lat, lon float64 }{lat, lon})
	}

	if len(drawingPoints) == 0 {
		return nil, fmt.Errorf("drawing has no valid coordinate points")
	}

	// For polygons with 3 or more points, check if user is inside
	if len(drawingPoints) > 2 {
		// Extract lats and lons for IsPointInPolygon
		lats := make([]float64, len(drawingPoints))
		lons := make([]float64, len(drawingPoints))
		for i, p := range drawingPoints {
			lats[i] = p.lat
			lons[i] = p.lon
		}

		if IsPointInPolygon(userLat, userLon, lats, lons) {
			// User is inside the polygon, return zero distance
			return &NavigationResult{
				ClosestPoint: struct {
					Lat float64 `json:"lat"`
					Lon float64 `json:"lon"`
				}{userLat, userLon},
				Distance: 0,
				Bearing:  0,
				ItemType: "drawing",
			}, nil
		}
	}

	// Find the closest point on the drawing perimeter
	minDistance := math.Inf(1)
	var closestLat, closestLon, bearing float64

	// Check distance to each drawing point
	for _, point := range drawingPoints {
		distance, bear := model.DistBea(userLat, userLon, point.lat, point.lon)
		if distance < minDistance {
			minDistance = distance
			closestLat = point.lat
			closestLon = point.lon
			bearing = bear
		}
	}

	// For polygons, also check distance to edges
	if len(drawingPoints) > 2 {
		for i := 0; i < len(drawingPoints); i++ {
			p1 := drawingPoints[i]
			p2 := drawingPoints[(i+1)%len(drawingPoints)] // Wrap around for polygon

			// Find closest point on line segment
			segmentLat, segmentLon := closestPointOnSegment(userLat, userLon, p1.lat, p1.lon, p2.lat, p2.lon)
			distance, bear := model.DistBea(userLat, userLon, segmentLat, segmentLon)

			if distance < minDistance {
				minDistance = distance
				closestLat = segmentLat
				closestLon = segmentLon
				bearing = bear
			}
		}
	}

	return &NavigationResult{
		ClosestPoint: struct {
			Lat float64 `json:"lat"`
			Lon float64 `json:"lon"`
		}{closestLat, closestLon},
		Distance: minDistance,
		Bearing:  bearing,
		ItemType: "drawing",
	}, nil
}

// closestPointOnSegment finds the closest point on a line segment to a given point
func closestPointOnSegment(userLat, userLon, lat1, lon1, lat2, lon2 float64) (float64, float64) {
	// Convert to a simple 2D coordinate system for calculation
	// This is an approximation suitable for small distances

	// Vector from point 1 to point 2
	dx := lon2 - lon1
	dy := lat2 - lat1

	// Vector from point 1 to user
	px := userLon - lon1
	py := userLat - lat1

	// Calculate the parameter t for the closest point on the line
	// t = 0 means closest to point 1, t = 1 means closest to point 2
	segmentLengthSquared := dx*dx + dy*dy

	if segmentLengthSquared == 0 {
		// Degenerate case: the segment is a point
		return lat1, lon1
	}

	t := (px*dx + py*dy) / segmentLengthSquared

	// Clamp t to [0, 1] to stay on the segment
	if t < 0 {
		t = 0
	} else if t > 1 {
		t = 1
	}

	// Calculate the closest point
	closestLat := lat1 + t*dy
	closestLon := lon1 + t*dx

	return closestLat, closestLon
}

// IsPointInPolygon determines if a point is inside a polygon using the ray casting algorithm
func IsPointInPolygon(userLat, userLon float64, lats, lons []float64) bool {
	if len(lats) != len(lons) || len(lats) < 3 {
		return false // Not a valid polygon
	}

	x, y := userLon, userLat
	inside := false

	p1x, p1y := lons[0], lats[0]
	for i := 1; i <= len(lats); i++ {
		p2x, p2y := lons[i%len(lats)], lats[i%len(lats)]

		if y > math.Min(p1y, p2y) {
			if y <= math.Max(p1y, p2y) {
				if x <= math.Max(p1x, p2x) {
					var xinters float64
					if p1y != p2y {
						xinters = (y-p1y)*(p2x-p1x)/(p2y-p1y) + p1x
					}
					if p1x == p2x || x <= xinters {
						inside = !inside
					}
				}
			}
		}
		p1x, p1y = p2x, p2y
	}

	return inside
}
