<![CDATA[
<template dir="rtl">
  <v-tabs
    v-model="currentTab"
    color="primary"
    class="vazirmatn-tabs"
  >
    <v-tab value="overlays">Overlays</v-tab>
    <v-tab value="userInfo">User Info</v-tab>
  </v-tabs>
  <v-window v-model="currentTab">
    <v-window-item value="overlays">
      <OverlaysList />
    </v-window-item>
    <v-window-item value="userInfo">
      <UserInfo />
    </v-window-item>
  </v-window>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { VTabs, VTab, VWindow, VWindowItem } from 'vuetify/components'
import OverlaysList from './OverlaysList.vue'
import UserInfo from './UserInfo.vue'

const currentTab = ref<'overlays' | 'userInfo'>('overlays')
</script>

<style scoped lang="scss">
.vazirmatn-tabs :deep(.v-tab__content) {
  font-family: 'Vazirmatn', sans-serif;
}

.pa-4 {
  direction: rtl;
  text-align: right;
}
</style>
]]>