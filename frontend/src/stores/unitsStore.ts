import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { MapItem, ItemsResponse } from '@/types'

export const useUnitsStore = defineStore('units', () => {
  // State
  const items = ref<Map<string, MapItem>>(new Map())
  const ts = ref<number>(0)
  const types = ref<Map<string, any>>(new Map())

  // Getters
  const allItems = computed(() => Array.from(items.value.values()))
  const itemCount = computed(() => items.value.size)

  const getItemsByCategory = computed(() => (category: string) => {
    return Array.from(items.value.values())
      .filter(item => item.category === category)
      .sort((a, b) => a.callsign.toLowerCase().localeCompare(b.callsign.toLowerCase()))
  })

  const getItemByUid = computed(() => (uid: string) => {
    return items.value.get(uid)
  })

  const countByCategory = computed(() => (category: string) => {
    return Array.from(items.value.values()).filter(item => item.category === category).length
  })

  // Actions
  const setItems = (newItems: Map<string, MapItem>) => {
    items.value = newItems
    ts.value += 1
  }

  const addItem = (item: MapItem) => {
    items.value.set(item.uid, item)
    ts.value += 1
  }

  const updateItem = (item: MapItem) => {
    if (items.value.has(item.uid)) {
      items.value.set(item.uid, item)
      ts.value += 1
    }
  }

  const removeItem = (uid: string) => {
    if (items.value.has(uid)) {
      items.value.delete(uid)
      ts.value += 1
    }
  }

  const clearItems = () => {
    items.value.clear()
    ts.value += 1
  }

  // Handle item change messages from WebSocket
  const handleItemChangeMessage = (item: MapItem, isDelete = false): ItemsResponse => {
    const result: ItemsResponse = {
      added: [],
      updated: [],
      removed: [],
    }

    if (isDelete) {
      if (items.value.has(item.uid)) {
        const existingItem = items.value.get(item.uid)!
        result.removed.push(existingItem)
        removeItem(item.uid)
      }
    } else {
      if (items.value.has(item.uid)) {
        // Update existing item
        const existingItem = items.value.get(item.uid)!
        // Merge the new data with existing item
        const updatedItem = { ...existingItem, ...item }
        updateItem(updatedItem)
        result.updated.push(updatedItem)
      } else {
        // Add new item
        addItem(item)
        result.added.push(item)
      }
    }

    return result
  }

  // Process bulk items response
  const processItemsResponse = (response: ItemsResponse) => {
    response.removed.forEach(item => removeItem(item.uid))
    response.added.forEach(item => addItem(item))
    response.updated.forEach(item => updateItem(item))
  }

  // Type management
  const setTypes = (newTypes: Map<string, any>) => {
    types.value = newTypes
  }

  const getSidc = (code: string) => {
    return types.value.get(code) || null
  }

  const getRootSidc = (code: string) => {
    // Implementation for getting root SIDC
    const parts = code.split('-')
    if (parts.length > 0) {
      return getSidc(parts[0])
    }
    return null
  }

  const sidcFromType = (type: string) => {
    // Convert type to SIDC
    // This is a simplified implementation - the actual logic would be more complex
    const typeMap: Record<string, string> = {
      'a-f-G': '10031000001211000000',
      'a-h-G': '10031000001212000000',
      'a-n-G': '10031000001213000000',
      'a-u-G': '10031000001214000000',
      'a-s-G': '10031000001215000000',
      'b-m-p-s-m': '10032500001211000000',
      'b-r-f-h-c': '10033000001211000000',
      'u-d-f': '10040000001211000000',
      'b-m-r': '10050000001211000000',
    }

    return typeMap[type] || '10031000001211000000'
  }

  // Utility methods
  const nextItemNumber = (category: string): number => {
    let maxNumber = 0
    items.value.forEach(item => {
      if (item.category === category) {
        const splitParts = item.callsign.split('-')
        if (splitParts.length === 2 && ['point', 'unit', 'zone', 'route'].includes(splitParts[0])) {
          const number = parseInt(splitParts[1])
          if (!isNaN(number)) {
            maxNumber = Math.max(maxNumber, number)
          }
        }
      }
    })
    return maxNumber + 1
  }

  const getUnitName = (item: MapItem, configUid?: string): string => {
    let res = item.callsign || 'no name'
    if (configUid && item.parent_uid === configUid) {
      if (item.send === true) {
        res = '+ ' + res
      } else {
        res = '* ' + res
      }
    }
    return res
  }

  return {
    // State
    items,
    ts,
    types,

    // Getters
    allItems,
    itemCount,
    getItemsByCategory,
    getItemByUid,
    countByCategory,

    // Actions
    setItems,
    addItem,
    updateItem,
    removeItem,
    clearItems,
    handleItemChangeMessage,
    processItemsResponse,

    // Types
    setTypes,
    getSidc,
    getRootSidc,
    sidcFromType,

    // Utilities
    nextItemNumber,
    getUnitName,
  }
})
