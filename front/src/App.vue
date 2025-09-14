<template>
  <v-app>
    <v-main>
      <v-container fluid class="fill-height">
        <MapView />
      </v-container>
    </v-main>
  </v-app>
</template>

<script setup lang="ts">
import MapView from './components/MapView.vue'
</script>

<style>
.fill-height { height: 100vh; }
</style>