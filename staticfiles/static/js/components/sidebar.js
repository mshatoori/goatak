// const html = String.raw;
Vue.component("Sidebar", {
    data: function () {
        return {
            sharedState: store.state
        };
    },
    methods: {
        getImg: function (item) {
            return getIconUri(item, false).uri;
        },

        milImg: function (item) {
            return getMilIcon(item, false).uri;
        },
        getUnitName: function (u) {
            let res = u.callsign || "no name";
            if (u.parent_uid === this.config.uid) {
                if (u.send === true) {
                    res = "+ " + res;
                } else {
                    res = "* " + res;
                }
            }
            return res;
        }, printCoordsll: function (latlng) {
            return this.printCoords(latlng.lat, latlng.lng);
        },

        printCoords: function (lat, lng) {
            return lat.toFixed(6) + "," + lng.toFixed(6);
        },

        latlng: function (lat, lon) {
            return L.latLng(lat, lon);
        },

        distBea: function (p1, p2) {
            let toRadian = Math.PI / 180;
            // haversine formula
            // bearing
            let y = Math.sin((p2.lng - p1.lng) * toRadian) * Math.cos(p2.lat * toRadian);
            let x = Math.cos(p1.lat * toRadian) * Math.sin(p2.lat * toRadian) - Math.sin(p1.lat * toRadian) * Math.cos(p2.lat * toRadian) * Math.cos((p2.lng - p1.lng) * toRadian);
            let brng = Math.atan2(y, x) * 180 / Math.PI;
            brng += brng < 0 ? 360 : 0;
            // distance
            let R = 6371000; // meters
            let deltaF = (p2.lat - p1.lat) * toRadian;
            let deltaL = (p2.lng - p1.lng) * toRadian;
            let a = Math.sin(deltaF / 2) * Math.sin(deltaF / 2) + Math.cos(p1.lat * toRadian) * Math.cos(p2.lat * toRadian) * Math.sin(deltaL / 2) * Math.sin(deltaL / 2);
            let c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            let distance = R * c;
            return (distance < 10000 ? distance.toFixed(0) + "m " : (distance / 1000).toFixed(1) + "km ") + brng.toFixed(1) + "°T";
        },
        dt: function (str) {
            let d = new Date(Date.parse(str));
            return ("0" + d.getDate()).slice(-2) + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" +
                d.getFullYear() + " " + ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2);
        },

        sp: function (v) {
            return (v * 3.6).toFixed(1);
        },

    },
    props: ["toggleOverlay", "config", "coords", "configUpdated", "current_unit", "locked_unit_uid"],
    inject: ["getTool", "map", "removeTool", "emergency_switch1", "emergency_switch2", "emergency_type"],
    template: html`
        <div class="d-flex align-items-start">
            <div class="tab-content flex-grow-1" id="v-pills-tabContent">
                <div class="tab-pane fade show active" id="v-pills-overlays" role="tabpanel"
                     aria-labelledby="v-pills-overlays-tab">
                    <overlays-list :toggle-overlay="toggleOverlay"></overlays-list>
                </div>
                <div v-if="config && config.callsign" class="tab-pane fade" id="v-pills-userinfo" role="tabpanel"
                     aria-labelledby="v-pills-userinfo-tab">
                    <user-info :config="config" :coords="coords" :config-updated="configUpdated"></user-info>
                </div>
                <div class="tab-pane fade" id="v-pills-tools" role="tabpanel" aria-labelledby="v-pills-tools-tab">
                    <div class="card">
                        <h5 class="card-header">ابزارها</h5>
                        <ul class="list-group list-group-flush">
                            <li class="list-group-item">
                                <div class="btn-group"  role="group" aria-label="Tools"><input type="radio" class="btn-check" name="btnradio" id="select" autocomplete="off"
                                          checked>
                                    <label class="btn btn-outline-primary btn-sm" for="select">انتخاب</label>

                                    <input type="radio" class="btn-check" name="btnradio" id="redx" autocomplete="off">
                                    <label class="btn btn-outline-primary btn-sm" for="redx">نشان</label>

                                    <!--                            <input type="radio" class="btn-check" name="btnradio" id="dp1" autocomplete="off">-->
                                    <!--                            <label class="btn btn-outline-primary btn-sm" for="dp1">DP</label>-->

                                    <input type="radio" class="btn-check" name="btnradio" id="point" autocomplete="off">
                                    <label class="btn btn-outline-primary btn-sm" for="point">ایجاد نقطه</label>

                                    <input v-if="config && config.callsign" type="radio" class="btn-check"
                                           name="btnradio"
                                           id="me" autocomplete="off">
                                    <label v-if="config && config.callsign" class="btn btn-outline-primary btn-sm"
                                           for="me">من</label></div>
                            </li>
                            <li v-if="getTool('redx')" class="mt-1 list-group-item">
                                <span class="badge bg-danger">نشان</span>: {{ printCoordsll(getTool('redx').getLatLng())
                                }}
                                <span class="badge rounded-pill bg-success" style="cursor:default;"
                                      v-on:click="map.setView(getTool('redx').getLatLng())"><i
                                        class="bi bi-geo"></i></span>
                                <span class="badge rounded-pill bg-danger" style="cursor:default;"
                                      v-on:click="removeTool('redx')">X</span>
                            </li>
                            <li v-if="coords" class="mt-1 list-group-item">
                                <span class="badge bg-secondary">نشانگر</span>: {{ printCoordsll(coords) }} <span
                                    v-if="getTool('redx')">({{ distBea(getTool('redx').getLatLng(), coords) }} از
                                                        نشانگر)</span>
                            </li>
                            <li class="d-flex mt-1 list-group-item">
                                <div class="d-inline-block">
                                    <div class="form-check form-switch">
                                        <input class="form-check-input" type="checkbox" role="switch" id="emergSwitch1"
                                               v-model="emergency_switch1">
                                        <!--                                    <label class="form-check-label" for="emergSwitch1">خطر</label>-->
                                    </div>
                                    <div class="form-check form-switch">
                                        <input class="form-check-input" type="checkbox" role="switch" id="emergSwitch2"
                                               v-model="emergency_switch2">
                                        <!--                                    <label class="form-check-label" for="emergSwitch2">خطر</label>-->
                                    </div>
                                </div>
                                <!--                                <div class="form-check form-check-inline">-->
                                <div class="flex-fill"></div>
                                <select class="form-select form-select-sm d-inline-block" v-model="emergency_type">
                                    <option selected value="b-a-o-tbl">هشدار</option>
                                    <option value="b-a-o-opn">مواجهه با دشمن</option>
                                    <option value="b-a-o-pan">تلفات</option>
                                </select>
                                <!--                                </div>-->
                            </li>
                        </ul>
                    </div>
                </div>

                <div class="tab-pane fade" id="v-pills-current-unit" role="tabpanel"
                     aria-labelledby="v-pills-current-unit-tab">
                    <div class="" v-if="current_unit">
                        <div class="">
                        
                                            <span class="pull-left fw-bold" v-on:click.stop="mapToUnit(current_unit)">
                                                <img :src="milImg(current_unit)"/> {{ getUnitName(current_unit) }} <span
                                                    v-if="current_unit.status"> ({{ current_unit.status }})</span>
                                                <img height="24" src="/static/icons/coord_unlock.png"
                                                     v-if="current_unit.category !== 'point' && locked_unit_uid != current_unit.uid"
                                                     v-on:click.stop="locked_unit_uid=current_unit.uid"/>
                                                <img height="24" src="/static/icons/coord_lock.png"
                                                     v-if="locked_unit_uid == current_unit.uid"
                                                     v-on:click.stop="locked_unit_uid=''"/>
                                            </span>
                            <span class="pull-right" v-if="current_unit.category === 'contact'">
                                                <button type="button" class="btn btn-sm btn-primary"
                                                        v-if="current_unit.category === 'contact'"
                                                        v-on:click.stop="openChat(current_unit.uid, current_unit.callsign);"><i
                                                        class="bi bi-chat-text-fill"></i></button>
                                            </span>
                            <span class="pull-right" v-if="current_unit.category !== 'contact'">
                                                <button type="button" class="btn btn-sm btn-primary"
                                                        data-bs-toggle="modal"
                                                        v-if="current_unit.category !== 'drawing' && current_unit.category !== 'route'"
                                                        data-bs-target="#edit">
                                                    <i class="bi bi-pencil-square"></i>
                                                </button>
                                                <button type="button" class="btn btn-sm btn-primary"
                                                        data-bs-toggle="modal"
                                                        v-if="current_unit.category === 'drawing'||current_unit.category === 'route'"
                                                        data-bs-target="#drawing-edit">
                                                    <i class="bi bi-pencil-square"></i>
                                                </button>
                                                <button type="button" class="btn btn-sm btn-danger"
                                                        v-on:click.stop="deleteCurrentUnit">
                                                    <i class="bi bi-trash3-fill"></i>
                                                </button>
                                            </span>

                        </div>
                        <div id="collapseCurrentUnit">
                            <div class="">
                                <dl>
                                    <dt>UID</dt>
                                    <dd>{{ current_unit.uid }}</dd>
                                    <template v-if="current_unit.team">
                                        <dt>تیم</dt>
                                        <dd>{{ current_unit.team }}</dd>
                                        <dt>نقش</dt>
                                        <dd>{{ current_unit.role }}</dd>
                                    </template>
                                    <dt>نوع</dt>
                                    <dd>{{ current_unit.type }}</dd>
                                    <dt>SIDC</dt>
                                    <dd>{{ current_unit.sidc }}</dd>

                                    <dt>مختصات</dt>
                                    <dd>{{ printCoords(current_unit.lat, current_unit.lon) }}
                                        <span class="badge rounded-pill bg-success" style="cursor:default;"
                                              v-on:click="map.setView([current_unit.lat, current_unit.lon])"><i
                                                class="bi bi-geo"></i></span>
                                        <span v-if="coords">({{ distBea(latlng(current_unit.lat, current_unit.lon), coords)
                                                        }}
                                                        تا نشانگر)</span>
                                    </dd>
                                    <dt>سرعت</dt>
                                    <dd>{{ sp(current_unit.speed) }} km/h</dd>
                                    <dt>ارتفاع</dt>
                                    <dd>{{ current_unit.hae.toFixed(1) }}</dd>
                                    <!--                            <div v-if="current_unit.tak_version">-->
                                    <!--                                <b>ver:</b> {{ current_unit.tak_version }}<br/>{{ current_unit.device }}-->
                                    <!--                            </div>-->
                                    <div v-if="current_unit.parent_uid">
                                        <dt>سازنده</dt>
                                        <dd>{{ current_unit.parent_uid }}<span v-if="current_unit.parent_callsign">({{
                                                            current_unit.parent_callsign }})</span></dd>
                                    </div>
                                    <dt>زمان</dt>
                                    <dd>{{ dt(current_unit.start_time) }}</dd>
                                    <!--                                <dt>ارسال</dt>-->
                                    <!--                                <dd>{{ dt(current_unit.send_time) }}</dd>-->
                                    <!--                                <dt>انقضا</dt>-->
                                    <!--                                <dd>{{ dt(current_unit.stale_time) }}</dd>-->
                                    <!--                                <dt>آخرین زمان دیده شدن</dt>-->
                                    <!--                                <dd>{{ dt(current_unit.last_seen) }}</dd>-->
                                </dl>
                                <div v-if="Object.keys(current_unit.sensor_data).length > 0">
                                    <h6>آخرین داده‌های سنسور</h6>
                                    <table class="table" style="table-layout: fixed">
                                        <tr v-for="(value, key) in current_unit.sensor_data">
                                            <td class="col-3">{{key}}</td>
                                            <td class="col-9"
                                                style="text-overflow: ellipsis;white-space: nowrap;overflow: hidden;"
                                                :title="value">{{value}}
                                            </td>
                                        </tr>
                                    </table>
                                </div>
                                {{ current_unit.text }}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="nav flex-column nav-pills ms-1" id="v-pills-tab" role="tablist" aria-orientation="vertical">
                <button class="nav-link active" id="v-pills-overlays-tab" data-bs-toggle="pill"
                        data-bs-target="#v-pills-overlays" type="button" role="tab" aria-controls="v-pills-overlays"
                        aria-selected="true">لایه‌ها
                </button>
                <button class="nav-link" id="v-pills-userinfo-tab" data-bs-toggle="pill"
                        data-bs-target="#v-pills-userinfo" type="button" role="tab" aria-controls="v-pills-userinfo"
                        aria-selected="false" v-if="config && config.callsign">اطلاعات Node جاری
                </button>
                <button class="nav-link" id="v-pills-tools-tab" data-bs-toggle="pill"
                        data-bs-target="#v-pills-tools" type="button" role="tab" aria-controls="v-pills-tools"
                        aria-selected="false">ابزارها
                </button>
                <button class="nav-link" id="v-pills-current-unit-tab" data-bs-toggle="pill"
                        data-bs-target="#v-pills-current-unit" type="button" role="tab"
                        aria-controls="v-pills-current-unit"
                        aria-selected="false">Settings
                </button>
            </div>
        </div>
    `,
});
