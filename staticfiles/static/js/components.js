Vue.component("SensorsModal", {
  data: function () {
    return {
      newSensor: {
        type: "",
        addr: "",
        port: 1,
        interval: 5,
      },
      sharedState: store.state,
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
                            <th scope="col" class="col-2">نوع سنسور</th>
                            <th scope="col" class="col-4">هاست</th>
                            <th scope="col" class="col-2">پورت</th>
                            <th scope="col" class="col-2">بازه ارسال (ثانیه)</th>
                            <th scope="col" class="col-1">حذف؟</th>
                        </tr>
                        </thead>
                        <tbody>
                        <tr v-for="(sensor, idx) in allSensors">
                            <th scope="row">{{ idx + 1 }}</th>
                            <td>{{ sensor.type }}</td>
                            <td>{{ sensor.addr }}</td>
                            <td>{{ sensor.port }}</td>
                            <td>{{ sensor.interval }}</td>
                            <td><button class="btn btn-success" v-on:click="removeSensor(sensor.uid)">X</button></td>
                        </tr>
                        <tr>
                            <td><button class="btn btn-success" v-on:click="createSensor">+</button></th>
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
