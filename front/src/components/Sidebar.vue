<template>
  <div class="d-flex flex-column h-100 bg-light border-end">
    <!-- Vertical Pills Navigation -->
    <div class="nav flex-column nav-pills p-2" id="v-pills-tab" role="tablist" aria-orientation="vertical">
      <button class="nav-link active" id="v-pills-overlays-tab" data-bs-toggle="pill" data-bs-target="#v-pills-overlays" type="button" role="tab" aria-controls="v-pills-overlays" aria-selected="true">لایه‌ها</button>
      <button class="nav-link" id="v-pills-userinfo-tab" data-bs-toggle="pill" data-bs-target="#v-pills-userinfo" type="button" role="tab" aria-controls="v-pills-userinfo" aria-selected="false" v-if="props.config?.callsign">اطلاعات من</button>
      <button class="nav-link" id="v-pills-tools-tab" data-bs-toggle="pill" data-bs-target="#v-pills-tools" type="button" role="tab" aria-controls="v-pills-tools" aria-selected="false">ابزارها</button>
      <button class="nav-link" id="v-pills-current-unit-tab" data-bs-toggle="pill" data-bs-target="#v-pills-current-unit" type="button" role="tab" aria-controls="v-pills-current-unit" aria-selected="false" v-if="props.currentUnit">{{ props.currentUnit.callsign || props.currentUnit.uid }}</button>
    </div>

    <!-- Tab Content -->
    <div class="tab-content flex-grow-1 p-2 overflow-auto" id="v-pills-tabContent">
      <!-- Overlays Tab -->
      <div class="tab-pane fade show active" id="v-pills-overlays" role="tabpanel" aria-labelledby="v-pills-overlays-tab">
        <OverlaysList :toggle-overlay="props.toggleOverlay" />
      </div>

      <!-- User Info Tab -->
      <div v-if="props.config?.callsign" class="tab-pane fade" id="v-pills-userinfo" role="tabpanel" aria-labelledby="v-pills-userinfo-tab">
        <UserInfo
          :check-emergency="props.checkEmergency"
          :config="props.config"
          :coords="props.userCoords"
          :config-updated="props.configUpdated"
          :map="props.map"
        />
      </div>

      <!-- Tools Tab -->
      <div class="tab-pane fade" id="v-pills-tools" role="tabpanel" aria-labelledby="v-pills-tools-tab">
        <div class="card">
          <h5 class="card-header">ابزارها</h5>
          <ul class="list-group list-group-flush">
            <!-- TODO: Refactor Tool state/logic -->
            <li class="list-group-item">
                <!-- Example: Add button calling App.vue function -->
                 <button class="btn btn-sm btn-outline-secondary me-1" @click="startDistanceMeasure">Measure</button>
                 <button class="btn btn-sm btn-outline-secondary" @click="startAddPointMode">Add Point</button>
            </li>
            <li v-if="props.coords" class="mt-1 list-group-item small">
              <span class="badge bg-secondary">نشانگر</span>: {{ printCoords(props.coords.lat, props.coords.lng) }}
            </li>
             <!-- Add other tool display/controls as needed -->
          </ul>
        </div>
      </div>

      <!-- Current Unit Tab -->
      <div class="tab-pane fade" id="v-pills-current-unit" role="tabpanel" aria-labelledby="v-pills-current-unit-tab">
        <div class="card" v-if="props.currentUnit">
          <div class="card-header d-flex justify-content-between align-items-center">
            <span class="fw-bold" @click="mapToUnit(props.currentUnit)" style="cursor: pointer;">
               <!-- <img :src="milImg(props.currentUnit)"/> --> <!-- TODO: Implement icon logic -->
              {{ getUnitName(props.currentUnit) }}
              <span v-if="props.currentUnit.status"> ({{ props.currentUnit.status }})</span>
              <!-- TODO: Implement locking logic if needed, requires state -->
              <!-- <img height="24" src="/src/assets/icons/coord_unlock.png" v-if="..." /> -->
              <!-- <img height="24" src="/src/assets/icons/coord_lock.png" v-if="..." /> -->
            </span>
            <span>
              <button type="button" class="btn btn-sm btn-primary me-1" v-if="props.currentUnit.category === 'contact'" @click="openMessagesModal(props.currentUnit)">
                <i class="bi bi-chat-text-fill"></i>
              </button>
              <template v-if="props.currentUnit.category !== 'contact'">
                 <button type="button" class="btn btn-sm btn-secondary me-1" @click="openEditUnitModal(props.currentUnit)">
                    <i class="bi bi-pencil-square"></i>
                 </button>
                 <button type="button" class="btn btn-sm btn-danger" @click="requestDeleteCurrentUnit">
                    <i class="bi bi-trash3-fill"></i>
                 </button>
              </template>
            </span>
          </div>
          <div class="card-body small">
            <dl class="row mb-0">
              <dt class="col-sm-4">UID</dt>
              <dd class="col-sm-8 text-truncate" :title="props.currentUnit.uid">{{ props.currentUnit.uid }}</dd>

              <template v-if="props.currentUnit.team">
                <dt class="col-sm-4">تیم</dt>
                <dd class="col-sm-8">{{ props.currentUnit.team }}</dd>
                <dt class="col-sm-4">نقش</dt>
                <dd class="col-sm-8">{{ props.currentUnit.role }}</dd>
              </template>

              <dt class="col-sm-4">نوع</dt>
              <dd class="col-sm-8">{{ props.currentUnit.type }}</dd>

              <dt class="col-sm-4">مختصات</dt>
              <dd class="col-sm-8">
                {{ printCoords(props.currentUnit.lat, props.currentUnit.lon) }}
                <span class="badge rounded-pill bg-success ms-1" style="cursor:pointer;" @click="mapToUnit(props.currentUnit)">
                  <i class="bi bi-geo"></i>
                </span>
              </dd>

              <template v-if="props.currentUnit.category !== 'point'"> <!-- Don't show speed/alt for points -->
                <dt class="col-sm-4">سرعت</dt>
                <dd class="col-sm-8">{{ formatSpeed(props.currentUnit.speed) }} km/h</dd>

                <dt class="col-sm-4">ارتفاع</dt>
                <dd class="col-sm-8">{{ formatAltitude(props.currentUnit.hae) }} m</dd>
              </template>

              <template v-if="props.currentUnit.parent_uid">
                <dt class="col-sm-4">سازنده</dt>
                <dd class="col-sm-8 text-truncate" :title="props.currentUnit.parent_uid">
                  {{ props.currentUnit.parent_uid.substring(0, 8) }}...
                  <span v-if="props.currentUnit.parent_callsign"> ({{ props.currentUnit.parent_callsign }})</span>
                </dd>
              </template>

              <dt class="col-sm-4">زمان ایجاد</dt>
              <dd class="col-sm-8">{{ formatTime(props.currentUnit.start_time) }}</dd>

              <dt class="col-sm-4">زمان ارسال</dt>
              <dd class="col-sm-8">{{ formatTime(props.currentUnit.send_time) }}</dd>

              <dt class="col-sm-4">زمان انقضا</dt>
              <dd class="col-sm-8">{{ formatTime(props.currentUnit.stale_time) }}</dd>
            </dl>

            <!-- Sensor Data -->
            <div v-if="props.currentUnit.sensor_data && Object.keys(props.currentUnit.sensor_data).length > 0" class="mt-2">
              <h6>آخرین داده‌های سنسور</h6>
              <dl class="row mb-0 small">
                 <template v-for="(value, key) in props.currentUnit.sensor_data">
                    <dt :key="key" class="col-sm-4 text-truncate" :title="key">{{ key }}</dt>
                    <dd class="col-sm-8 text-truncate" :title="value">{{ value }}</dd>
                 </template>
              </dl>
            </div>

            <!-- Remarks -->
            <div v-if="props.currentUnit.text" class="mt-2">
                <h6>توضیحات</h6>
                <p class="card-text small">{{ props.currentUnit.text }}</p>
            </div>
          </div>
        </div>
        <div v-else class="text-center text-muted mt-3">
            واحدی انتخاب نشده است.
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { inject } from 'vue';
import OverlaysList from './OverlaysList.vue';
import UserInfo from './UserInfo.vue';
import { formatDateTime } from '../utils'; // Use util function
import L from 'leaflet';

// Define Props passed from App.vue
const props = defineProps({
  toggleOverlay: Function,
  config: Object,
  coords: Object,
  configUpdated: Function,
  currentUnit: Object,
  lockedUnitUid: String, // Keep prop, but logic needs state in App.vue
  deleteCurrentUnit: Function,
  checkEmergency: Function,
  map: Object,
  userCoords: Object // Define the new prop
});

// Inject functions needed from App.vue if not passed as props
// (Example: if openMessagesModal wasn't exposed and passed down)
const openMessagesModal = inject('openMessagesModal'); // Assuming App provides this
const openEditUnitModal = inject('openEditUnitModal'); // Assuming App provides this
const startDistanceMeasure = inject('startDistanceMeasure'); // Assuming App provides this
const startAddPointMode = inject('startAddPointMode'); // Assuming App provides this

// --- Local Helper Functions --- 

function getUnitName(u) {
  if (!u) return 'N/A';
  let res = u.callsign || u.uid.substring(0, 8) || "no name";
  // Prefix logic based on parent might be better handled in App.vue or utils
  // if (u.parent_uid === props.config?.uid) {
  //   res = (u.send ? "+ " : "* ") + res;
  // }
  return res;
}

function printCoords(lat, lng) {
    if (lat == null || lng == null) return 'N/A';
    return lat.toFixed(6) + ", " + lng.toFixed(6);
}

function formatTime(timeStr) {
    if (!timeStr) return 'N/A';
    try {
        // Use the imported utility function
        return formatDateTime(timeStr);
    } catch (e) {
        console.warn("Error formatting time:", e);
        return timeStr; // Fallback to original string
    }
}

function formatSpeed(speed) {
    if (speed == null) return 'N/A';
    return (speed * 3.6).toFixed(1);
}

function formatAltitude(alt) {
    if (alt == null) return 'N/A';
    return alt.toFixed(1);
}

function mapToUnit(unit) {
  if (props.map && unit?.lat != null && unit?.lon != null) {
      const zoomLevel = props.map.getZoom() < 15 ? 15 : props.map.getZoom();
      props.map.flyTo([unit.lat, unit.lon], zoomLevel);
  }
}

function requestDeleteCurrentUnit() {
    if (props.currentUnit && props.deleteCurrentUnit) {
        if (confirm(`آیا از حذف ${getUnitName(props.currentUnit)} مطمئن هستید؟`)) {
            props.deleteCurrentUnit();
            // Optionally switch back to overlays tab
             const triggerEl = document.querySelector('#v-pills-tab button[data-bs-target="#v-pills-overlays"]');
             if (triggerEl) {
                const tab = bootstrap.Tab.getOrCreateInstance(triggerEl);
                tab.show();
             }
        }
    }
}

// TODO:
// - Implement milImg/getImg based on chosen icon library (e.g., milsymbol)
// - Refactor Tools tab logic and state
// - Implement unit locking logic (likely needs state in App.vue)

</script>

<style scoped>
/* Make sidebar scrollable if content overflows */
.tab-content {
  max-height: calc(100vh - 56px - 1rem); /* Adjust based on navbar height and padding */
  overflow-y: auto;
}
.nav-pills .nav-link {
    white-space: nowrap;
}

/* Add specific styles as needed */
</style> 