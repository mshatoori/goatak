<template>
  <v-app :dir="direction">
    <!-- Main layout -->
    <div class="app-layout">
      <!-- Sidebar -->
      <SidebarComponent
        v-model:collapsed="sidebarCollapsed"
        :selected-item-uid="selectedItemUid"
        @item-selected="handleItemSelected"
        @add-unit="handleAddUnit"
        @add-point="handleAddPoint"
        @add-casevac="handleAddCasevac"
        @toggle-theme="toggleTheme"
        @toggle-direction="toggleDirection"
        @open-overlays="openOverlaysDialog"
        @open-chat="openChatDialog"
      />

      <!-- Main content area -->
      <div class="main-content" :class="{ 'sidebar-collapsed': sidebarCollapsed }">
        <!-- Map -->
        <div class="map-container">
          <MapComponent
            :sidebar-collapsed="sidebarCollapsed"
            @update:sidebar-collapsed="sidebarCollapsed = $event"
            @item-selected="handleItemSelected"
            @navigation-line-toggle="handleNavigationLineToggle"
          />
        </div>

        <!-- Detail panel -->
        <div v-if="selectedItem" class="detail-panel">
          <v-card class="detail-card" elevation="4">
            <!-- Unit Details -->
            <UnitDetails
              v-if="selectedItem.category === 'unit'"
              :item="selectedItem"
              :coords="mouseCoords"
              :config="config"
              :locked-unit-uid="lockedUnitUid"
              @save="handleItemSave"
              @delete="handleItemDelete"
              @navigation-line-toggle="handleNavigationLineToggle"
            />

            <!-- Point Details -->
            <PointDetails
              v-else-if="selectedItem.category === 'point'"
              :item="selectedItem"
              :coords="mouseCoords"
              :config="config"
              :locked-unit-uid="lockedUnitUid"
              @save="handleItemSave"
              @delete="handleItemDelete"
              @navigation-line-toggle="handleNavigationLineToggle"
            />

            <!-- CASEVAC Details -->
            <CasevacDetails
              v-else-if="selectedItem.category === 'report' && selectedItem.type === 'b-r-f-h-c'"
              :item="selectedItem"
              :coords="mouseCoords"
              :config="config"
              :locked-unit-uid="lockedUnitUid"
              @save="handleItemSave"
              @delete="handleItemDelete"
              @navigation-line-toggle="handleNavigationLineToggle"
            />

            <!-- Drawing Details -->
            <DrawingDetails
              v-else-if="selectedItem.category === 'drawing' || selectedItem.category === 'route'"
              :item="selectedItem"
              :coords="mouseCoords"
              :config="config"
              :locked-unit-uid="lockedUnitUid"
              @save="handleItemSave"
              @delete="handleItemDelete"
              @navigation-line-toggle="handleNavigationLineToggle"
            />

            <!-- Generic item details fallback -->
            <v-card-text v-else>
              <h6 class="text-h6 mb-3">{{ selectedItem.callsign }}</h6>
              <p class="text-body-2">نوع: {{ selectedItem.type }}</p>
              <p class="text-body-2">دسته: {{ selectedItem.category }}</p>
            </v-card-text>

            <!-- Close button -->
            <v-btn icon size="small" class="detail-close-btn" @click="selectedItemUid = null">
              <v-icon>mdi-close</v-icon>
            </v-btn>
          </v-card>
        </div>
      </div>
    </div>

    <!-- Overlays Dialog -->
    <v-dialog v-model="overlaysDialog" max-width="500">
      <v-card>
        <v-card-title>لایه‌های نقشه</v-card-title>
        <v-card-text>
          <v-list>
            <v-list-item
              v-for="(overlay, name) in overlayControls"
              :key="name"
              @click="toggleOverlay(name as string)"
            >
              <template v-slot:prepend>
                <v-checkbox
                  :model-value="overlay.active"
                  @update:model-value="toggleOverlay(name as string)"
                  hide-details
                ></v-checkbox>
              </template>
              <v-list-item-title>{{ overlay.label }}</v-list-item-title>
            </v-list-item>
          </v-list>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn @click="overlaysDialog = false">بستن</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Chat Dialog -->
    <v-dialog v-model="chatDialog" max-width="600">
      <v-card>
        <v-card-title class="d-flex justify-space-between align-center">
          <span>گفتگو با {{ chatTarget?.callsign }}</span>
          <v-btn icon size="small" @click="chatDialog = false">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-card-title>
        <v-card-text>
          <div class="chat-messages" style="height: 300px; overflow-y: auto">
            <div
              v-for="message in chatMessages"
              :key="message.message_id"
              class="message-item mb-2"
              :class="{ 'own-message': message.from_uid === config?.uid }"
            >
              <div class="message-header text-caption">
                <strong>{{ message.from }}</strong>
                <span class="text-medium-emphasis ms-2">{{
                  formatMessageTime(message.timestamp)
                }}</span>
              </div>
              <div class="message-text">{{ message.text }}</div>
            </div>
          </div>
        </v-card-text>
        <v-card-actions>
          <v-text-field
            v-model="chatMessage"
            label="پیام..."
            variant="outlined"
            density="compact"
            hide-details
            @keyup.enter="sendChatMessage"
            class="flex-grow-1 me-2"
          ></v-text-field>
          <v-btn color="primary" @click="sendChatMessage" :disabled="!chatMessage.trim()">
            ارسال
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Loading overlay -->
    <v-overlay v-model="isLoading" class="align-center justify-center">
      <v-progress-circular color="primary" indeterminate size="64"></v-progress-circular>
    </v-overlay>

    <!-- Snackbar for notifications -->
    <v-snackbar v-model="snackbar.show" :color="snackbar.color" :timeout="snackbar.timeout">
      {{ snackbar.text }}
      <template v-slot:actions>
        <v-btn variant="text" @click="snackbar.show = false"> بستن </v-btn>
      </template>
    </v-snackbar>
  </v-app>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useTheme } from 'vuetify'
import { useAppStore } from '@/stores'
import { useMapStore } from '@/stores/mapStore'
import { useUnitsStore } from '@/stores/unitsStore'
import { useWebSocket } from '@/composables/useWebSocket'
import MapComponent from '@/components/MapComponent.vue'
import SidebarComponent from '@/components/SidebarComponent.vue'
import UnitDetails from '@/components/UnitDetails.vue'
import PointDetails from '@/components/PointDetails.vue'
import CasevacDetails from '@/components/CasevacDetails.vue'
import DrawingDetails from '@/components/DrawingDetails.vue'
import type { MapItem, NavigationLineToggleEvent, ChatMessage } from '@/types'

// Stores and composables
const appStore = useAppStore()
const mapStore = useMapStore()
const unitsStore = useUnitsStore()
const webSocket = useWebSocket()
const theme = useTheme()

// Local state
const sidebarCollapsed = ref(false)
const selectedItemUid = ref<string | null>(null)
const mouseCoords = ref<any>(null)
const overlaysDialog = ref(false)
const chatDialog = ref(false)
const chatTarget = ref<any>(null)
const chatMessage = ref('')
const isLoading = ref(false)

// Snackbar state
const snackbar = ref({
  show: false,
  text: '',
  color: 'info',
  timeout: 3000,
})

// Computed
const direction = computed(() => appStore.direction)
const selectedItem = computed(() => {
  return selectedItemUid.value ? unitsStore.getItemByUid(selectedItemUid.value) : null
})
const config = computed(() => mapStore.config)
const lockedUnitUid = computed(() => mapStore.lockedUnitUid)

const chatMessages = computed(() => {
  return chatTarget.value ? webSocket.getMessagesForUser(chatTarget.value.uid) : []
})

// Overlay controls
const overlayControls = ref({
  unit: { label: 'واحدها', active: true },
  point: { label: 'نقاط', active: true },
  drawing: { label: 'نقشه‌ها', active: true },
  route: { label: 'مسیرها', active: true },
  report: { label: 'گزارش‌ها', active: true },
  contact: { label: 'مخاطبین', active: true },
  alarm: { label: 'هشدارها', active: true },
  navigation: { label: 'خطوط ناوبری', active: true },
})

// Initialize app
onMounted(async () => {
  isLoading.value = true
  try {
    await webSocket.initialize()
    showSnackbar('اتصال برقرار شد', 'success')
  } catch (error) {
    console.error('Failed to initialize app:', error)
    showSnackbar('خطا در اتصال', 'error')
  } finally {
    isLoading.value = false
  }
})

// Watch for coordinate updates
watch(
  () => mapStore.coords,
  (newCoords: any) => {
    mouseCoords.value = newCoords
  }
)

// Watch for active item changes
watch(
  () => mapStore.activeItemUid,
  (newUid: string | null) => {
    selectedItemUid.value = newUid
  }
)

// Methods
const handleItemSelected = (item: MapItem | null) => {
  if (item) {
    selectedItemUid.value = item.uid
    mapStore.setActiveItemUid(item.uid)
  } else {
    selectedItemUid.value = null
    mapStore.setActiveItemUid(null)
  }
}

const handleAddUnit = () => {
  mapStore.setMode('add_unit')
  showSnackbar('روی نقشه کلیک کنید تا واحد جدید اضافه شود', 'info')
}

const handleAddPoint = () => {
  mapStore.setMode('add_point')
  showSnackbar('روی نقشه کلیک کنید تا نقطه جدید اضافه شود', 'info')
}

const handleAddCasevac = () => {
  mapStore.setMode('add_casevac')
  showSnackbar('روی نقشه کلیک کنید تا CASEVAC جدید اضافه شود', 'info')
}

const handleItemSave = async (item: MapItem) => {
  isLoading.value = true
  try {
    await webSocket.saveItem(item)
    showSnackbar('آیتم ذخیره شد', 'success')
  } catch (error) {
    console.error('Failed to save item:', error)
    showSnackbar('خطا در ذخیره آیتم', 'error')
  } finally {
    isLoading.value = false
  }
}

const handleItemDelete = async (uid: string) => {
  isLoading.value = true
  try {
    await webSocket.deleteItem(uid)
    selectedItemUid.value = null
    mapStore.setActiveItemUid(null)
    showSnackbar('آیتم حذف شد', 'success')
  } catch (error) {
    console.error('Failed to delete item:', error)
    showSnackbar('خطا در حذف آیتم', 'error')
  } finally {
    isLoading.value = false
  }
}

const handleNavigationLineToggle = (event: NavigationLineToggleEvent) => {
  if (event.show) {
    mapStore.showNavigationLine(event.targetItem!, event.userPosition!, event.navigationData!)
  } else {
    mapStore.hideNavigationLine()
  }
}

const toggleTheme = () => {
  theme.global.name.value = theme.global.current.value.dark ? 'light' : 'dark'
  appStore.toggleTheme()
}

const toggleDirection = () => {
  // Toggle RTL/LTR
  const isRtl = document.documentElement.dir === 'rtl'
  document.documentElement.dir = isRtl ? 'ltr' : 'rtl'
  document.documentElement.lang = isRtl ? 'en' : 'fa'
  appStore.toggleDirection()
}

const openOverlaysDialog = () => {
  overlaysDialog.value = true
}

const toggleOverlay = (overlayName: string) => {
  const overlay = overlayControls.value[overlayName as keyof typeof overlayControls.value]
  if (overlay) {
    overlay.active = !overlay.active
    mapStore.toggleOverlay(overlayName, overlay.active)
  }
}

const openChatDialog = (uid: string, callsign: string) => {
  chatTarget.value = { uid, callsign }
  chatDialog.value = true
  webSocket.markAllMessagesAsSeen(uid)
}

const sendChatMessage = async () => {
  if (!chatMessage.value.trim() || !chatTarget.value || !config.value) return

  try {
    await webSocket.sendMessage(chatTarget.value.uid, 'general', chatMessage.value, config.value)
    chatMessage.value = ''
  } catch (error) {
    console.error('Failed to send message:', error)
    showSnackbar('خطا در ارسال پیام', 'error')
  }
}

const formatMessageTime = (timestamp: string) => {
  const date = new Date(timestamp)
  return date.toLocaleTimeString('fa-IR')
}

const showSnackbar = (text: string, color: string = 'info', timeout: number = 3000) => {
  snackbar.value = {
    show: true,
    text,
    color,
    timeout,
  }
}
</script>

<style scoped>
.app-layout {
  display: flex;
  height: 100vh;
  overflow: hidden;
}

.main-content {
  flex: 1;
  display: flex;
  position: relative;
  transition: margin-left 0.3s ease;
}

.main-content.sidebar-collapsed {
  margin-left: 0;
}

.map-container {
  flex: 1;
  position: relative;
}

.detail-panel {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 400px;
  max-height: calc(100vh - 32px);
  z-index: 1000;
  pointer-events: none;
}

.detail-card {
  pointer-events: auto;
  max-height: 100%;
  overflow-y: auto;
  position: relative;
}

.detail-close-btn {
  position: absolute;
  top: 8px;
  left: 8px;
  background-color: rgba(var(--v-theme-surface), 0.9);
  backdrop-filter: blur(4px);
}

.chat-messages {
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 4px;
  padding: 8px;
}

.message-item {
  padding: 8px;
  border-radius: 8px;
  background-color: rgba(var(--v-theme-surface-variant), 0.5);
}

.message-item.own-message {
  background-color: rgba(var(--v-theme-primary), 0.1);
  margin-left: 20%;
}

.message-item:not(.own-message) {
  margin-right: 20%;
}

.message-header {
  margin-bottom: 4px;
}

.message-text {
  word-wrap: break-word;
}

/* RTL adjustments */
[dir='rtl'] .detail-panel {
  right: auto;
  left: 16px;
}

[dir='rtl'] .detail-close-btn {
  left: auto;
  right: 8px;
}

[dir='rtl'] .message-item.own-message {
  margin-left: 0;
  margin-right: 20%;
}

[dir='rtl'] .message-item:not(.own-message) {
  margin-right: 0;
  margin-left: 20%;
}

/* Responsive design */
@media (max-width: 768px) {
  .detail-panel {
    width: calc(100vw - 32px);
    max-width: 400px;
  }
}

@media (max-width: 480px) {
  .detail-panel {
    top: 8px;
    right: 8px;
    width: calc(100vw - 16px);
  }

  [dir='rtl'] .detail-panel {
    right: auto;
    left: 8px;
  }
}
</style>
