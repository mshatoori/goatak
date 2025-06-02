<template>
  <div class="coordinate-input">
    <v-row>
      <v-col cols="12" md="6">
        <v-text-field
          v-model="latitudeInput"
          :label="latLabel"
          variant="outlined"
          density="compact"
          :rules="[rules.required, rules.latitude]"
          :error-messages="latError"
          @input="onLatitudeChange"
          @blur="validateAndFormat"
        >
          <template v-slot:prepend-inner>
            <v-icon size="small">mdi-latitude</v-icon>
          </template>
        </v-text-field>
      </v-col>

      <v-col cols="12" md="6">
        <v-text-field
          v-model="longitudeInput"
          :label="lonLabel"
          variant="outlined"
          density="compact"
          :rules="[rules.required, rules.longitude]"
          :error-messages="lonError"
          @input="onLongitudeChange"
          @blur="validateAndFormat"
        >
          <template v-slot:prepend-inner>
            <v-icon size="small">mdi-longitude</v-icon>
          </template>
        </v-text-field>
      </v-col>
    </v-row>

    <!-- Format Selection -->
    <v-row>
      <v-col cols="12">
        <v-btn-toggle
          v-model="selectedFormat"
          mandatory
          variant="outlined"
          divided
          density="compact"
          @update:model-value="onFormatChange"
        >
          <v-btn value="dd" size="small">
            <v-icon start size="small">mdi-decimal</v-icon>
            DD
          </v-btn>
          <v-btn value="ddm" size="small">
            <v-icon start size="small">mdi-format-list-numbered</v-icon>
            DDM
          </v-btn>
          <v-btn value="dms" size="small">
            <v-icon start size="small">mdi-angle-acute</v-icon>
            DMS
          </v-btn>
          <v-btn value="mgrs" size="small">
            <v-icon start size="small">mdi-grid</v-icon>
            MGRS
          </v-btn>
        </v-btn-toggle>
      </v-col>
    </v-row>

    <!-- Current Location Button -->
    <v-row v-if="showCurrentLocation">
      <v-col cols="12">
        <v-btn
          variant="outlined"
          color="primary"
          size="small"
          :loading="gettingLocation"
          @click="getCurrentLocation"
          block
        >
          <v-icon start>mdi-crosshairs-gps</v-icon>
          استفاده از موقعیت فعلی
        </v-btn>
      </v-col>
    </v-row>

    <!-- Coordinate Display -->
    <v-row v-if="isValid">
      <v-col cols="12">
        <v-card variant="tonal" color="success">
          <v-card-text class="pa-3">
            <div class="text-caption text-medium-emphasis mb-1">مختصات تبدیل شده:</div>
            <div class="text-body-2">
              <strong>DD:</strong> {{ formatDecimalDegrees(latitude, longitude) }}
            </div>
            <div class="text-body-2">
              <strong>DDM:</strong> {{ formatDegreesDecimalMinutes(latitude, longitude) }}
            </div>
            <div class="text-body-2">
              <strong>DMS:</strong> {{ formatDegreesMinutesSeconds(latitude, longitude) }}
            </div>
            <div v-if="mgrsCoordinate" class="text-body-2">
              <strong>MGRS:</strong> {{ mgrsCoordinate }}
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'

// Props
interface Props {
  modelValue?: {
    lat: number
    lon: number
  }
  format?: 'dd' | 'ddm' | 'dms' | 'mgrs'
  showCurrentLocation?: boolean
  latLabel?: string
  lonLabel?: string
}

const props = withDefaults(defineProps<Props>(), {
  format: 'dd',
  showCurrentLocation: true,
  latLabel: 'عرض جغرافیایی',
  lonLabel: 'طول جغرافیایی',
})

// Emits
const emit = defineEmits<{
  'update:modelValue': [value: { lat: number; lon: number }]
  'format-changed': [format: string]
  'validation-changed': [isValid: boolean]
}>()

// Local state
const latitudeInput = ref('')
const longitudeInput = ref('')
const selectedFormat = ref(props.format)
const gettingLocation = ref(false)
const latError = ref('')
const lonError = ref('')

// Computed
const latitude = computed(() => parseFloat(latitudeInput.value) || 0)
const longitude = computed(() => parseFloat(longitudeInput.value) || 0)

const isValid = computed(() => {
  return (
    !isNaN(latitude.value) &&
    !isNaN(longitude.value) &&
    latitude.value >= -90 &&
    latitude.value <= 90 &&
    longitude.value >= -180 &&
    longitude.value <= 180 &&
    latitudeInput.value !== '' &&
    longitudeInput.value !== ''
  )
})

const mgrsCoordinate = computed(() => {
  if (!isValid.value) return ''
  try {
    // This would require an MGRS conversion library
    // For now, return a placeholder
    return convertToMGRS(latitude.value, longitude.value)
  } catch {
    return ''
  }
})

// Validation rules
const rules = {
  required: (value: string) => !!value || 'این فیلد الزامی است',
  latitude: (value: string) => {
    if (!value) return true
    const num = parseFloat(value)
    if (isNaN(num)) return 'مقدار معتبر وارد کنید'
    if (num < -90 || num > 90) return 'عرض جغرافیایی باید بین -90 تا 90 باشد'
    return true
  },
  longitude: (value: string) => {
    if (!value) return true
    const num = parseFloat(value)
    if (isNaN(num)) return 'مقدار معتبر وارد کنید'
    if (num < -180 || num > 180) return 'طول جغرافیایی باید بین -180 تا 180 باشد'
    return true
  },
}

// Methods
const formatDecimalDegrees = (lat: number, lon: number): string => {
  return `${lat.toFixed(6)}, ${lon.toFixed(6)}`
}

const formatDegreesDecimalMinutes = (lat: number, lon: number): string => {
  const formatDDM = (coord: number, isLat: boolean) => {
    const abs = Math.abs(coord)
    const degrees = Math.floor(abs)
    const minutes = (abs - degrees) * 60
    const direction = isLat ? (coord >= 0 ? 'N' : 'S') : coord >= 0 ? 'E' : 'W'
    return `${degrees}° ${minutes.toFixed(4)}' ${direction}`
  }

  return `${formatDDM(lat, true)}, ${formatDDM(lon, false)}`
}

const formatDegreesMinutesSeconds = (lat: number, lon: number): string => {
  const formatDMS = (coord: number, isLat: boolean) => {
    const abs = Math.abs(coord)
    const degrees = Math.floor(abs)
    const minutesFloat = (abs - degrees) * 60
    const minutes = Math.floor(minutesFloat)
    const seconds = (minutesFloat - minutes) * 60
    const direction = isLat ? (coord >= 0 ? 'N' : 'S') : coord >= 0 ? 'E' : 'W'
    return `${degrees}° ${minutes}' ${seconds.toFixed(2)}" ${direction}`
  }

  return `${formatDMS(lat, true)}, ${formatDMS(lon, false)}`
}

const convertToMGRS = (lat: number, lon: number): string => {
  // Simplified MGRS conversion - in a real implementation,
  // you would use a proper MGRS library like mgrs or proj4js
  try {
    // This is a placeholder implementation
    const zone = Math.floor((lon + 180) / 6) + 1
    const letter = String.fromCharCode(67 + Math.floor((lat + 80) / 8))
    return `${zone}${letter} XX 00000 00000`
  } catch {
    return ''
  }
}

const parseCoordinateInput = (input: string, isLatitude: boolean): number | null => {
  if (!input) return null

  // Remove extra spaces
  input = input.trim()

  // Try decimal degrees first
  const decimal = parseFloat(input)
  if (!isNaN(decimal)) {
    return decimal
  }

  // Try DMS format: 40° 26' 46" N
  const dmsRegex = /(\d+)°?\s*(\d+)'?\s*(\d+(?:\.\d+)?)"?\s*([NSEW])?/i
  const dmsMatch = input.match(dmsRegex)
  if (dmsMatch) {
    const [, degrees, minutes, seconds, direction] = dmsMatch
    let result = parseInt(degrees) + parseInt(minutes) / 60 + parseFloat(seconds) / 3600

    if (direction && ['S', 'W'].includes(direction.toUpperCase())) {
      result = -result
    }

    return result
  }

  // Try DDM format: 40° 26.767' N
  const ddmRegex = /(\d+)°?\s*(\d+(?:\.\d+)?)'?\s*([NSEW])?/i
  const ddmMatch = input.match(ddmRegex)
  if (ddmMatch) {
    const [, degrees, minutes, direction] = ddmMatch
    let result = parseInt(degrees) + parseFloat(minutes) / 60

    if (direction && ['S', 'W'].includes(direction.toUpperCase())) {
      result = -result
    }

    return result
  }

  return null
}

const onLatitudeChange = () => {
  latError.value = ''
  const parsed = parseCoordinateInput(latitudeInput.value, true)
  if (parsed !== null && isValid.value) {
    emit('update:modelValue', { lat: parsed, lon: longitude.value })
  }
}

const onLongitudeChange = () => {
  lonError.value = ''
  const parsed = parseCoordinateInput(longitudeInput.value, false)
  if (parsed !== null && isValid.value) {
    emit('update:modelValue', { lat: latitude.value, lon: parsed })
  }
}

const onFormatChange = (format: string) => {
  selectedFormat.value = format as any
  emit('format-changed', format)

  // Reformat current values according to new format
  if (isValid.value) {
    formatInputsAccordingToFormat()
  }
}

const formatInputsAccordingToFormat = () => {
  if (!isValid.value) return

  switch (selectedFormat.value) {
    case 'dd':
      latitudeInput.value = latitude.value.toFixed(6)
      longitudeInput.value = longitude.value.toFixed(6)
      break
    case 'ddm':
      // Keep current input for DDM
      break
    case 'dms':
      // Keep current input for DMS
      break
    case 'mgrs':
      // MGRS would need special handling
      break
  }
}

const validateAndFormat = () => {
  if (isValid.value) {
    formatInputsAccordingToFormat()
  }
}

const getCurrentLocation = () => {
  if (!navigator.geolocation) {
    alert('مرورگر شما از تعیین موقعیت پشتیبانی نمی‌کند')
    return
  }

  gettingLocation.value = true

  navigator.geolocation.getCurrentPosition(
    position => {
      const lat = position.coords.latitude
      const lon = position.coords.longitude

      latitudeInput.value = lat.toFixed(6)
      longitudeInput.value = lon.toFixed(6)

      emit('update:modelValue', { lat, lon })
      gettingLocation.value = false
    },
    error => {
      console.error('Error getting location:', error)
      alert('خطا در دریافت موقعیت')
      gettingLocation.value = false
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 60000,
    }
  )
}

// Watch for external value changes
watch(
  () => props.modelValue,
  newValue => {
    if (newValue && (newValue.lat !== latitude.value || newValue.lon !== longitude.value)) {
      latitudeInput.value = newValue.lat.toFixed(6)
      longitudeInput.value = newValue.lon.toFixed(6)
    }
  },
  { immediate: true }
)

// Watch for validation changes
watch(
  isValid,
  newValue => {
    emit('validation-changed', newValue)
  },
  { immediate: true }
)

// Watch for format changes
watch(
  () => props.format,
  newFormat => {
    selectedFormat.value = newFormat
  }
)
</script>

<style scoped>
.coordinate-input {
  width: 100%;
}

:deep(.v-btn-toggle) {
  width: 100%;
}

:deep(.v-btn-toggle .v-btn) {
  flex: 1;
}

:deep(.v-text-field .v-field__prepend-inner) {
  padding-inline-end: 8px;
}
</style>
