<template>
  <div class="card">
    <h5 class="card-header">لایه‌ها</h5>
    <div class="card-body">
      <ul class="list-group">
        <li
          class="list-group-item d-flex justify-content-between align-items-center"
          v-for="(overlay, name, index) in overlays"
          :key="name"
        >
          <input
            class="form-check-input me-1"
            type="checkbox"
            v-model="overlay.active"
            :id="'overlay-' + name"
          />
          <label class="form-check-label" :for="'overlay-' + name">{{
            overlay.title
          }}</label>
          <span class="badge bg-success rounded-pill">{{
            countByCategory(name)
          }}</span>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, watch } from "vue";
import store from "../../static/js/store.js";

// Props
const props = defineProps({
  toggleOverlay: {
    type: Function,
    required: true,
  },
  config: {
    type: Object,
    default: null,
  },
  coords: {
    type: Object,
    default: null,
  },
  configUpdated: {
    type: [Function, Object],
    default: null,
  },
});

// Reactive state
const sharedState = store.state;
const counts = reactive(new Map());

const overlays = reactive({
  contact: {
    active: true,
    title: "مخاطبین",
  },
  unit: {
    active: true,
    title: "نیروها",
  },
  alarm: {
    active: true,
    title: "هشدارها",
  },
  point: {
    active: true,
    title: "نقاط",
  },
  drawing: {
    active: true,
    title: "ناحیه ها",
  },
  route: {
    active: true,
    title: "مسیرها",
  },
});

// Watch
watch(
  overlays,
  (newValue) => {
    for (const [overlayName, overlay] of Object.entries(newValue)) {
      console.log("overlay", overlayName, overlay);
      let overlayActive = overlay.active;
      props.toggleOverlay(overlayName, overlayActive);
    }
  },
  {
    immediate: true,
    deep: true,
  }
);

// Methods
function countByCategory(category) {
  let total = 0;
  sharedState.items.forEach(function (u) {
    if (u.category === category && !u.uid.endsWith("-fence")) total += 1;
  });

  return sharedState.ts && total;
}
</script>

<style scoped>
/* Add any component-specific styles here if needed */
</style>
