Vue.component("OverlaysList", {
  data: function () {
    return {
      sharedState: store.state,

      // Track expanded state for categories
      expandedCategories: {
        contact: false,
        unit: true,
        alarm: true,
        point: false,
        drawing: false,
        route: false,
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

      // Individual item visibility (uid -> boolean)
      itemVisibility: {},
    };
  },

  computed: {
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
              title: "دوست",
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
      ];
    },
  },

  watch: {
    // Watch category visibility and propagate to toggleOverlay
    categoryVisibility: {
      handler(newValue) {
        for (const [categoryName, active] of Object.entries(newValue)) {
          this.toggleOverlay(categoryName, active);
        }
      },
      deep: true,
    },
  },

  methods: {
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
      this.expandedCategories[categoryName] =
        !this.expandedCategories[categoryName];
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
          sub.items.forEach((item) => {
            this.$set(this.itemVisibility, item.uid, newState);
          });
        });
      } else {
        // Cascade to all items directly
        category.items.forEach((item) => {
          this.itemVisibility[item.uid] = newState;
        });
      }
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
      subcat.items.forEach((item) => {
        this.$set(this.itemVisibility, item.uid, newState);
      });

      // Update parent category state
      this.updateParentCategoryState(categoryName);
    },

    // Toggle individual item visibility
    toggleItemVisibility(uid, categoryName, subcategoryKey) {
      const newState = !this.itemVisibility[uid];
      this.$set(this.itemVisibility, uid, newState);

      // Update parent states
      if (subcategoryKey) {
        this.updateSubcategoryState(subcategoryKey, categoryName);
      }
      this.updateParentCategoryState(categoryName);
    },

    // Update subcategory state based on its items
    updateSubcategoryState(key, categoryName) {
      const category = this.treeStructure.find((c) => c.name === categoryName);
      if (!category || !category.subcategories) return;
      const subcat = category.subcategories.find((s) => s.key === key);
      if (!subcat) return;

      if (subcat.items.length === 0) {
        this.subcategoryVisibility[key] = true;
        return;
      }

      const allChecked = subcat.items.every(
        (item) => this.itemVisibility[item.uid] !== false
      );

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
        if (category.items.length === 0) {
          this.categoryVisibility[categoryName] = true;
          return;
        }
        const allItemsChecked = category.items.every(
          (item) => this.itemVisibility[item.uid] !== false
        );
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
        const anyItemChecked = category.items.some(
          (item) => this.itemVisibility[item.uid] !== false
        );
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
      const anyItemChecked = subcat.items.some(
        (item) => this.itemVisibility[item.uid] !== false
      );
      return anyItemChecked ? "indeterminate" : "unchecked";
    },

    // Handle item selection (emit to parent)
    selectItem(item) {
      this.$emit("select-item", item);
    },

    // Initialize item visibility from current state
    initializeItemVisibility() {
      this.sharedState.items.forEach((item) => {
        if (this.itemVisibility[item.uid] === undefined) {
          this.$set(this.itemVisibility, item.uid, true);
        }
      });
    },
  },

  mounted() {
    this.initializeItemVisibility();
  },

  props: {
    toggleOverlay: {
      type: Function,
      required: true,
    },
    activeItemUid: {
      type: String,
      default: null,
    },
    map: {
      type: Object,
      required: true,
    },
  },

  template: `
    <div class="card overlay-manager-tree">
      <h5 class="card-header">لایه‌ها</h5>
      <div class="card-body p-2">
        <div class="tree-container">
          <!-- Render each category -->
          <div v-for="category in treeStructure" :key="category.name" class="tree-category mb-2">
            
            <!-- Category Header -->
            <div class="tree-node category-header" @click.stop="">
              <div class="node-content">
                <!-- Expand/Collapse Icon -->
                <i 
                  v-if="category.hasSubcategories || category.items.length > 0"
                  class="expand-icon bi me-1"
                  :class="expandedCategories[category.name] ? 'bi-chevron-down' : 'bi-chevron-left'"
                  @click="toggleCategoryExpand(category.name)"
                  style="cursor: pointer; width: 16px;"
                ></i>
                <span v-else style="width: 16px; display: inline-block;"></span>
                
                <!-- Category Checkbox -->
                <input
                  type="checkbox"
                  class="form-check-input me-2"
                  :checked="categoryVisibility[category.name]"
                  :indeterminate.prop="getCategoryCheckboxState(category.name) === 'indeterminate'"
                  @change="toggleCategoryVisibility(category.name)"
                  @click.stop=""
                />
                
                <!-- Category Title -->
                <label 
                  class="category-title mb-0" 
                  style="cursor: pointer; flex: 1;"
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
                        v-if="subcategory.items.length > 0"
                        class="expand-icon bi me-1"
                        :class="expandedSubcategories[subcategory.key] ? 'bi-chevron-down' : 'bi-chevron-left'"
                        @click="toggleSubcategoryExpand(subcategory.key)"
                        style="cursor: pointer; width: 16px; font-size: 0.9rem;"
                      ></i>
                      <span v-else style="width: 16px; display: inline-block;"></span>
                      
                      <!-- Subcategory Checkbox -->
                      <input
                        type="checkbox"
                        class="form-check-input me-2"
                        :checked="subcategoryVisibility[subcategory.key]"
                        :indeterminate.prop="getSubcategoryCheckboxState(subcategory.key, category.name) === 'indeterminate'"
                        @change="toggleSubcategoryVisibility(subcategory.key, category.name, subcategory.subcategory)"
                        @click.stop=""
                      />
                      
                      <!-- Subcategory Title -->
                      <label 
                        class="subcategory-title mb-0" 
                        style="cursor: pointer; flex: 1; font-size: 0.95rem;"
                        @click="toggleSubcategoryExpand(subcategory.key)"
                      >
                        {{ subcategory.title }}
                      </label>
                      
                      <!-- Subcategory Count Badge -->
                      <span class="badge bg-secondary rounded-pill ms-auto" style="font-size: 0.75rem;">
                        {{ subcategory.count }}
                      </span>
                    </div>
                  </div>
                  
                  <!-- Subcategory Items -->
                  <div v-show="expandedSubcategories[subcategory.key]" class="tree-children">
                    <div 
                      v-for="item in subcategory.items" 
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
                          :checked="itemVisibility[item.uid] !== false"
                          @change="toggleItemVisibility(item.uid, category.name, subcategory.key)"
                          @click.stop=""
                        />
                        
                        <!-- Item Callsign -->
                        <span class="item-callsign">{{ item.callsign || 'بدون نام' }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <!-- Direct Items (for categories without subcategories) -->
              <div v-else>
                <div 
                  v-for="item in category.items" 
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
                      :checked="itemVisibility[item.uid] !== false"
                      @change="toggleItemVisibility(item.uid, category.name)"
                      @click.stop=""
                    />
                    
                    <!-- Item Callsign -->
                    <span class="item-callsign">{{ item.callsign || 'بدون نام' }}</span>
                  </div>
                </div>
              </div>
            </div>
            
          </div>
        </div>
      </div>
    </div>
  `,
});
