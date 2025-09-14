import { ref } from 'vue'

export function useSidebar() {
  const isOpen = ref(false)
  const currentTab = ref<'overlays' | 'userInfo'>('overlays')

  const toggle = () => {
    isOpen.value = !isOpen.value
  }

  const setTab = (tab: 'overlays' | 'userInfo') => {
    currentTab.value = tab
  }

  return {
    isOpen,
    toggle,
    currentTab,
    setTab
  }
}