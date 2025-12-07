<template>
  <div class="card">
    <h5 class="card-header">لایه‌ها</h5>
    <div class="card-body">
      <!-- Search Bar -->
      <div class="mb-3" v-if="showSearchBar">
        <input
          type="text"
          class="form-control"
          v-model="searchQuery"
          placeholder="جستجو در لایه‌ها..."
        />
      </div>

      <!-- Search Toggle Button -->
      <div class="mb-2">
        <button
          class="btn btn-sm btn-outline-primary"
          @click="showSearchBar = !showSearchBar"
        >
          <i class="bi" :class="showSearchBar ? 'bi-x' : 'bi-search'"></i>
          {{ showSearchBar ? "بستن جستجو" : "جستجو" }}
        </button>
      </div>

      <!-- Overlay Tree -->
      <div class="overlay-manager-tree">
        <div class="tree-container">
          <div
            v-for="(category, categoryName) in filteredOverlays"
            :key="categoryName"
            class="tree-node"
          >
            <!-- Category Header -->
            <div class="category-header">
              <div class="node-content">
                <!-- Expand Icon -->
                <span class="expand-icon" @click="toggleCategory(categoryName)">
                  <i
                    class="bi"
                    :class="
                      expandedCategories[categoryName]
                        ? 'bi-chevron-down'
                        : 'bi-chevron-right'
                    "
                  ></i>
                </span>

                <!-- Category Checkbox -->
                <input
                  class="form-check-input me-1"
                  type="checkbox"
                  v-model="categoryVisibility[categoryName]"
                  :id="'category-' + categoryName"
                  @change="toggleCategoryVisibility(categoryName)"
                />

                <!-- Category Label -->
                <label class="category-title" :for="'category-' + categoryName">
                  {{ category.title }}
                </label>

                <!-- Item Count -->
                <span class="badge bg-success rounded-pill">
                  {{ countByCategory(categoryName) }}
                </span>
              </div>
            </div>

            <!-- Subcategories (shown when expanded) -->
            <div v-if="expandedCategories[categoryName]" class="subcategories">
              <div
                v-for="(subcategory, subcategoryName) in getSubcategories(
                  categoryName
                )"
                :key="subcategoryName"
                class="subcategory-node"
              >
                <div class="node-content subcategory-content">
                  <span class="subcategory-indent"></span>

                  <!-- Subcategory Checkbox -->
                  <input
                    class="form-check-input me-1"
                    type="checkbox"
                    v-model="
                      subcategoryVisibility[
                        `${categoryName}_${subcategoryName}`
                      ]
                    "
                    :id="`subcategory-${categoryName}-${subcategoryName}`"
                    @change="
                      toggleSubcategoryVisibility(categoryName, subcategoryName)
                    "
                  />

                  <!-- Subcategory Label -->
                  <label
                    class="subcategory-title"
                    :for="`subcategory-${categoryName}-${subcategoryName}`"
                  >
                    {{ subcategory.title }}
                  </label>

                  <!-- Subcategory Count -->
                  <span class="badge bg-secondary rounded-pill">
                    {{ countBySubcategory(categoryName, subcategoryName) }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, watch, computed, onMounted } from "vue";
import { formatNumber } from "../utils.js";
import store from "../store.js";

// Props
const props = defineProps({
  toggleOverlayItems: {
    type: Function,
    required: true,
  },
  activeItemUid: {
    type: String,
    default: null,
  },
  map: {
    type: Object,
    default: null,
  },
  config: {
    type: Object,
    default: null,
  },
  coords: {
    type: Object,
    default: null,
  },
  configUpdated: {
    type: [Function, Object],
    default: null,
  },
});

// Emits
const emit = defineEmits(["select-item"]);

// Reactive state
const sharedState = store.state;

// Search feature
const searchQuery = ref("");
const showSearchBar = ref(false);

// Track expanded state for categories
const expandedCategories = reactive({
  contact: false,
  unit: false,
  alarm: false,
  point: false,
  drawing: false,
  route: false,
  report: false,
});

// Track expanded state for subcategories (key format: "category_subcategory")
const expandedSubcategories = reactive({
  unit_f: false,
  unit_h: false,
  unit_n: false,
  unit_u: false,
  alarm_emergency: false,
  alarm_general: false,
});

// Visibility state tracking
const categoryVisibility = reactive({
  contact: true,
  unit: true,
  alarm: true,
  point: true,
  drawing: true,
  route: true,
  report: true,
});

// Subcategory visibility (key format: "category_subcategory")
const subcategoryVisibility = reactive({
  unit_f: true,
  unit_h: true,
  unit_n: true,
  unit_u: true,
  alarm_emergency: true,
  alarm_general: true,
});

const overlays = reactive({
  contact: {
    active: true,
    title: "مخاطبین",
  },
  unit: {
    active: true,
    title: "نیروها",
    subcategories: {
      f: { title: "پیاده" },
      h: { title: "هلیکوپتر" },
      n: { title: "ناو" },
      u: { title: "هواپیما" },
    },
  },
  alarm: {
    active: true,
    title: "هشدارها",
    subcategories: {
      emergency: { title: "فوری" },
      general: { title: "عمومی" },
    },
  },
  point: {
    active: true,
    title: "نقاط",
  },
  drawing: {
    active: true,
    title: "ناحیه ها",
  },
  route: {
    active: true,
    title: "مسیرها",
  },
  report: {
    active: true,
    title: "گزارش‌ها",
  },
});

// Computed
const filteredOverlays = computed(() => {
  if (!searchQuery.value) return overlays;

  const query = searchQuery.value.toLowerCase();
  const filtered = {};

  for (const [name, overlay] of Object.entries(overlays)) {
    if (overlay.title.toLowerCase().includes(query)) {
      filtered[name] = overlay;
    } else if (overlay.subcategories) {
      // Check subcategories
      const filteredSubcategories = {};
      for (const [subName, subcategory] of Object.entries(
        overlay.subcategories
      )) {
        if (subcategory.title.toLowerCase().includes(query)) {
          filteredSubcategories[subName] = subcategory;
        }
      }
      if (Object.keys(filteredSubcategories).length > 0) {
        filtered[name] = {
          ...overlay,
          subcategories: filteredSubcategories,
        };
      }
    }
  }

  return filtered;
});

// Methods
function toggleCategory(categoryName) {
  expandedCategories[categoryName] = !expandedCategories[categoryName];
}

function toggleCategoryVisibility(categoryName) {
  const isVisible = categoryVisibility[categoryName];
  props.toggleOverlayItems(categoryName, isVisible);
}

function toggleSubcategoryVisibility(categoryName, subcategoryName) {
  const key = `${categoryName}_${subcategoryName}`;
  const isVisible = subcategoryVisibility[key];
  // Implementation would depend on how subcategory toggling works in the parent
  console.log(`Toggle subcategory ${key}: ${isVisible}`);
}

function getSubcategories(categoryName) {
  const category = overlays[categoryName];
  return category?.subcategories || {};
}

function countByCategory(category) {
  let total = 0;
  sharedState.items.forEach(function (u) {
    if (u.category === category && !u.uid.endsWith("-fence")) total += 1;
  });
  return total;
}

function countBySubcategory(categoryName, subcategoryName) {
  let total = 0;
  sharedState.items.forEach(function (u) {
    if (
      u.category === categoryName &&
      u.subcategory === subcategoryName &&
      !u.uid.endsWith("-fence")
    ) {
      total += 1;
    }
  });
  return total;
}

function handleItemSelect(item) {
  emit("select-item", item);
}

// Watch
watch(
  categoryVisibility,
  (newValue, oldValue) => {
    for (const [categoryName, isVisible] of Object.entries(newValue)) {
      if (oldValue && oldValue[categoryName] !== undefined) {
        props.toggleOverlayItems(categoryName, isVisible);
      }
    }
  },
  {
    deep: true,
  }
);

// Initial setup after component is mounted
onMounted(() => {
  // Delay initial toggle to ensure parent component is ready
  setTimeout(() => {
    for (const [categoryName, isVisible] of Object.entries(
      categoryVisibility
    )) {
      props.toggleOverlayItems(categoryName, isVisible);
    }
  }, 100);
});
</script>

<style scoped>
/* Overlay Manager Tree Styles */
.overlay-manager-tree .tree-container {
  max-height: 600px;
  overflow-y: auto;
  padding: 0.5rem;
}

/* Tree Nodes */
.overlay-manager-tree .tree-node {
  padding: 0.5rem;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.overlay-manager-tree .tree-node:hover {
  background-color: rgba(0, 0, 0, 0.05);
}

.overlay-manager-tree .node-content {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

/* Category Header */
.overlay-manager-tree .category-header {
  font-weight: 600;
  margin-bottom: 0.25rem;
}

.overlay-manager-tree .category-title {
  flex: 1;
  cursor: pointer;
  margin: 0;
}

/* Expand Icon */
.overlay-manager-tree .expand-icon {
  cursor: pointer;
  transition: transform 0.2s;
  font-size: 0.875rem;
  width: 1rem;
  text-align: center;
}

/* Subcategories */
.overlay-manager-tree .subcategories {
  margin-left: 1.5rem;
  border-left: 2px solid #e9ecef;
  padding-left: 0.5rem;
}

.overlay-manager-tree .subcategory-node {
  padding: 0.25rem 0;
}

.overlay-manager-tree .subcategory-content {
  font-size: 0.875rem;
}

.overlay-manager-tree .subcategory-indent {
  width: 1rem;
  display: inline-block;
}

.overlay-manager-tree .subcategory-title {
  flex: 1;
  cursor: pointer;
  margin: 0;
}

/* Search Bar */
.overlay-manager-tree .form-control {
  font-size: 0.875rem;
}

/* Badges */
.overlay-manager-tree .badge {
  font-size: 0.75rem;
}
</style>
