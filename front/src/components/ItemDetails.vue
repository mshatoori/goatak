<template>
  <div>
    <!-- Contact Chat Button -->
    <div v-if="isContact" class="card">
      <div class="card-header">
        <span class="pull-left fw-bold">{{ item.callsign || "تماس" }}</span>
        <span class="pull-right">
          <button
            type="button"
            class="btn btn-sm btn-primary"
            @click.stop="openChat(item.uid, item.callsign)"
          >
            <i class="bi bi-chat-text-fill"></i>
          </button>
        </span>
      </div>
      <div class="card-body">
        <p>برای شروع گفتگو با این تماس، روی دکمه چت کلیک کنید.</p>
      </div>
    </div>

    <!-- Dynamic Component for Item Type -->
    <component
      v-if="componentType && !isContact"
      :is="componentType"
      :item="item"
      :coords="coords"
      :map="map"
      :locked_unit_uid="locked_unit_uid"
      :config="config"
      @save="onSave"
      @delete="onDelete"
      @open-chat="openChat"
      @navigation-line-toggle="onNavigationLineToggle"
    ></component>
  </div>
</template>

<script>
import store from "../store.js";

export default {
  name: "ItemDetails",
  props: ["item", "coords", "map", "locked_unit_uid", "config"],
  computed: {
    isCasevac() {
      return (
        this.item &&
        this.item.category === "report" &&
        this.item.type === "b-r-f-h-c"
      );
    },
    isDrawing() {
      return (
        this.item &&
        (this.item.category === "drawing" || this.item.category === "route")
      );
    },
    isPoint() {
      return this.item && this.item.category === "point";
    },
    isContact() {
      return false;
      // return this.item && this.item.category === "contact";
    },
    isUnit() {
      return (
        this.item &&
        !this.isCasevac &&
        !this.isDrawing &&
        !this.isPoint &&
        !this.isContact
      );
    },
    // Get the appropriate component name based on item type
    componentType() {
      if (this.isCasevac) return "casevac-details";
      if (this.isDrawing) return "drawing-details";
      if (this.isPoint) return "point-details";
      if (this.isUnit) return "unit-details";
      return null;
    },
  },
  methods: {
    openChat: function (uid, callsign) {
      console.log("item.details: Opening chat with", uid, callsign);
      this.$emit("open-chat", uid, callsign);
    },
    onSave(value) {
      console.log("SAVE@item.detail");
      this.$emit("save", value);
    },
    onDelete(value) {
      console.log("Delete@item.detail");
      this.$emit("delete", value);
    },
    onNavigationLineToggle(event) {
      console.log("Navigation line toggle@item.detail", event);
      this.$emit("navigation-line-toggle", event);
    },
  },
};
</script>

<style></style>
