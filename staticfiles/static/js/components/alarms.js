// const html = String.raw;
Vue.component('AlarmsModal', {
    data: function () {
    },
    methods: {
        silentAlarm: function () {
            // TODO:
        },
    },
    props: ['units'], // TODO: Change this to only alarms
    computed: {
        alarms: function () {
            let res = []
            for (const k of this.units.keys()) {
                if (k.startsWith('ALARM.')) {
                    res.push(k);
                }
            }
            return res;
        }
    },
    template: html`
    <div class="modal fade" id="alarms-modal" data-bs-backdrop="static" data-bs-keyboard="false" tabindex="-1"
        aria-labelledby="staticBackdropLabel" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable modal-lg">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">هشدارها</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <div id="alarms-list" class="list-group">
                        <div class="list-group-item" v-for="(alarm, idx) in alarms">
                            <div class="d-flex w-100 justify-content-between">
                              <div>
                                <h5 class="mb-1">هشدار {{ idx }}</h5>
                              </div>
                            </div>
                        </div>
                    </div>
                    
                </div>
            </div>
        </div>
    </div>`
})