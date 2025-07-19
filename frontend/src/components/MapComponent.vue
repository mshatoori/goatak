<template>
  <div class="map-container">
    <div id="map" class="map"></div>

    <!-- Map controls overlay -->
    <div class="map-controls">
      <v-card class="pa-2 ma-2" elevation="2">
        <v-btn-toggle v-model="currentMode" mandatory>
          <v-btn value="map" size="small">
            <v-icon>mdi-cursor-default</v-icon>
          </v-btn>
          <v-btn value="add_point" size="small">
            <v-icon>mdi-map-marker-plus</v-icon>
          </v-btn>
          <v-btn value="add_unit" size="small">
            <v-icon>mdi-account-plus</v-icon>
          </v-btn>
          <v-btn value="add_casevac" size="small">
            <v-icon>mdi-medical-bag</v-icon>
          </v-btn>
        </v-btn-toggle>
      </v-card>

      <!-- Connection status -->
      <v-card class="pa-2 ma-2" elevation="2">
        <v-chip :color="connectionStatusColor" size="small" :prepend-icon="connectionStatusIcon">
          {{ connectionStatusText }}
        </v-chip>
      </v-card>
    </div>

    <!-- Coordinates display -->
    <div class="coordinates-display" v-if="mouseCoords">
      <v-card class="pa-2" elevation="2">
        <small>{{ formatCoordinates(mouseCoords) }}</small>
      </v-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import { useMapStore } from '@/stores/mapStore'
import { useUnitsStore } from '@/stores/unitsStore'
import { useCasevacStore } from '@/stores/casevacStore'
import { useWebSocket } from '@/composables/useWebSocket'
import type { MapItem, MapMode, NavigationLineToggleEvent } from '@/types'

// Import Leaflet and Leaflet Draw as ES6 modules
import L from 'leaflet'
import 'leaflet-draw'

// Import Leaflet CSS (will be handled by Vite)
import 'leaflet/dist/leaflet.css'
import 'leaflet-draw/dist/leaflet.draw.css'

// Fix Leaflet default markers when using ES6 modules
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png'
import iconUrl from 'leaflet/dist/images/marker-icon.png'
import shadowUrl from 'leaflet/dist/images/marker-shadow.png'

// Configure default icon
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl,
  iconUrl,
  shadowUrl,
})

// Props
interface Props {
  sidebarCollapsed?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  sidebarCollapsed: false,
})

// Emits
const emit = defineEmits<{
  'update:sidebarCollapsed': [value: boolean]
  'item-selected': [item: MapItem | null]
  'navigation-line-toggle': [event: NavigationLineToggleEvent]
}>()

// Stores
const mapStore = useMapStore()
const unitsStore = useUnitsStore()
const casevacStore = useCasevacStore()
const webSocket = useWebSocket()

// Reactive state
const mouseCoords = ref<any>(null)
const currentMode = computed({
  get: () => mapStore.mode,
  set: (value: MapMode) => mapStore.setMode(value),
})

// Connection status
const connectionStatusColor = computed(() => {
  switch (webSocket.connectionStatus.value) {
    case 'connected':
      return 'success'
    case 'connecting':
      return 'warning'
    default:
      return 'error'
  }
})

const connectionStatusIcon = computed(() => {
  switch (webSocket.connectionStatus.value) {
    case 'connected':
      return 'mdi-wifi'
    case 'connecting':
      return 'mdi-wifi-sync'
    default:
      return 'mdi-wifi-off'
  }
})

const connectionStatusText = computed(() => {
  switch (webSocket.connectionStatus.value) {
    case 'connected':
      return 'متصل'
    case 'connecting':
      return 'در حال اتصال'
    default:
      return 'قطع شده'
  }
})

// Map initialization
onMounted(async () => {
  await initializeMap()
  await webSocket.initialize()
})

onUnmounted(() => {
  if (mapStore.map) {
    mapStore.map.remove()
  }
})

const initializeMap = async () => {
  console.log('Initializing map with imported Leaflet:', L)
  
  // Create map using imported Leaflet
  const map = L.map('map', {
    attributionControl: false,
    zoomControl: true,
  })

  mapStore.setMap(map)

  // Set initial view
  map.setView([35.7219, 51.3347], 11) // Tehran coordinates

  // Create overlays
  const overlays = {
    contact: L.layerGroup(),
    unit: L.layerGroup(),
    alarm: L.layerGroup(),
    point: L.layerGroup(),
    drawing: L.layerGroup(),
    route: L.layerGroup(),
    report: L.layerGroup(),
    navigation: L.layerGroup(),
  }

  // Add overlays to map
  Object.values(overlays).forEach(overlay => {
    overlay.addTo(map)
  })

  mapStore.setOverlays(overlays)

  // Create feature groups for drawings
  const drawnItems = new L.FeatureGroup()
  const routeItems = new L.FeatureGroup()

  overlays.drawing.addLayer(drawnItems)
  overlays.route.addLayer(routeItems)

  mapStore.setDrawnItems(drawnItems)
  mapStore.setRouteItems(routeItems)

  // Initialize drawing controls
  if (L.Control && L.Control.Draw) {
    const drawControl = new L.Control.Draw({
      edit: {
        featureGroup: drawnItems,
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
    })

    map.addControl(drawControl)
    mapStore.setDrawControl(drawControl)
  }

  // Add scale control
  L.control
    .scale({
      position: 'bottomright',
      metric: true,
    })
    .addTo(map)

  // Set up event listeners
  setupMapEvents(map)

  console.log('Map initialized')
}

const setupMapEvents = (map: any) => {
  // Mouse move for coordinates
  map.on('mousemove', (e: any) => {
    mouseCoords.value = e.latlng
    mapStore.setCoords(e.latlng)
  })

  // Map click handling
  map.on('click', handleMapClick)

  // Drawing events
  if (L.Draw) {
    map.on(L.Draw.Event.DRAWSTART, () => {
      mapStore.setInDrawMode(true)
    })

    map.on(L.Draw.Event.DRAWSTOP, () => {
      mapStore.setInDrawMode(false)
    })

    map.on(L.Draw.Event.CREATED, handleDrawCreated)
  }
}

const handleMapClick = (e: any) => {
  if (mapStore.inDrawMode) {
    return
  }

  const mode = mapStore.mode
  const config = mapStore.config

  switch (mode) {
    case 'add_point':
      createPoint(e.latlng.lat, e.latlng.lng)
      mapStore.setMode('map')
      break
    case 'add_unit':
      createUnit(e.latlng.lat, e.latlng.lng)
      mapStore.setMode('map')
      break
    case 'add_casevac':
      createCasevac(e.latlng.lat, e.latlng.lng)
      mapStore.setMode('map')
      break
  }
}

const handleDrawCreated = (event: any) => {
  const layer = event.layer
  const config = mapStore.config

  if (event.layerType === 'polygon') {
    const item = createDrawingItem(layer, 'drawing', config)
    saveNewItem(item)
  } else if (event.layerType === 'polyline') {
    const item = createDrawingItem(layer, 'route', config)
    saveNewItem(item)
  }
}

const createPoint = (lat: number, lon: number) => {
  const config = mapStore.config
  const pointNumber = unitsStore.nextItemNumber('point')

  const point: MapItem = {
    uid: `point-${pointNumber}-${Date.now()}`,
    category: 'point',
    callsign: `point-${pointNumber}`,
    type: 'b-m-p-s-m',
    lat,
    lon,
    hae: 0,
    speed: 0,
    course: 0,
    local: true,
    send: true,
    isNew: true,
    start_time: new Date().toISOString(),
    last_seen: new Date().toISOString(),
    stale_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  }

  if (config) {
    point.parent_uid = config.uid
    point.parent_callsign = config.callsign
  }

  saveNewItem(point)
}

const createUnit = (lat: number, lon: number) => {
  const config = mapStore.config
  const unitNumber = unitsStore.nextItemNumber('unit')

  const unit: MapItem = {
    uid: `unit-${unitNumber}-${Date.now()}`,
    category: 'unit',
    callsign: `unit-${unitNumber}`,
    type: 'a-h-G',
    sidc: unitsStore.sidcFromType('a-h-G'),
    lat,
    lon,
    hae: 0,
    speed: 0,
    course: 0,
    local: true,
    send: true,
    isNew: true,
    start_time: new Date().toISOString(),
    last_seen: new Date().toISOString(),
    stale_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  }

  if (config) {
    unit.parent_uid = config.uid
    unit.parent_callsign = config.callsign
  }

  saveNewItem(unit)
}

const createCasevac = (lat: number, lon: number) => {
  const config = mapStore.config
  const casevac = casevacStore.createCasevacItem(lat, lon, config?.uid, config?.callsign)

  saveNewItem(casevac)
}

const createDrawingItem = (layer: any, category: 'drawing' | 'route', config: any): MapItem => {
  const number = unitsStore.nextItemNumber(category)
  const type = category === 'drawing' ? 'u-d-f' : 'b-m-r'

  const item: MapItem = {
    uid: `${category}-${number}-${Date.now()}`,
    category,
    callsign: `${category}-${number}`,
    type,
    lat: 0,
    lon: 0,
    local: true,
    send: true,
    isNew: true,
    color: 'white',
    links: [],
    start_time: new Date().toISOString(),
    last_seen: new Date().toISOString(),
    stale_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  }

  if (config) {
    item.parent_uid = config.uid
    item.parent_callsign = config.callsign
  }

  // Extract coordinates from layer
  let latSum = 0
  let lngSum = 0
  let coordCount = 0

  if (category === 'drawing' && layer.editing?.latlngs?.[0]?.[0]) {
    layer.editing.latlngs[0][0].forEach((latlng: any) => {
      latSum += latlng.lat
      lngSum += latlng.lng
      coordCount++
      item.links!.push(`${latlng.lat},${latlng.lng}`)
    })
  } else if (category === 'route' && layer.editing?.latlngs?.[0]) {
    layer.editing.latlngs[0].forEach((latlng: any) => {
      latSum += latlng.lat
      lngSum += latlng.lng
      coordCount++
      item.links!.push(`${latlng.lat},${latlng.lng}`)
    })
  }

  if (coordCount > 0) {
    item.lat = latSum / coordCount
    item.lon = lngSum / coordCount
  }

  return item
}

const saveNewItem = async (item: MapItem) => {
  try {
    unitsStore.addItem(item)
    mapStore.setActiveItemUid(item.uid)
    emit('item-selected', item)

    // Save to server
    await webSocket.saveItem(item)
  } catch (error) {
    console.error('Failed to save item:', error)
    unitsStore.removeItem(item.uid)
  }
}

const formatCoordinates = (coords: any) => {
  if (!coords) return ''
  return `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`
}

// Handle navigation line toggle events
const handleNavigationLineToggle = (event: NavigationLineToggleEvent) => {
  emit('navigation-line-toggle', event)
}

// Watch for sidebar collapse changes
watch(
  () => props.sidebarCollapsed,
  collapsed => {
    // Trigger map resize when sidebar toggles
    setTimeout(() => {
      if (mapStore.map) {
        mapStore.map.invalidateSize()
      }
    }, 300)
  }
)
</script>

<style scoped>
.map-container {
  position: relative;
  height: 100%;
  width: 100%;
}

.map {
  height: 100%;
  width: 100%;
}

.map-controls {
  position: absolute;
  top: 10px;
  left: 10px;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.coordinates-display {
  position: absolute;
  bottom: 10px;
  left: 10px;
  z-index: 1000;
}

:deep(.leaflet-control-container) {
  font-family: inherit;
}

:deep(.leaflet-popup-content-wrapper) {
  font-family: inherit;
  direction: rtl;
}

:deep(.leaflet-tooltip) {
  font-family: inherit;
  direction: rtl;
}
</style>
