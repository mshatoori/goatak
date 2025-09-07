Vue.component("ResendingPanel", {
  props: ["config", "map"],
  data: function () {
    return {
      sharedState: store.state,
      loading: false,
      error: null,
      resendingConfigs: [],
      editing: false,
      editingData: null,
      editingIndex: -1,
      showNewConfigForm: false,
      newFilter: {
        name: "",
        predicates: []
      },
      nextFilterId: 1,
      // Mock polygons data for FilterComponent (should come from backend)
      mockPolygons: [
        { id: 'polygon-1', name: 'منطقه عملیاتی ۱' },
        { id: 'polygon-2', name: 'منطقه عملیاتی ۲' },
        { id: 'polygon-3', name: 'منطقه ممنوعه' }
      ],
      // Mock outgoing flows data (should come from backend)
      outgoingFlows: [
        { id: 1, name: "جریان خروجی ۱", type: "TCP" },
        { id: 2, name: "جریان خروجی ۲", type: "UDP" },
        { id: 3, name: "جریان خروجی ۳", type: "RabbitMQ" }
      ]
    };
  },
  mounted: function () {
    this.loadResendConfigs();
  },
  methods: {
    async loadResendConfigs() {
      this.loading = true;
      this.error = null;
      try {
        const response = await fetch('/api/resend/configs');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        if (data.success) {
          this.resendingConfigs = data.data || [];
        } else {
          throw new Error(data.error || 'Failed to load configurations');
        }
      } catch (error) {
        this.error = error.message;
        this.resendingConfigs = [];
        console.error('Failed to load resend configs:', error);
      } finally {
        this.loading = false;
      }
    },

    async saveConfigToBackend(config) {
      const isNew = !config.uid;
      const url = isNew ? '/api/resend/configs' : `/api/resend/configs/${config.uid}`;
      const method = isNew ? 'POST' : 'PUT';

      try {
        const response = await fetch(url, {
          method: method,
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(config)
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        if (data.success) {
          await this.loadResendConfigs(); // Reload all configs
          return data.data;
        } else {
          throw new Error(data.error || 'Failed to save configuration');
        }
      } catch (error) {
        this.error = error.message;
        throw error;
      }
    },

    async deleteConfigFromBackend(uid) {
      try {
        const response = await fetch(`/api/resend/configs/${uid}`, {
          method: 'DELETE'
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        if (data.success) {
          await this.loadResendConfigs(); // Reload all configs
        } else {
          throw new Error(data.error || 'Failed to delete configuration');
        }
      } catch (error) {
        this.error = error.message;
        throw error;
      }
    },

    addConfig: function () {
      this.editingData = {
        uid: "",
        name: "",
        enabled: true,
        destination: {
          type: "node",
          ip: "",
          urn: 0,
          subnet_mask: ""
        },
        filters: []
      };
      this.editingIndex = -1;
      this.editing = true;
      this.showNewConfigForm = true;
      this.newFilter = { name: "", predicates: [] };
    },

    editConfig: function (index) {
      if (!this.resendingConfigs || index < 0 || index >= this.resendingConfigs.length) {
        console.error('Config not found at index:', index);
        return;
      }
      this.editingData = JSON.parse(JSON.stringify(this.resendingConfigs[index]));
      this.editingIndex = index;
      this.editing = true;
      this.showNewConfigForm = false;
      this.newFilter = { name: "", predicates: [] };
    },

    async saveConfig() {
      if (!this.editingData.name || !this.editingData.destination.ip) {
        this.error = "نام پیکربندی و آدرس IP مقصد الزامی هستند";
        return;
      }

      try {
        await this.saveConfigToBackend(this.editingData);
        this.cancelEditing();
        this.error = null;
      } catch (error) {
        // Error is already set in saveConfigToBackend
        console.error('Failed to save config:', error);
      }
    },

    cancelEditing: function () {
      this.editing = false;
      this.editingData = null;
      this.editingIndex = -1;
      this.showNewConfigForm = false;
      this.newFilter = { name: "", predicates: [] };
      this.error = null;
    },

    async deleteConfig(index) {
      if (!confirm("آیا از حذف این پیکربندی مطمئن هستید؟")) {
        return;
      }

      if (!this.resendingConfigs || index < 0 || index >= this.resendingConfigs.length) {
        console.error('Config not found at index:', index);
        return;
      }

      const config = this.resendingConfigs[index];
      if (!config || !config.uid) {
        console.error('Config has no UID');
        return;
      }

      try {
        await this.deleteConfigFromBackend(config.uid);
        this.error = null;
      } catch (error) {
        // Error is already set in deleteConfigFromBackend
        console.error('Failed to delete config:', error);
      }
    },

    // Filter management methods
    addFilter: function () {
      if (this.newFilter.name) {
        const filter = {
          id: this.generateId(),
          name: this.newFilter.name,
          predicates: []
        };
        this.editingData.filters.push(filter);
        this.newFilter.name = "";
      }
    },

    updateFilter: function (updatedFilter) {
      const filterIndex = this.editingData.filters.findIndex(f => f.id === updatedFilter.id);
      if (filterIndex !== -1) {
        this.editingData.filters.splice(filterIndex, 1, updatedFilter);
      }
    },

    deleteFilterById: function (filterId) {
      const filterIndex = this.editingData.filters.findIndex(f => f.id === filterId);
      if (filterIndex !== -1) {
        this.editingData.filters.splice(filterIndex, 1);
      }
    },

    generateId: function () {
      return Date.now().toString() + Math.random().toString(36).substr(2, 9);
    },

    getFlowTypeText: function (flowName) {
      const flow = this.outgoingFlows.find(f => f.name === flowName);
      return flow ? flow.type : "";
    },

    getDestinationDisplayText: function (destination) {
      if (!destination) return "";
      if (destination.type === "subnet") {
        return `${destination.ip}/${destination.subnet_mask || "24"}`;
      }
      return destination.ip;
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
          :disabled="loading"
        >
          <i class="bi bi-plus-circle"></i> افزودن پیکربندی جدید
        </button>
      </h5>

      <div class="card-body">
        <!-- Error Message -->
        <div v-if="error" class="alert alert-danger alert-dismissible fade show" role="alert">
          <i class="bi bi-exclamation-triangle"></i> {{ error }}
          <button type="button" class="btn-close" v-on:click="error = null"></button>
        </div>

        <!-- Loading State -->
        <div v-if="loading" class="text-center py-4">
          <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">در حال بارگذاری...</span>
          </div>
          <p class="mt-2 text-muted">در حال بارگذاری پیکربندی‌ها...</p>
        </div>

        <!-- Existing Configurations List -->
        <div v-if="!editing && !loading && resendingConfigs && resendingConfigs.length > 0">
          <div
            v-for="(config, index) in resendingConfigs"
            :key="config.uid"
            class="card mb-3"
          >
            <div class="card-header d-flex justify-content-between align-items-center">
              <div>
                <h6 class="mb-0">{{ config.name }}</h6>
                <small class="text-muted">
                  مقصد: {{ getDestinationDisplayText(config.destination) }}
                  <span v-if="config.destination" class="badge bg-info ms-1">{{ config.destination.type }}</span>
                  <span v-if="!config.enabled" class="badge bg-warning ms-1">غیرفعال</span>
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
              <div v-if="config.filters && config.filters.length > 0">
                <h6>فیلترها:</h6>
                <div class="row">
                  <div class="col-12" v-for="filter in config.filters" :key="filter.id">
                    <filter-component
                      :filter="filter"
                      :polygons="mockPolygons"
                      @update-filter="updateFilter"
                      @delete-filter="deleteFilterById"
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
        <div v-if="!editing && !loading && (!resendingConfigs || resendingConfigs.length === 0)" class="text-center py-4">
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
              <form @submit.prevent="saveConfig">
                <div class="row mb-3">
                  <label for="config-name" class="col-sm-3 col-form-label">نام پیکربندی</label>
                  <div class="col-sm-9">
                    <input
                      type="text"
                      class="form-control"
                      id="config-name"
                      v-model="editingData.name"
                      placeholder="نام پیکربندی را وارد کنید"
                      required
                    />
                  </div>
                </div>

                <div class="row mb-3">
                  <label for="config-enabled" class="col-sm-3 col-form-label">وضعیت</label>
                  <div class="col-sm-9">
                    <div class="form-check">
                      <input
                        class="form-check-input"
                        type="checkbox"
                        id="config-enabled"
                        v-model="editingData.enabled"
                      />
                      <label class="form-check-label" for="config-enabled">
                        فعال
                      </label>
                    </div>
                  </div>
                </div>

                <!-- Destination Configuration -->
                <div class="row mb-3">
                  <label class="col-sm-3 col-form-label">مقصد</label>
                  <div class="col-sm-9">
                    <div class="row g-2">
                      <div class="col-md-4">
                        <select
                          class="form-select"
                          v-model="editingData.destination.type"
                        >
                          <option value="node">گره</option>
                          <option value="subnet">شبکه فرعی</option>
                        </select>
                      </div>
                      <div class="col-md-4">
                        <input
                          type="text"
                          class="form-control"
                          v-model="editingData.destination.ip"
                          placeholder="آدرس IP"
                          required
                        />
                      </div>
                      <div class="col-md-2">
                        <input
                          type="number"
                          class="form-control"
                          v-model.number="editingData.destination.urn"
                          placeholder="URN"
                          min="0"
                        />
                      </div>
                      <div v-if="editingData.destination.type === 'subnet'" class="col-md-2">
                        <input
                          type="text"
                          class="form-control"
                          v-model="editingData.destination.subnet_mask"
                          placeholder="ماسک"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Filters Section -->
                <div class="row mb-3">
                  <label class="col-sm-3 col-form-label">فیلترها</label>
                  <div class="col-sm-9">
                    <!-- Existing Filters using FilterComponent -->
                    <div v-if="editingData.filters && editingData.filters.length > 0" class="mb-3">
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
                    type="submit"
                    class="btn btn-primary"
                    :disabled="!editingData.name || !editingData.destination.ip"
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