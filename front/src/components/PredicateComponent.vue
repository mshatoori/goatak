<template>
  <div class="list-group-item">
    <div
      v-if="!editing"
      class="d-flex justify-content-between align-items-center"
    >
      <div>
        <span class="badge bg-primary me-2">{{ predicateTypeLabel }}</span>
        <span class="fw-semibold">{{ predicateValueLabel }}</span>
      </div>
      <div>
        <button
          type="button"
          class="btn btn-sm btn-outline-secondary me-1"
          @click="startEditing"
        >
          <i class="bi bi-pencil"></i>
        </button>
        <button
          type="button"
          class="btn btn-sm btn-outline-danger"
          @click="deletePredicate"
        >
          <i class="bi bi-trash"></i>
        </button>
      </div>
    </div>

    <div v-else>
      <form @submit.prevent="savePredicate">
        <div class="row g-2 mb-2">
          <div class="col-md-6">
            <label class="form-label form-label-sm">نوع شرط:</label>
            <select
              class="form-select form-select-sm"
              v-model="editingData.type"
              @change="onTypeChange"
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
          <div class="col-md-6">
            <label class="form-label form-label-sm">مقدار:</label>
            <select
              v-if="editingData.type && availableValues.length > 0"
              class="form-select form-select-sm"
              v-model="editingData.value"
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
              v-model="editingData.value"
              placeholder="مقدار را وارد کنید"
            />
          </div>
        </div>
        <div class="d-flex justify-content-end gap-1">
          <button
            type="button"
            class="btn btn-sm btn-secondary"
            @click="cancelEditing"
          >
            <i class="bi bi-x"></i> لغو
          </button>
          <button
            type="submit"
            class="btn btn-sm btn-success"
            :disabled="!editingData.type || !editingData.value"
          >
            <i class="bi bi-check"></i> ذخیره
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from "vue";

// Props
const props = defineProps({
  predicate: {
    type: Object,
    required: true,
  },
  polygons: {
    type: Array,
    default: () => [],
  },
});

// Emits
const emit = defineEmits(["update-predicate", "delete-predicate"]);

// Reactive state
const editing = ref(false);
const editingData = reactive({
  type: "",
  value: "",
});

const itemTypes = [
  { value: "unit", label: "واحد" },
  { value: "drawing", label: "نقشه" },
  { value: "contact", label: "مخاطب" },
  { value: "alert", label: "هشدار" },
];

const sides = [
  { value: "friendly", label: "دوست" },
  { value: "hostile", label: "دشمن" },
  { value: "neutral", label: "خنثی" },
  { value: "unknown", label: "نامشخص" },
];

const unitTypes = [
  { value: "air", label: "هوایی" },
  { value: "ground", label: "زمینی" },
  { value: "sea", label: "دریایی" },
  { value: "space", label: "فضایی" },
];

const predicateTypes = [
  { value: "item_type", label: "نوع آیتم" },
  { value: "side", label: "طرف" },
  { value: "unit_type", label: "نوع واحد" },
  { value: "location_boundary", label: "محدوده مکانی" },
];

// Computed properties
const predicateTypeLabel = computed(() => {
  const type = predicateTypes.find((pt) => pt.value === props.predicate.type);
  return type ? type.label : props.predicate.type;
});

const predicateValueLabel = computed(() => {
  switch (props.predicate.type) {
    case "item_type":
      const itemType = itemTypes.find(
        (item) => item.value === props.predicate.value
      );
      return itemType ? itemType.label : props.predicate.value;
    case "side":
      const side = sides.find((s) => s.value === props.predicate.value);
      return side ? side.label : props.predicate.value;
    case "unit_type":
      const unitType = unitTypes.find(
        (unit) => unit.value === props.predicate.value
      );
      return unitType ? unitType.label : props.predicate.value;
    case "location_boundary":
      const polygon = props.polygons.find(
        (p) => p.id.toString() === props.predicate.value.toString()
      );
      return polygon ? polygon.name : props.predicate.value;
    default:
      return props.predicate.value;
  }
});

const availableValues = computed(() => {
  switch (editingData.type) {
    case "item_type":
      return itemTypes;
    case "side":
      return sides;
    case "unit_type":
      return unitTypes;
    case "location_boundary":
      return props.polygons.map((p) => ({ value: p.id, label: p.name }));
    default:
      return [];
  }
});

// Methods
function startEditing() {
  editing.value = true;
  editingData.type = props.predicate.type;
  editingData.value = props.predicate.value;
}

function cancelEditing() {
  editing.value = false;
  editingData.type = "";
  editingData.value = "";
}

function savePredicate() {
  if (editingData.type && editingData.value) {
    const updatedPredicate = {
      ...props.predicate,
      type: editingData.type,
      value: editingData.value,
    };
    emit("update-predicate", updatedPredicate);
    cancelEditing();
  }
}

function deletePredicate() {
  if (confirm("آیا از حذف این شرط مطمئن هستید؟")) {
    emit("delete-predicate", props.predicate.id);
  }
}

function onTypeChange() {
  // Reset value when type changes
  editingData.value = "";
}
</script>

<style scoped>
/* Add any component-specific styles here if needed */
</style>
