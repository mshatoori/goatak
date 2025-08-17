Vue.component("ResendingPanel", {
  props: ["config", "map"],
  data: function () {
    return {
      sharedState: store.state,
      editing: false,
      editingData: null,
      editingIndex: -1,
      resendingConfigs: [
        {
          id: 1,
          name: "پیکربندی ۱",
          destination: "جریان خروجی ۱",
          filters: [
            {
              id: 1,
              name: "فیلتر واحدها",
              predicates: [
                { id: 1, type: 'unit_type', value: 'a-f-G-U-C' },
                { id: 2, type: 'side', value: 'friendly' }
              ]
            },
            {
              id: 2,
              name: "فیلتر مناطق",
              predicates: [
                { id: 3, type: 'location_boundary', value: 'polygon-1' }
              ]
            }
          ]
        },
        {
          id: 2,
          name: "پیکربندی ۲",
          destination: "جریان خروجی ۲",
          filters: [
            {
              id: 3,
              name: "فیلتر زمانی",
              predicates: [
                { id: 4, type: 'item_type', value: 'marker' }
              ]
            }
          ]
        }
      ],
      // Mock polygons data for FilterComponent
      mockPolygons: [
        { id: 'polygon-1', name: 'منطقه عملیاتی ۱' },
        { id: 'polygon-2', name: 'منطقه عملیاتی ۲' },
        { id: 'polygon-3', name: 'منطقه ممنوعه' }
      ],
      outgoingFlows: [
        { id: 1, name: "جریان خروجی ۱", type: "TCP" },
        { id: 2, name: "جریان خروجی ۲", type: "UDP" },
        { id: 3, name: "جریان خروجی ۳", type: "RabbitMQ" }
      ],
      newFilter: {
        name: "",
        predicates: []
      },
      showNewConfigForm: false,
      nextConfigId: 3,
      nextFilterId: 4
    };
  },
  methods: {
    addConfig: function () {
      this.editingData = {
        id: this.nextConfigId,
        name: "",
        destination: "",
        filters: []
      };
      this.editingIndex = -1;
      this.editing = true;
      this.showNewConfigForm = true;
      this.nextConfigId++;
    },
    editConfig: function (index) {
      this.editingData = JSON.parse(JSON.stringify(this.resendingConfigs[index]));
      this.editingIndex = index;
      this.editing = true;
      this.showNewConfigForm = false;
    },
    saveConfig: function () {
      if (this.editingData.name && this.editingData.destination) {
        if (this.editingIndex === -1) {
          // Adding new config
          this.resendingConfigs.push(JSON.parse(JSON.stringify(this.editingData)));
        } else {
          // Editing existing config
          this.resendingConfigs[this.editingIndex] = JSON.parse(JSON.stringify(this.editingData));
        }
        this.cancelEditing();
      }
    },
    cancelEditing: function () {
      this.editing = false;
      this.editingData = null;
      this.editingIndex = -1;
      this.showNewConfigForm = false;
    },
    deleteConfig: function (index) {
      if (confirm("آیا از حذف این پیکربندی مطمئن هستید؟")) {
        this.resendingConfigs.splice(index, 1);
      }
    },
    // Updated filter management methods to work with FilterComponent
    addFilter: function () {
      if (this.newFilter.name) {
        const filter = {
          id: this.nextFilterId,
          name: this.newFilter.name,
          predicates: []
        };
        this.editingData.filters.push(filter);
        this.newFilter.name = "";
        this.nextFilterId++;
      }
    },
    // Event handler for FilterComponent update-filter event
    updateFilter: function (updatedFilter) {
      const filterIndex = this.editingData.filters.findIndex(f => f.id === updatedFilter.id);
      if (filterIndex !== -1) {
        this.editingData.filters.splice(filterIndex, 1, updatedFilter);
      }
    },
    // Event handler for FilterComponent delete-filter event
    deleteFilterById: function (filterId) {
      const filterIndex = this.editingData.filters.findIndex(f => f.id === filterId);
      if (filterIndex !== -1) {
        this.editingData.filters.splice(filterIndex, 1);
      }
    },
    getFlowTypeText: function (flowName) {
      const flow = this.outgoingFlows.find(f => f.name === flowName);
      return flow ? flow.type : "";
    }
  },
  template: html`
    <div class="card">
      <h5 class="card-header">
        مدیریت پیکربندی‌های ارسال مجدد
        <button 
          type="button" 
          class="btn btn-sm btn-success float-end"
          v-on:click="addConfig"
          v-if="!editing"
        >
          <i class="bi bi-plus-circle"></i> افزودن پیکربندی جدید
        </button>
      </h5>
      
      <div class="card-body">
        <!-- Existing Configurations List -->
        <div v-if="!editing && resendingConfigs.length > 0">
          <div 
            v-for="(config, index) in resendingConfigs" 
            :key="config.id"
            class="card mb-3"
          >
            <div class="card-header d-flex justify-content-between align-items-center">
              <div>
                <h6 class="mb-0">{{ config.name }}</h6>
                <small class="text-muted">
                  مقصد: {{ config.destination }}
                  <span class="badge bg-info ms-1">{{ getFlowTypeText(config.destination) }}</span>
                </small>
              </div>
              <div>
                <button 
                  type="button" 
                  class="btn btn-sm btn-outline-primary me-1"
                  v-on:click="editConfig(index)"
                >
                  <i class="bi bi-pencil"></i>
                </button>
                <button 
                  type="button" 
                  class="btn btn-sm btn-outline-danger"
                  v-on:click="deleteConfig(index)"
                >
                  <i class="bi bi-trash"></i>
                </button>
              </div>
            </div>
            <div class="card-body">
              <div v-if="config.filters.length > 0">
                <h6>فیلترها:</h6>
                <div class="row">
                  <div class="col-12" v-for="filter in config.filters" :key="filter.id">
                    <filter-component
                      :filter="filter"
                      :polygons="mockPolygons"
                      @update-filter="() => {}"
                      @delete-filter="() => {}"
                    ></filter-component>
                  </div>
                </div>
              </div>
              <div v-else class="text-muted">
                <i class="bi bi-info-circle"></i> هیچ فیلتری تعریف نشده
              </div>
            </div>
          </div>
        </div>
        
        <!-- Empty State -->
        <div v-if="!editing && resendingConfigs.length === 0" class="text-center py-4">
          <i class="bi bi-inbox display-4 text-muted"></i>
          <h5 class="mt-3 text-muted">هیچ پیکربندی‌ای تعریف نشده</h5>
          <p class="text-muted">برای شروع، یک پیکربندی جدید اضافه کنید</p>
        </div>

        <!-- Add/Edit Configuration Form -->
        <div v-if="editing">
          <div class="card">
            <div class="card-header">
              <h6 class="mb-0">
                {{ showNewConfigForm ? 'افزودن پیکربندی جدید' : 'ویرایش پیکربندی' }}
              </h6>
            </div>
            <div class="card-body">
              <form>
                <div class="row mb-3">
                  <label for="config-name" class="col-sm-3 col-form-label">نام پیکربندی</label>
                  <div class="col-sm-9">
                    <input 
                      type="text" 
                      class="form-control" 
                      id="config-name"
                      v-model="editingData.name"
                      placeholder="نام پیکربندی را وارد کنید"
                    />
                  </div>
                </div>
                
                <div class="row mb-3">
                  <label for="config-destination" class="col-sm-3 col-form-label">مقصد</label>
                  <div class="col-sm-9">
                    <select 
                      class="form-select" 
                      id="config-destination"
                      v-model="editingData.destination"
                    >
                      <option value="" disabled>جریان خروجی را انتخاب کنید</option>
                      <option 
                        v-for="flow in outgoingFlows" 
                        :key="flow.id" 
                        :value="flow.name"
                      >
                        {{ flow.name }} ({{ flow.type }})
                      </option>
                    </select>
                  </div>
                </div>
                
                <!-- Filters Section -->
                <div class="row mb-3">
                  <label class="col-sm-3 col-form-label">فیلترها</label>
                  <div class="col-sm-9">
                    <!-- Existing Filters using FilterComponent -->
                    <div v-if="editingData.filters.length > 0" class="mb-3">
                      <div v-for="filter in editingData.filters" :key="filter.id">
                        <filter-component
                          :filter="filter"
                          :polygons="mockPolygons"
                          @update-filter="updateFilter"
                          @delete-filter="deleteFilterById"
                        ></filter-component>
                      </div>
                    </div>
                    
                    <!-- Add New Filter -->
                    <div class="border p-3 rounded bg-light">
                      <h6 class="mb-2">افزودن فیلتر جدید:</h6>
                      <div class="input-group">
                        <input
                          type="text"
                          class="form-control"
                          placeholder="نام فیلتر جدید"
                          v-model="newFilter.name"
                          @keyup.enter="addFilter"
                        />
                        <button
                          type="button"
                          class="btn btn-outline-success"
                          v-on:click="addFilter"
                          :disabled="!newFilter.name"
                        >
                          <i class="bi bi-plus"></i> افزودن
                        </button>
                      </div>
                      <small class="form-text text-muted">
                        فیلترها برای تعیین کدام پیام‌ها باید ارسال مجدد شوند استفاده می‌شوند
                      </small>
                    </div>
                  </div>
                </div>
                
                <!-- Form Actions -->
                <div class="d-flex justify-content-end">
                  <button 
                    type="button" 
                    class="btn btn-secondary me-2"
                    v-on:click="cancelEditing"
                  >
                    لغو
                  </button>
                  <button 
                    type="button" 
                    class="btn btn-primary"
                    v-on:click="saveConfig"
                    :disabled="!editingData.name || !editingData.destination"
                  >
                    <i class="bi bi-check-circle"></i> ذخیره
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
});