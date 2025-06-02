<template>
  <v-navigation-drawer
    v-model="isOpen"
    :rail="isCollapsed"
    :width="400"
    :rail-width="56"
    permanent
    class="sidebar"
  >
    <!-- Sidebar header -->
    <v-list-item class="sidebar-header">
      <template v-slot:prepend>
        <v-icon color="primary">mdi-map-marker-radius</v-icon>
      </template>

      <v-list-item-title v-if="!isCollapsed" class="text-h6 font-weight-bold">
        GoATAK
      </v-list-item-title>

      <template v-slot:append>
        <v-btn icon size="small" @click="toggleCollapse">
          <v-icon>{{ isCollapsed ? 'mdi-chevron-right' : 'mdi-chevron-left' }}</v-icon>
        </v-btn>
      </template>
    </v-list-item>

    <v-divider></v-divider>

    <!-- Stats overview when not collapsed -->
    <div v-if="!isCollapsed" class="pa-3">
      <v-row dense>
        <v-col cols="6">
          <v-card variant="tonal" color="primary">
            <v-card-text class="text-center pa-2">
              <div class="text-h6">{{ unitsCount }}</div>
              <div class="text-caption">واحدها</div>
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="6">
          <v-card variant="tonal" color="success">
            <v-card-text class="text-center pa-2">
              <div class="text-h6">{{ pointsCount }}</div>
              <div class="text-caption">نقاط</div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <v-row dense class="mt-1">
        <v-col cols="6">
          <v-card variant="tonal" color="warning">
            <v-card-text class="text-center pa-2">
              <div class="text-h6">{{ casevacCount }}</div>
              <div class="text-caption">CASEVAC</div>
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="6">
          <v-card variant="tonal" color="info">
            <v-card-text class="text-center pa-2">
              <div class="text-h6">{{ unreadMessages }}</div>
              <div class="text-caption">پیام‌ها</div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </div>

    <v-divider v-if="!isCollapsed"></v-divider>

    <!-- Navigation tabs -->
    <v-tabs
      v-model="activeTab"
      direction="vertical"
      color="primary"
      :show-arrows="false"
      class="sidebar-tabs"
    >
      <v-tab value="units" :class="{ 'rail-tab': isCollapsed }">
        <v-icon>mdi-account-group</v-icon>
        <span v-if="!isCollapsed" class="mr-2">واحدها</span>
        <v-badge
          v-if="!isCollapsed && unitsCount > 0"
          :content="unitsCount"
          color="primary"
          inline
        ></v-badge>
      </v-tab>

      <v-tab value="points" :class="{ 'rail-tab': isCollapsed }">
        <v-icon>mdi-map-marker</v-icon>
        <span v-if="!isCollapsed" class="mr-2">نقاط</span>
        <v-badge
          v-if="!isCollapsed && pointsCount > 0"
          :content="pointsCount"
          color="success"
          inline
        ></v-badge>
      </v-tab>

      <v-tab value="casevac" :class="{ 'rail-tab': isCollapsed }">
        <v-icon>mdi-medical-bag</v-icon>
        <span v-if="!isCollapsed" class="mr-2">CASEVAC</span>
        <v-badge
          v-if="!isCollapsed && casevacCount > 0"
          :content="casevacCount"
          color="warning"
          inline
        ></v-badge>
      </v-tab>

      <v-tab value="drawings" :class="{ 'rail-tab': isCollapsed }">
        <v-icon>mdi-draw</v-icon>
        <span v-if="!isCollapsed" class="mr-2">نقشه‌ها</span>
        <v-badge
          v-if="!isCollapsed && drawingsCount > 0"
          :content="drawingsCount"
          color="info"
          inline
        ></v-badge>
      </v-tab>

      <v-tab value="messages" :class="{ 'rail-tab': isCollapsed }">
        <v-icon>mdi-message</v-icon>
        <span v-if="!isCollapsed" class="mr-2">پیام‌ها</span>
        <v-badge
          v-if="!isCollapsed && unreadMessages > 0"
          :content="unreadMessages"
          color="error"
          inline
        ></v-badge>
      </v-tab>

      <v-tab value="settings" :class="{ 'rail-tab': isCollapsed }">
        <v-icon>mdi-cog</v-icon>
        <span v-if="!isCollapsed" class="mr-2">تنظیمات</span>
      </v-tab>
    </v-tabs>

    <!-- Tab content -->
    <v-window v-model="activeTab" class="sidebar-content">
      <!-- Units tab -->
      <v-window-item value="units">
        <div v-if="!isCollapsed" class="pa-3">
          <div class="d-flex justify-space-between align-center mb-3">
            <h6 class="text-h6">واحدها</h6>
            <v-btn icon size="small" color="primary" @click="$emit('add-unit')">
              <v-icon>mdi-plus</v-icon>
            </v-btn>
          </div>

          <v-text-field
            v-model="unitsSearch"
            prepend-inner-icon="mdi-magnify"
            label="جستجو..."
            variant="outlined"
            density="compact"
            hide-details
            clearable
          ></v-text-field>

          <v-list density="compact" class="mt-2">
            <v-list-item
              v-for="unit in filteredUnits"
              :key="unit.uid"
              :active="selectedItemUid === unit.uid"
              @click="selectItem(unit)"
              class="unit-item"
            >
              <template v-slot:prepend>
                <v-avatar size="32">
                  <img v-if="unit.sidc" :src="getMilIcon(unit)" :alt="unit.callsign" />
                  <v-icon v-else>mdi-account</v-icon>
                </v-avatar>
              </template>

              <v-list-item-title>{{ getUnitName(unit) }}</v-list-item-title>
              <v-list-item-subtitle>{{ unit.type }}</v-list-item-subtitle>

              <template v-slot:append>
                <v-chip v-if="unit.status" :color="getStatusColor(unit.status)" size="x-small">
                  {{ unit.status }}
                </v-chip>
              </template>
            </v-list-item>
          </v-list>
        </div>
      </v-window-item>

      <!-- Points tab -->
      <v-window-item value="points">
        <div v-if="!isCollapsed" class="pa-3">
          <div class="d-flex justify-space-between align-center mb-3">
            <h6 class="text-h6">نقاط</h6>
            <v-btn icon size="small" color="success" @click="$emit('add-point')">
              <v-icon>mdi-plus</v-icon>
            </v-btn>
          </div>

          <v-text-field
            v-model="pointsSearch"
            prepend-inner-icon="mdi-magnify"
            label="جستجو..."
            variant="outlined"
            density="compact"
            hide-details
            clearable
          ></v-text-field>

          <v-list density="compact" class="mt-2">
            <v-list-item
              v-for="point in filteredPoints"
              :key="point.uid"
              :active="selectedItemUid === point.uid"
              @click="selectItem(point)"
              class="point-item"
            >
              <template v-slot:prepend>
                <v-icon color="success">mdi-map-marker</v-icon>
              </template>

              <v-list-item-title>{{ point.callsign }}</v-list-item-title>
              <v-list-item-subtitle>{{ point.type }}</v-list-item-subtitle>
            </v-list-item>
          </v-list>
        </div>
      </v-window-item>

      <!-- CASEVAC tab -->
      <v-window-item value="casevac">
        <div v-if="!isCollapsed" class="pa-3">
          <div class="d-flex justify-space-between align-center mb-3">
            <h6 class="text-h6">CASEVAC</h6>
            <v-btn icon size="small" color="warning" @click="$emit('add-casevac')">
              <v-icon>mdi-plus</v-icon>
            </v-btn>
          </div>

          <v-list density="compact">
            <v-list-item
              v-for="casevac in casevacs"
              :key="casevac.uid"
              :active="selectedItemUid === casevac.uid"
              @click="selectItem(casevac)"
              class="casevac-item"
            >
              <template v-slot:prepend>
                <v-icon color="warning">mdi-medical-bag</v-icon>
              </template>

              <v-list-item-title>{{ casevac.callsign }}</v-list-item-title>
              <v-list-item-subtitle>
                {{ getCasevacPriority(casevac) }}
              </v-list-item-subtitle>

              <template v-slot:append>
                <v-chip :color="getCasevacStatusColor(casevac)" size="x-small">
                  {{ casevac.status || 'pending' }}
                </v-chip>
              </template>
            </v-list-item>
          </v-list>
        </div>
      </v-window-item>

      <!-- Drawings tab -->
      <v-window-item value="drawings">
        <div v-if="!isCollapsed" class="pa-3">
          <h6 class="text-h6 mb-3">نقشه‌ها و مسیرها</h6>

          <v-list density="compact">
            <v-list-item
              v-for="drawing in drawings"
              :key="drawing.uid"
              :active="selectedItemUid === drawing.uid"
              @click="selectItem(drawing)"
              class="drawing-item"
            >
              <template v-slot:prepend>
                <v-icon :color="drawing.color || 'info'">
                  {{ drawing.category === 'route' ? 'mdi-map-marker-path' : 'mdi-vector-polygon' }}
                </v-icon>
              </template>

              <v-list-item-title>{{ drawing.callsign }}</v-list-item-title>
              <v-list-item-subtitle>{{ drawing.category }}</v-list-item-subtitle>
            </v-list-item>
          </v-list>
        </div>
      </v-window-item>

      <!-- Messages tab -->
      <v-window-item value="messages">
        <div v-if="!isCollapsed" class="pa-3">
          <h6 class="text-h6 mb-3">پیام‌ها</h6>

          <v-list density="compact">
            <v-list-item
              v-for="conversation in conversations"
              :key="conversation.uid"
              @click="openChat(conversation.uid, conversation.callsign)"
              class="message-item"
            >
              <template v-slot:prepend>
                <v-avatar size="32">
                  <v-icon>mdi-account</v-icon>
                </v-avatar>
              </template>

              <v-list-item-title>{{ conversation.callsign }}</v-list-item-title>
              <v-list-item-subtitle>
                {{ getLastMessage(conversation.uid) }}
              </v-list-item-subtitle>

              <template v-slot:append>
                <v-badge
                  v-if="getUnreadCount(conversation.uid) > 0"
                  :content="getUnreadCount(conversation.uid)"
                  color="error"
                  inline
                ></v-badge>
              </template>
            </v-list-item>
          </v-list>
        </div>
      </v-window-item>

      <!-- Settings tab -->
      <v-window-item value="settings">
        <div v-if="!isCollapsed" class="pa-3">
          <h6 class="text-h6 mb-3">تنظیمات</h6>

          <v-list>
            <v-list-item @click="$emit('toggle-theme')">
              <template v-slot:prepend>
                <v-icon>mdi-theme-light-dark</v-icon>
              </template>
              <v-list-item-title>تغییر تم</v-list-item-title>
            </v-list-item>

            <v-list-item @click="$emit('toggle-direction')">
              <template v-slot:prepend>
                <v-icon>mdi-format-align-right</v-icon>
              </template>
              <v-list-item-title>تغییر جهت</v-list-item-title>
            </v-list-item>

            <v-list-item @click="$emit('open-overlays')">
              <template v-slot:prepend>
                <v-icon>mdi-layers</v-icon>
              </template>
              <v-list-item-title>لایه‌های نقشه</v-list-item-title>
            </v-list-item>
          </v-list>
        </div>
      </v-window-item>
    </v-window>
  </v-navigation-drawer>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useUnitsStore } from '@/stores/unitsStore'
import { useCasevacStore } from '@/stores/casevacStore'
import { useWebSocket } from '@/composables/useWebSocket'
import type { MapItem } from '@/types'

// Props
interface Props {
  collapsed?: boolean
  selectedItemUid?: string | null
}

const props = withDefaults(defineProps<Props>(), {
  collapsed: false,
  selectedItemUid: null,
})

// Emits
const emit = defineEmits<{
  'update:collapsed': [value: boolean]
  'item-selected': [item: MapItem | null]
  'add-unit': []
  'add-point': []
  'add-casevac': []
  'toggle-theme': []
  'toggle-direction': []
  'open-overlays': []
  'open-chat': [uid: string, callsign: string]
}>()

// Stores
const unitsStore = useUnitsStore()
const casevacStore = useCasevacStore()
const webSocket = useWebSocket()

// Local state
const isOpen = ref(true)
const isCollapsed = computed({
  get: () => props.collapsed,
  set: (value: boolean) => emit('update:collapsed', value),
})

const activeTab = ref('units')
const unitsSearch = ref('')
const pointsSearch = ref('')

// Data
const units = computed(() => unitsStore.getItemsByCategory('unit'))
const points = computed(() => unitsStore.getItemsByCategory('point'))
const casevacs = computed(() =>
  unitsStore.getItemsByCategory('report').filter(item => item.type === 'b-r-f-h-c')
)
const drawings = computed(() => [
  ...unitsStore.getItemsByCategory('drawing'),
  ...unitsStore.getItemsByCategory('route'),
])

// Filtered data
const filteredUnits = computed(() => {
  if (!unitsSearch.value) return units.value
  return units.value.filter(
    unit =>
      unit.callsign.toLowerCase().includes(unitsSearch.value.toLowerCase()) ||
      unit.type.toLowerCase().includes(unitsSearch.value.toLowerCase())
  )
})

const filteredPoints = computed(() => {
  if (!pointsSearch.value) return points.value
  return points.value.filter(
    point =>
      point.callsign.toLowerCase().includes(pointsSearch.value.toLowerCase()) ||
      point.type.toLowerCase().includes(pointsSearch.value.toLowerCase())
  )
})

// Counts
const unitsCount = computed(() => units.value.length)
const pointsCount = computed(() => points.value.length)
const casevacCount = computed(() => casevacs.value.length)
const drawingsCount = computed(() => drawings.value.length)
const unreadMessages = computed(() => webSocket.unreadMessageCount.value)

// Conversations (simplified - would need proper implementation)
const conversations = computed(() => {
  // This would be derived from actual message data
  return units.value.filter(unit => unit.uid !== unitsStore.items.get('self')?.uid)
})

// Methods
const toggleCollapse = () => {
  isCollapsed.value = !isCollapsed.value
}

const selectItem = (item: MapItem) => {
  emit('item-selected', item)
}

const getUnitName = (unit: MapItem) => {
  return unitsStore.getUnitName(unit)
}

const getMilIcon = (unit: MapItem) => {
  // This would use the actual military symbol generation
  return `/static/icons/${unit.type}.png`
}

const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case 'online':
      return 'success'
    case 'offline':
      return 'error'
    case 'busy':
      return 'warning'
    default:
      return 'grey'
  }
}

const getCasevacPriority = (casevac: MapItem) => {
  const detail = casevac.casevac_detail
  if (!detail) return 'Unknown'

  if (detail.urgent && detail.urgent > 0) return `${detail.urgent} بحرانی`
  if (detail.priority && detail.priority > 0) return `${detail.priority} بااولویت`
  if (detail.routine && detail.routine > 0) return `${detail.routine} روتین`

  return 'بدون بیمار'
}

const getCasevacStatusColor = (casevac: MapItem) => {
  switch (casevac.status) {
    case 'pending':
      return 'warning'
    case 'in-progress':
      return 'info'
    case 'completed':
      return 'success'
    case 'cancelled':
      return 'error'
    default:
      return 'grey'
  }
}

const openChat = (uid: string, callsign: string) => {
  emit('open-chat', uid, callsign)
}

const getUnreadCount = (uid: string) => {
  return webSocket.getUnreadCountForUser(uid)
}

const getLastMessage = (uid: string) => {
  const messages = webSocket.getMessagesForUser(uid)
  if (messages.length === 0) return 'پیامی وجود ندارد'

  const lastMessage = messages[messages.length - 1]
  return lastMessage.text.length > 30 ? lastMessage.text.substring(0, 30) + '...' : lastMessage.text
}

// Watch for tab changes when collapsed
watch(isCollapsed, collapsed => {
  if (collapsed) {
    // Auto-expand when clicking tabs in rail mode
    // This would be handled by click events on tabs
  }
})
</script>

<style scoped>
.sidebar {
  border-left: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.sidebar-header {
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.sidebar-tabs {
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.sidebar-content {
  height: calc(100vh - 200px);
  overflow-y: auto;
}

.rail-tab {
  min-width: 56px !important;
  justify-content: center;
}

.unit-item:hover,
.point-item:hover,
.casevac-item:hover,
.drawing-item:hover,
.message-item:hover {
  background-color: rgba(var(--v-theme-primary), 0.1);
}

:deep(.v-navigation-drawer__content) {
  display: flex;
  flex-direction: column;
}

:deep(.v-tabs--vertical .v-tab) {
  justify-content: flex-start;
}

:deep(.v-tabs--vertical.rail-mode .v-tab) {
  justify-content: center;
}
</style>
