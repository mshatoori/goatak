# ItemDetails Components Refactoring Plan

## Current State Analysis

### Components Structure
The `ItemDetails.vue` component acts as a router that dynamically renders child components based on item type:
- `UnitDetails.vue` - For units (category !== point/report/drawing/contact)
- `PointDetails.vue` - For points (category === "point")
- `CasevacDetails.vue` - For CASEVAC reports (type === "b-r-f-h-c")
- `DrawingDetails.vue` - For drawings/routes (category === "drawing" || "route")

### Identified Issues

#### 1. **Inconsistent Common Features**
| Feature | UnitDetails | PointDetails | CasevacDetails | DrawingDetails |
|---------|-------------|--------------|----------------|----------------|
| UID Display | ✅ | ✅ | ❌ Missing | ✅ |
| Start Time | ✅ | ✅ | ❌ Missing | ✅ |
| Send Time | ✅ | ❌ Missing | ❌ Missing | ❌ Missing |
| Stale Time | ✅ | ❌ Missing | ❌ Missing | ❌ Missing |
| Parent Callsign | ✅ | ✅ | ❌ Missing | ✅ |
| Location Component | ✅ | ✅ | ❌ Simple text | ❌ Not shown |
| Navigation Info | ✅ | ✅ | ✅ | ✅ |
| Send Mode (full) | ✅ | ❌ Checkbox only | ❌ Missing | ❌ Checkbox only |
| Coordinate Lock | ✅ | ✅ | ❌ Commented out | ✅ |

#### 2. **Code Duplication**
All components share similar patterns:
- Header structure with title, lock icons, edit/delete buttons
- View/Edit mode toggle
- `startEditing()`, `cancelEditing()`, `saveEditing()`, `deleteItem()` methods
- `mapToUnit()` functionality
- Props: `["item", "coords", "locked_unit_uid", "config"]`
- Data: `editing`, `editingData`, `sharedState`

#### 3. **Missing Features in Some Components**
- CasevacDetails lacks coordinate lock functionality
- PointDetails and DrawingDetails lack full send mode selection (subnet, direct)
- CasevacDetails missing all timestamps

---

## Proposed Solution: Component Hierarchy + Composables

### Architecture Overview

```
ItemDetails.vue (router - no change)
    │
    ├── BaseItemDetails.vue (new - shared layout & common features)
    │       │
    │       ├── UnitDetails.vue (refactored - type-specific content only)
    │       ├── PointDetails.vue (refactored - type-specific content only)
    │       ├── CasevacDetails.vue (refactored - type-specific content only)
    │       └── DrawingDetails.vue (refactored - type-specific content only)
    │
    └── composables/useItemEditing.js (new - shared editing logic)
```

---

## Phase 1: Create Shared Composable

### File: `front/src/composables/useItemEditing.js`

**Purpose:** Extract common editing logic into a reusable composable.

**Responsibilities:**
- Manage `editing` state
- Create/clear `editingData`
- Handle `isNew` item auto-editing
- Common save/cancel/delete operations
- Send mode configuration

**Key Features:**
```javascript
// Shared state management for editing
const editing = ref(false)
const editingData = ref(null)

// Initialize editing with common fields + type-specific extras
function startEditing(item, typeSpecificFields = {})

// Cancel editing with isNew cleanup
function cancelEditing(item, emit)

// Common save logic
function saveEditing(item, emit)

// Delete item
function deleteItem(item, emit)
```

---

## Phase 2: Create BaseItemDetails Component

### File: `front/src/components/BaseItemDetails.vue`

**Purpose:** Provide shared layout and common UI elements for all item types.

**Template Structure:**
```vue
<template>
  <div class="card">
    <!-- Header - Shared -->
    <div class="card-header">
      <span class="pull-left fw-bold" @click.stop="mapToUnit(item)">
        <slot name="icon">{{ item.callsign }}</slot>
        <!-- Coordinate Lock Icons -->
        <img v-if="locked_unit_uid != item.uid" ... />
        <img v-else ... />
      </span>
      <!-- Edit/Delete buttons -->
      <span class="pull-right" v-if="!editing">
        <button @click="startEditing">...</button>
        <button @click="deleteItem">...</button>
      </span>
    </div>

    <!-- View Mode - Common Fields -->
    <div class="card-body" v-if="!editing">
      <!-- UID (always shown) -->
      <div class="form-group row">
        <label class="col-sm-4"><strong>UID</strong></label>
        <div class="col-sm-8">{{ item.uid }}</div>
      </div>

      <!-- Type -->
      <div class="form-group row">
        <label class="col-sm-4"><strong>نوع</strong></label>
        <div class="col-sm-8">{{ typeDisplay }}</div>
      </div>

      <!-- Coordinates - Location component -->
      <div class="form-group row">
        <label class="col-sm-4"><strong>مختصات</strong></label>
        <div class="col-sm-8">
          <Location :lat="item.lat" :lon="item.lon" :otherCoords="coords" @focus="focusOnItem" />
        </div>
      </div>

      <!-- Parent/Creator Info -->
      <div class="form-group row" v-if="item.parent_uid">
        <label class="col-sm-4"><strong>سازنده</strong></label>
        <div class="col-sm-8">
          {{ item.parent_uid }}<span v-if="item.parent_callsign">({{ item.parent_callsign }})</span>
        </div>
      </div>

      <!-- Times -->
      <div class="form-group row">
        <label class="col-sm-4"><strong>زمان ایجاد</strong></label>
        <div class="col-sm-8">{{ dt(item.start_time) }}</div>
      </div>
      <div class="form-group row">
        <label class="col-sm-4"><strong>زمان ارسال</strong></label>
        <div class="col-sm-8">{{ dt(item.send_time) }}</div>
      </div>
      <div class="form-group row">
        <label class="col-sm-4"><strong>زمان انقضا</strong></label>
        <div class="col-sm-8">{{ dt(item.stale_time) }}</div>
      </div>

      <!-- Type-Specific Content Slot -->
      <slot name="view-content"></slot>

      <!-- Navigation Info -->
      <navigation-info :target-item="item" :user-position="config" @navigation-line-toggle="$emit('navigation-line-toggle', $event)" />
    </div>

    <!-- Edit Mode -->
    <div class="card-body" v-if="editing">
      <form>
        <!-- Common Edit Fields -->
        <div class="form-group row">
          <label class="col-sm-4">شناسه</label>
          <div class="col-sm-8">
            <input v-model="editingData.callsign" />
          </div>
        </div>

        <!-- Send Mode Selection (full implementation) -->
        <send-mode-selector v-model="editingData" :destinations="availableDestinations" />

        <!-- Type-Specific Edit Fields Slot -->
        <slot name="edit-content"></slot>

        <!-- Action Buttons -->
        <div class="d-flex justify-content-end">
          <button @click="cancelEditing">لغو</button>
          <button @click="saveEditing">ذخیره</button>
        </div>
      </form>
    </div>
  </div>
</template>
```

**Props:**
- `item` - The item object
- `coords` - Other coordinates for distance calculation
- `locked_unit_uid` - Currently locked unit UID
- `config` - User config with position
- `typeDisplay` - Human-readable type name

**Slots:**
- `icon` - Custom icon/image for header
- `view-content` - Type-specific view mode content
- `edit-content` - Type-specific edit mode content

---

## Phase 3: Create SendModeSelector Component

### File: `front/src/components/SendModeSelector.vue`

**Purpose:** Extract the send mode selection UI into a reusable component.

**Features:**
- Radio buttons for: none, broadcast, subnet, direct
- Subnet dropdown (when subnet selected)
- URN/IP selection (when direct selected)
- Fetches destinations from API

**Props:**
- `modelValue` - The editingData object

**Events:**
- `update:modelValue` - v-model support

---

## Phase 4: Refactor Child Components

Each child component will be simplified to only handle type-specific content.

### UnitDetails.vue (Refactored)
```vue
<template>
  <base-item-details v-bind="$props" type-display="humanReadableType(item.type)">
    <template #icon>
      <img :src="milImg(renderedItem)" />
      {{ getUnitName(renderedItem) }}
      <span v-if="item.status">({{ item.status }})</span>
    </template>

    <template #view-content>
      <!-- Unit-specific fields: team, role, speed, altitude, sensor_data -->
    </template>

    <template #edit-content>
      <!-- Unit-specific edit fields: aff, subtype (hierarchy), stale_duration -->
    </template>
  </base-item-details>
</template>
```

### PointDetails.vue (Refactored)
```vue
<template>
  <base-item-details v-bind="$props" type-display="typeName(item.type)">
    <template #icon>
      <img :src="getIconUri(editingData).uri" />
    </template>

    <template #view-content>
      <!-- Point-specific: color -->
    </template>

    <template #edit-content>
      <!-- Point-specific edit: type dropdown, color, remarks, web_sensor -->
    </template>
  </base-item-details>
</template>
```

### CasevacDetails.vue (Refactored)
```vue
<template>
  <base-item-details v-bind="$props" type-display="درخواست پزشکی">
    <template #icon>
      <img src="/static/icons/casevac.svg" height="24" />
    </template>

    <template #view-content>
      <!-- Casevac-specific: patient info, equipment, frequency -->
    </template>

    <template #edit-content>
      <!-- Casevac edit form -->
    </template>
  </base-item-details>
</template>
```

### DrawingDetails.vue (Refactored)
```vue
<template>
  <base-item-details v-bind="$props" type-display="humanReadableType(item.type)">
    <template #icon>
      <i :class="isRoute ? 'bi bi-bezier2' : 'bi bi-pentagon'"></i>
    </template>

    <template #view-content>
      <!-- Drawing-specific: color, geofence -->
    </template>

    <template #edit-content>
      <!-- Drawing edit: color, geofence, geofence_aff -->
    </template>
  </base-item-details>
</template>
```

---

## Phase 5: Implementation Steps

### Step 1: Create Directory Structure
```
front/src/
├── composables/
│   └── useItemEditing.js     (NEW)
├── components/
│   ├── ItemDetails.vue       (existing - minor updates)
│   ├── BaseItemDetails.vue   (NEW)
│   ├── SendModeSelector.vue  (NEW)
│   ├── UnitDetails.vue       (refactored)
│   ├── PointDetails.vue      (refactored)
│   ├── CasevacDetails.vue    (refactored)
│   └── DrawingDetails.vue    (refactored)
```

### Step 2: Implement useItemEditing Composable
- Extract common editing logic
- Handle send mode state
- Provide initialization helpers

### Step 3: Implement SendModeSelector Component
- Full send mode selection UI
- API integration for destinations
- Conditional subnet/URN fields

### Step 4: Implement BaseItemDetails Component
- Shared template structure
- Common view fields (UID, times, parent, coordinates)
- Common edit fields (callsign, send mode)
- Slot system for type-specific content

### Step 5: Refactor Each Child Component
- Remove duplicated code
- Use BaseItemDetails with slots
- Keep only type-specific logic

### Step 6: Testing & Validation
- Verify all features work as before
- Ensure new features (send mode, times) are added to components that lacked them
- Test coordinate lock functionality in CasevacDetails

---

## Benefits of This Refactoring

1. **DRY Principle**: Eliminates ~60-70% of duplicated code
2. **Consistency**: All components now share the same UID, times, navigation, and send mode UI
3. **Maintainability**: Changes to common features only need to be made in one place
4. **Extensibility**: New item types can be added easily by extending BaseItemDetails
5. **Bug Reduction**: Less code duplication means fewer chances for inconsistencies

---

## Migration Checklist

- [ ] Create `front/src/composables/useItemEditing.js`
- [ ] Create `front/src/components/SendModeSelector.vue`
- [ ] Create `front/src/components/BaseItemDetails.vue`
- [ ] Refactor `UnitDetails.vue` to use BaseItemDetails
- [ ] Refactor `PointDetails.vue` to use BaseItemDetails
- [ ] Refactor `CasevacDetails.vue` to use BaseItemDetails (add missing features)
- [ ] Refactor `DrawingDetails.vue` to use BaseItemDetails
- [ ] Update `main.js` to register new components
- [ ] Test all item types: view mode, edit mode, save, delete
- [ ] Verify send mode works across all components
- [ ] Verify coordinate lock works in CasevacDetails
- [ ] Verify all times display correctly

---

## File Changes Summary

| File | Action | Lines Changed |
|------|--------|---------------|
| `composables/useItemEditing.js` | Create | ~150 new |
| `components/SendModeSelector.vue` | Create | ~200 new |
| `components/BaseItemDetails.vue` | Create | ~300 new |
| `components/UnitDetails.vue` | Refactor | ~705 → ~200 |
| `components/PointDetails.vue` | Refactor | ~457 → ~150 |
| `components/CasevacDetails.vue` | Refactor | ~732 → ~250 |
| `components/DrawingDetails.vue` | Refactor | ~347 → ~150 |
| `main.js` | Update imports | ~10 modified |

**Net Result**: ~2,200 lines → ~1,100 lines (50% reduction)
