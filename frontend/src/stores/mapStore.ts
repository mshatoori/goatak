import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { MapItem, Config, MapOverlays, MapMode, NavigationData } from '@/types'

export const useMapStore = defineStore('map', () => {
  // State
  const map = ref<any>(null) // L.Map
  const config = ref<Config | null>(null)
  const overlays = ref<any>(null) // MapOverlays
  const drawnItems = ref<any>(null) // L.FeatureGroup
  const routeItems = ref<any>(null) // L.FeatureGroup
  const drawControl = ref<any>(null) // L.Control.Draw from leaflet-draw plugin

  // Map interaction state
  const mode = ref<MapMode>('map')
  const inDrawMode = ref(false)
  const coords = ref<any>(null) // L.LatLng
  const activeItemUid = ref<string | null>(null)
  const lockedUnitUid = ref<string>('')

  // Navigation state
  const navigationLine = ref<any>(null) // L.Polyline
  const navigationLineActive = ref(false)
  const navigationTarget = ref<MapItem | null>(null)

  // Map tools
  const tools = ref<Map<string, any>>(new Map()) // Map<string, L.Marker>

  // User position markers
  const me = ref<any>(null) // L.Marker
  const myInfoMarker = ref<any>(null) // L.Marker

  // Getters
  const isMapReady = computed(() => map.value !== null)
  const hasActiveItem = computed(() => activeItemUid.value !== null)
  const currentMode = computed(() => mode.value)
  const isNavigationActive = computed(() => navigationLineActive.value)

  // Actions
  const setMap = (mapInstance: any) => {
    map.value = mapInstance
  }

  const setConfig = (configData: Config) => {
    config.value = configData
  }

  const setOverlays = (overlayData: any) => {
    overlays.value = overlayData
  }

  const setDrawnItems = (items: any) => {
    drawnItems.value = items
  }

  const setRouteItems = (items: any) => {
    routeItems.value = items
  }

  const setDrawControl = (control: any) => {
    drawControl.value = control
  }

  const setMode = (newMode: MapMode) => {
    mode.value = newMode
  }

  const setInDrawMode = (drawing: boolean) => {
    inDrawMode.value = drawing
  }

  const setCoords = (coordinates: any) => {
    coords.value = coordinates
  }

  const setActiveItemUid = (uid: string | null) => {
    activeItemUid.value = uid
  }

  const setLockedUnitUid = (uid: string) => {
    lockedUnitUid.value = uid
  }

  const setMe = (marker: any) => {
    me.value = marker
  }

  const setMyInfoMarker = (marker: any) => {
    myInfoMarker.value = marker
  }

  // Navigation methods
  const showNavigationLine = (
    targetItem: MapItem,
    userPosition: Config,
    navigationData: NavigationData
  ) => {
    hideNavigationLine()

    if (!targetItem || !userPosition || !navigationData || !overlays.value) {
      console.warn('Missing data for navigation line:', {
        targetItem,
        userPosition,
        navigationData,
      })
      return
    }

    // Use window.L to access global Leaflet
    const L = (window as any).L
    if (!L) {
      console.error('Leaflet not available')
      return
    }

    const userLatLng: [number, number] = [userPosition.lat, userPosition.lon]
    const targetLatLng: [number, number] = [
      navigationData.targetPosition.lat,
      navigationData.targetPosition.lng,
    ]

    navigationLine.value = L.polyline([userLatLng, targetLatLng], {
      color: '#007bff',
      weight: 2,
      opacity: 0.6,
      dashArray: '5, 10',
      className: 'navigation-line',
    })

    if (overlays.value.navigation && navigationLine.value) {
      overlays.value.navigation.addLayer(navigationLine.value)
    }
    navigationLineActive.value = true
    navigationTarget.value = targetItem

    console.log('Navigation line created for:', targetItem.callsign || targetItem.uid)
  }

  const hideNavigationLine = () => {
    if (navigationLine.value && overlays.value?.navigation) {
      overlays.value.navigation.removeLayer(navigationLine.value)
      navigationLine.value = null
    }

    navigationLineActive.value = false
    navigationTarget.value = null
    console.log('Navigation line hidden')
  }

  const updateNavigationLine = () => {
    if (navigationLineActive.value && navigationTarget.value && config.value) {
      let targetCoords = null

      if (navigationTarget.value.lat !== undefined && navigationTarget.value.lon !== undefined) {
        targetCoords = {
          lat: navigationTarget.value.lat,
          lng: navigationTarget.value.lon,
        }
      }

      if (targetCoords && navigationLine.value) {
        const userLatLng: [number, number] = [config.value.lat, config.value.lon]
        const targetLatLng: [number, number] = [targetCoords.lat, targetCoords.lng]

        navigationLine.value.setLatLngs([userLatLng, targetLatLng])
      }
    }
  }

  // Tool management
  const addTool = (name: string, marker: any) => {
    tools.value.set(name, marker)
  }

  const removeTool = (name: string) => {
    if (tools.value.has(name) && map.value) {
      const marker = tools.value.get(name)!
      map.value.removeLayer(marker)
      marker.remove()
      tools.value.delete(name)
    }
  }

  const getTool = (name: string) => {
    return tools.value.get(name)
  }

  // Map view methods
  const setView = (lat: number, lon: number, zoom?: number) => {
    if (map.value) {
      map.value.setView([lat, lon], zoom)
    }
  }

  const panTo = (lat: number, lon: number) => {
    if (map.value) {
      map.value.panTo([lat, lon])
    }
  }

  // Overlay management
  const getItemOverlay = (item: MapItem): any => {
    return overlays.value ? overlays.value[item.category] : null
  }

  const toggleOverlay = (overlayName: string, overlayActive: boolean) => {
    if (!overlays.value || !map.value) return

    console.log('toggleOverlay', overlayName, overlayActive)
    if (!overlayActive) {
      overlays.value[overlayName]?.removeFrom(map.value)
    } else {
      overlays.value[overlayName]?.addTo(map.value)
    }
  }

  return {
    // State
    map,
    config,
    overlays,
    drawnItems,
    routeItems,
    drawControl,
    mode,
    inDrawMode,
    coords,
    activeItemUid,
    lockedUnitUid,
    navigationLine,
    navigationLineActive,
    navigationTarget,
    tools,
    me,
    myInfoMarker,

    // Getters
    isMapReady,
    hasActiveItem,
    currentMode,
    isNavigationActive,

    // Actions
    setMap,
    setConfig,
    setOverlays,
    setDrawnItems,
    setRouteItems,
    setDrawControl,
    setMode,
    setInDrawMode,
    setCoords,
    setActiveItemUid,
    setLockedUnitUid,
    setMe,
    setMyInfoMarker,

    // Navigation
    showNavigationLine,
    hideNavigationLine,
    updateNavigationLine,

    // Tools
    addTool,
    removeTool,
    getTool,

    // Map view
    setView,
    panTo,

    // Overlays
    getItemOverlay,
    toggleOverlay,
  }
})
