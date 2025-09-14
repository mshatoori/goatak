import { ref, type Ref, onMounted, onUnmounted } from 'vue'
import L, { LatLng, Map, Marker, type LayerGroup } from 'leaflet'
import 'leaflet/dist/leaflet.css'

interface UserPos {
  lat: number
  lng: number
}

export function useMap(mapRef: Ref<HTMLDivElement | null>) {
  const map = ref<Map | null>(null)
  const userMarker = ref<Marker | null>(null)
  const unitsLayer = ref<LayerGroup>(L.layerGroup())
  const pointsLayer = ref<LayerGroup>(L.layerGroup())
  const drawingLayer = ref<LayerGroup>(L.layerGroup())

  onMounted(() => {
    if (mapRef.value) {
      console.log('Initializing map on ref:', mapRef.value)
      map.value = L.map(mapRef.value).setView([35.6892, 51.3890], 6)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map.value!)

      // Iran bounds
      const southWest = L.latLng(25, 44) as LatLng
      const northEast = L.latLng(40, 64) as LatLng
      const bounds = L.latLngBounds(southWest, northEast)
      map.value!.setMaxBounds(bounds)
      map.value!.fitBounds(bounds)

      // Scale control
      L.control.scale().addTo(map.value!)

      // User marker icon
      const selfIcon = L.icon({
        iconUrl: '/icons/self.png',
        iconSize: [32, 32],
        iconAnchor: [16, 32]
      })

      // Initial user marker
      userMarker.value = L.marker([35.6892, 51.3890], { icon: selfIcon, draggable: true }).addTo(map.value!)
      userMarker.value.on('dragend', (e) => {
        console.log('User position updated:', e.target.getLatLng())
      })

      // Click handler
      map.value!.on('click', (e) => {
        console.log('Clicked at:', e.latlng)
      })

      // Mouse move coord display
      const coordDisplay = L.control({ position: 'bottomright' })
      coordDisplay.onAdd = (mapInstance: Map) => {
        const div = L.DomUtil.create('div', 'leaflet-control-latlng') as HTMLDivElement
        div.style.background = 'white'
        div.style.padding = '5px'
        mapInstance.on('mousemove', (e) => {
          div.innerHTML = `Lat: ${e.latlng.lat.toFixed(4)} Lng: ${e.latlng.lng.toFixed(4)}`
        })
        return div
      }
      coordDisplay.addTo(map.value!)
  
      unitsLayer.value.addTo(map.value!)
      pointsLayer.value.addTo(map.value!)
      drawingLayer.value.addTo(map.value!)
  
      console.log('Map initialized:', map.value)
    } else {
      console.error('mapRef is null in onMounted')
    }
  })

  onUnmounted(() => {
    if (map.value) {
      map.value.remove()
      console.log('Map removed on unmount')
    }
  })

  const fetchUserPos = async (): Promise<void> => {
    try {
      const response = await fetch('/api/pos')
      if (!response.ok) throw new Error('Failed to fetch')
      const pos: UserPos = await response.json()
      if (pos.lat && pos.lng && map.value && userMarker.value) {
        const latLng = L.latLng(pos.lat, pos.lng)
        map.value.setView(latLng, 15)
        userMarker.value.setLatLng(latLng)
        console.log('User position updated from API:', pos)
      }
    } catch (error) {
      console.error('Failed to fetch user position:', error)
    }
  }

  const toggleUnits = (show: boolean) => {
    if (!map.value) return
    if (show) {
      map.value.addLayer(unitsLayer.value)
    } else {
      map.value.removeLayer(unitsLayer.value)
    }
  }
  
  const togglePoints = (show: boolean) => {
    if (!map.value) return
    if (show) {
      map.value.addLayer(pointsLayer.value)
    } else {
      map.value.removeLayer(pointsLayer.value)
    }
  }

  const toggleDrawings = (show: boolean) => {
    if (!map.value) return
    if (show) {
      map.value.addLayer(drawingLayer.value)
    } else {
      map.value.removeLayer(drawingLayer.value)
    }
  }
  
  const toggleLayer = (layerGroup: LayerGroup, visible: boolean) => {
    if (!map.value) return
    if (visible) {
      map.value.addLayer(layerGroup)
    } else {
      map.value.removeLayer(layerGroup)
    }
  }
  
  return { map, userMarker, fetchUserPos, unitsLayer, pointsLayer, drawingLayer, toggleUnits, togglePoints, toggleDrawings, toggleLayer }
}