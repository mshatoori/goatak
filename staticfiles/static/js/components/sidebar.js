Vue.component("Sidebar", {
  data: function () {
    return {
      sharedState: store.state,
      editing: false, // This might not be needed here anymore as editing state is in detail components
      // activeItem: null,
      isCollapsed: false, // Tracks sidebar collapse state
      activeTab: "overlays",
    };
  },
  methods: {
    switchTab: function (tabName, force = false) {
      console.log(
        "[switchTab] starting switch from " + this.activeTab + " to " + tabName
      );
      const triggerEl = document.querySelector(`#v-pills-${tabName}-tab`);
      if (triggerEl) {
        const tab = bootstrap.Tab.getOrCreateInstance(triggerEl);

        if (this.activeTab != tabName || force) {
          console.log("[switchTab] Showing " + tabName);
          tab.show();
          this.activeTab = tabName;
          this.isCollapsed = false;
        } else {
          triggerEl.classList.remove("active");
          let realTab = document.querySelector(tab._config.target);
          realTab.classList.remove("active", "show");
          this.activeTab = null;
          this.isCollapsed = true;
        }
      }
    },

    getActiveItemName: function () {
      if (this.activeItem) {
        if (
          this.activeItem.category === "report" &&
          this.activeItem.type === "b-r-f-h-c"
        ) {
          return "درخواست امداد";
        }
        if (this.activeItem.category === "point") {
          return this.activeItem.callsign || "نقطه";
        }
        if (this.activeItem.category === "unit") {
          return this.activeItem.callsign || "نیرو";
        }
        if (
          this.activeItem.category === "drawing" ||
          this.activeItem.category === "route"
        ) {
          return (
            this.activeItem.callsign ||
            (this.activeItem.category === "route" ? "مسیر" : "چندضلعی")
          );
        }
        return this.activeItem.callsign || "آیتم";
      }
      return "آیتم";
    },

    onSave: function (value) {
      console.log("save@sidebar", value);
      this.$emit("save", value);
    },
    onDelete: function (value) {
      this.$emit("delete", value);

      if (this.activeTab === "item-details") {
        // Switch to item details tab to collapse sidebar
        this.switchTab("item-details");
      }
    },
    onNavigationLineToggle: function (event) {
      console.log("Navigation line toggle@sidebar", event);
      this.$emit("navigation-line-toggle", event);
    },
  },

  watch: {
    isCollapsed: function (newVal) {
      // Emit the collapsed state whenever it changes
      this.$emit("collapsed", newVal);
    },
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
    activeItem: function (newVal, oldVal) {
      // console.log("sidebar selectedItem watcher:", { newVal, oldVal });
      if (newVal && (oldVal === null || newVal.uid !== oldVal.uid)) {
        this.$nextTick(() => {
          // console.log("sidebar watcher: switching to item-details tab");
          this.switchTab("item-details", true);
        });
      }
    },
  },

  props: [
    "toggleOverlay",
    "config",
    "coords",
    "configUpdated",
    "activeItem",
    "locked_unit_uid",
    "checkEmergency",
    "map",
    "casevacLocation",
    "trackingManager",
  ],
  inject: ["getTool", "removeTool"],
  template: html`
    <div class="d-flex align-items-start h-100">
      <div
        class="tab-content flex-grow-1 h-100"
        id="v-pills-tabContent"
        :class="{'d-none': isCollapsed}"
      >
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
          id="v-pills-tracking"
          role="tabpanel"
          aria-labelledby="v-pills-tracking-tab"
        >
          <tracking-control
            :map="map"
            :tracking-manager="trackingManager"
          ></tracking-control>
        </div>

        <!-- <div
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

                  <input
                    type="radio"
                    class="btn-check"
                    name="btnradio"
                    id="me"
                    autocomplete="off"
                    v-if="config && config.callsign"
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
        </div> -->

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
            :config="config"
            v-on:save="onSave"
            v-on:delete="onDelete"
            v-on:navigation-line-toggle="onNavigationLineToggle"
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
          type="button"
          role="tab"
          aria-controls="v-pills-overlays"
          aria-selected="true"
          v-on:click="switchTab('overlays')"
          data-bs-toggle="pill"
          data-bs-target="#v-pills-overlays"
        >
          لایه‌ها
        </button>
        <button
          class="nav-link"
          id="v-pills-userinfo-tab"
          type="button"
          role="tab"
          aria-controls="v-pills-userinfo"
          aria-selected="false"
          v-if="config && config.callsign"
          v-on:click="switchTab('userinfo')"
          data-bs-toggle="pill"
          data-bs-target="#v-pills-userinfo"
        >
          اطلاعات من
        </button>
        <button
          class="nav-link"
          id="v-pills-tracking-tab"
          type="button"
          role="tab"
          aria-controls="v-pills-tracking"
          aria-selected="false"
          v-on:click="switchTab('tracking')"
          data-bs-toggle="pill"
          data-bs-target="#v-pills-tracking"
        >
          <i class="bi bi-geo-alt-fill"></i> ردگیری
        </button>
        <!-- <button
          class="nav-link"
          id="v-pills-tools-tab"
          type="button"
          role="tab"
          aria-controls="v-pills-tools"
          aria-selected="false"
          v-on:click="switchTab('tools')"
          data-bs-toggle="pill"
          data-bs-target="#v-pills-tools"
        >
          ابزارها
        </button> -->
        <button
          class="nav-link"
          id="v-pills-item-details-tab"
          type="button"
          role="tab"
          aria-controls="v-pills-item-details"
          aria-selected="false"
          v-if="activeItem"
          v-on:click="switchTab('item-details')"
          data-bs-toggle="pill"
          data-bs-target="#v-pills-item-details"
        >
          {{ getActiveItemName() }}
        </button>
      </div>
    </div>
  `,
});
