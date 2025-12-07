<template>
  <div
    class="modal fade"
    id="sensors-modal"
    data-bs-backdrop="static"
    data-bs-keyboard="false"
    tabindex="-1"
    aria-labelledby="staticBackdropLabel"
    aria-hidden="true"
  >
    <div
      class="modal-dialog modal-dialog-centered modal-dialog-scrollable modal-lg"
    >
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">سنسورها</h5>
          <button
            type="button"
            class="btn-close"
            data-bs-dismiss="modal"
            aria-label="Close"
          ></button>
        </div>
        <div class="modal-body">
          <table class="table table-bordered">
            <thead>
              <tr>
                <th scope="col" class="col-1">#</th>
                <th scope="col" class="col-3">نام</th>
                <th scope="col" class="col-2">نوع سنسور</th>
                <th scope="col" class="col-2">هاست</th>
                <th scope="col" class="col-1">پورت</th>
                <th scope="col" class="col-2">بازه ارسال (ثانیه)</th>
                <th scope="col" class="col-2">عملیات</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(sensor, idx) in allSensors" :key="sensor.uid">
                <th scope="row">{{ idx + 1 }}</th>
                <template v-if="editingSensorUid === sensor.uid">
                  <td>
                    <input
                      type="text"
                      class="form-control"
                      v-model="editedSensor.title"
                    />
                  </td>
                  <td>
                    <select
                      class="form-select"
                      v-model="editedSensor.type"
                      aria-label="type"
                    >
                      <option value="" selected>-----------</option>
                      <option value="GPS">GPS (gpsd)</option>
                      <option value="AIS">AIS</option>
                      <option value="Radar">Radar</option>
                    </select>
                  </td>
                  <td>
                    <input
                      type="text"
                      class="form-control"
                      v-model="editedSensor.addr"
                      placeholder="IP"
                      aria-label="IP"
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      min="1"
                      max="65535"
                      class="form-control"
                      v-model="editedSensor.port"
                      placeholder="Port"
                      aria-label="Port"
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      min="1"
                      max="65535"
                      class="form-control"
                      v-model="editedSensor.interval"
                      placeholder="5"
                      aria-label="interval"
                    />
                  </td>
                  <td>
                    <button class="btn btn-success btn-sm" @click="editSensor">
                      Save
                    </button>
                    <button
                      class="btn btn-secondary btn-sm"
                      @click="cancelEditing"
                    >
                      Cancel
                    </button>
                    <button
                      class="btn btn-danger btn-sm"
                      @click="removeSensor(sensor.uid)"
                    >
                      Delete
                    </button>
                  </td>
                </template>
                <template v-else>
                  <td>{{ sensor.title }}</td>
                  <td>{{ sensor.type }}</td>
                  <td>{{ sensor.addr }}</td>
                  <td>{{ sensor.port }}</td>
                  <td>{{ sensor.interval }}</td>
                  <td>
                    <button
                      class="btn btn-primary btn-sm"
                      @click="startEditing(sensor)"
                    >
                      Edit
                    </button>
                    <button
                      class="btn btn-danger btn-sm"
                      @click="removeSensor(sensor.uid)"
                    >
                      Delete
                    </button>
                  </td>
                </template>
              </tr>
              <tr>
                <td>
                  <button class="btn btn-success" @click="createSensor">
                    +
                  </button>
                </td>
                <td>
                  <input
                    type="text"
                    class="form-control"
                    v-model="newSensor.title"
                  />
                </td>
                <td>
                  <select
                    class="form-select"
                    v-model="newSensor.type"
                    aria-label="type"
                  >
                    <option value="" selected>-----------</option>
                    <option value="GPS">GPS (gpsd)</option>
                    <option value="AIS">AIS</option>
                    <option value="Radar">Radar</option>
                  </select>
                </td>
                <td>
                  <input
                    type="text"
                    class="form-control"
                    v-model="newSensor.addr"
                    placeholder="IP"
                    aria-label="IP"
                  />
                </td>
                <td>
                  <input
                    type="number"
                    min="1"
                    max="65535"
                    class="form-control"
                    v-model="newSensor.port"
                    placeholder="Port"
                    aria-label="Port"
                  />
                </td>
                <td>
                  <input
                    type="number"
                    min="1"
                    max="65535"
                    class="form-control"
                    v-model="newSensor.interval"
                    placeholder="5"
                    aria-label="interval"
                  />
                </td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from "vue";
import store from "../store.js";

// Reactive state
const newSensor = reactive({
  type: "",
  title: "",
  addr: "",
  port: 1,
  interval: 5,
});

const sharedState = store.state;
const editingSensorUid = ref(null);

const editedSensor = reactive({
  type: "",
  title: "",
  addr: "",
  port: 1,
  interval: 5,
});

// Computed properties
const allSensors = computed(() => {
  return sharedState.sensors;
});

// Methods
function createSensor() {
  console.log("Creating Sensor:", newSensor);
  store.createSensor({ ...newSensor });
}

function removeSensor(uid) {
  console.log("Removing Sensor: ", uid);
  store.removeSensor(uid);
}

function startEditing(sensor) {
  editingSensorUid.value = sensor.uid;
  // Copy sensor data to editedSensor
  Object.assign(editedSensor, { ...sensor });
}

function cancelEditing() {
  editingSensorUid.value = null;
  // Clear editedSensor data
  Object.assign(editedSensor, {
    type: "",
    title: "",
    addr: "",
    port: 1,
    interval: 5,
  });
}

function editSensor() {
  console.log("Saving Sensor:", editedSensor);
  store.editSensor({ uid: editingSensorUid.value, ...editedSensor });
  cancelEditing(); // Exit editing mode after saving
}
</script>

<style scoped>
/* Add any component-specific styles here if needed */
</style>
