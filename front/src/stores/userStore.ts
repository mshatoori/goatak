import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useUserStore = defineStore('user', () => {
  const callsign = ref('')
  const role = ref('Observer')
  const beacon = ref(false)

  const fetchConfig = async () => {
    try {
      const res = await fetch('/api/config')
      if (res.ok) {
        const data = await res.json()
        callsign.value = data.callsign || ''
        role.value = data.role || 'Observer'
        beacon.value = data.beacon || false
      }
    } catch (e) {
      console.error('Failed to fetch config', e)
    }
  }

  const updateConfig = async (config: { callsign: string, role: string, beacon: boolean }) => {
    callsign.value = config.callsign
    role.value = config.role
    beacon.value = config.beacon
    try {
      await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      })
    } catch (e) {
      console.error('Failed to update config', e)
    }
  }

  return { callsign, role, beacon, fetchConfig, updateConfig }
})