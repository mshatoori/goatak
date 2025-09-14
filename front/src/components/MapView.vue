<template>
  <div ref="mapRef" class="map-container"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useMap } from '../composables/useMap'
import { useItemsStore } from '../stores/itemsStore'
import { useUiStore } from '../stores/uiStore'
import type { Item } from '../types/item'
import L from 'leaflet'
import { getIconForType } from '../utils/sidc'
import type { Map as LeafletMap, LayerGroup, Icon } from 'leaflet'

const props = defineProps<{
  mode: 'none' | 'unit' | 'point'
  selectedItem: Item | null
}>()

const emit = defineEmits<{
  'update:selected-item': [item: Item | null]
}>()

const mapRef = ref<HTMLDivElement | null>(null)
const store = useItemsStore()
const uiStore = useUiStore()

const selectedItem = ref<Item | null>(null)

watch(() => props.selectedItem, (v) => {
  selectedItem.value = v
})

watch(selectedItem, (v) => {
  emit('update:selected-item', v)
})

const { map, fetchUserPos, unitsLayer, pointsLayer, drawingLayer, toggleUnits, togglePoints, toggleDrawings } = useMap(mapRef)

const markers = ref<Map<string, L.Marker>>(new Map())

onMounted(async () => {
  await fetchUserPos()
  addItemsToMap()
  map.value?.on('click', onMapClick)
})

const onMapClick = (e: any) => {
  if (props.mode === 'none') return
  const pos = e.latlng
  const newItem: Item = {
    uid: '',
    type: props.mode,
    callsign: '',
    lat: pos.lat,
    lng: pos.lng
  }
  selectedItem.value = newItem
}

const addItemsToMap = () => {
  if (!map.value) return
  markers.value.forEach(marker => {
    marker.removeFrom(map.value!)
  })
  markers.value.clear()

  store.items.forEach(item => {
    const iconName = getIconForType(item.type)
    const icon = L.icon({
      iconUrl: `/icons/${iconName}.png`,
      iconSize: [32, 32],
      iconAnchor: [16, 32]
    }) as Icon
    let layer: LayerGroup
    if (item.type === 'unit') {
      layer = unitsLayer
    } else if (item.type === 'point') {
      layer = pointsLayer
    } else if (item.type === 'drawing') {
      layer = drawingLayer
    } else {
      layer = pointsLayer // default
    }
    const marker = L.marker([item.lat, item.lng], { icon, draggable: true }).addTo(layer)
    marker.bindPopup(item.callsign)
    marker.on('dragend', (e) => {
      const latLng = e.target.getLatLng()
      store.updateItem(item.uid, { lat: latLng.lat, lng: latLng.lng })
    })
    marker.on('click', () => {
      selectedItem.value = item
    })
    markers.value.set(item.uid, marker)
  })
}

watch(() => store.items, () => {
  addItemsToMap()
}, { deep: true })

watch(() => store.layers.units.visible, (visible) => {
  toggleUnits(visible)
})

watch(() => store.layers.points.visible, (visible) => {
  togglePoints(visible)
})

watch(() => store.layers.drawings.visible, (visible) => {
  toggleDrawings(visible)
})
</script>

<style scoped>
.map-container {
  height: 100%;
  width: 100%;
}
</style>