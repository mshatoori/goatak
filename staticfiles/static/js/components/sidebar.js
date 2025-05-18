Vue.component("Sidebar", {
  data: function () {
    return {
      sharedState: store.state,
      editing: false,
      activeItem: null,
    };
  },
  methods: {
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

    getActiveItemName: function () {
      if (this.activeItem) {
        if (
          this.activeItem.category === "report" &&
          this.activeItem.type === "b-r-f-h-c"
        ) {
          return "درخواست امداد";
        }
        return this.activeItem.callsign || "آیتم";
      }
      return "آیتم";
    },
  },

  watch: {
    casevacLocation: function (newVal) {
      if (newVal) {
        // Create a temporary casevac item
        this.activeItem = {
          category: "report",
          type: "b-r-f-h-c",
          lat: newVal.lat,
          lon: newVal.lng,
          callsign: "درخواست امداد جدید",
          casevac_detail: {
            casevac: true,
            freq: 0,
            urgent: 0,
            priority: 0,
            routine: 0,
            hoist: false,
            extraction_equipment: false,
            ventilator: false,
            equipment_other: false,
            equipment_detail: "",
            litter: 0,
            ambulatory: 0,
            security: 0,
            hlz_marking: 0,
            us_military: 0,
            us_civilian: 0,
            nonus_military: 0,
            nonus_civilian: 0,
            epw: 0,
            child: 0,
          },
          remarks: "",
          isNew: true, // Mark as a new item to trigger automatic edit mode
        };
        this.$nextTick(() => this.switchTab("item-details"));
      }
    },
    current_unit: function (newVal, oldVal) {
      if (newVal) {
        // Check if this is a new item being added
        if (newVal.isNew === true) {
          // Keep the isNew flag
          this.activeItem = newVal;
        } else {
          // For existing items, don't automatically enter edit mode
          this.activeItem = newVal;
        }
        this.$nextTick(() => this.switchTab("item-details"));
      }
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

        <!-- New Dynamic Item Details Tab -->
        <div
          class="tab-pane fade"
          id="v-pills-item-details"
          role="tabpanel"
          aria-labelledby="v-pills-item-details-tab"
        >
          <item-details
            v-if="activeItem"
            :item="activeItem"
            :coords="coords"
            :map="map"
            :locked_unit_uid="locked_unit_uid"
            :delete-item="deleteCurrent"
            :on-done="onDoneCasevac"
            :config="config"
          ></item-details>
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
          id="v-pills-item-details-tab"
          data-bs-toggle="pill"
          data-bs-target="#v-pills-item-details"
          type="button"
          role="tab"
          aria-controls="v-pills-item-details"
          aria-selected="false"
          v-if="activeItem"
        >
          {{ getActiveItemName() }}
        </button>
      </div>
    </div>
  `,
});
