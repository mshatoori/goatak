<template>
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
          v-if="
            apiError && navigationData && navigationData.source === 'fallback'
          "
          class="alert alert-warning alert-sm mb-2"
          role="alert"
        >
          <small>
            <i class="bi bi-exclamation-triangle"></i>
            استفاده از محاسبه تقریبی (API: {{ apiError }})
          </small>
        </div>

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
</template>

<script setup>
import { ref, computed, watch, nextTick } from "vue";
import { formatNumber, formatBearing, formatDistance } from "../utils.js";

// Props
const props = defineProps({
  targetItem: {
    type: Object,
    default: null,
  },
  userPosition: {
    type: Object,
    default: null,
  },
});

// Emits
const emit = defineEmits(["navigation-line-toggle"]);

// Reactive state
const showNavigationLine = ref(false);
const isLoading = ref(false);
const apiError = ref(null);
const apiResult = ref(null);

// Computed properties
const navigationData = computed(() => {
  if (!props.targetItem || !props.userPosition) {
    return null;
  }

  // Check if this is a complex object that needs API calculation
  if (isComplexObject()) {
    return getApiNavigationData();
  }

  // Get coordinates based on item type for simple objects
  const targetCoords = getTargetCoordinates();
  if (!targetCoords) {
    return null;
  }

  // Direct calculation without throttling
  return calculateNavigation(targetCoords);
});

const hasValidData = computed(() => {
  return navigationData.value !== null;
});

const bearingDisplay = computed(() => {
  if (!hasValidData.value) return "N/A";
  return formatBearing(navigationData.value.bearing);
});

const distanceDisplay = computed(() => {
  if (!hasValidData.value) return "N/A";
  return formatDistance(navigationData.value.distance);
});

// Watch
watch(
  () => props.userPosition,
  (newVal, oldVal) => {
    console.log("WATCH @userPosition");
    // Clear API result and recalculate immediately when position changes
    if (newVal) {
      apiResult.value = null;

      // For complex objects, force immediate recalculation
      if (props.targetItem && isComplexObject()) {
        // Give time for the computed property to trigger API call
        nextTick(() => {
          if (showNavigationLine.value) {
            // The API call will handle the navigation line update
            getApiNavigationData();
            emit("navigation-line-toggle", {
              show: true,
              targetItem: props.targetItem,
              userPosition: newVal,
              navigationData: navigationData.value,
            });
          }
        });
      } else {
        // Update navigation line if it's currently shown for simple objects
        if (showNavigationLine.value && props.targetItem) {
          nextTick(() => {
            emit("navigation-line-toggle", {
              show: true,
              targetItem: props.targetItem,
              userPosition: newVal,
              navigationData: navigationData.value,
            });
          });
        }
      }
    }
  },
  { deep: false }
);

watch(
  () => props.targetItem,
  (newVal, oldVal) => {
    console.log("WATCH @targetItem");
    // Clear API result and recalculate immediately when target changes
    if (newVal) {
      apiResult.value = null;

      // For complex objects, force immediate recalculation
      if (isComplexObject()) {
        // Give time for the computed property to trigger API call
        nextTick(() => {
          if (showNavigationLine.value && props.userPosition) {
            // The API call will handle the navigation line update
            getApiNavigationData();
          }
        });
      } else {
        // Update navigation line if it's currently shown for simple objects
        if (showNavigationLine.value && props.userPosition) {
          nextTick(() => {
            emit("navigation-line-toggle", {
              show: true,
              targetItem: newVal,
              userPosition: props.userPosition,
              navigationData: navigationData.value,
            });
          });
        }
      }
    }
  },
  { deep: false }
);

watch(showNavigationLine, (newVal) => {
  console.log("WATCH @showNavigationLine");
  emit("navigation-line-toggle", {
    show: newVal,
    targetItem: props.targetItem,
    userPosition: props.userPosition,
    navigationData: navigationData.value,
  });
});

watch(
  navigationData,
  (newVal, oldVal) => {
    console.log("WATCH @navigationData");
    // Update navigation line whenever navigation data changes
    if (showNavigationLine.value && newVal) {
      emit("navigation-line-toggle", {
        show: true,
        targetItem: props.targetItem,
        userPosition: props.userPosition,
        navigationData: newVal,
      });
    }
  },
  { deep: false }
);

// Methods
function isComplexObject() {
  if (!props.targetItem) return false;

  const type = (props.targetItem.type || "").toLowerCase();
  const category = (props.targetItem.category || "").toLowerCase();

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
  if (props.targetItem.coordinates && props.targetItem.coordinates.length > 1) {
    return true;
  }

  if (props.targetItem.route && props.targetItem.route.length > 1) {
    return true;
  }

  return false;
}

function getTargetCoordinates() {
  if (!props.targetItem) return null;

  // Handle different object types
  if (
    props.targetItem.lat !== undefined &&
    props.targetItem.lon !== undefined
  ) {
    // Simple objects (points, units) with direct coordinates
    return {
      lat: props.targetItem.lat,
      lng: props.targetItem.lon,
    };
  }

  // For complex objects (routes, drawings), use placeholder approach
  // This will be enhanced later with backend support
  if (props.targetItem.coordinates && props.targetItem.coordinates.length > 0) {
    // Use first coordinate as placeholder
    const firstCoord = props.targetItem.coordinates[0];
    return {
      lat: firstCoord.lat || firstCoord[0],
      lng: firstCoord.lng || firstCoord[1],
    };
  }

  // Handle route objects
  if (props.targetItem.route && props.targetItem.route.length > 0) {
    const firstPoint = props.targetItem.route[0];
    return {
      lat: firstPoint.lat,
      lng: firstPoint.lng,
    };
  }

  return null;
}

async function fetchNavigationFromAPI(itemId, userLat, userLon) {
  const url =
    window.baseUrl +
    `/api/navigation/distance/${itemId}?userLat=${userLat}&userLon=${userLon}`;

  try {
    isLoading.value = true;
    apiError.value = null;

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
    apiError.value = error.message;

    // Fallback to client-side calculation
    const targetCoords = getTargetCoordinates();
    if (targetCoords) {
      const fallbackResult = calculateNavigation(targetCoords);
      if (fallbackResult) {
        fallbackResult.source = "fallback";
        fallbackResult.apiError = error.message;
      }
      return fallbackResult;
    }

    throw error;
  } finally {
    isLoading.value = false;
  }
}

function getApiNavigationData() {
  if (!props.targetItem || !props.userPosition) {
    return null;
  }

  const itemId = props.targetItem.uid || props.targetItem.id;
  if (!itemId) {
    console.warn(
      "Complex object missing ID, falling back to client-side calculation"
    );
    const targetCoords = getTargetCoordinates();
    return targetCoords ? calculateNavigation(targetCoords) : null;
  }

  // Make immediate API call without caching
  if (!isLoading.value && !apiResult.value) {
    fetchNavigationFromAPI(
      itemId,
      props.userPosition.lat,
      props.userPosition.lon
    )
      .then((result) => {
        if (result) {
          apiResult.value = result;

          // Trigger navigation line update for complex objects
          if (showNavigationLine.value) {
            nextTick(() => {
              emit("navigation-line-toggle", {
                show: true,
                targetItem: props.targetItem,
                userPosition: props.userPosition,
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

  return apiResult.value;
}

function calculateNavigation(targetCoords) {
  if (!props.userPosition || !targetCoords) {
    return null;
  }

  const userLatLng = {
    lat: props.userPosition.lat,
    lng: props.userPosition.lon,
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
}

function getItemDisplayName() {
  if (!props.targetItem) return "نامشخص";
  return (
    props.targetItem.callsign ||
    props.targetItem.name ||
    `${props.targetItem.category || "آیتم"}`
  );
}

function getItemTypeDisplay() {
  if (!props.targetItem) return "";
  if (props.targetItem.category) {
    return props.targetItem.category;
  }
  if (props.targetItem.type) {
    return props.targetItem.type;
  }
  return "";
}
</script>

<style scoped>
/* Add any component-specific styles here if needed */
</style>
