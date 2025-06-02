<template>
  <v-card class="unit-details">
    <!-- Header -->
    <v-card-title class="d-flex justify-space-between align-center">
      <div class="d-flex align-center" @click="mapToUnit">
        <v-avatar size="32" class="me-2">
          <img
            v-if="renderedItem.sidc"
            :src="getMilIcon(renderedItem)"
            :alt="renderedItem.callsign"
          />
          <v-icon v-else>mdi-account</v-icon>
        </v-avatar>

        <div>
          <div class="text-h6">{{ getUnitName(renderedItem) }}</div>
          <div v-if="item.status" class="text-caption">{{ item.status }}</div>
        </div>

        <v-btn icon size="small" class="ms-2" @click.stop="toggleLock">
          <v-icon>{{ isLocked ? 'mdi-lock' : 'mdi-lock-open' }}</v-icon>
        </v-btn>
      </div>

      <div v-if="!editing" class="d-flex">
        <v-btn icon size="small" color="primary" @click="startEditing" class="me-1">
          <v-icon>mdi-pencil</v-icon>
        </v-btn>
        <v-btn icon size="small" color="error" @click="deleteItem">
          <v-icon>mdi-delete</v-icon>
        </v-btn>
      </div>
    </v-card-title>

    <v-divider></v-divider>

    <!-- Unit View (non-editing mode) -->
    <v-card-text v-if="!editing">
      <v-row dense>
        <v-col cols="12">
          <v-list density="compact">
            <v-list-item>
              <v-list-item-title class="text-caption text-medium-emphasis">UID</v-list-item-title>
              <v-list-item-subtitle>{{ item.uid }}</v-list-item-subtitle>
            </v-list-item>

            <v-list-item v-if="item.team">
              <v-list-item-title class="text-caption text-medium-emphasis">تیم</v-list-item-title>
              <v-list-item-subtitle>{{ item.team }}</v-list-item-subtitle>
            </v-list-item>

            <v-list-item v-if="item.role">
              <v-list-item-title class="text-caption text-medium-emphasis">نقش</v-list-item-title>
              <v-list-item-subtitle>{{ item.role }}</v-list-item-subtitle>
            </v-list-item>

            <v-list-item>
              <v-list-item-title class="text-caption text-medium-emphasis">نوع</v-list-item-title>
              <v-list-item-subtitle>{{ item.type }}</v-list-item-subtitle>
            </v-list-item>

            <v-list-item>
              <v-list-item-title class="text-caption text-medium-emphasis"
                >مختصات</v-list-item-title
              >
              <v-list-item-subtitle class="d-flex align-center">
                {{ formatCoordinates(item.lat, item.lon) }}
                <v-btn icon size="x-small" color="success" class="ms-2" @click="mapToUnit">
                  <v-icon size="12">mdi-crosshairs-gps</v-icon>
                </v-btn>
                <span v-if="coords" class="text-caption ms-2">
                  ({{ getDistanceAndBearing(item, coords) }} تا نشانگر)
                </span>
              </v-list-item-subtitle>
            </v-list-item>

            <v-list-item>
              <v-list-item-title class="text-caption text-medium-emphasis">سرعت</v-list-item-title>
              <v-list-item-subtitle>{{ formatSpeed(item.speed) }} KM/H</v-list-item-subtitle>
            </v-list-item>

            <v-list-item>
              <v-list-item-title class="text-caption text-medium-emphasis"
                >ارتفاع</v-list-item-title
              >
              <v-list-item-subtitle>{{ (item.hae || 0).toFixed(1) }} متر</v-list-item-subtitle>
            </v-list-item>

            <v-list-item v-if="item.parent_uid">
              <v-list-item-title class="text-caption text-medium-emphasis"
                >سازنده</v-list-item-title
              >
              <v-list-item-subtitle>
                {{ item.parent_uid }}
                <span v-if="item.parent_callsign">({{ item.parent_callsign }})</span>
              </v-list-item-subtitle>
            </v-list-item>

            <v-list-item>
              <v-list-item-title class="text-caption text-medium-emphasis"
                >زمان ایجاد</v-list-item-title
              >
              <v-list-item-subtitle>{{ formatDateTime(item.start_time) }}</v-list-item-subtitle>
            </v-list-item>

            <v-list-item>
              <v-list-item-title class="text-caption text-medium-emphasis"
                >زمان ارسال</v-list-item-title
              >
              <v-list-item-subtitle>{{ formatDateTime(item.send_time) }}</v-list-item-subtitle>
            </v-list-item>

            <v-list-item>
              <v-list-item-title class="text-caption text-medium-emphasis"
                >زمان انقضا</v-list-item-title
              >
              <v-list-item-subtitle>{{ formatDateTime(item.stale_time) }}</v-list-item-subtitle>
            </v-list-item>
          </v-list>
        </v-col>
      </v-row>

      <!-- Sensor data -->
      <div v-if="item.sensor_data && Object.keys(item.sensor_data).length > 0" class="mt-4">
        <v-divider class="mb-3"></v-divider>
        <h6 class="text-h6 mb-2">آخرین داده‌های سنسور</h6>
        <v-table density="compact">
          <tbody>
            <tr v-for="(value, key) in item.sensor_data" :key="key">
              <td class="text-caption font-weight-bold" style="width: 30%">{{ key }}</td>
              <td class="text-caption" :title="value">{{ truncateText(value, 40) }}</td>
            </tr>
          </tbody>
        </v-table>
      </div>

      <!-- Remarks -->
      <div v-if="item.text" class="mt-4">
        <v-divider class="mb-3"></v-divider>
        <h6 class="text-h6 mb-2">توضیحات</h6>
        <p class="text-body-2">{{ item.text }}</p>
      </div>

      <!-- Navigation Info Component -->
      <NavigationInfo
        v-if="!editing"
        :target-item="item"
        :user-position="config"
        @navigation-line-toggle="$emit('navigation-line-toggle', $event)"
      />
    </v-card-text>

    <!-- Unit Edit Form -->
    <v-card-text v-if="editing">
      <v-form ref="editForm" @submit.prevent="saveEditing">
        <v-row dense>
          <v-col cols="12">
            <v-text-field
              v-model="editingData.callsign"
              label="شناسه"
              variant="outlined"
              density="compact"
              :rules="[rules.required]"
            ></v-text-field>
          </v-col>

          <v-col cols="12">
            <v-select
              v-model="editingData.aff"
              label="طرف"
              variant="outlined"
              density="compact"
              :items="affiliationOptions"
              item-title="text"
              item-value="value"
            ></v-select>
          </v-col>

          <v-col cols="12">
            <div class="mb-3">
              <v-label class="text-caption">نوع</v-label>
              <HierarchySelector v-model="editingData.subtype" />
            </div>
          </v-col>

          <v-col cols="12">
            <v-textarea
              v-model="editingData.text"
              label="توضیحات"
              variant="outlined"
              density="compact"
              rows="3"
              auto-grow
            ></v-textarea>
          </v-col>

          <v-col cols="12">
            <v-checkbox v-model="editingData.send" label="ارسال" density="compact"></v-checkbox>
          </v-col>
        </v-row>

        <v-divider class="my-4"></v-divider>

        <div class="d-flex justify-end">
          <v-btn variant="outlined" @click="cancelEditing" class="me-2"> لغو </v-btn>
          <v-btn type="submit" color="primary" :loading="saving"> ذخیره </v-btn>
        </div>
      </v-form>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { useMapStore } from '@/stores/mapStore'
import { useUnitsStore } from '@/stores/unitsStore'
import NavigationInfo from './NavigationInfo.vue'
import HierarchySelector from './HierarchySelector.vue'
import type { MapItem, Config, NavigationLineToggleEvent } from '@/types'

// Props
interface Props {
  item: MapItem
  coords?: any
  config?: Config | null
  lockedUnitUid?: string
}

const props = withDefaults(defineProps<Props>(), {
  coords: null,
  config: null,
  lockedUnitUid: '',
})

// Emits
const emit = defineEmits<{
  save: [item: MapItem]
  delete: [uid: string]
  'navigation-line-toggle': [event: NavigationLineToggleEvent]
}>()

// Stores
const mapStore = useMapStore()
const unitsStore = useUnitsStore()

// Local state
const editing = ref(false)
const editingData = ref<any>(null)
const saving = ref(false)
const editForm = ref()

// Computed
const isLocked = computed(() => props.lockedUnitUid === props.item.uid)

const renderedItem = computed(() => {
  if (editing.value && editingData.value) {
    return {
      ...editingData.value,
      sidc: unitsStore.sidcFromType(`a-${editingData.value.aff}-${editingData.value.subtype}`),
    }
  }
  return props.item
})

// Form rules
const rules = {
  required: (value: any) => !!value || 'این فیلد الزامی است',
}

// Affiliation options
const affiliationOptions = [
  { text: 'دشمن', value: 'h' },
  { text: 'خودی', value: 'f' },
  { text: 'خنثی', value: 'n' },
  { text: 'نامعلوم', value: 'u' },
  { text: 'مشکوک', value: 's' },
]

// Watch for new items
watch(
  () => props.item,
  (newItem, oldItem) => {
    if (newItem && newItem.uid !== oldItem?.uid) {
      if (newItem.isNew) {
        nextTick(() => startEditing())
      }
    }
  },
  { immediate: true }
)

// Methods
const startEditing = () => {
  editingData.value = {
    uid: props.item.uid,
    category: props.item.category,
    callsign: props.item.callsign,
    type: props.item.type,
    aff: props.item.type.substring(2, 3) || 'f',
    subtype: props.item.type.substring(4) || 'G',
    lat: props.item.lat,
    lon: props.item.lon,
    text: props.item.text || '',
    send: props.item.send || false,
    web_sensor: props.item.web_sensor || '',
    parent_uid: props.item.parent_uid || '',
    parent_callsign: props.item.parent_callsign || '',
    isNew: props.item.isNew || false,
  }

  // Initialize root_sidc and subtype if not present
  if (!props.item.root_sidc) {
    editingData.value.root_sidc = unitsStore.getSidc(editingData.value.subtype || '')
  } else {
    editingData.value.root_sidc = props.item.root_sidc
  }

  editing.value = true
}

const cancelEditing = () => {
  editing.value = false
  editingData.value = null

  if (props.item.isNew) {
    deleteItem()
  }
}

const saveEditing = async () => {
  if (!editForm.value) return

  const { valid } = await editForm.value.validate()
  if (!valid) return

  saving.value = true

  try {
    // Update the item with the edited data
    const updatedItem = { ...props.item }

    for (const key in editingData.value) {
      ;(updatedItem as any)[key] = editingData.value[key]
    }

    updatedItem.type = `a-${editingData.value.aff}-${editingData.value.subtype}`
    updatedItem.sidc = unitsStore.sidcFromType(updatedItem.type)

    editing.value = false
    editingData.value = null

    emit('save', updatedItem)
  } catch (error) {
    console.error('Failed to save unit:', error)
  } finally {
    saving.value = false
  }
}

const deleteItem = () => {
  emit('delete', props.item.uid)
}

const mapToUnit = () => {
  if (props.item.lat && props.item.lon) {
    mapStore.setView(props.item.lat, props.item.lon)
  }
}

const toggleLock = () => {
  const newLockUid = isLocked.value ? '' : props.item.uid
  mapStore.setLockedUnitUid(newLockUid)
}

const getUnitName = (item: MapItem) => {
  return unitsStore.getUnitName(item, props.config?.uid)
}

const getMilIcon = (item: MapItem) => {
  // This would use the actual military symbol generation
  // For now, return a placeholder
  return `/static/icons/${item.type}.png`
}

const formatCoordinates = (lat: number, lon: number) => {
  return `${lat.toFixed(6)}, ${lon.toFixed(6)}`
}

const formatSpeed = (speed?: number) => {
  return ((speed || 0) * 3.6).toFixed(1)
}

const formatDateTime = (dateString?: string) => {
  if (!dateString) return 'نامعلوم'

  const date = new Date(dateString)
  return date.toLocaleDateString('fa-IR') + ' ' + date.toLocaleTimeString('fa-IR')
}

const getDistanceAndBearing = (item: MapItem, coords: any) => {
  if (!coords) return ''

  // Simple distance calculation (would use proper geodesic calculation in real app)
  const lat1 = (item.lat * Math.PI) / 180
  const lat2 = (coords.lat * Math.PI) / 180
  const deltaLat = ((coords.lat - item.lat) * Math.PI) / 180
  const deltaLon = ((coords.lng - item.lon) * Math.PI) / 180

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  const distance = 6371 * c // Earth's radius in km

  // Simple bearing calculation
  const y = Math.sin(deltaLon) * Math.cos(lat2)
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLon)
  const bearing = ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360

  return `${distance.toFixed(2)} کیلومتر، ${bearing.toFixed(0)}°`
}

const truncateText = (text: string, maxLength: number) => {
  if (typeof text !== 'string') return String(text)
  return text.length > maxLength ? text.substring(0, maxLength) + '...' : text
}
</script>

<style scoped>
.unit-details {
  height: 100%;
}

.v-card-title {
  cursor: pointer;
}

.v-card-title:hover {
  background-color: rgba(var(--v-theme-primary), 0.1);
}

:deep(.v-list-item) {
  min-height: 32px;
  padding: 4px 0;
}

:deep(.v-list-item-title) {
  font-size: 0.75rem;
  font-weight: 600;
  margin-bottom: 2px;
}

:deep(.v-list-item-subtitle) {
  font-size: 0.875rem;
  opacity: 1;
}
</style>
