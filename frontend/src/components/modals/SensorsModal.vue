<template>
  <v-dialog v-model="dialog" max-width="1000px" persistent scrollable>
    <v-card>
      <v-card-title class="d-flex justify-space-between align-center">
        <span class="text-h5">سنسورها</span>
        <v-btn icon="mdi-close" variant="text" @click="closeDialog"></v-btn>
      </v-card-title>

      <v-divider></v-divider>

      <v-card-text class="pa-0">
        <v-container fluid>
          <!-- Sensor Statistics -->
          <div class="mb-4">
            <v-row>
              <v-col cols="12" md="3">
                <v-card variant="tonal" color="primary">
                  <v-card-text class="text-center">
                    <v-icon size="32" class="mb-2">mdi-radar</v-icon>
                    <div class="text-h6">{{ activeSensors.length }}</div>
                    <div class="text-caption">سنسورهای فعال</div>
                  </v-card-text>
                </v-card>
              </v-col>
              <v-col cols="12" md="3">
                <v-card variant="tonal" color="success">
                  <v-card-text class="text-center">
                    <v-icon size="32" class="mb-2">mdi-satellite-variant</v-icon>
                    <div class="text-h6">{{ gpsSensors.length }}</div>
                    <div class="text-caption">GPS</div>
                  </v-card-text>
                </v-card>
              </v-col>
              <v-col cols="12" md="3">
                <v-card variant="tonal" color="info">
                  <v-card-text class="text-center">
                    <v-icon size="32" class="mb-2">mdi-ship-wheel</v-icon>
                    <div class="text-h6">{{ aisSensors.length }}</div>
                    <div class="text-caption">AIS</div>
                  </v-card-text>
                </v-card>
              </v-col>
              <v-col cols="12" md="3">
                <v-card variant="tonal" color="warning">
                  <v-card-text class="text-center">
                    <v-icon size="32" class="mb-2">mdi-radar</v-icon>
                    <div class="text-h6">{{ radarSensors.length }}</div>
                    <div class="text-caption">رادار</div>
                  </v-card-text>
                </v-card>
              </v-col>
            </v-row>
          </div>

          <v-divider class="my-4"></v-divider>

          <!-- Sensors Table -->
          <div>
            <h6 class="text-h6 mb-3">فهرست سنسورها</h6>

            <v-data-table
              :headers="headers"
              :items="sensors"
              :items-per-page="10"
              class="elevation-1"
              no-data-text="هیچ سنسوری تعریف نشده است"
            >
              <!-- Sensor Type Column -->
              <template v-slot:item.type="{ item }">
                <v-chip :color="getSensorTypeColor(item.type)" size="small">
                  <v-icon start size="small">{{ getSensorTypeIcon(item.type) }}</v-icon>
                  {{ item.type }}
                </v-chip>
              </template>

              <!-- Status Column -->
              <template v-slot:item.status="{ item }">
                <v-chip :color="item.status === 'active' ? 'success' : 'error'" size="small">
                  <v-icon start size="small">
                    {{ item.status === 'active' ? 'mdi-check-circle' : 'mdi-alert-circle' }}
                  </v-icon>
                  {{ item.status === 'active' ? 'فعال' : 'غیرفعال' }}
                </v-chip>
              </template>

              <!-- Actions Column -->
              <template v-slot:item.actions="{ item }">
                <div class="d-flex">
                  <v-btn
                    v-if="editingSensorId !== item.id"
                    icon="mdi-pencil"
                    size="small"
                    color="primary"
                    variant="text"
                    @click="startEditing(item)"
                  ></v-btn>
                  <v-btn
                    v-if="editingSensorId !== item.id"
                    icon="mdi-delete"
                    size="small"
                    color="error"
                    variant="text"
                    @click="deleteSensor(item.id)"
                  ></v-btn>

                  <template v-if="editingSensorId === item.id">
                    <v-btn
                      icon="mdi-check"
                      size="small"
                      color="success"
                      variant="text"
                      @click="saveEditing"
                    ></v-btn>
                    <v-btn
                      icon="mdi-close"
                      size="small"
                      color="error"
                      variant="text"
                      @click="cancelEditing"
                    ></v-btn>
                  </template>
                </div>
              </template>

              <!-- Editable fields -->
              <template v-slot:item.title="{ item }">
                <v-text-field
                  v-if="editingSensorId === item.id"
                  v-model="editedSensor.title"
                  variant="outlined"
                  density="compact"
                  hide-details
                ></v-text-field>
                <span v-else>{{ item.title }}</span>
              </template>

              <template v-slot:item.addr="{ item }">
                <v-text-field
                  v-if="editingSensorId === item.id"
                  v-model="editedSensor.addr"
                  variant="outlined"
                  density="compact"
                  hide-details
                ></v-text-field>
                <span v-else>{{ item.addr }}</span>
              </template>

              <template v-slot:item.port="{ item }">
                <v-text-field
                  v-if="editingSensorId === item.id"
                  v-model.number="editedSensor.port"
                  type="number"
                  variant="outlined"
                  density="compact"
                  hide-details
                ></v-text-field>
                <span v-else>{{ item.port }}</span>
              </template>

              <template v-slot:item.interval="{ item }">
                <v-text-field
                  v-if="editingSensorId === item.id"
                  v-model.number="editedSensor.interval"
                  type="number"
                  variant="outlined"
                  density="compact"
                  hide-details
                  suffix="ثانیه"
                ></v-text-field>
                <span v-else>{{ item.interval }} ثانیه</span>
              </template>
            </v-data-table>
          </div>

          <v-divider class="my-4"></v-divider>

          <!-- Add New Sensor -->
          <div>
            <h6 class="text-h6 mb-3">افزودن سنسور جدید</h6>

            <v-form ref="sensorForm" @submit.prevent="createSensor">
              <v-row>
                <v-col cols="12" md="3">
                  <v-text-field
                    v-model="newSensor.title"
                    label="نام سنسور"
                    variant="outlined"
                    density="compact"
                    :rules="[rules.required]"
                    required
                  ></v-text-field>
                </v-col>

                <v-col cols="12" md="2">
                  <v-select
                    v-model="newSensor.type"
                    :items="sensorTypeOptions"
                    label="نوع سنسور"
                    variant="outlined"
                    density="compact"
                    :rules="[rules.required]"
                    required
                  ></v-select>
                </v-col>

                <v-col cols="12" md="3">
                  <v-text-field
                    v-model="newSensor.addr"
                    label="آدرس IP"
                    variant="outlined"
                    density="compact"
                    :rules="[rules.required, rules.ip]"
                    required
                  ></v-text-field>
                </v-col>

                <v-col cols="12" md="2">
                  <v-text-field
                    v-model.number="newSensor.port"
                    label="پورت"
                    type="number"
                    variant="outlined"
                    density="compact"
                    :rules="[rules.required, rules.port]"
                    required
                  ></v-text-field>
                </v-col>

                <v-col cols="12" md="2">
                  <v-text-field
                    v-model.number="newSensor.interval"
                    label="بازه (ثانیه)"
                    type="number"
                    variant="outlined"
                    density="compact"
                    :rules="[rules.required, rules.interval]"
                    required
                  ></v-text-field>
                </v-col>
              </v-row>

              <div class="d-flex justify-end mt-3">
                <v-btn type="submit" color="primary" :loading="creating">
                  <v-icon start>mdi-plus</v-icon>
                  افزودن سنسور
                </v-btn>
              </div>
            </v-form>
          </div>
        </v-container>
      </v-card-text>

      <v-divider></v-divider>

      <v-card-actions class="pa-4">
        <v-spacer></v-spacer>
        <v-btn variant="outlined" @click="closeDialog"> بستن </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useApi } from '@/composables/useApi'

// Props
interface Props {
  modelValue: boolean
  sensors?: any[]
}

const props = withDefaults(defineProps<Props>(), {
  sensors: () => [],
})

// Emits
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'sensor-created': [sensor: any]
  'sensor-updated': [sensor: any]
  'sensor-deleted': [sensorId: string]
}>()

// Composables
const { request } = useApi()

// Local state
const creating = ref(false)
const editingSensorId = ref<string | null>(null)
const sensorForm = ref()

const newSensor = ref({
  title: '',
  type: '',
  addr: '',
  port: 2947,
  interval: 5,
})

const editedSensor = ref({
  title: '',
  type: '',
  addr: '',
  port: 2947,
  interval: 5,
})

// Computed
const dialog = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value),
})

const activeSensors = computed(() => props.sensors.filter(sensor => sensor.status === 'active'))

const gpsSensors = computed(() => props.sensors.filter(sensor => sensor.type === 'GPS'))

const aisSensors = computed(() => props.sensors.filter(sensor => sensor.type === 'AIS'))

const radarSensors = computed(() => props.sensors.filter(sensor => sensor.type === 'Radar'))

// Table headers
const headers = [
  { title: '#', key: 'index', sortable: false, width: '60px' },
  { title: 'نام', key: 'title', sortable: true },
  { title: 'نوع', key: 'type', sortable: true },
  { title: 'آدرس', key: 'addr', sortable: true },
  { title: 'پورت', key: 'port', sortable: true },
  { title: 'بازه', key: 'interval', sortable: true },
  { title: 'وضعیت', key: 'status', sortable: true },
  { title: 'عملیات', key: 'actions', sortable: false, width: '120px' },
]

const sensorTypeOptions = [
  { title: 'GPS (gpsd)', value: 'GPS' },
  { title: 'AIS', value: 'AIS' },
  { title: 'Radar', value: 'Radar' },
]

// Validation rules
const rules = {
  required: (value: any) => !!value || 'این فیلد الزامی است',
  ip: (value: string) => {
    if (!value) return 'آدرس IP الزامی است'
    const ipRegex =
      /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/
    return ipRegex.test(value) || 'آدرس IP معتبر نیست'
  },
  port: (value: number) => {
    if (!value) return 'پورت الزامی است'
    if (value < 1 || value > 65535) return 'پورت باید بین 1 تا 65535 باشد'
    return true
  },
  interval: (value: number) => {
    if (!value) return 'بازه الزامی است'
    if (value < 1) return 'بازه باید حداقل 1 ثانیه باشد'
    return true
  },
}

// Methods
const getSensorTypeColor = (type: string): string => {
  const colors: Record<string, string> = {
    GPS: 'success',
    AIS: 'info',
    Radar: 'warning',
  }
  return colors[type] || 'grey'
}

const getSensorTypeIcon = (type: string): string => {
  const icons: Record<string, string> = {
    GPS: 'mdi-satellite-variant',
    AIS: 'mdi-ship-wheel',
    Radar: 'mdi-radar',
  }
  return icons[type] || 'mdi-help'
}

const resetForm = () => {
  newSensor.value = {
    title: '',
    type: '',
    addr: '',
    port: 2947,
    interval: 5,
  }
  sensorForm.value?.resetValidation()
}

const createSensor = async () => {
  if (!sensorForm.value) return

  const { valid } = await sensorForm.value.validate()
  if (!valid) return

  creating.value = true

  try {
    const response = await request('/api/sensors', {
      method: 'POST',
      body: JSON.stringify(newSensor.value),
    })

    if (response.success) {
      emit('sensor-created', response.data)
      resetForm()
    } else {
      console.error('Failed to create sensor:', response.error)
    }
  } catch (error) {
    console.error('Error creating sensor:', error)
  } finally {
    creating.value = false
  }
}

const startEditing = (sensor: any) => {
  editingSensorId.value = sensor.id
  editedSensor.value = { ...sensor }
}

const cancelEditing = () => {
  editingSensorId.value = null
  editedSensor.value = {
    title: '',
    type: '',
    addr: '',
    port: 2947,
    interval: 5,
  }
}

const saveEditing = async () => {
  if (!editingSensorId.value) return

  try {
    const response = await request(`/api/sensors/${editingSensorId.value}`, {
      method: 'PUT',
      body: JSON.stringify(editedSensor.value),
    })

    if (response.success) {
      emit('sensor-updated', response.data)
      cancelEditing()
    } else {
      console.error('Failed to update sensor:', response.error)
    }
  } catch (error) {
    console.error('Error updating sensor:', error)
  }
}

const deleteSensor = async (sensorId: string) => {
  if (!confirm('آیا از حذف این سنسور اطمینان دارید؟')) return

  try {
    const response = await request(`/api/sensors/${sensorId}`, {
      method: 'DELETE',
    })

    if (response.success) {
      emit('sensor-deleted', sensorId)
    } else {
      console.error('Failed to delete sensor:', response.error)
    }
  } catch (error) {
    console.error('Error deleting sensor:', error)
  }
}

const closeDialog = () => {
  resetForm()
  cancelEditing()
  emit('update:modelValue', false)
}

// Watch for dialog changes to reset form
watch(dialog, newValue => {
  if (newValue) {
    resetForm()
    cancelEditing()
  }
})
</script>

<style scoped>
:deep(.v-data-table) {
  border-radius: 8px;
}

:deep(.v-data-table-header) {
  background-color: rgba(var(--v-theme-surface-variant), 0.5);
}

:deep(.v-data-table__td) {
  border-bottom: 1px solid rgba(var(--v-border-color), 0.12);
}
</style>
