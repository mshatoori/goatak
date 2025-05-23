Vue.component("Sidebar", {
  data: function () {
    return {
      sharedState: store.state,
      editing: false,
    };
  },
  methods: {
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
    },

    switchTab: function (tabName) {
      const triggerEl = document.querySelector(`#v-pills-${tabName}-tab`);
      if (triggerEl) {
        bootstrap.Tab.getOrCreateInstance(triggerEl).show();
      }
    },

    deleteCurrent: function () {
      this.deleteCurrentUnit();
      this.switchTab("overlays");
    },
  },

  watch: {
    casevacLocation: function (newVal) {
      if (newVal) {
        this.$nextTick(() => this.switchTab("casevac"));
      }
    },
    current_unit: function (newVal, oldVal) {
      this.$nextTick(() => this.switchTab("current-unit"));
    },
  },

  props: [
    "toggleOverlay",
    "config",
    "coords",
    "configUpdated",
    "current_unit",
    "locked_unit_uid",
    "deleteCurrentUnit",
    "checkEmergency",
    "map",
    "casevacLocation",
    "onDoneCasevac",
  ],
  inject: ["getTool", "removeTool"],
  template: html`
    <div class="d-flex align-items-start">
      <div class="tab-content flex-grow-1" id="v-pills-tabContent">
        <div
          class="tab-pane fade show active"
          id="v-pills-overlays"
          role="tabpanel"
          aria-labelledby="v-pills-overlays-tab"
        >
          <overlays-list :toggle-overlay="toggleOverlay"></overlays-list>
        </div>
        <div
          v-if="config && config.callsign"
          class="tab-pane fade"
          id="v-pills-userinfo"
          role="tabpanel"
          aria-labelledby="v-pills-userinfo-tab"
        >
          <user-info
            :check-emergency="checkEmergency"
            :config="config"
            :coords="coords"
            :config-updated="configUpdated"
            :map="map"
          ></user-info>
        </div>
        <div
          class="tab-pane fade"
          id="v-pills-tools"
          role="tabpanel"
          aria-labelledby="v-pills-tools-tab"
        >
          <div class="card">
            <h5 class="card-header">ابزارها</h5>
            <ul class="list-group list-group-flush">
              <li class="list-group-item">
                <div class="btn-group" role="group" aria-label="Tools">
                  <input
                    type="radio"
                    class="btn-check"
                    name="btnradio"
                    id="select"
                    autocomplete="off"
                    checked
                  />
                  <label class="btn btn-outline-primary btn-sm" for="select"
                    >انتخاب</label
                  >

                  <input
                    type="radio"
                    class="btn-check"
                    name="btnradio"
                    id="redx"
                    autocomplete="off"
                  />
                  <label class="btn btn-outline-primary btn-sm" for="redx"
                    >نشان</label
                  >

                  <!--                            <input type="radio" class="btn-check" name="btnradio" id="dp1" autocomplete="off">-->
                  <!--                            <label class="btn btn-outline-primary btn-sm" for="dp1">DP</label>-->

                  <input
                    type="radio"
                    class="btn-check"
                    name="btnradio"
                    id="point"
                    autocomplete="off"
                  />
                  <label class="btn btn-outline-primary btn-sm" for="point"
                    >ایجاد نقطه</label
                  >

                  <input
                    v-if="config && config.callsign"
                    type="radio"
                    class="btn-check"
                    name="btnradio"
                    id="me"
                    autocomplete="off"
                  />
                  <label
                    v-if="config && config.callsign"
                    class="btn btn-outline-primary btn-sm"
                    for="me"
                    >من</label
                  >
                </div>
              </li>
              <li v-if="getTool('redx')" class="mt-1 list-group-item">
                <span class="badge bg-danger">نشان</span>: {{
                Utils.printCoordsll(getTool('redx').getLatLng()) }}
                <span
                  class="badge rounded-pill bg-success"
                  style="cursor:default;"
                  v-on:click="map.setView(getTool('redx').getLatLng())"
                  ><i class="bi bi-geo"></i
                ></span>
                <span
                  class="badge rounded-pill bg-danger"
                  style="cursor:default;"
                  v-on:click="removeTool('redx')"
                  >X</span
                >
              </li>
              <li v-if="coords" class="mt-1 list-group-item">
                <span class="badge bg-secondary">نشانگر</span>: {{
                Utils.printCoordsll(coords) }}
                <span v-if="getTool('redx')"
                  >({{ Utils.distBea(getTool('redx').getLatLng(), coords) }} از
                  نشانگر)</span
                >
              </li>
            </ul>
          </div>
        </div>
        <div
          class="tab-pane fade"
          id="v-pills-current-unit"
          role="tabpanel"
          aria-labelledby="v-pills-current-unit-tab"
        >
          <casevac-form
            :location="casevacLocation"
            :on-done="onDoneCasevac"
            :initialData="current_unit"
            v-if="current_unit && current_unit.category==='report'"
          ></casevac-form>
          <div
            class="card"
            v-if="current_unit && current_unit.category!=='report'"
          >
            <div class="card-header">
              <span
                class="pull-left fw-bold"
                v-on:click.stop="mapToUnit(current_unit)"
              >
                <img :src="milImg(current_unit)" /> {{ getUnitName(current_unit)
                }}
                <span v-if="current_unit.status">
                  ({{ current_unit.status }})</span
                >
                <img
                  height="24"
                  src="/static/icons/coord_unlock.png"
                  v-if="current_unit.category !== 'point' && locked_unit_uid != current_unit.uid"
                  v-on:click.stop="locked_unit_uid=current_unit.uid"
                />
                <img
                  height="24"
                  src="/static/icons/coord_lock.png"
                  v-if="locked_unit_uid == current_unit.uid"
                  v-on:click.stop="locked_unit_uid=''"
                />
              </span>
              <span
                class="pull-right"
                v-if="current_unit.category === 'contact'"
              >
                <button
                  type="button"
                  class="btn btn-sm btn-primary"
                  v-if="current_unit.category === 'contact'"
                  v-on:click.stop="openChat(current_unit.uid, current_unit.callsign);"
                >
                  <i class="bi bi-chat-text-fill"></i>
                </button>
              </span>
              <span
                class="pull-right"
                v-if="current_unit.category !== 'contact'"
              >
                <button
                  type="button"
                  class="btn btn-sm btn-primary"
                  data-bs-toggle="modal"
                  v-if="current_unit.category !== 'drawing' && current_unit.category !== 'route'"
                  data-bs-target="#edit"
                >
                  <i class="bi bi-pencil-square"></i>
                </button>
                <button
                  type="button"
                  class="btn btn-sm btn-primary"
                  data-bs-toggle="modal"
                  v-if="current_unit.category === 'drawing'||current_unit.category === 'route'"
                  data-bs-target="#drawing-edit"
                >
                  <i class="bi bi-pencil-square"></i>
                </button>
                <button
                  type="button"
                  class="btn btn-sm btn-danger"
                  v-on:click.stop="deleteCurrent()"
                >
                  <i class="bi bi-trash3-fill"></i>
                </button>
              </span>
            </div>
            <div class="card-body">
              <dl>
                <div class="form-group row">
                  <label
                    for="input-UID"
                    class="col-sm-4 col-form-label font-weight-bold"
                    ><strong>UID</strong></label
                  >
                  <div class="col-sm-8">
                    <input
                      type="text"
                      class="form-control"
                      id="input-UID"
                      v-model="current_unit.uid"
                      v-if="editing"
                    />
                    <label class="col-form-label" v-else
                      >{{current_unit.uid}}</label
                    >
                  </div>
                </div>
                <template v-if="current_unit.team">
                  <div class="form-group row">
                    <label
                      for="input-team"
                      class="col-sm-4 col-form-label font-weight-bold"
                      ><strong>تیم</strong></label
                    >
                    <div class="col-sm-8">
                      <input
                        type="text"
                        class="form-control"
                        id="input-team"
                        v-model="current_unit.team"
                        v-if="editing"
                      />
                      <label class="col-form-label" v-else
                        >{{current_unit.team}}</label
                      >
                    </div>
                  </div>
                  <div class="form-group row">
                    <label
                      for="input-role"
                      class="col-sm-4 col-form-label font-weight-bold"
                      ><strong>نقش</strong></label
                    >
                    <div class="col-sm-8">
                      <input
                        type="text"
                        class="form-control"
                        id="input-role"
                        v-model="current_unit.role"
                        v-if="editing"
                      />
                      <label class="col-form-label" v-else
                        >{{current_unit.role}}</label
                      >
                    </div>
                  </div>
                </template>
                <div class="form-group row">
                  <label
                    for="input-type"
                    class="col-sm-4 col-form-label font-weight-bold"
                    ><strong>نوع</strong></label
                  >
                  <div class="col-sm-8">
                    <input
                      type="text"
                      class="form-control"
                      id="input-type"
                      v-model="current_unit.type"
                      v-if="editing"
                    />
                    <label class="col-form-label" v-else
                      >{{current_unit.type}}</label
                    >
                  </div>
                </div>
                <div class="form-group row">
                  <label class="col-sm-4 col-form-label font-weight-bold"
                    ><strong>مختصات</strong></label
                  >
                  <div class="col-sm-8">
                    <label class="col-form-label"
                      >{{ Utils.printCoords(current_unit.lat, current_unit.lon)
                      }}
                      <span
                        class="badge rounded-pill bg-success"
                        style="cursor:default;"
                        v-on:click="map.setView([current_unit.lat, current_unit.lon])"
                        ><i class="bi bi-geo"></i
                      ></span>
                      <span v-if="coords"
                        >({{ Utils.distBea(Utils.latlng(current_unit.lat,
                        current_unit.lon), coords) }} تا نشانگر)</span
                      ></label
                    >
                  </div>
                </div>
                <div class="form-group row">
                  <label class="col-sm-4 col-form-label font-weight-bold"
                    ><strong>سرعت</strong></label
                  >
                  <div class="col-sm-8">
                    <label class="col-form-label"
                      >{{Utils.sp(current_unit.speed)}} KM/H</label
                    >
                  </div>
                </div>
                <div class="form-group row">
                  <label class="col-sm-4 col-form-label font-weight-bold"
                    ><strong>ارتفاع</strong></label
                  >
                  <div class="col-sm-8">
                    <label class="col-form-label"
                      >{{current_unit.hae.toFixed(1)}}</label
                    >
                  </div>
                </div>

                <div v-if="current_unit.parent_uid">
                  <div class="form-group row">
                    <label class="col-sm-4 col-form-label font-weight-bold"
                      ><strong>سازنده</strong></label
                    >
                    <div class="col-sm-8">
                      <label class="col-form-label"
                        >{{ current_unit.parent_uid }}<span
                          v-if="current_unit.parent_callsign"
                          >({{ current_unit.parent_callsign }})</span
                        ></label
                      >
                    </div>
                  </div>
                </div>
                <div class="form-group row">
                  <label class="col-sm-4 col-form-label font-weight-bold"
                    ><strong>زمان ایجاد</strong></label
                  >
                  <div class="col-sm-8">
                    <label class="col-form-label"
                      >{{ Utils.dt(current_unit.start_time) }}</label
                    >
                  </div>
                </div>
                <div class="form-group row">
                  <label class="col-sm-4 col-form-label font-weight-bold"
                    ><strong>زمان ارسال</strong></label
                  >
                  <div class="col-sm-8">
                    <label class="col-form-label"
                      >{{ Utils.dt(current_unit.send_time) }}</label
                    >
                  </div>
                </div>
                <div class="form-group row">
                  <label class="col-sm-4 col-form-label font-weight-bold"
                    ><strong>زمان انقضا</strong></label
                  >
                  <div class="col-sm-8">
                    <label class="col-form-label"
                      >{{ Utils.dt(current_unit.stale_time) }}</label
                    >
                  </div>
                </div>
              </dl>
              <div v-if="Object.keys(current_unit.sensor_data).length > 0">
                <h6>آخرین داده‌های سنسور</h6>
                <table class="table" style="table-layout: fixed">
                  <tr v-for="(value, key) in current_unit.sensor_data">
                    <td class="col-3">{{key}}</td>
                    <td
                      class="col-9"
                      style="text-overflow: ellipsis;white-space: nowrap;overflow: hidden;"
                      :title="value"
                    >
                      {{value}}
                    </td>
                  </tr>
                </table>
              </div>
              <div class="form-group row">{{ current_unit.text }}</div>
            </div>
          </div>
        </div>
        <div
          class="tab-pane fade"
          id="v-pills-casevac"
          role="tabpanel"
          aria-labelledby="v-pills-casevac-tab"
          v-if="casevacLocation"
        >
          <casevac-form
            :location="casevacLocation"
            :on-done="onDoneCasevac"
            :initialData="null"
          ></casevac-form>
        </div>
      </div>
      <div
        class="nav flex-column nav-pills ms-2"
        id="v-pills-tab"
        role="tablist"
        aria-orientation="vertical"
      >
        <button
          class="nav-link active"
          id="v-pills-overlays-tab"
          data-bs-toggle="pill"
          data-bs-target="#v-pills-overlays"
          type="button"
          role="tab"
          aria-controls="v-pills-overlays"
          aria-selected="true"
        >
          لایه‌ها
        </button>
        <button
          class="nav-link"
          id="v-pills-userinfo-tab"
          data-bs-toggle="pill"
          data-bs-target="#v-pills-userinfo"
          type="button"
          role="tab"
          aria-controls="v-pills-userinfo"
          aria-selected="false"
          v-if="config && config.callsign"
        >
          اطلاعات من
        </button>
        <button
          class="nav-link"
          id="v-pills-tools-tab"
          data-bs-toggle="pill"
          data-bs-target="#v-pills-tools"
          type="button"
          role="tab"
          aria-controls="v-pills-tools"
          aria-selected="false"
        >
          ابزارها
        </button>
        <button
          class="nav-link"
          id="v-pills-current-unit-tab"
          data-bs-toggle="pill"
          data-bs-target="#v-pills-current-unit"
          type="button"
          role="tab"
          aria-controls="v-pills-current-unit"
          aria-selected="false"
          v-if="current_unit"
        >
          {{ current_unit.callsign }}
        </button>
        <button
          class="nav-link"
          id="v-pills-casevac-tab"
          data-bs-toggle="pill"
          data-bs-target="#v-pills-casevac"
          type="button"
          role="tab"
          aria-controls="v-pills-casevac"
          aria-selected="false"
          v-if="casevacLocation"
        >
          درخواست امداد
        </button>
      </div>
    </div>
  `,
});
