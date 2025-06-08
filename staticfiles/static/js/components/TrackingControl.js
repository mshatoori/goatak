/**
 * TrackingControl Vue Component
 *
 * Provides user interface controls for managing trail tracking functionality
 * including global tracking settings, unit-specific configurations, and trail management
 */
Vue.component("tracking-control", {
  props: ["map", "trackingManager"],
  data: function () {
    return {
      globalTrackingEnabled: true,
      defaultTrailLength: 50,
      defaultUpdateInterval: 30,
      defaultTrailColor: "#FF0000",
      defaultTrailWidth: 2,
      defaultTrailOpacity: 0.7,
      activeTrails: [],
      showAdvancedSettings: false,
      exportFormat: "json",
      importData: "",
      importFormat: "json",
      selectedUnitForImport: "",
      refreshInterval: null,
    };
  },
  mounted: function () {
    this.refreshActiveTrails();
    // Refresh active trails every 5 seconds
    this.refreshInterval = setInterval(() => {
      this.refreshActiveTrails();
    }, 5000);
  },
  beforeDestroy: function () {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  },
  methods: {
    toggleGlobalTracking: function () {
      if (this.trackingManager) {
        this.trackingManager.setTrackingEnabled(this.globalTrackingEnabled);
        console.log(
          `Global tracking ${
            this.globalTrackingEnabled ? "enabled" : "disabled"
          }`
        );
      }
    },

    updateDefaultSettings: function () {
      // Update default settings for new trails
      if (this.trackingManager) {
        this.trackingManager.defaultConfig = {
          ...this.trackingManager.defaultConfig,
          trailLength: this.defaultTrailLength,
          updateInterval: this.defaultUpdateInterval * 1000,
          trailColor: this.defaultTrailColor,
          trailWidth: this.defaultTrailWidth,
          trailOpacity: this.defaultTrailOpacity,
        };
        console.log("Default tracking settings updated");
      }
    },

    refreshActiveTrails: function () {
      if (this.trackingManager) {
        this.activeTrails = this.trackingManager.getAllTrails();
      }
    },

    clearAllTrails: function () {
      if (
        this.trackingManager &&
        confirm("Are you sure you want to clear all trails?")
      ) {
        this.trackingManager.clearAllTrails();
        this.refreshActiveTrails();
        console.log("All trails cleared");
      }
    },

    removeTrail: function (unitUid) {
      if (this.trackingManager && confirm(`Remove trail for ${unitUid}?`)) {
        this.trackingManager.removeTrail(unitUid);
        this.refreshActiveTrails();
        console.log(`Trail removed for ${unitUid}`);
      }
    },

    updateTrailConfig: function (unitUid, config) {
      if (this.trackingManager) {
        this.trackingManager.setTrailConfig(unitUid, config);
        this.refreshActiveTrails();
        console.log(`Trail config updated for ${unitUid}`);
      }
    },

    exportTrail: function (unitUid) {
      if (this.trackingManager) {
        const data = this.trackingManager.exportTrailData(
          unitUid,
          this.exportFormat
        );
        if (data) {
          this.downloadFile(
            data,
            `trail_${unitUid}.${this.exportFormat}`,
            this.getContentType(this.exportFormat)
          );
        }
      }
    },

    exportAllTrails: function () {
      if (this.trackingManager) {
        const allTrails = this.trackingManager.getAllTrails();
        const exportData = {
          exportedAt: new Date().toISOString(),
          trails: allTrails,
        };

        const data = JSON.stringify(exportData, null, 2);
        this.downloadFile(
          data,
          `all_trails_${new Date().toISOString().split("T")[0]}.json`,
          "application/json"
        );
      }
    },

    importTrail: function () {
      if (
        this.trackingManager &&
        this.importData &&
        this.selectedUnitForImport
      ) {
        try {
          const success = this.trackingManager.importTrailData(
            this.selectedUnitForImport,
            this.importData,
            this.importFormat
          );

          if (success) {
            this.importData = "";
            this.selectedUnitForImport = "";
            this.refreshActiveTrails();
            alert("Trail data imported successfully");
          } else {
            alert("Failed to import trail data");
          }
        } catch (error) {
          console.error("Import error:", error);
          alert("Error importing trail data: " + error.message);
        }
      }
    },

    downloadFile: function (data, filename, contentType) {
      const blob = new Blob([data], { type: contentType });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    },

    getContentType: function (format) {
      switch (format) {
        case "json":
          return "application/json";
        case "csv":
          return "text/csv";
        case "gpx":
          return "application/gpx+xml";
        default:
          return "text/plain";
      }
    },

    formatTrailInfo: function (trail) {
      const positions = trail.positions.length;
      const duration =
        positions > 1
          ? new Date(trail.positions[trail.positions.length - 1].timestamp) -
            new Date(trail.positions[0].timestamp)
          : 0;
      const durationStr =
        duration > 0 ? `${Math.round(duration / 60000)}m` : "N/A";

      return `${positions} points, ${durationStr}`;
    },

    getTrailDistance: function (trail) {
      if (trail.positions.length < 2) return 0;

      let totalDistance = 0;
      for (let i = 1; i < trail.positions.length; i++) {
        const p1 = L.latLng(
          trail.positions[i - 1].lat,
          trail.positions[i - 1].lon
        );
        const p2 = L.latLng(trail.positions[i].lat, trail.positions[i].lon);
        totalDistance += p1.distanceTo(p2);
      }

      return (totalDistance / 1000).toFixed(1); // km
    },
  },

  template: html`
    <div class="tracking-control">
      <div class="card">
        <div
          class="card-header d-flex justify-content-between align-items-center"
        >
          <h5 class="mb-0">
            <i class="bi bi-geo-alt-fill"></i> Tracking Control
          </h5>
          <button
            class="btn btn-sm btn-outline-secondary"
            @click="showAdvancedSettings = !showAdvancedSettings"
          >
            <i class="bi bi-gear"></i>
          </button>
        </div>

        <div class="card-body">
          <!-- Global Tracking Toggle -->
          <div class="form-check mb-3">
            <input
              class="form-check-input"
              type="checkbox"
              id="globalTracking"
              v-model="globalTrackingEnabled"
              @change="toggleGlobalTracking"
            />
            <label class="form-check-label" for="globalTracking">
              <strong>Enable Global Tracking</strong>
            </label>
          </div>

          <!-- Advanced Settings -->
          <div v-if="showAdvancedSettings" class="border-top pt-3">
            <h6>Default Settings</h6>

            <div class="row mb-3">
              <div class="col-6">
                <label class="form-label">Trail Length:</label>
                <input
                  type="range"
                  class="form-range"
                  min="10"
                  max="200"
                  v-model="defaultTrailLength"
                  @change="updateDefaultSettings"
                />
                <small class="text-muted"
                  >{{ defaultTrailLength }} points</small
                >
              </div>

              <div class="col-6">
                <label class="form-label">Update Interval:</label>
                <select
                  class="form-select form-select-sm"
                  v-model="defaultUpdateInterval"
                  @change="updateDefaultSettings"
                >
                  <option value="10">10 seconds</option>
                  <option value="30">30 seconds</option>
                  <option value="60">1 minute</option>
                  <option value="300">5 minutes</option>
                </select>
              </div>
            </div>

            <div class="row mb-3">
              <div class="col-6">
                <label class="form-label">Default Color:</label>
                <input
                  type="color"
                  class="form-control form-control-color"
                  v-model="defaultTrailColor"
                  @change="updateDefaultSettings"
                />
              </div>

              <div class="col-6">
                <label class="form-label">Trail Width:</label>
                <input
                  type="range"
                  class="form-range"
                  min="1"
                  max="10"
                  v-model="defaultTrailWidth"
                  @change="updateDefaultSettings"
                />
                <small class="text-muted">{{ defaultTrailWidth }}px</small>
              </div>
            </div>
          </div>

          <!-- Active Trails -->
          <div class="border-top pt-3">
            <div class="d-flex justify-content-between align-items-center mb-2">
              <h6 class="mb-0">Active Trails ({{ activeTrails.length }})</h6>
              <div class="btn-group btn-group-sm">
                <button
                  class="btn btn-outline-primary"
                  @click="refreshActiveTrails"
                  title="Refresh"
                >
                  <i class="bi bi-arrow-clockwise"></i>
                </button>
                <button
                  class="btn btn-outline-danger"
                  @click="clearAllTrails"
                  title="Clear All"
                >
                  <i class="bi bi-trash"></i>
                </button>
              </div>
            </div>

            <div
              v-if="activeTrails.length === 0"
              class="text-muted text-center py-3"
            >
              No active trails
            </div>

            <div
              v-else
              class="trail-list"
              style="max-height: 300px; overflow-y: auto;"
            >
              <div
                v-for="trail in activeTrails"
                :key="trail.unitUid"
                class="trail-item border rounded p-2 mb-2"
              >
                <div class="d-flex justify-content-between align-items-start">
                  <div class="flex-grow-1">
                    <strong>{{ trail.unitUid }}</strong>
                    <br />
                    <small class="text-muted">
                      {{ formatTrailInfo(trail) }}
                      <span v-if="getTrailDistance(trail) > 0">
                        • {{ getTrailDistance(trail) }} km
                      </span>
                    </small>
                  </div>

                  <div class="btn-group btn-group-sm">
                    <button
                      class="btn btn-outline-primary"
                      @click="exportTrail(trail.unitUid)"
                      title="Export"
                    >
                      <i class="bi bi-download"></i>
                    </button>
                    <button
                      class="btn btn-outline-danger"
                      @click="removeTrail(trail.unitUid)"
                      title="Remove"
                    >
                      <i class="bi bi-x"></i>
                    </button>
                  </div>
                </div>

                <!-- Trail Configuration -->
                <div class="mt-2">
                  <div class="row g-2">
                    <div class="col-4">
                      <input
                        type="color"
                        class="form-control form-control-color form-control-sm"
                        :value="trail.config.trailColor"
                        @change="updateTrailConfig(trail.unitUid, { trailColor: $event.target.value })"
                        title="Trail Color"
                      />
                    </div>
                    <div class="col-4">
                      <input
                        type="range"
                        class="form-range"
                        min="1"
                        max="10"
                        :value="trail.config.trailWidth"
                        @change="updateTrailConfig(trail.unitUid, { trailWidth: parseInt($event.target.value) })"
                        title="Trail Width"
                      />
                    </div>
                    <div class="col-4">
                      <input
                        type="range"
                        class="form-range"
                        min="10"
                        max="200"
                        :value="trail.config.trailLength"
                        @change="updateTrailConfig(trail.unitUid, { trailLength: parseInt($event.target.value) })"
                        title="Trail Length"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Export/Import -->
          <div v-if="showAdvancedSettings" class="border-top pt-3">
            <h6>Export/Import</h6>

            <div class="row mb-2">
              <div class="col-6">
                <label class="form-label">Export Format:</label>
                <select
                  class="form-select form-select-sm"
                  v-model="exportFormat"
                >
                  <option value="json">JSON</option>
                  <option value="csv">CSV</option>
                  <option value="gpx">GPX</option>
                </select>
              </div>
              <div class="col-6 d-flex align-items-end">
                <button
                  class="btn btn-sm btn-outline-primary w-100"
                  @click="exportAllTrails"
                >
                  Export All
                </button>
              </div>
            </div>

            <div class="mb-2">
              <label class="form-label">Import Data:</label>
              <textarea
                class="form-control form-control-sm"
                rows="3"
                v-model="importData"
                placeholder="Paste trail data here..."
              ></textarea>
            </div>

            <div class="row">
              <div class="col-4">
                <select
                  class="form-select form-select-sm"
                  v-model="importFormat"
                >
                  <option value="json">JSON</option>
                  <option value="csv">CSV</option>
                </select>
              </div>
              <div class="col-4">
                <input
                  type="text"
                  class="form-control form-control-sm"
                  v-model="selectedUnitForImport"
                  placeholder="Unit UID"
                />
              </div>
              <div class="col-4">
                <button
                  class="btn btn-sm btn-outline-success w-100"
                  @click="importTrail"
                  :disabled="!importData || !selectedUnitForImport"
                >
                  Import
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
});
