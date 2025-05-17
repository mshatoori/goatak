package model

import (
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"

	"github.com/kdudkov/goatak/pkg/cot"
	"github.com/kdudkov/goatak/pkg/cotproto"
)

type WebUnit struct {
	UID            string            `json:"uid"`
	Callsign       string            `json:"callsign"`
	Category       string            `json:"category"`
	Scope          string            `json:"scope"`
	Team           string            `json:"team"`
	Role           string            `json:"role"`
	Time           time.Time         `json:"time"`
	LastSeen       time.Time         `json:"last_seen"`
	StaleTime      time.Time         `json:"stale_time"`
	StartTime      time.Time         `json:"start_time"`
	SendTime       time.Time         `json:"send_time"`
	Type           string            `json:"type"`
	Lat            float64           `json:"lat"`
	Lon            float64           `json:"lon"`
	Hae            float64           `json:"hae"`
	Speed          float64           `json:"speed"`
	Course         float64           `json:"course"`
	Sidc           string            `json:"sidc"`
	TakVersion     string            `json:"tak_version"`
	Device         string            `json:"device"`
	Status         string            `json:"status"`
	Text           string            `json:"text"`
	Color          string            `json:"color"`
	Icon           string            `json:"icon"`
	ParentCallsign string            `json:"parent_callsign"`
	ParentUID      string            `json:"parent_uid"`
	Local          bool              `json:"local"`
	Send           bool              `json:"send"`
	Missions       []string          `json:"missions"`
	IPAddress      string            `json:"ip_address"`
	URN            int32             `json:"urn"`
	WebSensor      string            `json:"web_sensor"`
	SensorData     map[string]string `json:"sensor_data"`
	Links          []string          `json:"links"`
	By             string            `json:"by"`
	From           string            `json:"from"`
	Geofence       bool              `json:"geofence"`
	GeofenceAff    string            `json:"geofence_aff"`

	CasevacDetail *CasevacDetail `json:"casevac_detail,omitempty"`
}

type CasevacDetail struct {
	Title string `json:"title,omitempty"`
	Casevac bool `json:"casevac"`
	Freq float64 `json:"freq"`
	Urgent int `json:"urgent"`
	Priority int `json:"priority"`
	Routine int `json:"routine"`
	Hoist bool `json:"hoist"`
	Ventilator bool `json:"ventilator"`
	EquipmentOther bool `json:"equipment_other"`
	EquipmentDetail string `json:"equipment_detail,omitempty"`
	Litter int `json:"litter"`
	Ambulatory int `json:"ambulatory"`
	Security int `json:"security"`
	HlzMarking int `json:"hlz_marking"`
	UsMilitary int `json:"us_military"`
	UsCivilian int `json:"us_civilian"`
	NonusMilitary int `json:"nonus_military"`
	NonusCivilian int `json:"nonus_civilian"`
	Epw int `json:"epw"`
	Child int `json:"child"`
	TerrainSlope bool `json:"terrain_slope"`
	TerrainRough bool `json:"terrain_rough"`
	Obstacles string `json:"obstacles,omitempty"`
	TerrainSlopeDir string `json:"terrain_slope_dir,omitempty"`
	MedlineRemarks string `json:"medline_remarks,omitempty"`
	ZoneProtSelection string `json:"zone_prot_selection,omitempty"`
	ZoneProtectedCoord string `json:"zone_protected_coord,omitempty"`
	ZoneProtMarker string `json:"zone_prot_marker,omitempty"`
}

type Contact struct {
	UID          string `json:"uid"`
	Callsign     string `json:"callsign"`
	Team         string `json:"team"`
	Role         string `json:"role"`
	Takv         string `json:"takv"`
	Notes        string `json:"notes"`
	FilterGroups string `json:"filterGroups"`
}

type DigitalPointer struct {
	Lat  float64 `json:"lat"`
	Lon  float64 `json:"lon"`
	Name string  `json:"name"`
}

type CoTFlow struct {
	Title string `json:"title"`
	Addr  string `json:"addr"`
	Port  int    `json:"port,omitempty"`
	UID   string `json:"uid"`
	//Outgoing bool   `json:"outgoing"`
	Direction    int    `json:"direction"`
	Type         string `json:"type,omitempty"`
	SendExchange string `json:"sendExchange,omitempty"`
	RecvQueue    string `json:"recvQueue,omitempty"`
}

type SensorModel struct {
	Title string `json:"title"`
	// TODO: Change Addr & Port with a general config map
	Addr string `json:"addr"`

	Port int    `json:"port"`
	UID  string `json:"uid"`
	Type string `json:"type"`

	Interval int `json:"interval"`
}

type SendItemDest struct {
	Addr string `json:"ipAddress"`
	URN  int    `json:"urn"`
}

func (i *Item) ToWeb() *WebUnit {
	i.mx.RLock()
	defer i.mx.RUnlock()

	msg := i.msg

	if msg == nil {
		return nil
	}

	evt := msg.GetTakMessage().GetCotEvent()

	parentUID, parentCallsign := msg.GetParent()

	allSensorData := make(map[string]string)

	webSensor := ""
	for _, sensorData := range evt.GetDetail().GetSensorData() {
		if sensorData.GetSensorName() == "WEB" {
			webSensor = sensorData.GetValue()
		}
		allSensorData[sensorData.GetSensorName()] = sensorData.GetValue()
	}

	w := &WebUnit{
		UID:            i.uid,
		Category:       i.class,
		Scope:          msg.Scope,
		Callsign:       msg.GetCallsign(),
		Time:           cot.TimeFromMillis(evt.GetSendTime()),
		LastSeen:       i.lastSeen,
		StaleTime:      msg.GetStaleTime(),
		StartTime:      msg.GetStartTime(),
		SendTime:       msg.GetSendTime(),
		Type:           msg.GetType(),
		Lat:            evt.GetLat(),
		Lon:            evt.GetLon(),
		Hae:            evt.GetHae(),
		Speed:          evt.GetDetail().GetTrack().GetSpeed(),
		Course:         evt.GetDetail().GetTrack().GetCourse(),
		Team:           evt.GetDetail().GetGroup().GetName(),
		Role:           evt.GetDetail().GetGroup().GetRole(),
		Sidc:           getSIDC(msg.GetType()),
		ParentUID:      parentUID,
		ParentCallsign: parentCallsign,
		Color:          msg.GetColor(),
		Icon:           msg.GetIconsetPath(),
		Missions:       msg.GetDetail().GetDestMission(),
		Local:          i.local,
		Send:           i.send,
		Text:           msg.GetDetail().GetFirst("remarks").GetText(),
		TakVersion:     "",
		Status:         "",
		IPAddress:      evt.GetDetail().GetContact().GetClientInfo().GetIpAddress(),
		URN:            evt.GetDetail().GetContact().GetClientInfo().GetUrn(),
		WebSensor:      webSensor,
		SensorData:     allSensorData,
		Geofence:       msg.IsGeofenceActive(),
		GeofenceAff:    msg.GetGeofenceAff(),
	}

	if i.class == REPORT && strings.HasPrefix(i.GetType(), "b-r-f-h-c") {
		if medevacDetail := i.msg.Detail.GetFirst("_medevac_"); medevacDetail != nil {
			w.CasevacDetail = &CasevacDetail{
				Title: medevacDetail.GetAttr("title"),
				Casevac: medevacDetail.GetAttr("casevac") == "true",
				Freq: cot.ParseFloat(medevacDetail.GetAttr("freq")),
				Urgent: cot.ParseInt(medevacDetail.GetAttr("urgent")),
				Priority: cot.ParseInt(medevacDetail.GetAttr("priority")),
				Routine: cot.ParseInt(medevacDetail.GetAttr("routine")),
				Hoist: medevacDetail.GetAttr("hoist") == "true",
				Ventilator: medevacDetail.GetAttr("ventilator") == "true",
				EquipmentOther: medevacDetail.GetAttr("equipment_other") == "true",
				EquipmentDetail: medevacDetail.GetAttr("equipment_detail"),
				Litter: cot.ParseInt(medevacDetail.GetAttr("litter")),
				Ambulatory: cot.ParseInt(medevacDetail.GetAttr("ambulatory")),
				Security: cot.ParseInt(medevacDetail.GetAttr("security")),
				HlzMarking: cot.ParseInt(medevacDetail.GetAttr("hlz_marking")),
				UsMilitary: cot.ParseInt(medevacDetail.GetAttr("us_military")),
				UsCivilian: cot.ParseInt(medevacDetail.GetAttr("us_civilian")),
				NonusMilitary: cot.ParseInt(medevacDetail.GetAttr("nonus_military")),
				NonusCivilian: cot.ParseInt(medevacDetail.GetAttr("nonus_civilian")),
				Epw: cot.ParseInt(medevacDetail.GetAttr("epw")),
				Child: cot.ParseInt(medevacDetail.GetAttr("child")),
				TerrainSlope: medevacDetail.GetAttr("terrain_slope") == "true",
				TerrainRough: medevacDetail.GetAttr("terrain_rough") == "true",
				Obstacles: medevacDetail.GetAttr("obstacles"),
				TerrainSlopeDir: medevacDetail.GetAttr("terrain_slope_dir"),
				MedlineRemarks: medevacDetail.GetAttr("medline_remarks"),
				ZoneProtSelection: medevacDetail.GetAttr("zone_prot_selection"),
				ZoneProtectedCoord: medevacDetail.GetAttr("zone_protected_coord"),
				ZoneProtMarker: medevacDetail.GetAttr("zone_prot_marker"),
			}
		}
	}

	println(i.msg.Detail.String())

	if links := i.msg.Detail.GetAll("link"); len(links) > 0 {
		linksList := make([]string, 0)
		for _, link := range links {
			point := link.GetAttr("point")
			if len(point) > 0 {
				linksList = append(linksList, point)
			}
			if link.GetAttr("relation") == "t-p-b" {
				w.By = link.GetAttr("uid")
			}
			if link.GetAttr("relation") == "t-p-f" {
				w.From = link.GetAttr("uid")
			}
		}
		println(linksList)
		w.Links = linksList
	}

	if i.class == CONTACT {
		if i.online {
			w.Status = "Online"
		} else {
			w.Status = "Offline"
		}

		if v := evt.GetDetail().GetTakv(); v != nil {
			w.TakVersion = strings.Trim(fmt.Sprintf("%s %s", v.GetPlatform(), v.GetVersion()), " ")
			w.Device = strings.Trim(fmt.Sprintf("%s, %s", v.GetDevice(), v.GetOs()), " ")
		}
	}

	return w
}

//nolint:exhaustruct
func (w *WebUnit) ToMsg() *cot.CotMessage {
	msg := &cotproto.TakMessage{
		CotEvent: &cotproto.CotEvent{
			Type:      w.Type,
			Uid:       w.UID,
			SendTime:  cot.TimeToMillis(w.SendTime),
			StartTime: cot.TimeToMillis(w.StartTime),
			StaleTime: cot.TimeToMillis(w.StaleTime),
			How:       "h-g-i-g-o",
			Lat:       w.Lat,
			Lon:       w.Lon,
			Hae:       w.Hae,
			Ce:        cot.NotNum,
			Le:        cot.NotNum,
			Detail: &cotproto.Detail{
				Contact: &cotproto.Contact{Callsign: w.Callsign},
				PrecisionLocation: &cotproto.PrecisionLocation{
					Geopointsrc: "USER",
					Altsrc:      "USER",
				},
			},
		},
	}

	xd := cot.NewXMLDetails()
	if w.ParentUID != "" {
		xd.AddPpLink(w.ParentUID, "", w.ParentCallsign)
	}

	xd.AddOrChangeChild("status", map[string]string{"readiness": "true"})

	if w.Text != "" {
		xd.AddChild("remarks", nil, w.Text)
	}

	if len(w.Links) > 0 {
		for _, link := range w.Links {
			xd.AddChild("link", map[string]string{"point": link}, "")
		}
	}

	if w.Color != "" {
		xd.AddChild("color", map[string]string{"argb": w.Color}, "")
	}

	if w.Category == "drawing" {
		var tracking string
		if w.Geofence {
			tracking = "true"
		} else {
			tracking = "false"
		}
		xd.AddChild("__geofence", map[string]string{
			"trigger":  "Entry",
			"monitor":  w.GeofenceAff,
			"tracking": tracking,
		}, "")
	}

	if w.Category == ALARM {
		if cot.MatchPattern(w.Type, cot.EMERGENCY_ALERT) {
			if w.Type == "b-a-o-can" {
				xd.AddChild("emergency", map[string]string{
					"cancel": "true",
				}, strings.TrimSuffix(w.Callsign, "-Alert"))
			} else {
				xd.AddChild("emergency", map[string]string{
					"type": GetEmergencyTypeFromType(w.Type),
				}, strings.TrimSuffix(w.Callsign, "-Alert"))
			}
		}
	}

	if w.Category == REPORT && strings.HasPrefix(w.Type, "b-r-f-h-c") && w.CasevacDetail != nil {
		medevacAttrs := map[string]string{
			"casevac": fmt.Sprintf("%t", w.CasevacDetail.Casevac),
			"freq": fmt.Sprintf("%f", w.CasevacDetail.Freq),
			"urgent": fmt.Sprintf("%d", w.CasevacDetail.Urgent),
			"priority": fmt.Sprintf("%d", w.CasevacDetail.Priority),
			"routine": fmt.Sprintf("%d", w.CasevacDetail.Routine),
			"hoist": fmt.Sprintf("%t", w.CasevacDetail.Hoist),
			"ventilator": fmt.Sprintf("%t", w.CasevacDetail.Ventilator),
			"equipment_other": fmt.Sprintf("%t", w.CasevacDetail.EquipmentOther),
			"equipment_detail": w.CasevacDetail.EquipmentDetail,
			"litter": fmt.Sprintf("%d", w.CasevacDetail.Litter),
			"ambulatory": fmt.Sprintf("%d", w.CasevacDetail.Ambulatory),
			"security": fmt.Sprintf("%d", w.CasevacDetail.Security),
			"hlz_marking": fmt.Sprintf("%d", w.CasevacDetail.HlzMarking),
			"us_military": fmt.Sprintf("%d", w.CasevacDetail.UsMilitary),
			"us_civilian": fmt.Sprintf("%d", w.CasevacDetail.UsCivilian),
			"nonus_military": fmt.Sprintf("%d", w.CasevacDetail.NonusMilitary),
			"nonus_civilian": fmt.Sprintf("%d", w.CasevacDetail.NonusCivilian),
			"epw": fmt.Sprintf("%d", w.CasevacDetail.Epw),
			"child": fmt.Sprintf("%d", w.CasevacDetail.Child),
			"terrain_slope": fmt.Sprintf("%t", w.CasevacDetail.TerrainSlope),
			"terrain_rough": fmt.Sprintf("%t", w.CasevacDetail.TerrainRough),
			"obstacles": w.CasevacDetail.Obstacles,
			"terrain_slope_dir": w.CasevacDetail.TerrainSlopeDir,
			"medline_remarks": w.CasevacDetail.MedlineRemarks,
			"zone_prot_selection": w.CasevacDetail.ZoneProtSelection,
			"zone_protected_coord": w.CasevacDetail.ZoneProtectedCoord,
			"zone_prot_marker": w.CasevacDetail.ZoneProtMarker,
		}
		if w.CasevacDetail.Title != "" {
			medevacAttrs["title"] = w.CasevacDetail.Title
		}
		xd.AddChild("_medevac_", medevacAttrs, "")
	}

	msg.GetCotEvent().Detail.XmlDetail = xd.AsXMLString()

	zero := time.Unix(0, 0)

	if msg.GetCotEvent().GetUid() == "" {
		msg.CotEvent.Uid = uuid.New().String()
	}

	if w.StartTime.Before(zero) {
		msg.CotEvent.StartTime = cot.TimeToMillis(time.Now())
	}

	if w.SendTime.Before(zero) {
		msg.CotEvent.SendTime = cot.TimeToMillis(time.Now())
	}

	if w.StaleTime.Before(zero) {
		msg.CotEvent.StaleTime = cot.TimeToMillis(time.Now().Add(time.Hour * 24))
	}

	if w.WebSensor != "" {
		sensorData := make([]*cotproto.SensorData, 0)
		sensorData = append(sensorData, &cotproto.SensorData{
			SensorName: "WEB",
			Value:      w.WebSensor,
		})
		msg.CotEvent.Detail.SensorData = sensorData
	}

	return &cot.CotMessage{
		From:       "",
		Scope:      w.Scope,
		TakMessage: msg,
		Detail:     xd,
	}
}

func GetEmergencyTypeFromType(msgType string) string {
	typeMap := map[string]string{
		"b-a-o-can": "Cancel",
		"b-a-o-opn": "InContact",
		"b-a-o-pan": "Ring The Bell",
		"b-a-o-tbl": "911",
	}
	return typeMap[msgType]
}

//nolint:gomnd
func getSIDC(fn string) string {
	if !strings.HasPrefix(fn, "a-") {
		return ""
	}

	tokens := strings.Split(fn, "-")

	sidc := "S" + tokens[1]

	if len(tokens) > 2 {
		sidc += tokens[2] + "P"
	} else {
		sidc += "-P"
	}

	if len(tokens) > 3 {
		for _, c := range tokens[3:] {
			if len(c) > 1 {
				break
			}

			sidc += c
		}
	}

	if len(sidc) < 12 {
		sidc += strings.Repeat("-", 10-len(sidc))
	}

	return strings.ToUpper(sidc)
}
