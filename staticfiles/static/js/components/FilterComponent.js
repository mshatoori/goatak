Vue.component("FilterComponent", {
  props: ["filter", "polygons"],
  data: function () {
    return {
      editing: false,
      editingName: "",
      newPredicate: {
        type: "",
        value: ""
      },
      predicateTypes: [
        { value: 'item_type', label: 'نوع آیتم' },
        { value: 'side', label: 'طرف' },
        { value: 'unit_type', label: 'نوع واحد' },
        { value: 'location_boundary', label: 'محدوده مکانی' }
      ]
    };
  },
  methods: {
    startEditing: function () {
      this.editing = true;
      this.editingName = this.filter.name;
    },
    cancelEditing: function () {
      this.editing = false;
      this.editingName = "";
    },
    saveFilterName: function () {
      if (this.editingName.trim()) {
        const updatedFilter = { ...this.filter, name: this.editingName.trim() };
        this.$emit('update-filter', updatedFilter);
        this.editing = false;
        this.editingName = "";
      }
    },
    deleteFilter: function () {
      if (confirm("آیا از حذف این فیلتر مطمئن هستید؟")) {
        this.$emit('delete-filter', this.filter.id);
      }
    },
    addPredicate: function () {
      if (this.newPredicate.type && this.newPredicate.value) {
        const predicate = {
          id: Date.now(), // Simple ID generation
          type: this.newPredicate.type,
          value: this.newPredicate.value
        };
        const updatedFilter = {
          ...this.filter,
          predicates: [...this.filter.predicates, predicate]
        };
        this.$emit('update-filter', updatedFilter);
        this.newPredicate = { type: "", value: "" };
      }
    },
    updatePredicate: function (updatedPredicate) {
      const predicateIndex = this.filter.predicates.findIndex(p => p.id === updatedPredicate.id);
      if (predicateIndex !== -1) {
        const updatedPredicates = [...this.filter.predicates];
        updatedPredicates[predicateIndex] = updatedPredicate;
        const updatedFilter = {
          ...this.filter,
          predicates: updatedPredicates
        };
        this.$emit('update-filter', updatedFilter);
      }
    },
    deletePredicate: function (predicateId) {
      const updatedPredicates = this.filter.predicates.filter(p => p.id !== predicateId);
      const updatedFilter = {
        ...this.filter,
        predicates: updatedPredicates
      };
      this.$emit('update-filter', updatedFilter);
    },
    getPredicateTypeLabel: function (type) {
      const predicateType = this.predicateTypes.find(pt => pt.value === type);
      return predicateType ? predicateType.label : type;
    }
  },
  template: html`
    <div class="card mb-3">
      <div class="card-header">
        <div class="d-flex justify-content-between align-items-center">
          <div class="flex-grow-1">
            <div v-if="!editing" class="d-flex align-items-center">
              <h6 class="mb-0 me-2">{{ filter.name }}</h6>
              <button 
                type="button" 
                class="btn btn-sm btn-outline-secondary"
                v-on:click="startEditing"
              >
                <i class="bi bi-pencil"></i>
              </button>
            </div>
            <div v-else class="d-flex align-items-center">
              <input 
                type="text" 
                class="form-control form-control-sm me-2" 
                v-model="editingName"
                @keyup.enter="saveFilterName"
                @keyup.escape="cancelEditing"
                placeholder="نام فیلتر"
              />
              <button 
                type="button" 
                class="btn btn-sm btn-success me-1"
                v-on:click="saveFilterName"
                :disabled="!editingName.trim()"
              >
                <i class="bi bi-check"></i>
              </button>
              <button 
                type="button" 
                class="btn btn-sm btn-secondary"
                v-on:click="cancelEditing"
              >
                <i class="bi bi-x"></i>
              </button>
            </div>
          </div>
          <button 
            type="button" 
            class="btn btn-sm btn-outline-danger"
            v-on:click="deleteFilter"
          >
            <i class="bi bi-trash"></i>
          </button>
        </div>
      </div>
      
      <div class="card-body">
        <!-- Existing Predicates -->
        <div v-if="filter.predicates && filter.predicates.length > 0" class="mb-3">
          <h6 class="mb-2">شرایط:</h6>
          <div class="list-group">
            <predicate-component
              v-for="predicate in filter.predicates"
              :key="predicate.id"
              :predicate="predicate"
              :polygons="polygons"
              @update-predicate="updatePredicate"
              @delete-predicate="deletePredicate"
            ></predicate-component>
          </div>
        </div>
        
        <!-- No Predicates Message -->
        <div v-else class="mb-3">
          <p class="text-muted mb-0">
            <i class="bi bi-info-circle"></i> هیچ شرطی تعریف نشده
          </p>
        </div>
        
        <!-- Add New Predicate -->
        <div class="border-top pt-3">
          <h6 class="mb-2">افزودن شرط جدید:</h6>
          <div class="row g-2">
            <div class="col-md-6">
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
            <div class="col-md-4">
              <input 
                type="text" 
                class="form-control form-control-sm" 
                v-model="newPredicate.value"
                placeholder="مقدار"
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
    </div>
  `
});