import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useUiStore = defineStore('ui', () => {
  const showUnits = ref(true)
  const showPoints = ref(true)

  return { showUnits, showPoints }
})