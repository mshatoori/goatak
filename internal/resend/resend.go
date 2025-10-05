package resend

import (
	"log/slog"
	"strconv"
	"strings"

	"github.com/kdudkov/goatak/internal/geo"
	"github.com/kdudkov/goatak/internal/repository"
	"github.com/kdudkov/goatak/pkg/cot"
	"github.com/kdudkov/goatak/pkg/model"
)

// Point represents a geographic coordinate
type Point struct {
	lat, lon float64
}

type NetworkAddress interface {
	IsBroadcast() bool
	GetIP() string
	GetURN() int32
}

// NodeNetworkAddress represents a single node/device network address
type NodeNetworkAddress struct {
	IP  string
	URN int32
}

func (n *NodeNetworkAddress) IsBroadcast() bool {
	return false
}

func (n *NodeNetworkAddress) GetIP() string {
	return n.IP
}

func (n *NodeNetworkAddress) GetURN() int32 {
	return n.URN
}

type SubnetNetworkAddress struct {
	SubnetIP string
}

func (s *SubnetNetworkAddress) IsBroadcast() bool {
	return true
}

func (s *SubnetNetworkAddress) GetIP() string {
	return s.SubnetIP
}

func (s *SubnetNetworkAddress) GetURN() int32 {
	return 16777215
}

// Filter interface represents a collection of predicates that are ANDed together
type Filter interface {
	AddPredicate(predicate Predicate)
	RemovePredicateAt(index int)
	GetPredicates() []Predicate
	Evaluate(msg *cot.CotMessage) bool
}

// Predicate interface represents a single condition for filtering
type Predicate interface {
	Evaluate(msg *cot.CotMessage) bool
	GetType() string
}

// ResendFilter implements the Filter interface
type ResendFilter struct {
	Predicates []Predicate
}

// AddPredicate adds a predicate to the filter
func (f *ResendFilter) AddPredicate(predicate Predicate) {
	f.Predicates = append(f.Predicates, predicate)
}

// RemovePredicateAt removes a predicate at the specified index
func (f *ResendFilter) RemovePredicateAt(index int) {
	if index >= 0 && index < len(f.Predicates) {
		f.Predicates = append(f.Predicates[:index], f.Predicates[index+1:]...)
	}
}

// GetPredicates returns all predicates in the filter
func (f *ResendFilter) GetPredicates() []Predicate {
	return f.Predicates
}

// Evaluate evaluates all predicates with AND logic
func (f *ResendFilter) Evaluate(msg *cot.CotMessage) bool {
	for _, predicate := range f.Predicates {
		if !predicate.Evaluate(msg) {
			return false
		}
	}
	return true
}

// ItemTypePredicate filters by item type (contact, unit, alert, point, polygon, route)
type ItemTypePredicate struct {
	ItemType string // "contact", "unit", "alert", "point", "polygon", "route"
}

// Evaluate checks if the CoT message matches the item type
func (p *ItemTypePredicate) Evaluate(msg *cot.CotMessage) bool {
	if msg == nil {
		return false
	}

	cotType := msg.GetType()
	switch p.ItemType {
	case "contact":
		// Contacts are units with endpoint information
		return msg.IsContact()
	case "unit":
		// Units are CoT messages starting with "a-" (atoms)
		return strings.HasPrefix(cotType, "a-")
	case "alert":
		// Alerts are CoT messages starting with "b-a-"
		return strings.HasPrefix(cotType, "b-a-")
	case "polygon":
		// Polygons are drawing polygons starting with "u-d-f"
		return strings.HasPrefix(cotType, "u-d-f")
	case "route":
		// Routes are user routes starting with "b-m-r"
		return strings.HasPrefix(cotType, "b-m-r")
	case "point":
		// Points are user points starting with "u-p-"
		return strings.HasPrefix(cotType, "b-m-")
	default:
		return false
	}
}

// GetType returns the predicate type
func (p *ItemTypePredicate) GetType() string {
	return "item_type"
}

// SidePredicate filters by side (friendly, hostile, neutral, unknown)
type SidePredicate struct {
	Side string // "friendly", "hostile", "neutral", "unknown"
}

// Evaluate checks if the CoT message matches the side
func (p *SidePredicate) Evaluate(msg *cot.CotMessage) bool {
	if msg == nil {
		return false
	}

	cotType := msg.GetType()

	switch p.Side {
	case "friendly":
		// Friendly units have CoT type starting with "a-f-"
		return strings.HasPrefix(cotType, "a-f-")
	case "hostile":
		// Hostile units have CoT type starting with "a-h-"
		return strings.HasPrefix(cotType, "a-h-")
	case "neutral":
		// Neutral could be "a-n-" or other non-friendly/hostile "a-" types
		return strings.HasPrefix(cotType, "a-n-") ||
			(strings.HasPrefix(cotType, "a-") &&
				!strings.HasPrefix(cotType, "a-u-") && !strings.HasPrefix(cotType, "a-f-") && //如果您使用的是Go 1.20及以上版本，可以使用这些更简洁的符号
				!strings.HasPrefix(cotType, "a-h-"))
	case "unknown":
		// Unknown could be determined by lack of specific classification
		return strings.HasPrefix(cotType, "a-u-")
	default:
		return false
	}
}

// GetType returns the predicate type
func (p *SidePredicate) GetType() string {
	return "side"
}

// UnitTypePredicate filters by unit type (air, ground, sea, space)
type UnitTypePredicate struct {
	UnitType string // "air", "ground", "sea", "space"
}

// Evaluate checks if the CoT message matches the unit type
func (p *UnitTypePredicate) Evaluate(msg *cot.CotMessage) bool {
	if msg == nil {
		return false
	}

	cotType := msg.GetType()

	// Only applicable to units (types starting with "a-")
	if !strings.HasPrefix(cotType, "a-") {
		return false
	}

	// CoT types follow MIL-STD-2525 where the third character indicates battle dimension
	if len(cotType) < 5 { // Need at least "a-x-y" format
		return false
	}

	battleDimension := string(cotType[4]) // Character at position 4 (0-indexed)

	switch p.UnitType {
	case "air":
		return battleDimension == "a" || battleDimension == "A"
	case "ground":
		return battleDimension == "g" || battleDimension == "G"
	case "sea":
		return battleDimension == "s" || battleDimension == "S" ||
			battleDimension == "n" || battleDimension == "N" // naval
	case "space":
		return battleDimension == "p" || battleDimension == "P" // space
	default:
		return false
	}
}

// GetType returns the predicate type
func (p *UnitTypePredicate) GetType() string {
	return "unit_type"
}

// LocationBoundaryPredicate filters by location boundary using polygons
type LocationBoundaryPredicate struct {
	PolygonID string
	items     repository.ItemsRepository
}

// Evaluate checks if the CoT message's location is within the polygon boundary
func (p *LocationBoundaryPredicate) Evaluate(msg *cot.CotMessage) bool {
	if msg == nil || p.items == nil {
		return false
	}

	lat, lon := msg.GetLatLon()
	if lat == 0 && lon == 0 {
		return false // No location data
	}

	// Get the polygon item by ID
	polygonItem := p.items.Get(p.PolygonID)
	if polygonItem == nil {
		return false // Polygon not found
	}

	// Extract polygon points from the item's CoT message
	polygonPoints := p.extractPolygonPoints(polygonItem)
	if len(polygonPoints) < 3 {
		return false // Not a valid polygon
	}

	// Extract lats and lons for IsPointInPolygon
	lats := make([]float64, len(polygonPoints))
	lons := make([]float64, len(polygonPoints))
	for i, point := range polygonPoints {
		lats[i] = point.lat
		lons[i] = point.lon
	}

	// Check if the point is inside the polygon
	return geo.IsPointInPolygon(lat, lon, lats, lons)
}

// GetType returns the predicate type
func (p *LocationBoundaryPredicate) GetType() string {
	return "location_boundary"
}

// extractPolygonPoints extracts polygon points from a drawing item's CoT message
func (p *LocationBoundaryPredicate) extractPolygonPoints(item *model.Item) []struct{ lat, lon float64 } {
	msg := item.GetMsg()
	if msg == nil {
		return nil
	}

	detail := msg.GetDetail()
	if detail == nil {
		return nil
	}

	// Get all link elements that contain drawing points
	links := detail.GetAll("link")
	if len(links) == 0 {
		return nil
	}

	var points []struct{ lat, lon float64 }

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

		points = append(points, struct{ lat, lon float64 }{lat, lon})
	}

	return points
}

type ResendConfig struct {
	UID         string
	Logger      *slog.Logger
	Source      NetworkAddress
	Destination NetworkAddress
	Filters     []Filter
}
