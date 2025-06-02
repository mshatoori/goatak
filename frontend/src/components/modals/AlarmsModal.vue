<template>
  <v-dialog v-model="dialog" max-width="900px" persistent scrollable>
    <v-card>
      <v-card-title class="d-flex justify-space-between align-center">
        <span class="text-h5">هشدارها</span>
        <v-btn icon="mdi-close" variant="text" @click="closeDialog"></v-btn>
      </v-card-title>

      <v-divider></v-divider>

      <v-card-text class="pa-0">
        <v-container fluid>
          <!-- Alarm Statistics -->
          <div class="mb-4">
            <v-row>
              <v-col cols="12" md="3">
                <v-card variant="tonal" color="error">
                  <v-card-text class="text-center">
                    <v-icon size="32" class="mb-2">mdi-alert-circle</v-icon>
                    <div class="text-h6">{{ criticalAlarms.length }}</div>
                    <div class="text-caption">هشدارهای بحرانی</div>
                  </v-card-text>
                </v-card>
              </v-col>
              <v-col cols="12" md="3">
                <v-card variant="tonal" color="warning">
                  <v-card-text class="text-center">
                    <v-icon size="32" class="mb-2">mdi-alert</v-icon>
                    <div class="text-h6">{{ warningAlarms.length }}</div>
                    <div class="text-caption">هشدارهای عادی</div>
                  </v-card-text>
                </v-card>
              </v-col>
              <v-col cols="12" md="3">
                <v-card variant="tonal" color="info">
                  <v-card-text class="text-center">
                    <v-icon size="32" class="mb-2">mdi-information</v-icon>
                    <div class="text-h6">{{ infoAlarms.length }}</div>
                    <div class="text-caption">اطلاعات</div>
                  </v-card-text>
                </v-card>
              </v-col>
              <v-col cols="12" md="3">
                <v-card variant="tonal" color="success">
                  <v-card-text class="text-center">
                    <v-icon size="32" class="mb-2">mdi-check-circle</v-icon>
                    <div class="text-h6">{{ totalAlarms }}</div>
                    <div class="text-caption">کل هشدارها</div>
                  </v-card-text>
                </v-card>
              </v-col>
            </v-row>
          </div>

          <!-- Filter Controls -->
          <div class="mb-4">
            <v-row>
              <v-col cols="12" md="6">
                <v-select
                  v-model="selectedAlarmType"
                  :items="alarmTypeOptions"
                  label="نوع هشدار"
                  variant="outlined"
                  density="compact"
                  clearable
                ></v-select>
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="searchQuery"
                  label="جستجو در هشدارها"
                  variant="outlined"
                  density="compact"
                  prepend-inner-icon="mdi-magnify"
                  clearable
                ></v-text-field>
              </v-col>
            </v-row>
          </div>

          <v-divider class="my-4"></v-divider>

          <!-- Alarms List -->
          <div>
            <h6 class="text-h6 mb-3">فهرست هشدارها</h6>

            <v-list v-if="filteredAlarms.length > 0" density="compact">
              <v-list-item
                v-for="(alarm, index) in filteredAlarms"
                :key="alarm.uid"
                class="mb-2 alarm-item"
                :class="getAlarmSeverityClass(alarm.type)"
                @click="focusOnAlarm(alarm)"
              >
                <template v-slot:prepend>
                  <v-avatar :color="getAlarmColor(alarm.type)" size="40">
                    <v-icon color="white">
                      {{ getAlarmIcon(alarm.type) }}
                    </v-icon>
                  </v-avatar>
                </template>

                <v-list-item-title class="d-flex justify-space-between align-center">
                  <span>{{ alarm.callsign }}</span>
                  <v-chip :color="getAlarmColor(alarm.type)" size="small">
                    {{ getReadableType(alarm.type) }}
                  </v-chip>
                </v-list-item-title>

                <v-list-item-subtitle>
                  <div class="d-flex flex-column">
                    <div class="mb-1">
                      <v-icon size="small" class="me-1">mdi-clock</v-icon>
                      {{ formatDateTime(alarm.start_time || '') }}
                    </div>
                    <div class="mb-1">
                      <v-icon size="small" class="me-1">mdi-map-marker</v-icon>
                      موقعیت: {{ formatCoordinates(alarm.lat, alarm.lon) }}
                    </div>
                    <div v-if="alarm.text" class="text-body-2">
                      {{ alarm.text }}
                    </div>
                  </div>
                </v-list-item-subtitle>

                <template v-slot:append>
                  <div class="d-flex flex-column align-end">
                    <v-btn
                      icon="mdi-crosshairs-gps"
                      size="small"
                      color="primary"
                      variant="tonal"
                      @click.stop="focusOnAlarm(alarm)"
                      class="mb-2"
                    ></v-btn>
                    <v-btn
                      icon="mdi-volume-off"
                      size="small"
                      color="warning"
                      variant="tonal"
                      @click.stop="silenceAlarm(alarm)"
                      :disabled="(alarm as any).silenced"
                    ></v-btn>
                  </div>
                </template>
              </v-list-item>
            </v-list>

            <v-alert v-else type="info" variant="tonal" class="mb-4">
              {{
                searchQuery || selectedAlarmType
                  ? 'هیچ هشداری با این فیلتر یافت نشد'
                  : 'هیچ هشداری وجود ندارد'
              }}
            </v-alert>
          </div>
        </v-container>
      </v-card-text>

      <v-divider></v-divider>

      <v-card-actions class="pa-4">
        <v-btn
          variant="outlined"
          color="warning"
          @click="silenceAllAlarms"
          :disabled="!hasActiveAlarms"
        >
          <v-icon start>mdi-volume-off</v-icon>
          خاموش کردن همه
        </v-btn>
        <v-spacer></v-spacer>
        <v-btn variant="outlined" @click="closeDialog"> بستن </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useMapStore } from '@/stores/mapStore'
import type { MapItem } from '@/types'

// Props
interface Props {
  modelValue: boolean
  alarms?: MapItem[]
}

const props = withDefaults(defineProps<Props>(), {
  alarms: () => [],
})

// Emits
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'alarm-focused': [alarm: MapItem]
  'alarm-silenced': [alarm: MapItem]
  'all-alarms-silenced': []
}>()

// Stores
const mapStore = useMapStore()

// Local state
const searchQuery = ref('')
const selectedAlarmType = ref<string | null>(null)

// Computed
const dialog = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value),
})

const filteredAlarms = computed(() => {
  let filtered = props.alarms

  // Filter by type
  if (selectedAlarmType.value) {
    filtered = filtered.filter(alarm => alarm.type === selectedAlarmType.value)
  }

  // Filter by search query
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(
      alarm =>
        alarm.callsign.toLowerCase().includes(query) ||
        alarm.text?.toLowerCase().includes(query) ||
        getReadableType(alarm.type).toLowerCase().includes(query)
    )
  }

  // Sort by time (newest first)
  return filtered.sort((a, b) => {
    const timeA = new Date(a.start_time || 0).getTime()
    const timeB = new Date(b.start_time || 0).getTime()
    return timeB - timeA
  })
})

const criticalAlarms = computed(() =>
  props.alarms.filter(alarm => ['b-a-o-pan', 'b-a-o-opn'].includes(alarm.type))
)

const warningAlarms = computed(() => props.alarms.filter(alarm => alarm.type === 'b-a-o-tbl'))

const infoAlarms = computed(() => props.alarms.filter(alarm => alarm.type === 'b-a-g'))

const totalAlarms = computed(() => props.alarms.length)

const hasActiveAlarms = computed(() => props.alarms.some(alarm => !(alarm as any).silenced))

const alarmTypeOptions = computed(() => [
  { title: 'ورود به ژئوفنس', value: 'b-a-g' },
  { title: 'هشدار', value: 'b-a-o-tbl' },
  { title: 'مواجهه با دشمن', value: 'b-a-o-opn' },
  { title: 'تلفات', value: 'b-a-o-pan' },
])

// Methods
const getReadableType = (alarmType: string): string => {
  const types: Record<string, string> = {
    'b-a-g': 'ورود به ژئوفنس',
    'b-a-o-tbl': 'هشدار',
    'b-a-o-opn': 'مواجهه با دشمن',
    'b-a-o-pan': 'تلفات',
  }
  return types[alarmType] || 'نامشخص'
}

const getAlarmColor = (alarmType: string): string => {
  const colors: Record<string, string> = {
    'b-a-g': 'info',
    'b-a-o-tbl': 'warning',
    'b-a-o-opn': 'error',
    'b-a-o-pan': 'error',
  }
  return colors[alarmType] || 'grey'
}

const getAlarmIcon = (alarmType: string): string => {
  const icons: Record<string, string> = {
    'b-a-g': 'mdi-shield-alert',
    'b-a-o-tbl': 'mdi-alert',
    'b-a-o-opn': 'mdi-account-alert',
    'b-a-o-pan': 'mdi-medical-bag',
  }
  return icons[alarmType] || 'mdi-alert-circle'
}

const getAlarmSeverityClass = (alarmType: string): string => {
  if (['b-a-o-pan', 'b-a-o-opn'].includes(alarmType)) {
    return 'alarm-critical'
  } else if (alarmType === 'b-a-o-tbl') {
    return 'alarm-warning'
  }
  return 'alarm-info'
}

const formatDateTime = (dateString: string): string => {
  if (!dateString) return 'نامشخص'

  const date = new Date(dateString)
  return new Intl.DateTimeFormat('fa-IR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

const formatCoordinates = (lat: number, lon: number): string => {
  return `${lat.toFixed(6)}, ${lon.toFixed(6)}`
}

const focusOnAlarm = (alarm: MapItem) => {
  if (alarm.lat && alarm.lon) {
    mapStore.setView(alarm.lat, alarm.lon, 12)
    emit('alarm-focused', alarm)
    closeDialog()
  }
}

const silenceAlarm = (alarm: MapItem) => {
  emit('alarm-silenced', alarm)
}

const silenceAllAlarms = () => {
  emit('all-alarms-silenced')
}

const closeDialog = () => {
  searchQuery.value = ''
  selectedAlarmType.value = null
  emit('update:modelValue', false)
}

// Watch for dialog changes to reset filters
watch(dialog, newValue => {
  if (newValue) {
    searchQuery.value = ''
    selectedAlarmType.value = null
  }
})
</script>

<style scoped>
.alarm-item {
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.alarm-item:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.alarm-critical {
  border-left: 4px solid rgb(var(--v-theme-error));
}

.alarm-warning {
  border-left: 4px solid rgb(var(--v-theme-warning));
}

.alarm-info {
  border-left: 4px solid rgb(var(--v-theme-info));
}

:deep(.v-list-item-subtitle) {
  opacity: 1;
}
</style>
