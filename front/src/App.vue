<template>
  <v-app dir="rtl">
    <v-app-bar flat>
      <v-app-bar-nav-icon @click="toggle" />
      <v-toolbar-title>GoATK</v-toolbar-title>
    </v-app-bar>
    <v-navigation-drawer :model-value="isOpen" @update:model-value="isOpen = $event" temporary rail>
      <Sidebar />
    </v-navigation-drawer>
    <v-main>
      <v-container fluid class="fill-height">
        <MapView v-model:selected-item="selectedItem" />
      </v-container>
    </v-main>
  </v-app>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import MapView from './components/MapView.vue'
import type { Item } from './types/item'
import { VNavigationDrawer, VAppBar, VAppBarNavIcon, VToolbarTitle, VMain, VContainer } from 'vuetify/components'

import Sidebar from './components/Sidebar.vue'
import { useSidebar } from './composables/useSidebar'

const { isOpen, toggle } = useSidebar()
const selectedItem = ref<Item | null>(null)
</script>

<style>
.fill-height { height: 100vh; }
</style>