Vue.component("FilterComponent", {
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
        { value: "unit", label: "واحد" },
        { value: "drawing", label: "نقشه" },
        { value: "contact", label: "مخاطب" },
        { value: "alert", label: "هشدار" },
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
  template: html`
    <div>
      <!-- Existing Predicates -->
      <div
        v-if="filter.predicates && filter.predicates.length > 0"
        class="mb-3"
      >
        <h6 class="mb-2">شرایط:</h6>
        <div class="list-group">
          <div
            v-for="predicate in filter.predicates"
            :key="predicate.id"
            class="list-group-item d-flex justify-content-between align-items-center"
          >
            <div>
              <span class="badge bg-primary me-2"
                >{{ getPredicateTypeLabel(predicate.type) }}</span
              >
              <span class="fw-semibold"
                >{{ getPredicateValueLabel(predicate) }}</span
              >
            </div>
            <div>
              <button
                type="button"
                class="btn btn-sm btn-outline-secondary me-1"
                @click="editPredicate(predicate)"
              >
                <i class="bi bi-pencil"></i>
              </button>
              <button
                type="button"
                class="btn btn-sm btn-outline-danger"
                @click="deletePredicate(predicate.id)"
              >
                <i class="bi bi-trash"></i>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Add New Predicate -->
      <div class="border-top pt-3">
        <h6 class="mb-2">افزودن شرط جدید:</h6>
        <div class="row g-2">
          <div class="col-md-5">
            <select
              class="form-select form-select-sm"
              v-model="newPredicate.type"
            >
              <option value="" disabled>نوع شرط را انتخاب کنید</option>
              <option
                v-for="type in predicateTypes"
                :key="type.value"
                :value="type.value"
              >
                {{ type.label }}
              </option>
            </select>
          </div>
          <div class="col-md-5">
            <select
              v-if="newPredicate.type && availableValues.length > 0"
              class="form-select form-select-sm"
              v-model="newPredicate.value"
            >
              <option value="" disabled>مقدار را انتخاب کنید</option>
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
              placeholder="مقدار را وارد کنید"
              @keyup.enter="addPredicate"
            />
          </div>
          <div class="col-md-2">
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
  `,
});
