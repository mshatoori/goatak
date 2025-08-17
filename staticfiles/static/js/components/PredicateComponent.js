Vue.component("PredicateComponent", {
  props: ["predicate", "polygons"],
  data: function () {
    return {
      editing: false,
      editingData: {
        type: "",
        value: ""
      },
      itemTypes: [
        { value: 'unit', label: 'واحد' },
        { value: 'drawing', label: 'نقشه' },
        { value: 'contact', label: 'مخاطب' },
        { value: 'alert', label: 'هشدار' }
      ],
      sides: [
        { value: 'friendly', label: 'دوست' },
        { value: 'hostile', label: 'دشمن' },
        { value: 'neutral', label: 'خنثی' },
        { value: 'unknown', label: 'نامشخص' }
      ],
      unitTypes: [
        { value: 'air', label: 'هوایی' },
        { value: 'ground', label: 'زمینی' },
        { value: 'sea', label: 'دریایی' },
        { value: 'space', label: 'فضایی' }
      ],
      predicateTypes: [
        { value: 'item_type', label: 'نوع آیتم' },
        { value: 'side', label: 'طرف' },
        { value: 'unit_type', label: 'نوع واحد' },
        { value: 'location_boundary', label: 'محدوده مکانی' }
      ]
    };
  },
  computed: {
    predicateTypeLabel: function () {
      const type = this.predicateTypes.find(pt => pt.value === this.predicate.type);
      return type ? type.label : this.predicate.type;
    },
    predicateValueLabel: function () {
      switch (this.predicate.type) {
        case 'item_type':
          const itemType = this.itemTypes.find(item => item.value === this.predicate.value);
          return itemType ? itemType.label : this.predicate.value;
        case 'side':
          const side = this.sides.find(s => s.value === this.predicate.value);
          return side ? side.label : this.predicate.value;
        case 'unit_type':
          const unitType = this.unitTypes.find(unit => unit.value === this.predicate.value);
          return unitType ? unitType.label : this.predicate.value;
        case 'location_boundary':
          const polygon = this.polygons.find(p => p.id.toString() === this.predicate.value.toString());
          return polygon ? polygon.name : this.predicate.value;
        default:
          return this.predicate.value;
      }
    },
    availableValues: function () {
      switch (this.editingData.type) {
        case 'item_type':
          return this.itemTypes;
        case 'side':
          return this.sides;
        case 'unit_type':
          return this.unitTypes;
        case 'location_boundary':
          return this.polygons.map(p => ({ value: p.id, label: p.name }));
        default:
          return [];
      }
    }
  },
  methods: {
    startEditing: function () {
      this.editing = true;
      this.editingData = {
        type: this.predicate.type,
        value: this.predicate.value
      };
    },
    cancelEditing: function () {
      this.editing = false;
      this.editingData = {
        type: "",
        value: ""
      };
    },
    savePredicate: function () {
      if (this.editingData.type && this.editingData.value) {
        const updatedPredicate = {
          ...this.predicate,
          type: this.editingData.type,
          value: this.editingData.value
        };
        this.$emit('update-predicate', updatedPredicate);
        this.editing = false;
        this.editingData = { type: "", value: "" };
      }
    },
    deletePredicate: function () {
      if (confirm("آیا از حذف این شرط مطمئن هستید؟")) {
        this.$emit('delete-predicate', this.predicate.id);
      }
    },
    onTypeChange: function () {
      // Reset value when type changes
      this.editingData.value = "";
    }
  },
  template: html`
    <div class="list-group-item">
      <div v-if="!editing" class="d-flex justify-content-between align-items-center">
        <div>
          <span class="badge bg-primary me-2">{{ predicateTypeLabel }}</span>
          <span class="fw-semibold">{{ predicateValueLabel }}</span>
        </div>
        <div>
          <button 
            type="button" 
            class="btn btn-sm btn-outline-secondary me-1"
            v-on:click="startEditing"
          >
            <i class="bi bi-pencil"></i>
          </button>
          <button 
            type="button" 
            class="btn btn-sm btn-outline-danger"
            v-on:click="deletePredicate"
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
              v-on:click="cancelEditing"
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
  `
});