import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useWebSocketStore } from '@/stores/websocketStore'
import { useApi } from './useApi'
import type { Config } from '@/types'

export function useWebSocket() {
  const websocketStore = useWebSocketStore()
  const api = useApi()

  // Auto-connect on mount
  onMounted(() => {
    connect()
    startPeriodicFetch()
  })

  // Cleanup on unmount
  onUnmounted(() => {
    disconnect()
    stopPeriodicFetch()
  })

  // Periodic fetch interval
  const fetchInterval = ref<number | null>(null)
  const fetchIntervalMs = 5000 // 5 seconds

  // Connection management
  const connect = () => {
    websocketStore.connect()
  }

  const disconnect = () => {
    websocketStore.disconnect()
  }

  const reconnect = () => {
    disconnect()
    setTimeout(connect, 1000)
  }

  // Periodic data fetching (fallback when WebSocket is not available)
  const startPeriodicFetch = () => {
    if (fetchInterval.value) return

    fetchInterval.value = window.setInterval(async () => {
      // Only fetch if WebSocket is not connected
      if (!websocketStore.isConnected) {
        await fetchAllData()
      }
    }, fetchIntervalMs)
  }

  const stopPeriodicFetch = () => {
    if (fetchInterval.value) {
      clearInterval(fetchInterval.value)
      fetchInterval.value = null
    }
  }

  // Data fetching functions
  const fetchAllData = async () => {
    try {
      await Promise.all([fetchItems(), fetchMessages(), fetchConfig()])
    } catch (error) {
      console.error('Error fetching data:', error)
    }
  }

  const fetchItems = async () => {
    const response = await api.getItems()
    if (response.success && response.data) {
      // Process items through the units store
      const { useUnitsStore } = await import('@/stores/unitsStore')
      const unitsStore = useUnitsStore()
      unitsStore.processItemsResponse(response.data)
    }
  }

  const fetchMessages = async () => {
    const response = await api.getMessages()
    if (response.success && response.data) {
      websocketStore.setMessages(response.data)
    }
  }

  const fetchConfig = async () => {
    const response = await api.getConfig()
    if (response.success && response.data) {
      const { useMapStore } = await import('@/stores/mapStore')
      const mapStore = useMapStore()
      mapStore.setConfig(response.data)
    }
  }

  const fetchSensors = async () => {
    const response = await api.getSensors()
    if (response.success && response.data) {
      // Handle sensors data
      console.log('Sensors fetched:', response.data)
    }
  }

  const fetchFlows = async () => {
    const response = await api.getFlows()
    if (response.success && response.data) {
      // Handle flows data
      console.log('Flows fetched:', response.data)
    }
  }

  const fetchTypes = async () => {
    const response = await api.getTypes()
    if (response.success && response.data) {
      const { useUnitsStore } = await import('@/stores/unitsStore')
      const unitsStore = useUnitsStore()

      // Convert response to Map if needed
      const typesMap = new Map()
      if (typeof response.data === 'object') {
        Object.entries(response.data).forEach(([key, value]) => {
          typesMap.set(key, value)
        })
      }

      unitsStore.setTypes(typesMap)
    }
  }

  // Message sending
  const sendMessage = async (to_uid: string, chatroom: string, text: string, config: Config) => {
    return websocketStore.sendChatMessage(to_uid, chatroom, text, config.callsign, config.uid)
  }

  // Position updates
  const updatePosition = async (lat: number, lon: number) => {
    const response = await api.updatePosition(lat, lon)
    return response.success
  }

  const updateDP = async (lat: number, lon: number, name: string) => {
    const response = await api.updateDP(lat, lon, name)
    return response.success
  }

  // Item operations
  const saveItem = async (item: any) => {
    const response = await api.createItem(item)
    if (response.success && response.data) {
      const { useUnitsStore } = await import('@/stores/unitsStore')
      const unitsStore = useUnitsStore()
      unitsStore.processItemsResponse(response.data)
      return response.data
    }
    throw new Error(response.error || 'Failed to save item')
  }

  const deleteItem = async (uid: string) => {
    const response = await api.deleteItem(uid)
    if (response.success && response.data) {
      const { useUnitsStore } = await import('@/stores/unitsStore')
      const unitsStore = useUnitsStore()
      unitsStore.processItemsResponse(response.data)
      return response.data
    }
    throw new Error(response.error || 'Failed to delete item')
  }

  // Connection status helpers
  const isConnected = computed(() => websocketStore.isConnected)
  const isConnecting = computed(() => websocketStore.isConnecting)
  const connectionStatus = computed(() => websocketStore.connectionStatus)

  // Message helpers
  const unreadMessageCount = computed(() => websocketStore.unreadMessageCount)
  const getUnreadCountForUser = (uid: string) => websocketStore.getUnreadCountForUser(uid)
  const getMessagesForUser = (uid: string) => websocketStore.getMessagesForUser(uid)
  const markMessageAsSeen = (messageId: string) => websocketStore.markMessageAsSeen(messageId)
  const markAllMessagesAsSeen = (uid: string) => websocketStore.markAllMessagesAsSeen(uid)

  // Initialize data fetching
  const initialize = async () => {
    try {
      // Fetch initial data
      await fetchAllData()
      await fetchSensors()
      await fetchFlows()
      await fetchTypes()

      console.log('WebSocket composable initialized')
    } catch (error) {
      console.error('Failed to initialize WebSocket composable:', error)
    }
  }

  // Health check
  const checkHealth = async () => {
    const response = await api.healthCheck()
    return response.success
  }

  return {
    // Connection management
    connect,
    disconnect,
    reconnect,
    isConnected,
    isConnecting,
    connectionStatus,

    // Data fetching
    fetchAllData,
    fetchItems,
    fetchMessages,
    fetchConfig,
    fetchSensors,
    fetchFlows,
    fetchTypes,
    initialize,

    // Operations
    sendMessage,
    updatePosition,
    updateDP,
    saveItem,
    deleteItem,

    // Messages
    unreadMessageCount,
    getUnreadCountForUser,
    getMessagesForUser,
    markMessageAsSeen,
    markAllMessagesAsSeen,

    // Health
    checkHealth,

    // Periodic fetch control
    startPeriodicFetch,
    stopPeriodicFetch,
  }
}
