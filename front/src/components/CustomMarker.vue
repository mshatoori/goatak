<template>
  <div
    ref="markerContent"
    class="custom-marker-container"
    :style="containerStyle"
  >
    <div class="marker-icon-wrapper">
      <img
        v-if="iconSrc"
        :src="iconSrc"
        :style="iconStyle"
        @click="handleClick"
        @contextmenu.prevent="handleContextMenu"
      />
    </div>
    <div v-if="label && showLabel" class="custom-marker-label">
      {{ label }}
      <span v-if="sublabel"><br /></span>{{ sublabel }}
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
    // iconSize: {
    //   type: Number,
    //   default: 48,
    // },
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
  emits: ["click", "contextmenu"],
  setup(props, { emit }) {
    const markerContent = ref(null);
    let marker = null;

    const containerStyle = computed(() => ({
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
    }));

    const iconStyle = computed(() => ({
      //   maxWidth: `${props.iconSize}px`,
      //   maxHeight: `${props.iconSize}px`,
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

    const handleContextMenu = (e) => {
      e.stopPropagation();
      emit("contextmenu", e);
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
      handleContextMenu,
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
  /* position: relative; */
}

.custom-marker-container > * {
  pointer-events: auto;
}

.marker-icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
}

.custom-marker-label {
  background: rgba(255, 255, 255);
  opacity: 70%;
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 12px;
  white-space: nowrap;
  pointer-events: none;
  margin-top: 2px;
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000;
}
</style>
