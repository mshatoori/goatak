package main

import (
	"context"
	"fmt"
	"slices"
	"strings"
	"time"

	"github.com/kdudkov/goatak/internal/client"
	"github.com/kdudkov/goatak/internal/wshandler"
	"github.com/kdudkov/goatak/pkg/cot"
	"github.com/kdudkov/goatak/pkg/cotproto"
	"github.com/kdudkov/goatak/pkg/model"
	"github.com/peterstace/simplefeatures/geom"
	"github.com/spf13/viper"
)

// ProcessEvent processes incoming CoT events
func (app *App) ProcessEvent(msg *cot.CotMessage) {
	for _, prc := range app.eventProcessors {
		if cot.MatchAnyPattern(msg.GetType(), prc.include...) {
			app.logger.Debug("msg is processed by " + prc.name)
			prc.cb(msg)
		}
	}
}

// SendMsg sends a message to all configured flows
func (app *App) SendMsg(msg *cotproto.TakMessage) {
	app.logger.Debug("sending...")
	if app.mesh != nil {
		if err := app.mesh.SendCot(msg); err != nil {
			app.logger.Error("mesh send error", "error", err)
		}
	}
	if app.cl != nil {
		if err := app.cl.SendCot(msg); err != nil {
			app.logger.Error("client send error", "error", err)
		}
	}

	for _, flow := range app.flows {
		if err := flow.SendCot(msg); err != nil {
			app.logger.Error("flow send error", "error", err, "flow", flow)
		}
	}
}

// SendMsgToDestination sends a message to a specific destination using the RabbitFlow pattern
func (app *App) SendMsgToDestination(msg *cotproto.TakMessage, dest model.SendItemDest) error {
	app.logger.Debug("sending to specific destination", "dest", dest)

	// Find the RabbitFlow
	var rabbitmq *client.RabbitFlow
	for _, flow := range app.flows {
		if flow.GetType() == "Rabbit" {
			rabbitmq = flow.(*client.RabbitFlow)
			break
		}
	}

	if rabbitmq == nil {
		return fmt.Errorf("no RabbitFlow found")
	}

	destinations := make([]model.SendItemDest, 1)
	destinations[0] = dest

	err := rabbitmq.SendCotToDestinations(msg, destinations)

	if err != nil {
		app.logger.Error("destination send error", "error", err, "dest", dest)
		return err
	}

	app.logger.Debug("successfully sent to destination", "dest", dest)
	return nil
}

// MutateSelfPosMessage applies mutations to self position messages
func (app *App) MutateSelfPosMessage(msg *cotproto.CotEvent) {
	// app.logger.Debug("Mutate self pos message...")
	app.selfPosEventMutators.Range(func(key, value any) bool {
		if mutator, ok := value.(CoTEventMutator); ok {
			// app.logger.Debug("Mutator -> " + mutator.mutation.String())
			if !mutator.mutate(msg) {
				app.selfPosEventMutators.LoadAndDelete(key.(string))
			}
		}
		return true
	})
}

// MakeMe creates a self position message
func (app *App) MakeMe() *cotproto.TakMessage {
	ev := cot.BasicMsg(app.typ, app.uid, time.Minute*2)
	pos := app.pos.Load()

	ev.CotEvent.Lat = pos.GetLat()
	ev.CotEvent.Lon = pos.GetLon()
	ev.CotEvent.Hae = pos.GetAlt()
	ev.CotEvent.Ce = pos.GetCe()

	ev.CotEvent.Detail = &cotproto.Detail{
		Contact: &cotproto.Contact{
			Endpoint: "*:-1:stcp",
			Callsign: app.callsign,
			ClientInfo: &cotproto.ClientInfo{
				IpAddress: app.ipAddress,
				Urn:       app.urn,
			},
		},
		Group: &cotproto.Group{
			Name: app.team,
			Role: app.role,
		},
		// Takv: &cotproto.Takv{
		// 	Device:   app.device,
		// 	Platform: app.platform,
		// 	Os:       app.os,
		// 	Version:  app.version,
		// },
		// Track: &cotproto.Track{
		// 	Speed:  pos.GetSpeed(),
		// 	Course: pos.GetTrack(),
		// },
		// PrecisionLocation: &cotproto.PrecisionLocation{
		// 	Geopointsrc: "GPS",
		// 	Altsrc:      "GPS",
		// },
		// Status: &cotproto.Status{Battery: 39},
	}
	// ev.CotEvent.Detail.XmlDetail = fmt.Sprintf("<uid Droid=\"%s\"></uid>", app.callsign)

	app.MutateSelfPosMessage(ev.CotEvent)

	// TODO: Refactor this and make it configurable...
	//app.MakeFenceAroundMe()

	return ev
}

// sensorCallback handles data from sensors
func (app *App) sensorCallback(data any) {
	switch data := data.(type) {
	case *cotproto.CotEvent:
		if strings.HasPrefix(data.GetUid(), "$self") {
			if data.GetUid() == "$self.pos" {
				app.pos.Store(model.NewPosFull(data.Lat, data.Lon, data.Hae, data.Detail.Track.Speed, data.Detail.Track.Course))
				app.logger.Info("position from gpsd", "lat", data.Lat, "lon", data.Lon, "alt", data.Hae, "speed", data.Detail.Track.Speed, "track", data.Detail.Track.Course)
				app.changeCb.AddMessage(model.FromMsg(cot.LocalCotMessage(app.MakeMe())))
			}
			app.selfPosEventMutators.Store(data.GetUid(), CoTEventMutator{
				mutation: data,
				logger:   app.logger.With("logger", "mutators"+data.GetUid()),
			})
			app.SendMsg(app.MakeMe()) // TODO: should we send such a big message every time???
		} else {
			data.SendTime = cot.TimeToMillis(time.Now())
			takMessage := &cotproto.TakMessage{CotEvent: data}
			app.ProcessEvent(cot.LocalCotMessage(takMessage))
			app.SendMsg(takMessage)
		}
	default:
		app.logger.Info("Unknown sensor data")
	}
}

// myPosSender periodically sends position and other objects
func (app *App) myPosSender(ctx context.Context) {
	app.SendMsg(app.MakeMe())

	ticker := time.NewTicker(time.Second * 10)
	defer ticker.Stop()

	my_ticker := time.NewTicker(time.Second * time.Duration(viper.GetInt("me.interval")))
	defer my_ticker.Stop()

	for ctx.Err() == nil {
		select {
		case <-ctx.Done():
			return
		case <-my_ticker.C:
			app.logger.Debug("Sending my pos")
			app.SendMsg(app.MakeMe())
		case <-ticker.C:
			app.logger.Debug("Sending other objects")
			app.sendMyPoints()
		}
	}
}

// sendMyPoints sends points that need to be sent
func (app *App) sendMyPoints() {
	app.items.ForEach(func(item *model.Item) bool {
		if item.ShouldSend() {
			// Handle different send modes
			switch item.GetSendMode() {
			case "broadcast":
				app.SendMsg(item.GetMsg().GetTakMessage())
			case "subnet":
				if item.GetSelectedSubnet() != "" {
					dest := model.SendItemDest{
						Addr: item.GetSelectedSubnet(),
						URN:  16777215, // Broadcast URN for subnet
					}
					if err := app.SendMsgToDestination(item.GetMsg().GetTakMessage(), dest); err != nil {
						app.logger.Error("failed to send to subnet", "error", err, "subnet", item.GetSelectedSubnet())
					}
				}
			case "direct":
				if item.GetSelectedIP() != "" && item.GetSelectedUrn() != 0 {
					dest := model.SendItemDest{
						Addr: item.GetSelectedIP(),
						URN:  int(item.GetSelectedUrn()),
					}
					if err := app.SendMsgToDestination(item.GetMsg().GetTakMessage(), dest); err != nil {
						app.logger.Error("failed to send to direct destination", "error", err, "ip", item.GetSelectedIP(), "urn", item.GetSelectedUrn())
					}
				}
			case "none":
				// Don't send, local only
			default:
				// For backward compatibility
				app.SendMsg(item.GetMsg().GetTakMessage())
			}
			item.SetLastSent()
		}

		return true
	})
}

// cleaner periodically cleans old units
func (app *App) cleaner() {
	for range time.Tick(time.Minute) {
		app.cleanOldUnits()
	}
}

// cleanOldUnits removes old units and contacts
func (app *App) cleanOldUnits() {
	toDelete := make([]string, 0)

	app.items.ForEach(func(item *model.Item) bool {
		switch item.GetClass() {
		case model.UNIT, model.POINT:
			if item.IsOld() {
				toDelete = append(toDelete, item.GetUID())
				app.logger.Debug(fmt.Sprintf("removing %s %s", item.GetClass(), item.GetUID()))
			}
		case model.CONTACT:
			if item.IsOld() {
				toDelete = append(toDelete, item.GetUID())
				app.logger.Debug("removing contact " + item.GetUID())
			} else if item.IsOnline() && item.GetLastSeen().Add(lastSeenOfflineTimeout).Before(time.Now()) {
				item.SetOffline()
				app.changeCb.AddMessage(item)
			}
		}

		return true
	})

	for _, uid := range toDelete {
		app.items.Remove(uid)
		app.deleteCb.AddMessage(uid)
	}
}

// updateGeofencesAfterDelete updates geofences after item deletion
func (app *App) updateGeofencesAfterDelete(uid string) bool {
	if !strings.HasPrefix(uid, "ALARM.") && len(uid) > 8 {
		toDelete := make([]string, 0)
		app.items.ForEach(func(item *model.Item) bool {
			uidPart := uid
			if len(uidPart) > 8 {
				uidPart = uidPart[:8]
			}
			if item.GetClass() == model.ALARM && strings.Contains(item.GetUID(), uidPart) {
				toDelete = append(toDelete, item.GetUID())
			}
			return true
		})
		for _, uid := range toDelete {
			// TODO remove from app.alarms!!
			app.items.Remove(uid)
			app.deleteCb.AddMessage(uid)
		}
	}
	return true
}

// checkGeofences checks if items are within geofenced areas
func (app *App) checkGeofences(changedItem *model.Item) bool {
	app.logger.Info("Checking Geofences")
	if changedItem.GetClass() != model.UNIT && changedItem.GetClass() != model.CONTACT {
		//app.logger.Info("Not Unit")
		return true
	}

	app.items.ForEach(func(item *model.Item) bool {
		//app.logger.Info(" Checking item: " + item.GetUID())
		if item.GetClass() == model.DRAWING && item.GetMsg().IsGeofenceActive() {
			//app.logger.Info("  HAS GEOFENCE")
			if links := item.GetMsg().Detail.GetAll("link"); len(links) > 0 {
				linksList := make([]string, 0)
				for _, link := range links {
					point := link.GetAttr("point")
					if len(point) > 0 {
						linksList = append(linksList, strings.ReplaceAll(point, ",", " "))
					}
				}
				linksList = append(linksList, linksList[0])
				wkt := "POLYGON((" + strings.Join(linksList, ", ") + "))"
				//app.logger.Info("  WKT: " + wkt)
				polygon, _ := geom.UnmarshalWKT(wkt)
				//app.logger.Info("  Geofence Aff: " + item.GetMsg().GetGeofenceAff() + " Unit type: " + changedItem.GetType())
				if item.GetMsg().GetGeofenceAff() == "All" || (item.GetMsg().GetGeofenceAff() == "Friendly" && changedItem.GetMsg().Is(cot.FRIENDLY)) || (item.GetMsg().GetGeofenceAff() == "Hostile" && changedItem.GetMsg().Is(cot.HOSTILE)) {
					//app.logger.Info("  Compatible! => Checking...")
					lat, lng := changedItem.GetLanLon()
					//app.logger.Info("  LATLNG", "lat", lat, "lng", lng)
					//app.logger.Info("  POLYGON: " + polygon.String() + " POINT: " + geom.NewPointXY(lat, lng).AsText())
					contains, _ := geom.Contains(polygon, geom.NewPointXY(lat, lng).AsGeometry())
					//app.logger.Info("  CONTAINS? ", "contains", contains, "err", err)
					if contains {
						alarmMsg := cot.MakeAlarmMsg(changedItem.GetUID(), item.GetUID())
						alarmMsg.CotEvent.Lat = lat
						alarmMsg.CotEvent.Lon = lng
						alarmItem := model.FromMsg(cot.LocalCotMessage(alarmMsg))
						if !slices.Contains(app.alarms, alarmItem.GetUID()) {
							//app.logger.Info("  *** ALARM ***  " + alarmItem.String())
							fmt.Printf("%c\n", 7)
							app.items.Store(alarmItem)
							app.changeCb.AddMessage(alarmItem)
						}
					}
				}
			} else {
				//app.logger.Info("  !!! NO LINKS !!!  ")
				return true
			}
		}
		return true
	})

	return true
}

// MakeFenceAroundMe creates a geofence around the current position
func (app *App) MakeFenceAroundMe() {
	var u *model.Item
	pos := app.pos.Load()
	app.items.Remove(app.uid + "-fence")
	fenceMsg := cot.MakeFenceMsg(app.uid+"-fence", pos.Lat, pos.Lon, 0.01)
	u = model.FromMsg(cot.LocalCotMessage(fenceMsg))
	app.items.Store(u)
	app.changeCb.AddMessage(u)
}

// broadcastTrackingUpdate sends tracking updates to all connected WebSocket clients
func (app *App) broadcastTrackingUpdate(unitUID, callsign string, lat, lon, alt, speed, course float64) {
	// Create tracking update data
	update := &wshandler.TrackingUpdateData{
		UnitUID:   unitUID,
		Callsign:  callsign,
		Latitude:  lat,
		Longitude: lon,
		Timestamp: time.Now().Format(time.RFC3339),
	}

	// Add optional fields if they have valid values
	if alt != 0 {
		update.Altitude = &alt
	}
	if speed != 0 {
		update.Speed = &speed
	}
	if course != 0 {
		update.Course = &course
	}

	// Broadcast to all WebSocket clients via the callback system
	app.trackingUpdateCb.AddMessage(update)
}

// loadContactsFromDNS loads contacts from DNS service
func (app *App) loadContactsFromDNS() {
	if app.dnsServiceProxy == nil {
		app.logger.Warn("DNS service proxy not initialized, skipping contact loading")
		return
	}

	app.logger.Info("Loading contacts from DNS service")
	addresses, err := app.dnsServiceProxy.GetAddresses()
	if err != nil {
		app.logger.Error("Failed to get addresses from DNS service", "error", err)
		return
	}

	// Group IP addresses by URN, excluding our own URN
	urnToIPs := make(map[int32][]string)
	urnToName := make(map[int32]string)

	for _, addr := range addresses {
		if addr.Urn == nil || addr.IPAddress == nil {
			continue
		}

		// Skip addresses with our URN
		if *addr.Urn == app.urn {
			continue
		}

		urn := *addr.Urn
		ip := *addr.IPAddress

		urnToIPs[urn] = append(urnToIPs[urn], ip)

		// Use UnitName if available, otherwise use URN as name
		if addr.UnitName != nil && *addr.UnitName != "" {
			urnToName[urn] = *addr.UnitName
		} else if _, exists := urnToName[urn]; !exists {
			urnToName[urn] = fmt.Sprintf("Node-%d", urn)
		}
	}

	// Create CONTACT items for each unique URN
	for urn, ips := range urnToIPs {
		// Concatenate all IPs with comma
		concatenatedIPs := strings.Join(ips, ",")
		callsign := urnToName[urn]

		// TODO: This should be temporary. Also the other fileds that are set here.
		uid := fmt.Sprintf("DNS-CONTACT-%d", urn)

		// Create CotEvent for this contact
		msg := cot.BasicMsg("a-f-X", uid, time.Hour*24) // CONTACT type with 24h stale time
		msg.CotEvent.Detail = &cotproto.Detail{
			Contact: &cotproto.Contact{
				Endpoint: "*:-1:stcp",
				Callsign: callsign,
				ClientInfo: &cotproto.ClientInfo{
					IpAddress: concatenatedIPs,
					Urn:       urn,
				},
			},
			Group: &cotproto.Group{
				Name: "contacts",
				Role: "",
			},
		}

		// Convert to CotMessage and then to Item
		cotMsg := cot.LocalCotMessage(msg)
		item := model.FromMsg(cotMsg)
		item.GetClass()
		if item != nil {
			app.items.Store(item)
			app.changeCb.AddMessage(item)
			app.logger.Info("Created contact from DNS", "urn", urn, "callsign", callsign, "ips", concatenatedIPs)
		}
	}

	app.logger.Info("Finished loading contacts from DNS service", "contacts_created", len(urnToIPs))
}
