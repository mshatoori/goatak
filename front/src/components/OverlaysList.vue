<template>
  <div class="card overlay-manager-tree">
    <h5 class="card-header d-flex justify-content-between align-items-center">
      <span>لایه‌ها</span>
      <button
        class="btn btn-sm btn-outline-secondary"
        @click="toggleSearchBar"
        :class="{ active: showSearchBar }"
        title="جستجو"
      >
        <i class="bi bi-search"></i>
      </button>
    </h5>

    <!-- Search Bar -->
    <div v-show="showSearchBar" class="overlay-search-bar p-2 border-bottom">
      <div class="input-group input-group-sm">
        <input
          type="text"
          class="form-control"
          v-model="searchQuery"
          placeholder="جستجوی نام..."
          @keyup.escape="clearSearch"
        />
        <button
          v-if="searchQuery"
          class="btn btn-outline-secondary"
          type="button"
          @click="clearSearch"
        >
          <i class="bi bi-x"></i>
        </button>
      </div>
    </div>

    <div class="card-body p-2">
      <!-- Search Results Mode -->
      <div v-if="isSearchMode" class="overlay-search-results">
        <div
          v-if="searchResults.length === 0"
          class="text-muted text-center py-3"
        >
          <i class="bi bi-search me-2"></i>
          نتیجه‌ای یافت نشد
        </div>
        <div v-else>
          <div class="mb-2 text-muted small">
            {{ searchResults.length }} نتیجه یافت شد
          </div>
          <div
            v-for="item in searchResults"
            :key="item.uid"
            class="overlay-search-result-item"
            :class="{ 'active-item': item.uid === activeItemUid }"
            @click="selectItem(item)"
          >
            <div class="d-flex align-items-center">
              <span class="item-callsign flex-grow-1">{{ item.callsign }}</span>
              <span class="badge bg-secondary small">{{ item.category }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Tree View Mode -->
      <div v-else class="tree-container">
        <!-- Render each category -->
        <div
          v-for="category in treeStructure"
          :key="category.name"
          class="tree-category mb-2"
        >
          <!-- Category Header -->
          <div class="tree-node category-header" @click.stop="">
            <div class="node-content">
              <!-- Expand/Collapse Icon -->
              <i
                v-if="
                  category.hasSubcategories ||
                    (category.items && category.items.length > 0)
                "
                class="expand-icon bi me-1"
                :class="
                  expandedCategories[category.name]
                    ? 'bi-chevron-down'
                    : 'bi-chevron-left'
                "
                @click="toggleCategoryExpand(category.name)"
                style="cursor: pointer; width: 16px"
              ></i>
              <span v-else style="width: 16px; display: inline-block"></span>

              <!-- Category Checkbox -->
              <input
                type="checkbox"
                class="form-check-input me-2"
                :checked="categoryVisibility[category.name]"
                :indeterminate.prop="
                  getCategoryCheckboxState(category.name) === 'indeterminate'
                "
                @change="toggleCategoryVisibility(category.name)"
                @click.stop=""
              />

              <!-- Category Title -->
              <label
                class="category-title mb-0"
                style="cursor: pointer; flex: 1"
                @click="toggleCategoryExpand(category.name)"
              >
                {{ category.title }}
              </label>

              <!-- Item Count Badge -->
              <span class="badge bg-success rounded-pill ms-auto">
                {{ category.count }}
              </span>
            </div>
          </div>

          <!-- Category Children (Subcategories or Items) -->
          <div v-show="expandedCategories[category.name]" class="tree-children">
            <!-- Subcategories (for Unit and Alarm) -->
            <div v-if="category.hasSubcategories">
              <div
                v-for="subcategory in category.subcategories"
                :key="subcategory.key"
                class="tree-subcategory mb-1"
              >
                <!-- Subcategory Header -->
                <div class="tree-node subcategory-header" @click.stop="">
                  <div class="node-content">
                    <!-- Expand/Collapse Icon -->
                    <i
                      v-if="subcategory.items && subcategory.items.length > 0"
                      class="expand-icon bi me-1"
                      :class="
                        expandedSubcategories[subcategory.key]
                          ? 'bi-chevron-down'
                          : 'bi-chevron-left'
                      "
                      @click="toggleSubcategoryExpand(subcategory.key)"
                      style="cursor: pointer; width: 16px; font-size: 0.9rem"
                    ></i>
                    <span
                      v-else
                      style="width: 16px; display: inline-block"
                    ></span>

                    <!-- Subcategory Checkbox -->
                    <input
                      type="checkbox"
                      class="form-check-input me-2"
                      :checked="subcategoryVisibility[subcategory.key]"
                      :indeterminate.prop="
                        getSubcategoryCheckboxState(
                          subcategory.key,
                          category.name
                        ) === 'indeterminate'
                      "
                      @change="
                        toggleSubcategoryVisibility(
                          subcategory.key,
                          category.name,
                          subcategory.subcategory
                        )
                      "
                      @click.stop=""
                    />

                    <!-- Subcategory Title -->
                    <label
                      class="subcategory-title mb-0"
                      style="cursor: pointer; flex: 1; font-size: 0.95rem"
                      @click="toggleSubcategoryExpand(subcategory.key)"
                    >
                      {{ subcategory.title }}
                    </label>

                    <!-- Subcategory Count Badge -->
                    <span
                      class="badge bg-secondary rounded-pill ms-auto"
                      style="font-size: 0.75rem"
                    >
                      {{ subcategory.count }}
                    </span>
                  </div>
                </div>

                <!-- Subcategory Items -->
                <div
                  v-show="expandedSubcategories[subcategory.key]"
                  class="tree-children"
                >
                  <div
                    v-for="item in subcategory.items || []"
                    :key="item.uid"
                    class="tree-item"
                    :class="{ 'active-item': item.uid === activeItemUid }"
                  >
                    <div class="node-content">
                      <!-- Item Checkbox -->
                      <input
                        type="checkbox"
                        class="form-check-input me-2"
                        :checked="item.visible"
                        @change="
                          toggleItemVisibility(
                            item.uid,
                            category.name,
                            subcategory.key
                          )
                        "
                        @click.stop=""
                      />

                      <!-- Item Callsign -->
                      <span
                        class="item-callsign"
                        @click.stop="selectItem(item)"
                        >{{ item.callsign || "بدون نام" }}</span
                      >
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Direct Items (for categories without subcategories) -->
            <div v-else>
              <div
                v-for="item in category.items || []"
                :key="item.uid"
                class="tree-item"
                :class="{ 'active-item': item.uid === activeItemUid }"
                @click.stop="selectItem(item)"
              >
                <div class="node-content">
                  <!-- Item Checkbox -->
                  <input
                    type="checkbox"
                    class="form-check-input me-2"
                    :checked="item.visible"
                    @change="toggleItemVisibility(item.uid, category.name)"
                    @click.stop=""
                  />

                  <!-- Item Callsign -->
                  <span class="item-callsign">{{
                    item.callsign || "بدون نام"
                  }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import store from "../store.js";

export default {
  name: "OverlaysList",
  props: {
    toggleOverlayItems: {
      type: Function,
      required: true,
    },
    activeItemUid: {
      type: String,
      default: null,
    },
  },
  data() {
    return {
      sharedState: store.state,

      // Search feature
      searchQuery: "",
      showSearchBar: false,

      // Track expanded state for categories
      expandedCategories: {
        contact: false,
        unit: false,
        alarm: false,
        point: false,
        drawing: false,
        route: false,
        report: false,
      },

      // Track expanded state for subcategories (key format: "category_subcategory")
      expandedSubcategories: {
        unit_f: false,
        unit_h: false,
        unit_n: false,
        unit_u: false,
        alarm_emergency: false,
        alarm_general: false,
      },

      // Visibility state tracking
      categoryVisibility: {
        contact: true,
        unit: true,
        alarm: true,
        point: true,
        drawing: true,
        route: true,
        report: true,
      },

      // Subcategory visibility (key format: "category_subcategory")
      subcategoryVisibility: {
        unit_f: true,
        unit_h: true,
        unit_n: true,
        unit_u: true,
        alarm_emergency: true,
        alarm_general: true,
      },

      // Note: Individual item visibility is now stored directly on item.visible
    };
  },

  computed: {
    // Search results computed property
    searchResults() {
      if (!this.searchQuery.trim()) return [];
      const query = this.searchQuery.toLowerCase();
      const results = [];
      this.sharedState.items.forEach((item) => {
        // Exclude fence items, only include items with callsign
        if (!item.uid.endsWith("-fence") && item.callsign) {
          if (item.callsign.toLowerCase().includes(query)) {
            results.push(item);
          }
        }
      });
      return results.sort((a, b) => a.callsign.localeCompare(b.callsign, "fa"));
    },

    isSearchMode() {
      return this.searchQuery.trim().length > 0;
    },

    // Build the tree structure from items
    treeStructure() {
      return [
        {
          name: "contact",
          title: "مخاطبین",
          hasSubcategories: false,
          items: this.getItemsByCategory("contact"),
          count: this.countItems("contact"),
        },
        {
          name: "unit",
          title: "نیروها",
          hasSubcategories: true,
          subcategories: [
            {
              key: "unit_f",
              category: "unit",
              subcategory: "f",
              title: "خودی",
              items: this.getUnitsByAffiliation("f"),
              count: this.getUnitsByAffiliation("f").length,
            },
            {
              key: "unit_h",
              category: "unit",
              subcategory: "h",
              title: "دشمن",
              items: this.getUnitsByAffiliation("h"),
              count: this.getUnitsByAffiliation("h").length,
            },
            {
              key: "unit_n",
              category: "unit",
              subcategory: "n",
              title: "بی‌طرف",
              items: this.getUnitsByAffiliation("n"),
              count: this.getUnitsByAffiliation("n").length,
            },
            {
              key: "unit_u",
              category: "unit",
              subcategory: "u",
              title: "نامشخص",
              items: this.getUnitsByAffiliation("u"),
              count: this.getUnitsByAffiliation("u").length,
            },
          ],
          count: this.countItems("unit"),
        },
        {
          name: "alarm",
          title: "هشدارها",
          hasSubcategories: true,
          subcategories: [
            {
              key: "alarm_emergency",
              category: "alarm",
              subcategory: "emergency",
              title: "اضطراری",
              items: this.getAlarmsByType("emergency"),
              count: this.getAlarmsByType("emergency").length,
            },
            {
              key: "alarm_general",
              category: "alarm",
              subcategory: "general",
              title: "عمومی",
              items: this.getAlarmsByType("general"),
              count: this.getAlarmsByType("general").length,
            },
          ],
          count: this.countItems("alarm"),
        },
        {
          name: "point",
          title: "نقاط",
          hasSubcategories: false,
          items: this.getItemsByCategory("point"),
          count: this.countItems("point"),
        },
        {
          name: "drawing",
          title: "ناحیه‌ها",
          hasSubcategories: false,
          items: this.getItemsByCategory("drawing"),
          count: this.countItems("drawing"),
        },
        {
          name: "route",
          title: "مسیرها",
          hasSubcategories: false,
          items: this.getItemsByCategory("route"),
          count: this.countItems("route"),
        },
        {
          name: "report",
          title: "درخواست‌های امداد",
          hasSubcategories: false,
          items: this.getItemsByCategory("report"),
          count: this.countItems("report"),
        },
      ];
    },
  },

  methods: {
    // Search methods
    toggleSearchBar() {
      this.showSearchBar = !this.showSearchBar;
      if (!this.showSearchBar) {
        this.searchQuery = "";
      }
    },

    clearSearch() {
      this.searchQuery = "";
    },

    // Get items by category, excluding fence items
    getItemsByCategory(category) {
      const items = [];
      this.sharedState.items.forEach((item) => {
        if (item.category === category && !item.uid.endsWith("-fence")) {
          items.push(item);
        }
      });
      return items.sort((a, b) =>
        (a.callsign || "").localeCompare(b.callsign || "", "fa")
      );
    },

    // Count items in a category
    countItems(category) {
      let count = 0;
      this.sharedState.items.forEach((item) => {
        if (item.category === category && !item.uid.endsWith("-fence")) {
          count++;
        }
      });
      return count;
    },

    // Get affiliation from CoT type (character at position 2)
    getAffiliationFromType(type) {
      if (!type || type.length < 3) return "u";
      const affCode = type.charAt(2);
      return ["f", "h", "n", "u"].includes(affCode) ? affCode : "u";
    },

    // Get units filtered by affiliation
    getUnitsByAffiliation(aff) {
      const units = [];
      this.sharedState.items.forEach((item) => {
        if (item.category === "unit" && !item.uid.endsWith("-fence")) {
          const itemAff = this.getAffiliationFromType(item.type);
          if (itemAff === aff) {
            units.push(item);
          }
        }
      });
      return units.sort((a, b) =>
        (a.callsign || "").localeCompare(b.callsign || "", "fa")
      );
    },

    // Get alarms filtered by type
    getAlarmsByType(typeCategory) {
      const alarms = [];
      this.sharedState.items.forEach((item) => {
        if (item.category === "alarm" && !item.uid.endsWith("-fence")) {
          if (
            typeCategory === "emergency" &&
            item.type &&
            item.type.startsWith("b-a-o")
          ) {
            alarms.push(item);
          } else if (
            typeCategory === "general" &&
            item.type &&
            !item.type.startsWith("b-a-o")
          ) {
            alarms.push(item);
          }
        }
      });
      return alarms.sort((a, b) =>
        (a.callsign || "").localeCompare(b.callsign || "", "fa")
      );
    },

    // Toggle category expand/collapse
    toggleCategoryExpand(categoryName) {
      this.expandedCategories[categoryName] = !this.expandedCategories[
        categoryName
      ];
    },

    // Toggle subcategory expand/collapse
    toggleSubcategoryExpand(key) {
      this.expandedSubcategories[key] = !this.expandedSubcategories[key];
    },

    // Toggle category visibility with cascading
    toggleCategoryVisibility(categoryName) {
      const newState = !this.categoryVisibility[categoryName];
      this.categoryVisibility[categoryName] = newState;

      // Find the category in tree structure
      const category = this.treeStructure.find((c) => c.name === categoryName);

      if (category.hasSubcategories) {
        // Cascade to all subcategories
        category.subcategories.forEach((sub) => {
          this.subcategoryVisibility[sub.key] = newState;
          // Cascade to all items in subcategory
          if (sub.items && Array.isArray(sub.items)) {
            sub.items.forEach((item) => {
              item.visible = newState;
            });
          }
        });
      } else {
        // Cascade to all items directly
        if (category.items && Array.isArray(category.items)) {
          category.items.forEach((item) => {
            item.visible = newState;
          });
        }
      }

      // Actually control the markers on the map
      this.toggleOverlayItems(categoryName, null, null, newState);
    },

    // Toggle subcategory visibility with cascading
    toggleSubcategoryVisibility(key, categoryName, subcategory) {
      const newState = !this.subcategoryVisibility[key];
      this.subcategoryVisibility[key] = newState;

      // Find the subcategory items
      const category = this.treeStructure.find((c) => c.name === categoryName);
      if (!category || !category.subcategories) return;
      const subcat = category.subcategories.find((s) => s.key === key);
      if (!subcat) return;

      // Cascade to all items
      if (subcat.items && Array.isArray(subcat.items)) {
        subcat.items.forEach((item) => {
          item.visible = newState;
        });
      }

      // Update parent category state
      this.updateParentCategoryState(categoryName);

      this.toggleOverlayItems(categoryName, key, null, newState);
    },

    // Toggle individual item visibility
    toggleItemVisibility(uid, categoryName, subcategoryKey) {
      const item = this.sharedState.items.get(uid);
      if (!item) return;

      const newState = !item.visible;
      item.visible = newState;

      // Update parent states
      if (subcategoryKey) {
        this.updateSubcategoryState(subcategoryKey, categoryName);
      }
      this.updateParentCategoryState(categoryName);

      this.toggleOverlayItems(null, null, uid, newState);
    },

    // Update subcategory state based on its items
    updateSubcategoryState(key, categoryName) {
      const category = this.treeStructure.find((c) => c.name === categoryName);
      if (!category || !category.subcategories) return;
      const subcat = category.subcategories.find((s) => s.key === key);
      if (!subcat) return;

      if (
        !subcat.items ||
        !Array.isArray(subcat.items) ||
        subcat.items.length === 0
      ) {
        this.subcategoryVisibility[key] = true;
        return;
      }

      const allChecked = subcat.items.every((item) => item.visible);

      this.subcategoryVisibility[key] = allChecked;
    },

    // Update parent category state based on subcategories or items
    updateParentCategoryState(categoryName) {
      const category = this.treeStructure.find((c) => c.name === categoryName);
      if (!category) return;

      if (category.hasSubcategories) {
        // Check if all subcategories are checked
        const allSubcategoriesChecked = category.subcategories.every(
          (sub) => this.subcategoryVisibility[sub.key] !== false
        );
        this.categoryVisibility[categoryName] = allSubcategoriesChecked;
      } else {
        // Check if all items are checked
        if (
          !category.items ||
          !Array.isArray(category.items) ||
          category.items.length === 0
        ) {
          this.categoryVisibility[categoryName] = true;
          return;
        }
        const allItemsChecked = category.items.every((item) => item.visible);
        this.categoryVisibility[categoryName] = allItemsChecked;
      }
    },

    // Get checkbox state (checked, unchecked, indeterminate)
    getCategoryCheckboxState(categoryName) {
      const category = this.treeStructure.find((c) => c.name === categoryName);

      if (this.categoryVisibility[categoryName]) {
        return "checked";
      }

      // Check for indeterminate state
      if (category.hasSubcategories) {
        const anySubcategoryChecked = category.subcategories.some(
          (sub) => this.subcategoryVisibility[sub.key]
        );
        return anySubcategoryChecked ? "indeterminate" : "unchecked";
      } else {
        if (!category.items || !Array.isArray(category.items)) {
          return "unchecked";
        }
        const anyItemChecked = category.items.some((item) => item.visible);
        return anyItemChecked ? "indeterminate" : "unchecked";
      }
    },

    // Get subcategory checkbox state
    getSubcategoryCheckboxState(key, categoryName) {
      const category = this.treeStructure.find((c) => c.name === categoryName);
      const subcat = category.subcategories.find((s) => s.key === key);

      if (this.subcategoryVisibility[key]) {
        return "checked";
      }

      // Check for indeterminate state
      if (!subcat.items || !Array.isArray(subcat.items)) {
        return "unchecked";
      }
      const anyItemChecked = subcat.items.some((item) => item.visible);
      return anyItemChecked ? "indeterminate" : "unchecked";
    },

    // Handle item selection (emit to parent)
    selectItem(item) {
      this.$emit("select-item", item);
    },

    // Initialize category and subcategory visibility from item states
    initializeItemVisibility() {
      // Ensure all items have a visibility state (default to true)
      this.sharedState.items.forEach((item) => {
        if (item.visible === undefined) {
          item.visible = true;
        }
      });

      // Update parent states based on actual item visibility
      this.treeStructure.forEach((category) => {
        if (category.hasSubcategories) {
          category.subcategories.forEach((subcat) => {
            this.updateSubcategoryState(subcat.key, category.name);
          });
        }
        this.updateParentCategoryState(category.name);
      });
    },
  },

  mounted() {
    this.initializeItemVisibility();
  },
};
</script>

<style scoped>
/* Overlay Manager Tree Styles */
.overlay-manager-tree {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.overlay-manager-tree .card-body {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.overlay-manager-tree .tree-container,
.overlay-manager-tree .overlay-search-results {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
}

/* Tree Nodes */
.tree-node {
  padding: 0.25rem 0;
}

.tree-node .node-content {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem;
  border-radius: 4px;
  transition: background-color 0.15s;
}

.tree-node .node-content:hover {
  background-color: rgba(0, 0, 0, 0.05);
}

/* Category Header */
.category-header {
  font-weight: 600;
  margin-bottom: 0.25rem;
}

.category-title,
.subcategory-title,
.item-callsign {
  cursor: pointer;
  user-select: none;
  margin: 0;
  flex: 1;
}

/* Expand Icon */
.expand-icon {
  cursor: pointer;
  transition: transform 0.2s;
  font-size: 0.875rem;
  width: 16px;
  text-align: center;
  flex-shrink: 0;
}

/* Tree Children */
.tree-children {
  margin-left: 1.5rem;
  padding-left: 0.5rem;
  border-left: 2px solid #e9ecef;
}

/* Subcategory */
.subcategory-header .node-content {
  font-size: 0.9rem;
}

/* Tree Items */
.tree-item .node-content {
  font-size: 0.85rem;
  padding: 0.15rem 0.25rem;
}

.tree-item.active-item .node-content {
  background-color: rgba(13, 110, 253, 0.1);
  border-left: 3px solid #0d6efd;
  padding-left: calc(0.25rem - 3px);
}

/* Search Results */
.overlay-search-results {
  padding: 0.5rem;
}

.overlay-search-result-item {
  padding: 0.5rem;
  margin-bottom: 0.25rem;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.15s;
  border: 1px solid transparent;
}

.overlay-search-result-item:hover {
  background-color: rgba(0, 0, 0, 0.05);
}

.overlay-search-result-item.active-item {
  background-color: rgba(13, 110, 253, 0.1);
  border-color: #0d6efd;
}

/* Badges */
.badge {
  font-size: 0.75rem;
  flex-shrink: 0;
}

/* Checkbox indeterminate state */
input[type="checkbox"]:indeterminate {
  background-color: #0d6efd;
  border-color: #0d6efd;
}

input[type="checkbox"]:indeterminate::before {
  content: "";
  display: block;
  width: 0.65em;
  height: 0.125em;
  background-color: white;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}
</style>
