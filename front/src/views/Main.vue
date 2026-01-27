<template>
  <nav class="navbar navbar-expand-md navbar-dark fixed-top bg-dark">
    <div class="container-fluid">
      <a class="navbar-brand" href="#"
        >سامانه آگاهی وضعیتی تاکتیکی
        <!-- <span v-if="config">{{ config.version }}</span> -->
        <span v-if="config">V29</span>
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
      <div id="map-container" class="col h-100" style="cursor: crosshair">
        <MglMap
          ref="mapRef"
          map-style="/static/styles.json"
          :center="mapCenter"
          :zoom="mapZoom"
          @map:load="onMapLoad"
          @map:click="onMapClick"
          @map:mousemove="onMouseMove"
          @map:zoomend="onMapZoom"
          @map:contextmenu="onMapContextMenu"
        >
          <!-- Scale Control -->
          <MglScaleControl position="bottom-right" :unit="'metric'" />

          <!-- Navigation Control -->
          <MglNavigationControl position="top-right" />

          <!-- Custom Location Control -->
          <MglCustomControl position="bottom-left">
            <button
              type="button"
              class="maplibregl-ctrl-icon"
              @click="locateByGPS"
              title="My Location"
            >
              <i class="bi bi-crosshair" style="font-size: 24px"></i>
            </button>
          </MglCustomControl>

          <!-- Custom Tools Control -->
          <MglCustomControl position="top-left">
            <div class="tools-control">
              <button
                type="button"
                class="maplibregl-ctrl-icon"
                @click="changeMode('add_point')"
                title="افزودن نقطه به نقشه"
              >
                <img
                  src="/static/icons/add-point.svg"
                  alt="Add Point"
                  style="width: 32px; height: 32px;"
                />
              </button>
              <button
                type="button"
                class="maplibregl-ctrl-icon"
                @click="changeMode('add_unit')"
                title="افزودن نیرو به نقشه"
              >
                <img
                  src="/static/icons/add-unit.svg"
                  alt="Add Unit"
                  style="width: 32px; height: 32px;"
                />
              </button>
              <button
                type="button"
                class="maplibregl-ctrl-icon"
                @click="changeMode('add_casevac')"
                title="افزودن درخواست امداد"
              >
                <img
                  src="/static/icons/add-casevac.svg"
                  alt="Add Casevac"
                  style="width: 32px; height: 32px;"
                />
              </button>

              <!-- Drawing tools (Mapbox GL Draw, works with MapLibre) -->
              <button
                type="button"
                class="maplibregl-ctrl-icon"
                :class="{ 'active-tool': drawMode === 'draw_polygon' }"
                @click="startPolygonDrawing"
                title="رسم ناحیه (چندضلعی)"
              >
                <i class="bi bi-pentagon" style="font-size: 24px"></i>
              </button>
              <button
                type="button"
                class="maplibregl-ctrl-icon"
                :class="{ 'active-tool': drawMode === 'draw_line_string' }"
                @click="startRouteDrawing"
                title="رسم مسیر"
              >
                <i class="bi bi-bezier2" style="font-size: 24px"></i>
              </button>

              <button
                v-if="isDrawModeActive()"
                type="button"
                class="maplibregl-ctrl-icon"
                @click="cancelDrawing"
                title="لغو رسم"
              >
                <i class="bi bi-x" style="font-size: 24px"></i>
              </button>
            </div>
          </MglCustomControl>

          <!-- Self Marker -->
          <CustomMarker
            v-if="config && config.callsign && map"
            :coordinates="[config.lon, config.lat]"
            :map="map"
            icon-src="/static/icons/self.png"
            :icon-size="32"
            :rotation="selfRotation"
            :label="config.callsign"
            @click="showSelfPopup"
          />

          <!-- Unit/Contact/Point/Alarm Markers -->
          <template v-for="item in visibleMarkerItems" :key="item.uid">
            <CustomMarker
              v-if="(item.lat !== 0 || item.lon !== 0) && map"
              :coordinates="[item.lon, item.lat]"
              :map="map"
              :icon-src="getImg(item)"
              :icon-size="48"
              :label="!item.type.startsWith('b-a-o') ? item.callsign : ''"
              :sublabel="item.urn ? 'URN#' + item.urn : ''"
              :show-label="!item.type.startsWith('b-a-o')"
              @click="(e) => handleMarkerClick(e, item)"
              @contextmenu="(e) => handleMarkerContextMenu(e, item)"
            />
          </template>

          <!-- Drawings (Polygons) -->
          <template
            v-for="item in visibleDrawings"
            :key="'drawing-' + item.uid"
          >
            <MglGeoJsonSource
              :source-id="'drawing-source-' + item.uid"
              :data="getPolygonGeoJSON(item)"
            >
              <MglFillLayer
                :layer-id="'drawing-fill-' + item.uid"
                :paint="{
                  'fill-color': item.color || 'gray',
                  'fill-opacity': 0.3,
                }"
                @click="() => setActiveItemUid(item.uid, false)"
              />
              <MglLineLayer
                :layer-id="'drawing-line-' + item.uid"
                :paint="{
                  'line-color': item.color || 'gray',
                  'line-width': 2,
                }"
              />
            </MglGeoJsonSource>
            <!-- Drawing Label -->
            <MglMarker :coordinates="[item.lon, item.lat]" anchor="center">
              <template #marker>
                <div
                  class="drawing-text-label"
                  :style="{ color: item.color || 'gray' }"
                  @click="() => setActiveItemUid(item.uid, false)"
                >
                  {{ item.callsign }}
                </div>
              </template>
            </MglMarker>
          </template>

          <!-- Routes (Polylines) -->
          <template v-for="item in visibleRoutes" :key="'route-' + item.uid">
            <MglGeoJsonSource
              :source-id="'route-source-' + item.uid"
              :data="getRouteGeoJSON(item)"
            >
              <MglLineLayer
                :layer-id="'route-line-' + item.uid"
                :paint="{
                  'line-color': item.color || 'gray',
                  'line-width': 3,
                }"
                @click="() => setActiveItemUid(item.uid, false)"
              />
            </MglGeoJsonSource>
            <!-- Route Label -->
            <MglMarker
              :coordinates="getRouteLabelPosition(item)"
              anchor="center"
            >
              <template #marker>
                <div
                  class="drawing-text-label"
                  :style="{ color: item.color || 'gray' }"
                  @click="() => setActiveItemUid(item.uid, false)"
                >
                  {{ item.callsign }}
                </div>
              </template>
            </MglMarker>
          </template>

          <!-- Navigation Line -->
          <template v-if="navigationLineActive && navigationLine">
            <MglGeoJsonSource
              source-id="navigation-line-source"
              :data="navigationLine"
            >
              <MglLineLayer
                layer-id="navigation-line"
                source-id="navigation-line-source"
                :paint="{
                  'line-color': '#007bff',
                  'line-width': 2,
                  'line-opacity': 0.6,
                  // 'line-dasharray': [5, 10],
                }"
              />
            </MglGeoJsonSource>
          </template>

          <!-- Tracking Trails -->
          <template
            v-for="trail in activeTrails"
            :key="'trail-' + trail.unitUid"
          >
            <MglGeoJsonSource
              :source-id="'trail-source-' + trail.unitUid"
              :data="getTrailGeoJSON(trail)"
            >
              <MglLineLayer
                :layer-id="'trail-line-' + trail.unitUid"
                :paint="{
                  'line-color': trail.config.trailColor || '#FF0000',
                  'line-width': trail.config.trailWidth || 2,
                  'line-opacity': trail.config.trailOpacity || 0.7,
                }"
              />
            </MglGeoJsonSource>
          </template>
        </MglMap>
      </div>

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
  <alarms-modal></alarms-modal>
  <send-modal></send-modal>
  <sensors-modal></sensors-modal>
  <resending-modal :config="config"></resending-modal>
</template>

<script>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from "vue";
import {
  MglMap,
  MglMarker,
  MglNavigationControl,
  MglScaleControl,
  MglGeoJsonSource,
  MglLineLayer,
  MglFillLayer,
  MglCustomControl,
  MglVectorSource,
  // useMap,
  useSource,
} from "@indoorequal/vue-maplibre-gl";
import { Popup } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

import TrackingManager from "../TrackingManager.js";
import store from "../store.js";
import api from "../api/axios.js";
import ResendingModal from "../components/modals/ResendingModal.vue";
import CustomMarker from "../components/CustomMarker.vue";
import {
  getIconUri,
  getMilIcon,
  dt,
  distBea,
  uuidv4,
  popup,
  selfPopup,
  latLongToIso6709,
  humanReadableType,
  cleanUnit,
  createMapItem,
} from "../utils.js";

import maplibregl from "maplibre-gl";
import { Protocol } from "pmtiles";

// Mapbox GL Draw (works with MapLibre GL)
import MapboxDraw from "@mapbox/mapbox-gl-draw";
import "@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css";

export default {
  name: "App",
  components: {
    MglMap,
    MglMarker,
    MglNavigationControl,
    MglScaleControl,
    MglGeoJsonSource,
    MglLineLayer,
    MglFillLayer,
    MglCustomControl,
    MglVectorSource,
    ResendingModal,
    CustomMarker,
  },
  data() {
    return {
      map: null,
      mapRef: ref(null),
      currentPopup: null,
      mapCenter: [51.4, 35.7],
      mapZoom: 11,

      conn: null,
      messages: [],
      seenMessages: new Set(),
      ts: 0,
      locked_unit_uid: "",
      activeItemUid: null,
      config: null,
      tools: new Map(),
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

      sidebarCollapsed: false,
      beacon_active: false,
      mode: "map",
      // Mapbox GL Draw instance + current mode
      draw: null,
      drawMode: "simple_select",
      selfRotation: 0,

      // Navigation line state
      navigationLine: null,
      navigationLineActive: false,
      navigationTarget: null,

      // Tracking manager
      trackingManager: null,
      activeTrails: [],

      // Visibility state for overlays
      overlayVisibility: {
        contact: true,
        unit: true,
        alarm: true,
        point: true,
        drawing: true,
        route: true,
        report: true,
        navigation: true,
        tracking: true,
      },
    };
  },
  provide() {
    return {
      map: () => this.map,
      config: this.config,
      getTool: this.getTool,
      removeTool: this.removeTool,
      coords: this.coords,
      activeItem: this.activeItem,
    };
  },
  computed: {
    activeItem() {
      return this.activeItemUid &&
        this.sharedState.items.has(this.activeItemUid)
        ? this.sharedState.items.get(this.activeItemUid)
        : null;
    },
    selfPopupContent() {
      if (!this.config) return "";
      return selfPopup(this.config);
    },
    visibleMarkerItems() {
      const items = [];
      this.sharedState.items.forEach((item) => {
        if (
          ["contact", "unit", "alarm", "point", "report"].includes(
            item.category
          ) &&
          this.overlayVisibility[item.category] !== false &&
          item.visible !== false
        ) {
          items.push(item);
        }
      });
      return this.sharedState.ts && items;
    },
    visibleDrawings() {
      const items = [];
      this.sharedState.items.forEach((item) => {
        if (
          item.category === "drawing" &&
          this.overlayVisibility.drawing !== false &&
          item.visible !== false
        ) {
          items.push(item);
        }
      });
      return this.sharedState.ts && items;
    },
    visibleRoutes() {
      const items = [];
      this.sharedState.items.forEach((item) => {
        if (
          item.category === "route" &&
          this.overlayVisibility.route !== false &&
          item.visible !== false
        ) {
          items.push(item);
        }
      });
      return this.sharedState.ts && items;
    },
  },
  watch: {
    activeItemUid(newUid, oldUid) {
      if (newUid !== oldUid) {
        this.clearNavigationLineOnItemChange();
      }
    },
  },
  mounted() {
    let protocol = new Protocol();
    maplibregl.addProtocol("pmtiles", protocol.tile);
    maplibregl.setRTLTextPlugin("/static/js/mapbox-gl-rtl-text.js");

    this.getConfig();

    let supportsWebSockets = "WebSocket" in window || "MozWebSocket" in window;
    if (supportsWebSockets) {
      this.connect();
      setInterval(this.fetchAllUnits, 5000);
    }

    this.renew();
    setInterval(this.renew, 5000);
    store.fetchTypes();
    window.app = this;
  },
  methods: {
    onMapLoad(e) {
      this.map = e.map;
      store.setMap(this.map);

      // Initialize Mapbox GL Draw (compatible with MapLibre)
      this.initDraw();

      // Initialize TrackingManager with MapLibre map
      this.trackingManager = new TrackingManager(this.map, {
        trailLength: 50,
        trailColor: "#FF0000",
        trailWidth: 2,
        trailOpacity: 0.7,
      });

      console.log("Map loaded");
    },

    onMapClick(e) {
      // If MapboxDraw is in a drawing mode, let it handle clicks.
      if (this.isDrawModeActive()) {
        return;
      }

      const latlng = { lat: e.event.lngLat.lat, lng: e.event.lngLat.lng };

      if (this.mode === "add_point") {
        this.mapClickAddPoint({ latlng });
        this.mode = "map";
        return;
      }
      if (this.mode === "add_unit") {
        this.mapClickAddUnit({ latlng });
        this.mode = "map";
        return;
      }
      if (this.mode === "add_casevac") {
        this.mapClickAddCasevac({ latlng });
        this.mode = "map";
        return;
      }
    },

    onMouseMove(e) {
      this.coords = { lat: e.event.lngLat.lat, lng: e.event.lngLat.lng };
    },

    onMapZoom() {
      // Handle zoom events if needed
    },

    onMapContextMenu(e) {
      // Handle context menu if needed
    },

    updateSidebarCollapsed(isCollapsed) {
      this.sidebarCollapsed = isCollapsed;
    },

    configUpdated() {
      // Update self marker when config changes
      if (this.config && this.config.course) {
        this.selfRotation = this.config.course;
      }
    },

    getConfig() {
      let vm = this;
      api.get("/config").then((response) => {
        vm.config = response.data;
        vm.mapCenter = [response.data.lon, response.data.lat];
        vm.mapZoom = response.data.zoom;

        // Build map style with tile layers
        vm.buildMapStyle(response.data.layers);

        if (vm.config.callsign) {
          vm.configUpdated();
        }
      });
    },

    buildMapStyle(layers) {
      // Ignore the layers parameter and use PMTiles instead
      // TODO: FIX?
    },

    connect() {
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

      const token = localStorage.getItem("access_token");
      if (token) {
        url += `?token=${token}`;
      }

      this.conn = new WebSocket(url);

      this.conn.onmessage = function(e) {
        let parsed = JSON.parse(e.data);
        vm.processWS(parsed);
      };

      this.conn.onopen = function() {
        console.log("connected");
      };

      this.conn.onerror = function() {
        console.log("error");
      };

      this.conn.onclose = function() {
        console.log("closed");
        setTimeout(vm.connect, 3000);
      };
    },

    connected() {
      return this.conn && this.conn.readyState === 1;
    },

    fetchAllUnits() {
      store.fetchItems().then((results) => {
        this.processUnits(results);
      });
    },

    fetchMessages() {
      let vm = this;
      api.get("/message").then((response) => {
        vm.messages = response.data;
      });
    },

    renew() {
      if (!this.conn) {
        this.fetchAllUnits();
        this.fetchMessages();
      }

      if (this.getTool("dp1") && this.map) {
        let p = this.getTool("dp1");
        api.post("/dp", { lat: p.lat, lon: p.lng, name: "DP1" });
      }
    },

    processUnits(results) {
      // Items are managed through Vue reactivity
      // Just trigger updates
      results["removed"].forEach((item) => this._processRemoval(item));
      results["added"].forEach((item) => this._processAddition(item));
      results["updated"].forEach((item) => this._processUpdate(item));
    },

    _processRemoval(item) {
      if (this.activeItemUid === item.uid) {
        this.setActiveItemUid(null, false);
      }
      if (this.navigationTarget && item.uid === this.navigationTarget.uid) {
        this.hideNavigationLine();
      }
    },

    _processAddition(item) {
      if (item.visible === undefined) {
        item.visible = true;
      }
      if (
        item.type.startsWith("b-a-o") &&
        !item.type.endsWith("-can") &&
        item.uid.startsWith(this.config?.uid || "")
      ) {
        this.beacon_active = true;
        this.sharedState.emergency.switch1 = true;
        this.sharedState.emergency.switch2 = true;
        this.sharedState.emergency.type = item.type;
      }
    },

    _processUpdate(item) {
      if (this.locked_unit_uid === item.uid && this.map) {
        this.map.flyTo({ center: [item.lon, item.lat] });
      }
    },

    processMe(u) {
      if (!u) return;
      this.config = { ...this.config, lat: u.lat, lon: u.lon };
      if (u.course) this.selfRotation = u.course;
    },

    processWS(u) {
      if (u.type === "unit") {
        if (u.unit.uid === this.config?.uid) this.processMe(u.unit);
        else this.processUnits(store.handleItemChangeMessage(u.unit));
      }

      if (u.type === "delete") {
        this.processUnits(store.handleItemChangeMessage(u.unit, true));
      }

      if (u.type === "chat") {
        this.fetchMessages();
      }

      if (u.type === "tracking_update" && this.trackingManager) {
        this.trackingManager.handleTrackingUpdate(u);
        this.activeTrails = this.trackingManager.getAllTrails();
      }
    },

    getImg(item) {
      return getIconUri(item, false).uri;
    },

    showSelfPopup() {
      this.closePopup();
      if (!this.map || !this.config) return;

      this.currentPopup = new Popup({ closeOnClick: true, maxWidth: "300px" })
        .setLngLat([this.config.lon, this.config.lat])
        .setHTML(this.selfPopupContent)
        .addTo(this.map);
    },

    handleMarkerClick(e, item) {
      e.stopPropagation();
      this.closePopup();
      this.setActiveItemUid(item.uid, false);

      if (!this.map) return;

      this.currentPopup = new Popup({ closeOnClick: true, maxWidth: "300px" })
        .setLngLat([item.lon, item.lat])
        .setHTML(this.getPopupContent(item))
        .addTo(this.map);
    },

    handleMarkerContextMenu(e, item) {
      this.closePopup();
      if (!this.map) return;

      const menuHtml = `
        <ul class="dropdown-menu show marker-contextmenu" style="position: static; display: block; border: none; margin: 0; padding: 0;">
          <li><h6 class="dropdown-header">${item.callsign}</h6></li>
          <li><button class="dropdown-item" onclick="app.menuDeleteAction('${item.uid}')"> حذف </button></li>
          <li><button class="dropdown-item" onclick="app.menuSendAction('${item.uid}')"> ارسال... </button></li>
          <li><button class="dropdown-item" onclick="app.menuShareAction('${item.uid}')"> اشتراک‌گذاری... </button></li>
        </ul>`;

      this.currentPopup = new Popup({ closeOnClick: true, maxWidth: "300px" })
        .setLngLat([item.lon, item.lat])
        .setHTML(menuHtml)
        .addTo(this.map);
    },

    menuDeleteAction(uid) {
      this.deleteItem(uid);
      this.closePopup();
    },

    menuSendAction(uid) {
      const item = this.sharedState.items.get(uid);
      if (item) {
        this.sharedState.unitToSend = item;
        this.sharedState.sendMode = 'send';
        new bootstrap.Modal(document.querySelector("#send-modal")).show();
      }
      this.closePopup();
    },

    menuShareAction(uid) {
      const item = this.sharedState.items.get(uid);
      if (item) {
        this.sharedState.unitToSend = item;
        this.sharedState.sendMode = 'share';
        new bootstrap.Modal(document.querySelector("#send-modal")).show();
      }
      this.closePopup();
    },

    closePopup() {
      if (this.currentPopup) {
        this.currentPopup.remove();
        this.currentPopup = null;
      }
    },

    getPopupContent(item) {
      const selfCoords = this.config
        ? { lat: this.config.lat, lon: this.config.lon }
        : null;
      return popup(item, selfCoords, false);
    },

    getPolygonGeoJSON(item) {
      if (!item.links || item.links.length < 3) {
        return { type: "FeatureCollection", features: [] };
      }

      const coordinates = item.links.map((link) => {
        const [lat, lng] = link.split(",").map(parseFloat);
        return [lng, lat];
      });
      // Close the polygon
      coordinates.push(coordinates[0]);

      return {
        type: "Feature",
        geometry: {
          type: "Polygon",
          coordinates: [coordinates],
        },
        properties: { uid: item.uid, callsign: item.callsign },
      };
    },

    getRouteGeoJSON(item) {
      if (!item.links || item.links.length < 2) {
        return { type: "FeatureCollection", features: [] };
      }

      const coordinates = item.links.map((link) => {
        const [lat, lng] = link.split(",").map(parseFloat);
        return [lng, lat];
      });

      return {
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates,
        },
        properties: { uid: item.uid, callsign: item.callsign },
      };
    },

    getRouteLabelPosition(item) {
      if (!item.links || item.links.length < 2) {
        return [item.lon, item.lat];
      }

      const middleIndex = Math.floor(item.links.length / 2);
      const [lat, lng] = item.links[middleIndex].split(",").map(parseFloat);
      return [lng, lat];
    },

    getTrailGeoJSON(trail) {
      const coordinates = trail.positions.map((pos) => [pos.lon, pos.lat]);
      return {
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates,
        },
        properties: { unitUid: trail.unitUid },
      };
    },

    setActiveItemUid(uid, follow) {
      let currentActiveItem = this.activeItem;
      if (currentActiveItem?.isNew && currentActiveItem.uid !== uid) {
        this.deleteItem(currentActiveItem.uid);
      }
      if (uid && this.sharedState.items.has(uid)) {
        if (this.activeItemUid === uid) {
          this.activeItemUid = null;
          nextTick(() => (this.activeItemUid = uid));
        } else {
          this.activeItemUid = uid;
          let u = this.sharedState.items.get(uid);
          if (follow) this.mapToUnit(u);
        }
      } else {
        this.activeItemUid = null;
      }
    },

    mapToUnit(u) {
      if (!u || !this.map) return;
      if (u.lat !== 0 || u.lon !== 0) {
        this.map.flyTo({ center: [u.lon, u.lat] });
      }
    },

    byCategory(s) {
      let arr = Array.from(this.sharedState.items.values()).filter(
        (u) => u.category === s
      );
      arr.sort((a, b) =>
        a.callsign.toLowerCase().localeCompare(b.callsign.toLowerCase())
      );
      return this.sharedState.ts && arr;
    },

    nextItemNumber(category) {
      let maxNumber = 0;
      this.sharedState.items.forEach((u) => {
        if (u.category === category) {
          let splitParts = u.callsign.split("-");
          if (
            splitParts.length === 2 &&
            ["point", "unit", "zone", "route"].includes(splitParts[0])
          ) {
            let number = parseInt(splitParts[1]);
            if (!isNaN(number)) maxNumber = Math.max(maxNumber, number);
          }
        }
      });
      return maxNumber + 1;
    },

    dt,

    mapClickAddPoint(e) {
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

      store.state.items.set(u.uid, u);
      store.state.ts += 1;
      this._processAddition(u);
      this.setActiveItemUid(u.uid, true);
    },

    mapClickAddUnit(e) {
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

      store.state.items.set(u.uid, u);
      store.state.ts += 1;
      this._processAddition(u);
      this.setActiveItemUid(u.uid, true);
    },

    mapClickAddCasevac(e) {
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

      store.state.items.set(u.uid, u);
      store.state.ts += 1;
      this._processAddition(u);
      this.setActiveItemUid(u.uid, true);
    },

    checkEmergency(emergency_switch1, emergency_switch2, emergency_type) {
      if (emergency_switch1 && emergency_switch2) {
        this.activateEmergencyBeacon(emergency_type);
      } else {
        this.deactivateEmergencyBeacon();
      }
    },

    activateEmergencyBeacon(emergency_type) {
      if (!this.beacon_active) {
        this.beacon_active = true;
        const alert = this.createEmergencyAlert(emergency_type);
        this.saveItem(alert);
      }
    },

    deactivateEmergencyBeacon() {
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

    createEmergencyAlert(emergencyType) {
      let now = new Date();
      let stale = new Date(now);
      stale.setDate(stale.getDate() + 365);

      return {
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
    },

    saveItem(u, cb) {
      console.log("Sending:", cleanUnit(u));
      store.createItem(u).then((results) => {
        this.processUnits(results);
        if (cb) cb();
      });
    },

    deleteItem(uid) {
      console.debug("Deleting:", uid);
      store.removeItem(uid).then((units) => this.processUnits(units));
    },

    removeTool(name) {
      if (this.tools.has(name)) {
        this.tools.delete(name);
        this.ts++;
      }
    },

    getTool(name) {
      return this.tools.get(name);
    },

    contactsNum() {
      let online = 0;
      let total = 0;
      this.sharedState.items.forEach((u) => {
        if (u.category === "contact") {
          if (u.status === "Online") online += 1;
          if (u.status !== "") total += 1;
        }
      });
      return online + "/" + total;
    },

    flowsCount() {
      return (
        "↓" +
        this.sharedState.flows
          .filter((it) => it.direction === 1)
          .length.toLocaleString("fa-ir") +
        " / ↑" +
        this.sharedState.flows
          .filter((it) => it.direction === 2)
          .length.toLocaleString("fa-ir") +
        " / ↕" +
        this.sharedState.flows
          .filter((it) => it.direction === 3)
          .length.toLocaleString("fa-ir")
      );
    },

    sensorsCount() {
      return this.sharedState.sensors.length.toLocaleString("fa-ir");
    },

    countByCategory(s) {
      let total = 0;
      this.sharedState.items.forEach((u) => {
        if (u.category === s) total += 1;
      });
      return total;
    },

    msgNum() {
      if (!this.messages) return 0;
      let n = 0;
      for (const [key, value] of Object.entries(this.messages)) {
        if (value.messages) {
          for (const m of value.messages) {
            if (!this.seenMessages.has(m.message_id)) n++;
          }
        }
      }
      return n;
    },

    msgNum1(uid) {
      if (!this.messages || !this.messages[uid]?.messages) return 0;
      let n = 0;
      for (const m of this.messages[uid].messages) {
        if (!this.seenMessages.has(m.message_id)) n++;
      }
      return n;
    },

    openChat(uid, chatroom) {
      this.chat_uid = uid;
      this.chatroom = chatroom;
      new bootstrap.Modal(document.getElementById("messages")).show();

      if (this.messages[this.chat_uid]) {
        for (const m of this.messages[this.chat_uid].messages) {
          this.seenMessages.add(m.message_id);
        }
      }
    },

    openFlows() {
      new bootstrap.Modal(document.getElementById("flows-modal")).show();
    },

    openSensors() {
      new bootstrap.Modal(document.getElementById("sensors-modal")).show();
    },

    openAlarms() {
      new bootstrap.Modal(document.getElementById("alarms-modal")).show();
    },

    openResending() {
      new bootstrap.Modal(document.getElementById("resending-modal")).show();
    },

    getStatus(uid) {
      return this.ts && this.sharedState.items.get(uid)?.status;
    },

    getMessages() {
      if (!this.chat_uid) return [];

      let msgs = this.messages[this.chat_uid]
        ? this.messages[this.chat_uid].messages
        : [];

      if (document.getElementById("messages")?.style.display !== "none") {
        for (const m of msgs) {
          this.seenMessages.add(m.message_id);
        }
      }

      return msgs;
    },

    getUnitName(u) {
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

    sendMessage() {
      let msg = {
        from: this.config.callsign,
        from_uid: this.config.uid,
        chatroom: this.chatroom,
        to_uid: this.chat_uid,
        text: this.chat_msg,
      };
      this.chat_msg = "";

      let vm = this;
      api.post("/message", msg).then((response) => {
        vm.messages = response.data;
      });
    },

    toggleOverlayItems(categoryName, subcategoryKey, uid, newState) {
      const getAffiliationFromType = (type) => {
        if (!type || type.length < 3) return "u";
        const affCode = type.charAt(2);
        return ["f", "h", "n", "u"].includes(affCode) ? affCode : "u";
      };

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

      // Case 1: Toggle individual item
      if (uid) {
        const item = this.sharedState.items.get(uid);
        if (item) {
          item.visible = newState;
        }
        return;
      }

      // Case 2 & 3: Toggle category or subcategory
      if (categoryName) {
        if (!subcategoryKey) {
          this.overlayVisibility[categoryName] = newState;
        }

        this.sharedState.items.forEach((item) => {
          if (item.category === categoryName) {
            if (matchesSubcategory(item, subcategoryKey, categoryName)) {
              item.visible = newState;
            }
          }
        });
      }
    },

    handleOverlayItemSelected(item) {
      if (item && item.uid) {
        this.setActiveItemUid(item.uid, true);
      }
    },

    locateByGPS() {
      if (!this.config || !this.map) return;
      api
        .get("/pos")
        .then(() =>
          this.map.flyTo({ center: [this.config.lon, this.config.lat] })
        );
    },

    changeMode(newMode) {
      this.mode = newMode;
    },

    // ---- Drawing (routes + polygons) via Mapbox GL Draw ----
    initDraw() {
      if (!this.map || this.draw) return;

      const styles = [
        {
          id: "gl-draw-polygon-fill",
          type: "fill",
          filter: ["all", ["==", "$type", "Polygon"]],
          paint: {
            "fill-color": [
              "case",
              ["==", ["get", "active"], "true"],
              "orange",
              "blue",
            ],
            "fill-opacity": 0.1,
          },
        },
        {
          id: "gl-draw-lines",
          type: "line",
          filter: [
            "any",
            ["==", "$type", "LineString"],
            ["==", "$type", "Polygon"],
          ],
          layout: { "line-cap": "round", "line-join": "round" },
          paint: {
            "line-color": [
              "case",
              ["==", ["get", "active"], "true"],
              "orange",
              "blue",
            ],
            "line-dasharray": [
              "case",
              ["==", ["get", "active"], "true"],
              ["literal", [0.2, 2]],
              ["literal", [0.2, 2]],
            ],
            "line-width": 2,
          },
        },
        {
          id: "gl-draw-point-outer",
          type: "circle",
          filter: ["all", ["==", "$type", "Point"], ["==", "meta", "feature"]],
          paint: {
            "circle-radius": ["case", ["==", ["get", "active"], "true"], 7, 5],
            "circle-color": "white",
          },
        },
        {
          id: "gl-draw-point-inner",
          type: "circle",
          filter: ["all", ["==", "$type", "Point"], ["==", "meta", "feature"]],
          paint: {
            "circle-radius": ["case", ["==", ["get", "active"], "true"], 5, 3],
            "circle-color": [
              "case",
              ["==", ["get", "active"], "true"],
              "orange",
              "blue",
            ],
          },
        },
        {
          id: "gl-draw-vertex-outer",
          type: "circle",
          filter: [
            "all",
            ["==", "$type", "Point"],
            ["==", "meta", "vertex"],
            ["!=", "mode", "simple_select"],
          ],
          paint: {
            "circle-radius": ["case", ["==", ["get", "active"], "true"], 7, 5],
            "circle-color": "white",
          },
        },
        {
          id: "gl-draw-vertex-inner",
          type: "circle",
          filter: [
            "all",
            ["==", "$type", "Point"],
            ["==", "meta", "vertex"],
            ["!=", "mode", "simple_select"],
          ],
          paint: {
            "circle-radius": ["case", ["==", ["get", "active"], "true"], 5, 3],
            "circle-color": "orange",
          },
        },
        {
          id: "gl-draw-midpoint",
          type: "circle",
          filter: ["all", ["==", "meta", "midpoint"]],
          paint: { "circle-radius": 3, "circle-color": "orange" },
        },
      ];

      this.draw = new MapboxDraw({
        styles: styles,
        displayControlsDefault: false,
        controls: {
          polygon: false,
          line_string: false,
          trash: false,
          combine_features: false,
          uncombine_features: false,
        },
      });

      // Draw must be added as a control so it can register handlers + add its style layers.
      // We start drawing modes via our own custom buttons.
      this.map.addControl(this.draw, "top-left");

      this.map.on("draw.create", this.onDrawCreate);
      this.map.on("draw.modechange", this.onDrawModeChange);

      try {
        this.drawMode = this.draw.getMode();
      } catch (_err) {
        this.drawMode = "simple_select";
      }
    },

    onDrawModeChange(e) {
      if (e && e.mode) {
        this.drawMode = e.mode;
      }
    },

    isDrawModeActive() {
      return !!(this.drawMode && this.drawMode.startsWith("draw_"));
    },

    startPolygonDrawing() {
      this.mode = "map";
      this.closePopup();

      if (!this.draw) return;

      this.draw.changeMode("draw_polygon");
      this.drawMode = "draw_polygon";
    },

    startRouteDrawing() {
      this.mode = "map";
      this.closePopup();

      if (!this.draw) return;

      this.draw.changeMode("draw_line_string");
      this.drawMode = "draw_line_string";
    },

    cancelDrawing() {
      if (!this.draw) return;

      // Best-effort cancel: delete the in-progress/selected feature (if any)
      // and return to selection mode.
      try {
        this.draw.trash();
      } catch (_err) {
        // ignore
      }

      try {
        this.draw.changeMode("simple_select");
        this.drawMode = "simple_select";
      } catch (_err) {
        // ignore
      }
    },

    onDrawCreate(e) {
      const feature = e?.features?.[0];
      if (!feature || !feature.geometry) return;

      const item = this.createMapItemFromDrawFeature(feature);
      if (!item) return;

      store.state.items.set(item.uid, item);
      store.state.ts += 1;
      this._processAddition(item);
      this.setActiveItemUid(item.uid, true);

      // Remove Draw feature to avoid duplicate rendering (Draw layers + our Vue layers)
      try {
        this.draw.delete(item.uid);
      } catch (_err) {
        // ignore
      }

      // Exit drawing mode
      try {
        this.draw.changeMode("simple_select");
        this.drawMode = "simple_select";
      } catch (_err) {
        // ignore
      }
    },

    createMapItemFromDrawFeature(feature) {
      const uid = String(feature.id ?? uuidv4());

      if (feature.geometry.type === "Polygon") {
        const ring = feature.geometry.coordinates?.[0] || [];
        const coords = this.normalizeRingCoordinates(ring);
        if (coords.length < 3) return null;

        const links = coords.map(([lng, lat]) => `${lat},${lng}`);

        let latSum = 0;
        let lngSum = 0;
        coords.forEach(([lng, lat]) => {
          latSum += lat;
          lngSum += lng;
        });

        const lat = latSum / coords.length;
        const lon = lngSum / coords.length;

        return createMapItem({
          uid,
          category: "drawing",
          callsign: "zone-" + this.nextItemNumber("drawing"),
          type: "u-d-f",
          local: true,
          send: true,
          isNew: true,
          parent_uid: this.config?.uid || "",
          parent_callsign: this.config?.callsign || "",
          lat,
          lon,
          links,
          color: "gray",
          geofence: false,
          geofence_aff: "All",
        });
      }

      if (feature.geometry.type === "LineString") {
        const coords = feature.geometry.coordinates || [];
        if (coords.length < 2) return null;

        const links = coords.map(([lng, lat]) => `${lat},${lng}`);

        let latSum = 0;
        let lngSum = 0;
        coords.forEach(([lng, lat]) => {
          latSum += lat;
          lngSum += lng;
        });

        const lat = latSum / coords.length;
        const lon = lngSum / coords.length;

        return createMapItem({
          uid,
          category: "route",
          callsign: "route-" + this.nextItemNumber("route"),
          type: "b-m-r",
          local: true,
          send: true,
          isNew: true,
          parent_uid: this.config?.uid || "",
          parent_callsign: this.config?.callsign || "",
          lat,
          lon,
          links,
          color: "gray",
        });
      }

      console.warn("[Draw] Unsupported geometry type:", feature.geometry.type);
      return null;
    },

    normalizeRingCoordinates(ring) {
      if (!Array.isArray(ring)) return [];

      const coords = ring
        .filter((c) => Array.isArray(c) && c.length >= 2)
        .map(([lng, lat]) => [Number(lng), Number(lat)])
        .filter(([lng, lat]) => Number.isFinite(lng) && Number.isFinite(lat));

      if (coords.length >= 2) {
        const first = coords[0];
        const last = coords[coords.length - 1];
        if (first[0] === last[0] && first[1] === last[1]) {
          coords.pop();
        }
      }

      return coords;
    },

    // ---- Navigation line ----
    handleNavigationLineToggle(event) {
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

    showNavigationLine(targetItem, userPosition, navigationData) {
      this.hideNavigationLine();

      if (!targetItem || !userPosition || !navigationData) return;

      const userCoord = [userPosition.lon, userPosition.lat];
      const targetCoord = [
        navigationData.targetPosition.lng,
        navigationData.targetPosition.lat,
      ];

      this.navigationLine = {
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: [userCoord, targetCoord],
        },
        properties: {},
      };

      this.navigationLineActive = true;
      this.navigationTarget = targetItem;
    },

    hideNavigationLine() {
      this.navigationLine = null;
      this.navigationLineActive = false;
      this.navigationTarget = null;
    },

    clearNavigationLineOnItemChange() {
      if (this.navigationLineActive) {
        this.hideNavigationLine();
      }
    },

    // Tracking management methods
    enableTrackingForUnit(unitUid, config = {}) {
      if (!this.trackingManager) return false;
      const defaultConfig = {
        enabled: true,
        trailLength: 50,
        trailColor: this.generateTrailColor(unitUid),
        trailWidth: 2,
        trailOpacity: 0.7,
      };
      const finalConfig = { ...defaultConfig, ...config };
      const result = this.trackingManager.setTrailConfig(unitUid, finalConfig);
      this.activeTrails = this.trackingManager.getAllTrails();
      return result;
    },

    disableTrackingForUnit(unitUid) {
      if (!this.trackingManager) return false;
      const result = this.trackingManager.removeTrail(unitUid);
      this.activeTrails = this.trackingManager.getAllTrails();
      return result;
    },

    generateTrailColor(unitUid) {
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

    getTrackingStatus() {
      return this.trackingManager?.isTrackingEnabled() || false;
    },

    setGlobalTrackingEnabled(enabled) {
      if (!this.trackingManager) return false;
      this.trackingManager.setTrackingEnabled(enabled);
      return true;
    },
  },
};
</script>

<style>
#map-container {
  position: relative;
}

.maplibregl-map {
  width: 100%;
  height: 100%;
}

.my-marker-info {
  background: rgba(255, 255, 255, 0.9);
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 12px;
  white-space: nowrap;
  pointer-events: none;
}

.drawing-text-label {
  font-size: 14px;
  font-weight: bold;
  text-shadow: 1px 1px 2px white, -1px -1px 2px white;
  cursor: pointer;
}

.tools-control {
  margin: auto !important;
}

.tools-control button {
  display: block;
  width: 100%;
  padding: 5px;
}

.tools-control button.active-tool {
  background: rgba(13, 110, 253, 0.2);
}

.tools-control button img {
  display: block;
  margin: 0 auto;
}

button.maplibregl-ctrl-icon {
  width: 40px !important;
  height: 40px !important;
}
</style>
