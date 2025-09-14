<template>
  <v-card>
    <v-card-title>Point Details</v-card-title>
    <v-card-text>
      <v-form @submit.prevent="save">
        <v-text-field v-model="localItem.callsign" label="Name" />
        <v-text-field v-model.number="localItem.lat" label="Latitude" type="number" />
        <v-text-field v-model.number="localItem.lng" label="Longitude" type="number" />
        <v-textarea v-model="localItem.text" label="Description" />
      </v-form>
    </v-card-text>
    <v-card-actions>
      <v-spacer />
      <v-btn color="primary" @click="save">Save</v-btn>
      <v-btn color="error" v-if="localItem.uid" @click="deleteItem">Delete</v-btn>
    </v-card-actions>
  </v-card>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import type { Item } from '../types/item'
import { useItemsStore } from '../stores/itemsStore'

const props = defineProps<{
  item: Item | null
}>()

const emit = defineEmits<{
  (e: 'save', item: Item): void
  (e: 'delete', uid: string): void
}>()

const store = useItemsStore()
const localItem = ref<Item>({ ...props.item || { lat: 0, lng: 0, callsign: '', type: 'point' } })

const save = () => {
  emit('save', localItem.value)
}

const deleteItem = () => {
  if (localItem.value.uid) {
    emit('delete', localItem.value.uid)
  }
}

watch(() => props.item, (newItem) => {
  localItem.value = newItem ? { ...newItem } : { lat: 0, lng: 0, callsign: '', type: 'point' }
})
</script>