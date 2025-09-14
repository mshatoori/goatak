<![CDATA[
<template dir="rtl">
  <v-card class="pa-4 elevation-2" dir="rtl">
    <v-card-title class="vazirmatn-title">
      تنظیمات کاربر
    </v-card-title>
    <v-card-text>
      <v-switch
        v-model="beaconEnabled"
        label="فعال‌سازی بیکن"
        color="primary"
        :loading="updating"
        @update:modelValue="handleBeaconToggle"
      ></v-switch>
      <v-btn
        color="error"
        block
        class="mt-4"
        :loading="emergencyLoading"
        @click="handleEmergency"
      >
        اضطراری
      </v-btn>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { VCard, VCardTitle, VCardText, VSwitch, VBtn } from 'vuetify/components'
import { useItemsStore } from '@/stores/itemsStore'

interface UserConfig {
  beacon: boolean
}

const store = useItemsStore()
const beaconEnabled = ref(false)
const updating = ref(false)
const emergencyLoading = ref(false)

const handleBeaconToggle = async (beacon: boolean): Promise<void> => {
  updating.value = true
  try {
    const response = await fetch('/api/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ beacon })
    })
    if (!response.ok) throw new Error('Failed to update config')
    store.setBeacon(beacon)
  } catch (error) {
    console.error('Failed to update beacon:', error)
    beaconEnabled.value = store.user.beacon // Revert on error
  } finally {
    updating.value = false
  }
}

const handleEmergency = async (): Promise<void> => {
  if (!navigator.geolocation) {
    console.error('Geolocation not supported')
    return
  }
  emergencyLoading.value = true
  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const lat = position.coords.latitude
      const lng = position.coords.longitude
      try {
        // POST to /api/emergency
        const response = await fetch('/api/emergency', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lat, lng })
        })
        if (!response.ok) throw new Error('Failed to send emergency')
        // Add to store
        await store.addBeaconItem(lat, lng)
      } catch (error) {
        console.error('Failed to handle emergency:', error)
      } finally {
        emergencyLoading.value = false
      }
    },
    (error) => {
      console.error('Geolocation error:', error)
      emergencyLoading.value = false
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
  )
}

onMounted(() => {
  beaconEnabled.value = store.user.beacon
  store.fetchUserConfig().then(() => {
    beaconEnabled.value = store.user.beacon
  })
})
</script>

<style scoped lang="scss">
.vazirmatn-title {
  font-family: 'Vazirmatn', sans-serif;
  direction: rtl;
  text-align: right;
}

:deep(.v-switch__track) {
  direction: rtl;
}

:deep(.v-btn) {
  font-family: 'Vazirmatn', sans-serif;
}
</style>
]]>