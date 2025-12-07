<template>
  <nav class="navbar navbar-expand-md navbar-dark fixed-top bg-dark">
    <div class="container-fluid">
      <a class="navbar-brand" href="#"
        >سامانه آگاهی وضعیتی تاکتیکی
        <span v-if="config">{{ config.version }}</span>
      </a>
      <span
        class="badge rounded-pill bg-primary"
        :class="{ 'bg-success': connected(), 'bg-secondary': !connected() }"
        >.</span
      >
      <span class="flex-grow-1"></span>
      <div class="NOT-collapse NOT-navbar-collapse" id="navbarCollapse">
        <ul class="navbar-nav mb-2 mb-md-0">
          <li class="nav-item">
            <a
              class="nav-link"
              href="#"
              id="navbarAlarmsMenuLink"
              role="button"
              v-on:click="openAlarms()"
            >
              <i
                :class="{ 'alarm-active': countByCategory('alarm') > 0 }"
                class="bi bi-exclamation-diamond-fill"
              ></i>
              {{ countByCategory("alarm") }}
            </a>
          </li>
          <li class="nav-item">
            <a
              class="nav-link"
              href="#"
              id="navbarSensorsMenuLink"
              role="button"
              v-on:click="openSensors()"
            >
              سنسورها<span class="badge rounded-pill bg-success">{{
                sensorsCount()
              }}</span>
            </a>
          </li>
          <li class="nav-item">
            <a
              class="nav-link"
              href="#"
              id="navbarFlowsMenuLink"
              role="button"
              v-on:click="openFlows()"
            >
              ارتباطات
              <span class="badge rounded-pill bg-success">{{
                flowsCount()
              }}</span>
            </a>
          </li>
          <li class="nav-item">
            <a
              class="nav-link"
              href="#"
              id="navbarResendingMenuLink"
              role="button"
              v-on:click="openResending()"
            >
              <i class="bi bi-arrow-repeat"></i>
              بازارسال
            </a>
          </li>
          <li class="nav-item dropdown">
            <a
              class="nav-link dropdown-toggle"
              href="#"
              id="navbarDarkDropdownMenuLink"
              role="button"
              data-bs-toggle="dropdown"
              aria-expanded="false"
            >
              مخاطبین
              <span class="badge rounded-pill bg-success">{{
                contactsNum()
              }}</span>
            </a>
            <ul
              class="dropdown-menu dropdown-menu-dark"
              aria-labelledby="navbarDarkDropdownMenuLink"
            >
              <li v-for="u in byCategory('contact')">
                <a
                  class="dropdown-item"
                  href="#"
                  v-on:click="setActiveItemUid(u.uid, true)"
                >
                  <img :src="getImg(u)" />
                  <span v-if="u.lat === 0 && u.lon === 0">* </span
                  >{{ u.callsign
                  }}<span v-if="u.status"> ({{ u.status }})</span>
                </a>
              </li>
            </ul>
          </li>
          <li class="nav-item dropdown">
            <a
              class="nav-link dropdown-toggle"
              href="#"
              id="navbarDarkDropdownMenuLink2"
              role="button"
              data-bs-toggle="dropdown"
              aria-expanded="false"
            >
              نیروها
              <span class="badge rounded-pill bg-success">{{
                countByCategory("unit")
              }}</span>
            </a>
            <ul
              class="dropdown-menu dropdown-menu-dark"
              aria-labelledby="navbarDarkDropdownMenuLink2"
            >
              <li v-for="u in byCategory('unit')">
                <a
                  class="dropdown-item"
                  href="#"
                  v-on:click="setActiveItemUid(u.uid, true)"
                >
                  {{ getUnitName(u) }}
                </a>
              </li>
            </ul>
          </li>
          <li class="nav-item dropdown">
            <a
              class="nav-link dropdown-toggle"
              href="#"
              id="navbarDarkDropdownMenuLink3"
              role="button"
              data-bs-toggle="dropdown"
              aria-expanded="false"
            >
              نقاط
              <span class="badge rounded-pill bg-success">{{
                countByCategory("point")
              }}</span>
            </a>
            <ul
              class="dropdown-menu dropdown-menu-dark"
              aria-labelledby="navbarDarkDropdownMenuLink3"
            >
              <li v-for="u in byCategory('point')">
                <a
                  class="dropdown-item"
                  href="#"
                  v-on:click="setActiveItemUid(u.uid, true)"
                >
                  {{ getUnitName(u) }}
                </a>
              </li>
            </ul>
          </li>
          <li class="nav-item dropdown">
            <a
              class="nav-link dropdown-toggle"
              href="#"
              id="navbarDarkDropdownMenuLink4"
              role="button"
              data-bs-toggle="dropdown"
              aria-expanded="false"
            >
              پیام‌ها
              <span class="badge rounded-pill bg-success">{{ msgNum() }}</span>
            </a>
            <ul
              class="dropdown-menu dropdown-menu-dark"
              aria-labelledby="navbarDarkDropdownMenuLink4"
            >
              <li v-for="m in Object.values(messages)">
                <a
                  class="dropdown-item"
                  href="#"
                  v-on:click="openChat(m.uid, m.from)"
                >
                  {{ m.from }}
                  <span class="badge rounded-pill bg-success">{{
                    msgNum1(m.uid)
                  }}</span>
                </a>
              </li>
            </ul>
          </li>
        </ul>
      </div>
    </div>
  </nav>

  <div class="container-fluid vh-100 mh-100" style="padding-top: 4rem">
    <div class="row h-100" :class="{ 'sidebar-collapsed': sidebarCollapsed }">
      <div id="map" class="col h-100" style="cursor: crosshair"></div>

      <div
        class="col-auto p-0 h-100"
        :class="{ 'sidebar-collapsed': sidebarCollapsed }"
      >
        <sidebar
          :toggle-overlay-items="toggleOverlayItems"
          :config="config"
          :check-emergency="checkEmergency"
          :config-updated="configUpdated"
          :coords="coords"
          :active-item="activeItem"
          :locked_unit_uid="locked_unit_uid"
          :map="map"
          :tracking-manager="trackingManager"
          v-on:open-chat="openChat"
          v-on:save="saveItem"
          v-on:delete="deleteItem"
          v-on:collapsed="updateSidebarCollapsed"
          v-on:navigation-line-toggle="handleNavigationLineToggle"
          v-on:select-overlay-item="handleOverlayItemSelected"
        ></sidebar>
      </div>
    </div>
  </div>

  <!-- Modal -->
  <div
    class="modal fade"
    id="messages"
    data-bs-backdrop="static"
    data-bs-keyboard="false"
    tabindex="-1"
    aria-labelledby="staticBackdropLabel"
    aria-hidden="true"
  >
    <div
      class="modal-dialog modal-dialog-centered modal-dialog-scrollable modal-lg"
    >
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title" id="staticBackdropLabel">
            پیام‌های چت {{ chatroom }}
            <span
              v-if="getStatus(chat_uid)"
              class="badge"
              :class="
                getStatus(chat_uid) == 'Online'
                  ? 'text-bg-success'
                  : 'text-bg-secondary'
              "
            >
              {{ getStatus(chat_uid) }}</span
            >
          </h5>
          <button
            type="button"
            class="btn-close"
            data-bs-dismiss="modal"
            aria-label="Close"
          ></button>
        </div>
        <div class="modal-body">
          <div v-for="m in getMessages()" class="alert alert-secondary">
            <span class="badge text-bg-secondary">{{ dt(m.time) }}</span>
            <span
              class="badge"
              :class="
                m.from_uid == config.uid ? 'text-bg-success' : 'text-bg-info'
              "
              >{{ m.from || m.from_uid }}</span
            >
            {{ m.text }}
          </div>
        </div>
        <div class="modal-footer">
          <form @submit.prevent="sendMessage">
            <input
              type="text"
              class="form-control"
              id="message-text"
              v-model="chat_msg"
            />
          </form>
          <button
            type="button"
            class="btn btn-primary"
            v-on:click="sendMessage"
          >
            ارسال پیام
          </button>
          <button
            type="button"
            class="btn btn-secondary"
            data-bs-dismiss="modal"
          >
            خروج
          </button>
        </div>
      </div>
    </div>
  </div>

  <flows-modal></flows-modal>
  <alarms-modal :map="map"></alarms-modal>
  <send-modal></send-modal>
  <sensors-modal></sensors-modal>
  <resending-modal :config="config" :map="map"></resending-modal>
  <tracking-control
    :map="map"
    :tracking-manager="trackingManager"
  ></tracking-control>
</template>

<script>
import { toRaw } from "vue";
import TrackingManager from "./TrackingManager.js";
import store from "./store.js";
import ResendingModal from "./components/ResendingModal.vue";
import {
  getIconUri,
  getMilIcon,
  getIcon,
  selfPopup,
  dt,
  printCoordsll,
  printCoords,
  latlng,
  distBea,
  sp,
  toUri,
  uuidv4,
  popup,
  latLongToIso6709,
  needIconUpdate,
  humanReadableType,
  cleanUnit,
  createMapItem,
  LocationControl,
  ToolsControl,
  html,
} from "./utils.js";

export default {
  name: "App",
  data() {
    return {
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

      // Navigation line state
      navigationLine: null,
      navigationLineActive: false,
      navigationTarget: null,

      // Tracking manager
      trackingManager: null,

      // Zoom update throttling
      zoomUpdateTimeout: null,
    };
  },
  provide() {
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
      navigation: L.layerGroup(),
      tracking: L.layerGroup(),
    };

    for (const overlay of Object.values(this.overlays)) {
      overlay.addTo(this.getRawMap());
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

    this.getRawMap().addControl(this.drawControl);
    this.getRawMap().addControl(new LocationControl());
    this.getRawMap().addControl(new ToolsControl());

    // Initialize TrackingManager
    this.trackingManager = new TrackingManager(this.getRawMap(), {
      trailLength: 50,
      trailColor: "#FF0000",
      trailWidth: 2,
      trailOpacity: 0.7,
    });

    let vm = this; // Changed from `app = this` to `vm = this` to avoid global variable

    const drawStart = function(event) {
      vm.inDrawMode = true;
    };
    const drawStop = function(event) {
      vm.inDrawMode = false;
    };

    this.getRawMap().on(L.Draw.Event.DRAWSTART, drawStart);
    this.getRawMap().on(L.Draw.Event.EDITSTART, drawStart);

    this.getRawMap().on(L.Draw.Event.DRAWSTOP, drawStop);
    this.getRawMap().on(L.Draw.Event.EDITSTOP, drawStop);
    this.getRawMap().on(L.Draw.Event.CREATED, function(event) {
      var layer = event.layer;

      let u = null;

      if (event.layerType === "polygon") {
        u = createMapItem({
          category: "drawing",
          callsign: "zone-" + vm.nextItemNumber("drawing"),
          type: "u-d-f",
          local: true,
          send: true,
          isNew: true,
        });
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

        u.color = "gray";
        u.geofence = false;
        u.geofence_aff = "All";
        // u.geofence_send = false

        // vm.saveItem(u, function () {
        //   vm.setActiveItemUid(u.uid, true);
        //   new bootstrap.Modal(document.querySelector("#drawing-edit")).show();
        // });
      } else if (event.layerType === "polyline") {
        u = createMapItem({
          category: "route",
          callsign: "route-" + vm.nextItemNumber("route"),
          type: "b-m-r",
          local: true,
          send: true,
          isNew: true, // Mark as a new item to trigger automatic edit mode
        });
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

        u.color = "gray";

        // vm.saveItem(u, function () {
        //   vm.setActiveItemUid(u.uid, true);
        //   new bootstrap.Modal(document.querySelector("#drawing-edit")).show();
        // });
      }

      store.state.items.set(u.uid, u);
      store.state.ts += 1;
      vm._processAddition(u);
      vm.setActiveItemUid(u.uid, true);
    });
    this.getRawMap().on(L.Draw.Event.DRAWVERTEX, function(event) {
      console.log("DRAW VERTEX:", event);
    });

    this.getRawMap().setView([60, 30], 11);

    L.control
      .scale({ position: "bottomright", metric: true })
      .addTo(this.getRawMap());

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

    this.getRawMap().on("click", this.mapClick);
    this.getRawMap().on("mousemove", this.mouseMove);
    this.getRawMap().on("zoomanim", this.onMapZoom);
  },
  computed: {
    activeItem: function() {
      return this.activeItemUid
        ? this.activeItemUid && this.getActiveItem()
        : null;
    },
  },

  watch: {
    // Watch for changes in user position to update navigation line
    // config: {
    //   handler: function (newConfig, oldConfig) {
    //     this.updateNavigationLine();
    //   },
    //   deep: true,
    // },
    // // Watch for active item changes to clear navigation line
    activeItemUid: function(newUid, oldUid) {
      if (newUid !== oldUid) {
        this.clearNavigationLineOnItemChange();
      }
    },
  },

  methods: {
    // Update sidebar collapsed state
    updateSidebarCollapsed: function(isCollapsed) {
      console.log("updateSidebarCollapsed", isCollapsed);
      this.sidebarCollapsed = isCollapsed;
    },
    getItemOverlay(item) {
      return toRaw(this.overlays[item.category]);
    },
    getRawMap() {
      return toRaw(this.map);
    },
    configUpdated: function() {
      console.log("config updated");
      const markerInfo = L.divIcon({
        className: "my-marker-info",
        html: "<div>" + this.config.callsign + "</div>",
        iconSize: null,
      });

      if (!this.myInfoMarker) {
        this.myInfoMarker = L.marker([this.config.lat, this.config.lon], {
          icon: markerInfo,
        });
        this.myInfoMarker.addTo(this.getRawMap());
      } else {
        this.myInfoMarker.setLatLng([this.config.lat, this.config.lon]);
        this.myInfoMarker.setIcon(markerInfo);
      }

      // Update self marker tooltip if it exists
      if (this.me && this.me.getTooltip()) {
        this.me.setTooltipContent(selfPopup(this.config));
      }
    },
    getConfig: function() {
      let vm = this;

      fetch(window.baseUrl + "/config")
        .then(function(response) {
          return response.json();
        })
        .then(function(data) {
          vm.config = data;

          vm.getRawMap().setView([data.lat, data.lon], data.zoom);

          if (vm.config.callsign) {
            vm.me = new L.Marker.RotatedMarker([data.lat, data.lon]);
            vm.me.setIcon(
              L.icon({
                iconUrl: "/static/icons/self.png",
                iconAnchor: new L.Point(16, 16),
              })
            );
            vm.me.addTo(vm.getRawMap());

            // Add tooltip to self marker
            vm.me.bindTooltip(selfPopup(vm.config));

            vm.configUpdated();
          }

          let layers = L.control.layers({}, null, { hideSingleBase: true });
          layers.addTo(vm.getRawMap());

          let first = true;
          data.layers.forEach(function(i) {
            let opts = {
              minZoom: i.minZoom ?? 1,
              maxZoom: i.maxZoom ?? 20,
            };

            if (i.parts) {
              opts["subdomains"] = i.parts;
            }

            var lz1 = null;
            var lz2 = null;

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

            let l = L.tileLayer(i.url, opts);

            layers.addBaseLayer(l, i.name);

            if (first) {
              first = false;
              l.addTo(vm.getRawMap());
              lz2.addTo(vm.getRawMap());
              lz1.addTo(vm.getRawMap());
            }
          });
        });
    },

    connect: function() {
      let url = "";
      if (window.baseUrl !== "")
        url =
          (window.location.protocol === "https:" ? "wss://" : "ws://") +
          window.baseUrl.replace("http://", "") +
          "/ws";
      else
        url =
          (window.location.protocol === "https:" ? "wss://" : "ws://") +
          window.location.host +
          "/ws";
      let vm = this;
      this.fetchAllUnits();
      this.fetchMessages();
      store.fetchSensors();
      store.fetchFlows();

      this.conn = new WebSocket(url);

      this.conn.onmessage = function(e) {
        let parsed = JSON.parse(e.data);
        vm.processWS(parsed);
      };

      this.conn.onopen = function(e) {
        console.log("connected");
      };

      this.conn.onerror = function(e) {
        console.log("error");
      };

      this.conn.onclose = function(e) {
        console.log("closed");
        setTimeout(vm.connect, 3000);
      };
    },

    connected: function() {
      if (!this.conn) return false;

      return this.conn.readyState === 1;
    },

    fetchAllUnits: function() {
      store.fetchItems().then((results) => {
        this.processUnits(results);
      });
    },

    fetchMessages: function() {
      let vm = this;

      fetch(window.baseUrl + "/message")
        .then(function(response) {
          return response.json();
        })
        .then(function(data) {
          vm.messages = data;
        });
    },

    renew: function() {
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
        fetch(window.baseUrl + "/dp", requestOptions);
      }
    },

    _processRemoval: function(item) {
      console.log("processRemoval", item);
      if (item.marker) {
        // Handle removal for drawings and routes
        this.getItemOverlay(item).removeLayer(item.marker);
        // if (item.category === "drawing") {
        //   this.drawnItems.removeLayer(item.marker);
        // } else if (item.category === "route") {
        //   this.routeItems.removeLayer(item.marker);
        // } else {
        //   this.getItemOverlay(item).removeLayer(item.marker);
        // }
        item.marker.remove();

        if (item.infoMarker) {
          this.getItemOverlay(item).removeLayer(item.infoMarker);
          item.infoMarker.remove();
        }

        if (item.textLabel) {
          this.getItemOverlay(item).removeLayer(item.textLabel);
          item.textLabel.remove();
        }
      }

      if (this.activeItemUid === item.uid) {
        this.setActiveItemUid(null, false);
      }

      if (this.navigationTarget && item.uid === this.navigationTarget.uid)
        this.hideNavigationLine();
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

        // Only add to map if item is visible
        if (item.visible !== false) {
          item.marker.addTo(this.drawnItems);
        }

        // Add text label for polygon
        this.addDrawingTextLabel(item);
      } else if (item.category === "route") {
        item.marker = L.polyline(latlngs, {
          color: item.color,
          interactive: true, // Make polyline interactive for click events
        });
        item.marker.on("click", (e) => {
          this.setActiveItemUid(item.uid, false);
        });

        // Only add to map if item is visible
        if (item.visible !== false) {
          item.marker.addTo(this.routeItems);
        }

        // Add text label for route
        this.addDrawingTextLabel(item);
      }
    },

    addDrawingTextLabel: function(item) {
      // Remove existing text label if it exists
      if (item.textLabel) {
        this.removeFromAllOverlays(item.textLabel);
      }

      // Calculate position for text label placement
      let textLabelPosition = this.calculateTextLabelPosition(item);

      // Calculate dynamic styling based on item type
      let labelStyle = this.calculateLabelStyle(item);

      let displayStyle = "";

      if (labelStyle.fontSize < 12) displayStyle = "display:none;";

      // Create text label HTML with dynamic styling and combined transform
      let labelHtml = `<div class="drawing-text-label" style="color: ${
        item.color
      }; font-size: ${
        labelStyle.fontSize
      }px; transform: translate(-50%, -50%) rotate(${
        labelStyle.rotation
      }deg); ${displayStyle}">${item.callsign}</div>`;

      const textIcon = L.divIcon({
        className: "drawing-text-label-icon",
        html: labelHtml,
        iconSize: null,
        iconAnchor: [0, 0], // No offset, will be centered with CSS
      });

      // Create text label at the calculated position
      item.textLabel = L.marker(textLabelPosition, { icon: textIcon });

      // Add click event to select the item
      item.textLabel.on("click", (e) => {
        this.setActiveItemUid(item.uid, false);
      });

      // Only add to map if item is visible
      if (item.visible !== false) {
        item.textLabel.addTo(this.getItemOverlay(item));
      }
    },

    calculateTextLabelPosition: function(item) {
      if (!item.links || item.links.length === 0) {
        // Fallback to center if no links available
        return [item.lat, item.lon];
      }

      let latlngs = item.links.map((it) => {
        return it.split(",").map(parseFloat);
      });

      if (item.category === "drawing") {
        // For polygons, place text label inside the polygon (at centroid)
        if (latlngs.length < 3) {
          return [item.lat, item.lon]; // Fallback to item center if not enough points
        }

        // Calculate polygon centroid using a more robust method (e.g., average of all points)
        let latSum = 0;
        let lngSum = 0;
        latlngs.forEach((coord) => {
          latSum += coord[0];
          lngSum += coord[1];
        });

        return [latSum / latlngs.length, lngSum / latlngs.length];
      } else if (item.category === "route") {
        // For routes, place text label at the middle edge, offset to the side
        if (latlngs.length < 2) {
          return [item.lat, item.lon]; // Fallback to item center if not enough points
        }

        // Find the middle edge index
        let middleEdgeIndex = Math.floor((latlngs.length - 1) / 2);

        // Calculate midpoint of the middle edge
        let lat1 = latlngs[middleEdgeIndex][0];
        let lng1 = latlngs[middleEdgeIndex][1];
        let lat2 = latlngs[middleEdgeIndex + 1][0];
        let lng2 = latlngs[middleEdgeIndex + 1][1];

        let midLat = (lat1 + lat2) / 2;
        let midLng = (lng1 + lng2) / 2;

        // Calculate perpendicular offset to place label beside the route
        let deltaLat = lat2 - lat1;
        let deltaLng = lng2 - lng1;

        // Calculate perpendicular vector (rotate 90 degrees)
        let perpLat = -deltaLng;
        let perpLng = deltaLat;

        // For horizontal edges, ensure label appears on top (positive latitude direction)
        // Check if the edge is more horizontal than vertical
        if (Math.abs(deltaLng) > Math.abs(deltaLat)) {
          // Horizontal edge - ensure perpendicular vector points upward (positive lat)
          if (perpLat < 0) {
            perpLat = -perpLat;
            perpLng = -perpLng;
          }
        }

        // Normalize the perpendicular vector
        let length = Math.sqrt(perpLat * perpLat + perpLng * perpLng);
        if (length > 0) {
          perpLat = perpLat / length;
          perpLng = perpLng / length;
        }

        // Calculate offset distance based on zoom level (increased distance)
        let zoom = this.getRawMap().getZoom();
        let offsetDistance = 0.0003 * Math.pow(2, 15 - zoom); // Increased offset distance

        // Apply offset to position label beside the route
        return [
          midLat + perpLat * offsetDistance,
          midLng + perpLng * offsetDistance,
        ];
      }

      // Fallback to center
      return [item.lat, item.lon];
    },

    calculateLabelStyle: function(item) {
      let fontSize = 18; // Default font size
      let rotation = 0; // Default rotation
      let zoom = this.getRawMap().getZoom();

      if (!item.links || item.links.length === 0) {
        // Even without links, make font size responsive to zoom
        fontSize = Math.max(8, Math.min(24, zoom * 1.5));
        return { fontSize, rotation };
      }

      let latlngs = item.links.map((it) => {
        return it.split(",").map(parseFloat);
      });

      if (item.category === "drawing") {
        // For polygons, calculate font size based on pixel size on screen
        if (latlngs.length >= 3 && item.marker) {
          try {
            // Convert lat/lng coordinates to pixel coordinates
            let pixelPoints = latlngs.map((coord) =>
              this.getRawMap().latLngToContainerPoint([coord[0], coord[1]])
            );

            // Calculate bounding box in pixels
            let minX = Math.min(...pixelPoints.map((p) => p.x));
            let maxX = Math.max(...pixelPoints.map((p) => p.x));
            let minY = Math.min(...pixelPoints.map((p) => p.y));
            let maxY = Math.max(...pixelPoints.map((p) => p.y));

            // Calculate pixel dimensions
            let pixelWidth = maxX - minX;
            let pixelHeight = maxY - minY;
            let pixelDiagonal = Math.sqrt(
              pixelWidth * pixelWidth + pixelHeight * pixelHeight
            );

            // Scale font size based on pixel size (more intuitive scaling)
            // Larger polygons get larger text, smaller polygons get smaller text
            fontSize = Math.max(8, Math.min(42, pixelDiagonal / 12));

            // console.log(
            //   `Polygon pixel size: ${pixelWidth}x${pixelHeight}, diagonal: ${pixelDiagonal}, fontSize: ${fontSize}`
            // );
          } catch (error) {
            console.warn("Error calculating pixel size for polygon:", error);
            // Fallback to zoom-based sizing
            fontSize = Math.max(8, Math.min(24, zoom * 1.5));
          }
        } else {
          // Fallback for polygons with insufficient points
          fontSize = Math.max(8, Math.min(24, zoom * 1.5));
        }
      } else if (item.category === "route") {
        // For routes, calculate rotation angle and pixel-based font size
        if (latlngs.length >= 2) {
          let middleEdgeIndex = Math.floor((latlngs.length - 1) / 2);

          let lat1 = latlngs[middleEdgeIndex][0];
          let lng1 = latlngs[middleEdgeIndex][1];
          let lat2 = latlngs[middleEdgeIndex + 1][0];
          let lng2 = latlngs[middleEdgeIndex + 1][1];

          // Calculate angle in degrees based on the middle edge
          let deltaLng = lng2 - lng1;
          let deltaLat = lat2 - lat1;
          rotation = -Math.atan2(deltaLat, deltaLng) * (180 / Math.PI);

          // Normalize rotation to keep text readable (between -90 and 90 degrees)
          if (rotation > 90) {
            rotation -= 180;
          } else if (rotation < -90) {
            rotation += 180;
          }

          // Calculate pixel-based font size for routes
          try {
            // Convert route points to pixel coordinates
            let pixelPoints = latlngs.map((coord) =>
              this.getRawMap().latLngToContainerPoint([coord[0], coord[1]])
            );

            // Calculate total pixel length of the route
            let totalPixelLength = 0;
            for (let i = 0; i < pixelPoints.length - 1; i++) {
              let dx = pixelPoints[i + 1].x - pixelPoints[i].x;
              let dy = pixelPoints[i + 1].y - pixelPoints[i].y;
              totalPixelLength += Math.sqrt(dx * dx + dy * dy);
            }

            // Scale font size based on route length in pixels
            fontSize = Math.max(8, Math.min(28, totalPixelLength / 15));

            console.log(
              `Route pixel length: ${totalPixelLength}, fontSize: ${fontSize}`
            );
          } catch (error) {
            console.warn("Error calculating pixel size for route:", error);
            // Fallback to zoom-based sizing
            fontSize = Math.max(8, Math.min(28, zoom * 1.5));
          }
        } else {
          // Fallback for routes with insufficient points
          fontSize = Math.max(8, Math.min(28, zoom * 1.5));
        }
      }

      return { fontSize, rotation };
    },

    _processAddition: function(item) {
      // Initialize visibility state if not set (default to visible)
      if (item.visible === undefined) {
        item.visible = true;
      }

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

    _processUpdate: function(item) {
      if (item.category === "drawing" || item.category === "route") {
        // Remove existing markers and infomarkers
        if (item.marker) {
          this.drawnItems.removeLayer(item.marker);
          this.routeItems.removeLayer(item.marker);
        }
        if (item.infoMarker) {
          this.removeFromAllOverlays(item.infoMarker);
        }
        if (item.textLabel) {
          this.removeFromAllOverlays(item.textLabel);
        }
        this._processDrawing(item);
      } else {
        this.updateUnitMarker(item, false, true);

        if (this.locked_unit_uid === item.uid) {
          this.getRawMap().setView([item.lat, item.lon]);
        }
      }
      this.addContextMenuToMarker(item); // Changed vm.addContextMenuToMarker to this.addContextMenuToMarker
    },

    processUnits: function(results) {
      // console.log("RESULTS:", results);

      results["removed"].forEach((item) => this._processRemoval(item));
      results["added"].forEach((item) => this._processAddition(item));
      results["updated"].forEach((item) => this._processUpdate(item));
    },

    addContextMenuToMarker: function(unit) {
      if (unit.uid.endsWith("-fence")) return;

      if (unit.marker) {
        unit.marker.on("contextmenu", (e) => {
          if (unit.marker.contextmenu === undefined) {
            let menu = `
                    <ul class="dropdown-menu marker-contextmenu">
                      <li><h6 class="dropdown-header">${unit.callsign}</h6></li>
                      <li><button class="dropdown-item" onclick="app.menuDeleteAction('${
                        unit.uid
                      }')"> حذف </button></li>
                      <li><button class="dropdown-item" onclick="app.menuSendAction('${
                        unit.uid
                      }')"> ارسال... </button></li>
                    </ul>`;
            unit.marker.contextmenu = L.popup()
              .setLatLng(e.latlng)
              .setContent(menu);
            unit.marker.contextmenu.addTo(this.getItemOverlay(unit));
          }
          unit.marker.contextmenu.openOn(this.getItemOverlay(unit));
        });
      }

      // Also add context menu to infomarker for drawings and routes
      // if (
      //   unit.infoMarker &&
      //   (unit.category === "drawing" || unit.category === "route")
      // ) {
      //   unit.infoMarker.on("contextmenu", (e) => {
      //     if (unit.infoMarker.contextmenu === undefined) {
      //       let menu = `
      //               <ul class="dropdown-menu marker-contextmenu">
      //                 <li><h6 class="dropdown-header">${unit.callsign}</h6></li>
      //                 <li><button class="dropdown-item" onclick="app.menuDeleteAction('${unit.uid}')"> حذف </button></li>
      //                 <li><button class="dropdown-item" onclick="app.menuSendAction('${unit.uid}')"> ارسال... </button></li>
      //               </ul>`;
      //       unit.infoMarker.contextmenu = L.popup()
      //         .setLatLng(e.latlng)
      //         .setContent(menu);
      //       unit.infoMarker.contextmenu.addTo(this.getItemOverlay(unit));
      //     }
      //     unit.infoMarker.contextmenu.openOn(this.getItemOverlay(unit));
      //   });
      // }
    },

    processMe: function(u) {
      if (!u || !this.me) return;
      this.config = { ...this.config, lat: u.lat, lon: u.lon };
      this.me.setLatLng([u.lat, u.lon]);
      if (this.myInfoMarker) this.myInfoMarker.setLatLng([u.lat, u.lon]);
      if (u.course) this.me.setIconAngle(u.course);
      // Update self marker tooltip with new coordinates
      this.me.setTooltipContent(selfPopup(this.config));
    },

    processWS: function(u) {
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

      // Handle tracking updates
      if (u.type === "tracking_update" && this.trackingManager) {
        this.trackingManager.handleTrackingUpdate(u);
      }
    },
    removeFromAllOverlays(obj) {
      // console.log("=== removeFromAllOverlays", Object.values(this.overlays));
      for (const overlay of Object.values(this.overlays)) {
        // console.log("removeFromAllOverlays", obj, overlay);
        obj.removeFrom(overlay);
      }
    },
    updateUnitMarker: function(unit, draggable, updateIcon) {
      const vm = this; // Capture Vue instance reference
      if (unit.lon === 0 && unit.lat === 0) {
        if (unit.marker) {
          this.getItemOverlay(unit).removeLayer(unit.marker);
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
      unit.marker.on("click", function(e) {
        vm.setActiveItemUid(unit.uid, false); // Changed app.setActiveItemUid to vm.setActiveItemUid
      });
      if (draggable) {
        unit.marker.on("dragend", function(e) {
          unit.lat = unit.marker.getLatLng().lat; // Changed marker to unit.marker
          unit.lon = unit.marker.getLatLng().lng; // Changed marker to unit.marker
        });
      }
      unit.marker.setIcon(getIcon(unit, true));

      // Only add to map if item is visible
      if (unit.visible !== false) {
        unit.marker.addTo(this.getItemOverlay(unit));
      }

      let markerHtml = "<div>" + unit.callsign;
      // if (unit.ip_address) markerHtml += "<br>" + unit.ip_address;
      if (unit.urn) markerHtml += "<br>URN#" + unit.urn;
      markerHtml += "</div>";

      const markerInfo = L.divIcon({
        className: "my-marker-info",
        html: markerHtml,
        iconSize: null,
      });

      if (!unit.type.startsWith("b-a-o")) {
        unit.infoMarker = L.marker([unit.lat, unit.lon], { icon: markerInfo });

        // Only add to map if item is visible
        if (unit.visible !== false) {
          unit.infoMarker.addTo(this.getItemOverlay(unit));
        }

        unit.infoMarker.setLatLng([unit.lat, unit.lon]);
        unit.infoMarker.setIcon(markerInfo);
      }
      unit.marker.setLatLng([unit.lat, unit.lon]);
      // Pass self coordinates for distance calculation
      const selfCoords = this.config
        ? { lat: this.config.lat, lon: this.config.lon }
        : null;
      unit.marker.bindTooltip(popup(unit, selfCoords, false));
    },

    setActiveItemUid: function(uid, follow) {
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
        }
      } else {
        this.activeItemUid = null;
      }
    },

    getActiveItem: function() {
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

    byCategory: function(s) {
      let arr = Array.from(this.sharedState.items.values()).filter(function(u) {
        return u.category === s;
      });
      arr.sort(function(a, b) {
        return a.callsign.toLowerCase().localeCompare(b.callsign.toLowerCase());
      });
      return this.sharedState.ts && arr;
    },

    nextItemNumber: function(category) {
      let maxNumber = 0;
      this.sharedState.items.forEach(function(u) {
        if (u.category === category) {
          let splitParts = u.callsign.split("-");

          if (
            splitParts.length == 2 &&
            ["point", "unit", "zone", "route"].includes(splitParts[0])
          ) {
            let number = parseInt(splitParts[1]);
            if (number != NaN) maxNumber = Math.max(maxNumber, number);
          }
        }
      });

      return maxNumber + 1;
    },

    mapToUnit: function(u) {
      if (!u) {
        return;
      }
      if (u.lat !== 0 || u.lon !== 0) {
        this.getRawMap().setView([u.lat, u.lon]);
      }
    },

    getImg: function(item) {
      return getIconUri(item, false).uri;
    },

    milImg: function(item) {
      return getMilIcon(item, false).uri;
    },

    dt: function(str) {
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

    sp: function(v) {
      return (v * 3.6).toFixed(1);
    },

    modeIs: function(s) {
      return (
        document.getElementById(s) &&
        document.getElementById(s).checked === true
      );
    },

    mouseMove: function(e) {
      this.coords = e.latlng;
    },

    mapClickAddPoint: function(e) {
      console.log("mapClickAddPoint called with event:", e);
      let u = createMapItem({
        category: "point",
        callsign: "point-" + this.nextItemNumber("point"),
        type: "b-m-p-s-m",
        lat: e.latlng.lat,
        lon: e.latlng.lng,
        local: true,
        send: true,
        isNew: true,
      });
      if (this.config && this.config.uid) {
        u.parent_uid = this.config.uid;
        u.parent_callsign = this.config.callsign;
      }

      console.log("New point created locally:", u);
      store.state.items.set(u.uid, u);
      store.state.ts += 1;
      this._processAddition(u);
      this.setActiveItemUid(u.uid, true);
    },

    mapClickAddUnit: function(e) {
      console.log("mapClickAddUnit called with event:", e);
      let u = createMapItem({
        category: "unit",
        callsign: "unit-" + this.nextItemNumber("unit"),
        sidc: store.sidcFromType("a-h-G"),
        type: "a-h-G",
        lat: e.latlng.lat,
        lon: e.latlng.lng,
        local: true,
        send: true,
        isNew: true,
      });
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
    mapClickAddCasevac: function(e) {
      console.log("mapClickAddCasevac called with event:", e);
      let now = new Date();
      let uid =
        "MED." +
        now.getDay() +
        "." +
        now.getHours() +
        "" +
        now.getMinutes() +
        "" +
        now.getSeconds();
      let u = createMapItem({
        uid: uid,
        category: "report",
        callsign: uid,
        type: "b-r-f-h-c",
        lat: e.latlng.lat,
        lon: e.latlng.lng,
        local: true,
        send: true,
        isNew: true,
      });
      if (this.config && this.config.uid) {
        u.parent_uid = this.config.uid;
        u.parent_callsign = this.config.callsign;
      }

      // console.log("New casevac created locally:", u);
      store.state.items.set(u.uid, u);
      store.state.ts += 1;
      this._processAddition(u);
      this.setActiveItemUid(u.uid, true);
    },
    mapClick: function(e) {
      if (this.inDrawMode) {
        return;
      }
      if (this.mode === "add_point") {
        this.mapClickAddPoint(e);
        this.mode = "map";
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
    },

    checkEmergency: function(
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

    activateEmergencyBeacon: function(emergency_type) {
      if (!this.beacon_active) {
        this.beacon_active = true;
        const alert = this.createEmergencyAlert(emergency_type);
        this.saveItem(alert);
      }
    },

    deactivateEmergencyBeacon: function() {
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

    saveItem: function(u, cb) {
      console.log("Sending:", cleanUnit(u));
      store.createItem(u).then((results) => {
        this.processUnits(results);
        if (cb) cb();
      });
    },

    deleteItem: function(uid) {
      console.debug("Deleting:", uid);
      store.removeItem(uid).then((units) => this.processUnits(units));
    },

    removeTool: function(name) {
      if (this.tools.has(name)) {
        let p = this.tools.get(name);
        this.getRawMap().removeLayer(p);
        p.remove();
        this.tools.delete(name);
        this.ts++;
      }
    },

    getTool: function(name) {
      return this.tools.get(name);
    },

    addOrMove(name, coord, icon) {
      if (this.tools.has(name)) {
        this.tools.get(name).setLatLng(coord);
      } else {
        let p = new L.marker(coord).addTo(this.getRawMap());
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

    contactsNum: function() {
      let online = 0;
      let total = 0;
      this.sharedState.items.forEach(function(u) {
        if (u.category === "contact") {
          if (u.status === "Online") online += 1;
          if (u.status !== "") total += 1;
        }
      });

      return online + "/" + total;
    },

    flowsCount: function() {
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

    sensorsCount: function() {
      return this.sharedState.sensors.length.toLocaleString("fa-ir");
    },

    countByCategory: function(s) {
      let total = 0;
      this.sharedState.items.forEach(function(u) {
        if (u.category === s) total += 1;
      });

      return total;
    },

    msgNum: function() {
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

    msgNum1: function(uid) {
      if (!this.messages || !this.messages[uid].messages) return 0;
      let n = 0;
      for (m of this.messages[uid].messages) {
        if (!this.seenMessages.has(m.message_id)) n++;
      }
      return n;
    },

    openChat: function(uid, chatroom) {
      this.chat_uid = uid;
      this.chatroom = chatroom;
      new bootstrap.Modal(document.getElementById("messages")).show();

      if (this.messages[this.chat_uid]) {
        for (m of this.messages[this.chat_uid].messages) {
          this.seenMessages.add(m.message_id);
        }
      }
    },

    openFlows: function() {
      new bootstrap.Modal(document.getElementById("flows-modal")).show();
    },

    openSensors: function() {
      new bootstrap.Modal(document.getElementById("sensors-modal")).show();
    },
    openAlarms: function() {
      new bootstrap.Modal(document.getElementById("alarms-modal")).show();
    },

    openResending: function() {
      new bootstrap.Modal(document.getElementById("resending-modal")).show();
    },

    getStatus: function(uid) {
      return this.ts && this.sharedState.items.get(uid)?.status;
    },

    getMessages: function() {
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

    getUnitName: function(u) {
      let res = u.callsign || "no name";
      if (this.config && u.parent_uid === this.config.uid) {
        if (u.send === true) {
          res = "+ " + res;
        } else {
          res = "* " + res;
        }
      }
      return res;
    },

    menuDeleteAction: function(uid) {
      let unit = this.sharedState.items.get(uid);
      store.removeItem(uid).then((units) => this.processUnits(units));
      this.getRawMap().closePopup(unit.marker.contextmenu);
    },

    menuSendAction: function(uid) {
      let unit = this.sharedState.items.get(uid);
      this.sharedState.unitToSend = unit;
      new bootstrap.Modal(document.querySelector("#send-modal")).show();
      this.getRawMap().closePopup(unit.marker.contextmenu);
    },

    sendMessage: function() {
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
        .then(function(response) {
          return response.json();
        })
        .then(function(data) {
          vm.messages = data;
        });
    },
    toggleOverlay: function(overlayName, overlayActive) {
      if (!this.overlays || !this.overlays[overlayName]) {
        console.warn(
          "Overlays not initialized yet, skipping toggle for:",
          overlayName
        );
        return;
      }
      if (!overlayActive)
        toRaw(this.overlays[overlayName]).removeFrom(this.getRawMap());
      else toRaw(this.overlays[overlayName]).addTo(this.getRawMap());
    },

    toggleOverlayItems: function(categoryName, subcategoryKey, uid, newState) {
      // Helper function to get affiliation from CoT type
      const getAffiliationFromType = (type) => {
        if (!type || type.length < 3) return "u";
        const affCode = type.charAt(2);
        return ["f", "h", "n", "u"].includes(affCode) ? affCode : "u";
      };

      // Helper function to check if item matches subcategory
      const matchesSubcategory = (item, subKey, category) => {
        if (!subKey) return true;

        if (category === "unit") {
          const affiliation = subKey.replace("unit_", "");
          return getAffiliationFromType(item.type) === affiliation;
        } else if (category === "alarm") {
          const alarmType = subKey.replace("alarm_", "");
          if (alarmType === "emergency") {
            return item.type && item.type.startsWith("b-a-o");
          } else if (alarmType === "general") {
            return item.type && !item.type.startsWith("b-a-o");
          }
        }
        return true;
      };

      // Helper function to toggle visibility of item markers
      const toggleItemMarkers = (item, visible) => {
        // Update marker visibility
        if (item.marker) {
          if (visible) {
            item.marker.addTo(this.getItemOverlay(item));
          } else {
            this.getItemOverlay(item).removeLayer(item.marker);
          }
        }

        // Update info marker visibility
        if (item.infoMarker) {
          if (visible) {
            item.infoMarker.addTo(this.getItemOverlay(item));
          } else {
            this.getItemOverlay(item).removeLayer(item.infoMarker);
          }
        }

        // Update text label visibility for drawings and routes
        if (
          item.textLabel &&
          (item.category === "drawing" || item.category === "route")
        ) {
          if (visible) {
            item.textLabel.addTo(this.getItemOverlay(item));
          } else {
            this.getItemOverlay(item).removeLayer(item.textLabel);
          }
        }
      };

      // Case 1: Toggle individual item
      if (uid) {
        const item = this.sharedState.items.get(uid);
        if (item) {
          toggleItemMarkers(item, newState);
        }
        return;
      }

      // Case 2 & 3: Toggle category or subcategory
      if (categoryName) {
        // Ensure overlay exists
        if (!this.overlays || !this.overlays[categoryName]) {
          console.warn(
            "Overlays not initialized yet, skipping toggle for:",
            categoryName
          );
          return;
        }

        // Toggle overlay layer visibility if toggling entire category
        if (!subcategoryKey) {
          if (!newState) {
            toRaw(this.overlays[categoryName]).removeFrom(this.getRawMap());
          } else {
            toRaw(this.overlays[categoryName]).addTo(this.getRawMap());
          }
        }

        // Update individual item visibility
        this.sharedState.items.forEach((item) => {
          if (item.category === categoryName) {
            // Check if item matches the subcategory filter (if provided)
            if (matchesSubcategory(item, subcategoryKey, categoryName)) {
              toggleItemMarkers(item, newState);
            }
          }
        });
      }
    },

    handleOverlayItemSelected: function(item) {
      console.log("Overlay item selected in App:", item);
      if (item && item.uid) {
        this.setActiveItemUid(item.uid, true);
      }
    },

    createEmergencyAlert: function(emergencyType) {
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
    locateByGPS: function() {
      if (!this.config) return; // Check if config is loaded
      fetch(window.baseUrl + "/pos").then((r) =>
        this.getRawMap().setView([this.config.lat, this.config.lon])
      );
    },
    changeMode: function(newMode) {
      this.mode = newMode;
    },

    // Navigation line methods
    handleNavigationLineToggle: function(event) {
      console.log("Navigation line toggle event:", event);

      if (event.show) {
        this.showNavigationLine(
          event.targetItem,
          event.userPosition,
          event.navigationData
        );
      } else {
        this.hideNavigationLine();
      }
    },

    handleSelectOverlayItem: function(item) {
      console.log("Overlay item selected@map", item);
      if (item && item.uid) {
        // Set the item as active and pan to it
        this.setActiveItemUid(item.uid, true);
      }
    },

    showNavigationLine: function(targetItem, userPosition, navigationData) {
      // Clear any existing navigation line
      this.hideNavigationLine();

      if (!targetItem || !userPosition || !navigationData) {
        console.warn("Missing data for navigation line:", {
          targetItem,
          userPosition,
          navigationData,
        });
        return;
      }

      // Create the navigation line
      const userLatLng = [userPosition.lat, userPosition.lon];
      const targetLatLng = [
        navigationData.targetPosition.lat,
        navigationData.targetPosition.lng,
      ];

      this.navigationLine = L.polyline([userLatLng, targetLatLng], {
        color: "#007bff",
        weight: 2,
        opacity: 0.6,
        dashArray: "5, 10",
        className: "navigation-line",
      });

      // Add to navigation overlay
      this.overlays.navigation.addLayer(this.navigationLine);

      // Store navigation state
      this.navigationLineActive = true;
      this.navigationTarget = targetItem;

      console.log(
        "Navigation line created for:",
        targetItem.callsign || targetItem.uid
      );
    },

    hideNavigationLine: function() {
      if (this.navigationLine) {
        this.overlays.navigation.removeLayer(this.navigationLine);
        this.navigationLine = null;
      }

      this.navigationLineActive = false;
      this.navigationTarget = null;

      console.log("Navigation line hidden");
    },

    updateNavigationLine: function() {
      console.log("updateNavigationLine");
      // Update navigation line when user position changes
      if (this.navigationLineActive && this.navigationTarget && this.config) {
        // Get target coordinates
        let targetCoords = null;

        if (
          this.navigationTarget.lat !== undefined &&
          this.navigationTarget.lon !== undefined
        ) {
          targetCoords = {
            lat: this.navigationTarget.lat,
            lng: this.navigationTarget.lon,
          };
        }

        if (targetCoords) {
          const userLatLng = [this.config.lat, this.config.lon];
          const targetLatLng = [targetCoords.lat, targetCoords.lng];

          if (this.navigationLine) {
            this.navigationLine.setLatLngs([userLatLng, targetLatLng]);
          }
        }
      }
    },

    clearNavigationLineOnItemChange: function() {
      // Clear navigation line when active item changes
      if (this.navigationLineActive) {
        this.hideNavigationLine();
      }
    },

    // Tracking management methods
    enableTrackingForUnit: function(unitUid, config = {}) {
      if (!this.trackingManager) return false;

      // Set default config for unit
      const defaultConfig = {
        enabled: true,
        trailLength: 50,
        trailColor: this.generateTrailColor(unitUid),
        trailWidth: 2,
        trailOpacity: 0.7,
      };

      const finalConfig = { ...defaultConfig, ...config };
      return this.trackingManager.setTrailConfig(unitUid, finalConfig);
    },

    disableTrackingForUnit: function(unitUid) {
      if (!this.trackingManager) return false;
      return this.trackingManager.removeTrail(unitUid);
    },

    updateUnitTrackingConfig: function(unitUid, config) {
      if (!this.trackingManager) return false;
      return this.trackingManager.setTrailConfig(unitUid, config);
    },

    clearAllTrails: function() {
      if (!this.trackingManager) return false;
      this.trackingManager.clearAllTrails();
      return true;
    },

    generateTrailColor: function(unitUid) {
      // Generate a consistent color for each unit based on UID
      const colors = [
        "#FF0000",
        "#00FF00",
        "#0000FF",
        "#FFFF00",
        "#FF00FF",
        "#00FFFF",
        "#FFA500",
        "#800080",
        "#008000",
        "#000080",
        "#800000",
        "#808000",
      ];

      let hash = 0;
      for (let i = 0; i < unitUid.length; i++) {
        hash = unitUid.charCodeAt(i) + ((hash << 5) - hash);
      }

      return colors[Math.abs(hash) % colors.length];
    },

    getTrackingStatus: function() {
      if (!this.trackingManager) return false;
      return this.trackingManager.isTrackingEnabled();
    },

    setGlobalTrackingEnabled: function(enabled) {
      if (!this.trackingManager) return false;
      this.trackingManager.setTrackingEnabled(enabled);
      return true;
    },

    exportTrailData: function(unitUid, format = "json") {
      if (!this.trackingManager) return null;
      return this.trackingManager.exportTrailData(unitUid, format);
    },

    importTrailData: function(unitUid, data, format = "json") {
      if (!this.trackingManager) return false;
      return this.trackingManager.importTrailData(unitUid, data, format);
    },

    getActiveTrails: function() {
      if (!this.trackingManager) return [];
      return this.trackingManager.getAllTrails();
    },

    // Update drawing and route labels method
    updateDrawingTextLabel: function(item) {
      // Only update the style of existing text label instead of recreating it
      if (item.textLabel) {
        // Calculate new styling
        let labelStyle = this.calculateLabelStyle(item);

        // For routes, also update position since offset is zoom-dependent
        if (item.category === "route") {
          let newPosition = this.calculateTextLabelPosition(item);
          item.textLabel.setLatLng(newPosition);
        }

        // Get the existing label element and update its style
        let labelElement = item.textLabel.getElement();
        if (labelElement) {
          let labelDiv = labelElement.querySelector(".drawing-text-label");
          if (labelDiv) {
            // Update font size and rotation while preserving other styles
            labelDiv.style.fontSize = labelStyle.fontSize + "px";
            labelDiv.style.transform = `translate(-50%, -50%) rotate(${
              labelStyle.rotation
            }deg)`;

            if (labelStyle.fontSize < 12) labelDiv.style.display = "none";
            else labelDiv.style.display = "block";
          }
        }
      }
    },

    // Zoom update method
    onMapZoom: function() {
      // Throttle zoom updates to improve performance during zoom animations
      if (this.zoomUpdateTimeout) {
        clearTimeout(this.zoomUpdateTimeout);
      }

      this.zoomUpdateTimeout = setTimeout(() => {
        // Update all drawing and route labels when zoom changes
        this.sharedState.items.forEach((item) => {
          if (
            (item.category === "drawing" || item.category === "route") &&
            item.textLabel
          ) {
            this.updateDrawingTextLabel(item);
          }
        });
      }, 8); // Reduced throttling since we're just updating styles
    },
  },
  components: {
    ResendingModal,
  },
};
</script>
