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
      currentStep: 1,
      totalSteps: 3,
      newFilter: {
        name: "",
        predicates: [],
      },
      expandedConfigs: {},
      expandedFilters: {},
      // Mock polygons data for FilterComponent (should come from backend)
      mockPolygons: [
        { id: "polygon-1", name: "منطقه عملیاتی ۱" },
        { id: "polygon-2", name: "منطقه عملیاتی ۲" },
        { id: "polygon-3", name: "منطقه ممنوعه" },
      ],
      // Mock outgoing flows data (should come from backend)
      outgoingFlows: [
        { id: 1, name: "جریان خروجی ۱", type: "TCP" },
        { id: 2, name: "جریان خروجی ۲", type: "UDP" },
        { id: 3, name: "جریان خروجی ۳", type: "RabbitMQ" },
      ],
    };
  },
  mounted: function () {
    this.loadResendConfigs();
  },
  computed: {
    stepTitle() {
      const titles = {
        1: "اطلاعات پایه",
        2: "تنظیمات مقصد",
        3: "مدیریت فیلترها",
      };
      return titles[this.currentStep] || "";
    },
  },
  methods: {
    async loadResendConfigs() {
      this.loading = true;
      this.error = null;
      try {
        const response = await fetch("/api/resend/configs");
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        if (data.success) {
          this.resendingConfigs = data.data || [];
        } else {
          throw new Error(data.error || "Failed to load configurations");
        }
      } catch (error) {
        this.error = error.message;
        this.resendingConfigs = [];
        console.error("Failed to load resend configs:", error);
      } finally {
        this.loading = false;
      }
    },

    async saveConfigToBackend(config) {
      const isNew = !config.uid;
      const url = isNew
        ? "/api/resend/configs"
        : `/api/resend/configs/${config.uid}`;
      const method = isNew ? "POST" : "PUT";

      try {
        const response = await fetch(url, {
          method: method,
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(config),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.error || `HTTP error! status: ${response.status}`
          );
        }

        const data = await response.json();
        if (data.success) {
          await this.loadResendConfigs(); // Reload all configs
          return data.data;
        } else {
          throw new Error(data.error || "Failed to save configuration");
        }
      } catch (error) {
        this.error = error.message;
        throw error;
      }
    },

    async deleteConfigFromBackend(uid) {
      try {
        const response = await fetch(`/api/resend/configs/${uid}`, {
          method: "DELETE",
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.error || `HTTP error! status: ${response.status}`
          );
        }

        const data = await response.json();
        if (data.success) {
          await this.loadResendConfigs(); // Reload all configs
        } else {
          throw new Error(data.error || "Failed to delete configuration");
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
          subnet_mask: "",
        },
        filters: [],
      };
      this.editingIndex = -1;
      this.editing = true;
      this.showNewConfigForm = true;
      this.currentStep = 1;
      this.newFilter = { name: "", predicates: [] };
    },

    editConfig: function (index) {
      if (
        !this.resendingConfigs ||
        index < 0 ||
        index >= this.resendingConfigs.length
      ) {
        console.error("Config not found at index:", index);
        return;
      }
      this.editingData = JSON.parse(
        JSON.stringify(this.resendingConfigs[index])
      );
      this.editingIndex = index;
      this.editing = true;
      this.showNewConfigForm = false;
      this.currentStep = 1;
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
        console.error("Failed to save config:", error);
      }
    },

    cancelEditing: function () {
      this.editing = false;
      this.editingData = null;
      this.editingIndex = -1;
      this.showNewConfigForm = false;
      this.currentStep = 1;
      this.newFilter = { name: "", predicates: [] };
      this.error = null;
    },

    async deleteConfig(index) {
      if (!confirm("آیا از حذف این پیکربندی مطمئن هستید؟")) {
        return;
      }

      if (
        !this.resendingConfigs ||
        index < 0 ||
        index >= this.resendingConfigs.length
      ) {
        console.error("Config not found at index:", index);
        return;
      }

      const config = this.resendingConfigs[index];
      if (!config || !config.uid) {
        console.error("Config has no UID");
        return;
      }

      try {
        await this.deleteConfigFromBackend(config.uid);
        this.error = null;
      } catch (error) {
        // Error is already set in deleteConfigFromBackend
        console.error("Failed to delete config:", error);
      }
    },

    // Step navigation
    nextStep() {
      if (this.currentStep < this.totalSteps) {
        this.currentStep++;
      }
    },

    prevStep() {
      if (this.currentStep > 1) {
        this.currentStep--;
      }
    },

    canProceedToNextStep() {
      switch (this.currentStep) {
        case 1:
          return this.editingData.name.trim() !== "";
        case 2:
          return this.editingData.destination.ip.trim() !== "";
        case 3:
          return true;
        default:
          return false;
      }
    },

    // Toggle functions
    toggleConfigExpansion(configId) {
      this.$set(
        this.expandedConfigs,
        configId,
        !this.expandedConfigs[configId]
      );
    },

    toggleFilterExpansion(filterId) {
      this.$set(
        this.expandedFilters,
        filterId,
        !this.expandedFilters[filterId]
      );
    },

    // Filter management methods
    addFilter: function () {
      if (this.newFilter.name) {
        const filter = {
          id: this.generateId(),
          name: this.newFilter.name,
          predicates: [],
        };
        this.editingData.filters.push(filter);
        this.newFilter.name = "";
        this.$set(this.expandedFilters, filter.id, true);
      }
    },

    updateFilter: function (updatedFilter) {
      const filterIndex = this.editingData.filters.findIndex(
        (f) => f.id === updatedFilter.id
      );
      if (filterIndex !== -1) {
        this.editingData.filters.splice(filterIndex, 1, updatedFilter);
      }
    },

    deleteFilterById: function (filterId) {
      const filterIndex = this.editingData.filters.findIndex(
        (f) => f.id === filterId
      );
      if (filterIndex !== -1) {
        this.editingData.filters.splice(filterIndex, 1);
      }
    },

    generateId: function () {
      return Date.now().toString() + Math.random().toString(36).substr(2, 9);
    },

    getFlowTypeText: function (flowName) {
      const flow = this.outgoingFlows.find((f) => f.name === flowName);
      return flow ? flow.type : "";
    },

    getDestinationDisplayText: function (destination) {
      if (!destination) return "";
      if (destination.type === "subnet") {
        return `${destination.ip}/${destination.subnet_mask || "24"}`;
      }
      return destination.ip;
    },

    getFilterSummary: function (filter) {
      if (!filter.predicates || filter.predicates.length === 0) {
        return "بدون شرط";
      }
      return `${filter.predicates.length} شرط`;
    },
  },
  template: html`
    <div class="container-fluid" id="resending-panel-container">
      <!-- Header -->
      <div class="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 class="mb-0">مدیریت ارسال مجدد</h4>
          <small class="text-muted">پیکربندی قوانین ارسال مجدد پیام‌ها</small>
        </div>
        <button
          type="button"
          class="btn btn-primary"
          v-on:click="addConfig"
          v-if="!editing"
          :disabled="loading"
        >
          <i class="bi bi-plus-lg"></i> پیکربندی جدید
        </button>
      </div>

      <!-- Error Message -->
      <div
        v-if="error"
        class="alert alert-danger alert-dismissible mb-4"
        role="alert"
      >
        <i class="bi bi-exclamation-triangle-fill"></i>
        {{ error }}
        <button
          type="button"
          class="btn-close"
          v-on:click="error = null"
        ></button>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="text-center py-5">
        <div class="spinner-border text-primary mb-3" role="status"></div>
        <p class="text-muted">در حال بارگذاری پیکربندی‌ها...</p>
      </div>

      <!-- Main Content -->
      <div v-if="!loading">
        <!-- Configuration Form -->
        <div v-if="editing" class="row">
          <div class="col-12">
            <div class="card shadow-sm">
              <div class="card-header bg-primary text-white">
                <div class="d-flex justify-content-between align-items-center">
                  <h5 class="mb-0">
                    <i class="bi bi-gear-fill"></i>
                    {{ showNewConfigForm ? 'پیکربندی جدید' : 'ویرایش پیکربندی'
                    }}
                  </h5>
                  <button
                    type="button"
                    class="btn-close btn-close-white"
                    v-on:click="cancelEditing"
                  ></button>
                </div>
              </div>

              <!-- Progress Steps -->
              <div class="card-body pb-2">
                <div class="row mb-4">
                  <div class="col-12">
                    <div class="progress mb-2" style="height: 4px;">
                      <div
                        class="progress-bar"
                        :style="{ width: (currentStep / totalSteps) * 100 + '%' }"
                      ></div>
                    </div>
                    <div class="d-flex justify-content-between">
                      <small class="text-muted"
                        >مرحله {{ currentStep }} از {{ totalSteps }}</small
                      >
                      <small class="fw-bold text-primary"
                        >{{ stepTitle }}</small
                      >
                    </div>
                  </div>
                </div>

                <!-- Step 1: Basic Information -->
                <div v-show="currentStep === 1" class="step-content">
                  <div class="row g-3">
                    <div class="col-md-8">
                      <label class="form-label fw-bold">نام پیکربندی</label>
                      <input
                        type="text"
                        class="form-control form-control-lg"
                        v-model="editingData.name"
                        placeholder="نام مناسب برای این پیکربندی وارد کنید"
                      />
                      <div class="form-text">
                        نامی که بتوانید پیکربندی را به راحتی شناسایی کنید
                      </div>
                    </div>
                    <div class="col-md-4">
                      <label class="form-label fw-bold">وضعیت</label>
                      <div class="form-check form-switch">
                        <input
                          class="form-check-input"
                          type="checkbox"
                          id="config-enabled"
                          v-model="editingData.enabled"
                        />
                        <label class="form-check-label" for="config-enabled">
                          <span v-if="editingData.enabled" class="text-success">
                            <i class="bi bi-check-circle-fill"></i> فعال
                          </span>
                          <span v-else class="text-warning">
                            <i class="bi bi-pause-circle-fill"></i> غیرفعال
                          </span>
                        </label>
                      </div>
                      <div class="form-text">
                        پیکربندی فعال بلافاصله اعمال می‌شود
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Step 2: Destination Settings -->
                <div v-show="currentStep === 2" class="step-content">
                  <h6 class="fw-bold mb-3">
                    <i class="bi bi-send"></i> تنظیمات مقصد
                  </h6>
                  <div class="row g-3">
                    <div class="col-md-3">
                      <label class="form-label fw-bold">نوع مقصد</label>
                      <select
                        class="form-select"
                        v-model="editingData.destination.type"
                      >
                        <option value="node">
                          <i class="bi bi-pc-display"></i> گره مجزا
                        </option>
                        <option value="subnet">
                          <i class="bi bi-diagram-3"></i> شبکه فرعی
                        </option>
                      </select>
                    </div>
                    <div class="col-md-4">
                      <label class="form-label fw-bold">آدرس IP</label>
                      <input
                        type="text"
                        class="form-control"
                        v-model="editingData.destination.ip"
                        placeholder="192.168.1.100"
                      />
                    </div>
                    <div
                      class="col-md-3"
                      v-if="editingData.destination.type === 'node'"
                    >
                      <label class="form-label fw-bold"
                        >URN <small class="text-muted">(اختیاری)</small></label
                      >
                      <input
                        type="number"
                        class="form-control"
                        v-model.number="editingData.destination.urn"
                        placeholder="12345"
                        min="0"
                      />
                    </div>
                    <div
                      class="col-md-2"
                      v-if="editingData.destination.type === 'subnet'"
                    >
                      <label class="form-label fw-bold">ماسک شبکه</label>
                      <input
                        type="text"
                        class="form-control"
                        v-model="editingData.destination.subnet_mask"
                        placeholder="24"
                      />
                    </div>
                  </div>

                  <div class="alert alert-info mt-3">
                    <i class="bi bi-info-circle"></i>
                    <strong>راهنما:</strong>
                    <span v-if="editingData.destination.type === 'node'">
                      پیام‌ها به یک گره مشخص ارسال می‌شوند
                    </span>
                    <span v-else>
                      پیام‌ها به تمام گره‌های شبکه فرعی پخش می‌شوند
                    </span>
                  </div>
                </div>

                <!-- Step 3: Filters Management -->
                <div v-show="currentStep === 3" class="step-content">
                  <div
                    class="d-flex justify-content-between align-items-center mb-3"
                  >
                    <h6 class="fw-bold mb-0">
                      <i class="bi bi-funnel"></i> مدیریت فیلترها
                    </h6>
                    <span class="badge bg-secondary"
                      >{{ editingData.filters.length }} فیلتر</span
                    >
                  </div>

                  <!-- Add New Filter -->
                  <div class="card border-dashed mb-3">
                    <div class="card-body">
                      <div class="row g-2 align-items-end">
                        <div class="col">
                          <label class="form-label fw-bold"
                            >افزودن فیلتر جدید</label
                          >
                          <input
                            type="text"
                            class="form-control"
                            placeholder="نام فیلتر"
                            v-model="newFilter.name"
                            @keyup.enter="addFilter"
                          />
                        </div>
                        <div class="col-auto">
                          <button
                            type="button"
                            class="btn btn-outline-primary"
                            v-on:click="addFilter"
                            :disabled="!newFilter.name"
                          >
                            <i class="bi bi-plus"></i> افزودن
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- Existing Filters -->
                  <div
                    v-if="editingData.filters && editingData.filters.length > 0"
                  >
                    <div
                      v-for="filter in editingData.filters"
                      :key="filter.id"
                      class="card mb-3"
                    >
                      <div class="card-header">
                        <div
                          class="d-flex justify-content-between align-items-center"
                        >
                          <div class="d-flex align-items-center">
                            <button
                              type="button"
                              class="btn btn-sm btn-outline-secondary me-2"
                              @click="toggleFilterExpansion(filter.id)"
                            >
                              <i
                                :class="expandedFilters[filter.id] ? 'bi bi-chevron-down' : 'bi bi-chevron-right'"
                              ></i>
                            </button>
                            <div>
                              <h6 class="mb-0">
                                {{ filter.name || 'بدون نام' }}
                              </h6>
                              <small class="text-muted"
                                >{{ getFilterSummary(filter) }}</small
                              >
                            </div>
                          </div>
                          <button
                            type="button"
                            class="btn btn-sm btn-outline-danger"
                            @click="deleteFilterById(filter.id)"
                          >
                            <i class="bi bi-trash"></i>
                          </button>
                        </div>
                      </div>
                      <div
                        class="card-body"
                        v-show="expandedFilters[filter.id]"
                      >
                        <filter-component
                          :filter="filter"
                          :polygons="mockPolygons"
                          @update-filter="updateFilter"
                          @delete-filter="deleteFilterById"
                        ></filter-component>
                      </div>
                    </div>
                  </div>

                  <div v-else class="text-center py-4">
                    <i
                      class="bi bi-funnel text-muted"
                      style="font-size: 3rem;"
                    ></i>
                    <p class="text-muted mt-2">هنوز فیلتری اضافه نشده</p>
                    <small class="text-muted"
                      >فیلترها برای انتخاب پیام‌های مناسب استفاده می‌شوند</small
                    >
                  </div>
                </div>

                <!-- Navigation Buttons -->
                <div
                  class="d-flex justify-content-between mt-4 pt-3 border-top"
                >
                  <div>
                    <button
                      type="button"
                      class="btn btn-outline-secondary"
                      v-show="currentStep > 1"
                      @click="prevStep"
                    >
                      <i class="bi bi-arrow-right"></i> مرحله قبل
                    </button>
                  </div>
                  <div>
                    <button
                      type="button"
                      class="btn btn-outline-secondary me-2"
                      v-on:click="cancelEditing"
                    >
                      لغو
                    </button>
                    <button
                      v-if="currentStep < totalSteps"
                      type="button"
                      class="btn btn-primary"
                      @click="nextStep"
                      :disabled="!canProceedToNextStep()"
                    >
                      مرحله بعد <i class="bi bi-arrow-left"></i>
                    </button>
                    <button
                      v-else
                      type="button"
                      class="btn btn-success"
                      v-on:click="saveConfig"
                      :disabled="!editingData.name || !editingData.destination.ip"
                    >
                      <i class="bi bi-check-lg"></i> ذخیره پیکربندی
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Configuration List -->
        <div v-if="!editing">
          <!-- Existing Configurations -->
          <div
            v-if="resendingConfigs && resendingConfigs.length > 0"
            class="row"
          >
            <div
              v-for="(config, index) in resendingConfigs"
              :key="config.uid || index"
              class="col-lg-6 col-xl-4 mb-4"
            >
              <div class="card h-100 shadow-sm">
                <div
                  class="card-header d-flex justify-content-between align-items-start"
                >
                  <div class="flex-grow-1">
                    <h6 class="card-title mb-1">{{ config.name }}</h6>
                    <div class="d-flex align-items-center">
                      <span v-if="config.enabled" class="badge bg-success me-2">
                        <i class="bi bi-check-circle"></i> فعال
                      </span>
                      <span v-else class="badge bg-warning me-2">
                        <i class="bi bi-pause-circle"></i> غیرفعال
                      </span>
                      <small class="text-muted"
                        >{{ config.filters ? config.filters.length : 0 }}
                        فیلتر</small
                      >
                    </div>
                  </div>
                  <div class="dropdown">
                    <button
                      class="btn btn-sm btn-outline-secondary dropdown-toggle"
                      data-bs-toggle="dropdown"
                    >
                      <i class="bi bi-three-dots"></i>
                    </button>
                    <ul class="dropdown-menu">
                      <li>
                        <button
                          class="dropdown-item"
                          @click="editConfig(index)"
                        >
                          <i class="bi bi-pencil"></i> ویرایش
                        </button>
                      </li>
                      <li>
                        <button
                          class="dropdown-item text-danger"
                          @click="deleteConfig(index)"
                        >
                          <i class="bi bi-trash"></i> حذف
                        </button>
                      </li>
                    </ul>
                  </div>
                </div>

                <div class="card-body">
                  <div class="mb-3">
                    <small class="text-muted d-block">مقصد:</small>
                    <div class="d-flex align-items-center">
                      <i class="bi bi-send me-1"></i>
                      <code class="small"
                        >{{ getDestinationDisplayText(config.destination)
                        }}</code
                      >
                      <span
                        v-if="config.destination"
                        class="badge bg-light text-dark ms-2"
                      >
                        {{ config.destination.type === 'node' ? 'گره' : 'شبکه'
                        }}
                      </span>
                    </div>
                  </div>

                  <div v-if="config.filters && config.filters.length > 0">
                    <small class="text-muted d-block mb-2">فیلترها:</small>
                    <div class="mb-2">
                      <button
                        type="button"
                        class="btn btn-sm btn-outline-primary w-100"
                        @click="toggleConfigExpansion(config.uid || index)"
                      >
                        <i
                          :class="expandedConfigs[config.uid || index] ? 'bi bi-chevron-up' : 'bi bi-chevron-down'"
                        ></i>
                        {{ expandedConfigs[config.uid || index] ? 'بستن جزئیات'
                        : 'نمایش جزئیات' }}
                      </button>
                    </div>
                    <div
                      v-show="expandedConfigs[config.uid || index]"
                      class="border-top pt-2"
                    >
                      <div
                        v-for="filter in config.filters.slice(0, 2)"
                        :key="filter.id"
                        class="mb-2"
                      >
                        <div
                          class="d-flex justify-content-between align-items-center"
                        >
                          <small class="fw-bold"
                            >{{ filter.name || 'بدون نام' }}</small
                          >
                          <small class="text-muted"
                            >{{ getFilterSummary(filter) }}</small
                          >
                        </div>
                      </div>
                      <small
                        v-if="config.filters.length > 2"
                        class="text-muted"
                      >
                        و {{ config.filters.length - 2 }} فیلتر دیگر...
                      </small>
                    </div>
                  </div>
                  <div v-else>
                    <small class="text-muted">
                      <i class="bi bi-info-circle"></i> بدون فیلتر - همه پیام‌ها
                      ارسال می‌شوند
                    </small>
                  </div>
                </div>

                <div class="card-footer bg-transparent">
                  <small class="text-muted">
                    <i class="bi bi-clock"></i>
                    ایجاد: {{ new
                    Date(config.created_at).toLocaleDateString('fa-IR') }}
                  </small>
                </div>
              </div>
            </div>
          </div>

          <!-- Empty State -->
          <div v-else class="text-center py-5">
            <div class="mb-4">
              <i class="bi bi-inbox text-muted" style="font-size: 4rem;"></i>
            </div>
            <h5 class="text-muted mb-2">هیچ پیکربندی‌ای وجود ندارد</h5>
            <p class="text-muted mb-4">
              برای شروع، اولین پیکربندی خود را ایجاد کنید
            </p>
            <button
              type="button"
              class="btn btn-primary btn-lg"
              @click="addConfig"
            >
              <i class="bi bi-plus-lg"></i> ایجاد پیکربندی جدید
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
});
