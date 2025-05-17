Vue.component("SensorsModal", {
  data: function () {
    return {
      newSensor: {
        type: "",
        title: "",
        addr: "",
        port: 1,
        interval: 5,
      },
      sharedState: store.state,
      editingSensorUid: null, // Add this to track the sensor being edited
      editedSensor: { // Add this to hold the data of the sensor being edited
        type: "",
        title: "",
        addr: "",
        port: 1,
        interval: 5,
      },
    };
  },
  methods: {
    createSensor: function () {
      console.log("Creating Sensor:", this.newSensor);
      store.createSensor({ ...this.newSensor });
    },
    removeSensor: function (uid) {
      console.log("Removing Sensor: ", uid)
      store.removeSensor(uid);
    },
    startEditing: function(sensor) {
        this.editingSensorUid = sensor.uid;
        this.editedSensor = { ...sensor }; // Copy sensor data to editedSensor
    },
    cancelEditing: function() {
        this.editingSensorUid = null;
        this.editedSensor = {}; // Clear editedSensor data
    },
    editSensor: function() {
        console.log("Saving Sensor:", this.editedSensor);
        store.editSensor({ uid: this.editingSensorUid, ...this.editedSensor });
        this.cancelEditing(); // Exit editing mode after saving
    }
  },
  computed: {
    allSensors: function () {
      return this.sharedState.sensors;
    },
  },
  template: `
    <div class="modal fade" id="sensors-modal" data-bs-backdrop="static" data-bs-keyboard="false" tabindex="-1"
         aria-labelledby="staticBackdropLabel" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable modal-lg">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">سنسورها</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
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
                            <th scope="col" class="col-2">عملیات</th> <!-- Added column for actions -->
                        </tr>
                        </thead>
                        <tbody>
                        <tr v-for="(sensor, idx) in allSensors" :key="sensor.uid">
                            <th scope="row">{{ idx + 1 }}</th>
                            <template v-if="editingSensorUid === sensor.uid">
                                <td><input type="text" class="form-control" v-model="editedSensor.title"></td>
                                <td>
                                    <select class="form-select" v-model="editedSensor.type" aria-label="type">
                                        <option value="" selected>-----------</option>
                                        <option value="GPS">GPS (gpsd)</option>
                                        <option value="AIS">AIS</option>
                                        <option value="Radar">Radar</option>
                                    </select>
                                </td>
                                <td><input type="text" class="form-control" v-model="editedSensor.addr" placeholder="IP" aria-label="IP"></td>
                                <td><input type="number" min="1" max="65535" class="form-control" v-model="editedSensor.port" placeholder="Port" aria-label="Port"></td>
                                <td><input type="number" min="1" max="65535" class="form-control" v-model="editedSensor.interval" placeholder="5" aria-label="interval"></td>
                                <td>
                                    <button class="btn btn-success btn-sm" @click="editSensor">Save</button>
                                    <button class="btn btn-secondary btn-sm" @click="cancelEditing">Cancel</button>
                                    <button class="btn btn-danger btn-sm" @click="removeSensor(sensor.uid)">Delete</button>
                                </td>
                            </template>
                            <template v-else>
                                <td>{{ sensor.title }}</td>
                                <td>{{ sensor.type }}</td>
                                <td>{{ sensor.addr }}</td>
                                <td>{{ sensor.port }}</td>
                                <td>{{ sensor.interval }}</td>
                                <td>
                                    <button class="btn btn-primary btn-sm" @click="startEditing(sensor)">Edit</button>
                                    <button class="btn btn-danger btn-sm" @click="removeSensor(sensor.uid)">Delete</button>
                                </td>
                            </template>
                        </tr>
                        <tr>
                            <td><button class="btn btn-success" v-on:click="createSensor">+</button></th>
                            <td><input type="text" class="form-control" v-model="newSensor.title"></td>
                            <td>
                                <select class="form-select" v-model="newSensor.type" aria-label="type">
                                    <option value="" selected>-----------</option>
                                    <option value="GPS">GPS (gpsd)</option>
                                    <option value="AIS">AIS</option>
                                    <option value="Radar">Radar</option>
                                </select>
                            </td>
                            <td><input type="text" class="form-control" v-model="newSensor.addr" placeholder="IP" aria-label="IP">
                            </td>
                            <td><input type="number" min="1" max="65535" class="form-control" v-model="newSensor.port" placeholder="Port"
                                       aria-label="Port"></td>
                            <td><input type="number" min="1" max="65535" class="form-control" v-model="newSensor.interval" placeholder="5"
                                        aria-label="interval"></td>
                            <td></td>
                        </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>`,
});
