// const html = String.raw;
Vue.component("UserInfo", {
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
      fetch("/config", {
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
  computed: {},
  props: ["config", "coords", "configUpdated"],
  inject: ["map", "printCoords", "distBea", "latlng"],
  template: /*html*/ `
    <div class="accordion-item mb-1" v-if="config && config.callsign">
      <div class="accordion-header">
      <button class="accordion-button" type="button" data-bs-toggle="collapse" data-bs-target="#collapseUserInfo" aria-expanded="true" aria-controls="collapseUserInfo">
          اطلاعات Node جاری
          <button
            type="button"
            class="btn btn-sm btn-primary"
            @click.stop.prevent="toggleEdit"
          >
            <i class="bi bi-pencil-square" v-if="!editing"></i>
            <i class="bi bi-floppy" v-else></i>
          </button>
        </button>
      </div>
      <div id="collapseUserInfo" class="accordion-collapse collapse show" data-bs-parent="#accordion" style="">
        <div class="accordion-body">
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
                  {{ printCoords(config.lat, config.lon) }}</label
                >
                <span
                  class="badge rounded-pill bg-success"
                  style="cursor:default;"
                  v-on:click="map.setView([config.lat, config.lon])"
                  ><i class="bi bi-geo"></i
                ></span>
                <span v-if="coords"
                  >({{ distBea(latlng(config.lat, config.lon), coords) }} تا
                  نشانگر)</span
                >
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  `,
});
