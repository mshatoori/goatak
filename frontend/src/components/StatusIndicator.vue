<template>
  <div class="status-indicator">
    <v-card variant="outlined" class="status-card" :class="statusClass">
      <v-card-text class="pa-3">
        <div class="d-flex align-center">
          <!-- Status Icon -->
          <v-avatar :color="statusColor" size="32" class="me-3">
            <v-icon color="white" size="18">
              {{ statusIcon }}
            </v-icon>
          </v-avatar>

          <!-- Status Info -->
          <div class="flex-grow-1">
            <div class="status-title">{{ title }}</div>
            <div class="status-subtitle">{{ subtitle }}</div>
          </div>

          <!-- Additional Info -->
          <div v-if="showDetails" class="status-details">
            <v-chip :color="statusColor" size="small" variant="tonal">
              {{ statusText }}
            </v-chip>
          </div>
        </div>

        <!-- Progress Bar (if applicable) -->
        <v-progress-linear
          v-if="showProgress && progress !== null"
          :model-value="progress"
          :color="statusColor"
          height="4"
          class="mt-2"
        ></v-progress-linear>

        <!-- Additional Metrics -->
        <div v-if="metrics && metrics.length > 0" class="metrics mt-2">
          <v-row dense>
            <v-col v-for="metric in metrics" :key="metric.label" cols="auto">
              <v-chip size="x-small" variant="outlined" :color="metric.color || 'default'">
                <v-icon start size="x-small">{{ metric.icon }}</v-icon>
                {{ metric.label }}: {{ metric.value }}
              </v-chip>
            </v-col>
          </v-row>
        </div>
      </v-card-text>
    </v-card>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

// Types
interface Metric {
  label: string
  value: string | number
  icon?: string
  color?: string
}

// Props
interface Props {
  status: 'connected' | 'disconnected' | 'connecting' | 'error' | 'warning' | 'success'
  title: string
  subtitle?: string
  showDetails?: boolean
  showProgress?: boolean
  progress?: number | null
  metrics?: Metric[]
  clickable?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  subtitle: '',
  showDetails: true,
  showProgress: false,
  progress: null,
  metrics: () => [],
  clickable: false,
})

// Emits
const emit = defineEmits<{
  click: []
}>()

// Computed
const statusColor = computed(() => {
  const colors = {
    connected: 'success',
    disconnected: 'error',
    connecting: 'warning',
    error: 'error',
    warning: 'warning',
    success: 'success',
  }
  return colors[props.status] || 'grey'
})

const statusIcon = computed(() => {
  const icons = {
    connected: 'mdi-check-circle',
    disconnected: 'mdi-close-circle',
    connecting: 'mdi-loading',
    error: 'mdi-alert-circle',
    warning: 'mdi-alert',
    success: 'mdi-check-circle',
  }
  return icons[props.status] || 'mdi-help-circle'
})

const statusText = computed(() => {
  const texts = {
    connected: 'متصل',
    disconnected: 'قطع شده',
    connecting: 'در حال اتصال',
    error: 'خطا',
    warning: 'هشدار',
    success: 'موفق',
  }
  return texts[props.status] || 'نامشخص'
})

const statusClass = computed(() => ({
  'status-connected': props.status === 'connected',
  'status-disconnected': props.status === 'disconnected',
  'status-connecting': props.status === 'connecting',
  'status-error': props.status === 'error',
  'status-warning': props.status === 'warning',
  'status-success': props.status === 'success',
  'status-clickable': props.clickable,
}))

// Methods
const handleClick = () => {
  if (props.clickable) {
    emit('click')
  }
}
</script>

<style scoped>
.status-indicator {
  width: 100%;
}

.status-card {
  transition: all 0.2s ease;
  border-radius: 8px;
}

.status-card.status-clickable {
  cursor: pointer;
}

.status-card.status-clickable:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.status-title {
  font-weight: 600;
  font-size: 0.875rem;
  line-height: 1.2;
}

.status-subtitle {
  font-size: 0.75rem;
  opacity: 0.7;
  line-height: 1.2;
}

.status-details {
  text-align: right;
}

.metrics {
  margin-top: 8px;
}

/* Status-specific styling */
.status-connected {
  border-left: 4px solid rgb(var(--v-theme-success));
}

.status-disconnected {
  border-left: 4px solid rgb(var(--v-theme-error));
}

.status-connecting {
  border-left: 4px solid rgb(var(--v-theme-warning));
}

.status-error {
  border-left: 4px solid rgb(var(--v-theme-error));
}

.status-warning {
  border-left: 4px solid rgb(var(--v-theme-warning));
}

.status-success {
  border-left: 4px solid rgb(var(--v-theme-success));
}

/* Animation for connecting status */
.status-connecting .v-avatar {
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
  100% {
    opacity: 1;
  }
}

/* Responsive adjustments */
@media (max-width: 600px) {
  .status-title {
    font-size: 0.8rem;
  }

  .status-subtitle {
    font-size: 0.7rem;
  }

  .v-avatar {
    width: 28px !important;
    height: 28px !important;
  }

  .v-avatar .v-icon {
    font-size: 16px !important;
  }
}
</style>
