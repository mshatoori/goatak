<template>
  <div>
    <!-- Error Message -->
    <div v-if="error" class="alert alert-danger m-3">
      {{ error }}
      <button
        type="button"
        class="btn-close float-end"
        @click="error = null"
      ></button>
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
          <h6 class="mb-0">
            {{ showNewConfigForm ? "بازارسال جدید" : "ویرایش بازارسال" }}
          </h6>
          <button
            type="button"
            class="btn-close"
            @click="cancelEditing"
          ></button>
        </div>

        <div class="mb-3">
          <small class="text-muted"
            >مرحله {{ currentStep }} از {{ totalSteps }}: {{ stepTitle }}</small
          >
          <div class="progress mt-1" style="height: 3px">
            <div
              class="progress-bar"
              :style="{ width: (currentStep / totalSteps) * 100 + '%' }"
            ></div>
          </div>
        </div>

        <!-- Step 1: Basic Info -->
        <div v-show="currentStep === 1">
          <div class="mb-3">
            <label class="form-label">نام</label>
            <input
              type="text"
              class="form-control"
              v-model="editingData.name"
            />
          </div>
          <div class="form-check form-switch">
            <input
              class="form-check-input"
              type="checkbox"
              id="enabled"
              v-model="editingData.enabled"
            />
            <label class="form-check-label" for="enabled">
              {{ editingData.enabled ? "فعال" : "غیرفعال" }}
            </label>
          </div>
        </div>

        <!-- Step 2: Destination -->
        <div v-show="currentStep === 2">
          <div class="mb-3">
            <label class="form-label">حالت ارسال</label>
            <div class="form-check">
              <input
                class="form-check-input"
                type="radio"
                name="mode"
                id="subnet"
                value="subnet"
                v-model="editingData.send_mode"
              />
              <label class="form-check-label" for="subnet">زیرشبکه</label>
            </div>
            <div class="form-check">
              <input
                class="form-check-input"
                type="radio"
                name="mode"
                id="direct"
                value="direct"
                v-model="editingData.send_mode"
              />
              <label class="form-check-label" for="direct">مستقیم</label>
            </div>
          </div>

          <div v-if="editingData.send_mode === 'subnet'" class="mb-3">
            <label class="form-label">زیرشبکه</label>
            <select class="form-select" v-model="editingData.selected_subnet">
              <option value="">انتخاب کنید</option>
              <option
                v-for="subnet in availableSubnets"
                :key="subnet"
                :value="subnet"
              >
                {{ subnet }}
              </option>
            </select>
          </div>

          <div v-if="editingData.send_mode === 'direct'">
            <div class="mb-3">
              <label class="form-label">URN</label>
              <select
                class="form-select"
                v-model="editingData.selected_urn"
                @change="onUrnSelected"
              >
                <option value="">انتخاب کنید</option>
                <option
                  v-for="contact in availableContacts"
                  :key="contact.urn"
                  :value="contact.urn"
                >
                  {{ contact.urn }} ({{ contact.callsign }})
                </option>
              </select>
            </div>
            <div class="mb-3">
              <label class="form-label">آدرس IP</label>
              <select
                class="form-select"
                v-model="editingData.selected_ip"
                :disabled="!editingData.selected_urn"
              >
                <option value="">انتخاب کنید</option>
                <option v-for="ip in availableIps" :key="ip" :value="ip">
                  {{ ip }}
                </option>
              </select>
            </div>
          </div>
        </div>

        <!-- Step 3: Filters -->
        <div v-show="currentStep === 3">
          <div class="d-flex justify-content-between align-items-center mb-2">
            <span>فیلترها ({{ editingData.filters.length }})</span>
            <button
              type="button"
              class="btn btn-sm btn-primary"
              @click="addFilter"
            >
              افزودن
            </button>
          </div>

          <div v-if="editingData.filters.length > 0">
            <div
              v-for="filter in editingData.filters"
              :key="filter.id"
              class="border rounded p-2 mb-2"
            >
              <div class="d-flex justify-content-between align-items-center">
                <div>
                  <button
                    type="button"
                    class="btn btn-sm"
                    @click="toggleFilterExpansion(filter.id)"
                  >
                    <i
                      :class="
                        expandedFilters[filter.id]
                          ? 'bi bi-chevron-down'
                          : 'bi bi-chevron-left'
                      "
                    ></i>
                  </button>
                  <span
                    >فیلتر #{{ editingData.filters.indexOf(filter) + 1 }}</span
                  >
                  <small class="text-muted ms-2"
                    >({{ getFilterSummary(filter) }})</small
                  >
                </div>
                <button
                  type="button"
                  class="btn btn-sm text-danger"
                  @click="deleteFilterById(filter.id)"
                >
                  <i class="bi bi-trash"></i>
                </button>
              </div>
              <div v-show="expandedFilters[filter.id]" class="mt-2">
                <FilterComponent
                  :filter="filter"
                  :polygons="availablePolygons"
                  @update-filter="updateFilter"
                />
              </div>
            </div>
          </div>
          <div v-else class="text-center text-muted py-3">
            <small>هنوز فیلتری اضافه نشده</small>
          </div>
        </div>

        <!-- Navigation -->
        <div class="d-flex justify-content-between mt-3 pt-3 border-top">
          <button
            v-if="currentStep > 1"
            type="button"
            class="btn btn-outline-secondary"
            @click="prevStep"
          >
            <i class="bi bi-arrow-right"></i> قبلی
          </button>
          <div class="ms-auto">
            <button
              type="button"
              class="btn btn-outline-secondary me-2"
              @click="cancelEditing"
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
              بعدی <i class="bi bi-arrow-left"></i>
            </button>
            <button
              v-else
              type="button"
              class="btn btn-success"
              @click="saveConfig"
              :disabled="!editingData.name"
            >
              ذخیره
            </button>
          </div>
        </div>
      </div>

      <!-- Config List -->
      <div v-if="!editing" class="p-3">
        <div class="d-flex justify-content-between align-items-center mb-3">
          <h6 class="mb-0">بازارسال‌ها</h6>
          <button
            type="button"
            class="btn btn-primary btn-sm"
            @click="addConfig"
          >
            <i class="bi bi-plus"></i> جدید
          </button>
        </div>

        <div v-if="resendingConfigs.length > 0">
          <div
            v-for="(config, index) in resendingConfigs"
            :key="config.uid || index"
            class="border rounded p-3 mb-2"
          >
            <div class="d-flex justify-content-between align-items-start">
              <div class="flex-grow-1">
                <div class="fw-bold">{{ config.name }}</div>
                <div class="small text-muted mt-1">
                  <span
                    :class="config.enabled ? 'text-success' : 'text-warning'"
                  >
                    {{ config.enabled ? "فعال" : "غیرفعال" }}
                  </span>
                  <span class="mx-2">•</span>
                  <span>{{
                    config.destination ? config.destination.ip : ""
                  }}</span>
                  <span class="mx-2">•</span>
                  <span
                    >{{
                      config.filters ? config.filters.length : 0
                    }}
                    فیلتر</span
                  >
                </div>
              </div>
              <div class="dropdown">
                <button class="btn btn-sm" data-bs-toggle="dropdown">
                  <i class="bi bi-three-dots-vertical"></i>
                </button>
                <ul class="dropdown-menu">
                  <li>
                    <button class="dropdown-item" @click="editConfig(index)">
                      ویرایش
                    </button>
                  </li>
                  <li>
                    <button
                      class="dropdown-item text-danger"
                      @click="deleteConfig(index)"
                    >
                      حذف
                    </button>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div v-else class="text-center py-5">
          <i class="bi bi-inbox" style="font-size: 3rem; opacity: 0.3"></i>
          <p class="text-muted mt-2">هیچ بازارسالی وجود ندارد</p>
          <button type="button" class="btn btn-primary" @click="addConfig">
            <i class="bi bi-plus"></i> ایجاد بازارسال
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, getCurrentInstance } from "vue";
import FilterComponent from "./FilterComponent.vue";
import store from "../store.js";
import api from "../api/axios.js";

const props = defineProps({
  config: Object,
});

// Get access to global properties
const instance = getCurrentInstance();
const emit = instance.emit;

// State
const loading = ref(false);
const error = ref(null);
const resendingConfigs = ref([]);
const editing = ref(false);
const editingData = ref(null);
const editingIndex = ref(-1);
const showNewConfigForm = ref(false);
const currentStep = ref(1);
const totalSteps = ref(3);
const newFilter = ref({ predicates: [] });
const expConfigs = ref({});
const expandedFilters = ref({});
const availableDestinations = ref(null);

// Computed
const stepTitle = computed(() => {
  const titles = {
    1: "اطلاعات پایه",
    2: "تنظیمات مقصد",
    3: "مدیریت فیلترها",
  };
  return titles[currentStep.value] || "";
});

const availablePolygons = computed(() => {
  const polygons = [];
  store.state.items.forEach((item) => {
    if (item.type && item.type.startsWith("u-d-f")) {
      polygons.push({
        id: item.uid,
        name: item.callsign || item.uid,
      });
    }
  });
  return store.state.ts && polygons;
});

const availableSubnets = computed(() => {
  return availableDestinations.value
    ? availableDestinations.value.ownAddresses || []
    : [];
});

const availableContacts = computed(() => {
  if (
    !availableDestinations.value ||
    !availableDestinations.value.directDestinations
  ) {
    return [];
  }

  const contactMap = new Map();
  availableDestinations.value.directDestinations.forEach((dest) => {
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
});

const availableIps = computed(() => {
  if (
    editingData.value &&
    editingData.value.selected_urn &&
    availableContacts.value
  ) {
    const selectedContact = availableContacts.value.find(
      (contact) => contact.urn.toString() === editingData.value.selected_urn
    );
    if (selectedContact && selectedContact.ip_address) {
      return selectedContact.ip_address.split(",");
    }
  }
  return [];
});

// Methods
const loadResendConfigs = async () => {
  loading.value = true;
  error.value = null;
  try {
    const response = await api.get("/resend/configs");
    if (response.data.success) {
      resendingConfigs.value = response.data.data || [];
    } else {
      throw new Error(response.data.error || "Failed to load configurations");
    }
  } catch (err) {
    error.value = err.message;
    resendingConfigs.value = [];
    console.error("Failed to load resend configs:", err);
  } finally {
    loading.value = false;
  }
};

const saveConfigToBackend = async (config) => {
  const isNew = !config.uid;
  const url = isNew ? "/resend/configs" : `/resend/configs/${config.uid}`;
  const method = isNew ? "POST" : "PUT";

  try {
    const response = await api({
      method: method,
      url: url,
      data: config,
    });

    if (response.data.success) {
      await loadResendConfigs();
      return response.data.data;
    } else {
      throw new Error(response.data.error || "Failed to save configuration");
    }
  } catch (err) {
    error.value = err.message;
    throw err;
  }
};

const deleteConfigFromBackend = async (uid) => {
  try {
    const response = await api.delete(`/resend/configs/${uid}`);

    if (response.data.success) {
      await loadResendConfigs();
    } else {
      throw new Error(response.data.error || "Failed to delete configuration");
    }
  } catch (err) {
    error.value = err.message;
    throw err;
  }
};

const addConfig = () => {
  editingData.value = {
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
  editingIndex.value = -1;
  editing.value = true;
  showNewConfigForm.value = true;
  currentStep.value = 1;
  newFilter.value = { predicates: [] };
};

const editConfig = (index) => {
  if (
    !resendingConfigs.value ||
    index < 0 ||
    index >= resendingConfigs.value.length
  ) {
    console.error("Config not found at index:", index);
    return;
  }

  const config = resendingConfigs.value[index];

  editingData.value = {
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

  loadEnhancedSelectionFromDestination();

  editingIndex.value = index;
  editing.value = true;
  showNewConfigForm.value = false;
  currentStep.value = 1;
  newFilter.value = { predicates: [] };
};

const saveConfig = async () => {
  addPendingPredicates();

  if (!editingData.value.name) {
    error.value = "نام بازارسال الزامی است";
    return;
  }

  if (editingData.value.send_mode === "direct") {
    if (!editingData.value.selected_urn || !editingData.value.selected_ip) {
      error.value = "برای ارسال مستقیم، URN و آدرس IP الزامی هستند";
      return;
    }
  } else if (editingData.value.send_mode === "subnet") {
    if (!editingData.value.selected_subnet) {
      error.value = "برای ارسال به زیرشبکه، انتخاب زیرشبکه الزامی است";
      return;
    }
  }

  mapEnhancedSelectionToDestination();

  try {
    await saveConfigToBackend(editingData.value);
    cancelEditing();
    error.value = null;
  } catch (err) {
    console.error("Failed to save config:", err);
  }
};

const addPendingPredicates = () => {
  emit("add-pending-predicates");
};

const cancelEditing = () => {
  editing.value = false;
  editingData.value = null;
  editingIndex.value = -1;
  showNewConfigForm.value = false;
  currentStep.value = 1;
  newFilter.value = { predicates: [] };
  error.value = null;
};

const deleteConfig = async (index) => {
  if (!confirm("آیا از حذف این بازارسال مطمئن هستید؟")) {
    return;
  }

  if (
    !resendingConfigs.value ||
    index < 0 ||
    index >= resendingConfigs.value.length
  ) {
    console.error("Config not found at index:", index);
    return;
  }

  const config = resendingConfigs.value[index];
  if (!config || !config.uid) {
    console.error("Config has no UID");
    return;
  }

  try {
    await deleteConfigFromBackend(config.uid);
    error.value = null;
  } catch (err) {
    console.error("Failed to delete config:", err);
  }
};

const nextStep = () => {
  if (currentStep.value < totalSteps.value) {
    currentStep.value++;
  }
};

const prevStep = () => {
  if (currentStep.value > 1) {
    currentStep.value--;
  }
};

const canProceedToNextStep = () => {
  switch (currentStep.value) {
    case 1:
      return editingData.value.name.trim() !== "";
    case 2:
      if (editingData.value.send_mode === "direct") {
        return editingData.value.selected_urn && editingData.value.selected_ip;
      } else if (editingData.value.send_mode === "subnet") {
        return editingData.value.selected_subnet;
      }
      return false;
    case 3:
      return true;
    default:
      return false;
  }
};

const toggleConfigExpansion = (configId) => {
  expConfigs.value[configId] = !expConfigs.value[configId];
};

const toggleFilterExpansion = (filterId) => {
  expandedFilters.value[filterId] = !expandedFilters.value[filterId];
};

const addFilter = () => {
  const filter = {
    id: generateId(),
    predicates: [],
  };
  editingData.value.filters.push(filter);
  newFilter.value = { predicates: [] };
  expandedFilters.value[filter.id] = true;
};

const updateFilter = (updatedFilter) => {
  const filterIndex = editingData.value.filters.findIndex(
    (f) => f.id === updatedFilter.id
  );
  if (filterIndex !== -1) {
    editingData.value.filters.splice(filterIndex, 1, updatedFilter);
  }
};

const deleteFilterById = (filterId) => {
  const filterIndex = editingData.value.filters.findIndex(
    (f) => f.id === filterId
  );
  if (filterIndex !== -1) {
    editingData.value.filters.splice(filterIndex, 1);
  }
};

const generateId = () => {
  return (
    Date.now().toString() +
    Math.random()
      .toString(36)
      .substr(2, 9)
  );
};

const getFilterSummary = (filter) => {
  if (!filter.predicates || filter.predicates.length === 0) {
    return "بدون شرط";
  }
  return `${filter.predicates.length} شرط`;
};

const fetchDestinations = () => {
  api
    .get("/destinations")
    .then((response) => {
      availableDestinations.value = response.data;
    })
    .catch((err) => {
      console.error("Error fetching destinations:", err);
      availableDestinations.value = {
        ownAddresses: [],
        directDestinations: [],
      };
    });
};

const onUrnSelected = () => {
  if (editingData.value.selected_urn && availableContacts.value) {
    const selectedContact = availableContacts.value.find(
      (contact) => contact.urn.toString() === editingData.value.selected_urn
    );
    if (selectedContact) {
      editingData.value.selected_ip = "";
    }
  }
};

const mapEnhancedSelectionToDestination = () => {
  if (editingData.value.send_mode === "direct") {
    editingData.value.destination = {
      type: "node",
      ip: editingData.value.selected_ip,
      urn: parseInt(editingData.value.selected_urn) || 0,
      subnet_mask: "",
    };
  } else if (editingData.value.send_mode === "subnet") {
    editingData.value.destination = {
      type: "subnet",
      ip: editingData.value.selected_subnet,
      urn: 0,
      subnet_mask: "255.255.255.0",
    };
  }
};

const loadEnhancedSelectionFromDestination = () => {
  if (editingData.value.destination) {
    if (editingData.value.destination.type === "node") {
      editingData.value.send_mode = "direct";
      editingData.value.selected_ip = editingData.value.destination.ip;
      editingData.value.selected_urn = editingData.value.destination.urn.toString();
    } else if (editingData.value.destination.type === "subnet") {
      editingData.value.send_mode = "subnet";
      editingData.value.selected_subnet = editingData.value.destination.ip;
    }
  }
};

// Lifecycle
onMounted(async () => {
  try {
    await loadResendConfigs();
  } catch (err) {
    console.error("Failed to load resend configs on mount:", err);
  }
  fetchDestinations();
});
</script>
