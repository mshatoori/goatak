package cot

import (
	"fmt"
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
	msg := BasicMsg("b-a-g", "ALARM."+unitUid[:8]+"."+drawingUid[:8], time.Hour)

	xd := NewXMLDetails()
	xd.AddLink(unitUid, "t-p-b")
	xd.AddLink(drawingUid, "t-p-f")
	msg.CotEvent.Detail = &cotproto.Detail{
		XmlDetail: xd.AsXMLString(),
	}

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
