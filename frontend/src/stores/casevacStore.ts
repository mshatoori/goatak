import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { MapItem, CasevacDetail } from '@/types'

export const useCasevacStore = defineStore('casevac', () => {
  // State
  const casevacLocation = ref<any>(null) // L.LatLng
  const casevacMarker = ref<any>(null) // L.Marker
  const activeCasevacs = ref<Map<string, MapItem>>(new Map())

  // Getters
  const allCasevacs = computed(() => Array.from(activeCasevacs.value.values()))
  const casevacCount = computed(() => activeCasevacs.value.size)

  const getCasevacByUid = computed(() => (uid: string) => {
    return activeCasevacs.value.get(uid)
  })

  const getCasevacsByStatus = computed(() => (status: string) => {
    return Array.from(activeCasevacs.value.values())
      .filter(casevac => casevac.status === status)
      .sort(
        (a, b) => new Date(b.start_time || '').getTime() - new Date(a.start_time || '').getTime()
      )
  })

  const getCasevacsByPriority = computed(() => (priority: 'urgent' | 'priority' | 'routine') => {
    return Array.from(activeCasevacs.value.values())
      .filter(casevac => {
        const detail = casevac.casevac_detail
        if (!detail) return false

        switch (priority) {
          case 'urgent':
            return (detail.urgent || 0) > 0
          case 'priority':
            return (detail.priority || 0) > 0
          case 'routine':
            return (detail.routine || 0) > 0
          default:
            return false
        }
      })
      .sort(
        (a, b) => new Date(b.start_time || '').getTime() - new Date(a.start_time || '').getTime()
      )
  })

  // Actions
  const setCasevacLocation = (location: any) => {
    casevacLocation.value = location
  }

  const setCasevacMarker = (marker: any) => {
    casevacMarker.value = marker
  }

  const addCasevac = (casevac: MapItem) => {
    if (casevac.category === 'report' && casevac.type === 'b-r-f-h-c') {
      activeCasevacs.value.set(casevac.uid, casevac)
    }
  }

  const updateCasevac = (casevac: MapItem) => {
    if (activeCasevacs.value.has(casevac.uid)) {
      activeCasevacs.value.set(casevac.uid, casevac)
    }
  }

  const removeCasevac = (uid: string) => {
    activeCasevacs.value.delete(uid)
  }

  const clearCasevacs = () => {
    activeCasevacs.value.clear()
  }

  // CASEVAC creation helpers
  const createCasevacItem = (
    lat: number,
    lon: number,
    configUid?: string,
    configCallsign?: string
  ): MapItem => {
    const now = new Date()
    const uid = `MED.${now.getDay()}.${now.getHours()}${now.getMinutes()}${now.getSeconds()}`

    const casevac: MapItem = {
      uid,
      category: 'report',
      callsign: uid,
      type: 'b-r-f-h-c',
      lat,
      lon,
      hae: 0,
      speed: 0,
      course: 0,
      status: 'pending',
      text: '',
      remarks: '',
      local: true,
      send: true,
      isNew: true,
      start_time: now.toISOString(),
      last_seen: now.toISOString(),
      stale_time: new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year from now
      casevac_detail: createDefaultCasevacDetail(),
    }

    if (configUid && configCallsign) {
      casevac.parent_uid = configUid
      casevac.parent_callsign = configCallsign
    }

    return casevac
  }

  const createDefaultCasevacDetail = (): CasevacDetail => {
    return {
      casevac: true,
      freq: 0,
      urgent: 0,
      priority: 0,
      routine: 0,
      hoist: false,
      extraction_equipment: false,
      ventilator: false,
      equipment_other: false,
      equipment_detail: '',
      litter: 0,
      ambulatory: 0,
      security: 0,
      hlz_marking: 0,
      us_military: 0,
      us_civilian: 0,
      nonus_military: 0,
      nonus_civilian: 0,
      epw: 0,
      child: 0,
    }
  }

  // Validation helpers
  const validateCasevacData = (casevac: MapItem): { valid: boolean; errors: string[] } => {
    const errors: string[] = []

    if (!casevac.lat || !casevac.lon) {
      errors.push('Location is required')
    }

    if (!casevac.casevac_detail) {
      errors.push('CASEVAC details are required')
      return { valid: false, errors }
    }

    const detail = casevac.casevac_detail
    const totalPatients = (detail.urgent || 0) + (detail.priority || 0) + (detail.routine || 0)

    if (totalPatients === 0) {
      errors.push('At least one patient must be specified')
    }

    const totalByType =
      (detail.us_military || 0) +
      (detail.us_civilian || 0) +
      (detail.nonus_military || 0) +
      (detail.nonus_civilian || 0) +
      (detail.epw || 0) +
      (detail.child || 0)

    if (totalByType !== totalPatients) {
      errors.push('Patient type counts must match total patient count')
    }

    const totalByMobility = (detail.litter || 0) + (detail.ambulatory || 0)
    if (totalByMobility !== totalPatients) {
      errors.push('Patient mobility counts must match total patient count')
    }

    if (detail.equipment_other && !detail.equipment_detail?.trim()) {
      errors.push('Equipment details are required when "Other Equipment" is selected')
    }

    return {
      valid: errors.length === 0,
      errors,
    }
  }

  // Statistics
  const getCasevacStats = computed(() => {
    const stats = {
      total: activeCasevacs.value.size,
      urgent: 0,
      priority: 0,
      routine: 0,
      pending: 0,
      inProgress: 0,
      completed: 0,
      totalPatients: 0,
      totalLitter: 0,
      totalAmbulatory: 0,
    }

    Array.from(activeCasevacs.value.values()).forEach(casevac => {
      const detail = casevac.casevac_detail
      if (detail) {
        stats.urgent += detail.urgent || 0
        stats.priority += detail.priority || 0
        stats.routine += detail.routine || 0
        stats.totalPatients += (detail.urgent || 0) + (detail.priority || 0) + (detail.routine || 0)
        stats.totalLitter += detail.litter || 0
        stats.totalAmbulatory += detail.ambulatory || 0
      }

      switch (casevac.status) {
        case 'pending':
          stats.pending++
          break
        case 'in-progress':
          stats.inProgress++
          break
        case 'completed':
          stats.completed++
          break
      }
    })

    return stats
  })

  return {
    // State
    casevacLocation,
    casevacMarker,
    activeCasevacs,

    // Getters
    allCasevacs,
    casevacCount,
    getCasevacByUid,
    getCasevacsByStatus,
    getCasevacsByPriority,
    getCasevacStats,

    // Actions
    setCasevacLocation,
    setCasevacMarker,
    addCasevac,
    updateCasevac,
    removeCasevac,
    clearCasevacs,

    // Helpers
    createCasevacItem,
    createDefaultCasevacDetail,
    validateCasevacData,
  }
})
