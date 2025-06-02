<template>
  <div v-if="targetItem && userPosition" class="navigation-info">
    <v-divider class="mb-3"></v-divider>

    <div class="d-flex justify-space-between align-center mb-2">
      <h6 class="text-h6">اطلاعات ناوبری</h6>
      <v-btn
        :color="showNavigationLine ? 'primary' : 'default'"
        :variant="showNavigationLine ? 'flat' : 'outlined'"
        size="small"
        @click="toggleNavigationLine"
      >
        <v-icon size="16" class="me-1">
          {{ showNavigationLine ? 'mdi-map-marker-path' : 'mdi-map-marker-path' }}
        </v-icon>
        {{ showNavigationLine ? 'مخفی کردن خط' : 'نمایش خط' }}
      </v-btn>
    </div>

    <v-card variant="outlined" class="pa-3">
      <v-row dense>
        <v-col cols="6">
          <div class="text-center">
            <div class="text-h5 text-primary font-weight-bold">
              {{ navigationData.distance.toFixed(2) }}
            </div>
            <div class="text-caption text-medium-emphasis">کیلومتر</div>
          </div>
        </v-col>

        <v-col cols="6">
          <div class="text-center">
            <div class="text-h5 text-success font-weight-bold">
              {{ navigationData.bearing.toFixed(0) }}°
            </div>
            <div class="text-caption text-medium-emphasis">جهت</div>
          </div>
        </v-col>
      </v-row>

      <v-divider class="my-3"></v-divider>

      <v-row dense>
        <v-col cols="12">
          <div class="d-flex justify-space-between align-center">
            <span class="text-caption text-medium-emphasis">مختصات مقصد:</span>
            <span class="text-caption font-weight-bold">
              {{ formatCoordinates(targetItem.lat, targetItem.lon) }}
            </span>
          </div>
        </v-col>

        <v-col cols="12">
          <div class="d-flex justify-space-between align-center">
            <span class="text-caption text-medium-emphasis">مختصات شما:</span>
            <span class="text-caption font-weight-bold">
              {{ formatCoordinates(userPosition.lat, userPosition.lon) }}
            </span>
          </div>
        </v-col>
      </v-row>

      <!-- Compass direction -->
      <div class="text-center mt-3">
        <div class="compass-container">
          <v-icon
            size="48"
            color="primary"
            :style="{ transform: `rotate(${navigationData.bearing}deg)` }"
          >
            mdi-navigation
          </v-icon>
        </div>
        <div class="text-caption mt-1">{{ getCompassDirection(navigationData.bearing) }}</div>
      </div>

      <!-- Additional info -->
      <v-row dense class="mt-3">
        <v-col cols="6">
          <div class="text-center">
            <div class="text-body-2 font-weight-bold">
              {{ getEstimatedTime(navigationData.distance, 5) }}
            </div>
            <div class="text-caption text-medium-emphasis">زمان تخمینی (5 کیلومتر/ساعت)</div>
          </div>
        </v-col>

        <v-col cols="6">
          <div class="text-center">
            <div class="text-body-2 font-weight-bold">
              {{ getEstimatedTime(navigationData.distance, 50) }}
            </div>
            <div class="text-caption text-medium-emphasis">زمان تخمینی (50 کیلومتر/ساعت)</div>
          </div>
        </v-col>
      </v-row>
    </v-card>

    <!-- Quick actions -->
    <div class="d-flex justify-space-between mt-3">
      <v-btn variant="outlined" size="small" @click="copyCoordinates">
        <v-icon size="16" class="me-1">mdi-content-copy</v-icon>
        کپی مختصات
      </v-btn>

      <v-btn variant="outlined" size="small" @click="centerOnTarget">
        <v-icon size="16" class="me-1">mdi-crosshairs-gps</v-icon>
        مرکز نقشه
      </v-btn>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { MapItem, Config, NavigationData, NavigationLineToggleEvent } from '@/types'

// Props
interface Props {
  targetItem: MapItem
  userPosition: Config | null
}

const props = defineProps<Props>()

// Emits
const emit = defineEmits<{
  'navigation-line-toggle': [event: NavigationLineToggleEvent]
}>()

// Local state
const showNavigationLine = ref(false)

// Computed
const navigationData = computed((): NavigationData => {
  if (!props.targetItem || !props.userPosition) {
    return {
      distance: 0,
      bearing: 0,
      targetPosition: { lat: 0, lng: 0 },
    }
  }

  const distance = calculateDistance(
    props.userPosition.lat,
    props.userPosition.lon,
    props.targetItem.lat,
    props.targetItem.lon
  )

  const bearing = calculateBearing(
    props.userPosition.lat,
    props.userPosition.lon,
    props.targetItem.lat,
    props.targetItem.lon
  )

  return {
    distance,
    bearing,
    targetPosition: {
      lat: props.targetItem.lat,
      lng: props.targetItem.lon,
    },
  }
})

// Watch for changes in navigation data to update line
watch(
  [() => props.userPosition, () => props.targetItem],
  () => {
    if (showNavigationLine.value) {
      emitNavigationLineToggle(true)
    }
  },
  { deep: true }
)

// Methods
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371 // Earth's radius in kilometers
  const dLat = toRadians(lat2 - lat1)
  const dLon = toRadians(lon2 - lon1)

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

const calculateBearing = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const dLon = toRadians(lon2 - lon1)
  const lat1Rad = toRadians(lat1)
  const lat2Rad = toRadians(lat2)

  const y = Math.sin(dLon) * Math.cos(lat2Rad)
  const x =
    Math.cos(lat1Rad) * Math.sin(lat2Rad) - Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon)

  const bearing = Math.atan2(y, x)
  return (toDegrees(bearing) + 360) % 360
}

const toRadians = (degrees: number): number => {
  return degrees * (Math.PI / 180)
}

const toDegrees = (radians: number): number => {
  return radians * (180 / Math.PI)
}

const formatCoordinates = (lat: number, lon: number): string => {
  return `${lat.toFixed(6)}, ${lon.toFixed(6)}`
}

const getCompassDirection = (bearing: number): string => {
  const directions = [
    'شمال',
    'شمال شرقی',
    'شرق',
    'جنوب شرقی',
    'جنوب',
    'جنوب غربی',
    'غرب',
    'شمال غربی',
  ]

  const index = Math.round(bearing / 45) % 8
  return directions[index]
}

const getEstimatedTime = (distance: number, speed: number): string => {
  const timeInHours = distance / speed

  if (timeInHours < 1) {
    const minutes = Math.round(timeInHours * 60)
    return `${minutes} دقیقه`
  } else if (timeInHours < 24) {
    const hours = Math.floor(timeInHours)
    const minutes = Math.round((timeInHours - hours) * 60)
    return minutes > 0 ? `${hours}:${minutes.toString().padStart(2, '0')} ساعت` : `${hours} ساعت`
  } else {
    const days = Math.floor(timeInHours / 24)
    const hours = Math.floor(timeInHours % 24)
    return `${days} روز ${hours} ساعت`
  }
}

const toggleNavigationLine = () => {
  showNavigationLine.value = !showNavigationLine.value
  emitNavigationLineToggle(showNavigationLine.value)
}

const emitNavigationLineToggle = (show: boolean) => {
  const event: NavigationLineToggleEvent = {
    show,
    targetItem: props.targetItem,
    userPosition: props.userPosition || undefined,
    navigationData: navigationData.value,
  }

  emit('navigation-line-toggle', event)
}

const copyCoordinates = async () => {
  const coords = formatCoordinates(props.targetItem.lat, props.targetItem.lon)

  try {
    await navigator.clipboard.writeText(coords)
    // Could show a toast notification here
    console.log('Coordinates copied to clipboard:', coords)
  } catch (error) {
    console.error('Failed to copy coordinates:', error)
    // Fallback for older browsers
    const textArea = document.createElement('textarea')
    textArea.value = coords
    document.body.appendChild(textArea)
    textArea.select()
    document.execCommand('copy')
    document.body.removeChild(textArea)
  }
}

const centerOnTarget = () => {
  // This would emit an event to center the map on the target
  // For now, we'll just log it
  console.log('Center map on target:', props.targetItem.callsign)
}
</script>

<style scoped>
.navigation-info {
  margin-top: 16px;
}

.compass-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 60px;
}

.compass-container .v-icon {
  transition: transform 0.3s ease;
}

:deep(.v-card) {
  border-radius: 8px;
}

.text-h5 {
  line-height: 1.2;
}

.text-caption {
  line-height: 1.2;
}
</style>
