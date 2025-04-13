<template>
  <div id="app">
    <AppNavbar :connection-status="connectionStatus" :alarms-count="alarmsCount" :sensors-count="sensorsCount"
      :feeds-count="feedsCount" :contacts-count="contactsCount" :contacts="contactList" :units-count="unitsCount"
      :units="unitList" :points-count="pointsCount" :points="pointList" :total-unseen-messages="totalUnseenMessages"
      :chats-count="chatList.length" :chats="chatList" @open-alarms="openAlarmsModal" @open-sensors="openSensorsModal"
      @open-feeds="openFeedsModal" @set-unit="setCurrentUnitUid" @open-messages="openMessagesModal" />

    <div class="container-fluid vh-100 mh-100" style="padding-top: 4rem;">
      <div class="row h-100">
        <div id="map" class="col-9 h-100" style="cursor:crosshair;">
        </div>

        <div class="col-3 p-0 h-100">
          <Sidebar :toggle-overlay="toggleOverlay" :config="config" :delete-current-unit="deleteCurrentUnit"
            :check-emergency="checkEmergency" :config-updated="configUpdated" :coords="coords" :user-coords="userCoords"
            :current-unit="currentUnit" :locked-unit-uid="lockedUnitUid" :map="map" />
        </div>
      </div>
    </div>

    <!-- Modals -->
    <MessagesModal v-if="showChatModal" :unit="selectedUnit" @close="closeChatModal" />

    <FeedsModal v-if="showFeedsModal" :feeds="feedsList" @close="closeFeedsModal" />

    <AlarmsModal v-if="showAlarmsModal" :alarms="alarmsList" @close="closeAlarmsModal" />

    <EditDrawingModal v-if="showEditDrawingModal" :drawing="selectedDrawing" @close="closeEditDrawingModal"
      @save="saveDrawing" />

    <EditUnitModal v-if="showEditUnitModal" :unit="unitToEdit" @close="closeEditUnitModal" @save="saveUnitEdit" />

    <SensorsModal v-if="showSensorsModal" @close="closeSensorsModal" @sensors-updated="handleSensorsUpdated" />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed, provide, getCurrentInstance } from 'vue'
import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap/dist/css/bootstrap.rtl.min.css'
import 'bootstrap-icons/font/bootstrap-icons.css'
import AppNavbar from './components/AppNavbar.vue'
import Sidebar from './components/Sidebar.vue'
import MessagesModal from './components/MessagesModal.vue'
import FeedsModal from './components/FeedsModal.vue'
import AlarmsModal from './components/AlarmsModal.vue'
import EditDrawingModal from './components/EditDrawingModal.vue'
import EditUnitModal from './components/EditUnitModal.vue'
import SensorsModal from './components/SensorsModal.vue'
import { store } from './store.js'
import { generateUUID } from './utils'
import { fetchUnits, createUnit, deleteUnit, fetchSensors, fetchFeeds, fetchConfig as fetchConfigApi, fetchUserPosition } from './apiService.js'
import { Item } from './models/Item.js'
import { useMapInitialization } from './composables/useMapInitialization.js'
import { useWebSocket } from './composables/useWebSocket.js'
import { useMarkerManager } from './composables/useMarkerManager.js'
import { useDrawingTools } from './composables/useDrawingTools.js'
import { useInitialDataLoader } from './composables/useInitialDataLoader.js'

// State
const { proxy } = getCurrentInstance();
const currentUnit = ref(null)
const selectedUnit = ref(null)
const selectedDrawing = ref(null)
const lockedUnitUid = ref(null)
const config = ref(null)
const coords = ref({ lat: 0, lng: 0 })
const messages = ref({})
const unitToEdit = ref(null)
const alarmsList = ref([])
const feedsList = ref([])
const {
  map,
  selfMarker,
  overlays,
  drawnItems,
  measurementLayer,
  drawControlRef,
  initializeMap
} = useMapInitialization(locateByGps, activateDistanceMeasure, activateAddPointMode, openSensorsModal);

// === Instantiate WebSocket Composable ===
const {
  connectionStatus,
  connect: connectWebSocket,
  disconnect: disconnectWebSocket,
  sendMessage: sendWsMessage
} = useWebSocket(handleWebSocketMessage);

// === Instantiate Marker Manager Composable ===
const handleMessageAction = (unit) => {
  openMessagesModal(unit);
};
const handleEditAction = (unit) => {
  const fullUnitData = store.state.items.get(unit.uid);
  if (fullUnitData instanceof Item) {
    openEditUnitModal(fullUnitData);
  } else {
    console.error("Could not find Item instance in store for edit action:", unit.uid);
    if (fullUnitData) openEditUnitModal(new Item(fullUnitData));
  }
};
const handleDeleteAction = (unit) => {
  const fullUnitData = store.state.items.get(unit.uid);
  if (fullUnitData instanceof Item) {
    currentUnit.value = fullUnitData;
    deleteCurrentUnit();
  } else {
    console.error("Could not find Item instance in store for delete action:", unit.uid);
  }
};

const {
  updateMarkerForUnit,
  removeMarkerForUnit,
  updateSelfMarkerPosition,
  updateSelfMarkerPopup,
  findMarkerByUnit
} = useMarkerManager(
  map,
  overlays,
  selfMarker,
  handleMessageAction,
  handleEditAction,
  handleDeleteAction
);

// === Instantiate Drawing Tools Composable ===
const handleDrawingCreated = (drawingData) => {
  console.log("App.vue: Drawing created (raw data):", drawingData);
  const newDrawingItem = new Item({
    ...drawingData,
    category: 'drawing',
  });
  console.log("App.vue: Converted drawing to Item:", newDrawingItem);
  selectedDrawing.value = newDrawingItem;
  showEditDrawingModal.value = true;
};

const handleDrawingEdited = async (editedLayersInfo) => {
  console.log("App.vue: Drawings edited (raw data):", editedLayersInfo);
  for (const editInfo of editedLayersInfo) {
    const existingDrawing = store.state.items.get(editInfo.uid);
    if (!existingDrawing || !(existingDrawing instanceof Item) || existingDrawing.category !== 'drawing') {
      console.warn("Could not find original drawing Item in store for edit:", editInfo.uid);
      continue;
    }
    const updatedDrawing = new Item({
      ...existingDrawing,
      lat: editInfo.newLat,
      lon: editInfo.newLon,
      points: editInfo.newCoords,
      time: new Date().toISOString()
    });
    console.log("Updating drawing store/backend with Item:", updatedDrawing);
    store.processItems([updatedDrawing], true);
    try {
      await createUnit(updatedDrawing);
      console.log("Backend updated for edited drawing Item:", editInfo.uid);
    } catch (error) {
      console.error("Error updating edited drawing Item on backend:", error);
    }
  }
};

const handleDrawingDeleted = async (deletedInfo) => {
  console.log("App.vue: Drawings deleted UIDs:", deletedInfo.uids);
  for (const uid of deletedInfo.uids) {
    console.log("Processing deleted drawing:", uid);
    const itemToDelete = store.state.items.get(uid);
    try {
      await deleteUnit(uid);
      console.log("Backend deleted drawing/item:", uid);
    } catch (error) {
      console.error("Error deleting drawing/item from backend:", error);
    }
    if (itemToDelete) {
      store.processItems([{ uid: uid, _delete: true }], true);
      console.log("Triggered removal of drawing/item from local store:", uid);
    } else {
      console.warn("Drawing/Item to delete not found in local store:", uid);
    }
  }
  updateCounts();
};

const {
  currentToolMode,
  startDistanceMeasure: startMeasureTool,
  startAddPointMode: startPointTool,
  cancelCurrentToolMode: cancelDrawingToolMode,
  registerDrawEventListeners,
  removeDrawEventListeners
} = useDrawingTools(
  map,
  overlays,
  measurementLayer,
  drawControlRef,
  handleDrawingCreated,
  handleDrawingEdited,
  handleDrawingDeleted
);

// === Instantiate Initial Data Loader ===
const { loadInitialData } = useInitialDataLoader({
  fetchConfigFunc: fetchConfig,
  fetchInitialUnitsFunc: fetchInitialUnits,
  fetchInitialFeedsFunc: fetchInitialFeeds
});

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

// Computed properties for Navbar lists
const contactList = computed(() =>
  Array.from(store.state.items.values()).filter(i => i.category === 'contact')
);
const unitList = computed(() =>
  Array.from(store.state.items.values()).filter(i => i.category === 'unit')
);
const pointList = computed(() =>
  Array.from(store.state.items.values()).filter(i => i.category === 'point')
);
// Use the existing messages ref for the chat list
const chatList = computed(() =>
  Object.values(messages.value)
);

// Modal visibility
const showChatModal = ref(false)
const showFeedsModal = ref(false)
const showAlarmsModal = ref(false)
const showEditDrawingModal = ref(false)
const showEditUnitModal = ref(false)
const showSensorsModal = ref(false)

// Provide state and functions for MessagesModal
provide('messagesState', messages)
provide('sendMessageFunc', sendMessage)
provide('currentUserConfig', config)

// Provide functions needed by Sidebar
provide('openMessagesModal', openMessagesModal)
provide('openEditUnitModal', openEditUnitModal)
provide('startDistanceMeasure', activateDistanceMeasure)
provide('startAddPointMode', activateAddPointMode)
provide('getStatus', getStatus);

// Computed property for self coordinates based on config
const userCoords = computed(() => ({
  lat: config.value?.lat ?? 0,
  lng: config.value?.lon ?? 0
}))

// Lifecycles
onMounted(async () => {
  initializeMap('map')
  if (map.value) {
    map.value.on('click', handleMapClick)
    map.value.on('mousemove', handleMouseMove)
    registerDrawEventListeners()
  } else {
    console.error("Map initialization failed or is asynchronous.");
  }
  connectWebSocket();
  await loadInitialData();
})

onUnmounted(() => {
  if (map.value) {
    map.value.off('click', handleMapClick)
    map.value.off('mousemove', handleMouseMove)
    removeDrawEventListeners()
    map.value.remove()
    map.value = null;
  }
})

// Event listeners
function setupEventListeners() {
  if (!map.value) {
    console.error("Cannot setup event listeners: Map not available.");
    return;
  }
  map.value.on('click', handleMapClick)
  map.value.on('mousemove', handleMouseMove)

  map.value.on(L.Draw.Event.CREATED, handleDrawCreated);
  map.value.on(L.Draw.Event.EDITED, handleDrawEdited);
  map.value.on(L.Draw.Event.DELETED, handleDrawDeleted);
}

// WebSocket message handler
function handleWebSocketMessage(data) {
  switch (data.category) {
    case 'unit':
    case 'point':
    case 'drawing':
    case 'emergency':
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
    default:
      if (data.type?.startsWith('a-') || data.type?.startsWith('b-')) {
        handleUnitUpdate(data);
      } else {
        console.warn("Received WebSocket message with unknown category/type:", data);
      }
  }
}

// Unit handling
function handleUnitUpdate(itemData) {
  if (config.value && itemData.uid === config.value.uid) {
    console.warn("Ignoring self item update via WebSocket, handled separately by configUpdated/fetchConfig.");
    store.processItems([itemData], true);
    return;
  }

  const results = store.processItems([itemData], true)

  results.added.forEach(item => updateMarkerForUnit(item))
  results.updated.forEach(item => updateMarkerForUnit(item))
  results.removed.forEach(item => removeMarkerForUnit(item))

  updateCounts()
}

function handleAlarmUpdate(alarm) {
  console.log("Received alarm:", alarm);
  const existingIndex = alarmsList.value.findIndex(a => a.uid === alarm.uid);
  if (existingIndex > -1) {
    alarmsList.value.splice(existingIndex, 1, alarm);
  } else {
    alarmsList.value.push(alarm);
  }

  alarmsCount.value = alarmsList.value.length;

  showNotification(alarm);
}

function handleSensorUpdate(sensor) {
  fetchInitialSensorsCount();
}

function handleFeedUpdate(feed) {
  console.log("Received feed:", feed);
  const existingIndex = feedsList.value.findIndex(f => f.uid === feed.uid);
  if (existingIndex > -1) {
    feedsList.value.splice(existingIndex, 1, feed);
  } else {
    feedsList.value.push(feed);
  }
  feedsCount.value = feedsList.value.length;
}

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

async function sendMessage(toUid, text) {
  if (!config.value || !config.value.uid) {
    console.error("Cannot send message: User config/UID not loaded.");
    return false;
  }
  if (!toUid || !text || text.trim() === '') {
    console.error("Cannot send message: Invalid recipient or empty text.");
    return false;
  }

  const messagePayload = {
    type: 'message',
    message_id: generateUUID(),
    from_uid: config.value.uid,
    to_uid: toUid,
    text: text.trim(),
    time: new Date().toISOString(),
  };

  const success = sendWsMessage(messagePayload);
  if (success) {
    console.log("Message sent via WebSocket composable:", messagePayload);
  }
  return success;
}

async function handleMapClick(e) {
  if (currentToolMode.value && currentToolMode.value !== 'addPoint') {
    console.log("Map click ignored, drawing tool active:", currentToolMode.value);
    return;
  }

  const { lat, lng } = e.latlng;

  if (currentToolMode.value === 'addPoint') {
    console.log("Map click in Add Point mode");
    const newPointItem = new Item({
      category: 'point',
      callsign: 'New Point',
      lat,
      lon: lng,
      type: 'b-m-p-s-m',
      affiliation: 'f',
      sidc: 'SFGPE---------A',
      time: new Date().toISOString(),
      send: true
    });
    console.log("Opening edit modal for new Point Item:", newPointItem);
    openEditUnitModal(newPointItem);
    cancelDrawingToolMode();
  } else {
    console.log("Default map click: Creating new unit placeholder Item.");
    const newUnitItem = new Item({
      category: 'unit',
      callsign: 'New Unit',
      lat,
      lon: lng,
      team: config.value?.team || '',
      role: config.value?.role || '',
      affiliation: 'f',
      sidc: 'SFGPU----------',
      type: 'a-h-G-U-C-F',
      speed: 0,
      hae: 0,
      parent_uid: config.value?.uid || '',
      parent_callsign: config.value?.callsign || '',
      time: new Date().toISOString(),
      send: true
    });
    console.log("Opening edit modal for new Unit Item:", newUnitItem);
    openEditUnitModal(newUnitItem);
  }
}

function handleMouseMove(e) {
  const { lat, lng } = e.latlng
  coords.value = { lat, lng }
}

function getUnitName(unit) {
  return unit?.callsign || unit?.uid || 'Unknown';
}

function updateCounts() {
  contactsCount.value = contactList.value.length;
  unitsCount.value = unitList.value.length;
  pointsCount.value = pointList.value.length;
}

function showNotification(message) {
  // Implement notification system
}

function openMessagesModal(unit) {
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

function openEditDrawingModal(drawingItem) {
  if (!(drawingItem instanceof Item)) {
    console.error("openEditDrawingModal expects an Item instance.");
    drawingItem = new Item(drawingItem || {});
  }
  selectedDrawing.value = drawingItem
  showEditDrawingModal.value = true
}

function closeEditDrawingModal() {
  showEditDrawingModal.value = false
  selectedDrawing.value = null
}

function openEditUnitModal(unitItem) {
  if (!(unitItem instanceof Item)) {
    console.error("openEditUnitModal expects an Item instance. Received:", unitItem);
    unitItem = new Item(unitItem || {});
    console.warn("Attempted conversion to Item instance.");
  }
  console.log("Opening Edit Unit Modal for Item:", unitItem);
  unitToEdit.value = unitItem;
  showEditUnitModal.value = true;
}

function closeEditUnitModal() {
  showEditUnitModal.value = false;
  unitToEdit.value = null;
}

async function saveUnitEdit(editedUnitData) {
  console.log("Saving edited unit data from modal:", editedUnitData);

  if (!unitToEdit.value || !(unitToEdit.value instanceof Item)) {
    console.error("Cannot save unit edit: Original Item instance (unitToEdit) is missing or invalid.");
    closeEditUnitModal();
    return;
  }

  const finalUnitItem = new Item({
    ...unitToEdit.value,
    ...editedUnitData,
    uid: unitToEdit.value.uid,
    time: new Date().toISOString(),
    send: true
  });

  console.log("Final Item instance being saved:", finalUnitItem);

  const results = store.processItems([finalUnitItem], true);
  console.log("Store update results:", results);

  try {
    const response = await createUnit(finalUnitItem);
    console.log("Backend save/update response:", response);

    updateMarkerForUnit(finalUnitItem);

  } catch (error) {
    console.error("Error saving unit edit Item to backend:", error);
  }

  closeEditUnitModal();
}

async function saveDrawing(drawingData) {
  console.log("App.vue: Saving drawing data from modal:", drawingData);

  if (!selectedDrawing.value || !(selectedDrawing.value instanceof Item)) {
    console.error("Cannot save drawing: Original drawing Item is missing.");
    closeEditDrawingModal();
    return;
  }

  const finalDrawingItem = new Item({
    ...selectedDrawing.value,
    ...drawingData,
    uid: selectedDrawing.value.uid,
    time: new Date().toISOString(),
    category: 'drawing'
  });

  console.log("Final drawing Item being saved:", finalDrawingItem);

  const results = store.processItems([finalDrawingItem], true);
  console.log("Store update results for drawing:", results);

  try {
    const response = await createUnit(finalDrawingItem);
    console.log("Backend save/update response for drawing:", response);

    const layer = findLayerByUnitUid(finalDrawingItem.uid);
    if (layer) {
      if (layer.setStyle && finalDrawingItem.color) {
        layer.setStyle({ color: finalDrawingItem.color });
      }
    }

  } catch (error) {
    console.error("Error saving drawing Item to backend:", error);
  }

  closeEditDrawingModal();
}

function findLayerByUnitUid(uid) {
  let foundLayer = null;
  const drawingLayerGroup = overlays.value.drawing?.layerGroup;
  if (drawingLayerGroup) {
    drawingLayerGroup.eachLayer(layer => {
      if (layer.unit_uid === uid) {
        foundLayer = layer;
        return false;
      }
    });
  }
  return foundLayer;
}

async function locateByGps() {
  console.log("Attempting to locate user...");
  try {
    await fetchUserPosition(); // Use the new API service function
    if (map.value && config.value?.lat != null && config.value?.lon != null) {
      const zoomLevel = map.value.getZoom() < 10 ? 10 : map.value.getZoom();
      map.value.flyTo([config.value.lat, config.value.lon], zoomLevel);
    } else {
      console.warn("Cannot fly to user position: Map not ready or config position missing.");
    }
  } catch (error) {
    console.error('Error getting user position via API:', error);
  }
}

function setCurrentUnitUid(uid, panTo = false) {
  const item = store.state.items.get(uid);
  if (item instanceof Item) {
    currentUnit.value = item;
    console.log("Current item set:", item);
    lockedUnitUid.value = uid;

    if (panTo && map.value && item.lat != null && item.lon != null && (item.lat !== 0 || item.lon !== 0)) {
      const zoomLevel = map.value.getZoom() < 15 ? 15 : map.value.getZoom();
      map.value.flyTo([item.lat, item.lon], zoomLevel);
    }
  } else {
    console.warn("setCurrentUnitUid: Item not found in store for UID:", uid);
    currentUnit.value = null;
    lockedUnitUid.value = null;
  }
}

function logout() {
  proxy.$router.push('/login')
}

function toggleOverlay(category, isActive) {
  console.log(`Toggling overlay: ${category}, Active: ${isActive}`);
  const overlay = overlays.value[category];
  if (overlay && overlay.layerGroup && map.value) {
    overlay.active = isActive;
    if (isActive) {
      map.value.addLayer(overlay.layerGroup);
    } else {
      map.value.removeLayer(overlay.layerGroup);
    }
  } else {
    console.warn(`Overlay category not found, layer group not initialized, or map not ready: ${category}`);
  }
}

async function deleteCurrentUnit() {
  if (!currentUnit.value || !(currentUnit.value instanceof Item)) {
    console.warn("deleteCurrentUnit called but no current Item selected.");
    return;
  }
  const itemToDelete = currentUnit.value;
  console.log("Attempting to delete item:", itemToDelete.uid);
  const itemUidToDelete = itemToDelete.uid;

  currentUnit.value = null;
  lockedUnitUid.value = null;

  try {
    await deleteUnit(itemUidToDelete);
    console.log("Backend delete request sent for item:", itemUidToDelete);
  } catch (error) {
    console.error("Error deleting item from backend:", error);
  }
}

async function checkEmergency(emergencyData) {
  console.log("Sending emergency check with data:", emergencyData);

  if (!config.value || !config.value.uid) {
    console.error("Cannot send emergency: User config or UID is missing.");
    return;
  }

  const emergencyItem = new Item({
    category: 'emergency',
    type: "b-a-o-tbl",
    lat: config.value.lat || 0,
    lon: config.value.lon || 0,
    parent_uid: config.value.uid,
    parent_callsign: config.value.callsign,
    time: new Date().toISOString(),
    text: `Emergency Switches: 1: ${emergencyData.switch1 || false}, 2: ${emergencyData.switch2 || false}`,
    callsign: `${config.value.callsign}-EMERGENCY`,
    sidc: 'SFGPA----------',
    send: true
  });

  console.log("Sending emergency Item:", emergencyItem);

  try {
    await createUnit(emergencyItem);
    console.log("Emergency Item sent to backend.");
  } catch (error) {
    console.error("Error sending emergency Item:", error);
  }
}

async function configUpdated(newConfig) {
  console.log("Configuration updated from Sidebar/GPS:", newConfig);

  if (!config.value || !newConfig) {
    console.error("Config update failed: Old or new config is missing.");
    return;
  }

  config.value.lat = newConfig.lat ?? config.value.lat;
  config.value.lon = newConfig.lon ?? config.value.lon;
  config.value.callsign = newConfig.callsign ?? config.value.callsign;
  config.value.team = newConfig.team ?? config.value.team;
  config.value.role = newConfig.role ?? config.value.role;

  updateSelfMarkerPopup(config.value);

  if (config.value.lat != null && config.value.lon != null) {
    updateSelfMarkerPosition(config.value.lat, config.value.lon);
  }

  if (config.value.uid) {
    const selfUpdatePayload = {
      uid: config.value.uid,
      callsign: config.value.callsign,
      team: config.value.team,
      role: config.value.role,
      lat: config.value.lat,
      lon: config.value.lon,
      timestamp: new Date().toISOString(),
    };
    try {
      await createUnit(selfUpdatePayload);
      console.log("Sent self-update to backend based on config change.");
    } catch (error) {
      console.error("Error sending self-update to backend:", error);
    }
  } else {
    console.warn("Cannot send self-update to backend: Config UID missing.");
  }
}

function activateDistanceMeasure() {
  startMeasureTool();
}

function activateAddPointMode() {
  startPointTool();
}

function openSensorsModal() {
  showSensorsModal.value = true;
}

function closeSensorsModal() {
  showSensorsModal.value = false;
}

function handleSensorsUpdated() {
  fetchInitialSensorsCount();
}

async function fetchConfig() {
  try {
    config.value = await fetchConfigApi();
    console.log("Config loaded:", config.value);

    if (config.value && config.value.uid) {
      if (config.value.lat != null && config.value.lon != null) {
        console.log(`Updating self marker position to: ${config.value.lat}, ${config.value.lon}`);
        updateSelfMarkerPosition(config.value.lat, config.value.lon);
      } else {
        console.warn("Config loaded, but self position (lat/lon) is missing.");
      }
      updateSelfMarkerPopup(config.value);
    } else {
      console.warn("Self marker cannot be updated: Config UID not available after fetching config.");
    }

    await fetchInitialSensorsCount();
  } catch (error) {
    console.error("Error fetching config:", error);
  }
}

async function fetchInitialSensorsCount() {
  try {
    const sensors = await fetchSensors();
    sensorsCount.value = sensors?.length || 0;
  } catch (error) {
    console.error("Error fetching initial sensors count:", error);
    sensorsCount.value = 0;
  }
}

async function fetchInitialUnits() {
  console.log("Fetching initial units/items...");
  try {
    const itemsData = await fetchUnits();
    console.log(`Fetched ${itemsData?.length || 0} initial items.`);
    if (itemsData && itemsData.length > 0) {
      const results = store.processItems(itemsData, false);

      results.added.forEach(item => updateMarkerForUnit(item));
      results.updated.forEach(item => updateMarkerForUnit(item));
      results.removed.forEach(item => removeMarkerForUnit(item));

      console.log(`Processed initial items via marker manager: Added/Updated ${results.added.length + results.updated.length}, Removed ${results.removed.length}`);

      updateCounts();
    } else {
      console.log("No initial items found or received.");
    }
  } catch (error) {
    console.error("Error fetching initial items:", error);
  }
}

async function fetchInitialFeeds() {
  console.log("Fetching initial feeds...");
  try {
    const feeds = await fetchFeeds();
    console.log(`Fetched ${feeds?.length || 0} initial feeds.`);
    feedsList.value = feeds || [];
    feedsCount.value = feedsList.value.length;
  } catch (error) {
    console.error("Error fetching initial feeds:", error);
    feedsList.value = [];
    feedsCount.value = 0;
  }
}

function getStatus(unitUid) {
  const item = store.state.items.get(unitUid);
  if (item instanceof Item && item.status === 'online') {
    return 'Online';
  }
  return 'Offline';
}

defineExpose({
  currentUnit,
  overlays,
  connectionStatus,
  alarmsCount,
  sensorsCount,
  feedsCount,
  contactsCount,
  unitsCount,
  pointsCount,
  openMessagesModal,
  openFeedsModal,
  openAlarmsModal,
  openEditDrawingModal,
  openEditUnitModal,
  toggleOverlay,
  deleteCurrentUnit,
  checkEmergency,
  configUpdated,
  openSensorsModal,
  sendMessage,
  activateDistanceMeasure,
  activateAddPointMode
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

.leaflet-control-custom i {
  vertical-align: middle;
}
</style>