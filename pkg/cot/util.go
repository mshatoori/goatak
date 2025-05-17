package cot

import (
	"fmt"
	"strconv"
	"time"

	"github.com/google/uuid"
	"github.com/kdudkov/goatak/pkg/cotproto"
)

const NotNum = 999999

func BasicMsg(typ string, uid string, stale time.Duration) *cotproto.TakMessage {
	return &cotproto.TakMessage{
		CotEvent: &cotproto.CotEvent{
			Type:      typ,
			Access:    "",
			Qos:       "",
			Opex:      "",
			Uid:       uid,
			SendTime:  TimeToMillis(time.Now()),
			StartTime: TimeToMillis(time.Now()),
			StaleTime: TimeToMillis(time.Now().Add(stale)),
			How:       "m-g",
			Lat:       0,
			Lon:       0,
			Hae:       NotNum,
			Ce:        NotNum,
			Le:        NotNum,
			Detail:    nil,
		},
	}
}

func MakePing(uid string) *cotproto.TakMessage {
	return BasicMsg("t-x-c-t", uid+"-ping", time.Second*10)
}

func MakePong() *cotproto.TakMessage {
	msg := BasicMsg("t-x-c-t-r", "takPong", time.Second*20)
	msg.CotEvent.How = "h-g-i-g-o"

	return msg
}

func MakeOfflineMsg(uid string, typ string) *cotproto.TakMessage {
	msg := BasicMsg("t-x-d-d", uuid.New().String(), time.Minute*3)
	msg.CotEvent.How = "h-g-i-g-o"
	xd := NewXMLDetails()
	xd.AddPpLink(uid, typ, "")
	msg.CotEvent.Detail = &cotproto.Detail{XmlDetail: xd.AsXMLString()}

	return msg
}

func MakeDpMsg(uid string, typ string, name string, lat float64, lon float64) *cotproto.TakMessage {
	msg := BasicMsg("b-m-p-s-p-i", uid+".SPI1", time.Second*20)
	msg.CotEvent.How = "h-e"
	msg.CotEvent.Lat = lat
	msg.CotEvent.Lon = lon
	xd := NewXMLDetails()
	xd.AddPpLink(uid, typ, "")
	msg.CotEvent.Detail = &cotproto.Detail{
		XmlDetail: xd.AsXMLString(),
		Contact:   &cotproto.Contact{Callsign: name},
	}

	return msg
}

func MakeAlarmMsg(unitUid string, drawingUid string) *cotproto.TakMessage {
	unitUidPart := unitUid
	if len(unitUidPart) > 8 {
		unitUidPart = unitUidPart[:8]
	}

	drawingUidPart := drawingUid
	if len(drawingUidPart) > 8 {
		drawingUidPart = drawingUidPart[:8]
	}

	msg := BasicMsg("b-a-g", "ALARM."+unitUidPart+"."+drawingUidPart, time.Hour)

	xd := NewXMLDetails()
	xd.AddLink(unitUid, "t-p-b")
	xd.AddLink(drawingUid, "t-p-f")
	msg.CotEvent.Detail = &cotproto.Detail{
		XmlDetail: xd.AsXMLString(),
	}

	return msg
}

func MakeCasevacMsg(uid string, lat, lon float64, remarks string, casevac bool, freq float64, urgent, priority, routine, litter, ambulatory, security, hlzMarking, usMilitary, usCivilian, nonusMilitary, nonusCivilian, epw, child int, hoist, ventilator, equipmentOther, terrainSlope, terrainRough bool, equipmentDetail, terrainSlopeDir, medlineRemarks, zoneProtSelection, zoneProtectedCoord, zoneProtMarker string) *cotproto.TakMessage {
	msg := BasicMsg("b-r-f-h-c", uid, time.Hour)
	msg.CotEvent.How = "h-g-i-g-o"
	msg.CotEvent.Lat = lat
	msg.CotEvent.Lon = lon

	xd := NewXMLDetails()
	if remarks != "" {
		xd.AddChild("remarks", nil, remarks)
	}

	medevacAttrs := map[string]string{
		"casevac":              fmt.Sprintf("%t", casevac),
		"freq":                 fmt.Sprintf("%f", freq),
		"urgent":               fmt.Sprintf("%d", urgent),
		"priority":             fmt.Sprintf("%d", priority),
		"routine":              fmt.Sprintf("%d", routine),
		"hoist":                fmt.Sprintf("%t", hoist),
		"ventilator":           fmt.Sprintf("%t", ventilator),
		"equipment_other":      fmt.Sprintf("%t", equipmentOther),
		"equipment_detail":     equipmentDetail,
		"litter":               fmt.Sprintf("%d", litter),
		"ambulatory":           fmt.Sprintf("%d", ambulatory),
		"security":             fmt.Sprintf("%d", security),
		"hlz_marking":          fmt.Sprintf("%d", hlzMarking),
		"us_military":          fmt.Sprintf("%d", usMilitary),
		"us_civilian":          fmt.Sprintf("%d", usCivilian),
		"nonus_military":       fmt.Sprintf("%d", nonusMilitary),
		"nonus_civilian":       fmt.Sprintf("%d", nonusCivilian),
		"epw":                  fmt.Sprintf("%d", epw),
		"child":                fmt.Sprintf("%d", child),
		"terrain_slope":        fmt.Sprintf("%t", terrainSlope),
		"terrain_rough":        fmt.Sprintf("%t", terrainRough),
		"terrain_slope_dir":    terrainSlopeDir,
		"medline_remarks":      medlineRemarks,
		"zone_prot_selection":  zoneProtSelection,
		"zone_protected_coord": zoneProtectedCoord,
		"zone_prot_marker":     zoneProtMarker,
	}

	// Add title separately as it's not always present in the sample, but is in the XML tag
	medevacAttrs["title"] = "MED." + time.Now().Format("060102.150405")

	obstacles := ""
	if terrainSlope {
		obstacles += "Sloping terrain to the " + terrainSlopeDir
	}
	if terrainRough {
		if obstacles != "" {
			obstacles += "\n"
		}
		obstacles += "Rough terrain"
	}
	if obstacles != "" {
		medevacAttrs["obstacles"] = obstacles
	}

	xd.AddChild("_medevac_", medevacAttrs, "")

	msg.CotEvent.Detail = &cotproto.Detail{XmlDetail: xd.AsXMLString()}

	return msg
}

func MakeFenceMsg(uid string, centerLat, centerLon, radius float64) *cotproto.TakMessage {
	msg := BasicMsg("u-d-f", uid, time.Hour*24)

	msg.CotEvent.Lat = centerLat
	msg.CotEvent.Lon = centerLon

	xd := NewXMLDetails()
	xd.AddChild("link", map[string]string{"point": fmt.Sprintf("%f,%f", centerLat-radius, centerLon-radius)}, "")
	xd.AddChild("link", map[string]string{"point": fmt.Sprintf("%f,%f", centerLat+radius, centerLon-radius)}, "")
	xd.AddChild("link", map[string]string{"point": fmt.Sprintf("%f,%f", centerLat+radius, centerLon+radius)}, "")
	xd.AddChild("link", map[string]string{"point": fmt.Sprintf("%f,%f", centerLat-radius, centerLon+radius)}, "")
	xd.AddChild("link", map[string]string{"point": fmt.Sprintf("%f,%f", centerLat-radius, centerLon-radius)}, "")

	xd.AddChild("__geofence", map[string]string{
		"trigger":  "Entry",
		"monitor":  "Hostile",
		"tracking": "true",
	}, "")

	msg.CotEvent.Detail = &cotproto.Detail{
		XmlDetail: xd.AsXMLString(),
	}

	return msg
}

func ParseFloat(s string) float64 {
	r, _ := strconv.ParseFloat(s, 64)
	return r
}

func ParseInt(s string) int {
	r, _ := strconv.ParseInt(s, 10, 64)
	return int(r)
}
