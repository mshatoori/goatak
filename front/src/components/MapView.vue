<template>
  <div ref="mapRef" class="map-container"></div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useMap } from '../composables/useMap'

const mapRef = ref<HTMLDivElement | null>(null)
const { map, userMarker, fetchUserPos } = useMap(mapRef)

onMounted(async () => {
  console.log('MapView onMounted, mapRef:', mapRef.value)
  await fetchUserPos()
})
</script>

<style scoped>
.map-container {
  height: 100%;
  width: 100%;
}
</style>