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
      expConfigs: {},
      expandedFilters: {},
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

    availablePolygons: function () {
      const polygons = [];
      this.sharedState.items.forEach((item) => {
        if (item.type && item.type.startsWith("u-d-f")) {
          polygons.push({
            id: item.uid,
            name: item.callsign || item.uid,
          });
        }
      });
      return this.sharedState.ts && polygons;
    },

    availableSubnets: function () {
      return this.availableDestinations
        ? this.availableDestinations.ownAddresses || []
        : [];
    },

    availableContacts: function () {
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
          (contact) => contact.urn.toString() === this.editingData.selected_urn
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
          await this.loadResendConfigs();
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
          await this.loadResendConfigs();
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
        send_mode: "direct",
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
        send_mode: "direct",
        selected_subnet: "",
        selected_urn: "",
        selected_ip: "",
      };

      this.loadEnhancedSelectionFromDestination();

      this.editingIndex = index;
      this.editing = true;
      this.showNewConfigForm = false;
      this.currentStep = 1;
      this.newFilter = { predicates: [] };
    },

    async saveConfig() {
      this.addPendingPredicates();

      if (!this.editingData.name) {
        this.error = "نام بازارسال الزامی است";
        return;
      }

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

      this.mapEnhancedSelectionToDestination();

      try {
        await this.saveConfigToBackend(this.editingData);
        this.cancelEditing();
        this.error = null;
      } catch (error) {
        console.error("Failed to save config:", error);
      }
    },

    addPendingPredicates: function () {
      this.$root.$emit("add-pending-predicates");
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
      if (!confirm("آیا از حذف این بازارسال مطمئن هستید؟")) {
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
        console.error("Failed to delete config:", error);
      }
    },

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

    toggleConfigExpansion(configId) {
      this.$set(this.expConfigs, configId, !this.expConfigs[configId]);
    },

    toggleFilterExpansion(filterId) {
      this.$set(
        this.expandedFilters,
        filterId,
        !this.expandedFilters[filterId]
      );
    },

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
          subnet_mask: "255.255.255.0",
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
    <div>
      <!-- Error Message -->
      <div v-if="error" class="alert alert-danger m-3">
        {{ error }}
        <button type="button" class="btn-close float-end" v-on:click="error = null"></button>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="text-center p-5">
        <div class="spinner-border" role="status"></div>
        <p class="mt-2">در حال بارگذاری...</p>
      </div>

      <!-- Main Content -->
      <div v-if="!loading">
        <!-- Edit Form -->
        <div v-if="editing" class="p-3">
          <div class="d-flex justify-content-between align-items-center mb-3">
            <h6 class="mb-0">{{ showNewConfigForm ? 'بازارسال جدید' : 'ویرایش بازارسال' }}</h6>
            <button type="button" class="btn-close" v-on:click="cancelEditing"></button>
          </div>

          <div class="mb-3">
            <small class="text-muted">مرحله {{ currentStep }} از {{ totalSteps }}: {{ stepTitle }}</small>
            <div class="progress mt-1" style="height: 3px;">
              <div class="progress-bar" :style="{ width: (currentStep / totalSteps) * 100 + '%' }"></div>
            </div>
          </div>

          <!-- Step 1: Basic Info -->
          <div v-show="currentStep === 1">
            <div class="mb-3">
              <label class="form-label">نام</label>
              <input type="text" class="form-control" v-model="editingData.name" />
            </div>
            <div class="form-check form-switch">
              <input class="form-check-input" type="checkbox" id="enabled" v-model="editingData.enabled" />
              <label class="form-check-label" for="enabled">
                {{ editingData.enabled ? 'فعال' : 'غیرفعال' }}
              </label>
            </div>
          </div>

          <!-- Step 2: Destination -->
          <div v-show="currentStep === 2">
            <div class="mb-3">
              <label class="form-label">حالت ارسال</label>
              <div class="form-check">
                <input class="form-check-input" type="radio" name="mode" id="subnet" value="subnet" v-model="editingData.send_mode" />
                <label class="form-check-label" for="subnet">زیرشبکه</label>
              </div>
              <div class="form-check">
                <input class="form-check-input" type="radio" name="mode" id="direct" value="direct" v-model="editingData.send_mode" />
                <label class="form-check-label" for="direct">مستقیم</label>
              </div>
            </div>

            <div v-if="editingData.send_mode === 'subnet'" class="mb-3">
              <label class="form-label">زیرشبکه</label>
              <select class="form-select" v-model="editingData.selected_subnet">
                <option value="">انتخاب کنید</option>
                <option v-for="subnet in availableSubnets" :key="subnet" :value="subnet">{{ subnet }}</option>
              </select>
            </div>

            <div v-if="editingData.send_mode === 'direct'">
              <div class="mb-3">
                <label class="form-label">URN</label>
                <select class="form-select" v-model="editingData.selected_urn" @change="onUrnSelected">
                  <option value="">انتخاب کنید</option>
                  <option v-for="contact in availableContacts" :key="contact.urn" :value="contact.urn">
                    {{ contact.urn }} ({{ contact.callsign }})
                  </option>
                </select>
              </div>
              <div class="mb-3">
                <label class="form-label">آدرس IP</label>
                <select class="form-select" v-model="editingData.selected_ip" :disabled="!editingData.selected_urn">
                  <option value="">انتخاب کنید</option>
                  <option v-for="ip in availableIps" :key="ip" :value="ip">{{ ip }}</option>
                </select>
              </div>
            </div>
          </div>

          <!-- Step 3: Filters -->
          <div v-show="currentStep === 3">
            <div class="d-flex justify-content-between align-items-center mb-2">
              <span>فیلترها ({{ editingData.filters.length }})</span>
              <button type="button" class="btn btn-sm btn-primary" v-on:click="addFilter">افزودن</button>
            </div>

            <div v-if="editingData.filters.length > 0">
              <div v-for="filter in editingData.filters" :key="filter.id" class="border rounded p-2 mb-2">
                <div class="d-flex justify-content-between align-items-center">
                  <div>
                    <button type="button" class="btn btn-sm" @click="toggleFilterExpansion(filter.id)">
                      <i :class="expandedFilters[filter.id] ? 'bi bi-chevron-down' : 'bi bi-chevron-left'"></i>
                    </button>
                    <span>فیلتر #{{ editingData.filters.indexOf(filter) + 1 }}</span>
                    <small class="text-muted ms-2">({{ getFilterSummary(filter) }})</small>
                  </div>
                  <button type="button" class="btn btn-sm text-danger" @click="deleteFilterById(filter.id)">
                    <i class="bi bi-trash"></i>
                  </button>
                </div>
                <div v-show="expandedFilters[filter.id]" class="mt-2">
                  <filter-component :filter="filter" :polygons="availablePolygons" @update-filter="updateFilter"></filter-component>
                </div>
              </div>
            </div>
            <div v-else class="text-center text-muted py-3">
              <small>هنوز فیلتری اضافه نشده</small>
            </div>
          </div>

          <!-- Navigation -->
          <div class="d-flex justify-content-between mt-3 pt-3 border-top">
            <button v-if="currentStep > 1" type="button" class="btn btn-outline-secondary" @click="prevStep">
              <i class="bi bi-arrow-right"></i> قبلی
            </button>
            <div class="ms-auto">
              <button type="button" class="btn btn-outline-secondary me-2" v-on:click="cancelEditing">لغو</button>
              <button v-if="currentStep < totalSteps" type="button" class="btn btn-primary" @click="nextStep" :disabled="!canProceedToNextStep()">
                بعدی <i class="bi bi-arrow-left"></i>
              </button>
              <button v-else type="button" class="btn btn-success" v-on:click="saveConfig" :disabled="!editingData.name">
                ذخیره
              </button>
            </div>
          </div>
        </div>

        <!-- Config List -->
        <div v-if="!editing" class="p-3">
          <div class="d-flex justify-content-between align-items-center mb-3">
            <h6 class="mb-0">بازارسال‌ها</h6>
            <button type="button" class="btn btn-primary btn-sm" v-on:click="addConfig">
              <i class="bi bi-plus"></i> جدید
            </button>
          </div>

          <div v-if="resendingConfigs.length > 0">
            <div v-for="(config, index) in resendingConfigs" :key="config.uid || index" class="border rounded p-3 mb-2">
              <div class="d-flex justify-content-between align-items-start">
                <div class="flex-grow-1">
                  <div class="fw-bold">{{ config.name }}</div>
                  <div class="small text-muted mt-1">
                    <span :class="config.enabled ? 'text-success' : 'text-warning'">
                      {{ config.enabled ? 'فعال' : 'غیرفعال' }}
                    </span>
                    <span class="mx-2">•</span>
                    <span>{{ config.destination ? config.destination.ip : '' }}</span>
                    <span class="mx-2">•</span>
                    <span>{{ config.filters ? config.filters.length : 0 }} فیلتر</span>
                  </div>
                </div>
                <div class="dropdown">
                  <button class="btn btn-sm" data-bs-toggle="dropdown">
                    <i class="bi bi-three-dots-vertical"></i>
                  </button>
                  <ul class="dropdown-menu">
                    <li><button class="dropdown-item" @click="editConfig(index)">ویرایش</button></li>
                    <li><button class="dropdown-item text-danger" @click="deleteConfig(index)">حذف</button></li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div v-else class="text-center py-5">
            <i class="bi bi-inbox" style="font-size: 3rem; opacity: 0.3;"></i>
            <p class="text-muted mt-2">هیچ بازارسالی وجود ندارد</p>
            <button type="button" class="btn btn-primary" @click="addConfig">
              <i class="bi bi-plus"></i> ایجاد بازارسال
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
});