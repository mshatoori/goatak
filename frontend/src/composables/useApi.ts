import { ref } from 'vue'
import type { ApiResponse, MapItem, Config, Messages, ItemsResponse, Sensor, Flow } from '@/types'

export function useApi() {
  const loading = ref(false)
  const error = ref<string | null>(null)

  const baseUrl = window.location.origin

  // Generic API request function
  const request = async <T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> => {
    loading.value = true
    error.value = null

    try {
      const response = await fetch(`${baseUrl}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      return {
        success: true,
        data,
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      error.value = errorMessage

      return {
        success: false,
        error: errorMessage,
      }
    } finally {
      loading.value = false
    }
  }

  // Configuration API
  const getConfig = async (): Promise<ApiResponse<Config>> => {
    return request<Config>('/config')
  }

  const updateConfig = async (config: Partial<Config>): Promise<ApiResponse<Config>> => {
    return request<Config>('/config', {
      method: 'POST',
      body: JSON.stringify(config),
    })
  }

  // Items API
  const getItems = async (): Promise<ApiResponse<ItemsResponse>> => {
    return request<ItemsResponse>('/items')
  }

  const createItem = async (item: MapItem): Promise<ApiResponse<ItemsResponse>> => {
    // Clean the item before sending (remove Leaflet objects)
    const cleanItem = cleanItemForApi(item)

    return request<ItemsResponse>('/items', {
      method: 'POST',
      body: JSON.stringify(cleanItem),
    })
  }

  const updateItem = async (item: MapItem): Promise<ApiResponse<ItemsResponse>> => {
    const cleanItem = cleanItemForApi(item)

    return request<ItemsResponse>(`/items/${item.uid}`, {
      method: 'PUT',
      body: JSON.stringify(cleanItem),
    })
  }

  const deleteItem = async (uid: string): Promise<ApiResponse<ItemsResponse>> => {
    return request<ItemsResponse>(`/items/${uid}`, {
      method: 'DELETE',
    })
  }

  // Messages API
  const getMessages = async (): Promise<ApiResponse<Messages>> => {
    return request<Messages>('/message')
  }

  const sendMessage = async (message: {
    from: string
    from_uid: string
    chatroom: string
    to_uid: string
    text: string
  }): Promise<ApiResponse<Messages>> => {
    return request<Messages>('/message', {
      method: 'POST',
      body: JSON.stringify(message),
    })
  }

  // Sensors API
  const getSensors = async (): Promise<ApiResponse<Sensor[]>> => {
    return request<Sensor[]>('/sensors')
  }

  // Flows API
  const getFlows = async (): Promise<ApiResponse<Flow[]>> => {
    return request<Flow[]>('/flows')
  }

  // Types API
  const getTypes = async (): Promise<ApiResponse<any>> => {
    return request<any>('/types')
  }

  // Position API
  const updatePosition = async (lat: number, lon: number): Promise<ApiResponse<any>> => {
    return request<any>('/pos', {
      method: 'POST',
      body: JSON.stringify({ lat, lon }),
    })
  }

  const updateDP = async (lat: number, lon: number, name: string): Promise<ApiResponse<any>> => {
    return request<any>('/dp', {
      method: 'POST',
      body: JSON.stringify({ lat, lon, name }),
    })
  }

  // Utility function to clean items for API
  const cleanItemForApi = (item: MapItem): any => {
    const cleaned: any = {}

    for (const key in item) {
      // Skip Leaflet objects and other non-serializable properties
      if (key !== 'marker' && key !== 'infoMarker' && key !== 'polygon') {
        cleaned[key] = (item as any)[key]
      }
    }

    return cleaned
  }

  // Batch operations
  const batchCreateItems = async (items: MapItem[]): Promise<ApiResponse<ItemsResponse>> => {
    const cleanItems = items.map(cleanItemForApi)

    return request<ItemsResponse>('/items/batch', {
      method: 'POST',
      body: JSON.stringify({ items: cleanItems }),
    })
  }

  const batchUpdateItems = async (items: MapItem[]): Promise<ApiResponse<ItemsResponse>> => {
    const cleanItems = items.map(cleanItemForApi)

    return request<ItemsResponse>('/items/batch', {
      method: 'PUT',
      body: JSON.stringify({ items: cleanItems }),
    })
  }

  const batchDeleteItems = async (uids: string[]): Promise<ApiResponse<ItemsResponse>> => {
    return request<ItemsResponse>('/items/batch', {
      method: 'DELETE',
      body: JSON.stringify({ uids }),
    })
  }

  // File upload API
  const uploadFile = async (file: File, endpoint: string): Promise<ApiResponse<any>> => {
    loading.value = true
    error.value = null

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch(`${baseUrl}${endpoint}`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      return {
        success: true,
        data,
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Upload failed'
      error.value = errorMessage

      return {
        success: false,
        error: errorMessage,
      }
    } finally {
      loading.value = false
    }
  }

  // Health check
  const healthCheck = async (): Promise<ApiResponse<{ status: string }>> => {
    return request<{ status: string }>('/health')
  }

  return {
    // State
    loading,
    error,

    // Generic
    request,

    // Configuration
    getConfig,
    updateConfig,

    // Items
    getItems,
    createItem,
    updateItem,
    deleteItem,
    batchCreateItems,
    batchUpdateItems,
    batchDeleteItems,

    // Messages
    getMessages,
    sendMessage,

    // Sensors & Flows
    getSensors,
    getFlows,

    // Types
    getTypes,

    // Position
    updatePosition,
    updateDP,

    // File upload
    uploadFile,

    // Health
    healthCheck,

    // Utilities
    cleanItemForApi,
  }
}
