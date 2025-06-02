<template>
  <v-dialog v-model="dialog" max-width="800px" persistent scrollable>
    <v-card>
      <v-card-title class="d-flex justify-space-between align-center">
        <span class="text-h5">ارتباطات</span>
        <v-btn icon="mdi-close" variant="text" @click="closeDialog"></v-btn>
      </v-card-title>

      <v-divider></v-divider>

      <v-card-text class="pa-0">
        <v-container fluid>
          <!-- Existing Flows List -->
          <div class="mb-4">
            <h6 class="text-h6 mb-3">ارتباطات موجود</h6>
            <v-list v-if="flows.length > 0" density="compact">
              <v-list-item v-for="(flow, index) in flows" :key="flow.id || index" class="mb-2">
                <template v-slot:prepend>
                  <v-avatar :color="getFlowTypeColor(flow.type)" size="40">
                    <v-icon color="white">
                      {{ getFlowTypeIcon(flow.type) }}
                    </v-icon>
                  </v-avatar>
                </template>

                <v-list-item-title>{{ flow.title || `Flow ${index + 1}` }}</v-list-item-title>
                <v-list-item-subtitle>
                  <div v-if="flow.type === 'UDP'">آدرس: {{ flow.addr }}:{{ flow.port }}</div>
                  <div v-else-if="flow.type === 'Rabbit'">
                    آدرس: {{ flow.addr }}
                    <div v-if="flow.direction === 1 || flow.direction === 3">
                      صف دریافت: {{ flow.recvQueue }}
                    </div>
                    <div v-if="flow.direction === 2 || flow.direction === 3">
                      صف ارسال: {{ flow.sendExchange }}
                    </div>
                  </div>
                </v-list-item-subtitle>

                <template v-slot:append>
                  <div class="d-flex flex-column align-end">
                    <v-chip :color="getFlowTypeColor(flow.type)" size="small" class="mb-1">
                      {{ getFlowTypeText(flow.type) }}
                    </v-chip>
                    <v-chip color="success" size="small">
                      {{ getFlowDirectionText(flow.direction) }}
                    </v-chip>
                  </div>
                </template>
              </v-list-item>
            </v-list>
            <v-alert v-else type="info" variant="tonal" class="mb-4">
              هیچ ارتباطی تعریف نشده است
            </v-alert>
          </div>

          <v-divider class="my-4"></v-divider>

          <!-- New Flow Creation -->
          <div>
            <h6 class="text-h6 mb-3">ایجاد ارتباط جدید</h6>

            <!-- Flow Type Selection -->
            <v-row class="mb-4">
              <v-col cols="12" md="6">
                <v-btn-toggle
                  v-model="newFlow.type"
                  mandatory
                  variant="outlined"
                  divided
                  class="mb-3"
                >
                  <v-btn value="UDP">
                    <v-icon start>mdi-network</v-icon>
                    UDP
                  </v-btn>
                  <v-btn value="Rabbit">
                    <v-icon start>mdi-rabbit</v-icon>
                    RabbitMQ
                  </v-btn>
                </v-btn-toggle>
              </v-col>
              <v-col cols="12" md="6">
                <v-btn-toggle v-model="newFlow.direction" mandatory variant="outlined" divided>
                  <v-btn :value="1">
                    <v-icon start>mdi-arrow-down</v-icon>
                    ورودی
                  </v-btn>
                  <v-btn :value="2">
                    <v-icon start>mdi-arrow-up</v-icon>
                    خروجی
                  </v-btn>
                  <v-btn :value="3">
                    <v-icon start>mdi-arrow-up-down</v-icon>
                    دوطرفه
                  </v-btn>
                </v-btn-toggle>
              </v-col>
            </v-row>

            <!-- Form Fields -->
            <v-form ref="flowForm" @submit.prevent="createFlow">
              <v-row>
                <v-col cols="12">
                  <v-text-field
                    v-model="newFlow.title"
                    label="نام ارتباط"
                    variant="outlined"
                    density="compact"
                    :rules="[rules.required]"
                    required
                  ></v-text-field>
                </v-col>

                <v-col cols="12" md="8">
                  <v-text-field
                    v-model="newFlow.addr"
                    label="آدرس"
                    variant="outlined"
                    density="compact"
                    :rules="[rules.required]"
                    required
                  ></v-text-field>
                </v-col>

                <v-col cols="12" md="4" v-if="newFlow.type === 'UDP'">
                  <v-text-field
                    v-model.number="newFlow.port"
                    label="پورت"
                    type="number"
                    variant="outlined"
                    density="compact"
                    :rules="[rules.required, rules.port]"
                    required
                  ></v-text-field>
                </v-col>

                <!-- RabbitMQ specific fields -->
                <template v-if="newFlow.type === 'Rabbit'">
                  <v-col cols="12" v-if="newFlow.direction === 1 || newFlow.direction === 3">
                    <v-text-field
                      v-model="newFlow.recvQueue"
                      label="صف دریافت"
                      variant="outlined"
                      density="compact"
                      :rules="[rules.required]"
                      required
                    ></v-text-field>
                  </v-col>

                  <v-col cols="12" v-if="newFlow.direction === 2 || newFlow.direction === 3">
                    <v-text-field
                      v-model="newFlow.sendExchange"
                      label="صف ارسال"
                      variant="outlined"
                      density="compact"
                      :rules="[rules.required]"
                      required
                    ></v-text-field>
                  </v-col>
                </template>
              </v-row>
            </v-form>
          </div>
        </v-container>
      </v-card-text>

      <v-divider></v-divider>

      <v-card-actions class="pa-4">
        <v-spacer></v-spacer>
        <v-btn variant="outlined" @click="closeDialog"> لغو </v-btn>
        <v-btn color="primary" :loading="creating" @click="createFlow"> ایجاد ارتباط </v-btn>
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
  flows?: any[]
}

const props = withDefaults(defineProps<Props>(), {
  flows: () => [],
})

// Emits
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'flow-created': [flow: any]
}>()

// Composables
const { request } = useApi()

// Local state
const creating = ref(false)
const flowForm = ref()

const newFlow = ref({
  type: 'UDP' as 'UDP' | 'Rabbit',
  title: '',
  addr: '',
  port: 8080,
  direction: 1 as 1 | 2 | 3,
  recvQueue: '',
  sendExchange: '',
})

// Computed
const dialog = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value),
})

// Validation rules
const rules = {
  required: (value: any) => !!value || 'این فیلد الزامی است',
  port: (value: number) => {
    if (!value) return 'پورت الزامی است'
    if (value < 1 || value > 65535) return 'پورت باید بین 1 تا 65535 باشد'
    return true
  },
}

// Methods
const getFlowTypeText = (type: string) => {
  switch (type) {
    case 'UDP':
      return 'UDP'
    case 'Rabbit':
      return 'RabbitMQ'
    default:
      return type
  }
}

const getFlowDirectionText = (direction: number) => {
  switch (direction) {
    case 1:
      return 'ورودی'
    case 2:
      return 'خروجی'
    case 3:
      return 'دوطرفه'
    default:
      return 'نامشخص'
  }
}

const getFlowTypeColor = (type: string) => {
  switch (type) {
    case 'UDP':
      return 'primary'
    case 'Rabbit':
      return 'secondary'
    default:
      return 'grey'
  }
}

const getFlowTypeIcon = (type: string) => {
  switch (type) {
    case 'UDP':
      return 'mdi-network'
    case 'Rabbit':
      return 'mdi-rabbit'
    default:
      return 'mdi-help'
  }
}

const resetForm = () => {
  newFlow.value = {
    type: 'UDP' as 'UDP' | 'Rabbit',
    title: '',
    addr: '',
    port: 8080,
    direction: 1 as 1 | 2 | 3,
    recvQueue: '',
    sendExchange: '',
  }
  flowForm.value?.resetValidation()
}

const createFlow = async () => {
  if (!flowForm.value) return

  const { valid } = await flowForm.value.validate()
  if (!valid) return

  creating.value = true

  try {
    const flowData: any = { ...newFlow.value }

    // Clean up unused fields based on type
    if (flowData.type === 'UDP') {
      flowData.recvQueue = undefined
      flowData.sendExchange = undefined
    } else if (flowData.type === 'Rabbit') {
      flowData.port = undefined
      // Clean up direction-specific fields
      if (flowData.direction === 2) {
        flowData.recvQueue = undefined
      } else if (flowData.direction === 1) {
        flowData.sendExchange = undefined
      }
    }

    // API call to create flow
    const response = await request('/api/flows', {
      method: 'POST',
      body: JSON.stringify(flowData),
    })

    if (response.success) {
      emit('flow-created', response.data)
      resetForm()
      closeDialog()
    } else {
      console.error('Failed to create flow:', response.error)
    }
  } catch (error) {
    console.error('Error creating flow:', error)
  } finally {
    creating.value = false
  }
}

const closeDialog = () => {
  resetForm()
  emit('update:modelValue', false)
}

// Watch for dialog changes to reset form
watch(dialog, newValue => {
  if (newValue) {
    resetForm()
  }
})
</script>

<style scoped>
:deep(.v-btn-toggle) {
  width: 100%;
}

:deep(.v-btn-toggle .v-btn) {
  flex: 1;
}

.v-list-item {
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 8px;
}
</style>
