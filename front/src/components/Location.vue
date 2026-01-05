<template>
  <span class="location-component">
    {{ formattedCoords }}
    <i
      class="bi bi-clipboard ms-1 copy-icon"
      @click.stop="copyToClipboard"
      title="کپی مختصات"
      style="cursor: pointer; font-size: 0.8rem"
    ></i>
    <span
      class="badge rounded-pill bg-success ms-1"
      style="cursor: pointer"
      @click.stop="$emit('focus')"
    >
      <i class="bi bi-geo"></i>
    </span>
    <span v-if="otherCoords" class="ms-1">
      ({{ distanceInfo }} تا نشانگر)
    </span>
  </span>
</template>

<script>
import { printCoords, distBea, latlng } from "../utils.js";

export default {
  name: "Location",
  props: {
    lat: { type: Number, required: true },
    lon: { type: Number, required: true },
    otherCoords: { type: Object, default: null },
  },
  computed: {
    formattedCoords() {
      return printCoords(this.lat, this.lon);
    },
    distanceInfo() {
      if (!this.otherCoords) return "";
      return distBea(latlng(this.lat, this.lon), this.otherCoords);
    },
  },
  methods: {
    copyToClipboard() {
      const text = this.formattedCoords;
      navigator.clipboard.writeText(text);
    },
  },
};
</script>

<style scoped>
.location-component {
  display: inline-block;
}
.copy-icon:hover {
  color: #0d6efd;
}
</style>
