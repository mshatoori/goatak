<template>
  <div
    class="military-symbol"
    :class="{ clickable: clickable }"
    :style="symbolStyle"
    @click="handleClick"
  >
    <div ref="symbolContainer" class="symbol-container"></div>

    <!-- Fallback icon if MilSymbol fails -->
    <v-icon v-if="showFallback" :size="size" :color="color">
      {{ fallbackIcon }}
    </v-icon>

    <!-- Symbol info tooltip -->
    <v-tooltip v-if="showTooltip && symbolInfo" activator="parent" location="top">
      <div class="symbol-tooltip">
        <div>
          <strong>{{ symbolInfo.name }}</strong>
        </div>
        <div v-if="symbolInfo.sidc">SIDC: {{ symbolInfo.sidc }}</div>
        <div v-if="symbolInfo.affiliation">{{ symbolInfo.affiliation }}</div>
        <div v-if="symbolInfo.dimension">{{ symbolInfo.dimension }}</div>
      </div>
    </v-tooltip>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue'

// Props
interface Props {
  sidc: string
  size?: number | string
  color?: string
  clickable?: boolean
  showTooltip?: boolean
  options?: Record<string, any>
}

const props = withDefaults(defineProps<Props>(), {
  size: 32,
  color: 'primary',
  clickable: false,
  showTooltip: true,
  options: () => ({}),
})

// Emits
const emit = defineEmits<{
  click: [sidc: string]
  'symbol-loaded': [symbol: any]
  'symbol-error': [error: string]
}>()

// Local state
const symbolContainer = ref<HTMLElement>()
const showFallback = ref(false)
const symbolInstance = ref<any>(null)

// Computed
const symbolStyle = computed(() => ({
  width: typeof props.size === 'number' ? `${props.size}px` : props.size,
  height: typeof props.size === 'number' ? `${props.size}px` : props.size,
  cursor: props.clickable ? 'pointer' : 'default',
}))

const symbolInfo = computed(() => {
  if (!props.sidc) return null

  return {
    name: getSymbolName(props.sidc),
    sidc: props.sidc,
    affiliation: getAffiliation(props.sidc),
    dimension: getDimension(props.sidc),
  }
})

const fallbackIcon = computed(() => {
  // Determine fallback icon based on SIDC
  const dimension = props.sidc.charAt(2)
  const affiliation = props.sidc.charAt(1)

  // Dimension-based icons
  switch (dimension) {
    case 'P': // Space
      return 'mdi-satellite-variant'
    case 'A': // Air
      return 'mdi-airplane'
    case 'G': // Ground
      return affiliation === 'H' ? 'mdi-account-group' : 'mdi-tank'
    case 'S': // Sea Surface
      return 'mdi-ship-wheel'
    case 'U': // Sea Subsurface
      return 'mdi-submarine'
    case 'F': // SOF
      return 'mdi-account-star'
    default:
      return 'mdi-map-marker'
  }
})

// Methods
const getSymbolName = (sidc: string): string => {
  // This would typically come from a symbol dictionary
  // For now, return a basic interpretation
  const dimension = getDimension(sidc)
  const affiliation = getAffiliation(sidc)

  return `${affiliation} ${dimension} Unit`
}

const getAffiliation = (sidc: string): string => {
  const affiliationCode = sidc.charAt(1)
  const affiliations: Record<string, string> = {
    P: 'Pending',
    U: 'Unknown',
    A: 'Assumed Friend',
    F: 'Friend',
    N: 'Neutral',
    S: 'Suspect',
    H: 'Hostile',
    G: 'Exercise Pending',
    W: 'Exercise Unknown',
    D: 'Exercise Friend',
    L: 'Exercise Neutral',
    M: 'Exercise Assumed Friend',
    J: 'Joker',
    K: 'Faker',
    O: 'None Specified',
  }

  return affiliations[affiliationCode] || 'Unknown'
}

const getDimension = (sidc: string): string => {
  const dimensionCode = sidc.charAt(2)
  const dimensions: Record<string, string> = {
    P: 'Space',
    A: 'Air',
    G: 'Land',
    S: 'Sea Surface',
    U: 'Sea Subsurface',
    F: 'SOF',
    X: 'Other',
    Z: 'Unknown',
  }

  return dimensions[dimensionCode] || 'Unknown'
}

const createSymbol = async () => {
  if (!symbolContainer.value || !props.sidc) return

  try {
    // Check if MilSymbol library is available
    if (typeof window !== 'undefined' && (window as any).milsymbol) {
      const MilSymbol = (window as any).milsymbol.Symbol

      const symbolOptions = {
        size: typeof props.size === 'number' ? props.size : 32,
        ...props.options,
      }

      symbolInstance.value = new MilSymbol(props.sidc, symbolOptions)

      // Clear container and add symbol
      symbolContainer.value.innerHTML = ''

      if (symbolInstance.value.isValid()) {
        const symbolElement = symbolInstance.value.asSVG()
        symbolContainer.value.appendChild(symbolElement)
        showFallback.value = false
        emit('symbol-loaded', symbolInstance.value)
      } else {
        throw new Error('Invalid SIDC')
      }
    } else {
      throw new Error('MilSymbol library not available')
    }
  } catch (error) {
    console.warn('Failed to create military symbol:', error)
    showFallback.value = true
    emit('symbol-error', error instanceof Error ? error.message : 'Unknown error')
  }
}

const handleClick = () => {
  if (props.clickable) {
    emit('click', props.sidc)
  }
}

const loadMilSymbolLibrary = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    // Check if already loaded
    if ((window as any).milsymbol) {
      resolve()
      return
    }

    // Create script element
    const script = document.createElement('script')
    script.src = '/static/js/milsymbol.js' // Adjust path as needed
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load MilSymbol library'))

    document.head.appendChild(script)
  })
}

// Lifecycle
onMounted(async () => {
  try {
    await loadMilSymbolLibrary()
    await nextTick()
    createSymbol()
  } catch (error) {
    console.warn('MilSymbol library not available, using fallback')
    showFallback.value = true
  }
})

// Watch for SIDC changes
watch(
  () => props.sidc,
  () => {
    if (props.sidc) {
      createSymbol()
    }
  }
)

// Watch for size changes
watch(
  () => props.size,
  () => {
    if (symbolInstance.value) {
      createSymbol()
    }
  }
)

// Watch for options changes
watch(
  () => props.options,
  () => {
    if (symbolInstance.value) {
      createSymbol()
    }
  },
  { deep: true }
)
</script>

<style scoped>
.military-symbol {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.military-symbol.clickable {
  cursor: pointer;
}

.military-symbol.clickable:hover {
  opacity: 0.8;
  transform: scale(1.05);
  transition: all 0.2s ease;
}

.symbol-container {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

.symbol-container :deep(svg) {
  max-width: 100%;
  max-height: 100%;
}

.symbol-tooltip {
  text-align: center;
  font-size: 0.75rem;
}

.symbol-tooltip div {
  margin-bottom: 2px;
}

.symbol-tooltip div:last-child {
  margin-bottom: 0;
}
</style>
