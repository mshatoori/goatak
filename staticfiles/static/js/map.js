let app = new Vue({
  el: "#app",
  data: {
    map: null,
    layers: null,
    overlays: null,
    conn: null,
    units: new Map(),
    outgoing_flows: new Map(),
    incoming_flows: new Map(),
    sensors: new Map(),
    messages: [],
    seenMessages: new Set(),
    ts: 0,
    locked_unit_uid: "",
    activeItemUid: null,
    config: null,
    tools: new Map(),
    me: null,
    coords: null,
    point_num: 1,
    unit_num: 1,
    coord_format: "d",
    form_unit: {},
    chatroom: "",
    chat_uid: "",
    chat_msg: "",

    sharedState: store.state,
    casevacLocation: null,
    casevacMarker: null,

    sidebarCollapsed: false, // Track sidebar collapse state
    beacon_active: false,
  },
  provide: function () {
    return {
      map: this.map,
      latlng: this.latlng,
      config: this.config,
      getTool: this.getTool,
      removeTool: this.removeTool,
      coords: this.coords,
      activeItem: this.activeItem,
    };
  },
  mounted() {
    this.map = L.map("map", {
      attributionControl: false,
      locateCallback: this.locateByGPS,
      changeMode: this.changeMode,
    });
    this.inDrawMode = false;
    this.mode = "map";

    this.drawnItems = new L.FeatureGroup();
    this.routeItems = new L.FeatureGroup();
    this.overlays = {
      contact: L.layerGroup(),
      unit: L.layerGroup(),
      alarm: L.layerGroup(),
      point: L.layerGroup(),
      drawing: L.layerGroup(),
      route: L.layerGroup(),
      report: L.layerGroup(),
    };

    for (const overlay of Object.values(this.overlays)) {
      overlay.addTo(this.map);
    }

    this.overlays.drawing.addLayer(this.drawnItems);
    this.overlays.route.addLayer(this.routeItems);

    this.drawControl = new L.Control.Draw({
      edit: {
        featureGroup: this.drawnItems,
        edit: false,
        remove: false,
        polygon: {
          allowIntersection: false,
        },
      },
      draw: {
        polygon: {
          allowIntersection: false,
          showArea: true,
        },
        rectangle: false,
        circle: false,
        circlemarker: false,
        marker: false,
      },
    });

    this.map.addControl(this.drawControl);
    this.map.addControl(new LocationControl());
    this.map.addControl(new ToolsControl());

    vm = this;

    const drawStart = function (event) {
      vm.inDrawMode = true;
    };
    const drawStop = function (event) {
      vm.inDrawMode = false;
    };

    this.map.on(L.Draw.Event.DRAWSTART, drawStart);
    this.map.on(L.Draw.Event.EDITSTART, drawStart);

    this.map.on(L.Draw.Event.DRAWSTOP, drawStop);
    this.map.on(L.Draw.Event.EDITSTOP, drawStop);
    this.map.on(L.Draw.Event.CREATED, function (event) {
      var layer = event.layer;

      if (event.layerType === "polygon") {
        let uid = uuidv4();
        let now = new Date();
        let stale = new Date(now);
        stale.setDate(stale.getDate() + 365);
        let u = {
          uid: uid,
          category: "drawing",
          callsign: "ناحیه",
          sidc: "",
          start_time: now,
          last_seen: now,
          stale_time: stale,
          type: "u-d-f",
          lat: 0,
          lon: 0,
          hae: 0,
          speed: 0,
          course: 0,
          status: "",
          text: "",
          parent_uid: "",
          parent_callsign: "",
          local: true,
          send: true,
          web_sensor: "",
          links: [],
          isNew: true, // Mark as a new item to trigger automatic edit mode
        };
        if (vm.config && vm.config.uid) {
          u.parent_uid = vm.config.uid;
          u.parent_callsign = vm.config.callsign;
        }

        let latSum = 0;
        let lngSum = 0;

        layer.editing.latlngs[0][0].forEach((latlng) => {
          latSum += latlng.lat;
          lngSum += latlng.lng;
          u.links.push(latlng.lat + "," + latlng.lng);
        });

        u.lat = latSum / layer.editing.latlngs[0][0].length;
        u.lon = lngSum / layer.editing.latlngs[0][0].length;

        u.color = "white";
        u.geofence = false;
        u.geofence_aff = "All";
        // u.geofence_send = false

        vm.saveItem(u, function () {
          vm.setActiveItemUid(u.uid, true);
          new bootstrap.Modal(document.querySelector("#drawing-edit")).show();
        });
      } else if (event.layerType === "polyline") {
        let uid = uuidv4();
        let now = new Date();
        let stale = new Date(now);
        stale.setDate(stale.getDate() + 365);
        let u = {
          uid: uid,
          category: "route",
          callsign: "مسیر",
          sidc: "",
          start_time: now,
          last_seen: now,
          stale_time: stale,
          type: "b-m-r",
          lat: 0,
          lon: 0,
          hae: 0,
          speed: 0,
          course: 0,
          status: "",
          text: "",
          parent_uid: "",
          parent_callsign: "",
          local: true,
          send: true,
          web_sensor: "",
          links: [],
          isNew: true, // Mark as a new item to trigger automatic edit mode
        };
        if (vm.config && vm.config.uid) {
          u.parent_uid = vm.config.uid;
          u.parent_callsign = vm.config.callsign;
        }

        let latSum = 0;
        let lngSum = 0;

        layer.editing.latlngs[0].forEach((latlng) => {
          latSum += latlng.lat;
          lngSum += latlng.lng;
          u.links.push(latlng.lat + "," + latlng.lng);
        });

        u.lat = latSum / layer.editing.latlngs[0].length;
        u.lon = lngSum / layer.editing.latlngs[0].length;

        u.color = "white";

        console.log("TrySending:", u);

        vm.saveItem(u, function () {
          vm.setActiveItemUid(u.uid, true);
          new bootstrap.Modal(document.querySelector("#drawing-edit")).show();
        });
      }
    });
    this.map.on(L.Draw.Event.DRAWVERTEX, function (event) {
      console.log("DRAW VERTEX:", event);
    });

    this.map.setView([60, 30], 11);

    L.control.scale({ position: "bottomright", metric: true }).addTo(this.map);

    this.getConfig();

    let supportsWebSockets = "WebSocket" in window || "MozWebSocket" in window;

    if (supportsWebSockets) {
      this.connect();
      setInterval(this.fetchAllUnits, 5000); // TODO
      // setInterval(this.fetchAllUnits, 60000);
    }

    this.renew();
    setInterval(this.renew, 5000);

    store.fetchTypes();

    this.map.on("click", this.mapClick);
    this.map.on("mousemove", this.mouseMove);

    this.formFromUnit(null);
  },

  computed: {
    activeItem: function () {
      return this.activeItemUid
        ? this.activeItemUid && this.getActiveItem()
        : null;
    },
  },

  methods: {
    // Update sidebar collapsed state
    updateSidebarCollapsed: function (isCollapsed) {
      console.log("updateSidebarCollapsed", isCollapsed);
      this.sidebarCollapsed = isCollapsed;
    },
    getItemOverlay(item) {
      return this.overlays[item.category];
    },
    configUpdated: function () {
      console.log("config updated");
      const markerInfo = L.divIcon({
        className: "my-marker-info",
        html:
          "<div>" +
          this.config.callsign +
          "<br>" +
          this.config.ip_address +
          "<br>" +
          this.config.urn +
          "</div>",
        iconSize: null,
      });

      this.myInfoMarker.setIcon(markerInfo);
    },
    getConfig: function () {
      let vm = this;

      fetch(window.baseUrl + "/config")
        .then(function (response) {
          return response.json();
        })
        .then(function (data) {
          vm.config = data;

          vm.map.setView([data.lat, data.lon], data.zoom);

          if (vm.config.callsign) {
            vm.me = new L.Marker.RotatedMarker([data.lat, data.lon]);
            vm.me.setIcon(
              L.icon({
                iconUrl: "/static/icons/self.png",
                iconAnchor: new L.Point(16, 16),
              })
            );
            vm.me.addTo(vm.map);
            // vm.me.bindTooltip(popup(vm.me));

            const markerInfo = L.divIcon({
              className: "my-marker-info",
              html:
                "<div>" +
                vm.config.callsign +
                "<br>" +
                vm.config.ip_address +
                "<br>" +
                vm.config.urn +
                "</div>",
              iconSize: null,
            });

            if (!vm.myInfoMarker) {
              vm.myInfoMarker = L.marker([data.lat, data.lon], {
                icon: markerInfo,
              });
              vm.myInfoMarker.addTo(vm.map);
            }

            vm.myInfoMarker.setLatLng([data.lat, data.lon]);
            vm.myInfoMarker.setIcon(markerInfo);
          }

          layers = L.control.layers({}, null, { hideSingleBase: true });
          layers.addTo(vm.map);

          let first = true;
          data.layers.forEach(function (i) {
            let opts = {
              minZoom: i.minZoom ?? 1,
              maxZoom: i.maxZoom ?? 20,
            };

            if (i.parts) {
              opts["subdomains"] = i.parts;
            }

            var lz = null;

            if (first) {
              opts["bounds"] = L.latLngBounds(
                L.latLng(35.59702, 51.13174),
                L.latLng(35.85121, 51.68381)
              );
              lz1 = L.tileLayer(i.url, opts);
              opts = JSON.parse(JSON.stringify(opts));
              opts["maxNativeZoom"] = 11;
              opts["bounds"] = L.latLngBounds(
                L.latLng(25, 43),
                L.latLng(40, 63)
              );
              lz2 = L.tileLayer(i.url, opts);
              opts = JSON.parse(JSON.stringify(opts));
              opts["bounds"] = undefined;
              opts["minZoom"] = i.minZoom ?? 1;
              opts["maxNativeZoom"] = 5;
            }

            l = L.tileLayer(i.url, opts);

            layers.addBaseLayer(l, i.name);

            if (first) {
              first = false;
              l.addTo(vm.map);
              lz2.addTo(vm.map);
              lz1.addTo(vm.map);
            }
          });
        });
    },

    connect: function () {
      let url =
        (window.location.protocol === "https:" ? "wss://" : "ws://") +
        window.location.host +
        "/ws";
      let vm = this;

      this.fetchAllUnits();
      this.fetchMessages();
      store.fetchSensors();
      store.fetchFlows();

      this.conn = new WebSocket(url);

      this.conn.onmessage = function (e) {
        let parsed = JSON.parse(e.data);
        vm.processWS(parsed);
      };

      this.conn.onopen = function (e) {
        console.log("connected");
      };

      this.conn.onerror = function (e) {
        console.log("error");
      };

      this.conn.onclose = function (e) {
        console.log("closed");
        setTimeout(vm.connect, 3000);
      };
    },

    connected: function () {
      if (!this.conn) return false;

      return this.conn.readyState === 1;
    },

    fetchAllUnits: function () {
      store.fetchItems().then((results) => {
        this.processUnits(results);
      });
    },

    fetchMessages: function () {
      let vm = this;

      fetch(window.baseUrl + "/message")
        .then(function (response) {
          return response.json();
        })
        .then(function (data) {
          vm.messages = data;
        });
    },

    renew: function () {
      let vm = this;

      if (!this.conn) {
        this.fetchAllUnits();
        this.fetchMessages();
      }

      if (this.getTool("dp1")) {
        let p = this.getTool("dp1").getLatLng();

        const requestOptions = {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lat: p.lat, lon: p.lng, name: "DP1" }),
        };
        fetch(window.baseUrl + " /dp", requestOptions);
      }
    },

    _processRemoval: function (item) {
      console.log("processRemoval", item);
      if (item.marker) {
        this.getItemOverlay(item).removeLayer(item.marker);
        item.marker.remove();

        if (item.infoMarker) {
          this.getItemOverlay(item).removeLayer(item.infoMarker);
          item.infoMarker.remove();
        }
      }

      if (this.activeItemUid === item.uid) {
        this.setActiveItemUid(null, false);
      }
    },

    _processDrawing(item) {
      let latlngs = item.links.map((it) => {
        return it.split(",").map(parseFloat);
      });

      if (item.category === "drawing") {
        item.marker = L.polygon(latlngs, {
          color: item.color,
          interactive: !item.uid.endsWith("-fence"),
        });
        if (!item.uid.endsWith("-fence")) {
          item.marker.on("click", (e) => {
            this.setActiveItemUid(item.uid, false);
          });
        }
        item.marker.addTo(this.drawnItems);
      } else if (item.category === "route") {
        item.marker = L.polyline(latlngs, {
          color: item.color,
        });
        item.marker.on("click", (e) => {
          this.setActiveItemUid(item.uid, false);
        });
        item.marker.addTo(this.routeItems);
      }
    },
    _processAddition: function (item) {
      if (item.category === "drawing" || item.category === "route") {
        this._processDrawing(item);
      } else {
        if (
          item.type.startsWith("b-a-o") &&
          !item.type.endsWith("-can") &&
          item.uid.startsWith(this.config.uid)
        ) {
          this.beacon_active = true;
          this.sharedState.emergency.switch1 = true;
          this.sharedState.emergency.switch2 = true;
          this.sharedState.emergency.type = item.type;
        }
        if (item.type === "b-a-g") return;
        this.updateUnitMarker(item, false, true);
      }
      this.addContextMenuToMarker(item);
    },

    _processUpdate: function (item) {
      if (item.category === "drawing" || item.category === "route") {
        // TODO: Handle things other than polygon!
        if (item.marker) {
          this.drawnItems.removeLayer(item.marker);
          this.routeItems.removeLayer(item.marker);
        }
        this._processDrawing(item);
      } else {
        this.updateUnitMarker(item, false, true);

        if (this.locked_unit_uid === item.uid) {
          this.map.setView([item.lat, item.lon]);
        }
      }
      vm.addContextMenuToMarker(item);
    },

    processUnits: function (results) {
      // console.log("RESULTS:", results);

      results["removed"].forEach((item) => this._processRemoval(item));
      results["added"].forEach((item) => this._processAddition(item));
      results["updated"].forEach((item) => this._processUpdate(item));
    },

    addContextMenuToMarker: function (unit) {
      if (unit.uid.endsWith("-fence")) return;

      if (unit.marker) {
        unit.marker.on("contextmenu", (e) => {
          if (unit.marker.contextmenu === undefined) {
            let menu = `
                    <ul class="dropdown-menu marker-contextmenu">
                      <li><h6 class="dropdown-header">${unit.callsign}</h6></li>
                      <li><button class="dropdown-item" onclick="app.menuDeleteAction('${unit.uid}')"> حذف </button></li>
                      <li><button class="dropdown-item" onclick="app.menuSendAction('${unit.uid}')"> ارسال... </button></li>
                    </ul>`;
            unit.marker.contextmenu = L.popup()
              .setLatLng(e.latlng)
              .setContent(menu);
            unit.marker.contextmenu.addTo(this.getItemOverlay(unit));
          }
          unit.marker.contextmenu.openOn(this.getItemOverlay(unit));
        });
      }
    },

    processMe: function (u) {
      if (!u || !this.me) return;
      this.config.lat = u.lat;
      this.config.lon = u.lon;
      this.me.setLatLng([u.lat, u.lon]);
      if (this.myInfoMarker) this.myInfoMarker.setLatLng([u.lat, u.lon]);
      if (u.course) this.me.setIconAngle(u.course);
    },

    processWS: function (u) {
      if (u.type === "unit") {
        if (u.unit.uid === this.config.uid) this.processMe(u.unit);
        else this.processUnits(store.handleItemChangeMessage(u.unit));
      }

      if (u.type === "delete") {
        this.processUnits(store.handleItemChangeMessage(u.unit, true));
      }

      if (u.type === "chat") {
        console.log(u.chat_msg);
        this.fetchMessages();
      }
    },
    removeFromAllOverlays(obj) {
      // console.log("=== removeFromAllOverlays", Object.values(this.overlays));
      for (const overlay of Object.values(this.overlays)) {
        // console.log("removeFromAllOverlays", obj, overlay);
        obj.removeFrom(overlay);
      }
    },
    updateUnitMarker: function (unit, draggable, updateIcon) {
      if (unit.lon === 0 && unit.lat === 0) {
        if (unit.marker) {
          this.getItemOverlay(item).removeLayer(unit.marker);
          unit.marker = null;
        }
        return;
      }

      // console.log("updateUnitMarker", unit, unit.marker, unit.infoMarker);
      if (unit.marker) {
        this.removeFromAllOverlays(unit.marker);
      }
      if (unit.infoMarker) {
        this.removeFromAllOverlays(unit.infoMarker);
      }

      unit.marker = L.marker([unit.lat, unit.lon], { draggable: draggable });
      unit.marker.on("click", function (e) {
        app.setActiveItemUid(unit.uid, false);
      });
      if (draggable) {
        unit.marker.on("dragend", function (e) {
          unit.lat = marker.getLatLng().lat;
          unit.lon = marker.getLatLng().lng;
        });
      }
      unit.marker.setIcon(getIcon(unit, true));
      unit.marker.addTo(this.getItemOverlay(unit));

      let markerHtml = "<div>" + unit.callsign;
      if (unit.ip_address) markerHtml += "<br>" + unit.ip_address;
      if (unit.urn) markerHtml += "<br>" + unit.urn;
      markerHtml += "</div>";

      const markerInfo = L.divIcon({
        className: "my-marker-info",
        html: markerHtml,
        iconSize: null,
      });

      if (!unit.type.startsWith("b-a-o")) {
        unit.infoMarker = L.marker([unit.lat, unit.lon], { icon: markerInfo });
        unit.infoMarker.addTo(this.getItemOverlay(unit));

        unit.infoMarker.setLatLng([unit.lat, unit.lon]);
        unit.infoMarker.setIcon(markerInfo);
      }
      unit.marker.setLatLng([unit.lat, unit.lon]);
      unit.marker.bindTooltip(popup(unit));
    },

    setActiveItemUid: function (uid, follow) {
      let currentActiveItem = this.getActiveItem();
      if (currentActiveItem?.isNew && currentActiveItem.uid != uid) {
        // Remove previous unsaved item
        this.deleteItem(currentActiveItem.uid);
      }
      if (uid && this.sharedState.items.has(uid)) {
        if (this.activeItemUid === uid) {
          console.log("Force select: ", uid);
          this.activeItemUid = null;
          this.$nextTick(() => (this.activeItemUid = uid));
        } else {
          this.activeItemUid = uid;
          let u = this.sharedState.items.get(uid);
          if (follow) this.mapToUnit(u);
          this.formFromUnit(u);
        }
      } else {
        this.activeItemUid = null;
        this.formFromUnit(null);
      }
    },

    getActiveItem: function () {
      console.log(
        "[getActiveItem!] ",
        this.activeItemUid,
        this.sharedState.items.has(this.activeItemUid),
        this.sharedState.items.get(this.activeItemUid)
      );
      if (
        !this.activeItemUid ||
        !this.sharedState.items.has(this.activeItemUid)
      )
        return null;
      return this.sharedState.items.get(this.activeItemUid);
    },

    byCategory: function (s) {
      let arr = Array.from(this.sharedState.items.values()).filter(function (
        u
      ) {
        return u.category === s;
      });
      arr.sort(function (a, b) {
        return a.callsign.toLowerCase().localeCompare(b.callsign.toLowerCase());
      });
      return this.ts && arr;
    },

    mapToUnit: function (u) {
      if (!u) {
        return;
      }
      if (u.lat !== 0 || u.lon !== 0) {
        this.map.setView([u.lat, u.lon]);
      }
    },

    getImg: function (item) {
      return getIconUri(item, false).uri;
    },

    milImg: function (item) {
      return getMilIcon(item, false).uri;
    },

    dt: function (str) {
      let d = new Date(Date.parse(str));
      return (
        ("0" + d.getDate()).slice(-2) +
        "-" +
        ("0" + (d.getMonth() + 1)).slice(-2) +
        "-" +
        d.getFullYear() +
        " " +
        ("0" + d.getHours()).slice(-2) +
        ":" +
        ("0" + d.getMinutes()).slice(-2)
      );
    },

    sp: function (v) {
      return (v * 3.6).toFixed(1);
    },

    modeIs: function (s) {
      return (
        document.getElementById(s) &&
        document.getElementById(s).checked === true
      );
    },

    mouseMove: function (e) {
      this.coords = e.latlng;
    },

    mapClickAddUnit: function (e) {
      console.log("mapClickAddUnit called with event:", e);
      let now = new Date();
      let stale = new Date(now);
      stale.setDate(stale.getDate() + 365);
      let u = {
        uid: uuidv4(), // Generate a UUID for the new unit
        category: "unit",
        callsign: "unit-" + this.unit_num++, // Use unit_num for units
        sidc: store.sidcFromType("a-h-G"),
        start_time: now,
        last_seen: now,
        stale_time: stale,
        type: "a-h-G",
        lat: e.latlng.lat,
        lon: e.latlng.lng,
        hae: 0,
        speed: 0,
        course: 0,
        status: "",
        text: "",
        parent_uid: "",
        parent_callsign: "",
        local: true,
        send: false, // Do not send immediately
        web_sensor: "",
        isNew: true, // Mark as a new item to trigger automatic edit mode
      };
      if (this.config && this.config.uid) {
        u.parent_uid = this.config.uid;
        u.parent_callsign = this.config.callsign;
      }

      console.log("New unit created locally:", u);
      store.state.items.set(u.uid, u); // Add the new unit to the store
      store.state.ts += 1; // Increment timestamp to trigger reactivity
      this._processAddition(u); // Manually add the marker for the new unit
      this.setActiveItemUid(u.uid, true); // Set the new unit as the current unit to display in sidebar
      // The sidebar watcher for activeItem should handle opening the sidebar and showing the form
    },
    mapClickAddCasevac: function (e) {
      console.log("mapClickAddCasevac called with event:", e);
      let now = new Date();
      let stale = new Date(now);
      stale.setDate(stale.getDate() + 365);
      let u = {
        uid: uuidv4(), // Generate a UUID for the new casevac
        category: "casevac", // Set category to casevac
        callsign: "casevac-" + uuidv4().substring(0, 4), // Generate a simple callsign
        sidc: "b-m-o-!!!!", // Set a default SIDC for now
        start_time: now,
        last_seen: now,
        stale_time: stale,
        type: "b-m-o-!!!!", // Set a default type for now
        lat: e.latlng.lat,
        lon: e.latlng.lng,
        hae: 0,
        speed: 0,
        course: 0,
        status: "",
        text: "",
        parent_uid: "",
        parent_callsign: "",
        local: true,
        send: false, // Do not send immediately
        web_sensor: "",
        isNew: true, // Mark as a new item to trigger automatic edit mode
        casevac_detail: {
          // Initialize casevac_detail
          casevac: true,
          freq: 0,
          urgent: 0,
          priority: 0,
          routine: 0,
          hoist: false,
          extraction_equipment: false,
          ventilator: false,
          equipment_other: false,
          equipment_detail: "",
          litter: 0,
          ambulatory: 0,
          security: 0,
          us_military: 0,
          us_civilian: 0,
          nonus_military: 0,
          nonus_civilian: 0,
          epw: 0,
          child: 0,
          hlz_marking: 0,
        },
      };
      if (this.config && this.config.uid) {
        u.parent_uid = this.config.uid;
        u.parent_callsign = this.config.callsign;
      }

      console.log("New casevac created locally:", u);
      store.state.items.set(u.uid, u); // Add the new casevac to the store
      store.state.ts += 1; // Increment timestamp to trigger reactivity
      this._processAddition(u); // Manually add the marker for the new casevac
      this.setActiveItemUid(u.uid, true); // Set the new casevac as the current item to display in sidebar
      // The sidebar watcher for activeItem should handle opening the sidebar and showing the form
    },
    mapClickAddUnit: function (e) {
      console.log("mapClickAddUnit called with event:", e);
      let now = new Date();
      let stale = new Date(now);
      stale.setDate(stale.getDate() + 365);
      let u = {
        uid: uuidv4(), // Generate a UUID for the new unit
        category: "unit",
        callsign: "unit-" + this.unit_num++, // Use unit_num for units
        sidc: store.sidcFromType("a-h-G"),
        start_time: now,
        last_seen: now,
        stale_time: stale,
        type: "a-h-G",
        lat: e.latlng.lat,
        lon: e.latlng.lng,
        hae: 0,
        speed: 0,
        course: 0,
        status: "",
        text: "",
        parent_uid: "",
        parent_callsign: "",
        local: true,
        send: false, // Do not send immediately
        web_sensor: "",
        isNew: true, // Mark as a new item to trigger automatic edit mode
      };
      if (this.config && this.config.uid) {
        u.parent_uid = this.config.uid;
        u.parent_callsign = this.config.callsign;
      }

      console.log("New unit created locally:", u);
      store.state.items.set(u.uid, u); // Add the new unit to the store
      store.state.ts += 1; // Increment timestamp to trigger reactivity
      this._processAddition(u); // Manually add the marker for the new unit
      this.setActiveItemUid(u.uid, true); // Set the new unit as the current unit to display in sidebar
      // The sidebar watcher for activeItem should handle opening the sidebar and showing the form
    },
    mapClick: function (e) {
      if (this.inDrawMode) {
        return;
      }
      if (this.mode === "add_unit") {
        this.mapClickAddUnit(e);
        this.mode = "map";
        return;
      }
      if (this.mode === "add_casevac") {
        this.mapClickAddCasevac(e);
        this.mode = "map";
        return;
      }
      // if (this.modeIs("redx")) {
      //   this.addOrMove("redx", e.latlng, "/static/icons/x.png");
      //   return;
      // }
      // if (this.modeIs("dp1")) {
      //   this.addOrMove("dp1", e.latlng, "/static/icons/spoi_icon.png");
      //   return;
      // }
      // if (this.modeIs("point")) {
      //   let uid = uuidv4();
      //   let now = new Date();
      //   let stale = new Date(now);
      //   stale.setDate(stale.getDate() + 365);
      //   let u = {
      //     uid: uid,
      //     category: "point",
      //     callsign: "point-" + this.point_num++,
      //     sidc: "",
      //     start_time: now,
      //     last_seen: now,
      //     stale_time: stale,
      //     type: "b-m-p-s-m",
      //     lat: e.latlng.lat,
      //     lon: e.latlng.lng,
      //     hae: 0,
      //     speed: 0,
      //     course: 0,
      //     status: "",
      //     text: "",
      //     parent_uid: "",
      //     parent_callsign: "",
      //     local: true,
      //     send: true,
      //     web_sensor: "",
      //     isNew: true, // Mark as a new item to trigger automatic edit mode
      //   };
      //   if (this.config && this.config.uid) {
      //     u.parent_uid = this.config.uid;
      //     u.parent_callsign = this.config.callsign;
      //   }
      //   const vm = this;
      //   this.saveItem(u, function () {
      //     vm.setActiveItemUid(u.uid, true);
      //     new bootstrap.Modal(document.querySelector("#edit")).show();
      //   });
      // }
      // if (this.modeIs("me")) {
      //   this.config.lat = e.latlng.lat;
      //   this.config.lon = e.latlng.lng;
      //   this.me.setLatLng(e.latlng);
      //   const markerInfo = L.divIcon({
      //     className: "my-marker-info",
      //     html:
      //       "<div>" +
      //       this.config.callsign +
      //       "<br>" +
      //       this.config.ip_address +
      //       "<br>" +
      //       this.config.urn +
      //       "</div>",
      //     iconSize: null,
      //   });
      //   if (!this.myInfoMarker) {
      //     this.myInfoMarker = L.marker([e.latlng.lat, e.latlng.lon], {
      //       icon: markerInfo,
      //     });
      //     this.myInfoMarker.addTo(this.map);
      //   }
      //   this.myInfoMarker.setLatLng(e.latlng);
      //   this.myInfoMarker.setIcon(markerInfo);
      //   const requestOptions = {
      //     method: "POST",
      //     headers: { "Content-Type": "application/json" },
      //     body: JSON.stringify({ lat: e.latlng.lat, lon: e.latlng.lng }),
      //   };
      //   fetch(window.baseUrl + " /pos", requestOptions);
      // }
    },

    checkEmergency: function (
      emergency_switch1,
      emergency_switch2,
      emergency_type
    ) {
      if (emergency_switch1 && emergency_switch2) {
        this.activateEmergencyBeacon(emergency_type);
      } else {
        this.deactivateEmergencyBeacon();
      }
    },

    activateEmergencyBeacon: function (emergency_type) {
      if (!this.beacon_active) {
        this.beacon_active = true;
        const alert = this.createEmergencyAlert(emergency_type);
        this.saveItem(alert);
      }
    },

    deactivateEmergencyBeacon: function () {
      if (this.beacon_active) {
        this.beacon_active = false;
        let alert = this.sharedState.items.get(this.config.uid + "-9-1-1");
        if (alert) {
          alert.type = "b-a-o-can";
        } else {
          alert = this.createEmergencyAlert("b-a-o-can");
        }
        this.saveItem(alert);
      }
    },

    saveItem: function (u, cb) {
      console.log("Sending:", this.cleanUnit(u));
      store.createItem(u).then((results) => {
        this.processUnits(results);
        if (cb) cb();
      });
    },

    deleteItem: function (uid) {
      console.debug("Deleting:", uid);
      store.removeItem(uid).then((units) => this.processUnits(units));
    },

    formFromUnit: function (u) {
      if (!u) {
        this.form_unit = {
          uid: "",
          callsign: "",
          category: "",
          type: "",
          subtype: "",
          aff: "",
          text: "",
          send: false,
          root_sidc: null,
          web_sensor: "",
          lat: 0,
          lon: 0,
        };
      } else {
        this.form_unit = {
          uid: u.uid,
          callsign: u.callsign,
          category: u.category,
          type: u.type,
          subtype: "G",
          aff: "h",
          text: u.text,
          send: u.send,
          root_sidc: store.state.types,
          web_sensor: u.web_sensor,
        };

        if (u.uid === "__NEW__") {
          this.form_unit.lat = u.lat;
          this.form_unit.lon = u.lon;
        }

        if (u.type.startsWith("u-") || u.type.startsWith("b-m-r")) {
          // drawing
          this.form_unit.color = u.color;

          this.form_unit.geofence = u.geofence;
          this.form_unit.geofence_aff = u.geofence_aff;
          // this.form_unit.geofence_send = u.geofence_send
        }

        if (u.type.startsWith("a-")) {
          this.form_unit.type = "b-m-p-s-m";
          this.form_unit.aff = u.type.substring(2, 3);
          this.form_unit.subtype = u.type.substring(4);
          this.form_unit.root_sidc = store.getRootSidc(u.type.substring(4));
        }
      }
    },

    saveEditForm: function () {
      u = {};

      if (this.form_unit.uid === "__NEW__") {
        u = {
          uid: uuidv4(),
          lat: this.form_unit.lat,
          lon: this.form_unit.lon,
          ...u,
        };
      } else {
        u = this.getActiveItem();
        if (!u) {
          return;
        }
      }

      u.callsign = this.form_unit.callsign;
      u.category = this.form_unit.category;
      u.send = this.form_unit.send;
      u.text = this.form_unit.text;
      u.web_sensor = this.form_unit.web_sensor;
      u.color = this.form_unit.color;

      if (this.form_unit.category === "unit") {
        u.type = ["a", this.form_unit.aff, this.form_unit.subtype].join("-");
        u.sidc = store.sidcFromType(u.type);
      } else {
        if (this.form_unit.category === "drawing") {
          u.geofence = this.form_unit.geofence;
          u.geofence_aff = this.form_unit.geofence_aff;
        }
        u.type = this.form_unit.type;
        u.sidc = "";
      }

      console.log(u);

      this.saveItem(u);
    },

    removeTool: function (name) {
      if (this.tools.has(name)) {
        let p = this.tools.get(name);
        this.map.removeLayer(p);
        p.remove();
        this.tools.delete(name);
        this.ts++;
      }
    },

    getTool: function (name) {
      return this.tools.get(name);
    },

    addOrMove(name, coord, icon) {
      if (this.tools.has(name)) {
        this.tools.get(name).setLatLng(coord);
      } else {
        let p = new L.marker(coord).addTo(this.map);
        if (icon) {
          p.setIcon(
            L.icon({
              iconUrl: icon,
              iconSize: [20, 20],
              iconAnchor: new L.Point(10, 10),
            })
          );
        }
        this.tools.set(name, p);
      }
      this.ts++;
    },

    contactsNum: function () {
      let online = 0;
      let total = 0;
      this.sharedState.items.forEach(function (u) {
        if (u.category === "contact") {
          if (u.status === "Online") online += 1;
          if (u.status !== "") total += 1;
        }
      });

      return online + "/" + total;
    },

    flowsCount: function () {
      return (
        "↓" +
        this.sharedState.flows
          .filter((it) => it.direction == 1)
          .length.toLocaleString("fa-ir") +
        " / ↑" +
        this.sharedState.flows
          .filter((it) => it.direction == 2)
          .length.toLocaleString("fa-ir") +
        " / ↕" +
        this.sharedState.flows
          .filter((it) => it.direction == 3)
          .length.toLocaleString("fa-ir")
      );
    },

    sensorsCount: function () {
      return this.sharedState.sensors.length.toLocaleString("fa-ir");
    },

    countByCategory: function (s) {
      let total = 0;
      this.sharedState.items.forEach(function (u) {
        if (u.category === s) total += 1;
      });

      return total;
    },

    msgNum: function () {
      if (!this.messages) return 0;
      let n = 0;
      for (const [key, value] of Object.entries(this.messages)) {
        if (value.messages) {
          for (m of value.messages) {
            if (!this.seenMessages.has(m.message_id)) n++;
          }
        }
      }
      return n;
    },

    msgNum1: function (uid) {
      if (!this.messages || !this.messages[uid].messages) return 0;
      let n = 0;
      for (m of this.messages[uid].messages) {
        if (!this.seenMessages.has(m.message_id)) n++;
      }
      return n;
    },

    openChat: function (uid, chatroom) {
      this.chat_uid = uid;
      this.chatroom = chatroom;
      new bootstrap.Modal(document.getElementById("messages")).show();

      if (this.messages[this.chat_uid]) {
        for (m of this.messages[this.chat_uid].messages) {
          this.seenMessages.add(m.message_id);
        }
      }
    },
    onDoneCasevac: function (u) {
      this.map.removeLayer(this.casevacMarker);
      this.casevacLocation = null;
      if (u !== null) {
        this.saveItem(u);
      }
    },

    openFlows: function () {
      new bootstrap.Modal(document.getElementById("flows-modal")).show();
    },

    openSensors: function () {
      new bootstrap.Modal(document.getElementById("sensors-modal")).show();
    },
    openAlarms: function () {
      new bootstrap.Modal(document.getElementById("alarms-modal")).show();
    },

    getStatus: function (uid) {
      return this.ts && this.sharedState.items.get(uid)?.status;
    },

    getMessages: function () {
      if (!this.chat_uid) {
        return [];
      }

      let msgs = this.messages[this.chat_uid]
        ? this.messages[this.chat_uid].messages
        : [];

      if (document.getElementById("messages").style.display !== "none") {
        for (m of msgs) {
          this.seenMessages.add(m.message_id);
        }
      }

      return msgs;
    },

    getUnitName: function (u) {
      let res = u.callsign || "no name";
      if (u.parent_uid === this.config.uid) {
        if (u.send === true) {
          res = "+ " + res;
        } else {
          res = "* " + res;
        }
      }
      return res;
    },

    cancelEditForm: function () {
      this.formFromUnit(this.getActiveItem());
    },

    cleanUnit: function (u) {
      let res = {};

      for (const k in u) {
        if (k !== "marker" && k !== "infoMarker" && k !== "polygon") {
          res[k] = u[k];
        }
      }
      return res;
    },

    menuDeleteAction: function (uid) {
      let unit = this.sharedState.items.get(uid);
      store.removeItem(uid).then((units) => this.processUnits(units));
      this.map.closePopup(unit.marker.contextmenu);
    },

    menuSendAction: function (uid) {
      let unit = this.sharedState.items.get(uid);
      this.sharedState.unitToSend = unit;
      new bootstrap.Modal(document.querySelector("#send-modal")).show();
      this.map.closePopup(unit.marker.contextmenu);
    },

    // deleteCurrentUnit: function () {
    //   if (!this.activeItemUid) return;
    //   store
    //     .removeItem(this.activeItemUid)
    //     .then((units) => this.processUnits(units));
    // },

    sendMessage: function () {
      let msg = {
        from: this.config.callsign,
        from_uid: this.config.uid,
        chatroom: this.chatroom,
        to_uid: this.chat_uid,
        text: this.chat_msg,
      };
      this.chat_msg = "";

      const requestOptions = {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(msg),
      };
      let vm = this;
      fetch(window.baseUrl + "/message", requestOptions)
        .then(function (response) {
          return response.json();
        })
        .then(function (data) {
          vm.messages = data;
        });
    },
    toggleOverlay: function (overlayName, overlayActive) {
      console.log("toggleOverlay", overlayName, overlayActive);
      if (!overlayActive) this.overlays[overlayName].removeFrom(this.map);
      else this.overlays[overlayName].addTo(this.map);
    },

    createEmergencyAlert: function (emergencyType) {
      let uid = uuidv4();
      let now = new Date();
      let stale = new Date(now);

      stale.setDate(stale.getDate() + 365);
      let u = {
        uid: this.config.uid + "-9-1-1",
        category: "alarm",
        callsign: this.config.callsign + "-Alert",
        sidc: "",
        start_time: now,
        last_seen: now,
        stale_time: stale,
        type: emergencyType,
        lat: this.config.lat,
        lon: this.config.lon,
        hae: 0,
        speed: 0,
        course: 0,
        status: "",
        text: "",
        parent_uid: this.config.uid,
        parent_callsign: this.config.callsign,
        local: true,
        send: true,
        web_sensor: "",
        links: [],
      };

      return u;
    },
    locateByGPS: function () {
      fetch(window.baseUrl + " /pos").then((r) =>
        this.map.setView([this.config.lat, this.config.lon])
      );
    },
    changeMode: function (newMode) {
      this.mode = newMode;
    },
  },
});
