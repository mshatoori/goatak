import store from '../store.js';


const UserInfo = {
  data: function () {
    return {
      sharedState: store.state,
      editing: false, // TODO: Input should have internal models, and don't set config.<field>!
    };
  },
  methods: {
    toggleEdit() {
      if (this.editing) this.save();
      this.editing = !this.editing;
      // TODO: Save (in server)
      // TODO: Fix infomarker
    },
    save() {
      fetch(window.baseUrl + "/config", {
        headers: { "Content-Type": "application/json" },
        method: "PATCH",
        body: JSON.stringify({
          callsign: this.config.callsign,
          uid: this.config.uid,
          ip_address: this.config.ip_address,
          urn: this.config.urn.toString(),
        }),
      }).then((_) => {
        this.configUpdated();
      });
    },
  },
  watch: {
    "sharedState.emergency.switch1"(val) {
      this.checkEmergency(
        this.sharedState.emergency.switch1,
        this.sharedState.emergency.switch2,
        this.sharedState.emergency.type
      );
    },
    "sharedState.emergency.switch2"(val) {
      this.checkEmergency(
        this.sharedState.emergency.switch1,
        this.sharedState.emergency.switch2,
        this.sharedState.emergency.type
      );
    },
  },
  computed: {},
  props: ["config", "coords", "configUpdated", "map", "checkEmergency"],
  inject: [],
  template: `
    <div class="card">
      <h5 class="card-header">
        اطلاعات من
        <button
          type="button"
          class="btn btn-sm btn-primary"
          @click.stop.prevent="toggleEdit"
        >
          <i class="bi bi-pencil-square" v-if="!editing"></i>
          <i class="bi bi-floppy" v-else></i>
        </button>
      </h5>
      <div class="card-body">
        <form>
          <div class="form-group row">
            <label
              for="inputUid"
              class="col-sm-4 col-form-label font-weight-bold"
              ><strong>UID</strong></label
            >
            <div class="col-sm-8">
              <input
                type="text"
                class="form-control"
                id="inputUid"
                v-model="config.uid"
                v-if="editing"
              />
              <label class="col-form-label" v-else>{{config.uid}}</label>
            </div>
          </div>
          <div class="form-group row">
            <label
              for="inputCallSign"
              class="col-sm-4 col-form-label font-weight-bold"
            >
              <strong>CallSign</strong>
            </label>
            <div class="col-sm-8">
              <input
                type="text"
                class="form-control"
                id="inputCallSign"
                v-model="config.callsign"
                v-if="editing"
              />
              <label class="col-form-label" v-else>{{config.callsign}}</label>
            </div>
          </div>
          <div class="form-group row">
            <label
              for="inputIP"
              class="col-sm-4 col-form-label font-weight-bold"
            >
              <strong>IP</strong>
            </label>
            <div class="col-sm-8">
              <input
                type="text"
                class="form-control"
                id="inputIP"
                v-model="config.ip_address"
                v-if="editing"
              />
              <label class="col-form-label" v-else>{{config.ip_address}}</label>
            </div>
          </div>
          <div class="form-group row">
            <label
              for="inputUrn"
              class="col-sm-4 col-form-label font-weight-bold"
            >
              <strong>URN</strong>
            </label>
            <div class="col-sm-8">
              <input
                type="text"
                class="form-control"
                id="inputUrn"
                v-model="config.urn"
                v-if="editing"
              />
              <label class="col-form-label" v-else>{{config.urn}}</label>
            </div>
          </div>
          <div class="form-group row">
            <label class="col-sm-4 col-form-label font-weight-bold">
              <strong>مختصات</strong>
            </label>
            <div class="col-sm-8">
              <label class="col-form-label">
                {{ Utils.printCoords(config.lat, config.lon) }}</label
              >
              <span
                class="badge rounded-pill bg-success"
                style="cursor:default;"
                v-on:click="map.setView([config.lat, config.lon])"
                ><i class="bi bi-geo"></i
              ></span>
              <span v-if="coords"
                >({{ Utils.distBea(Utils.latlng(config.lat, config.lon), coords)
                }} تا نشانگر)</span
              >
            </div>
          </div>
        </form>
      </div>
      <div class="card-footer">
        <li class="d-flex mt-1 list-group-item">
          <div class="d-inline-block">
            <div class="form-check form-switch">
              <input
                class="form-check-input"
                type="checkbox"
                role="switch"
                id="emergSwitch1"
                v-model="sharedState.emergency.switch1"
              />
              <!--                                    <label class="form-check-label" for="emergSwitch1">خطر</label>-->
            </div>
            <div class="form-check form-switch">
              <input
                class="form-check-input"
                type="checkbox"
                role="switch"
                id="emergSwitch2"
                v-model="sharedState.emergency.switch2"
              />
              <!--                                    <label class="form-check-label" for="emergSwitch2">خطر</label>-->
            </div>
          </div>
          <!--                                <div class="form-check form-check-inline">-->
          <div class="flex-fill"></div>
          <select
            class="form-select form-select-sm d-inline-block"
            v-model="sharedState.emergency.type"
          >
            <option selected value="b-a-o-tbl">هشدار</option>
            <option value="b-a-o-opn">مواجهه با دشمن</option>
            <option value="b-a-o-pan">تلفات</option>
          </select>
          <!--                                </div>-->
        </li>
      </div>
    </div>
  `,
};

export default UserInfo;