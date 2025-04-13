<template>
  <div class="card">
    <h5 class="card-header">لایه‌ها</h5>
    <ul class="list-group list-group-flush">
      <li class="list-group-item">
        <div class="form-check">
          <input class="form-check-input" type="checkbox" id="contact" v-model="overlays.contact.active" @change="toggleOverlay('contact')">
          <label class="form-check-label" for="contact">
            مخاطبین
            <span class="badge bg-secondary">{{ countByCategory('contact') }}</span>
          </label>
        </div>
      </li>
      <li class="list-group-item">
        <div class="form-check">
          <input class="form-check-input" type="checkbox" id="unit" v-model="overlays.unit.active" @change="toggleOverlay('unit')">
          <label class="form-check-label" for="unit">
            نیروها
            <span class="badge bg-secondary">{{ countByCategory('unit') }}</span>
          </label>
        </div>
      </li>
      <li class="list-group-item">
        <div class="form-check">
          <input class="form-check-input" type="checkbox" id="alarm" v-model="overlays.alarm.active" @change="toggleOverlay('alarm')">
          <label class="form-check-label" for="alarm">
            هشدارها
            <span class="badge bg-secondary">{{ countByCategory('alarm') }}</span>
          </label>
        </div>
      </li>
      <li class="list-group-item">
        <div class="form-check">
          <input class="form-check-input" type="checkbox" id="point" v-model="overlays.point.active" @change="toggleOverlay('point')">
          <label class="form-check-label" for="point">
            نقاط
            <span class="badge bg-secondary">{{ countByCategory('point') }}</span>
          </label>
        </div>
      </li>
      <li class="list-group-item">
        <div class="form-check">
          <input class="form-check-input" type="checkbox" id="drawing" v-model="overlays.drawing.active" @change="toggleOverlay('drawing')">
          <label class="form-check-label" for="drawing">
            ناحیه‌ها
            <span class="badge bg-secondary">{{ countByCategory('drawing') }}</span>
          </label>
        </div>
      </li>
      <li class="list-group-item">
        <div class="form-check">
          <input class="form-check-input" type="checkbox" id="route" v-model="overlays.route.active" @change="toggleOverlay('route')">
          <label class="form-check-label" for="route">
            مسیرها
            <span class="badge bg-secondary">{{ countByCategory('route') }}</span>
          </label>
        </div>
      </li>
    </ul>
  </div>
</template>

<script>
export default {
  name: 'OverlaysList',
  props: {
    toggleOverlay: {
      type: Function,
      required: true
    }
  },
  data() {
    return {
      overlays: {
        contact: { active: true },
        unit: { active: true },
        alarm: { active: true },
        point: { active: true },
        drawing: { active: true },
        route: { active: true }
      }
    };
  },
  methods: {
    countByCategory(category) {
      // This would need to be implemented based on your data structure
      // For now, returning a placeholder
      return 0;
    }
  }
};
</script> 