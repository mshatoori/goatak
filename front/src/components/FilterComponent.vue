<template>
    <div>
      <!-- Existing Predicates -->
      <div
        v-if="filter.predicates && filter.predicates.length > 0"
        class="mb-2"
      >
        <div class="small fw-bold mb-1">شرایط:</div>
        <div class="d-flex flex-wrap gap-1 mb-2">
          <div
            v-for="predicate in filter.predicates"
            :key="predicate.id"
            class="d-flex align-items-center bg-light rounded px-2 py-1 small"
          >
            <span class="badge bg-primary badge-sm me-1"
              >{{ getPredicateTypeLabel(predicate.type) }}</span
            >
            <span class="me-2">{{ getPredicateValueLabel(predicate) }}</span>
            <button
              type="button"
              class="btn btn-sm p-0 me-1"
              @click="editPredicate(predicate)"
              style="font-size: 10px; width: 16px; height: 16px;"
            >
              <i class="bi bi-pencil"></i>
            </button>
            <button
              type="button"
              class="btn btn-sm p-0 text-danger"
              @click="deletePredicate(predicate.id)"
              style="font-size: 10px; width: 16px; height: 16px;"
            >
              <i class="bi bi-trash"></i>
            </button>
          </div>
        </div>
      </div>

      <!-- Add New Predicate -->
      <div class="border-top pt-2">
        <div class="small fw-bold mb-1">افزودن شرط:</div>
        <div class="row g-1">
          <div class="col-5">
            <select
              class="form-select form-select-sm"
              v-model="newPredicate.type"
            >
              <option value="" disabled>نوع</option>
              <option
                v-for="type in predicateTypes"
                :key="type.value"
                :value="type.value"
              >
                {{ type.label }}
              </option>
            </select>
          </div>
          <div class="col-5">
            <select
              v-if="newPredicate.type && availableValues.length > 0"
              class="form-select form-select-sm"
              v-model="newPredicate.value"
            >
              <option value="" disabled>مقدار</option>
              <option
                v-for="option in availableValues"
                :key="option.value"
                :value="option.value"
              >
                {{ option.label }}
              </option>
            </select>
            <input
              v-else
              type="text"
              class="form-control form-control-sm"
              v-model="newPredicate.value"
              placeholder="مقدار"
              @keyup.enter="addPredicate"
            />
          </div>
          <div class="col-2">
            <button
              type="button"
              class="btn btn-sm btn-success w-100"
              v-on:click="addPredicate"
              :disabled="!newPredicate.type || !newPredicate.value"
            >
              <i class="bi bi-plus"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  </template>

<script>
export default {
  props: ["filter", "polygons"],
  data: function () {
    return {
      newPredicate: {
        type: "",
        value: "",
      },
      predicateTypes: [
        { value: "item_type", label: "نوع آیتم" },
        { value: "side", label: "طرف" },
        { value: "unit_type", label: "نوع واحد" },
        { value: "location_boundary", label: "محدوده مکانی" },
      ],
      itemTypes: [
        { value: "contact", label: "مخاطب" },
        { value: "unit", label: "نیرو" },
        { value: "alert", label: "هشدار" },
        { value: "point", label: "نقطه" },
        { value: "polygon", label: "ناحیه" },
        { value: "route", label: "مسیر" },
      ],
      sides: [
        { value: "friendly", label: "دوست" },
        { value: "hostile", label: "دشمن" },
        { value: "neutral", label: "خنثی" },
        { value: "unknown", label: "نامشخص" },
      ],
      unitTypes: [
        { value: "air", label: "هوایی" },
        { value: "ground", label: "زمینی" },
        { value: "sea", label: "دریایی" },
        { value: "space", label: "فضایی" },
      ],
    };
  },
  mounted: function () {
    // Listen for the event to add pending predicates before save
    this.$root.$on("add-pending-predicates", () => {
      this.addPendingPredicateIfExists();
    });
  },
  beforeDestroy: function () {
    // Clean up the event listener
    this.$root.$off("add-pending-predicates");
  },
  computed: {
    availableValues: function () {
      switch (this.newPredicate.type) {
        case "item_type":
          return this.itemTypes;
        case "side":
          return this.sides;
        case "unit_type":
          return this.unitTypes;
        case "location_boundary":
          return this.polygons.map((p) => ({ value: p.id, label: p.name }));
        default:
          return [];
      }
    },
  },
  methods: {
    deleteFilter: function () {
      if (confirm("آیا از حذف این فیلتر مطمئن هستید؟")) {
        this.$emit("delete-filter", this.filter.id);
      }
    },
    addPredicate: function () {
      if (this.newPredicate.type && this.newPredicate.value) {
        const predicate = {
          id: this.generateId(),
          type: this.newPredicate.type,
          value: this.newPredicate.value,
        };
        const updatedFilter = {
          ...this.filter,
          predicates: [...(this.filter.predicates || []), predicate],
        };
        this.$emit("update-filter", updatedFilter);
        this.newPredicate = { type: "", value: "" };
      }
    },
    addPendingPredicateIfExists: function () {
      // Check if there's a pending predicate that hasn't been added yet
      if (this.newPredicate.type && this.newPredicate.value) {
        this.addPredicate();
      }
    },
    updatePredicate: function (updatedPredicate) {
      const predicateIndex = this.filter.predicates.findIndex(
        (p) => p.id === updatedPredicate.id
      );
      if (predicateIndex !== -1) {
        const updatedPredicates = [...this.filter.predicates];
        updatedPredicates[predicateIndex] = updatedPredicate;
        const updatedFilter = {
          ...this.filter,
          predicates: updatedPredicates,
        };
        this.$emit("update-filter", updatedFilter);
      }
    },
    deletePredicate: function (predicateId) {
      const updatedPredicates = this.filter.predicates.filter(
        (p) => p.id !== predicateId
      );
      const updatedFilter = {
        ...this.filter,
        predicates: updatedPredicates,
      };
      this.$emit("update-filter", updatedFilter);
    },
    generateId: function () {
      return Date.now().toString() + Math.random().toString(36).substr(2, 9);
    },
    getPredicateTypeLabel: function (type) {
      const predicateType = this.predicateTypes.find((pt) => pt.value === type);
      return predicateType ? predicateType.label : type;
    },
    getPredicateValueLabel: function (predicate) {
      switch (predicate.type) {
        case "item_type":
          const itemType = this.itemTypes.find(
            (item) => item.value === predicate.value
          );
          return itemType ? itemType.label : predicate.value;
        case "side":
          const side = this.sides.find((s) => s.value === predicate.value);
          return side ? side.label : predicate.value;
        case "unit_type":
          const unitType = this.unitTypes.find(
            (unit) => unit.value === predicate.value
          );
          return unitType ? unitType.label : predicate.value;
        case "location_boundary":
          const polygon = this.polygons.find(
            (p) => p.id.toString() === predicate.value.toString()
          );
          return polygon ? polygon.name : predicate.value;
        default:
          return predicate.value;
      }
    },
  },
};
</script>

<style>
/* Your styles here */
</style>