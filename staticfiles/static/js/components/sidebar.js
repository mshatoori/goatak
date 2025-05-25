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

      // tab.show();

      // }
    },

    // Check if any tab is active
    // checkActiveTabs: function () {
    //   const activeTabs = document.querySelectorAll(
    //     "#v-pills-tab .nav-link.active"
    //   );
    //   console.log("activetabs", activeTabs);
    //   const isAnyTabActive = activeTabs.length > 0;
    //   this.isCollapsed = !isAnyTabActive;
    //   this.$emit("collapsed", this.isCollapsed);
    //   return isAnyTabActive;
    // },

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

    // Methods to create new items
    createNewPoint: function () {
      let now = new Date();
      let uid = "POINT." + now.getTime(); // Simple unique ID
      this.activeItem = {
        uid: uid,
        category: "point",
        callsign: "نقطه جدید",
        type: "b-m-p-s-m", // Default point type
        lat: this.coords ? this.coords.lat : 0,
        lon: this.coords ? this.coords.lng : 0,
        text: "",
        send: true,
        web_sensor: "",
        isNew: true,
      };
      this.switchTab("item-details");
    },

    createNewUnit: function () {
      let now = new Date();
      let uid = "UNIT." + now.getTime(); // Simple unique ID
      this.activeItem = {
        uid: uid,
        category: "unit",
        callsign: "نیروی جدید",
        type: "a-f-G-U-C", // Default unit type (example)
        aff: "f", // Default affiliation (friendly)
        lat: this.coords ? this.coords.lat : 0,
        lon: this.coords ? this.coords.lng : 0,
        text: "",
        send: true,
        web_sensor: "",
        isNew: true,
        root_sidc: app.getSidc("a-f-G-U-C"), // Initialize root_sidc
        subtype: "a-f-G-U-C", // Initialize subtype
      };
      this.switchTab("item-details");
    },

    createNewDrawing: function (type) {
      let now = new Date();
      let uid = (type === "route" ? "ROUTE." : "DRAWING.") + now.getTime(); // Simple unique ID
      this.activeItem = {
        uid: uid,
        category: type === "route" ? "route" : "drawing",
        callsign: type === "route" ? "مسیر جدید" : "چندضلعی جدید",
        type: type === "route" ? "u-d-r" : "u-d-f", // Default drawing type (route or polygon)
        lat: this.coords ? this.coords.lat : 0, // May not be needed for drawings initially
        lon: this.coords ? this.coords.lng : 0, // May not be needed for drawings initially
        points: [], // Drawings have points
        color: "blue", // Default color
        text: "",
        send: true,
        web_sensor: "",
        isNew: true,
        geofence: false, // Default geofence state
        geofence_aff: "All", // Default geofence affiliation
      };
      this.switchTab("item-details");
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
      console.log("sidebar selectedItem watcher:", { newVal, oldVal });
      // Handle selection of existing items
      if (newVal && (oldVal === null || newVal.uid !== oldVal.uid)) {
        if (newVal.isNew) {
          console.log(
            "sidebar watcher: new item, setting activeItem and switching tab"
          );
        } else {
          console.log(
            "sidebar watcher: existing item, setting activeItem and switching tab"
          );
          // const existingItem = { ...newVal }; // Create a copy
          // delete existingItem.isNew;
          // this.activeItem = existingItem;
        }
        this.$nextTick(() => {
          console.log("sidebar watcher: switching to item-details tab");
          this.switchTab("item-details", true);
        });
      } else if (newVal === null && oldVal !== null) {
        console.log(
          "sidebar watcher: selectedItem cleared, clearing activeItem"
        );
        // Clear active item when selectedItem is cleared
        // this.activeItem = null;
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
    "onDoneCasevac",
  ],
  inject: ["getTool", "removeTool"],
  // mounted() {
  //   // Check if any tab is active on mount
  //   this.$nextTick(() => {
  //     this.checkActiveTabs();
  //   });

  //   // Listen for tab show/hide events from Bootstrap
  //   const tabEl = document.querySelector("#v-pills-tab");
  //   if (tabEl) {
  //     // tabEl.addEventListener("hidden.bs.tab", () => {
  //     //   console.log('tabEl.addEventListener("hidden.bs.tab"');
  //     //   this.checkActiveTabs();
  //     // });

  //     tabEl.addEventListener("shown.bs.tab", (e) => {
  //       console.log('tabEl.addEventListener("shown.bs.tab", () => {');
  //       this.isCollapsed = false;
  //       this.$emit("collapsed", false);
  //     });
  //   }
  // },
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
              <li class="list-group-item">
                <div class="btn-group" role="group" aria-label="Create Items">
                  <button
                    type="button"
                    class="btn btn-success btn-sm"
                    v-on:click="createNewPoint"
                  >
                    <i class="bi bi-geo-alt-fill"></i> ایجاد نقطه
                  </button>
                  <button
                    type="button"
                    class="btn btn-success btn-sm"
                    v-on:click="createNewUnit"
                  >
                    <i class="bi bi-person-fill"></i> ایجاد نیرو
                  </button>
                  <button
                    type="button"
                    class="btn btn-success btn-sm"
                    v-on:click="createNewDrawing('polygon')"
                  >
                    <i class="bi bi-pentagon-fill"></i> ایجاد چندضلعی
                  </button>
                  <button
                    type="button"
                    class="btn btn-success btn-sm"
                    v-on:click="createNewDrawing('route')"
                  >
                    <i class="bi bi-bezier2"></i> ایجاد مسیر
                  </button>
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
            :on-done="onDoneCasevac"
            :config="config"
            v-on:save="onSave"
            v-on:delete="onDelete"
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
        </button>
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
