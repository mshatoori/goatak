Vue.component("NavigationInfo", {
  props: ["targetItem", "userPosition"],
  data: function () {
    return {
      showNavigationLine: false,
      isLoading: false,
      apiError: null,
      apiResult: null,
    };
  },
  computed: {
    navigationData: function () {
      if (!this.targetItem || !this.userPosition) {
        return null;
      }

      // Check if this is a complex object that needs API calculation
      if (this.isComplexObject()) {
        return this.getApiNavigationData();
      }

      // Get coordinates based on item type for simple objects
      const targetCoords = this.getTargetCoordinates();
      if (!targetCoords) {
        return null;
      }

      // Direct calculation without throttling
      return this.calculateNavigation(targetCoords);
    },
    hasValidData: function () {
      return this.navigationData !== null;
    },
    bearingDisplay: function () {
      if (!this.hasValidData) return "N/A";
      return `${formatNumber(this.navigationData.bearing.toFixed(1))}°T`;
    },
    distanceDisplay: function () {
      if (!this.hasValidData) return "N/A";
      const distance = this.navigationData.distance;
      return distance < 10000
        ? `${formatNumber(distance.toFixed(0))}m`
        : `${formatNumber((distance / 1000).toFixed(1))}km`;
    },
  },
  watch: {
    userPosition: {
      handler: function (newVal, oldVal) {
        console.log("WATCH @userPosition");
        // Clear API result and recalculate immediately when position changes
        if (newVal) {
          this.apiResult = null;

          // For complex objects, force immediate recalculation
          if (this.targetItem && this.isComplexObject()) {
            // Force new API call by clearing result and triggering update
            this.$forceUpdate();
            // Give time for the computed property to trigger API call
            this.$nextTick(() => {
              if (this.showNavigationLine) {
                // The API call will handle the navigation line update
                this.getApiNavigationData();
                this.$emit("navigation-line-toggle", {
                  show: true,
                  targetItem: this.targetItem,
                  userPosition: newVal,
                  navigationData: this.navigationData,
                });
              }
            });
          } else {
            this.$forceUpdate();

            // Update navigation line if it's currently shown for simple objects
            if (this.showNavigationLine && this.targetItem) {
              this.$nextTick(() => {
                this.$emit("navigation-line-toggle", {
                  show: true,
                  targetItem: this.targetItem,
                  userPosition: newVal,
                  navigationData: this.navigationData,
                });
              });
            }
          }
        }
      },
      deep: false,
    },
    targetItem: {
      handler: function (newVal, oldVal) {
        console.log("WATCH @targetItem");
        // Clear API result and recalculate immediately when target changes
        if (newVal) {
          this.apiResult = null;

          // For complex objects, force immediate recalculation
          if (this.isComplexObject()) {
            // Force new API call by clearing result and triggering update
            this.$forceUpdate();
            // Give time for the computed property to trigger API call
            this.$nextTick(() => {
              if (this.showNavigationLine && this.userPosition) {
                // The API call will handle the navigation line update
                this.getApiNavigationData();
              }
            });
          } else {
            this.$forceUpdate();

            // Update navigation line if it's currently shown for simple objects
            if (this.showNavigationLine && this.userPosition) {
              this.$nextTick(() => {
                this.$emit("navigation-line-toggle", {
                  show: true,
                  targetItem: newVal,
                  userPosition: this.userPosition,
                  navigationData: this.navigationData,
                });
              });
            }
          }
        }
      },
      deep: false,
    },
    showNavigationLine: function (newVal) {
      console.log("WATCH @showNavigationLine");
      this.$emit("navigation-line-toggle", {
        show: newVal,
        targetItem: this.targetItem,
        userPosition: this.userPosition,
        navigationData: this.navigationData,
      });
    },
    navigationData: {
      handler: function (newVal, oldVal) {
        console.log("WATCH @navigationData");
        // Update navigation line whenever navigation data changes
        if (this.showNavigationLine && newVal) {
          this.$emit("navigation-line-toggle", {
            show: true,
            targetItem: this.targetItem,
            userPosition: this.userPosition,
            navigationData: newVal,
          });
        }
      },
      deep: false,
    },
  },
  methods: {
    isComplexObject: function () {
      if (!this.targetItem) return false;

      const type = (this.targetItem.type || "").toLowerCase();
      const category = (this.targetItem.category || "").toLowerCase();

      // Check for route patterns
      if (type.includes("route") || category.includes("route")) {
        return true;
      }

      // Check for drawing/polygon patterns
      if (
        type.includes("drawing") ||
        type.includes("polygon") ||
        category.includes("drawing") ||
        category.includes("polygon")
      ) {
        return true;
      }

      // Check for complex coordinate structures
      if (
        this.targetItem.coordinates &&
        this.targetItem.coordinates.length > 1
      ) {
        return true;
      }

      if (this.targetItem.route && this.targetItem.route.length > 1) {
        return true;
      }

      return false;
    },

    getTargetCoordinates: function () {
      if (!this.targetItem) return null;

      // Handle different object types
      if (
        this.targetItem.lat !== undefined &&
        this.targetItem.lon !== undefined
      ) {
        // Simple objects (points, units) with direct coordinates
        return {
          lat: this.targetItem.lat,
          lng: this.targetItem.lon,
        };
      }

      // For complex objects (routes, drawings), use placeholder approach
      // This will be enhanced later with backend support
      if (
        this.targetItem.coordinates &&
        this.targetItem.coordinates.length > 0
      ) {
        // Use first coordinate as placeholder
        const firstCoord = this.targetItem.coordinates[0];
        return {
          lat: firstCoord.lat || firstCoord[0],
          lng: firstCoord.lng || firstCoord[1],
        };
      }

      // Handle route objects
      if (this.targetItem.route && this.targetItem.route.length > 0) {
        const firstPoint = this.targetItem.route[0];
        return {
          lat: firstPoint.lat,
          lng: firstPoint.lng,
        };
      }

      return null;
    },

    async fetchNavigationFromAPI(itemId, userLat, userLon) {
      const url =
        window.baseUrl +
        `/api/navigation/distance/${itemId}?userLat=${userLat}&userLon=${userLon}`;

      try {
        this.isLoading = true;
        this.apiError = null;

        const response = await fetch(url, {
          headers: {
            Accept: "application/json",
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error || "خطا در درخواست");
        }

        // Transform API response to match our internal format
        const result = {
          bearing: data.data.bearing,
          distance: data.data.distance,
          userPosition: { lat: userLat, lng: userLon },
          targetPosition: {
            lat: data.data.closestPoint.lat,
            lng: data.data.closestPoint.lon,
          },
          itemType: data.data.itemType,
          source: "api",
        };

        return result;
      } catch (error) {
        console.warn("Navigation API error:", error.message);
        this.apiError = error.message;

        // Fallback to client-side calculation
        const targetCoords = this.getTargetCoordinates();
        if (targetCoords) {
          const fallbackResult = this.calculateNavigation(targetCoords);
          if (fallbackResult) {
            fallbackResult.source = "fallback";
            fallbackResult.apiError = error.message;
          }
          return fallbackResult;
        }

        throw error;
      } finally {
        this.isLoading = false;
      }
    },

    getApiNavigationData: function () {
      if (!this.targetItem || !this.userPosition) {
        return null;
      }

      const itemId = this.targetItem.uid || this.targetItem.id;
      if (!itemId) {
        console.warn(
          "Complex object missing ID, falling back to client-side calculation"
        );
        const targetCoords = this.getTargetCoordinates();
        return targetCoords ? this.calculateNavigation(targetCoords) : null;
      }

      // Make immediate API call without caching
      if (!this.isLoading && !this.apiResult) {
        this.fetchNavigationFromAPI(
          itemId,
          this.userPosition.lat,
          this.userPosition.lon
        )
          .then((result) => {
            if (result) {
              this.apiResult = result;

              // Trigger navigation line update for complex objects
              if (this.showNavigationLine) {
                this.$nextTick(() => {
                  this.$emit("navigation-line-toggle", {
                    show: true,
                    targetItem: this.targetItem,
                    userPosition: this.userPosition,
                    navigationData: result,
                  });
                });
              }
            }
          })
          .catch((error) => {
            console.error("Failed to fetch navigation data:", error);
          });
      }

      return this.apiResult;
    },
    calculateNavigation: function (targetCoords) {
      if (!this.userPosition || !targetCoords) {
        return null;
      }

      const userLatLng = {
        lat: this.userPosition.lat,
        lng: this.userPosition.lon,
      };

      // Calculate bearing and distance using the same logic as Utils.distBea
      const toRadian = Math.PI / 180;

      // Calculate bearing
      const y =
        Math.sin((targetCoords.lng - userLatLng.lng) * toRadian) *
        Math.cos(targetCoords.lat * toRadian);
      const x =
        Math.cos(userLatLng.lat * toRadian) *
          Math.sin(targetCoords.lat * toRadian) -
        Math.sin(userLatLng.lat * toRadian) *
          Math.cos(targetCoords.lat * toRadian) *
          Math.cos((targetCoords.lng - userLatLng.lng) * toRadian);
      let bearing = (Math.atan2(y, x) * 180) / Math.PI;
      bearing += bearing < 0 ? 360 : 0;

      // Calculate distance using Haversine formula
      const R = 6371000; // Earth's radius in meters
      const deltaLat = (targetCoords.lat - userLatLng.lat) * toRadian;
      const deltaLng = (targetCoords.lng - userLatLng.lng) * toRadian;
      const a =
        Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
        Math.cos(userLatLng.lat * toRadian) *
          Math.cos(targetCoords.lat * toRadian) *
          Math.sin(deltaLng / 2) *
          Math.sin(deltaLng / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distance = R * c;

      return {
        bearing: bearing,
        distance: distance,
        userPosition: userLatLng,
        targetPosition: targetCoords,
        source: "client",
      };
    },
    getItemDisplayName: function () {
      if (!this.targetItem) return "نامشخص";
      return (
        this.targetItem.callsign ||
        this.targetItem.name ||
        `${this.targetItem.category || "آیتم"}`
      );
    },
    getItemTypeDisplay: function () {
      if (!this.targetItem) return "";
      if (this.targetItem.category) {
        return this.targetItem.category;
      }
      if (this.targetItem.type) {
        return this.targetItem.type;
      }
      return "";
    },
  },
  mounted: function () {
    // Component mounted
  },
  beforeDestroy: function () {
    // Component cleanup
  },
  template: html`
    <div class="card mt-2">
      <div class="card-header">
        <h6 class="mb-0">
          <i class="bi bi-compass"></i>
          اطلاعات جهت‌یابی
        </h6>
      </div>
      <div class="card-body">
        <div v-if="!targetItem" class="text-muted">
          <small>هیچ هدفی انتخاب نشده</small>
        </div>
        <div v-else-if="!userPosition" class="text-muted">
          <small>موقعیت کاربر در دسترس نیست</small>
        </div>
        <div v-else-if="isLoading" class="text-center">
          <div
            class="spinner-border spinner-border-sm text-primary"
            role="status"
          >
            <span class="visually-hidden">در حال بارگذاری...</span>
          </div>
          <small class="text-muted ms-2">در حال محاسبه فاصله دقیق...</small>
        </div>
        <div v-else-if="!hasValidData" class="text-muted">
          <small>امکان محاسبه اطلاعات جهت‌یابی وجود ندارد</small>
        </div>
        <div v-else>
          <!-- API Error Alert -->
          <div
            v-if="apiError && navigationData && navigationData.source === 'fallback'"
            class="alert alert-warning alert-sm mb-2"
            role="alert"
          >
            <small>
              <i class="bi bi-exclamation-triangle"></i>
              استفاده از محاسبه تقریبی (API: {{ apiError }})
            </small>
          </div>
          <!-- <div class="mb-2">
            <strong>به:</strong> {{ getItemDisplayName() }}
            <span v-if="getItemTypeDisplay()" class="text-muted">
              ({{ getItemTypeDisplay() }})
            </span>
          </div> -->

          <div class="row mb-2">
            <div class="col-6">
              <label class="form-label mb-1">
                <strong>جهت:</strong>
              </label>
              <div class="text-primary">
                {{ bearingDisplay }}
                <small
                  v-if="navigationData && navigationData.source === 'api'"
                  class="text-success ms-1"
                  title="محاسبه دقیق"
                >
                  <i class="bi bi-check-circle"></i>
                </small>
              </div>
            </div>
            <div class="col-6">
              <label class="form-label mb-1">
                <strong>فاصله:</strong>
              </label>
              <div class="text-primary">
                {{ distanceDisplay }}
                <small
                  v-if="navigationData && navigationData.source === 'api'"
                  class="text-success ms-1"
                  title="محاسبه دقیق"
                >
                  <i class="bi bi-check-circle"></i>
                </small>
              </div>
            </div>
          </div>

          <div class="form-check">
            <input
              class="form-check-input"
              type="checkbox"
              id="show-nav-line"
              v-model="showNavigationLine"
            />
            <label class="form-check-label" for="show-nav-line">
              نمایش خط جهت‌یابی
            </label>
          </div>
        </div>
      </div>
    </div>
  `,
});
