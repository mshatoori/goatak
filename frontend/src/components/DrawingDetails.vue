<template>
  <v-card class="drawing-details">
    <!-- Header -->
    <v-card-title class="d-flex justify-space-between align-center">
      <div class="d-flex align-center" @click="mapToUnit">
        <v-icon :color="item.color || 'info'" size="32" class="me-2">
          {{ item.category === 'route' ? 'mdi-map-marker-path' : 'mdi-vector-polygon' }}
        </v-icon>

        <div>
          <div class="text-h6">{{ item.callsign }}</div>
          <div class="text-caption">{{ getCategoryName(item.category) }}</div>
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

    <!-- Drawing View (non-editing mode) -->
    <v-card-text v-if="!editing">
      <v-row dense>
        <v-col cols="12">
          <v-list density="compact">
            <v-list-item>
              <v-list-item-title class="text-caption text-medium-emphasis">UID</v-list-item-title>
              <v-list-item-subtitle>{{ item.uid }}</v-list-item-subtitle>
            </v-list-item>

            <v-list-item>
              <v-list-item-title class="text-caption text-medium-emphasis">نوع</v-list-item-title>
              <v-list-item-subtitle>{{ getCategoryName(item.category) }}</v-list-item-subtitle>
            </v-list-item>

            <v-list-item>
              <v-list-item-title class="text-caption text-medium-emphasis">مرکز</v-list-item-title>
              <v-list-item-subtitle class="d-flex align-center">
                {{ formatCoordinates(item.lat, item.lon) }}
                <v-btn icon size="x-small" color="success" class="ms-2" @click="mapToUnit">
                  <v-icon size="12">mdi-crosshairs-gps</v-icon>
                </v-btn>
              </v-list-item-subtitle>
            </v-list-item>

            <v-list-item>
              <v-list-item-title class="text-caption text-medium-emphasis">رنگ</v-list-item-title>
              <v-list-item-subtitle class="d-flex align-center">
                <v-chip :color="item.color || 'grey'" size="small" class="me-2">
                  {{ item.color || 'پیش‌فرض' }}
                </v-chip>
                <div
                  class="color-preview"
                  :style="{ backgroundColor: item.color || '#grey' }"
                ></div>
              </v-list-item-subtitle>
            </v-list-item>

            <v-list-item v-if="item.links && item.links.length > 0">
              <v-list-item-title class="text-caption text-medium-emphasis"
                >تعداد نقاط</v-list-item-title
              >
              <v-list-item-subtitle>{{ item.links.length }} نقطه</v-list-item-subtitle>
            </v-list-item>

            <v-list-item v-if="item.category === 'route'">
              <v-list-item-title class="text-caption text-medium-emphasis"
                >طول مسیر</v-list-item-title
              >
              <v-list-item-subtitle>{{ calculateRouteLength() }} کیلومتر</v-list-item-subtitle>
            </v-list-item>

            <v-list-item v-if="item.category === 'drawing'">
              <v-list-item-title class="text-caption text-medium-emphasis">مساحت</v-list-item-title>
              <v-list-item-subtitle>{{ calculatePolygonArea() }} کیلومتر مربع</v-list-item-subtitle>
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

      <!-- Coordinates list -->
      <div v-if="item.links && item.links.length > 0" class="mt-4">
        <v-divider class="mb-3"></v-divider>
        <h6 class="text-h6 mb-2">مختصات نقاط</h6>
        <v-expansion-panels variant="accordion">
          <v-expansion-panel>
            <v-expansion-panel-title> نمایش {{ item.links.length }} نقطه </v-expansion-panel-title>
            <v-expansion-panel-text>
              <v-list density="compact">
                <v-list-item
                  v-for="(link, index) in item.links"
                  :key="index"
                  class="coordinate-item"
                >
                  <v-list-item-title class="text-caption"> نقطه {{ index + 1 }} </v-list-item-title>
                  <v-list-item-subtitle class="d-flex align-center">
                    {{ formatLinkCoordinates(link) }}
                    <v-btn
                      icon
                      size="x-small"
                      color="primary"
                      class="ms-2"
                      @click="centerOnCoordinate(link)"
                    >
                      <v-icon size="10">mdi-crosshairs-gps</v-icon>
                    </v-btn>
                  </v-list-item-subtitle>
                </v-list-item>
              </v-list>
            </v-expansion-panel-text>
          </v-expansion-panel>
        </v-expansion-panels>
      </div>

      <!-- Remarks -->
      <div v-if="item.text" class="mt-4">
        <v-divider class="mb-3"></v-divider>
        <h6 class="text-h6 mb-2">توضیحات</h6>
        <p class="text-body-2">{{ item.text }}</p>
      </div>

      <!-- Geofence settings -->
      <div v-if="item.category === 'drawing'" class="mt-4">
        <v-divider class="mb-3"></v-divider>
        <h6 class="text-h6 mb-2">تنظیمات حصار جغرافیایی</h6>
        <v-list density="compact">
          <v-list-item>
            <v-list-item-title>فعال</v-list-item-title>
            <template v-slot:append>
              <v-chip :color="item.geofence ? 'success' : 'grey'" size="small">
                {{ item.geofence ? 'بله' : 'خیر' }}
              </v-chip>
            </template>
          </v-list-item>
          <v-list-item v-if="item.geofence">
            <v-list-item-title>طرف مربوطه</v-list-item-title>
            <template v-slot:append>
              <v-chip size="small">{{ item.geofence_aff || 'همه' }}</v-chip>
            </template>
          </v-list-item>
        </v-list>
      </div>

      <!-- Navigation Info Component -->
      <NavigationInfo
        v-if="!editing"
        :target-item="item"
        :user-position="config"
        @navigation-line-toggle="$emit('navigation-line-toggle', $event)"
      />
    </v-card-text>

    <!-- Drawing Edit Form -->
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
              v-model="editingData.color"
              label="رنگ"
              variant="outlined"
              density="compact"
              :items="colorOptions"
              item-title="text"
              item-value="value"
            >
              <template v-slot:item="{ props, item }">
                <v-list-item v-bind="props">
                  <template v-slot:prepend>
                    <div
                      class="color-preview me-2"
                      :style="{ backgroundColor: item.raw.value }"
                    ></div>
                  </template>
                </v-list-item>
              </template>
            </v-select>
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

          <v-col cols="12" v-if="item.category === 'drawing'">
            <v-checkbox
              v-model="editingData.geofence"
              label="فعال‌سازی حصار جغرافیایی"
              density="compact"
            ></v-checkbox>
          </v-col>

          <v-col cols="12" v-if="editingData.geofence">
            <v-select
              v-model="editingData.geofence_aff"
              label="طرف مربوطه"
              variant="outlined"
              density="compact"
              :items="affiliationOptions"
              item-title="text"
              item-value="value"
            ></v-select>
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
import NavigationInfo from './NavigationInfo.vue'
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

// Local state
const editing = ref(false)
const editingData = ref<any>(null)
const saving = ref(false)
const editForm = ref()

// Computed
const isLocked = computed(() => props.lockedUnitUid === props.item.uid)

// Form rules
const rules = {
  required: (value: any) => !!value || 'این فیلد الزامی است',
}

// Color options
const colorOptions = [
  { text: 'سفید', value: 'white' },
  { text: 'قرمز', value: 'red' },
  { text: 'آبی', value: 'blue' },
  { text: 'سبز', value: 'green' },
  { text: 'زرد', value: 'yellow' },
  { text: 'نارنجی', value: 'orange' },
  { text: 'بنفش', value: 'purple' },
  { text: 'صورتی', value: 'pink' },
  { text: 'قهوه‌ای', value: 'brown' },
  { text: 'خاکستری', value: 'grey' },
  { text: 'مشکی', value: 'black' },
]

// Affiliation options
const affiliationOptions = [
  { text: 'همه', value: 'All' },
  { text: 'خودی', value: 'Friend' },
  { text: 'دشمن', value: 'Hostile' },
  { text: 'خنثی', value: 'Neutral' },
  { text: 'نامعلوم', value: 'Unknown' },
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
const getCategoryName = (category: string) => {
  switch (category) {
    case 'drawing':
      return 'نقشه/چندضلعی'
    case 'route':
      return 'مسیر'
    default:
      return category
  }
}

const startEditing = () => {
  editingData.value = {
    uid: props.item.uid,
    category: props.item.category,
    callsign: props.item.callsign,
    type: props.item.type,
    color: props.item.color || 'white',
    text: props.item.text || '',
    send: props.item.send || false,
    geofence: props.item.geofence || false,
    geofence_aff: props.item.geofence_aff || 'All',
    parent_uid: props.item.parent_uid || '',
    parent_callsign: props.item.parent_callsign || '',
    isNew: props.item.isNew || false,
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

    editing.value = false
    editingData.value = null

    emit('save', updatedItem)
  } catch (error) {
    console.error('Failed to save drawing:', error)
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

const formatCoordinates = (lat: number, lon: number) => {
  return `${lat.toFixed(6)}, ${lon.toFixed(6)}`
}

const formatLinkCoordinates = (link: string) => {
  const [lat, lon] = link.split(',').map(Number)
  return formatCoordinates(lat, lon)
}

const formatDateTime = (dateString?: string) => {
  if (!dateString) return 'نامعلوم'

  const date = new Date(dateString)
  return date.toLocaleDateString('fa-IR') + ' ' + date.toLocaleTimeString('fa-IR')
}

const centerOnCoordinate = (link: string) => {
  const [lat, lon] = link.split(',').map(Number)
  mapStore.setView(lat, lon)
}

const calculateRouteLength = () => {
  if (!props.item.links || props.item.links.length < 2) return '0.00'

  let totalDistance = 0
  for (let i = 0; i < props.item.links.length - 1; i++) {
    const [lat1, lon1] = props.item.links[i].split(',').map(Number)
    const [lat2, lon2] = props.item.links[i + 1].split(',').map(Number)

    totalDistance += calculateDistance(lat1, lon1, lat2, lon2)
  }

  return totalDistance.toFixed(2)
}

const calculatePolygonArea = () => {
  if (!props.item.links || props.item.links.length < 3) return '0.00'

  // Simple polygon area calculation (Shoelace formula)
  const coords = props.item.links.map(link => {
    const [lat, lon] = link.split(',').map(Number)
    return { lat, lon }
  })

  let area = 0
  for (let i = 0; i < coords.length; i++) {
    const j = (i + 1) % coords.length
    area += coords[i].lon * coords[j].lat
    area -= coords[j].lon * coords[i].lat
  }

  area = Math.abs(area) / 2

  // Convert to square kilometers (very rough approximation)
  const kmPerDegree = 111.32 // Approximate km per degree at equator
  area = area * kmPerDegree * kmPerDegree

  return area.toFixed(2)
}

const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371 // Earth's radius in kilometers
  const dLat = toRadians(lat2 - lat1)
  const dLon = toRadians(lon2 - lon1)

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

const toRadians = (degrees: number) => {
  return degrees * (Math.PI / 180)
}
</script>

<style scoped>
.drawing-details {
  height: 100%;
}

.v-card-title {
  cursor: pointer;
}

.v-card-title:hover {
  background-color: rgba(var(--v-theme-primary), 0.1);
}

.color-preview {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.coordinate-item {
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.coordinate-item:last-child {
  border-bottom: none;
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
