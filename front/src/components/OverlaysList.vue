<![CDATA[
<template dir="rtl">
  <v-list>
    <v-list-item>
      <template #prepend>
        <v-checkbox
          :model-value="store.layers.units.visible"
          @click="store.toggleLayer('units')"
          color="primary"
          hide-details
        />
      </template>
      <v-list-item-title>
        Units ({{ store.getLayerCount('units') }})
      </v-list-item-title>
    </v-list-item>
    <v-list-item>
      <template #prepend>
        <v-checkbox
          :model-value="store.layers.points.visible"
          @click="store.toggleLayer('points')"
          color="primary"
          hide-details
        />
      </template>
      <v-list-item-title>
        Points ({{ store.getLayerCount('points') }})
      </v-list-item-title>
    </v-list-item>
    <v-list-item>
      <template #prepend>
        <v-checkbox
          :model-value="store.layers.drawings.visible"
          @click="store.toggleLayer('drawings')"
          color="primary"
          hide-details
        />
      </template>
      <v-list-item-title>
        Drawings ({{ store.getLayerCount('drawings') }})
      </v-list-item-title>
    </v-list-item>
  </v-list>
</template>

<script setup lang="ts">
import { useItemsStore } from '@/stores/itemsStore'

interface LayerVisibility {
  visible: boolean
}

const store = useItemsStore()
</script>

<style scoped lang="scss">
:deep(.v-list-item) {
  direction: rtl;
  text-align: right;
}

:deep(.v-list-item-title) {
  font-family: 'Vazirmatn', sans-serif;
}
</style>
]]>