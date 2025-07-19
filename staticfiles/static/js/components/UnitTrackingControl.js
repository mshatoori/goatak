/**
 * UnitTrackingControl Vue Component
 *
 * Provides unit-specific tracking controls that can be embedded in unit detail views
 * Allows enabling/disabling tracking per unit and configuring trail appearance
 */
Vue.component("unit-tracking-control", {
  props: ["unit", "trackingManager"],
  data: function () {
    return {
      trackingEnabled: false,
      trailConfig: {
        trailColor: "#FF0000",
        trailLength: 50,
        trailWidth: 2,
        trailOpacity: 0.7,
      },
      trailStats: {
        pointCount: 0,
        distance: 0,
        duration: 0,
      },
      showAdvanced: false,
    };
  },
  mounted: function () {
    this.initializeTrackingState();
  },
  watch: {
    unit: function (newUnit, oldUnit) {
      if (newUnit && newUnit.uid !== (oldUnit && oldUnit.uid)) {
        this.initializeTrackingState();
      }
    },
  },
  methods: {
    initializeTrackingState: function () {
      if (!this.unit || !this.trackingManager) return;

      // Check if tracking is already enabled for this unit
      const existingConfig = this.trackingManager.getTrailConfig(this.unit.uid);
      const trailData = this.trackingManager.getTrailData(this.unit.uid);

      this.trackingEnabled = existingConfig.enabled && trailData.length > 0;

      if (this.trackingEnabled) {
        this.trailConfig = { ...existingConfig };
        this.updateTrailStats();
      } else {
        // Set default color based on unit UID
        this.trailConfig.trailColor = this.generateUnitColor(this.unit.uid);
      }
    },

    toggleTracking: function () {
      if (!this.unit || !this.trackingManager) return;

      if (this.trackingEnabled) {
        // Enable tracking for this unit
        const config = {
          ...this.trailConfig,
          enabled: true,
        };

        this.trackingManager.setTrailConfig(this.unit.uid, config);

        // Add current position as first point if available
        if (this.unit.lat && this.unit.lon) {
          this.trackingManager.updateTrail(this.unit.uid, {
            lat: this.unit.lat,
            lon: this.unit.lon,
            timestamp: new Date().toISOString(),
            speed: this.unit.speed || 0,
            course: this.unit.course || 0,
          });
        }

        console.log(`Tracking enabled for unit ${this.unit.uid}`);
      } else {
        // Disable tracking for this unit
        this.trackingManager.removeTrail(this.unit.uid);
        console.log(`Tracking disabled for unit ${this.unit.uid}`);
      }

      this.updateTrailStats();
    },

    updateTrailConfig: function () {
      if (!this.unit || !this.trackingManager || !this.trackingEnabled) return;

      this.trackingManager.setTrailConfig(this.unit.uid, this.trailConfig);
      console.log(`Trail config updated for unit ${this.unit.uid}`);
    },

    clearTrail: function () {
      if (!this.unit || !this.trackingManager) return;

      if (confirm(`آیا رد برای ${this.unit.callsign || this.unit.uid} پاک شود؟`)) {
        this.trackingManager.removeTrail(this.unit.uid);
        this.trackingEnabled = false;
        this.updateTrailStats();
        console.log(`Trail cleared for unit ${this.unit.uid}`);
      }
    },

    exportTrail: function () {
      if (!this.unit || !this.trackingManager) return;

      const data = this.trackingManager.exportTrailData(this.unit.uid, "json");
      if (data) {
        this.downloadFile(
          data,
          `trail_${this.unit.uid}.json`,
          "application/json"
        );
      }
    },

    updateTrailStats: function () {
      if (!this.unit || !this.trackingManager) {
        this.trailStats = { pointCount: 0, distance: 0, duration: 0 };
        return;
      }

      const trailData = this.trackingManager.getTrailData(this.unit.uid);

      this.trailStats.pointCount = trailData.length;

      if (trailData.length > 1) {
        // Calculate distance
        let totalDistance = 0;
        for (let i = 1; i < trailData.length; i++) {
          const p1 = L.latLng(trailData[i - 1].lat, trailData[i - 1].lon);
          const p2 = L.latLng(trailData[i].lat, trailData[i].lon);
          totalDistance += p1.distanceTo(p2);
        }
        this.trailStats.distance = totalDistance / 1000; // Convert to km

        // Calculate duration
        const startTime = new Date(trailData[0].timestamp);
        const endTime = new Date(trailData[trailData.length - 1].timestamp);
        this.trailStats.duration = (endTime - startTime) / 60000; // Convert to minutes
      } else {
        this.trailStats.distance = 0;
        this.trailStats.duration = 0;
      }
    },

    generateUnitColor: function (unitUid) {
      const colors = [
        "#FF0000",
        "#00FF00",
        "#0000FF",
        "#FFFF00",
        "#FF00FF",
        "#00FFFF",
        "#FFA500",
        "#800080",
        "#008000",
        "#000080",
        "#800000",
        "#808000",
        "#FF6B6B",
        "#4ECDC4",
        "#45B7D1",
        "#96CEB4",
        "#FFEAA7",
        "#DDA0DD",
      ];

      let hash = 0;
      for (let i = 0; i < unitUid.length; i++) {
        hash = unitUid.charCodeAt(i) + ((hash << 5) - hash);
      }

      return colors[Math.abs(hash) % colors.length];
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

    formatDuration: function (minutes) {
      if (minutes < 60) {
        return `${Math.round(minutes)}m`;
      } else {
        const hours = Math.floor(minutes / 60);
        const mins = Math.round(minutes % 60);
        return `${hours}h ${mins}m`;
      }
    },
  },

  template: html`
    <div class="unit-tracking-control">
      <div class="card mt-3">
        <div
          class="card-header d-flex justify-content-between align-items-center"
        >
          <h6 class="mb-0"><i class="bi bi-geo-alt"></i> ردگیری مسیر</h6>
          <button
            class="btn btn-sm btn-outline-secondary"
            @click="showAdvanced = !showAdvanced"
            v-if="trackingEnabled"
          >
            <i class="bi bi-gear"></i>
          </button>
        </div>

        <div class="card-body">
          <!-- Main Tracking Toggle -->
          <div class="form-check mb-3">
            <input
              class="form-check-input"
              type="checkbox"
              :id="'tracking-' + unit.uid"
              v-model="trackingEnabled"
              @change="toggleTracking"
            />
            <label class="form-check-label" :for="'tracking-' + unit.uid">
              <strong>ردگیری {{ unit.callsign || unit.uid }}</strong>
            </label>
          </div>

          <!-- Trail Statistics -->
          <div v-if="trackingEnabled && trailStats.pointCount > 0" class="mb-3">
            <div class="row text-center">
              <div class="col-4">
                <div class="border rounded p-2">
                  <div class="fw-bold">{{ trailStats.pointCount }}</div>
                  <small class="text-muted">نقاط</small>
                </div>
              </div>
              <div class="col-4" v-if="trailStats.distance > 0">
                <div class="border rounded p-2">
                  <div class="fw-bold">
                    {{ trailStats.distance.toFixed(1) }}
                  </div>
                  <small class="text-muted">km</small>
                </div>
              </div>
              <div class="col-4" v-if="trailStats.duration > 0">
                <div class="border rounded p-2">
                  <div class="fw-bold">
                    {{ formatDuration(trailStats.duration) }}
                  </div>
                  <small class="text-muted">مدت زمان</small>
                </div>
              </div>
            </div>
          </div>

          <!-- Trail Configuration -->
          <div v-if="trackingEnabled" class="trail-config">
            <div class="row g-2 mb-3">
              <div class="col-6">
                <label class="form-label">رنگ رد:</label>
                <input
                  type="color"
                  class="form-control form-control-color"
                  v-model="trailConfig.trailColor"
                  @change="updateTrailConfig"
                />
              </div>
              <div class="col-6">
                <label class="form-label">طول رد:</label>
                <input
                  type="number"
                  class="form-control"
                  min="10"
                  max="200"
                  v-model="trailConfig.trailLength"
                  @change="updateTrailConfig"
                />
              </div>
            </div>

            <!-- Advanced Settings -->
            <div v-if="showAdvanced" class="border-top pt-3">
              <div class="row g-2 mb-3">
                <div class="col-6">
                  <label class="form-label">عرض رد:</label>
                  <input
                    type="range"
                    class="form-range"
                    min="1"
                    max="10"
                    v-model="trailConfig.trailWidth"
                    @change="updateTrailConfig"
                  />
                  <small class="text-muted"
                    >{{ trailConfig.trailWidth }}px</small
                  >
                </div>
                <div class="col-6">
                  <label class="form-label">شفافیت:</label>
                  <input
                    type="range"
                    class="form-range"
                    min="0.1"
                    max="1"
                    step="0.1"
                    v-model="trailConfig.trailOpacity"
                    @change="updateTrailConfig"
                  />
                  <small class="text-muted"
                    >{{ Math.round(trailConfig.trailOpacity * 100) }}%</small
                  >
                </div>
              </div>
            </div>

            <!-- Action Buttons -->
            <div class="d-flex gap-2">
              <button
                class="btn btn-sm btn-outline-primary flex-fill"
                @click="exportTrail"
                title="خروجی گرفتن از داده‌های رد"
              >
                <i class="bi bi-download"></i> خروجی
              </button>
              <button
                class="btn btn-sm btn-outline-warning flex-fill"
                @click="updateTrailStats"
                title="تازه‌سازی آمار"
              >
                <i class="bi bi-arrow-clockwise"></i> تازه‌سازی
              </button>
              <button
                class="btn btn-sm btn-outline-danger flex-fill"
                @click="clearTrail"
                title="پاک کردن رد"
              >
                <i class="bi bi-trash"></i> پاک کردن
              </button>
            </div>
          </div>

          <!-- Help Text -->
          <div v-if="!trackingEnabled" class="text-muted">
            <small>
              <i class="bi bi-info-circle"></i>
              ردگیری را فعال کنید تا مسیر حرکت این واحد روی نقشه ضبط و نمایش داده شود.
            </small>
          </div>
        </div>
      </div>
    </div>
  `,
});
