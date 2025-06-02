<template>
  <div class="map-container">
    <div id="map" ref="mapContainer" class="map"></div>
    
    <!-- Map Controls -->
    <div class="map-controls">
      <v-card class="pa-2 mb-2">
        <v-btn-toggle
          v-model="selectedTool"
          mandatory
          variant="outlined"
          density="compact"
        >
          <v-btn value="pan" icon="mdi-cursor-default"></v-btn>
          <v-btn value="marker" icon="mdi-map-marker"></v-btn>
          <v-btn value="line" icon="mdi-vector-line"></v-btn>
          <v-btn value="polygon" icon="mdi-vector-polygon"></v-btn>
        </v-btn-toggle>
      </v-card>
      
      <v-card class="pa-2">
        <v-btn
          icon="mdi-crosshairs-gps"
          @click="centerOnLocation"
          :loading="locating"
        ></v-btn>
      </v-card>
    </div>
    
    <!-- Sidebar -->
    <v-navigation-drawer
      v-model="drawer"
      app
      temporary
      width="400"
      location="right"
    >
      <v-list>
        <v-list-item>
          <v-list-item-title class="text-h6">
            منوی اصلی
          </v-list-item-title>
        </v-list-item>
        
        <v-divider></v-divider>
        
        <v-list-item
          v-for="item in menuItems"
          :key="item.title"
          :to="item.route"
          :prepend-icon="item.icon"
        >
          <v-list-item-title>{{ item.title }}</v-list-item-title>
        </v-list-item>
      </v-list>
    </v-navigation-drawer>
    
    <!-- Floating Action Button -->
    <v-btn
      class="fab"
      icon="mdi-menu"
      color="primary"
      size="large"
      @click="drawer = !drawer"
    ></v-btn>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import L from 'leaflet'
import 'leaflet-draw'

// Fix for default markers in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

const mapContainer = ref<HTMLElement>()
const drawer = ref(false)
const selectedTool = ref('pan')
const locating = ref(false)

let map: L.Map | null = null
let drawControl: L.Control.Draw | null = null

const menuItems = [
  { title: 'نقشه', icon: 'mdi-map', route: '/map' },
  { title: 'واحدها', icon: 'mdi-account-group', route: '/units' },
  { title: 'تخلیه پزشکی', icon: 'mdi-medical-bag', route: '/casevac' },
  { title: 'نقشه‌کشی', icon: 'mdi-draw', route: '/drawings' },
  { title: 'نقاط', icon: 'mdi-map-marker-multiple', route: '/points' },
  { title: 'تنظیمات', icon: 'mdi-cog', route: '/settings' },
]

const initMap = () => {
  if (!mapContainer.value) return

  // Initialize map
  map = L.map(mapContainer.value, {
    center: [35.6892, 51.3890], // Tehran coordinates
    zoom: 10,
    zoomControl: false
  })

  // Add tile layer
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(map)

  // Add zoom control to bottom right
  L.control.zoom({
    position: 'bottomleft'
  }).addTo(map)

  // Initialize drawing controls
  const drawnItems = new L.FeatureGroup()
  map.addLayer(drawnItems)

  drawControl = new L.Control.Draw({
    position: 'topleft',
    draw: {
      polygon: true,
      polyline: true,
      rectangle: true,
      circle: true,
      marker: true,
      circlemarker: false
    },
    edit: {
      featureGroup: drawnItems,
      remove: true
    }
  })

  map.addControl(drawControl)

  // Handle drawing events
  map.on(L.Draw.Event.CREATED, (event: any) => {
    const layer = event.layer
    drawnItems.addLayer(layer)
  })
}

const centerOnLocation = () => {
  if (!map) return
  
  locating.value = true
  
  map.locate({
    setView: true,
    maxZoom: 16,
    timeout: 10000
  })
  
  map.on('locationfound', () => {
    locating.value = false
  })
  
  map.on('locationerror', () => {
    locating.value = false
    // Handle location error
  })
}

onMounted(() => {
  initMap()
})

onUnmounted(() => {
  if (map) {
    map.remove()
    map = null
  }
})
</script>

<style scoped>
.map-container {
  position: relative;
  height: 100vh;
  width: 100%;
}

.map {
  height: 100%;
  width: 100%;
}

.map-controls {
  position: absolute;
  top: 20px;
  left: 20px;
  z-index: 1000;
}

.fab {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 1000;
}

/* RTL adjustments */
[dir="rtl"] .map-controls {
  left: auto;
  right: 20px;
}

[dir="rtl"] .fab {
  right: auto;
  left: 20px;
}
</style>