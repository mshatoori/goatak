function needIconUpdate(oldUnit, newUnit) {
    if (oldUnit.sidc !== newUnit.sidc || oldUnit.status !== newUnit.status) return true;
    if (oldUnit.speed !== newUnit.speed || oldUnit.direction !== newUnit.direction) return true;
    if (oldUnit.team !== newUnit.team || oldUnit.role !== newUnit.role) return true;

    if (newUnit.sidc.charAt(2) === 'A' && oldUnit.hae !== newUnit.hae) return true;
    return false;
}

L.Marker.RotatedMarker = L.Marker.extend({
    _reset: function () {
        var pos = this._map.latLngToLayerPoint(this._latlng).round();

        L.DomUtil.setPosition(this._icon, pos);
        if (this._shadow) {
            L.DomUtil.setPosition(this._shadow, pos);
        }

        if (this.options.iconAngle) {
            this._icon.style.WebkitTransform = this._icon.style.WebkitTransform + ' rotate(' + this.options.iconAngle + 'deg)';
        }

        this._icon.style.zIndex = pos.y;
    },

    setIconAngle: function (iconAngle) {

        if (this._map) {
            this._removeIcon();
        }

        this.options.iconAngle = iconAngle;

        if (this._map) {
            this._initIcon();
            this._reset();
        }
    }

});

let app = new Vue({
    el: '#app',
    data: {
        map: null,
        layers: null,
        conn: null,
        units: new Map(),
        outgoing_feeds: new Map(),
        incoming_feeds: new Map(),
        sensors: new Map(),
        messages: [],
        seenMessages: new Set(),
        ts: 0,
        locked_unit_uid: '',
        current_unit_uid: null,
        config: null,
        tools: new Map(),
        me: null,
        coords: null,
        point_num: 1,
        coord_format: "d",
        form_unit: {},
        types: null,
        chatroom: "",
        chat_uid: "",
        chat_msg: "",

        sharedState: store.state,

        new_out_feed: {
            ip: '',
            port: '',
            outgoing: true,
        },
        new_in_feed: {
            ip: '',
            port: '',
            outgoing: false,
        },
        new_sensor: {
            ip: '',
            port: '',
            type: '',
        }
    },
    provide: function () {
        return {
            map: this.map,
            printCoords: this.printCoords,
            distBea: this.distBea,
            latlng: this.latlng,
        }
    },
    mounted() {
        this.map = L.map('map');
        this.inDrawMode = false;

        this.drawnItems = new L.FeatureGroup();
        this.map.addLayer(this.drawnItems);

        this.drawControl = new L.Control.Draw({
            edit: {
                featureGroup: this.drawnItems,
                poly: {
                    allowIntersection: false
                }
            },
            draw: {
                polygon: {
                    allowIntersection: false,
                    showArea: true
                }
            }
        });
        this.map.addControl(this.drawControl);
        vm = this;

        const drawStart = function (event) {
            console.log("IN DRAW MODE")
            vm.inDrawMode = true
        }
        const drawStop = function (event) {
            console.log("OUT OF DRAW MODE")
            vm.inDrawMode = false
        }

        this.map.on(L.Draw.Event.DRAWSTART, drawStart);
        this.map.on(L.Draw.Event.EDITSTART, drawStart);

        this.map.on(L.Draw.Event.DRAWSTOP, drawStop);
        this.map.on(L.Draw.Event.EDITSTOP, drawStop);
        this.map.on(L.Draw.Event.CREATED, function (event) {
            var layer = event.layer;

            console.log("DRAWN:", event)

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
                    links: []
                }
                if (vm.config && vm.config.uid) {
                    u.parent_uid = vm.config.uid;
                    u.parent_callsign = vm.config.callsign;
                }

                let latSum = 0
                let lngSum = 0

                layer.editing.latlngs[0][0].forEach((latlng) => {
                    console.log(latlng)
                    latSum += latlng.lat
                    lngSum += latlng.lng
                    u.links.push(latlng.lat + "," + latlng.lng)
                })

                u.lat = latSum / layer.editing.latlngs[0][0].length
                u.lon = lngSum / layer.editing.latlngs[0][0].length

                u.color = "white"
                u.geofence = false
                u.geofence_aff = "All"
                // u.geofence_send = false


                console.log("TrySending:", u)

                vm.sendUnit(u, function () {
                    vm.setCurrentUnitUid(u.uid, true);
                    new bootstrap.Modal(document.querySelector("#drawing-edit")).show();
                });
            }

            // vm.drawnItems.addLayer(layer);
        });
        this.map.on(L.Draw.Event.DRAWVERTEX, function (event) {
            console.log("DRAW VERTEX:", event)
        })

        this.map.setView([60, 30], 11);

        L.control.scale({metric: true}).addTo(this.map);

        this.getConfig();

        let supportsWebSockets = 'WebSocket' in window || 'MozWebSocket' in window;

        if (supportsWebSockets) {
            this.connect();
            setInterval(this.fetchAllUnits, 60000);
        }

        this.renew();
        setInterval(this.renew, 5000);

        this.map.on('click', this.mapClick);
        this.map.on('mousemove', this.mouseMove);

        this.formFromUnit(null);
    },

    computed: {
        current_unit: function () {
            return this.current_unit_uid ? this.current_unit_uid && this.getCurrentUnit() : null;
        }
    },

    methods: {
        configUpdated: function () {
            console.log("config updated")
            const markerInfo = L.divIcon(
                {
                    className: 'my-marker-info',
                    html: '<div>' + this.config.callsign + '<br>' + this.config.ip_address + '<br>' + this.config.urn + '</div>',
                    iconSize: null
                });

            this.myInfoMarker.setIcon(markerInfo);

        },
        getConfig: function () {
            let vm = this;

            fetch('/config')
                .then(function (response) {
                    return response.json()
                })
                .then(function (data) {
                    vm.config = data;

                    vm.map.setView([data.lat, data.lon], data.zoom);

                    if (vm.config.callsign) {
                        vm.me = new L.Marker.RotatedMarker([data.lat, data.lon]);
                        vm.me.setIcon(L.icon({
                            iconUrl: "/static/icons/self.png",
                            iconAnchor: new L.Point(16, 16),
                        }));
                        vm.me.addTo(vm.map);
                        // vm.me.bindTooltip(popup(vm.me));

                        const markerInfo = L.divIcon(
                            {
                                className: 'my-marker-info',
                                html: '<div>' + vm.config.callsign + '<br>' + vm.config.ip_address + '<br>' + vm.config.urn + '</div>',
                                iconSize: null
                            });

                        if (!vm.myInfoMarker) {
                            vm.myInfoMarker = L.marker([data.lat, data.lon], {icon: markerInfo});
                            vm.myInfoMarker.addTo(vm.map);
                        }

                        vm.myInfoMarker.setLatLng([data.lat, data.lon]);
                        vm.myInfoMarker.setIcon(markerInfo);

                        fetch('/types')
                            .then(function (response) {
                                return response.json()
                            })
                            .then(function (data) {
                                vm.types = data;
                            });
                    }

                    layers = L.control.layers({}, null, {hideSingleBase: true});
                    layers.addTo(vm.map);

                    let first = true;
                    data.layers.forEach(function (i) {
                        let opts = {
                            minZoom: i.minZoom ?? 1,
                            maxZoom: i.maxZoom ?? 20,
                        }

                        if (i.parts) {
                            opts["subdomains"] = i.parts;
                        }

                        var lz = null

                        if (first) {
                            opts["bounds"] = L.latLngBounds(L.latLng(25, 43), L.latLng(40, 63));
                            lz = L.tileLayer(i.url, opts);
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
                            lz.addTo(vm.map);
                        }
                    });
                });
        },

        connect: function () {
            let url = (window.location.protocol === 'https:' ? 'wss://' : 'ws://') + window.location.host + '/ws';
            let vm = this;

            this.fetchAllUnits();
            this.fetchMessages();
            store.fetchSensors()
            store.fetchFeeds()

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
            let vm = this;

            fetch('/unit')
                .then(function (response) {
                    return response.json()
                })
                .then(vm.processUnits);
        },

        fetchMessages: function () {
            let vm = this;

            fetch('/message')
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
                    headers: {"Content-Type": "application/json"},
                    body: JSON.stringify({lat: p.lat, lon: p.lng, name: "DP1"})
                };
                fetch("/dp", requestOptions);
            }
        },


        processUnits: function (data) {
            let keys = new Set();

            console.log("units:")
            console.log(data)

            for (let u of data) {
                keys.add(this.processUnit(u)?.uid);
            }

            for (const k of this.units.keys()) {
                if (!keys.has(k)) {
                    this.removeUnit(k);
                }
            }

            this.ts += 1;
        },

        processUnit: function (u, forceUpdate) {
            if (!u) return;
            let unit = this.units.get(u.uid);

            if (u.category === "drawing") {
                // TODO: Handle things other than polygon!
                let latlngs = u.links.map((it) => {
                    return it.split(",").map(parseFloat)
                })

                u.marker = L.polygon(latlngs, {color: u.color, interactive: !u.uid.endsWith('-fence')});

                if (!unit) {
                    this.units.set(u.uid, u);
                    unit = u;
                } else {
                    vm.drawnItems.removeLayer(unit.marker);
                    for (const k of Object.keys(u)) {
                        unit[k] = u[k];
                    }
                }
                if (!u.uid.endsWith("-fence")) {
                    u.marker.on('click', function (e) {
                        app.setCurrentUnitUid(u.uid, false);
                    });
                }
                u.marker.addTo(vm.drawnItems);
                unit = u;
            } else {
                let updateIcon = false;

                if (!unit) {
                    this.units.set(u.uid, u);
                    unit = u;
                    updateIcon = true;
                } else {
                    updateIcon = forceUpdate || needIconUpdate(unit, u);
                    for (const k of Object.keys(u)) {
                        unit[k] = u[k];
                    }
                }
                this.updateUnitMarker(unit, false, updateIcon);

                if (this.locked_unit_uid === unit.uid) {
                    this.map.setView([unit.lat, unit.lon]);
                }
            }

            this.addContextMenuToMarker(unit)

            return unit;
        },

        addContextMenuToMarker: function (unit) {
            if (unit.uid.endsWith("-fence"))
                return

            if (unit.marker) {
                unit.marker.on('contextmenu', (e) => {
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
                        unit.marker.contextmenu.addTo(this.map)
                    }
                    unit.marker.contextmenu.openOn(this.map);
                });
            }
        },

        processMe: function (u) {
            if (!u || !this.me) return;
            this.config.lat = u.lat;
            this.config.lon = u.lon;
            this.me.setLatLng([u.lat, u.lon]);
            if (this.myInfoMarker)
                this.myInfoMarker.setLatLng([u.lat, u.lon]);
            if (u.course)
                this.me.setIconAngle(u.course)
        },

        processWS: function (u) {
            if (u.type === "unit") {
                if (u.unit.uid === this.config.uid)
                    this.processMe(u.unit);
                else
                    this.processUnit(u.unit);
            }

            if (u.type === "delete") {
                this.removeUnit(u.uid);
            }

            if (u.type === "chat") {
                console.log(u.chat_msg);
                this.fetchMessages();
            }
        },

        updateUnitMarker: function (unit, draggable, updateIcon) {
            if (unit.lon === 0 && unit.lat === 0) {
                if (unit.marker) {
                    this.map.removeLayer(unit.marker);
                    unit.marker = null;
                }
                return
            }

            // console.log(unit);

            if (unit.marker) {
                if (updateIcon) {
                    unit.marker.setIcon(getIcon(unit, true));
                }
            } else {
                unit.marker = L.marker([unit.lat, unit.lon], {draggable: draggable});
                unit.marker.on('click', function (e) {
                    app.setCurrentUnitUid(unit.uid, false);
                });
                if (draggable) {
                    unit.marker.on('dragend', function (e) {
                        unit.lat = marker.getLatLng().lat;
                        unit.lon = marker.getLatLng().lng;
                    });
                }
                unit.marker.setIcon(getIcon(unit, true));
                unit.marker.addTo(this.map);
            }

            let markerHtml = '<div>' + unit.callsign;
            if (unit.ip_address)
                markerHtml += '<br>' + unit.ip_address;
            if (unit.urn)
                markerHtml += '<br>' + unit.urn;
            markerHtml += '</div>';

            const markerInfo = L.divIcon(
                {
                    className: 'my-marker-info',
                    html: markerHtml,
                    iconSize: null
                });

            if (!unit.infoMarker) {
                unit.infoMarker = L.marker([unit.lat, unit.lon], {icon: markerInfo});
                unit.infoMarker.addTo(this.map);
            }

            unit.infoMarker.setLatLng([unit.lat, unit.lon]);
            unit.infoMarker.setIcon(markerInfo);

            unit.marker.setLatLng([unit.lat, unit.lon]);
            unit.marker.bindTooltip(popup(unit));
        },

        removeUnit: function (uid) {
            if (!this.units.has(uid)) return;

            let item = this.units.get(uid);
            if (item.marker) {
                this.map.removeLayer(item.marker);
                item.marker.remove();
                if (item.infoMarker) {
                    this.map.removeLayer(item.infoMarker)
                    item.infoMarker.remove()
                }
            }
            this.units.delete(uid);
            if (this.current_unit_uid === uid) {
                this.setCurrentUnitUid(null, false);
            }
        },

        setCurrentUnitUid: function (uid, follow) {
            if (uid && this.units.has(uid)) {
                this.current_unit_uid = uid;
                let u = this.units.get(uid);
                if (follow) this.mapToUnit(u);
                this.formFromUnit(u);
            } else {
                this.current_unit_uid = null;
                this.formFromUnit(null);
            }
        },

        getCurrentUnit: function () {
            if (!this.current_unit_uid || !this.units.has(this.current_unit_uid)) return null;
            return this.units.get(this.current_unit_uid);
        },

        byCategory: function (s) {
            let arr = Array.from(this.units.values()).filter(function (u) {
                return u.category === s
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
            return ("0" + d.getDate()).slice(-2) + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" +
                d.getFullYear() + " " + ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2);
        },

        sp: function (v) {
            return (v * 3.6).toFixed(1);
        },

        modeIs: function (s) {
            return document.getElementById(s) && document.getElementById(s).checked === true;
        },

        mouseMove: function (e) {
            this.coords = e.latlng;
        },

        mapClick: function (e) {
            if (this.inDrawMode) {
                return;
            }
            if (this.modeIs("redx")) {
                this.addOrMove("redx", e.latlng, "/static/icons/x.png")
                return;
            }
            if (this.modeIs("dp1")) {
                this.addOrMove("dp1", e.latlng, "/static/icons/spoi_icon.png")
                return;
            }
            if (this.modeIs("point")) {
                let uid = uuidv4();
                let now = new Date();
                let stale = new Date(now);
                stale.setDate(stale.getDate() + 365);
                let u = {
                    uid: uid,
                    category: "point",
                    callsign: "point-" + this.point_num++,
                    sidc: "",
                    start_time: now,
                    last_seen: now,
                    stale_time: stale,
                    type: "b-m-p-s-m",
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
                    send: true,
                    web_sensor: "",
                }
                if (this.config && this.config.uid) {
                    u.parent_uid = this.config.uid;
                    u.parent_callsign = this.config.callsign;
                }

                const vm = this
                this.sendUnit(u, function () {
                    vm.setCurrentUnitUid(u.uid, true);
                    new bootstrap.Modal(document.querySelector("#edit")).show();
                });
            }
            if (this.modeIs("me")) {
                this.config.lat = e.latlng.lat;
                this.config.lon = e.latlng.lng;
                this.me.setLatLng(e.latlng);
                const markerInfo = L.divIcon(
                    {
                        className: 'my-marker-info',
                        html: '<div>' + this.config.callsign + '<br>' + this.config.ip_address + '<br>' + this.config.urn + '</div>',
                        iconSize: null
                    });

                if (!this.myInfoMarker) {
                    this.myInfoMarker = L.marker([e.latlng.lat, e.latlng.lon], {icon: markerInfo});
                    this.myInfoMarker.addTo(this.map);
                }

                this.myInfoMarker.setLatLng(e.latlng);
                this.myInfoMarker.setIcon(markerInfo);
                const requestOptions = {
                    method: "POST",
                    headers: {"Content-Type": "application/json"},
                    body: JSON.stringify({lat: e.latlng.lat, lon: e.latlng.lng})
                };
                fetch("/pos", requestOptions);
            }
        },

        sendUnit: function (u, cb) {
            console.log("Sending:", this.cleanUnit(u))
            const requestOptions = {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify(this.cleanUnit(u))
            };
            let vm = this;
            fetch("/unit", requestOptions)
                .then(function (response) {
                    return response.json()
                })
                .then(function (data) {
                    vm.processUnit(data, true);
                    if (cb) {
                        cb()
                    }
                });
        },

        formFromUnit: function (u) {
            if (!u) {
                this.form_unit = {
                    callsign: "",
                    category: "",
                    type: "",
                    subtype: "",
                    aff: "",
                    text: "",
                    send: false,
                    root_sidc: null,
                    web_sensor: "",
                };
            } else {
                this.form_unit = {
                    callsign: u.callsign,
                    category: u.category,
                    type: u.type,
                    subtype: "G",
                    aff: "h",
                    text: u.text,
                    send: u.send,
                    root_sidc: this.types,
                    web_sensor: u.web_sensor,
                };

                if (u.type.startsWith('u-')) {
                    // drawing
                    this.form_unit.color = u.color;

                    this.form_unit.geofence = u.geofence
                    this.form_unit.geofence_aff = u.geofence_aff
                    // this.form_unit.geofence_send = u.geofence_send
                }

                if (u.type.startsWith('a-')) {
                    this.form_unit.type = 'b-m-p-s-m';
                    this.form_unit.aff = u.type.substring(2, 3);
                    this.form_unit.subtype = u.type.substring(4);
                    this.form_unit.root_sidc = this.getRootSidc(u.type.substring(4))
                }
            }
        },

        saveEditForm: function () {
            let u = this.getCurrentUnit();
            if (!u) return;

            u.callsign = this.form_unit.callsign;
            u.category = this.form_unit.category;
            u.send = this.form_unit.send;
            u.text = this.form_unit.text;
            u.web_sensor = this.form_unit.web_sensor;
            u.color = this.form_unit.color;

            if (this.form_unit.category === "unit") {
                u.type = ["a", this.form_unit.aff, this.form_unit.subtype].join('-');
                u.sidc = this.sidcFromType(u.type);
            } else {
                if (this.form_unit.category === "drawing") {
                    u.geofence = this.form_unit.geofence;
                    u.geofence_aff = this.form_unit.geofence_aff;
                }
                u.type = this.form_unit.type;
                u.sidc = "";
            }

            console.log(u)

            this.sendUnit(u);
        },

        getRootSidc: function (s) {
            let curr = this.types;

            if (!curr?.next) {
                return null;
            }

            for (; ;) {
                let found = false;
                for (const k of curr.next) {
                    if (k.code === s) {
                        return curr;
                    }

                    if (s.startsWith(k.code)) {
                        curr = k;
                        found = true;
                        break
                    }
                }
                if (!found) {
                    return null;
                }
            }
        },

        getSidc: function (s) {
            let curr = this.types;

            if (s === "") {
                return curr;
            }

            if (!curr?.next) {
                return null;
            }

            for (; ;) {
                for (const k of curr.next) {
                    if (k.code === s) {
                        return k;
                    }

                    if (s.startsWith(k.code)) {
                        curr = k;
                        break
                    }
                }
            }
            return null;
        },

        setFormRootSidc: function (s) {
            let t = this.getSidc(s);
            if (t?.next) {
                this.form_unit.root_sidc = t;
                this.form_unit.subtype = t.next[0].code;
            } else {
                this.form_unit.root_sidc = this.types;
                this.form_unit.subtype = this.types.next[0].code;
            }
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
                    p.setIcon(L.icon({
                        iconUrl: icon,
                        iconSize: [20, 20],
                        iconAnchor: new L.Point(10, 10),
                    }));
                }
                this.tools.set(name, p);
            }
            this.ts++;
        },

        printCoordsll: function (latlng) {
            return this.printCoords(latlng.lat, latlng.lng);
        },

        printCoords: function (lat, lng) {
            return lat.toFixed(6) + "," + lng.toFixed(6);
        },

        latlng: function (lat, lon) {
            return L.latLng(lat, lon);
        },

        distBea: function (p1, p2) {
            let toRadian = Math.PI / 180;
            // haversine formula
            // bearing
            let y = Math.sin((p2.lng - p1.lng) * toRadian) * Math.cos(p2.lat * toRadian);
            let x = Math.cos(p1.lat * toRadian) * Math.sin(p2.lat * toRadian) - Math.sin(p1.lat * toRadian) * Math.cos(p2.lat * toRadian) * Math.cos((p2.lng - p1.lng) * toRadian);
            let brng = Math.atan2(y, x) * 180 / Math.PI;
            brng += brng < 0 ? 360 : 0;
            // distance
            let R = 6371000; // meters
            let deltaF = (p2.lat - p1.lat) * toRadian;
            let deltaL = (p2.lng - p1.lng) * toRadian;
            let a = Math.sin(deltaF / 2) * Math.sin(deltaF / 2) + Math.cos(p1.lat * toRadian) * Math.cos(p2.lat * toRadian) * Math.sin(deltaL / 2) * Math.sin(deltaL / 2);
            let c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            let distance = R * c;
            return (distance < 10000 ? distance.toFixed(0) + "m " : (distance / 1000).toFixed(1) + "km ") + brng.toFixed(1) + "°T";
        },

        contactsNum: function () {
            let online = 0;
            let total = 0;
            this.units.forEach(function (u) {
                if (u.category === "contact") {
                    if (u.status === "Online") online += 1;
                    if (u.status !== "") total += 1;
                }
            })

            return online + "/" + total;
        },

        feedsCount: function () {
            return "↓" + this.sharedState.feeds.filter(it => it.direction == 1).length.toLocaleString('fa-ir') +
                " / ↑" + this.sharedState.feeds.filter(it => it.direction == 2).length.toLocaleString('fa-ir') +
                " / ↕" + this.sharedState.feeds.filter(it => it.direction == 3).length.toLocaleString('fa-ir');
        },

        sensorsCount: function () {
            return this.sharedState.sensors.length.toLocaleString('fa-ir');
        },

        countByCategory: function (s) {
            let total = 0;
            this.units.forEach(function (u) {
                if (u.category === s) total += 1;
            })

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
            new bootstrap.Modal(document.getElementById('messages')).show();

            if (this.messages[this.chat_uid]) {
                for (m of this.messages[this.chat_uid].messages) {
                    this.seenMessages.add(m.message_id);
                }
            }
        },

        openFeeds: function () {
            new bootstrap.Modal(document.getElementById('feeds-modal')).show();
        },

        openSensors: function () {
            new bootstrap.Modal(document.getElementById('sensors-modal')).show();
        },
        openAlarms: function () {
            new bootstrap.Modal(document.getElementById('alarms-modal')).show();
        },

        getStatus: function (uid) {
            return this.ts && this.units.get(uid)?.status;
        },

        getMessages: function () {
            if (!this.chat_uid) {
                return [];
            }

            let msgs = this.messages[this.chat_uid] ? this.messages[this.chat_uid].messages : [];

            if (document.getElementById('messages').style.display !== 'none') {
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
            this.formFromUnit(this.getCurrentUnit());
        },

        sidcFromType: function (s) {
            if (!s.startsWith('a-')) return "";

            let n = s.split('-');

            let sidc = 'S' + n[1];

            if (n.length > 2) {
                sidc += n[2] + 'P';
            } else {
                sidc += '-P';
            }

            if (n.length > 3) {
                for (let i = 3; i < n.length; i++) {
                    if (n[i].length > 1) {
                        break
                    }
                    sidc += n[i];
                }
            }

            if (sidc.length < 10) {
                sidc += '-'.repeat(10 - sidc.length);
            }

            return sidc.toUpperCase();
        },

        cleanUnit: function (u) {
            let res = {};

            for (const k in u) {
                if (k !== 'marker' && k !== 'infoMarker' && k !== 'polygon') {
                    res[k] = u[k];
                }
            }
            return res;
        },

        menuDeleteAction: function (uid) {
            fetch("unit/" + uid, {method: "DELETE"})
                .then(function (response) {
                    return response.json()
                })
                .then(({units}) => {
                        this.processUnits(units)
                    }
                )
            let unit = app.units.get(uid)
            this.map.closePopup(unit.marker.contextmenu)
            // this.removeUnit(this.current_unit_uid);
        },

        menuSendAction: function (uid) {
            let unit = app.units.get(uid)
            this.sharedState.unitToSend = unit
            new bootstrap.Modal(document.querySelector("#send-modal")).show()
            this.map.closePopup(unit.marker.contextmenu)
        },

        deleteCurrentUnit: function () {
            if (!this.current_unit_uid) return;
            fetch("unit/" + this.current_unit_uid, {method: "DELETE"})
                .then(function (response) {
                    return response.json()
                })
                .then(({units}) => {
                        this.processUnits(units)
                    }
                )
            ;
            // this.removeUnit(this.current_unit_uid);
        },

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
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify(msg)
            };
            let vm = this;
            fetch("/message", requestOptions)
                .then(function (response) {
                    return response.json()
                })
                .then(function (data) {
                    vm.messages = data;
                });

        },
    },
});

function popup(item) {
    let v = '<b>' + item.callsign + '</b><br/>';
    if (item.team) v += item.team + ' ' + item.role + '<br/>';
    if (item.speed && item.speed > 0) v += 'Speed: ' + item.speed.toFixed(0) + ' m/s<br/>';
    if (item.sidc.charAt(2) === 'A') {
        v += "hae: " + item.hae.toFixed(0) + " m<br/>";
    }
    v += '<span dir="ltr">' + latLongToIso6709(item.lat, item.lon) + '</span><br/>';
    v += item.text.replaceAll('\n', '<br/>').replaceAll('; ', '<br/>');
    return v;
}

function latLongToIso6709(lat, lon) {
    const isLatNegative = lat < 0;
    const isLonNegative = lon < 0;
    lat = Math.abs(lat);
    lon = Math.abs(lon);

    const degreesLat = Math.floor(lat);
    const minutesLat = Math.floor((lat - degreesLat) * 60);
    const decimalMinutesLat = (((lat - degreesLat) * 60 - minutesLat) * 60).toFixed(2);

    const degreesLon = Math.floor(lon);
    const minutesLon = Math.floor((lon - degreesLon) * 60);
    const decimalMinutesLon = (((lon - degreesLon) * 60 - minutesLon) * 60).toFixed(2);

    const latHemisphere = isLatNegative ? "S" : "N";
    const lonHemisphere = isLonNegative ? "W" : "E";

    const isoLat = degreesLat + '°' + minutesLat + '\'' + decimalMinutesLat + '\"' + latHemisphere;
    const isoLon = degreesLon + '°' + minutesLon + '\'' + decimalMinutesLon + '\"' + lonHemisphere;

    return isoLat + ' ' + isoLon;
}
