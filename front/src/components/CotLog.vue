<template>
  <div class="accordion-item mb-1">
    <div class="accordion-header">
      <button
        class="accordion-button"
        type="button"
        data-bs-toggle="collapse"
        data-bs-target="#collapseCotLog"
        aria-expanded="true"
        aria-controls="collapseCotLog"
      >
        لاگ پیام‌های دریافتی
      </button>
    </div>
    <div
      id="collapseCotLog"
      class="accordion-collapse collapse"
      data-bs-parent="#accordion"
      style=""
    >
      <div class="accordion-body">
        <ul class="list-group">
          <li class="list-group-item" v-for="u in units" :key="u"></li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup>
import store from "../../static/js/store.js";

// Props
const props = defineProps({
  units: {
    type: Array,
    default: () => [],
  },
});

// Reactive state
const sharedState = store.state;
</script>

<style scoped>
/* Add any component-specific styles here if needed */
</style>
