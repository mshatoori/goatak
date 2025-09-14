import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import type { Item, SIDC } from '../types/item'
import { getSidcFromType as getSidc } from '../utils/sidc'

export const useItemsStore = defineStore('items', () => {
  const items = ref<Map<string, Item>>(new Map())
  const types = ref<SIDC[]>([])

  interface LayerState {
    visible: boolean
    count: number
  }

  const layers = ref({
    units: { visible: true, count: 0 } as LayerState,
    points: { visible: true, count: 0 } as LayerState,
    drawings: { visible: true, count: 0 } as LayerState
  })

  interface UserConfig {
    beacon: boolean
  }

  const user = ref<UserConfig>({ beacon: false })

  const getLayerCounts = computed(() => {
    const counts: Record<string, number> = { units: 0, points: 0, drawings: 0 }
    items.value.forEach((item) => {
      if (item.type === 'unit') counts.units++
      else if (item.type === 'point') counts.points++
      else if (item.type === 'drawing') counts.drawings++
    })
    return counts
  })

  watch(getLayerCounts, (newCounts) => {
    layers.value.units.count = newCounts.units
    layers.value.points.count = newCounts.points
    layers.value.drawings.count = newCounts.drawings
  }, { immediate: true })

  const getLayerCount = (id: string): number => {
    return layers.value[id as keyof typeof layers.value]?.count || 0
  }

  const toggleLayer = (id: string): void => {
    if (layers.value[id as keyof typeof layers.value]) {
      layers.value[id as keyof typeof layers.value].visible = !layers.value[id as keyof typeof layers.value].visible
    }
  }

  const fetchItems = async (): Promise<void> => {
    try {
      const response = await fetch('/api/unit')
      if (!response.ok) throw new Error('Failed to fetch items')
      const data: any[] = await response.json()
      data.forEach((rawItem: any) => {
        const item: Item = {
          uid: rawItem.uid,
          type: rawItem.type,
          callsign: rawItem.callsign,
          lat: rawItem.lat,
          lng: rawItem.lon || 0, // Map lon to lng
          text: rawItem.text,
          how: rawItem.how,
          detail: rawItem.detail,
          local: rawItem.local || false,
          send: rawItem.send || false,
          sendMode: rawItem.sendMode,
          selectedSubnet: rawItem.selectedSubnet,
          selectedIP: rawItem.selectedIP,
          selectedUrn: rawItem.selectedUrn
        }
        items.value.set(item.uid, item)
      })
    } catch (error) {
      console.error('Failed to fetch items:', error)
    }
  }

  const createItem = async (item: Omit<Item, 'uid'>): Promise<void> => {
    const uid = crypto.randomUUID()
    const newItem: Item = { ...item, uid }
    const backendItem = { ...newItem, lon: newItem.lng } // Map lng to lon for backend
    delete backendItem.lng
    try {
      const response = await fetch('/api/unit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(backendItem)
      })
      if (!response.ok) throw new Error('Failed to create item')
      items.value.set(uid, newItem)
    } catch (error) {
      console.error('Failed to create item:', error)
    }
  }

  const updateItem = async (uid: string, item: Partial<Item>): Promise<void> => {
    const existing = items.value.get(uid)
    if (!existing) return
    const updated = { ...existing, ...item }
    const backendItem = { ...updated, lon: updated.lng } // Map lng to lon
    delete backendItem.lng
    try {
      const response = await fetch(`/api/unit/${uid}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(backendItem)
      })
      if (!response.ok) throw new Error('Failed to update item')
      items.value.set(uid, updated)
    } catch (error) {
      console.error('Failed to update item:', error)
    }
  }

  const deleteItem = async (uid: string): Promise<void> => {
    try {
      const response = await fetch(`/api/unit/${uid}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('Failed to delete item')
      items.value.delete(uid)
    } catch (error) {
      console.error('Failed to delete item:', error)
    }
  }

  const fetchUserConfig = async (): Promise<void> => {
    try {
      const response = await fetch('/api/config')
      if (!response.ok) throw new Error('Failed to fetch user config')
      const data: UserConfig = await response.json()
      user.value.beacon = data.beacon
    } catch (error) {
      console.error('Failed to fetch user config:', error)
    }
  }

  const setBeacon = (beacon: boolean): void => {
    user.value.beacon = beacon
  }

  const addBeaconItem = async (lat: number, lng: number): Promise<void> => {
    const beaconItem = {
      type: 'beacon' as const,
      symbol: 'b-a-o-pan',
      callsign: 'Emergency Beacon',
      lat,
      lng,
      text: 'Emergency Signal'
    }
    await createItem(beaconItem)
  }

  const fetchTypes = async (): Promise<void> => {
    try {
      const response = await fetch('/api/types')
      if (!response.ok) throw new Error('Failed to fetch types')
      types.value = await response.json()
    } catch (error) {
      console.error('Failed to fetch types:', error)
    }
  }

  const getSidcFromType = (type: string): string => {
    return getSidc(type)
  }

  return { items, types, layers, user, getLayerCount, toggleLayer, fetchItems, createItem, updateItem, deleteItem, fetchTypes, getSidcFromType, fetchUserConfig, setBeacon, addBeaconItem }
})