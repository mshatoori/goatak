Vue.component('SensorsModal', {
    data: function () {
        return {
            newSensor: {
                type: "",
                ip: "",
                port: "",
            },
        }
    },
    methods: {
        createSensor: function () {
            // TODO:
            console.log("Create Sensor:", this.newSensor);
            store.createSensor({ ...this.newSensor });
        },
        removeSensor: function () {
            // TODO:
        },
    },
    computed: {
        allSensors: function () {
            return store.state.sensors.values();
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
                    <table class="table">
                        <thead>
                        <tr>
                            <th scope="col" class="col-1">#</th>
                            <th scope="col" class="col-4">نوع سنسور</th>
                            <th scope="col" class="col-5">IP</th>
                            <th scope="col" class="col-4">Port</th>
                        </tr>
                        </thead>
                        <tbody>
                        <tr v-for="(sensor, idx) in allSensors">
                            <th scope="row">{{ idx + 1 }}</th>
                            <td>{{ sensor.type }}</td>
                            <td>{{ sensor.addr }}</td>
                            <td>{{ sensor.port }}</td>
                        </tr>
                        <tr>
                            <td><button class="btn btn-success" v-on:click="createSensor">+</button></th>
                            <td><select class="form-select" v-model="newSensor.type" aria-label="type"><option value="" selected>-----------</option><option value="GPS">GPS/AIS</option></select>
                            </td>
                            <td><input type="text" class="form-control" v-model="newSensor.ip" placeholder="IP" aria-label="IP">
                            </td>
                            <td><input type="text" class="form-control" v-model="newSensor.port" placeholder="Port"
                                       aria-label="Port"></td>
                        </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>`
})