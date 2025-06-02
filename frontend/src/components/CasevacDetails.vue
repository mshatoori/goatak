<template>
  <v-card class="casevac-details">
    <!-- Header -->
    <v-card-title class="d-flex justify-space-between align-center">
      <div class="d-flex align-center" @click="mapToUnit">
        <v-icon color="warning" size="32" class="me-2">mdi-medical-bag</v-icon>

        <div>
          <div class="text-h6">{{ item.callsign }}</div>
          <div class="text-caption">CASEVAC</div>
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

    <!-- CASEVAC View (non-editing mode) -->
    <v-card-text v-if="!editing">
      <!-- Location -->
      <div class="mb-4">
        <v-list-item class="px-0">
          <v-list-item-title class="text-caption text-medium-emphasis">مکان</v-list-item-title>
          <v-list-item-subtitle class="d-flex align-center">
            {{ formatCoordinates(item.lat, item.lon) }}
            <v-btn icon size="x-small" color="success" class="ms-2" @click="mapToUnit">
              <v-icon size="12">mdi-crosshairs-gps</v-icon>
            </v-btn>
          </v-list-item-subtitle>
        </v-list-item>
      </div>

      <!-- Remarks -->
      <div v-if="item.remarks" class="mb-4">
        <v-list-item class="px-0">
          <v-list-item-title class="text-caption text-medium-emphasis">توضیحات</v-list-item-title>
          <v-list-item-subtitle>{{ item.remarks }}</v-list-item-subtitle>
        </v-list-item>
      </div>

      <v-divider class="my-4"></v-divider>

      <!-- Patient Priority -->
      <div class="mb-4">
        <h6 class="text-h6 mb-3">اولویت بیماران</h6>
        <v-row dense>
          <v-col cols="4">
            <v-card variant="tonal" color="error">
              <v-card-text class="text-center pa-2">
                <div class="text-h6">{{ casevacDetail.urgent || 0 }}</div>
                <div class="text-caption">بحرانی</div>
              </v-card-text>
            </v-card>
          </v-col>
          <v-col cols="4">
            <v-card variant="tonal" color="warning">
              <v-card-text class="text-center pa-2">
                <div class="text-h6">{{ casevacDetail.priority || 0 }}</div>
                <div class="text-caption">بااولویت</div>
              </v-card-text>
            </v-card>
          </v-col>
          <v-col cols="4">
            <v-card variant="tonal" color="info">
              <v-card-text class="text-center pa-2">
                <div class="text-h6">{{ casevacDetail.routine || 0 }}</div>
                <div class="text-caption">روتین</div>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </div>

      <!-- Security Status -->
      <div class="mb-4">
        <h6 class="text-h6 mb-3">وضعیت امنیتی منطقه</h6>
        <v-card variant="outlined">
          <v-card-text>
            <div v-if="casevacDetail.security === 0">عدم حضور نیروهای دشمن در منطقه</div>
            <div v-else-if="casevacDetail.security === 1">احتمال حضور نیروهای دشمن در منطقه</div>
            <div v-else-if="casevacDetail.security === 2">نیروهای دشمن، با احتیاط نزدیک شوید</div>
            <div v-else-if="casevacDetail.security === 3">نیروهای دشمن، نیاز به اسکورت مسلح</div>
            <div v-else>وضعیت امنیتی نامشخص</div>
          </v-card-text>
        </v-card>
      </div>

      <!-- Patient Mobility -->
      <div class="mb-4">
        <h6 class="text-h6 mb-3">وضعیت حرکتی بیماران</h6>
        <v-row dense>
          <v-col cols="6">
            <v-card variant="outlined">
              <v-card-text class="text-center pa-2">
                <div class="text-h6">{{ casevacDetail.litter || 0 }}</div>
                <div class="text-caption">تعداد برانکارد</div>
              </v-card-text>
            </v-card>
          </v-col>
          <v-col cols="6">
            <v-card variant="outlined">
              <v-card-text class="text-center pa-2">
                <div class="text-h6">{{ casevacDetail.ambulatory || 0 }}</div>
                <div class="text-caption">قابل حمل</div>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </div>

      <!-- Patient Types -->
      <div class="mb-4">
        <h6 class="text-h6 mb-3">نوع بیماران</h6>
        <v-list density="compact">
          <v-list-item>
            <v-list-item-title>نظامی خودی</v-list-item-title>
            <template v-slot:append>
              <v-chip size="small">{{ casevacDetail.us_military || 0 }}</v-chip>
            </template>
          </v-list-item>
          <v-list-item>
            <v-list-item-title>غیرنظامی خودی</v-list-item-title>
            <template v-slot:append>
              <v-chip size="small">{{ casevacDetail.us_civilian || 0 }}</v-chip>
            </template>
          </v-list-item>
          <v-list-item>
            <v-list-item-title>نظامی غیر خودی</v-list-item-title>
            <template v-slot:append>
              <v-chip size="small">{{ casevacDetail.nonus_military || 0 }}</v-chip>
            </template>
          </v-list-item>
          <v-list-item>
            <v-list-item-title>غیرنظامی غیر خودی</v-list-item-title>
            <template v-slot:append>
              <v-chip size="small">{{ casevacDetail.nonus_civilian || 0 }}</v-chip>
            </template>
          </v-list-item>
          <v-list-item>
            <v-list-item-title>اسیران جنگی</v-list-item-title>
            <template v-slot:append>
              <v-chip size="small">{{ casevacDetail.epw || 0 }}</v-chip>
            </template>
          </v-list-item>
          <v-list-item>
            <v-list-item-title>کودکان</v-list-item-title>
            <template v-slot:append>
              <v-chip size="small">{{ casevacDetail.child || 0 }}</v-chip>
            </template>
          </v-list-item>
        </v-list>
      </div>

      <!-- Equipment -->
      <div class="mb-4">
        <h6 class="text-h6 mb-3">تجهیزات مورد نیاز</h6>
        <v-row dense>
          <v-col cols="6">
            <v-list-item density="compact">
              <template v-slot:prepend>
                <v-icon :color="casevacDetail.hoist ? 'success' : 'grey'">
                  {{ casevacDetail.hoist ? 'mdi-check-circle' : 'mdi-circle-outline' }}
                </v-icon>
              </template>
              <v-list-item-title>بالابر</v-list-item-title>
            </v-list-item>
            <v-list-item density="compact">
              <template v-slot:prepend>
                <v-icon :color="casevacDetail.extraction_equipment ? 'success' : 'grey'">
                  {{
                    casevacDetail.extraction_equipment ? 'mdi-check-circle' : 'mdi-circle-outline'
                  }}
                </v-icon>
              </template>
              <v-list-item-title>تجهیزات نجات</v-list-item-title>
            </v-list-item>
          </v-col>
          <v-col cols="6">
            <v-list-item density="compact">
              <template v-slot:prepend>
                <v-icon :color="casevacDetail.ventilator ? 'success' : 'grey'">
                  {{ casevacDetail.ventilator ? 'mdi-check-circle' : 'mdi-circle-outline' }}
                </v-icon>
              </template>
              <v-list-item-title>ونتیلاتور</v-list-item-title>
            </v-list-item>
            <v-list-item density="compact">
              <template v-slot:prepend>
                <v-icon :color="casevacDetail.equipment_other ? 'success' : 'grey'">
                  {{ casevacDetail.equipment_other ? 'mdi-check-circle' : 'mdi-circle-outline' }}
                </v-icon>
              </template>
              <v-list-item-title>سایر تجهیزات</v-list-item-title>
            </v-list-item>
          </v-col>
        </v-row>

        <div v-if="casevacDetail.equipment_other && casevacDetail.equipment_detail" class="mt-2">
          <v-card variant="outlined">
            <v-card-text>
              <div class="text-caption text-medium-emphasis mb-1">توضیحات تجهیزات:</div>
              <div>{{ casevacDetail.equipment_detail }}</div>
            </v-card-text>
          </v-card>
        </div>
      </div>

      <!-- Communication -->
      <div class="mb-4">
        <v-list-item class="px-0">
          <v-list-item-title class="text-caption text-medium-emphasis"
            >فرکانس تماس</v-list-item-title
          >
          <v-list-item-subtitle>{{ casevacDetail.freq || 'تعریف نشده' }}</v-list-item-subtitle>
        </v-list-item>
      </div>

      <!-- Navigation Info Component -->
      <NavigationInfo
        v-if="!editing"
        :target-item="item"
        :user-position="config"
        @navigation-line-toggle="$emit('navigation-line-toggle', $event)"
      />
    </v-card-text>

    <!-- CASEVAC Edit Form -->
    <v-card-text v-if="editing">
      <v-form ref="editForm" @submit.prevent="saveEditing">
        <!-- Location (read-only) -->
        <v-text-field
          :model-value="formatCoordinates(item.lat, item.lon)"
          label="مکان"
          variant="outlined"
          density="compact"
          readonly
          class="mb-4"
        ></v-text-field>

        <!-- Remarks -->
        <v-textarea
          v-model="editingData.remarks"
          label="توضیحات"
          variant="outlined"
          density="compact"
          rows="3"
          auto-grow
          class="mb-4"
        ></v-textarea>

        <v-divider class="my-4"></v-divider>

        <!-- Patient Priority -->
        <h6 class="text-h6 mb-3">اولویت بیماران</h6>
        <v-row dense class="mb-4">
          <v-col cols="4">
            <v-text-field
              v-model.number="editingData.casevac_detail.urgent"
              label="بحرانی"
              type="number"
              variant="outlined"
              density="compact"
              min="0"
            ></v-text-field>
          </v-col>
          <v-col cols="4">
            <v-text-field
              v-model.number="editingData.casevac_detail.priority"
              label="بااولویت"
              type="number"
              variant="outlined"
              density="compact"
              min="0"
            ></v-text-field>
          </v-col>
          <v-col cols="4">
            <v-text-field
              v-model.number="editingData.casevac_detail.routine"
              label="روتین"
              type="number"
              variant="outlined"
              density="compact"
              min="0"
            ></v-text-field>
          </v-col>
        </v-row>

        <!-- Security Status -->
        <v-select
          v-model.number="editingData.casevac_detail.security"
          label="وضعیت امنیتی منطقه"
          variant="outlined"
          density="compact"
          :items="securityOptions"
          item-title="text"
          item-value="value"
          class="mb-4"
        ></v-select>

        <!-- Patient Mobility -->
        <h6 class="text-h6 mb-3">وضعیت حرکتی بیماران</h6>
        <v-row dense class="mb-4">
          <v-col cols="6">
            <v-text-field
              v-model.number="editingData.casevac_detail.litter"
              label="تعداد برانکارد"
              type="number"
              variant="outlined"
              density="compact"
              min="0"
            ></v-text-field>
          </v-col>
          <v-col cols="6">
            <v-text-field
              v-model.number="editingData.casevac_detail.ambulatory"
              label="تعداد قابل حمل"
              type="number"
              variant="outlined"
              density="compact"
              min="0"
            ></v-text-field>
          </v-col>
        </v-row>

        <!-- Patient Types -->
        <h6 class="text-h6 mb-3">نوع بیماران</h6>
        <v-row dense class="mb-4">
          <v-col cols="6">
            <v-text-field
              v-model.number="editingData.casevac_detail.us_military"
              label="نظامی خودی"
              type="number"
              variant="outlined"
              density="compact"
              min="0"
            ></v-text-field>
          </v-col>
          <v-col cols="6">
            <v-text-field
              v-model.number="editingData.casevac_detail.us_civilian"
              label="غیرنظامی خودی"
              type="number"
              variant="outlined"
              density="compact"
              min="0"
            ></v-text-field>
          </v-col>
          <v-col cols="6">
            <v-text-field
              v-model.number="editingData.casevac_detail.nonus_military"
              label="نظامی غیر خودی"
              type="number"
              variant="outlined"
              density="compact"
              min="0"
            ></v-text-field>
          </v-col>
          <v-col cols="6">
            <v-text-field
              v-model.number="editingData.casevac_detail.nonus_civilian"
              label="غیرنظامی غیر خودی"
              type="number"
              variant="outlined"
              density="compact"
              min="0"
            ></v-text-field>
          </v-col>
          <v-col cols="6">
            <v-text-field
              v-model.number="editingData.casevac_detail.epw"
              label="اسیران جنگی"
              type="number"
              variant="outlined"
              density="compact"
              min="0"
            ></v-text-field>
          </v-col>
          <v-col cols="6">
            <v-text-field
              v-model.number="editingData.casevac_detail.child"
              label="کودکان"
              type="number"
              variant="outlined"
              density="compact"
              min="0"
            ></v-text-field>
          </v-col>
        </v-row>

        <!-- Equipment -->
        <h6 class="text-h6 mb-3">تجهیزات مورد نیاز</h6>
        <v-row dense class="mb-4">
          <v-col cols="6">
            <v-checkbox
              v-model="editingData.casevac_detail.hoist"
              label="بالابر"
              density="compact"
            ></v-checkbox>
            <v-checkbox
              v-model="editingData.casevac_detail.extraction_equipment"
              label="تجهیزات نجات و رهاسازی"
              density="compact"
            ></v-checkbox>
          </v-col>
          <v-col cols="6">
            <v-checkbox
              v-model="editingData.casevac_detail.ventilator"
              label="ونتیلاتور"
              density="compact"
            ></v-checkbox>
            <v-checkbox
              v-model="editingData.casevac_detail.equipment_other"
              label="سایر تجهیزات"
              density="compact"
            ></v-checkbox>
          </v-col>
        </v-row>

        <v-textarea
          v-if="editingData.casevac_detail.equipment_other"
          v-model="editingData.casevac_detail.equipment_detail"
          label="توضیحات تجهیزات"
          variant="outlined"
          density="compact"
          rows="2"
          auto-grow
          class="mb-4"
        ></v-textarea>

        <!-- Communication -->
        <v-text-field
          v-model.number="editingData.casevac_detail.freq"
          label="فرکانس تماس"
          type="number"
          variant="outlined"
          density="compact"
          class="mb-4"
        ></v-text-field>

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
import { useCasevacStore } from '@/stores/casevacStore'
import NavigationInfo from './NavigationInfo.vue'
import type { MapItem, Config, CasevacDetail, NavigationLineToggleEvent } from '@/types'

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
const casevacStore = useCasevacStore()

// Local state
const editing = ref(false)
const editingData = ref<any>(null)
const saving = ref(false)
const editForm = ref()

// Computed
const isLocked = computed(() => props.lockedUnitUid === props.item.uid)

const casevacDetail = computed(() => {
  return props.item.casevac_detail || casevacStore.createDefaultCasevacDetail()
})

// Security options
const securityOptions = [
  { text: 'عدم حضور نیروهای دشمن در منطقه', value: 0 },
  { text: 'احتمال حضور نیروهای دشمن در منطقه', value: 1 },
  { text: 'نیروهای دشمن، با احتیاط نزدیک شوید', value: 2 },
  { text: 'نیروهای دشمن، نیاز به اسکورت مسلح', value: 3 },
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
    lat: props.item.lat,
    lon: props.item.lon,
    remarks: props.item.remarks || '',
    casevac_detail: { ...casevacDetail.value },
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

  // Validate CASEVAC data
  const validation = casevacStore.validateCasevacData({
    ...props.item,
    ...editingData.value,
  })

  if (!validation.valid) {
    console.error('Validation errors:', validation.errors)
    // Could show validation errors to user
    return
  }

  saving.value = true

  try {
    // Update the item with the edited data
    const updatedItem = { ...props.item }

    updatedItem.remarks = editingData.value.remarks
    updatedItem.casevac_detail = editingData.value.casevac_detail

    editing.value = false
    editingData.value = null

    emit('save', updatedItem)
  } catch (error) {
    console.error('Failed to save CASEVAC:', error)
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
</script>

<style scoped>
.casevac-details {
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
