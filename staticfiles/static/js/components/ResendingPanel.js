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
      // Destinations data for enhanced selection
      availableDestinations: null,
    };
  },
  mounted: function () {
    this.loadResendConfigs();
    this.fetchDestinations();
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

    availableSubnets: function () {
      // Use ownAddresses as subnet options for broadcast to own networks
      return this.availableDestinations
        ? this.availableDestinations.ownAddresses || []
        : [];
    },

    availableContacts: function () {
      // Group directDestinations by URN to create contact list
      if (
        !this.availableDestinations ||
        !this.availableDestinations.directDestinations
      ) {
        return [];
      }

      const contactMap = new Map();
      this.availableDestinations.directDestinations.forEach((dest) => {
        const urn = dest.urn.toString();
        if (!contactMap.has(urn)) {
          contactMap.set(urn, {
            urn: dest.urn,
            callsign: dest.name,
            ip_address: dest.ip,
          });
        } else {
          // Append additional IPs
          const existing = contactMap.get(urn);
          existing.ip_address += "," + dest.ip;
        }
      });

      return Array.from(contactMap.values());
    },

    availableIps: function () {
      if (
        this.editingData &&
        this.editingData.selected_urn &&
        this.availableContacts
      ) {
        const selectedContact = this.availableContacts.find(
          (contact) => contact.urn == this.editingData.selected_urn
        );
        if (selectedContact && selectedContact.ip_address) {
          return selectedContact.ip_address.split(",");
        }
      }
      return [];
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
        // Enhanced destination selection fields
        send_mode: "direct", // "subnet" or "direct"
        selected_subnet: "",
        selected_urn: "",
        selected_ip: "",
      };
      this.editingIndex = -1;
      this.editing = true;
      this.showNewConfigForm = true;
      this.currentStep = 1;
      this.newFilter = { predicates: [] };
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

      const config = this.resendingConfigs[index];

      // Create a reactive editingData object
      this.editingData = {
        uid: config.uid,
        name: config.name,
        enabled: config.enabled,
        destination: config.destination
          ? { ...config.destination }
          : {
              type: "node",
              ip: "",
              urn: 0,
              subnet_mask: "",
            },
        filters: config.filters ? [...config.filters] : [],
        // Enhanced destination selection fields
        send_mode: "direct", // Default, will be set by loadEnhancedSelectionFromDestination
        selected_subnet: "",
        selected_urn: "",
        selected_ip: "",
      };

      // Load enhanced selection from destination
      this.loadEnhancedSelectionFromDestination();

      this.editingIndex = index;
      this.editing = true;
      this.showNewConfigForm = false;
      this.currentStep = 1;
      this.newFilter = { predicates: [] };
    },

    async saveConfig() {
      if (!this.editingData.name) {
        this.error = "نام پیکربندی الزامی است";
        return;
      }

      // Validate destination based on send_mode
      if (this.editingData.send_mode === "direct") {
        if (!this.editingData.selected_urn || !this.editingData.selected_ip) {
          this.error = "برای ارسال مستقیم، URN و آدرس IP الزامی هستند";
          return;
        }
      } else if (this.editingData.send_mode === "subnet") {
        if (!this.editingData.selected_subnet) {
          this.error = "برای ارسال به زیرشبکه، انتخاب زیرشبکه الزامی است";
          return;
        }
      }

      // Map enhanced selection to destination DTO
      this.mapEnhancedSelectionToDestination();

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
      this.newFilter = { predicates: [] };
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
          if (this.editingData.send_mode === "direct") {
            return (
              this.editingData.selected_urn && this.editingData.selected_ip
            );
          } else if (this.editingData.send_mode === "subnet") {
            return this.editingData.selected_subnet;
          }
          return false;
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
      const filter = {
        id: this.generateId(),
        predicates: [],
      };
      this.editingData.filters.push(filter);
      this.newFilter = { predicates: [] };
      this.$set(this.expandedFilters, filter.id, true);
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
      return destination.ip;
    },

    getFilterSummary: function (filter) {
      if (!filter.predicates || filter.predicates.length === 0) {
        return "بدون شرط";
      }
      return `${filter.predicates.length} شرط`;
    },

    // Enhanced destination selection methods
    fetchDestinations: function () {
      fetch(window.baseUrl + "destinations")
        .then((response) => response.json())
        .then((data) => {
          this.availableDestinations = data;
        })
        .catch((error) => {
          console.error("Error fetching destinations:", error);
          this.availableDestinations = {
            ownAddresses: [],
            directDestinations: [],
          };
        });
    },

    onUrnSelected: function () {
      if (this.editingData.selected_urn && this.availableContacts) {
        const selectedContact = this.availableContacts.find(
          (contact) => contact.urn.toString() === this.editingData.selected_urn
        );
        if (selectedContact) {
          // Reset IP selection when URN changes
          this.editingData.selected_ip = "";
        }
      }
    },

    mapEnhancedSelectionToDestination: function () {
      if (this.editingData.send_mode === "direct") {
        this.editingData.destination = {
          type: "node",
          ip: this.editingData.selected_ip,
          urn: parseInt(this.editingData.selected_urn) || 0,
          subnet_mask: "",
        };
      } else if (this.editingData.send_mode === "subnet") {
        this.editingData.destination = {
          type: "subnet",
          ip: this.editingData.selected_subnet,
          urn: 0,
          subnet_mask: "255.255.255.0", // Default subnet mask
        };
      }
    },

    loadEnhancedSelectionFromDestination: function () {
      if (this.editingData.destination) {
        if (this.editingData.destination.type === "node") {
          this.editingData.send_mode = "direct";
          this.editingData.selected_ip = this.editingData.destination.ip;
          this.editingData.selected_urn =
            this.editingData.destination.urn.toString();
        } else if (this.editingData.destination.type === "subnet") {
          this.editingData.send_mode = "subnet";
          this.editingData.selected_subnet = this.editingData.destination.ip;
        }
      }
    },
  },
  template: html`
    <div class="container-fluid" id="resending-panel-container">
      <!-- Header -->
      <div class="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 class="mb-0">ارسال مجدد</h4>
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
              <div class="card-body pb-1">
                <div class="row mb-2">
                  <div class="col-12">
                    <div class="progress mb-1" style="height: 2px;">
                      <div
                        class="progress-bar"
                        :style="{ width: (currentStep / totalSteps) * 100 + '%' }"
                      ></div>
                    </div>
                    <div class="d-flex justify-content-between">
                      <small class="text-muted">{{ currentStep }}/{{ totalSteps }}</small>
                      <small class="fw-bold text-primary">{{ stepTitle }}</small>
                    </div>
                  </div>
                </div>

                <!-- Step 1: Basic Information -->
                <div v-show="currentStep === 1" class="step-content">
                  <div class="row g-2">
                    <div class="col-md-12">
                      <label class="form-label fw-bold mb-1">نام</label>
                      <input type="text" class="form-control" v-model="editingData.name" />
                    </div>
                    <div class="col-md-12">
                      <div class="form-check form-switch">
                        <input
                          class="form-check-input"
                          type="checkbox"
                          id="config-enabled"
                          v-model="editingData.enabled"
                        />
                        <label class="form-check-label" for="config-enabled">
                          <span v-if="editingData.enabled" class="text-success">فعال</span>
                          <span v-else class="text-warning">غیرفعال</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Step 2: Enhanced Destination Settings -->
                <div v-show="currentStep === 2" class="step-content">
                  <div class="fw-bold mb-2">حالت ارسال</div>
                  <div class="form-check">
                    <input
                      class="form-check-input"
                      type="radio"
                      name="send_mode"
                      id="send_modeSubnet"
                      value="subnet"
                      v-model="editingData.send_mode"
                    />
                    <label class="form-check-label" for="send_modeSubnet">زیرشبکه</label>
                  </div>
                  <div class="form-check mb-2">
                    <input
                      class="form-check-input"
                      type="radio"
                      name="send_mode"
                      id="send_modeDirect"
                      value="direct"
                      v-model="editingData.send_mode"
                    />
                    <label class="form-check-label" for="send_modeDirect">مستقیم</label>
                  </div>

                  <!-- Subnet Selection -->
                  <div v-if="editingData.send_mode === 'subnet'" class="mb-2">
                    <label for="edit-subnet" class="form-label fw-bold mb-1">زیرشبکه</label>
                    <select class="form-select" id="edit-subnet" v-model="editingData.selected_subnet">
                      <option value="" disabled>انتخاب زیرشبکه</option>
                      <option v-for="subnet in availableSubnets" :key="subnet" :value="subnet">
                        {{ subnet }}
                      </option>
                    </select>
                  </div>

                  <!-- Direct Destination Selection -->
                  <div v-if="editingData.send_mode === 'direct'">
                    <div class="mb-2">
                      <label for="edit-urn" class="form-label fw-bold mb-1">URN</label>
                      <select class="form-select" id="edit-urn" v-model="editingData.selected_urn" @change="onUrnSelected">
                        <option value="" disabled>انتخاب URN</option>
                        <option v-for="contact in availableContacts" :key="contact.urn" :value="contact.urn">
                          {{ contact.urn }} ({{ contact.callsign }})
                        </option>
                      </select>
                    </div>
                    <div class="mb-2">
                      <label for="edit-ip" class="form-label fw-bold mb-1">آدرس IP</label>
                      <select class="form-select" id="edit-ip" v-model="editingData.selected_ip" :disabled="!editingData.selected_urn">
                        <option value="" disabled>انتخاب IP</option>
                        <option v-for="ip in availableIps" :key="ip" :value="ip">{{ ip }}</option>
                      </select>
                    </div>
                  </div>
                </div>

                <!-- Step 3: Filters Management -->
                <div v-show="currentStep === 3" class="step-content">
                  <div class="d-flex justify-content-between align-items-center mb-2">
                    <span class="fw-bold">فیلترها ({{ editingData.filters.length }})</span>
                    <button
                      type="button"
                      class="btn btn-primary btn-sm"
                      v-on:click="addFilter"
                    >
                      <i class="bi bi-plus"></i> افزودن
                    </button>
                  </div>

                  <!-- Existing Filters -->
                  <div v-if="editingData.filters && editingData.filters.length > 0">
                    <div
                      v-for="filter in editingData.filters"
                      :key="filter.id"
                      class="mb-1"
                    >
                      <!-- Filter Header -->
                      <div class="d-flex justify-content-between align-items-center py-1 px-2 bg-light rounded">
                        <div class="d-flex align-items-center">
                          <button
                            type="button"
                            class="btn btn-sm p-1 me-2"
                            @click="toggleFilterExpansion(filter.id)"
                          >
                            <i
                              :class="expandedFilters[filter.id] ? 'bi bi-chevron-down' : 'bi bi-chevron-right'"
                            ></i>
                          </button>
                          <span class="small fw-bold">
                            فیلتر #{{ editingData.filters.indexOf(filter) + 1 }}
                          </span>
                          <span class="small text-muted ms-2">({{ getFilterSummary(filter) }})</span>
                        </div>
                        <button
                          type="button"
                          class="btn btn-sm p-1 text-danger"
                          @click="deleteFilterById(filter.id)"
                        >
                          <i class="bi bi-trash"></i>
                        </button>
                      </div>
                      <!-- Filter Content -->
                      <div class="px-2 py-1" v-show="expandedFilters[filter.id]">
                        <filter-component
                          :filter="filter"
                          :polygons="mockPolygons"
                          @update-filter="updateFilter"
                        ></filter-component>
                      </div>
                    </div>
                  </div>

                  <div v-else class="text-center py-2 text-muted small">
                    هنوز فیلتری اضافه نشده
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
                      <i class="bi bi-arrow-right"></i>
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
                      :disabled="!editingData.name"
                    >
                      <i class="bi bi-check-lg"></i> ذخیره
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
              class="col-12 mb-4"
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
                        {{ config.destination.type === 'node' ? 'مستقیم' :
                        'زیرشبکه' }}
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
                        v-for="(filter, filterIndex) in config.filters.slice(0, 2)"
                        :key="filter.id"
                        class="mb-2"
                      >
                        <div
                          class="d-flex justify-content-between align-items-center"
                        >
                          <small class="fw-bold"
                            >فیلتر #{{ filterIndex + 1 }}</small
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
              </div>
            </div>
          </div>

          <!-- Empty State -->
          <div v-else class="text-center py-5">
            <div class="mb-1">
              <i class="bi bi-inbox text-muted" style="font-size: 4rem;"></i>
            </div>
            <h5 class="text-muted mb-2">هیچ پیکربندی‌ای وجود ندارد</h5>

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
