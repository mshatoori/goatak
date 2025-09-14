<template>
  <v-card>
    <v-card-title>Unit Details</v-card-title>
    <v-card-text>
      <v-form @submit.prevent="save">
        <v-text-field v-model="localItem.callsign" label="Callsign" />
        <v-select v-model="localItem.type" :items="types" label="Type" item-title="name" item-value="id" />
        <v-text-field v-model.number="localItem.lat" label="Latitude" type="number" />
        <v-text-field v-model.number="localItem.lng" label="Longitude" type="number" />
        <v-textarea v-model="localItem.text" label="Text" />
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
import { ref, computed, watch } from 'vue'
import type { Item, SIDC } from '../types/item'
import { useItemsStore } from '../stores/itemsStore'

const props = defineProps<{
  item: Item | null
}>()

const emit = defineEmits<{
  (e: 'save', item: Item): void
  (e: 'delete', uid: string): void
}>()

const store = useItemsStore()
const localItem = ref<Item>({ ...props.item || { lat: 0, lng: 0, callsign: '', type: '' } })

const types = computed(() => store.types)

const save = () => {
  emit('save', localItem.value)
}

const deleteItem = () => {
  if (localItem.value.uid) {
    emit('delete', localItem.value.uid)
  }
}

watch(() => props.item, (newItem) => {
  localItem.value = newItem ? { ...newItem } : { lat: 0, lng: 0, callsign: '', type: '' }
})
</script>