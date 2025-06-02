<template>
  <div class="navigation-compass" :style="compassStyle">
    <div class="compass-container">
      <!-- Compass Background -->
      <div class="compass-background">
        <svg :width="size" :height="size" viewBox="0 0 200 200" class="compass-svg">
          <!-- Outer ring -->
          <circle
            cx="100"
            cy="100"
            r="95"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            opacity="0.3"
          />

          <!-- Inner ring -->
          <circle
            cx="100"
            cy="100"
            r="80"
            fill="none"
            stroke="currentColor"
            stroke-width="1"
            opacity="0.2"
          />

          <!-- Cardinal directions -->
          <g class="cardinal-directions">
            <!-- North -->
            <text x="100" y="15" text-anchor="middle" class="cardinal-text" font-weight="bold">
              N
            </text>
            <!-- East -->
            <text x="185" y="105" text-anchor="middle" class="cardinal-text">E</text>
            <!-- South -->
            <text x="100" y="195" text-anchor="middle" class="cardinal-text">S</text>
            <!-- West -->
            <text x="15" y="105" text-anchor="middle" class="cardinal-text">W</text>
          </g>

          <!-- Degree markings -->
          <g class="degree-markings">
            <g v-for="degree in degreeMarks" :key="degree">
              <line
                :x1="100 + 85 * Math.sin((degree * Math.PI) / 180)"
                :y1="100 - 85 * Math.cos((degree * Math.PI) / 180)"
                :x2="100 + (degree % 30 === 0 ? 75 : 80) * Math.sin((degree * Math.PI) / 180)"
                :y2="100 - (degree % 30 === 0 ? 75 : 80) * Math.cos((degree * Math.PI) / 180)"
                stroke="currentColor"
                :stroke-width="degree % 30 === 0 ? 2 : 1"
                :opacity="degree % 30 === 0 ? 0.6 : 0.3"
              />
              <text
                v-if="
                  degree % 30 === 0 &&
                  degree !== 0 &&
                  degree !== 90 &&
                  degree !== 180 &&
                  degree !== 270
                "
                :x="100 + 70 * Math.sin((degree * Math.PI) / 180)"
                :y="100 - 70 * Math.cos((degree * Math.PI) / 180)"
                text-anchor="middle"
                dominant-baseline="middle"
                class="degree-text"
              >
                {{ degree }}
              </text>
            </g>
          </g>

          <!-- Bearing arrow -->
          <g
            class="bearing-arrow"
            :transform="`rotate(${bearing} 100 100)`"
            v-if="bearing !== null"
          >
            <path
              d="M 100 25 L 110 45 L 100 40 L 90 45 Z"
              :fill="arrowColor"
              stroke="white"
              stroke-width="1"
            />
            <line
              x1="100"
              y1="45"
              x2="100"
              y2="75"
              :stroke="arrowColor"
              stroke-width="3"
              stroke-linecap="round"
            />
          </g>

          <!-- Center dot -->
          <circle cx="100" cy="100" r="3" fill="currentColor" />
        </svg>
      </div>

      <!-- Bearing display -->
      <div class="bearing-display">
        <div class="bearing-value">
          {{ bearingDisplay }}
        </div>
        <div class="bearing-label">
          {{ bearingLabel }}
        </div>
      </div>
    </div>

    <!-- Distance display (if provided) -->
    <div v-if="distance !== null" class="distance-display">
      <v-chip :color="distanceColor" size="small" variant="tonal">
        <v-icon start size="small">mdi-map-marker-distance</v-icon>
        {{ formatDistance(distance) }}
      </v-chip>
    </div>

    <!-- Target info (if provided) -->
    <div v-if="targetName" class="target-info">
      <v-chip color="primary" size="small" variant="outlined">
        <v-icon start size="small">mdi-target</v-icon>
        {{ targetName }}
      </v-chip>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

// Props
interface Props {
  bearing: number | null
  distance?: number | null
  targetName?: string
  size?: number
  showCardinals?: boolean
  showDegrees?: boolean
  arrowColor?: string
  animated?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  distance: null,
  targetName: '',
  size: 120,
  showCardinals: true,
  showDegrees: true,
  arrowColor: '#f44336',
  animated: true,
})

// Computed
const compassStyle = computed(() => ({
  width: `${props.size}px`,
  height: `${props.size}px`,
}))

const bearingDisplay = computed(() => {
  if (props.bearing === null) return '--'
  return `${Math.round(props.bearing)}°`
})

const bearingLabel = computed(() => {
  if (props.bearing === null) return 'N/A'
  return getCardinalDirection(props.bearing)
})

const distanceColor = computed(() => {
  if (props.distance === null) return 'grey'
  if (props.distance < 100) return 'success'
  if (props.distance < 1000) return 'warning'
  return 'error'
})

const degreeMarks = computed(() => {
  const marks = []
  for (let i = 0; i < 360; i += 10) {
    marks.push(i)
  }
  return marks
})

// Methods
const getCardinalDirection = (bearing: number): string => {
  const directions = [
    'N',
    'NNE',
    'NE',
    'ENE',
    'E',
    'ESE',
    'SE',
    'SSE',
    'S',
    'SSW',
    'SW',
    'WSW',
    'W',
    'WNW',
    'NW',
    'NNW',
  ]

  const index = Math.round(bearing / 22.5) % 16
  return directions[index]
}

const formatDistance = (distance: number): string => {
  if (distance < 1000) {
    return `${Math.round(distance)}m`
  } else if (distance < 10000) {
    return `${(distance / 1000).toFixed(1)}km`
  } else {
    return `${Math.round(distance / 1000)}km`
  }
}
</script>

<style scoped>
.navigation-compass {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.compass-container {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.compass-background {
  position: relative;
}

.compass-svg {
  display: block;
}

.cardinal-text {
  font-size: 14px;
  font-weight: bold;
  fill: currentColor;
}

.degree-text {
  font-size: 10px;
  fill: currentColor;
  opacity: 0.7;
}

.bearing-arrow {
  transition: transform 0.3s ease;
}

.bearing-display {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  background: rgba(var(--v-theme-surface), 0.9);
  border-radius: 8px;
  padding: 4px 8px;
  backdrop-filter: blur(4px);
}

.bearing-value {
  font-size: 14px;
  font-weight: bold;
  line-height: 1;
}

.bearing-label {
  font-size: 10px;
  opacity: 0.7;
  line-height: 1;
}

.distance-display,
.target-info {
  display: flex;
  justify-content: center;
}

/* Dark theme adjustments */
:deep(.v-theme--dark) .compass-svg {
  color: rgba(255, 255, 255, 0.87);
}

:deep(.v-theme--light) .compass-svg {
  color: rgba(0, 0, 0, 0.87);
}

/* Animation for bearing changes */
.bearing-arrow {
  transform-origin: 100px 100px;
}

@media (prefers-reduced-motion: no-preference) {
  .bearing-arrow {
    transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  }
}

/* Responsive adjustments */
@media (max-width: 600px) {
  .cardinal-text {
    font-size: 12px;
  }

  .degree-text {
    font-size: 8px;
  }

  .bearing-value {
    font-size: 12px;
  }

  .bearing-label {
    font-size: 9px;
  }
}
</style>
