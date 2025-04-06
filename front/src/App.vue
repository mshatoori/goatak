<template>
  <div id="app">
    <nav class="navbar navbar-expand-md navbar-dark fixed-top bg-dark">
      <div class="container-fluid">
        <a class="navbar-brand" href="#">سامانه آگاهی وضعیتی تاکتیکی</a>
        <span class="badge rounded-pill bg-primary"
              :class="{ 'bg-success': connectionStatus, 'bg-secondary': !connectionStatus }">.</span>
        <span class="flex-grow-1"></span>
        <div class="NOT-collapse NOT-navbar-collapse" id="navbarCollapse">
          <ul class="navbar-nav mb-2 mb-md-0">
            <li class="nav-item">
              <a class="nav-link" href="#" id="navbarAlarmsMenuLink" role="button"
                 @click="openAlarmsModal">
                <i :class="{'alarm-active': alarmsCount > 0 }"
                   class="bi bi-exclamation-diamond-fill"></i>
                {{ alarmsCount }}
              </a>
            </li>
            <li class="nav-item">
              <a class="nav-link" href="#" id="navbarSensorsMenuLink" role="button"
                 @click="openSensorsModal">
                سنسورها<span class="badge rounded-pill bg-success">{{ sensorsCount }}</span>
              </a>
            </li>
            <li class="nav-item">
              <a class="nav-link" href="#" id="navbarFeedsMenuLink" role="button" @click="openFeedsModal">
                ارتباطات <span class="badge rounded-pill bg-success">{{ feedsCount }}</span>
              </a>
            </li>
            <li class="nav-item dropdown">
              <a class="nav-link dropdown-toggle" href="#" id="navbarDarkDropdownMenuLink" role="button"
                 data-bs-toggle="dropdown" aria-expanded="false">
                مخاطبین <span class="badge rounded-pill bg-success">{{ contactsCount }}</span>
              </a>
              <ul class="dropdown-menu dropdown-menu-dark" aria-labelledby="navbarDarkDropdownMenuLink">
                <li v-for="u in Array.from(store.state.items.values()).filter(i => i.category === 'contact')" :key="u.uid">
                  <a class="dropdown-item" href="#" @click="setCurrentUnitUid(u.uid, true)">
                    <span v-if="u.lat === 0 && u.lon === 0">* </span>{{ u.callsign }}<span
                        v-if="u.status"> ({{ u.status }})</span>
                  </a>
                </li>
              </ul>
            </li>
            <li class="nav-item dropdown">
              <a class="nav-link dropdown-toggle" href="#" id="navbarDarkDropdownMenuLink2" role="button"
                 data-bs-toggle="dropdown" aria-expanded="false">
                نیروها <span class="badge rounded-pill bg-success">{{ unitsCount }}</span>
              </a>
              <ul class="dropdown-menu dropdown-menu-dark" aria-labelledby="navbarDarkDropdownMenuLink2">
                <li v-for="u in Array.from(store.state.items.values()).filter(i => i.category === 'unit')" :key="u.uid">
                  <a class="dropdown-item" href="#" @click="setCurrentUnitUid(u.uid, true)">
                    {{ getUnitName(u) }}
                  </a>
                </li>
              </ul>
            </li>
            <li class="nav-item dropdown">
              <a class="nav-link dropdown-toggle" href="#" id="navbarDarkDropdownMenuLink3" role="button"
                 data-bs-toggle="dropdown" aria-expanded="false">
                نقاط <span class="badge rounded-pill bg-success">{{ pointsCount }}</span>
              </a>
              <ul class="dropdown-menu dropdown-menu-dark" aria-labelledby="navbarDarkDropdownMenuLink3">
                <li v-for="u in Array.from(store.state.items.values()).filter(i => i.category === 'point')" :key="u.uid">
                  <a class="dropdown-item" href="#" @click="setCurrentUnitUid(u.uid, true)">
                    {{ getUnitName(u) }}
                  </a>
                </li>
              </ul>
            </li>
            <li class="nav-item dropdown">
              <a class="nav-link dropdown-toggle" href="#" id="navbarDarkDropdownMenuLink4" role="button"
                 data-bs-toggle="dropdown" aria-expanded="false">
                پیام‌ها 
                 <span v-if="totalUnseenMessages > 0" class="badge rounded-pill bg-danger">{{ totalUnseenMessages }}</span>
                 <span v-else class="badge rounded-pill bg-secondary">{{ Object.keys(messages).length }}</span>
              </a>
              <ul class="dropdown-menu dropdown-menu-dark" aria-labelledby="navbarDarkDropdownMenuLink4">
                 <li v-if="Object.keys(messages).length === 0">
                     <span class="dropdown-item text-muted">هیچ چتی فعال نیست</span>
                 </li>
                 <li v-for="chat in Object.values(messages)" :key="chat.uid">
                   <a class="dropdown-item d-flex justify-content-between align-items-center" href="#" @click="openMessagesModal(chat.partnerUnit)">
                     {{ chat.partnerCallsign }}
                     <span v-if="chat.unseenCount > 0" class="badge rounded-pill bg-danger ms-2">{{ chat.unseenCount }}</span>
                   </a>
                 </li>
              </ul>
            </li>
          </ul>
        </div>
      </div>
    </nav>

    <div class="container-fluid vh-100 mh-100" style="padding-top: 4rem;">
      <div class="row h-100">
        <div id="map" class="col-9 h-100" style="cursor:crosshair;">
        </div>

        <div class="col-3 p-0 h-100">
          <Sidebar
            :toggle-overlay="toggleOverlay"
            :config="config"
            :delete-current-unit="deleteCurrentUnit"
            :check-emergency="checkEmergency"
            :config-updated="configUpdated"
            :coords="coords"
            :current-unit="currentUnit"
            :locked-unit-uid="lockedUnitUid"
            :map="map"
          />
        </div>
      </div>
    </div>

    <!-- Modals -->
    <ChatModal
      v-if="showChatModal"
      :unit="selectedUnit"
      @close="closeChatModal"
    />

    <FeedsModal
      v-if="showFeedsModal"
      :feeds="feedsList"
      @close="closeFeedsModal"
    />

    <AlarmsModal
      v-if="showAlarmsModal"
      :alarms="alarmsList"
      @close="closeAlarmsModal"
    />

    <EditDrawingModal
      v-if="showEditDrawingModal"
      :drawing="selectedDrawing"
      @close="closeEditDrawingModal"
      @save="saveDrawing"
    />

    <EditUnitModal 
      v-if="showEditUnitModal"
      :unit="unitToEdit"
      @close="closeEditUnitModal"
      @save="saveUnitEdit"
    />

    <SensorsModal
      v-if="showSensorsModal"
      @close="closeSensorsModal"
      @sensors-updated="handleSensorsUpdated"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed, provide } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet-draw'
import 'leaflet-draw/dist/leaflet.draw.css'
import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap-icons/font/bootstrap-icons.css'
import Sidebar from './components/Sidebar.vue'
import ChatModal from './components/ChatModal.vue'
import FeedsModal from './components/FeedsModal.vue'
import AlarmsModal from './components/AlarmsModal.vue'
import EditDrawingModal from './components/EditDrawingModal.vue'
import EditUnitModal from './components/EditUnitModal.vue'
import SensorsModal from './components/SensorsModal.vue'
import { useRouter } from 'vue-router'
import { store, getIconUri, formatDateTime, generateUUID, createUnit, deleteUnit, getIcon, fetchUnits, fetchSensors, fetchFeeds } from './utils'
import { LocationControl } from './leaflet-controls/LocationControl.js'
import { ToolsControl } from './leaflet-controls/ToolsControl.js'

// State
const router = useRouter()
const map = ref(null)
const connectionStatus = ref(false)
const currentUnit = ref(null)
const selectedUnit = ref(null)
const selectedDrawing = ref(null)
const lockedUnitUid = ref(null)
const config = ref(null)
const coords = ref(null)
const messages = ref({})
const drawnItems = ref(null)
const unitToEdit = ref(null)
const overlays = ref({
  contact: { active: true, layerGroup: null },
  unit:    { active: true, layerGroup: null },
  point:   { active: true, layerGroup: null },
  drawing: { active: true, layerGroup: null },
  alarm:   { active: true, layerGroup: null }
})
const alarmsList = ref([])
const feedsList = ref([])
const currentToolMode = ref(null)
const drawControlRef = ref(null)
const measurementLayer = ref(null)

// Counts
const alarmsCount = ref(0)
const sensorsCount = ref(0)
const feedsCount = ref(0)
const contactsCount = ref(0)
const unitsCount = ref(0)
const pointsCount = ref(0)
const messagesCount = ref(0)

// Computed property for total unseen messages
const totalUnseenMessages = computed(() => {
  return Object.values(messages.value).reduce((sum, chat) => sum + (chat.unseenCount || 0), 0);
});

// Modal visibility
const showChatModal = ref(false)
const showFeedsModal = ref(false)
const showAlarmsModal = ref(false)
const showEditDrawingModal = ref(false)
const showEditUnitModal = ref(false)
const showSensorsModal = ref(false)

// WebSocket connection
let ws = null
let reconnectAttempts = 0
const MAX_RECONNECT_ATTEMPTS = 5

// Provide state and functions for MessagesModal
provide('messagesState', messages)
provide('sendMessageFunc', sendMessage)
provide('currentUserConfig', config) // Provide user config

// Provide functions needed by Sidebar
provide('openMessagesModal', openMessagesModal)
provide('openEditUnitModal', openEditUnitModal)
provide('startDistanceMeasure', startDistanceMeasure)
provide('startAddPointMode', startAddPointMode)
provide('getStatus', getStatus); // <-- Provide getStatus

// Map initialization
onMounted(async () => {
  initializeMap()
  setupWebSocket()
  setupEventListeners()
  await fetchConfig()
  await fetchInitialUnits()
  await fetchInitialFeeds()
})

// Cleanup
onUnmounted(() => {
  if (ws) {
    ws.close()
  }
  if (map.value) {
    map.value.remove()
  }
})

// Map initialization
function initializeMap() {
  map.value = L.map('map', {
    center: [35.7219, 51.3347],
    zoom: 13,
    zoomControl: false
  })

  // Add tile layer
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(map.value)

  // Initialize layer groups for overlays
  for (const key in overlays.value) {
      overlays.value[key].layerGroup = L.layerGroup();
      // Add to map only if initially active
      if (overlays.value[key].active) {
          overlays.value[key].layerGroup.addTo(map.value);
      }
  }

  // Initialize the FeatureGroup to store editable layers (Drawings)
  // Use the dedicated drawing layer group now
  drawnItems.value = overlays.value.drawing.layerGroup;
  // map.value.addLayer(drawnItems.value); // Already added above if active

  // Initialize the measurement layer group
  measurementLayer.value = L.layerGroup().addTo(map.value);

  // Add controls
  L.control.zoom({ position: 'bottomright' }).addTo(map.value)
  L.control.scale({ imperial: false }).addTo(map.value)

  // Add custom controls (using imported classes)
  new LocationControl({}, locateByGps).addTo(map.value)
  new ToolsControl({}, {
      measure: startDistanceMeasure,
      addPoint: startAddPointMode,
      openSensors: openSensorsModal
  }).addTo(map.value)

  // Initialize the draw control and store instance
  drawControlRef.value = new L.Control.Draw({ // Store the instance
    edit: {
      featureGroup: drawnItems.value // Still edit permanent drawings
    },
    draw: {
      polygon: {
        allowIntersection: false, // Restricts shapes to simple polygons
        drawError: {
          color: '#e1e100', // Color the shape will turn when intersects
          message: '<strong>Oh snap!<strong> you can\'t draw that!' // Message that will show when intersect
        },
        shapeOptions: {
          color: '#bada55'
        }
      },
      polyline: {
        shapeOptions: {
          color: '#f357a1',
          weight: 10
        }
      },
      // Disable direct drawing buttons initially?
      // We activate them programmatically
      // circle: false, rectangle: false, marker: false, circlemarker: false
    }
  });
  map.value.addControl(drawControlRef.value);
}

// WebSocket setup
function setupWebSocket() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const wsUrl = `${protocol}//${window.location.host}/ws`

  ws = new WebSocket(wsUrl)

  ws.onopen = () => {
    connectionStatus.value = true
    reconnectAttempts = 0
  }

  ws.onclose = () => {
    connectionStatus.value = false
    if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      setTimeout(() => {
        reconnectAttempts++
        setupWebSocket()
      }, 5000)
    }
  }

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data)
    handleWebSocketMessage(data)
  }
}

// Event listeners
function setupEventListeners() {
  if (!map.value) return

  map.value.on('click', handleMapClick)
  map.value.on('mousemove', handleMouseMove)

  // Drawing Events
  map.value.on(L.Draw.Event.CREATED, handleDrawCreated);
  map.value.on(L.Draw.Event.EDITED, handleDrawEdited);
  map.value.on(L.Draw.Event.DELETED, handleDrawDeleted);
}

// WebSocket message handler
function handleWebSocketMessage(data) {
  switch (data.type) {
    case 'unit':
      handleUnitUpdate(data)
      break
    case 'alarm':
      handleAlarmUpdate(data)
      break
    case 'sensor':
      handleSensorUpdate(data)
      break
    case 'feed':
      handleFeedUpdate(data)
      break
    case 'message':
      handleMessageUpdate(data)
      break
  }
}

// Unit handling
function handleUnitUpdate(unit) {
  const results = store.processItems([unit], true)
  
  // Update markers
  results.added.forEach(addUnit)
  results.updated.forEach(updateUnit)
  results.removed.forEach(removeUnit)
  
  // Update counts
  updateCounts()
}

function addUnit(unit) {
  const category = unit.category || 'unit'; // Default category if missing
  const layerGroup = overlays.value[category]?.layerGroup;

  if (!layerGroup) {
    console.warn(`No layer group found for category: ${category}`);
    return; // Don't add if group doesn't exist
  }

  const marker = L.marker([unit.lat, unit.lon], {
    icon: getIcon(unit, true)
  })
  // Store category on marker for toggling
  marker.category = category;
  marker.unit = unit;
  marker.bindPopup(createPopup(unit));

  // Add context menu listener
  marker.on('contextmenu', (e) => {
    showContextMenuPopup(e.target); // Pass the marker itself
  });

  layerGroup.addLayer(marker); // Add to the specific category group

  if (unit.category === 'unit') {
    addContextMenu(marker)
  }
}

function updateUnit(unit) {
  const marker = findMarkerByUnit(unit)
  if (marker) {
    marker.setLatLng([unit.lat, unit.lon])
    marker.setIcon(getIcon(unit, true))
    marker.unit = unit
    marker.setPopupContent(createPopup(unit))
    // Ensure it's in the correct layer group if category changed (unlikely)
    const category = unit.category || 'unit';
    const currentGroup = overlays.value[marker.category]?.layerGroup;
    const targetGroup = overlays.value[category]?.layerGroup;
    if (targetGroup && currentGroup !== targetGroup) {
        currentGroup?.removeLayer(marker);
        targetGroup.addLayer(marker);
        marker.category = category;
    }
  }
}

function removeUnit(unit) {
  const marker = findMarkerByUnit(unit)
  if (marker) {
    const category = marker.category;
    overlays.value[category]?.layerGroup.removeLayer(marker);
    // marker.remove(); // Layer group removal handles removing from map
  }
}

// Show Context Menu Popup
function showContextMenuPopup(marker) {
  if (!marker || !marker.unit) return;
  
  const unit = marker.unit;
  const uid = unit.uid;

  // Simple check to avoid opening multiple popups on the same marker quickly
  if (marker.isPopupOpen() && marker.getPopup().getContent().includes('context-menu-actions')) {
      return;
  }

  const popupContent = `
    <div class="context-menu-actions">
      <h6>${unit.callsign || uid}</h6>
      <button class="btn btn-sm btn-primary w-100 mb-1" data-action="message" data-uid="${uid}">Send Message</button>
      <button class="btn btn-sm btn-secondary w-100 mb-1" data-action="edit" data-uid="${uid}">Edit</button>
      <button class="btn btn-sm btn-danger w-100" data-action="delete" data-uid="${uid}">Delete</button>
    </div>
  `;

  // Bind and open the popup
  marker.bindPopup(popupContent, { 
      closeButton: true, 
      minWidth: 150 
  }).openPopup();

  // Add event listener AFTER the popup is opened and content is in the DOM
  marker.getPopup().on('add', function () {
    const popupElement = this.getElement(); // Get the popup container element
    if (popupElement) {
      popupElement.addEventListener('click', handleContextMenuClick);
    }
  });

  // Remove listener when popup closes to prevent memory leaks
   marker.getPopup().on('remove', function () {
     const popupElement = this.getElement();
     if (popupElement) {
        popupElement.removeEventListener('click', handleContextMenuClick);
     }
   });
}

// Handle clicks within the context menu popup
function handleContextMenuClick(event) {
    const target = event.target;
    // Check if the clicked element is one of our action buttons
    if (target && target.tagName === 'BUTTON' && target.dataset.action) {
        const action = target.dataset.action;
        const uid = target.dataset.uid;
        console.log(`Context menu action: ${action}, UID: ${uid}`);

        if (!uid) return;

        // Find the unit data from the store
        const unit = store.state.items.get(uid);
        if (!unit) {
             console.error("Unit not found in store for context menu action:", uid);
             return;
        }

        // Close the popup first
        map.value.closePopup(); 

        // Call the appropriate action handler
        if (action === 'message') {
            openMessagesModal(unit); // Pass the full unit object
        } else if (action === 'edit') {
            openEditUnitModal(unit); // Pass the full unit object
        } else if (action === 'delete') {
            // Confirmation is good practice here
            if (confirm(`Are you sure you want to delete ${unit.callsign || uid}?`)) {
                currentUnit.value = unit; // Set as current for delete function
                deleteCurrentUnit();
            }
        }
    }
}

// Alarm handling
function handleAlarmUpdate(alarm) {
  console.log("Received alarm:", alarm);
  // Add or update alarm in the list
  const existingIndex = alarmsList.value.findIndex(a => a.uid === alarm.uid); // Assuming alarms have a unique ID
  if (existingIndex > -1) {
    // Update existing alarm
    alarmsList.value.splice(existingIndex, 1, alarm);
  } else {
    // Add new alarm
    alarmsList.value.push(alarm);
  }

  // Recalculate count (simple length for now)
  alarmsCount.value = alarmsList.value.length; 

  // TODO: Add/Update marker on map if alarm has location data
  // if (alarm.lat && alarm.lon) { ... }

  showNotification(alarm); // Show notification
}

// Sensor handling
function handleSensorUpdate(sensor) {
  // For now, just update count if WS provides enough info, 
  // or rely on modal fetch. Let's assume WS just pings for now.
  // Maybe fetch the count again?
  fetchInitialSensorsCount(); // Re-fetch count on sensor update ping
  // sensorsCount.value++ // <-- Simple increment if WS guarantees add
  // updateSensorData(sensor) // Remove placeholder call
}

// Feed handling
function handleFeedUpdate(feed) {
  console.log("Received feed:", feed);
  // Add or update feed in the list
  const existingIndex = feedsList.value.findIndex(f => f.uid === feed.uid); // Assuming feeds have a unique ID
  if (existingIndex > -1) {
    // Update existing feed
    feedsList.value.splice(existingIndex, 1, feed);
  } else {
    // Add new feed
    feedsList.value.push(feed);
  }
  // Recalculate count
  feedsCount.value = feedsList.value.length;
}

// Message handling
function handleMessageUpdate(message) {
  if (!messages.value[message.uid]) {
    messages.value[message.uid] = {
      uid: message.uid,
      from: message.from,
      messages: [],
      unseenCount: 0
    }
  }
  messages.value[message.uid].messages.push(message)
  messages.value[message.uid].unseenCount++
}

// Send Message via WebSocket
async function sendMessage(toUid, text) {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
        console.error("Cannot send message: WebSocket is not connected.");
        // TODO: Notify user
        return false; // Indicate failure
    }
    if (!config.value || !config.value.uid) {
        console.error("Cannot send message: User config/UID not loaded.");
        return false;
    }
    if (!toUid || !text || text.trim() === '') {
        console.error("Cannot send message: Invalid recipient or empty text.");
        return false;
    }

    const messagePayload = {
        type: 'message', // Assuming backend expects a type field
        message_id: generateUUID(), // Generate a unique ID for the message
        from_uid: config.value.uid,
        to_uid: toUid,
        text: text.trim(),
        time: new Date().toISOString(),
        // Include other fields if required by the backend
        // e.g., from_callsign: config.value.callsign
    };

    try {
        console.log("Sending message:", messagePayload);
        ws.send(JSON.stringify(messagePayload));
        // Note: We don't add the message to the local store here.
        // We wait for the backend to echo it back via handleMessageUpdate
        // to ensure it was successfully processed server-side.
        // If the backend *doesn't* echo back sent messages, we'd need to add it locally here.
        return true; // Indicate success
    } catch (error) {
        console.error("Error sending message via WebSocket:", error);
        // TODO: Notify user
        return false;
    }
}

// Drawing event handlers
function handleDrawCreated(e) {
  const type = e.layerType;
  const layer = e.layer;

  // Check if we are in measurement mode
  if (currentToolMode.value === 'measure' && type === 'polyline') {
    console.log("Measure Polyline Created:", layer);
    // Calculate distance
    const latlngs = layer.getLatLngs();
    let totalDistance = 0;
    for (let i = 0; i < latlngs.length - 1; i++) {
        totalDistance += map.value.distance(latlngs[i], latlngs[i+1]);
    }
    const distanceStr = totalDistance < 1000 ? `${totalDistance.toFixed(0)} m` : `${(totalDistance / 1000).toFixed(2)} km`;
    console.log("Calculated Distance:", distanceStr);

    // Add the line to the temporary measurement layer
    measurementLayer.value.addLayer(layer);
    // Add a tooltip showing the distance
    layer.bindTooltip(`Distance: ${distanceStr}`, { permanent: true, direction: 'center' }).openTooltip();

    // IMPORTANT: Disable the drawing mode AFTER calculation
    // We don't want this saved as a permanent drawing
    // We also keep the mode active until user explicitly cancels or starts new measure
    // cancelCurrentToolMode(); // Don't cancel yet
    // Disable the draw handler specifically
    new L.Draw.Polyline(map.value, drawControlRef.value.options.draw.polyline).disable();
    setMapCursor(''); // Reset cursor after drawing one line

  } else { 
    // --- Existing Drawing Logic --- 
    console.log('Draw Created (Permanent Drawing): ', type, layer);
    let lat, lon;
    let coords = [];
    if (type === 'polygon') {
      const latlngs = layer.getLatLngs()[0]; // Get LatLngs of the main ring
      coords = latlngs.map(ll => [ll.lat, ll.lng]);
      const center = layer.getBounds().getCenter();
      lat = center.lat;
      lon = center.lng;
    } else if (type === 'polyline') {
      const latlngs = layer.getLatLngs();
      coords = latlngs.map(ll => [ll.lat, ll.lng]);
      // For polylines, use the first point as the nominal location
      if (latlngs.length > 0) {
          lat = latlngs[0].lat;
          lon = latlngs[0].lng;
      } else {
          // Handle case with no points (shouldn't happen with leaflet-draw)
          return;
      }
    }

    const drawingUnit = {
      uid: generateUUID(),
      category: 'drawing',
      type: type, // Store original type (polygon/polyline)
      callsign: `Drawing ${Date.now()}`, // Default callsign
      lat: lat,
      lon: lon,
      points: coords, // Store the actual points
      timestamp: new Date().toISOString(),
      // Add any other default fields needed for drawings
      text: '',
      color: type === 'polygon' ? '#bada55' : '#f357a1' // Default color based on type
    };

    // Link the leaflet layer to the unit data
    layer.unit_uid = drawingUnit.uid;
    layer.category = 'drawing';
    overlays.value.drawing.layerGroup.addLayer(layer);
    selectedDrawing.value = drawingUnit;
    showEditDrawingModal.value = true;
    // --- End of Existing Drawing Logic --- 
  }
}

function handleDrawEdited(e) {
  const layers = e.layers;
  console.log('Draw Edited:', layers);
  layers.eachLayer(async function (layer) {
    const uid = layer.unit_uid;
    if (!uid) {
      console.warn("Edited layer has no unit_uid:", layer);
      return;
    }

    const existingDrawing = store.state.items.get(uid);
    if (!existingDrawing || existingDrawing.category !== 'drawing') {
      console.warn("Could not find drawing data in store for edited layer:", uid);
      return;
    }

    // Update geometry data
    let newLat, newLon;
    let newCoords = [];
    if (layer instanceof L.Polygon) {
        const latlngs = layer.getLatLngs()[0];
        newCoords = latlngs.map(ll => [ll.lat, ll.lng]);
        const center = layer.getBounds().getCenter();
        newLat = center.lat;
        newLon = center.lng;
    } else if (layer instanceof L.Polyline) {
        const latlngs = layer.getLatLngs();
        newCoords = latlngs.map(ll => [ll.lat, ll.lng]);
        if (latlngs.length > 0) {
            newLat = latlngs[0].lat;
            newLon = latlngs[0].lng;
        } else {
            return; // Should not happen
        }
    } else {
        console.warn("Edited layer type not handled:", layer);
        return;
    }

    const updatedDrawing = {
      ...existingDrawing,
      lat: newLat,
      lon: newLon,
      points: newCoords,
      timestamp: new Date().toISOString() // Update timestamp
    };

    console.log("Updating drawing after edit:", updatedDrawing);

    // Update local store
    store.processItems([updatedDrawing], true);

    // Send update to backend
    try {
      await createUnit(updatedDrawing);
      console.log("Backend updated for edited drawing:", uid);
    } catch (error) {
      console.error("Error updating edited drawing on backend:", error);
      // TODO: Add user notification for save failure
    }
  });
}

function handleDrawDeleted(e) {
  const layers = e.layers;
  console.log('Draw Deleted:', layers);
  layers.eachLayer(async function (layer) {
    const uid = layer.unit_uid;
    if (!uid) {
      console.warn("Deleted layer has no unit_uid:", layer);
      return;
    }

    console.log("Deleting drawing:", uid);

    // 1. Remove from backend
    try {
      await deleteUnit(uid); // Use deleteUnit from utils.js
      console.log("Backend deleted drawing:", uid);
    } catch (error) {
      console.error("Error deleting drawing from backend:", error);
      // TODO: Add user notification for delete failure
      // Proceed with removing from local store even if backend fails?
      // Depending on desired behavior, you might return here or show an error
    }

    // 2. Remove from local store
    if (store.state.items.has(uid)) {
      store.state.items.delete(uid);
      // Manually trigger reactivity or let Vue detect the change if store.state is reactive
      // You might need a more robust way if using complex state management
      console.log("Removed drawing from local store:", uid);
      store.state.timestamp++; // Force update if needed
      updateCounts(); // Update counts if drawings were included
    } else {
      console.warn("Drawing to delete not found in local store:", uid);
    }

    // Note: The layer is already removed from the map by leaflet-draw
  });
}

// Map click handler
async function handleMapClick(e) {
  const { lat, lng } = e.latlng

  if (currentToolMode.value === 'addPoint') {
    console.log("Map click in Add Point mode");
    // Create a new POINT object
    const newPoint = {
        uid: generateUUID(),
        category: 'point',
        callsign: '', // User will set in modal
        lat,
        lon: lng,
        type: 'b-m-p-s-m', // Default to Spot Map marker type
        affiliation: 'f', // Points often don't have affiliation, but set a default
        sidc: 'SFGPE---------', // Generic Friendly Point SIDC (Environment=G, Type=Point, Function=E ?) - Adjust as needed!
        timestamp: new Date().toISOString(),
        send: true
    };
    openEditUnitModal(newPoint); // Open modal to edit details
    // Reset mode and cursor
    cancelCurrentToolMode(); 
  } else {
    // Default behavior: Create a new UNIT object
    const newUnit = {
      uid: generateUUID(),
      category: 'unit', 
      callsign: '', 
      lat,
      lon: lng,
      team: config.value?.team || '',
      role: config.value?.role || '',
      affiliation: 'f', 
      sidc: 'SFGPU----------', 
      type: 'unknown', 
      speed: 0,
      altitude: 0,
      parent_uid: config.value?.uid,
      parent_callsign: config.value?.callsign,
      timestamp: new Date().toISOString(),
      send: true 
    };
    openEditUnitModal(newUnit);
  }
}

// Mouse move handler
function handleMouseMove(e) {
  const { lat, lng } = e.latlng
  coords.value = { lat, lng }
}

// Utility functions
function getUnitName(unit) {
  return unit.callsign || unit.uid
}

function createPopup(unit) {
  return `
    <div class="unit-popup">
      <h6>${unit.callsign || unit.uid}</h6>
      <p>Team: ${unit.team || 'N/A'}</p>
      <p>Role: ${unit.role || 'N/A'}</p>
      <p>Speed: ${unit.speed ? (unit.speed * 3.6).toFixed(1) + ' km/h' : 'N/A'}</p>
      <p>Altitude: ${unit.altitude ? unit.altitude.toFixed(0) + ' m' : 'N/A'}</p>
      <p>Coordinates: ${latLongToIso6709(unit.lat, unit.lon)}</p>
    </div>
  `
}

function latLongToIso6709(lat, lon) {
  const ns = lat >= 0 ? 'N' : 'S'
  const ew = lon >= 0 ? 'E' : 'W'
  return `${Math.abs(lat).toFixed(6)}${ns}${Math.abs(lon).toFixed(6)}${ew}`
}

function findMarkerByUnit(unit) {
  let found = null;
  const categoriesToSearch = ['unit', 'contact', 'point', 'alarm']; // Add other categories if needed

  for (const category of categoriesToSearch) {
      const layerGroup = overlays.value[category]?.layerGroup;
      if (layerGroup) {
          layerGroup.eachLayer((layer) => {
              if (layer instanceof L.Marker && layer.unit?.uid === unit.uid) {
                  found = layer;
                  // Break inner loop once found
                  return false; 
              }
          });
      }
      if (found) break; // Break outer loop if found
  }
  return found;
}

function updateCounts() {
  contactsCount.value = Array.from(store.state.items.values()).filter(u => u.category === 'contact').length
  unitsCount.value = Array.from(store.state.items.values()).filter(u => u.category === 'unit').length
  pointsCount.value = Array.from(store.state.items.values()).filter(u => u.category === 'point').length
  // Sensor count is updated separately by fetchInitialSensorsCount
}

function showNotification(message) {
  // Implement notification system
}

// Modal handlers
function openChatModal(unit) {
  selectedUnit.value = unit
  showChatModal.value = true
}

function closeChatModal() {
  showChatModal.value = false
  selectedUnit.value = null
}

function openFeedsModal() {
  showFeedsModal.value = true
}

function closeFeedsModal() {
  showFeedsModal.value = false
}

function openAlarmsModal() {
  showAlarmsModal.value = true
}

function closeAlarmsModal() {
  showAlarmsModal.value = false
}

function openEditDrawingModal(drawing) {
  selectedDrawing.value = drawing
  showEditDrawingModal.value = true
}

function closeEditDrawingModal() {
  showEditDrawingModal.value = false
  selectedDrawing.value = null
}

function openEditUnitModal(unitData) {
  console.log("Opening Edit Unit Modal for:", unitData);
  unitToEdit.value = unitData; // Set the unit data for the modal prop
  showEditUnitModal.value = true;
}

function closeEditUnitModal() {
  showEditUnitModal.value = false;
  unitToEdit.value = null; // Clear the unit data
}

async function saveUnitEdit(editedUnitData) {
  console.log("Saving edited unit:", editedUnitData);

  // 1. Update local store
  const results = store.processItems([editedUnitData], true);
  console.log("Store update results:", results);

  // 2. Send to backend (Create or Update)
  try {
    const response = await createUnit(editedUnitData); // createUnit handles both create/update based on UID
    console.log("Backend save/update response:", response);
    // Optional: Update store again if backend response differs
    // if (response) store.processItems([response], true);

    // Find/Update marker if necessary (especially if icon changes)
    const marker = findMarkerByUnit(editedUnitData);
    if (marker) {
        updateUnit(editedUnitData); // Reuse existing updateUnit logic
    } else {
        addUnit(editedUnitData); // Add marker if it was a new unit
    }

  } catch (error) {
    console.error("Error saving unit edit to backend:", error);
    // TODO: Add user notification for save failure
  }

  // 3. Close modal
  closeEditUnitModal();
}

async function saveDrawing(drawingData) {
  console.log("Saving drawing:", drawingData);

  // 1. Update local store
  const results = store.processItems([drawingData], true);
  console.log("Store update results:", results);

  // 2. Send to backend
  try {
    const response = await createUnit(drawingData); // Use createUnit from utils.js
    console.log("Backend response:", response);
    // Optional: Update drawingData with response if backend modifies it
    // store.processItems([response], true); // Update store again if needed
  } catch (error) {
    console.error("Error saving drawing to backend:", error);
    // TODO: Add user notification for save failure
    // Optional: Revert local store change or handle error state
    // For now, we proceed even if backend save fails
  }

  // 3. Update Leaflet layer style (if applicable)
  const layer = findLayerByUnitUid(drawingData.uid);
  if (layer) {
    if (layer.setStyle && drawingData.color) {
      layer.setStyle({ color: drawingData.color });
    }
    // Update popup if needed, although drawings might not have complex popups yet
    // layer.bindPopup(createPopup(drawingData)).update();
  }

  // 4. Close modal
  closeEditDrawingModal();
}

// Utility function to find layer by unit_uid
function findLayerByUnitUid(uid) {
  let foundLayer = null;
  // Check the specific drawing layer group
  const drawingLayerGroup = overlays.value.drawing?.layerGroup;
  if (drawingLayerGroup) {
      drawingLayerGroup.eachLayer(layer => {
        if (layer.unit_uid === uid) {
          foundLayer = layer;
          return false; // stop iteration
        }
      });
  }
  return foundLayer;
}

// Locate User via GPS
function locateByGps() {
  if (!navigator.geolocation) {
    console.error('Geolocation is not supported by your browser');
    // TODO: Notify user
    return;
  }

  console.log("Attempting to locate user...");
  navigator.geolocation.getCurrentPosition((position) => {
    const lat = position.coords.latitude;
    const lon = position.coords.longitude;
    console.log(`Geolocation success: Lat: ${lat}, Lon: ${lon}`);

    if (map.value) {
        const zoomLevel = map.value.getZoom() < 15 ? 15 : map.value.getZoom();
        map.value.flyTo([lat, lon], zoomLevel);

        // Optionally place a temporary marker
        L.marker([lat, lon], { title: "Your Location" }).addTo(map.value)
            .bindPopup("You are here.").openPopup();
        setTimeout(() => { // Remove marker after a delay
            map.value.eachLayer(layer => {
                if (layer.options.title === "Your Location") {
                    map.value.removeLayer(layer);
                }
            });
        }, 5000);
    }

    // Optionally update user's own config/unit position
    if (config.value) {
      config.value.lat = lat;
      config.value.lon = lon;
      configUpdated(config.value); // Send update to backend
    }

  }, (error) => {
    console.error('Error getting geolocation:', error);
    // TODO: Notify user (e.g., "Could not get location")
  });
}

// Set Current Unit / Pan Map
function setCurrentUnitUid(uid, panTo = false) {
  const unit = store.state.items.get(uid);
  if (unit) {
    currentUnit.value = unit;
    console.log("Current unit set:", unit);
    lockedUnitUid.value = uid; // Lock sidebar/selection to this unit

    if (panTo && map.value && unit.lat != null && unit.lon != null && (unit.lat !== 0 || unit.lon !== 0)) {
      const zoomLevel = map.value.getZoom() < 15 ? 15 : map.value.getZoom(); // Zoom in if zoomed out
      map.value.flyTo([unit.lat, unit.lon], zoomLevel);
    }
  } else {
    console.warn("setCurrentUnitUid: Unit not found for UID:", uid);
    currentUnit.value = null; // Clear selection if unit not found
    lockedUnitUid.value = null;
  }
}

// Navigation
function logout() {
  router.push('/login')
}

// Sidebar Interaction Functions
function toggleOverlay(category, isActive) {
  console.log(`Toggling overlay: ${category}, Active: ${isActive}`);
  const overlay = overlays.value[category];
  if (overlay && overlay.layerGroup) {
    overlay.active = isActive;
    if (isActive) {
      map.value.addLayer(overlay.layerGroup);
    } else {
      map.value.removeLayer(overlay.layerGroup);
    }
  } else {
    console.warn(`Overlay category not found or layer group not initialized: ${category}`);
  }
}

async function deleteCurrentUnit() {
  if (!currentUnit.value) {
    console.warn("deleteCurrentUnit called but no currentUnit selected.");
    return;
  }

  const unitToDelete = currentUnit.value;
  console.log("Attempting to delete unit:", unitToDelete.uid);

  try {
    await deleteUnit(unitToDelete.uid); // Call API from utils.js
    console.log("Backend delete request sent for unit:", unitToDelete.uid);
    // Clear the selection immediately
    currentUnit.value = null;
    lockedUnitUid.value = null;
    // The actual removal from the map and store should happen
    // when the backend confirms deletion via WebSocket message
    // which triggers store.processItems and removeUnit.
  } catch (error) {
    console.error("Error deleting unit from backend:", error);
    // TODO: Show error notification to the user
    // Decide if we should still clear the selection on error
    currentUnit.value = null;
    lockedUnitUid.value = null;
  }
}

async function checkEmergency(emergencyData) {
  console.log("Sending emergency check:", emergencyData);

  if (!config.value || !config.value.uid) {
      console.error("Cannot send emergency: User config or UID is missing.");
      // TODO: Notify user
      return;
  }

  const emergencyUnit = {
      uid: generateUUID(), // Or maybe a fixed UID for the user's emergency beacon?
      category: 'emergency', // Or use a specific category if needed by backend
      type: "b-a-o-tbl", // Standard type for emergency beacon/alert
      lat: config.value.lat || 0, // Use user's last known lat/lon from config
      lon: config.value.lon || 0,
      parent_uid: config.value.uid, // Link to the user sending the emergency
      parent_callsign: config.value.callsign,
      timestamp: new Date().toISOString(),
      emergency: { // Embed the specific flags
          switch1: emergencyData.switch1 || false,
          switch2: emergencyData.switch2 || false,
      },
      // Include other relevant fields if necessary
      callsign: `${config.value.callsign}-EMERGENCY`
  };

  try {
      await createUnit(emergencyUnit);
      console.log("Emergency signal sent to backend.");
      // TODO: Provide user feedback (e.g., visual indicator)
  } catch (error) {
      console.error("Error sending emergency signal:", error);
      // TODO: Notify user about the failure
  }
}

async function configUpdated(newConfig) {
  console.log("Configuration updated from Sidebar:", newConfig);

  if (!config.value || !newConfig) {
      console.error("Config update failed: Old or new config is missing.");
      return;
  }

  // 1. Update local config ref
  // Merge carefully to avoid overwriting essential fields like UID if not present in newConfig
  config.value = { ...config.value, ...newConfig };

  // 2. Send update to backend (optional, depends on backend design)
  // Assuming the user's config represents their own unit/presence
  if (config.value.uid) {
      const selfUpdateUnit = {
          uid: config.value.uid,
          callsign: config.value.callsign,
          team: config.value.team,
          role: config.value.role,
          // Include other fields managed by config if they map to unit properties
          // Ensure lat/lon/timestamp are handled correctly if config changes affect them
          lat: config.value.lat, 
          lon: config.value.lon,
          timestamp: new Date().toISOString(), // Update timestamp on change
          // Make sure category/type/affiliation are correctly set for the self-update
          category: 'unit', 
          affiliation: 'f' // Assuming self is friendly
      };
      
      try {
          await createUnit(selfUpdateUnit); // Send update for own unit
          console.log("Sent self-update to backend based on config change.");
      } catch (error) {
          console.error("Error sending self-update to backend:", error);
          // TODO: Notify user of failure
      }
  }
}

// Tool Mode Handlers
function startDistanceMeasure() {
    if (currentToolMode.value === 'measure') {
      // If already in measure mode, just clear previous measurement and restart
      measurementLayer.value.clearLayers(); 
      console.log("Restarting distance measurement.")
    } else {
       cancelCurrentToolMode(); // Cancel any other active mode
       console.log("MODE: Start Distance Measurement");
       currentToolMode.value = 'measure';
    }
    
    // Enable the polyline draw handler
    new L.Draw.Polyline(map.value, drawControlRef.value.options.draw.polyline).enable();
    setMapCursor('crosshair'); // Set appropriate cursor
    // TODO: Add visual feedback to the button
}

function startAddPointMode() {
    if (currentToolMode.value === 'addPoint') {
        cancelCurrentToolMode(); // Toggle off if already active
        return;
    }
    cancelCurrentToolMode(); // Cancel any other mode
    console.log("MODE: Start Add Generic Point");
    currentToolMode.value = 'addPoint';
    setMapCursor('crosshair'); // Change cursor
    // TODO: Add visual feedback to the button
}

function cancelCurrentToolMode() {
    console.log("Cancelling current tool mode:", currentToolMode.value);
    const mode = currentToolMode.value;
    currentToolMode.value = null;
    setMapCursor(''); // Reset cursor to default

    // Disable any active draw handlers
    if (drawControlRef.value) {
      // Disable all draw handlers just in case
      for (const key in drawControlRef.value._toolbars.draw._modes) {
          drawControlRef.value._toolbars.draw._modes[key].handler.disable();
      }
      // Could also disable specific handler based on `mode` if needed
      // if (mode === 'measure') { ... disable polyline ... }
    }

    // Clear temporary measurement layers if cancelling measure mode
    if (mode === 'measure') {
        measurementLayer.value.clearLayers();
    }
    
    // TODO: Remove visual feedback from buttons
}

// Helper to change map cursor style
function setMapCursor(cursorStyle) {
    if (map.value && map.value.getContainer()) {
        map.value.getContainer().style.cursor = cursorStyle || '';
    }
}

// --- Sensors Modal --- 
function openSensorsModal() {
  showSensorsModal.value = true;
}

function closeSensorsModal() {
  showSensorsModal.value = false;
}

// Handler for when sensors are updated (e.g., created/deleted in the modal)
function handleSensorsUpdated() {
    // Re-fetch the count
    fetchInitialSensorsCount();
}
// ---------------------

// Fetch user config and initial sensor count
async function fetchConfig() {
  try {
    const response = await fetch('/config');
    config.value = await response.json();
    console.log("Config loaded:", config.value);
    await fetchInitialSensorsCount(); // Fetch sensors count after config
  } catch (error) {
    console.error("Error fetching config:", error);
    // Handle config fetch error appropriately
  }
}

// Fetch initial sensor count
async function fetchInitialSensorsCount() {
    try {
        const sensors = await fetchSensors();
        sensorsCount.value = sensors?.length || 0;
    } catch (error) {
        console.error("Error fetching initial sensors count:", error);
        sensorsCount.value = 0;
    }
}

// Fetch initial units and populate map
async function fetchInitialUnits() {
    console.log("Fetching initial units...");
    try {
        const units = await fetchUnits();
        console.log(`Fetched ${units?.length || 0} initial units.`);
        if (units && units.length > 0) {
            // Process units through the store (adds them to items map)
            // Use partial = false to clear any potentially stale items first?
            // Or assume the fetch gives the complete current state.
            const results = store.processItems(units, false); // Use false to replace existing items
            
            // Add markers for the newly added items
            results.added.forEach(unit => addUnit(unit));
            
            // Remove markers for any items that were removed by processItems (if partial=false)
            results.removed.forEach(unit => removeUnit(unit)); 
            
            console.log(`Processed initial units: Added ${results.added.length}, Updated ${results.updated.length}, Removed ${results.removed.length}`);
            
            updateCounts(); // Update counts based on the fetched items
        }
    } catch (error) {
        console.error("Error fetching initial units:", error);
        // TODO: Notify user about the failure
    }
}

// Fetch initial feeds
async function fetchInitialFeeds() {
    console.log("Fetching initial feeds...");
    try {
        const feeds = await fetchFeeds(); // Use fetchFeeds from utils.js
        console.log(`Fetched ${feeds?.length || 0} initial feeds.`);
        feedsList.value = feeds || [];
        feedsCount.value = feedsList.value.length; // Update count
    } catch (error) {
        console.error("Error fetching initial feeds:", error);
        feedsList.value = [];
        feedsCount.value = 0;
    }
}

// Get Unit Status (simple example)
function getStatus(unitUid) {
    const unit = store.state.items.get(unitUid);
    // Define 'online' criteria (e.g., recent timestamp or specific status field)
    if (unit && unit.status === 'online') { // Assuming a specific 'status' field exists
        return 'Online';
    } 
    // Add more sophisticated logic based on stale time if needed
    // const now = Date.now();
    // const staleTime = Date.parse(unit?.stale_time || 0);
    // if (unit && staleTime > now) { return 'Online'; } 
    return 'Offline';
}

// Expose necessary functions and state
defineExpose({
  currentUnit,
  overlays,
  userInfo,
  connectionStatus,
  alarmsCount,
  sensorsCount,
  feedsCount,
  contactsCount,
  unitsCount,
  pointsCount,
  messagesCount,
  openChatModal,
  openFeedsModal,
  openAlarmsModal,
  openEditDrawingModal,
  openEditUnitModal,
  toggleOverlay,
  deleteCurrentUnit,
  checkEmergency,
  configUpdated,
  openSensorsModal,
  sendMessage
})
</script>

<style>
.app-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.main-content {
  flex: 1;
  display: flex;
  position: relative;
}

.map-container {
  flex: 1;
  height: 100%;
}

/* RTL Support */
[dir="rtl"] .navbar-nav {
  padding-right: 0;
}

[dir="rtl"] .me-auto {
  margin-right: 0 !important;
  margin-left: auto !important;
}

[dir="rtl"] .me-3 {
  margin-right: 0 !important;
  margin-left: 1rem !important;
}

/* Unit popup styles */
.unit-popup {
  padding: 10px;
}

.unit-popup h6 {
  margin-bottom: 10px;
  font-weight: bold;
}

.unit-popup p {
  margin: 5px 0;
  font-size: 0.9em;
}

/* Style for custom controls */
.leaflet-control-custom i {
    vertical-align: middle;
}
</style> 