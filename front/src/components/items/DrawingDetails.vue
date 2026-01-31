<template>
  <BaseItemDetails
    :item="item"
    :coords="coords"
    :locked_unit_uid="locked_unit_uid"
    :config="config"
    :editing="editing"
    :type-display="humanReadableType(item.type)"
    @update:locked_unit_uid="$emit('update:locked_unit_uid', $event)"
    @start-editing="startEditing"
    @cancel-editing="cancelEditingWrapper"
    @save-editing="saveEditingWrapper"
    @delete="deleteItemWrapper"
    @navigation-line-toggle="$emit('navigation-line-toggle', $event)"
  >
    <template #header-icon>
      <i :class="isRoute ? 'bi bi-bezier2' : 'bi bi-pentagon'"></i>
    </template>

    <template #view-content>
      <!-- Color -->
      <div class="form-group row">
        <label class="col-sm-4 col-form-label font-weight-bold">
          <strong>رنگ</strong>
        </label>
        <div class="col-sm-8">
          <label class="col-form-label">{{ colorName(item.color) }}</label>
        </div>
      </div>

      <!-- Geofence -->
      <div class="form-group row" v-if="isPolygon && item.geofence">
        <label class="col-sm-4 col-form-label font-weight-bold">
          <strong>ژئوفنس</strong>
        </label>
        <div class="col-sm-8">
          <label class="col-form-label">فعال</label>
        </div>
      </div>
      <div class="form-group row" v-if="isPolygon && item.geofence">
        <label class="col-sm-4 col-form-label font-weight-bold">
          <strong>هشدار برای</strong>
        </label>
        <div class="col-sm-8">
          <label class="col-form-label">{{ item.geofence_aff }}</label>
        </div>
      </div>
    </template>

    <template #edit-content>
      <!-- Callsign -->
      <div class="form-group row mb-3">
        <label for="edit-callsign" class="col-sm-4 col-form-label">شناسه</label>
        <div class="col-sm-8">
          <input
            type="text"
            class="form-control"
            id="edit-callsign"
            v-model="editingData.callsign"
          />
        </div>
      </div>

      <!-- Color -->
      <div class="form-group row my-2 mx-2">
        <div class="col-12">
          <label class="my-1 mr-2 col-6" for="drawing-ed-aff">رنگ</label>
          <select
            class="form-select my-1 mr-sm-2"
            id="drawing-ed-aff"
            v-model="editingData.color"
          >
            <option value="red">قرمز</option>
            <option value="blue">آبی</option>
            <option value="white">سفید</option>
            <option value="gray">خاکستری</option>
            <option value="orange">نارنجی</option>
          </select>
        </div>
      </div>

      <!-- Send Mode Selector -->
      <SendModeSelector
        v-model="editingData"
        :available-subnets="availableSubnets"
        :available-contacts="availableContacts"
      />

      <!-- Geofence (for polygons) -->
      <hr />
      <div class="form-group row my-2 mr-sm-2" v-if="isPolygon">
        <div class="form-check col-6">
          <input
            type="checkbox"
            id="drawing-ed-geofence"
            v-model="editingData.geofence"
            class="form-check-input"
          />
          <label class="form-check-label" for="drawing-ed-geofence"
            >ژئوفنس</label
          >
        </div>
        <div class="col-12">
          <label class="my-1 mr-2 col-6" for="drawing-ed-geofence-aff"
            >هشدار هنگام حضور نیروهای:</label
          >
          <select
            class="form-select my-1 mr-sm-2"
            id="drawing-ed-geofence-aff"
            v-model="editingData.geofence_aff"
          >
            <option value="Hostile">دشمن</option>
            <option value="Friendly">خودی</option>
            <option value="All">همه</option>
          </select>
        </div>
      </div>

      <!-- Remarks -->
      <div class="form-group row my-2 mx-2">
        <div class="col-12">
          <label for="drawing-ed-remarks">توضیحات</label>
          <textarea
            id="drawing-ed-remarks"
            class="form-control"
            rows="3"
            v-model="editingData.text"
          ></textarea>
        </div>
      </div>
    </template>
  </BaseItemDetails>
</template>

<script>
import { computed, watch } from "vue";
import { humanReadableType } from "../../utils.js";
import { useItemEditing } from "../../composables/useItemEditing.js";
import BaseItemDetails from "./BaseItemDetails.vue";
import SendModeSelector from "../SendModeSelector.vue";

export default {
  name: "DrawingDetails",
  components: {
    BaseItemDetails,
    SendModeSelector,
  },
  props: ["item", "coords", "locked_unit_uid", "config"],
  emits: ["save", "delete", "update:locked_unit_uid", "navigation-line-toggle"],
  setup(props, { emit }) {
    const {
      editing,
      editingData,
      availableSubnets,
      availableContacts,
      startEditing: baseStartEditing,
      cancelEditing,
      saveEditing: baseSaveEditing,
      deleteItem,
    } = useItemEditing();

    const isPolygon = computed(() => {
      return props.item && props.item.type === "u-d-f";
    });

    const isRoute = computed(() => {
      return props.item && props.item.category === "route";
    });

    function startEditing() {
      const typeSpecificFields = {
        color: props.item.color || "blue",
        points: props.item.points || [],
        geofence: props.item.geofence || false,
        geofence_aff: props.item.geofence_aff || "All",
      };
      baseStartEditing(props.item, typeSpecificFields);
    }

    function cancelEditingWrapper() {
      cancelEditing(props.item, emit);
    }

    function saveEditingWrapper() {
      baseSaveEditing(props.item, emit);
    }

    function deleteItemWrapper() {
      deleteItem(props.item, emit);
    }

    function colorName(color) {
      const colorMap = {
        white: "سفید",
        gray: "خاکستری",
        red: "قرمز",
        blue: "آبی",
        green: "سبز",
        yellow: "زرد",
        orange: "نارنجی",
        purple: "بنفش",
        black: "سیاه",
      };
      return colorMap[color] || color;
    }

    // Auto-start editing for new items
    watch(
      () => props.item,
      (newVal, oldVal) => {
        if (newVal && newVal.uid !== oldVal?.uid) {
          if (newVal.isNew) {
            startEditing();
          }
        }
      },
      { immediate: true }
    );

    return {
      editing,
      editingData,
      availableSubnets,
      availableContacts,
      isPolygon,
      isRoute,
      startEditing,
      cancelEditingWrapper,
      saveEditingWrapper,
      deleteItemWrapper,
      humanReadableType,
      colorName,
    };
  },
};
</script>

<style></style>
