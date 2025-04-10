<template>
  <div class="modal fade show d-block" tabindex="-1" aria-labelledby="sensorsModalLabel" aria-modal="true" role="dialog">
    <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable modal-lg">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title" id="sensorsModalLabel">سنسورها</h5>
          <button type="button" class="btn-close" @click="closeModal" aria-label="Close"></button>
        </div>
        <div class="modal-body">
          <div v-if="isLoading" class="text-center">
            <div class="spinner-border" role="status">
              <span class="visually-hidden">Loading...</span>
            </div>
          </div>
          <div v-else-if="error" class="alert alert-danger">
             خطا در بارگذاری سنسورها: {{ error }}
          </div>
          <table v-else class="table table-bordered align-middle">
            <thead>
              <tr>
                <th scope="col" class="col-1">#</th>
                <th scope="col" class="col-3">نام</th>
                <th scope="col" class="col-2">نوع سنسور</th>
                <th scope="col" class="col-2">هاست</th>
                <th scope="col" class="col-1">پورت</th>
                <th scope="col" class="col-2">بازه ارسال (ثانیه)</th>
                <th scope="col" class="col-1 text-center">حذف؟</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(sensor, idx) in sensorsList" :key="sensor.uid">
                <th scope="row">{{ idx + 1 }}</th>
                <td>{{ sensor.title }}</td>
                <td>{{ sensor.type }}</td>
                <td>{{ sensor.addr }}</td>
                <td>{{ sensor.port }}</td>
                <td>{{ sensor.interval }}</td>
                <td class="text-center">
                    <button class="btn btn-danger btn-sm" @click="removeSensorHandler(sensor.uid)"
                           :disabled="isDeleting === sensor.uid">
                         <span v-if="isDeleting === sensor.uid" class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                         <i v-else class="bi bi-trash"></i>
                     </button>
                </td>
              </tr>
              <!-- Form for adding new sensor -->
              <tr>
                <td>
                    <button class="btn btn-success btn-sm" @click="createSensorHandler" :disabled="isCreating">
                        <span v-if="isCreating" class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                        <i v-else class="bi bi-plus-lg"></i>
                    </button>
                </td>
                <td><input type="text" class="form-control form-control-sm" v-model="newSensor.title" placeholder="نام سنسور"></td>
                <td>
                  <select class="form-select form-select-sm" v-model="newSensor.type" aria-label="type">
                    <option value="" selected>-- انتخاب نوع --</option>
                    <option value="GPS">GPS (gpsd)</option>
                    <option value="AIS">AIS</option>
                    <option value="Radar">Radar</option>
                    <!-- Add other sensor types if needed -->
                  </select>
                </td>
                <td><input type="text" class="form-control form-control-sm" v-model="newSensor.addr" placeholder="IP یا آدرس هاست"></td>
                <td><input type="number" min="1" max="65535" class="form-control form-control-sm" v-model.number="newSensor.port" placeholder="پورت"></td>
                <td><input type="number" min="1" max="3600" class="form-control form-control-sm" v-model.number="newSensor.interval" placeholder="بازه (ثانیه)"></td>
                <td></td> <!-- Empty cell for alignment -->
              </tr>
            </tbody>
          </table>
          <div v-if="creationError" class="alert alert-danger mt-2">
              خطا در ایجاد سنسور: {{ creationError }}
          </div>
        </div>
        <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="closeModal">بستن</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { fetchSensors, createSensor, deleteSensor } from '../apiService'; // Changed path from ../utils

const emit = defineEmits(['close', 'sensors-updated']);

const sensorsList = ref([]);
const newSensor = ref({
  type: "",
  title: "",
  addr: "",
  port: null,
  interval: 5,
});

const isLoading = ref(true);
const isCreating = ref(false);
const isDeleting = ref(null); // Store UID of sensor being deleted
const error = ref(null); // Error during initial fetch
const creationError = ref(null); // Error during creation

async function fetchSensorsData() {
  isLoading.value = true;
  error.value = null;
  try {
    const data = await fetchSensors();
    sensorsList.value = data || []; // Handle null/undefined response
  } catch (err) {
    console.error("Error fetching sensors:", err);
    error.value = err.message || 'Unknown error';
    sensorsList.value = []; // Clear list on error
  } finally {
    isLoading.value = false;
  }
}

async function createSensorHandler() {
  if (!newSensor.value.type || !newSensor.value.title || !newSensor.value.addr || !newSensor.value.port) {
      creationError.value = "لطفا تمام فیلدهای لازم را پر کنید.";
      return;
  }
  isCreating.value = true;
  creationError.value = null;
  try {
    await createSensor(newSensor.value);
    // Reset form
    newSensor.value = {
        type: "", title: "", addr: "", port: null, interval: 5
    };
    emit('sensors-updated'); // Notify parent to update count
    await fetchSensorsData(); // Refresh list
  } catch (err) {
    console.error("Error creating sensor:", err);
    creationError.value = err.message || 'Unknown error';
  } finally {
    isCreating.value = false;
  }
}

async function removeSensorHandler(uid) {
  if (!confirm(`آیا از حذف سنسور مطمئن هستید؟`)) {
      return;
  }
  isDeleting.value = uid;
  try {
    await deleteSensor(uid); // Call util function
    emit('sensors-updated'); // Notify parent to update count
    await fetchSensorsData(); // Refresh list
  } catch (err) {
    console.error("Error deleting sensor:", err);
    // Optionally show an error message to the user
    alert(`خطا در حذف سنسور: ${err.message}`);
  } finally {
    isDeleting.value = null;
  }
}

function closeModal() {
  emit('close');
}

// Fetch data when the component is mounted (modal becomes visible)
onMounted(() => {
  fetchSensorsData();
});

</script>

<style scoped>
.modal {
  background-color: rgba(0, 0, 0, 0.5);
}
/* Add additional styling if needed */
</style> 