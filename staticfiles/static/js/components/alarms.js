if (typeof html !== 'undefined') {
    var html = String.raw;
}

Vue.component('AlarmsModal', {
    data: function () {
        return {
            sharedState: store.state,
        }
    },
    methods: {
        silentAlarm: function () {
            // TODO:
        },
        dt: function (str) {
            let d = new Date(Date.parse(str));
            return ("0" + d.getDate()).slice(-2) + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" +
                d.getFullYear() + " " + ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2);
        },
        readableType: function (alarmType) {
            return {
                "b-a-g": "ورود به ژئوفنس",
                "b-a-o-tbl": "هشدار",
                "b-a-o-opn": "مواجهه با دشمن",
                "b-a-o-pan": "تلفات",
            }[alarmType];
        },
        focus: function (alarm) {
            this.map.setView([alarm.lat, alarm.lon], 12);
            var myModalEl = document.getElementById('alarms-modal');
            var modal = bootstrap.Modal.getInstance(myModalEl)
            modal.hide();
        }
    },
    props: ['map'], // TODO: Change this to only alarms
    computed: {
        alarms: function () {
            let res = []
            this.sharedState.ts && this.sharedState.items.forEach(function (u) {
                if (u.category === 'alarm') res.push(u);
            })
            return res;
        }
    },
    template: /*html*/`
        <div class="modal fade" id="alarms-modal" data-bs-backdrop="static" data-bs-keyboard="false" tabindex="-1"
             aria-labelledby="staticBackdropLabel" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">هشدارها</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
<!--                        <div id="alarms-list" class="list-group">-->
<!--                            <div class="list-group-item" v-for="(alarm, idx) in alarms">-->
<!--                                <div class="d-flex w-100 justify-content-between">-->
<!--                                    <div>-->
<!--                                        <h5 class="mb-1">هشدار {{ idx }}</h5>-->
<!--                                        <code>{{ alarm }}</code>-->
<!--                                    </div>-->
<!--                                </div>-->
<!--                            </div>-->
<!--                        </div>-->
                        <div id="alarms-list" class="list-group">
                            <div class="list-group-item" v-for="(alarm, idx) in alarms">
                                <div class="d-flex w-100 justify-content-between">
                                    <div>
                                        <h5 class="mb-1">{{ alarm.callsign }}</h5> <small class="text-muted">هشدار {{
                                        idx + 1 }}</small>
                                    </div>
                                    <small class="text-muted">{{ dt(alarm.start_time) }}</small> <small
                                        style="color: darkred">({{ readableType(alarm.type) }})</small>
                                </div>
                                <p class="mb-1">موقعیت: {{ alarm.lat }}, {{ alarm.lon }} <span class="badge rounded-pill bg-success" style="cursor:default;"
                                  v-on:click="focus(alarm)"><i
                                    class="bi bi-geo"></i></span></p>
<!--                                <p class="mb-1">وضعیت: {{ alarm.status }}</p>-->
                                <p class="mb-1">{{ alarm.text }}</p>
                                <small class="text-muted">UID: {{ alarm.uid }}</small>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>`
})