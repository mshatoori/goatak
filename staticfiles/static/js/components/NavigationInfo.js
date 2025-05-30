Vue.component("NavigationInfo", {
  props: ["targetItem", "userPosition"],
  data: function () {
    return {
      showNavigationLine: false,
      throttleTimer: null,
      lastCalculation: null,
      isLoading: false,
      apiError: null,
      apiCache: new Map(), // Cache for API responses
      currentRequest: null, // For request cancellation
      apiUpdateTrigger: 0, // Reactive trigger for API updates
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

      // Use throttled calculation for performance
      return this.calculateNavigationThrottled(targetCoords);
    },
    hasValidData: function () {
      return this.navigationData !== null;
    },
    bearingDisplay: function () {
      if (!this.hasValidData) return "N/A";
      return `${this.navigationData.bearing.toFixed(1)}°T`;
    },
    distanceDisplay: function () {
      if (!this.hasValidData) return "N/A";
      const distance = this.navigationData.distance;
      return distance < 10000
        ? `${distance.toFixed(0)}m`
        : `${(distance / 1000).toFixed(1)}km`;
    },
  },
  watch: {
    userPosition: {
      handler: function (newVal, oldVal) {
        // Only recalculate if position actually changed significantly
        if (newVal && oldVal && this.hasSignificantPositionChange(oldVal, newVal)) {
          this.throttledRecalculate();
        } else if (!oldVal && newVal) {
          // Initial position set
          this.throttledRecalculate();
        }
      },
      deep: false, // Don't use deep watching to avoid recursion
    },
    targetItem: {
      handler: function (newVal, oldVal) {
        // Only recalculate if target item actually changed
        if (!oldVal || !newVal || oldVal.uid !== newVal.uid) {
          this.lastCalculation = null; // Reset cache when target changes
          this.throttledRecalculate();
        }
      },
      deep: false, // Don't use deep watching to avoid recursion
    },
    showNavigationLine: function (newVal) {
      this.$emit("navigation-line-toggle", {
        show: newVal,
        targetItem: this.targetItem,
        userPosition: this.userPosition,
        navigationData: this.navigationData,
      });
    },
  },
  methods: {
    isComplexObject: function () {
      if (!this.targetItem) return false;
      
      const type = (this.targetItem.type || '').toLowerCase();
      const category = (this.targetItem.category || '').toLowerCase();
      
      // Check for route patterns
      if (type.includes('route') || category.includes('route')) {
        return true;
      }
      
      // Check for drawing/polygon patterns
      if (type.includes('drawing') || type.includes('polygon') ||
          category.includes('drawing') || category.includes('polygon')) {
        return true;
      }
      
      // Check for complex coordinate structures
      if (this.targetItem.coordinates && this.targetItem.coordinates.length > 1) {
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
      if (this.targetItem.lat !== undefined && this.targetItem.lon !== undefined) {
        // Simple objects (points, units) with direct coordinates
        return {
          lat: this.targetItem.lat,
          lng: this.targetItem.lon,
        };
      }

      // For complex objects (routes, drawings), use placeholder approach
      // This will be enhanced later with backend support
      if (this.targetItem.coordinates && this.targetItem.coordinates.length > 0) {
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

    getCacheKey: function () {
      if (!this.targetItem || !this.userPosition) return null;
      
      const itemId = this.targetItem.uid || this.targetItem.id;
      const userLat = this.userPosition.lat.toFixed(6);
      const userLon = this.userPosition.lon.toFixed(6);
      
      return `${itemId}_${userLat}_${userLon}`;
    },

    isCacheValid: function (cacheEntry) {
      if (!cacheEntry) return false;
      
      const now = Date.now();
      const cacheAge = now - cacheEntry.timestamp;
      
      // Cache is valid for 30 seconds
      return cacheAge < 30000;
    },

    hasSignificantPositionChange: function (oldPos, newPos) {
      if (!oldPos || !newPos) return true;
      
      // Consider position change significant if moved more than 5 meters
      const distance = this.calculateSimpleDistance(oldPos, newPos);
      return distance > 5;
    },

    calculateSimpleDistance: function (pos1, pos2) {
      const R = 6371000; // Earth's radius in meters
      const toRadian = Math.PI / 180;
      
      const deltaLat = (pos2.lat - pos1.lat) * toRadian;
      const deltaLng = (pos2.lon - pos1.lon) * toRadian;
      
      const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
                Math.cos(pos1.lat * toRadian) * Math.cos(pos2.lat * toRadian) *
                Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
      
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    },

    async fetchNavigationFromAPI(itemId, userLat, userLon) {
      const url = `/api/navigation/distance/${itemId}?userLat=${userLat}&userLon=${userLon}`;
      
      // Cancel previous request if still pending
      if (this.currentRequest) {
        this.currentRequest.abort();
      }
      
      // Create new AbortController for this request
      const controller = new AbortController();
      this.currentRequest = controller;
      
      try {
        this.isLoading = true;
        this.apiError = null;
        
        const response = await fetch(url, {
          signal: controller.signal,
          headers: {
            'Accept': 'application/json',
          }
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (!data.success) {
          throw new Error(data.error || 'API request failed');
        }
        
        // Transform API response to match our internal format
        const result = {
          bearing: data.data.bearing,
          distance: data.data.distance,
          userPosition: { lat: userLat, lng: userLon },
          targetPosition: {
            lat: data.data.closestPoint.lat,
            lng: data.data.closestPoint.lon
          },
          itemType: data.data.itemType,
          source: 'api'
        };
        
        return result;
        
      } catch (error) {
        if (error.name === 'AbortError') {
          // Request was cancelled, don't treat as error
          return null;
        }
        
        console.warn('Navigation API error:', error.message);
        this.apiError = error.message;
        
        // Fallback to client-side calculation
        const targetCoords = this.getTargetCoordinates();
        if (targetCoords) {
          const fallbackResult = this.calculateNavigation(targetCoords);
          if (fallbackResult) {
            fallbackResult.source = 'fallback';
            fallbackResult.apiError = error.message;
          }
          return fallbackResult;
        }
        
        throw error;
        
      } finally {
        this.isLoading = false;
        this.currentRequest = null;
      }
    },

    getApiNavigationData: function () {
      if (!this.targetItem || !this.userPosition) {
        return null;
      }
      
      // Access the reactive trigger to ensure this computed property updates
      this.apiUpdateTrigger;
      
      const itemId = this.targetItem.uid || this.targetItem.id;
      if (!itemId) {
        console.warn('Complex object missing ID, falling back to client-side calculation');
        const targetCoords = this.getTargetCoordinates();
        return targetCoords ? this.calculateNavigation(targetCoords) : null;
      }
      
      const cacheKey = this.getCacheKey();
      const cachedResult = this.apiCache.get(cacheKey);
      
      // Return cached result if valid
      if (this.isCacheValid(cachedResult)) {
        return cachedResult.data;
      }
      
      // Check if we should make a new API call
      const shouldFetch = !cachedResult ||
                         !this.isCacheValid(cachedResult) ||
                         this.hasSignificantPositionChange(
                           cachedResult.userPosition,
                           this.userPosition
                         );
      
      if (shouldFetch && !this.isLoading) {
        // Make async API call
        this.fetchNavigationFromAPI(itemId, this.userPosition.lat, this.userPosition.lon)
          .then(result => {
            if (result) {
              // Cache the result
              this.apiCache.set(cacheKey, {
                data: result,
                timestamp: Date.now(),
                userPosition: { ...this.userPosition }
              });
              
              // Trigger reactivity update by incrementing the trigger
              this.apiUpdateTrigger++;
            }
          })
          .catch(error => {
            console.error('Failed to fetch navigation data:', error);
          });
      }
      
      // Return cached result or null while loading
      return cachedResult ? cachedResult.data : null;
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
        Math.cos(userLatLng.lat * toRadian) * Math.sin(targetCoords.lat * toRadian) -
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
      };
    },
    calculateNavigationThrottled: function (targetCoords) {
      // Use cached result if available and recent
      if (this.lastCalculation && Date.now() - this.lastCalculation.timestamp < 1000) {
        return this.lastCalculation.result;
      }

      const result = this.calculateNavigation(targetCoords);
      if (result) {
        result.source = 'client';
      }
      
      this.lastCalculation = {
        result: result,
        timestamp: Date.now(),
      };

      return result;
    },
    throttledRecalculate: function () {
      if (this.throttleTimer) {
        clearTimeout(this.throttleTimer);
      }
      this.throttleTimer = setTimeout(() => {
        this.lastCalculation = null; // Force recalculation
        
        // Clear API cache if position changed significantly
        if (this.apiCache.size > 0) {
          const currentPos = this.userPosition;
          for (const [key, cached] of this.apiCache.entries()) {
            if (this.hasSignificantPositionChange(cached.userPosition, currentPos)) {
              this.apiCache.delete(key);
            }
          }
        }
        
        // Don't use $forceUpdate() as it causes infinite recursion
        // The computed properties will automatically recalculate when needed
      }, 500);
    },

    cleanupCache: function () {
      const now = Date.now();
      for (const [key, cached] of this.apiCache.entries()) {
        if (!this.isCacheValid(cached)) {
          this.apiCache.delete(key);
        }
      }
    },
    getItemDisplayName: function () {
      if (!this.targetItem) return "Unknown";
      return this.targetItem.callsign || this.targetItem.name || `${this.targetItem.category || "Item"}`;
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
    // Clean up cache periodically
    this.cacheCleanupInterval = setInterval(() => {
      this.cleanupCache();
    }, 60000); // Clean every minute
  },
  beforeDestroy: function () {
    // Cancel any pending requests
    if (this.currentRequest) {
      this.currentRequest.abort();
    }
    
    // Clear timers
    if (this.throttleTimer) {
      clearTimeout(this.throttleTimer);
    }
    
    if (this.cacheCleanupInterval) {
      clearInterval(this.cacheCleanupInterval);
    }
    
    // Clear cache
    this.apiCache.clear();
  },
  template: html`
    <div class="card mt-2">
      <div class="card-header">
        <h6 class="mb-0">
          <i class="bi bi-compass"></i>
          Navigation Info
        </h6>
      </div>
      <div class="card-body">
        <div v-if="!targetItem" class="text-muted">
          <small>No target selected</small>
        </div>
        <div v-else-if="!userPosition" class="text-muted">
          <small>User position not available</small>
        </div>
        <div v-else-if="isLoading" class="text-center">
          <div class="spinner-border spinner-border-sm text-primary" role="status">
            <span class="visually-hidden">Loading...</span>
          </div>
          <small class="text-muted ms-2">Calculating precise distance...</small>
        </div>
        <div v-else-if="!hasValidData" class="text-muted">
          <small>Cannot calculate navigation data</small>
        </div>
        <div v-else>
          <!-- API Error Alert -->
          <div v-if="apiError && navigationData && navigationData.source === 'fallback'"
               class="alert alert-warning alert-sm mb-2" role="alert">
            <small>
              <i class="bi bi-exclamation-triangle"></i>
              Using approximate calculation (API: {{ apiError }})
            </small>
          </div>
          <div class="mb-2">
            <strong>To:</strong> {{ getItemDisplayName() }}
            <span v-if="getItemTypeDisplay()" class="text-muted">
              ({{ getItemTypeDisplay() }})
            </span>
          </div>
          
          <div class="row mb-2">
            <div class="col-6">
              <label class="form-label mb-1">
                <strong>Bearing:</strong>
              </label>
              <div class="text-primary">
                {{ bearingDisplay }}
                <small v-if="navigationData && navigationData.source === 'api'"
                       class="text-success ms-1" title="Precise calculation">
                  <i class="bi bi-check-circle"></i>
                </small>
              </div>
            </div>
            <div class="col-6">
              <label class="form-label mb-1">
                <strong>Distance:</strong>
              </label>
              <div class="text-primary">
                {{ distanceDisplay }}
                <small v-if="navigationData && navigationData.source === 'api'"
                       class="text-success ms-1" title="Precise calculation">
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
              Show navigation line
            </label>
          </div>
        </div>
      </div>
    </div>
  `,
});