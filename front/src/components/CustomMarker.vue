<template>
  <div
    ref="markerContent"
    class="custom-marker-container"
    :style="containerStyle"
  >
    <img
      v-if="iconSrc"
      :src="iconSrc"
      :style="iconStyle"
      @click="handleClick"
    />
    <div v-if="label && showLabel" class="custom-marker-label">
      {{ label }}
      <span v-if="sublabel"><br />{{ sublabel }}</span>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted, watch } from "vue";
import maplibregl from "maplibre-gl";

export default {
  name: "CustomMarker",
  props: {
    coordinates: {
      type: Array,
      required: true,
    },
    iconSrc: {
      type: String,
      default: "",
    },
    iconSize: {
      type: Number,
      default: 48,
    },
    label: {
      type: String,
      default: "",
    },
    sublabel: {
      type: String,
      default: "",
    },
    showLabel: {
      type: Boolean,
      default: true,
    },
    rotation: {
      type: Number,
      default: 0,
    },
    anchor: {
      type: String,
      default: "center",
    },
    map: {
      type: Object,
      default: null,
    },
  },
  emits: ["click"],
  setup(props, { emit }) {
    const markerContent = ref(null);
    let marker = null;

    const containerStyle = computed(() => ({
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
    }));

    const iconStyle = computed(() => ({
      maxWidth: `${props.iconSize}px`,
      maxHeight: `${props.iconSize}px`,
      cursor: "pointer",
      transform: `rotate(${props.rotation}deg)`,
    }));

    const createMarker = () => {
      if (!props.map || !markerContent.value) return;

      marker = new maplibregl.Marker({
        element: markerContent.value,
        anchor: props.anchor,
      })
        .setLngLat(props.coordinates)
        .addTo(props.map);
    };

    const updateMarker = () => {
      if (marker) {
        marker.setLngLat(props.coordinates);
      }
    };

    const handleClick = (e) => {
      e.stopPropagation();
      emit("click", e);
    };

    onMounted(() => {
      if (props.map) {
        createMarker();
      }
    });

    watch(
      () => props.map,
      (newMap) => {
        if (newMap && !marker) {
          createMarker();
        }
      }
    );

    watch(
      () => props.coordinates,
      () => {
        updateMarker();
      },
      { deep: true }
    );

    onUnmounted(() => {
      if (marker) {
        marker.remove();
        marker = null;
      }
    });

    return {
      markerContent,
      containerStyle,
      iconStyle,
      handleClick,
    };
  },
};
</script>

<style scoped>
.custom-marker-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  pointer-events: none;
}

.custom-marker-container > * {
  pointer-events: auto;
}

.custom-marker-label {
  background: rgba(255, 255, 255, 0.9);
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 12px;
  white-space: nowrap;
  pointer-events: none;
  margin-top: 2px;
}
</style>
