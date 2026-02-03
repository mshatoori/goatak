# Front-End Refactoring Tasks

This document breaks down the refactoring plan into small, manageable, independently useful tasks. Each task is designed to deliver value on its own and can be completed in isolation (though some may have dependencies on others).

---

## Phase 0: Foundation Setup

### Task 0.1: Install and Configure Pinia

**Description**: Add Pinia to the project and configure it in the Vue application.

**Files to Modify**:

- `front/package.json` - Add pinia dependency
- `front/src/main.js` - Initialize Pinia plugin
- `front/src/stores/index.js` - Create store barrel export

**Acceptance Criteria**:

- [ ] Pinia is installed and listed in package.json
- [ ] Pinia plugin is added to the Vue app in main.js
- [ ] A simple test store can be created and accessed from components
- [ ] Vue DevTools shows Pinia panel

**Estimated Effort**: 30 minutes

---

### Task 0.2: Add TypeScript Configuration

**Description**: Set up TypeScript configuration files for the project.

**Files to Create**:

- `front/tsconfig.json` - Main TypeScript configuration
- `front/tsconfig.node.json` - Node-specific configuration
- `front/src/types/index.ts` - Type definitions entry point

**Files to Modify**:

- `front/vite.config.js` - Add TypeScript support if needed
- `front/package.json` - Add TypeScript dependencies

**Acceptance Criteria**:

- [ ] TypeScript config files are created with appropriate settings
- [ ] `npm run type-check` command works (add to package.json scripts)
- [ ] VSCode recognizes TypeScript files and provides IntelliSense
- [ ] Build process completes without TypeScript errors

**Estimated Effort**: 1 hour

---

### Task 0.3: Create Constants Module

**Description**: Extract hardcoded values from components into a centralized constants module.

**Files to Create**:

- `front/src/constants/index.js` - Barrel export
- `front/src/constants/categories.js` - Item category constants
- `front/src/constants/colors.js` - Color constants
- `front/src/constants/sendModes.js` - Send mode constants
- `front/src/constants/map.js` - Map configuration defaults
- `front/src/constants/timeouts.js` - Timeout/interval constants

**Acceptance Criteria**:

- [ ] All constants are defined in appropriate files
- [ ] Constants are exported from index.js
- [ ] All existing hardcoded values are replaced with constants
- [ ] JSDoc comments explain each constant group

**Estimated Effort**: 1 hour

---

### Task 0.4: Organize Utility Functions

**Description**: Reorganize scattered utility functions into logical modules.

**Files to Create**:

- `front/src/utils/index.js` - Barrel export
- `front/src/utils/coordinates.js` - Coordinate formatting/conversions
- `front/src/utils/dateTime.js` - Date/time utilities (dt function)
- `front/src/utils/icons.js` - Icon generation (getIconUri, getMilIcon)
- `front/src/utils/items.js` - Item helpers (cleanUnit, createMapItem)
- `front/src/utils/math.js` - Math helpers (distBea, calculateDistance)

**Files to Modify**:

- `front/src/utils.js` - Gradually migrate functions to new structure

**Acceptance Criteria**:

- [ ] New utility modules are created with functions grouped logically
- [ ] Functions are exported from index.js
- [ ] All functions have JSDoc documentation
- [ ] All imports updated to use new utils structure
- [ ] Old utils.js is removed after migration

**Estimated Effort**: 2 hours

---

## Phase 1: State Management (Pinia Stores)

### Task 1.1: Create itemsStore (Pinia)

**Description**: Create a Pinia store to manage items/units/contacts/points state.

**Dependencies**: Task 0.1 (Pinia installed)

**Files to Create**:

- `front/src/stores/itemsStore.js` - Items store with state, getters, actions

**Acceptance Criteria**:

- [ ] Store has state: items (object), activeItemUid (string/null)
- [ ] Store has getters: itemsList, activeItem, itemsByCategory
- [ ] Store has actions: addItem, updateItem, removeItem, setActiveItem, clearItems
- [ ] Store actions handle edge cases (duplicate UIDs, missing items)
- [ ] Unit tests verify store behavior
- [ ] Component using old store can optionally use this new store

**Estimated Effort**: 2 hours

---

### Task 1.2: Create mapStore (Pinia)

**Description**: Create a Pinia store to manage map state (center, zoom, selected layers).

**Dependencies**: Task 0.1 (Pinia installed)

**Files to Create**:

- `front/src/stores/mapStore.js` - Map store with state, getters, actions

**Acceptance Criteria**:

- [ ] Store has state: center (array), zoom (number), selectedItemUid (string/null), mapInstance (ref)
- [ ] Store has getters: currentCenter, currentZoom, hasSelectedItem
- [ ] Store has actions: setCenter, setZoom, flyToLocation, selectItem, clearSelection
- [ ] Actions validate input (bounds checking for zoom, coordinate validation)
- [ ] Unit tests verify store behavior

**Estimated Effort**: 1.5 hours

---

### Task 1.3: Create configStore (Pinia)

**Description**: Create a Pinia store to manage user configuration and connection state.

**Dependencies**: Task 0.1 (Pinia installed)

**Files to Create**:

- `front/src/stores/configStore.js` - Config store with state, getters, actions

**Acceptance Criteria**:

- [ ] Store has state: userConfig (object), connectionStatus (string), isConnected (boolean)
- [ ] Store has getters: currentUser, connectionInfo
- [ ] Store has actions: loadConfig, updateConfig, setConnectionStatus
- [ ] Config persistence to localStorage is implemented
- [ ] Unit tests verify store behavior

**Estimated Effort**: 1.5 hours

---

### Task 1.4: Create uiStore (Pinia)

**Description**: Create a Pinia store to manage UI state (modals, sidebar visibility, etc.).

**Dependencies**: Task 0.1 (Pinia installed)

**Files to Create**:

- `front/src/stores/uiStore.js` - UI store with state, getters, actions

**Acceptance Criteria**:

- [ ] Store has state: sidebarOpen (boolean), activeModal (string/null), modalData (object), notifications (array)
- [ ] Store has getters: isModalOpen, activeModalType
- [ ] Store has actions: openSidebar, closeSidebar, openModal, closeModal, addNotification, removeNotification
- [ ] Actions handle modal stacking/z-index appropriately
- [ ] Unit tests verify store behavior

**Estimated Effort**: 1.5 hours

---

### Task 1.5: Create websocketStore (Pinia)

**Description**: Create a Pinia store to manage WebSocket connection state.

**Dependencies**: Task 0.1 (Pinia installed)

**Files to Create**:

- `front/src/stores/websocketStore.js` - WebSocket store

**Acceptance Criteria**:

- [ ] Store has state: isConnected (boolean), lastMessage (object), connectionError (string/null), reconnectAttempts (number)
- [ ] Store has getters: connectionStatus, messageHistory
- [ ] Store has actions: connect, disconnect, onMessage, onError, resetReconnectCount
- [ ] Store handles connection lifecycle (connecting, connected, disconnected, error)
- [ ] Unit tests verify store behavior

**Estimated Effort**: 1.5 hours

---

### Task 1.6: Migrate Components to Pinia Stores

**Description**: Update components to use new Pinia stores instead of the old reactive store.

**Dependencies**: Tasks 1.1 - 1.5 (All stores created)

**Files to Modify**:

- `front/src/views/Main.vue` - Update store imports
- `front/src/components/Sidebar.vue` - Update store usage
- `front/src/App.vue` - Update store usage

**Acceptance Criteria**:

- [ ] Components import stores from new locations
- [ ] Components use storeToRefs for reactive state access
- [ ] Components use store actions instead of direct mutations
- [ ] No remaining references to old store.js imports
- [ ] Application functionality is preserved
- [ ] Old store.js is deleted after migration is verified

**Estimated Effort**: 3 hours

---

## Phase 2: Composables

### Task 2.1: Create useMap Composable

**Description**: Extract map-related logic into a reusable composable.

**Dependencies**: Task 1.2 (mapStore created)

**Files to Create**:

- `front/src/composables/useMap.js` - Map composable

**Acceptance Criteria**:

- [ ] Composable returns: map (computed), center (computed), zoom (computed), flyTo (function), fitBounds (function), setCenter (function), setZoom (function)
- [ ] Functions properly delegate to mapStore
- [ ] Composable handles map instance lifecycle
- [ ] JSDoc documentation for all exports
- [ ] Unit tests verify composable behavior

**Estimated Effort**: 2 hours

---

### Task 2.2: Create useItems Composable

**Description**: Extract item management logic into a reusable composable.

**Dependencies**: Task 1.1 (itemsStore created)

**Files to Create**:

- `front/src/composables/useItems.js` - Items composable

**Acceptance Criteria**:

- [ ] Composable returns: items (computed), activeItem (computed), createItem (function), updateItem (function), deleteItem (function), setActiveItem (function), getItemByUid (function)
- [ ] Functions properly delegate to itemsStore
- [ ] Composable handles item validation
- [ ] JSDoc documentation for all exports
- [ ] Unit tests verify composable behavior

**Estimated Effort**: 2 hours

---

### Task 2.3: Create useWebSocket Composable

**Description**: Extract WebSocket management logic into a reusable composable.

**Dependencies**: Task 1.5 (websocketStore created)

**Files to Create**:

- `front/src/composables/useWebSocket.js` - WebSocket composable

**Acceptance Criteria**:

- [ ] Composable returns: isConnected (computed), messages (computed), connect (function), disconnect (function), send (function), reconnect (function)
- [ ] Functions properly delegate to websocketStore
- [ ] Composable handles connection lifecycle automatically
- [ ] Automatic reconnection with exponential backoff
- [ ] JSDoc documentation for all exports
- [ ] Unit tests verify composable behavior

**Estimated Effort**: 2.5 hours

---

### Task 2.4: Create useDrawing Composable

**Description**: Extract map drawing functionality into a reusable composable.

**Dependencies**: Task 2.1 (useMap composable)

**Files to Create**:

- `front/src/composables/useDrawing.js` - Drawing composable

**Acceptance Criteria**:

- [ ] Composable returns: isDrawing (ref), drawMode (ref), startPolygon (function), startRoute (function), cancelDrawing (function), finishDrawing (function), drawingData (computed)
- [ ] Functions integrate with map instance from useMap
- [ ] Supports polygon, line, and point drawing modes
- [ ] Proper cleanup when drawing is cancelled
- [ ] JSDoc documentation for all exports
- [ ] Unit tests verify composable behavior

**Estimated Effort**: 3 hours

---

### Task 2.5: Create useNavigation Composable

**Description**: Extract navigation line functionality into a reusable composable.

**Dependencies**: Task 2.1 (useMap composable), Task 2.2 (useItems composable)

**Files to Create**:

- `front/src/composables/useNavigation.js` - Navigation composable

**Acceptance Criteria**:

- [ ] Composable returns: isActive (ref), target (ref), navigationLine (computed), distance (computed), bearing (computed), showNavigation (function), hideNavigation (function), updateOrigin (function)
- [ ] Navigation line calculates distance and bearing correctly
- [ ] Functions integrate with map instance
- [ ] JSDoc documentation for all exports
- [ ] Unit tests verify composable behavior

**Estimated Effort**: 2 hours

---

## Phase 3: API Layer

### Task 3.1: Create API Client

**Description**: Set up centralized Axios instance with interceptors.

**Files to Create**:

- `front/src/api/client.js` - Axios instance configuration

**Acceptance Criteria**:

- [ ] Client has base URL configured from environment/config
- [ ] Request interceptor adds auth headers if needed
- [ ] Response interceptor handles common errors (401, 403, 500)
- [ ] Error handling provides meaningful error messages
- [ ] JSDoc documentation for client configuration

**Estimated Effort**: 1 hour

---

### Task 3.2: Create itemsApi Module

**Description**: Create API module for items/units CRUD operations.

**Dependencies**: Task 3.1 (API client)

**Files to Create**:

- `front/src/api/itemsApi.js` - Items API functions

**Acceptance Criteria**:

- [ ] Exports: getAll(), getByUid(uid), create(item), update(uid, item), delete(uid)
- [ ] All functions use the centralized API client
- [ ] Functions return consistent response format { data, error }
- [ ] Proper error handling with try/catch
- [ ] JSDoc documentation for all functions
- [ ] Unit tests mock client and verify behavior

**Estimated Effort**: 1.5 hours

---

### Task 3.3: Create configApi Module

**Description**: Create API module for configuration endpoints.

**Dependencies**: Task 3.1 (API client)

**Files to Create**:

- `front/src/api/configApi.js` - Config API functions

**Acceptance Criteria**:

- [ ] Exports: getConfig(), updateConfig(config), resetConfig()
- [ ] All functions use the centralized API client
- [ ] Functions return consistent response format { data, error }
- [ ] Proper error handling with try/catch
- [ ] JSDoc documentation for all functions
- [ ] Unit tests mock client and verify behavior

**Estimated Effort**: 1 hour

---

### Task 3.4: Create messagesApi Module

**Description**: Create API module for chat/messages endpoints.

**Dependencies**: Task 3.1 (API client)

**Files to Create**:

- `front/src/api/messagesApi.js` - Messages API functions

**Acceptance Criteria**:

- [ ] Exports: getMessages(), sendMessage(message), getConversations()
- [ ] All functions use the centralized API client
- [ ] Functions return consistent response format { data, error }
- [ ] Proper error handling with try/catch
- [ ] JSDoc documentation for all functions
- [ ] Unit tests mock client and verify behavior

**Estimated Effort**: 1 hour

---

### Task 3.5: Update Stores to Use API Layer

**Description**: Refactor Pinia stores to use the new API layer instead of direct fetch/axios calls.

**Dependencies**: Tasks 3.2 - 3.4 (API modules created)

**Files to Modify**:

- `front/src/stores/itemsStore.js` - Use itemsApi
- `front/src/stores/configStore.js` - Use configApi
- `front/src/stores/websocketStore.js` - Update if needed

**Acceptance Criteria**:

- [ ] Stores import from API modules
- [ ] No direct fetch/axios calls remain in stores
- [ ] Loading states are properly managed
- [ ] Error states are captured from API responses
- [ ] Application functionality is preserved

**Estimated Effort**: 2 hours

---

## Phase 4: Component Refactoring

### Task 4.1: Extract MapContainer from Main.vue

**Description**: Extract map container logic from Main.vue into MapContainer.vue and integrate it into Main.vue.

**Dependencies**: Task 2.1 (useMap composable)

**Files to Create**:

- `front/src/components/map/MapContainer.vue` - Map container component

**Files to Modify**:

- `front/src/views/Main.vue` - Replace inline map container with MapContainer component

**Acceptance Criteria**:

- [ ] MapContainer.vue created with props: center, zoom, activeItemUid
- [ ] MapContainer.vue emits: map-click, marker-click, marker-contextmenu, map-move
- [ ] MapContainer.vue uses useMap composable
- [ ] Main.vue imports and uses MapContainer component
- [ ] Map initialization code removed from Main.vue (now in MapContainer)
- [ ] Map event handling delegated through component emits
- [ ] Map cleanup happens on component unmount
- [ ] Map functionality works identically to before
- [ ] Main.vue line count reduced by map-related code
- [ ] Component uses <script setup> syntax

**Estimated Effort**: 3 hours

---

### Task 4.2: Extract MapToolbar from Main.vue

**Description**: Extract map toolbar from Main.vue into MapToolbar.vue and integrate it into Main.vue.

**Dependencies**: Task 2.4 (useDrawing composable), Task 4.1 (MapContainer extracted)

**Files to Create**:

- `front/src/components/map/MapToolbar.vue` - Map toolbar component

**Files to Modify**:

- `front/src/views/Main.vue` - Replace inline toolbar with MapToolbar component

**Acceptance Criteria**:

- [ ] MapToolbar.vue created with buttons for drawing tools (polygon, route, point)
- [ ] MapToolbar.vue has buttons for adding items (unit, casevac)
- [ ] MapToolbar.vue accepts props: activeMode
- [ ] MapToolbar.vue emits: mode-change, tool-select
- [ ] MapToolbar.vue uses useDrawing composable
- [ ] Main.vue imports and uses MapToolbar component
- [ ] Toolbar code removed from Main.vue
- [ ] Toolbar functionality works identically to before
- [ ] Main.vue line count reduced by toolbar-related code
- [ ] Component uses <script setup> syntax

**Estimated Effort**: 2 hours

---

### Task 4.3: Extract MapMarkers from Main.vue

**Description**: Extract map markers rendering from Main.vue into MapMarkers.vue and integrate it into Main.vue.

**Dependencies**: Task 2.2 (useItems composable), Task 4.1 (MapContainer extracted)

**Files to Create**:

- `front/src/components/map/MapMarkers.vue` - Map markers component

**Files to Modify**:

- `front/src/components/map/MapContainer.vue` - Include MapMarkers as child
- `front/src/views/Main.vue` - Remove inline marker rendering code

**Acceptance Criteria**:

- [ ] MapMarkers.vue created with props: items, selectedUid
- [ ] MapMarkers.vue emits: marker-click, marker-contextmenu
- [ ] MapMarkers.vue uses useItems composable
- [ ] MapMarkers.vue renders all item markers efficiently
- [ ] MapContainer includes MapMarkers as child component
- [ ] Main.vue marker rendering code removed
- [ ] Markers display and interact identically to before
- [ ] Main.vue line count reduced by marker-related code
- [ ] Component uses <script setup> syntax

**Estimated Effort**: 3 hours

---

### Task 4.4: Extract AppNavbar from Main.vue

**Description**: Extract navbar from Main.vue into AppNavbar.vue and integrate it into Main.vue.

**Dependencies**: Task 1.3 (configStore created)

**Files to Create**:

- `front/src/components/AppNavbar.vue` - Navbar component

**Files to Modify**:

- `front/src/views/Main.vue` - Replace inline navbar with AppNavbar component

**Acceptance Criteria**:

- [ ] AppNavbar.vue created displaying app title/logo
- [ ] AppNavbar.vue shows menu items and dropdowns
- [ ] AppNavbar.vue displays connection status indicator
- [ ] AppNavbar.vue accepts props: connectionStatus
- [ ] AppNavbar.vue emits: menu-select, connection-toggle
- [ ] AppNavbar.vue uses configStore for user info
- [ ] Main.vue imports and uses AppNavbar component
- [ ] Navbar code removed from Main.vue
- [ ] Navbar functionality works identically to before
- [ ] Main.vue line count reduced by navbar-related code
- [ ] Component uses <script setup> syntax

**Estimated Effort**: 2 hours

---

### Task 4.5: Extract AppSidebar from Main.vue

**Description**: Extract sidebar from Main.vue into AppSidebar.vue and integrate it into Main.vue.

**Dependencies**: Task 1.1 (itemsStore created), Task 1.4 (uiStore created)

**Files to Create**:

- `front/src/components/AppSidebar.vue` - Sidebar component

**Files to Modify**:

- `front/src/views/Main.vue` - Replace inline sidebar with AppSidebar component

**Acceptance Criteria**:

- [ ] AppSidebar.vue created displaying item details when item is selected
- [ ] AppSidebar.vue can be opened/closed
- [ ] AppSidebar.vue accepts props: isOpen, activeItem
- [ ] AppSidebar.vue emits: close, item-update, item-delete
- [ ] AppSidebar.vue uses itemsStore and uiStore
- [ ] Main.vue imports and uses AppSidebar component
- [ ] Sidebar code removed from Main.vue
- [ ] Sidebar functionality works identically to before
- [ ] Main.vue line count reduced by sidebar-related code
- [ ] Component uses <script setup> syntax

**Estimated Effort**: 2 hours

---

### Task 4.6: Final Main.vue Cleanup and <script setup> Migration

**Description**: Final cleanup of Main.vue after all components are extracted - migrate to <script setup> and optimize.

**Dependencies**: Tasks 4.1 - 4.5 (All child components integrated)

**Files to Modify**:

- `front/src/views/Main.vue` - Final cleanup and <script setup> migration

**Acceptance Criteria**:

- [ ] Main.vue converted to <script setup> syntax
- [ ] All unused imports removed
- [ ] All unused methods/computed properties removed
- [ ] Main.vue is under 250 lines
- [ ] Main.vue handles only orchestration between child components
- [ ] No direct DOM manipulation remains
- [ ] All existing functionality preserved
- [ ] Code is clean and well-documented

**Estimated Effort**: 2 hours

---

### Task 4.7: Migrate Sidebar.vue to <script setup>

**Description**: Convert Sidebar.vue from Options API to Composition API with <script setup>.

**Dependencies**: Task 1.6 (Components migrated to Pinia)

**Files to Modify**:

- `front/src/components/Sidebar.vue` - Migrated component

**Acceptance Criteria**:

- [ ] Component uses <script setup> syntax
- [ ] Component uses defineProps and defineEmits
- [ ] Component uses new Pinia stores
- [ ] Component functionality is preserved
- [ ] Component has TypeScript types (if TypeScript migration is done)

**Estimated Effort**: 1.5 hours

---

### Task 4.8: Migrate Item Detail Components to <script setup>

**Description**: Convert item detail components (BaseItemDetails, UnitDetails, etc.) to <script setup>.

**Dependencies**: Task 1.6 (Components migrated to Pinia)

**Files to Modify**:

- `front/src/components/details/BaseItemDetails.vue`
- `front/src/components/details/UnitDetails.vue`
- Other detail components in details folder

**Acceptance Criteria**:

- [ ] All detail components use <script setup> syntax
- [ ] Components use defineProps and defineEmits
- [ ] Components use new Pinia stores
- [ ] Inheritance pattern is preserved or improved
- [ ] Component functionality is preserved

**Estimated Effort**: 3 hours

---

### Task 4.9: Migrate Modal Components to <script setup>

**Description**: Convert all modal components to <script setup> syntax.

**Dependencies**: Task 1.4 (uiStore created), Task 1.6 (Components migrated to Pinia)

**Files to Modify**:

- `front/src/components/modals/ChatModal.vue`
- `front/src/components/modals/SettingsModal.vue`
- Other modal components

**Acceptance Criteria**:

- [ ] All modal components use <script setup> syntax
- [ ] Components use defineProps and defineEmits
- [ ] Components use uiStore for modal state
- [ ] Modal open/close functionality is preserved

**Estimated Effort**: 2 hours

---

## Phase 5: TypeScript Migration

### Task 5.1: Define Core Type Interfaces

**Description**: Create TypeScript interfaces for core data types.

**Dependencies**: Task 0.2 (TypeScript configured)

**Files to Create**:

- `front/src/types/item.ts` - Item types
- `front/src/types/config.ts` - Config types
- `front/src/types/map.ts` - Map types
- `front/src/types/websocket.ts` - WebSocket message types

**Acceptance Criteria**:

- [ ] Item interface defines all item properties
- [ ] Config interface defines all config properties
- [ ] Map types define coordinates, bounds, layers
- [ ] WebSocket types define message formats
- [ ] Types are exported from `front/src/types/index.ts`
- [ ] All interfaces have JSDoc documentation

**Estimated Effort**: 2 hours

---

### Task 5.2: Migrate Stores to TypeScript

**Description**: Convert Pinia stores to TypeScript.

**Dependencies**: Task 5.1 (Core types defined)

**Files to Modify**:

- `front/src/stores/itemsStore.js` → `front/src/stores/itemsStore.ts`
- `front/src/stores/mapStore.js` → `front/src/stores/mapStore.ts`
- `front/src/stores/configStore.js` → `front/src/stores/configStore.ts`
- `front/src/stores/uiStore.js` → `front/src/stores/uiStore.ts`
- `front/src/stores/websocketStore.js` → `front/src/stores/websocketStore.ts`

**Acceptance Criteria**:

- [ ] All stores are TypeScript files
- [ ] State has explicit types
- [ ] Getters have return type annotations
- [ ] Actions have parameter and return type annotations
- [ ] Stores use defined types from types folder
- [ ] No TypeScript errors

**Estimated Effort**: 3 hours

---

### Task 5.3: Migrate Composables to TypeScript

**Description**: Convert composables to TypeScript.

**Dependencies**: Task 5.2 (Stores migrated)

**Files to Modify**:

- `front/src/composables/useMap.js` → `front/src/composables/useMap.ts`
- `front/src/composables/useItems.js` → `front/src/composables/useItems.ts`
- `front/src/composables/useWebSocket.js` → `front/src/composables/useWebSocket.ts`
- `front/src/composables/useDrawing.js` → `front/src/composables/useDrawing.ts`
- `front/src/composables/useNavigation.js` → `front/src/composables/useNavigation.ts`

**Acceptance Criteria**:

- [ ] All composables are TypeScript files
- [ ] Functions have explicit parameter and return types
- [ ] Composables use defined types from types folder
- [ ] Ref/computed types are explicit
- [ ] No TypeScript errors

**Estimated Effort**: 2 hours

---

### Task 5.4: Migrate API Layer to TypeScript

**Description**: Convert API modules to TypeScript.

**Dependencies**: Task 5.1 (Core types defined)

**Files to Modify**:

- `front/src/api/client.js` → `front/src/api/client.ts`
- `front/src/api/itemsApi.js` → `front/src/api/itemsApi.ts`
- `front/src/api/configApi.js` → `front/src/api/configApi.ts`
- `front/src/api/messagesApi.js` → `front/src/api/messagesApi.ts`

**Acceptance Criteria**:

- [ ] All API files are TypeScript files
- [ ] Client has proper Axios type configuration
- [ ] API functions have typed parameters and return types
- [ ] Response types are defined
- [ ] Error types are defined
- [ ] No TypeScript errors

**Estimated Effort**: 1.5 hours

---

## Phase 6: Testing & Quality

### Task 6.1: Set up Vitest

**Description**: Configure Vitest for unit testing.

**Files to Create**:

- `front/vitest.config.js` - Vitest configuration
- `front/src/test/setup.js` - Test setup file

**Files to Modify**:

- `front/package.json` - Add Vitest and testing dependencies

**Acceptance Criteria**:

- [ ] Vitest is installed and configured
- [ ] `npm run test` command works
- [ ] `npm run test:watch` command works
- [ ] Example test runs successfully
- [ ] Coverage reporting is configured

**Estimated Effort**: 1 hour

---

### Task 6.2: Write Tests for Stores

**Description**: Write unit tests for all Pinia stores.

**Dependencies**: Task 6.1 (Vitest set up), Tasks 1.1 - 1.5 (Stores created)

**Files to Create**:

- `front/src/stores/__tests__/itemsStore.spec.ts`
- `front/src/stores/__tests__/mapStore.spec.ts`
- `front/src/stores/__tests__/configStore.spec.ts`
- `front/src/stores/__tests__/uiStore.spec.ts`
- `front/src/stores/__tests__/websocketStore.spec.ts`

**Acceptance Criteria**:

- [ ] Each store has comprehensive unit tests
- [ ] State mutations are tested
- [ ] Actions are tested
- [ ] Getters are tested
- [ ] Edge cases are covered
- [ ] All tests pass

**Estimated Effort**: 4 hours

---

### Task 6.3: Write Tests for Composables

**Description**: Write unit tests for all composables.

**Dependencies**: Task 6.1 (Vitest set up), Tasks 2.1 - 2.5 (Composables created)

**Files to Create**:

- `front/src/composables/__tests__/useMap.spec.ts`
- `front/src/composables/__tests__/useItems.spec.ts`
- `front/src/composables/__tests__/useWebSocket.spec.ts`
- `front/src/composables/__tests__/useDrawing.spec.ts`
- `front/src/composables/__tests__/useNavigation.spec.ts`

**Acceptance Criteria**:

- [ ] Each composable has comprehensive unit tests
- [ ] Reactive state changes are tested
- [ ] Functions are tested
- [ ] Edge cases are covered
- [ ] All tests pass

**Estimated Effort**: 4 hours

---

### Task 6.4: Set up ESLint and Prettier

**Description**: Configure ESLint and Prettier for code quality.

**Files to Create**:

- `front/.eslintrc.cjs` - ESLint configuration
- `front/.prettierrc` - Prettier configuration
- `front/.eslintignore` - ESLint ignore file

**Files to Modify**:

- `front/package.json` - Add lint and format scripts

**Acceptance Criteria**:

- [ ] ESLint is configured for Vue 3 and TypeScript
- [ ] Prettier is configured with consistent rules
- [ ] `npm run lint` command works
- [ ] `npm run lint:fix` command works
- [ ] `npm run format` command works
- [ ] No linting errors in existing code (or disabled for legacy files)

**Estimated Effort**: 1 hour

---

## Task Summary

| Phase                          | Task Count | Estimated Total Hours |
| ------------------------------ | ---------- | --------------------- |
| Phase 0: Foundation            | 4          | 5.5 hours             |
| Phase 1: State Management      | 6          | 12 hours              |
| Phase 2: Composables           | 5          | 11.5 hours            |
| Phase 3: API Layer             | 5          | 6.5 hours             |
| Phase 4: Component Refactoring | 9          | 19 hours              |
| Phase 5: TypeScript Migration  | 4          | 8.5 hours             |
| Phase 6: Testing & Quality     | 4          | 10 hours              |
| **Total**                      | **37**     | **~73 hours**         |

---

## Recommended Task Order

While tasks are designed to be independently useful, some dependencies exist. Here's a suggested order:

### Week 1: Foundation

1. Task 0.1: Install and Configure Pinia
2. Task 0.2: Add TypeScript Configuration
3. Task 0.3: Create Constants Module
4. Task 0.4: Organize Utility Functions

### Week 2: State Management

5. Task 1.1: Create itemsStore (Pinia)
6. Task 1.2: Create mapStore (Pinia)
7. Task 1.3: Create configStore (Pinia)
8. Task 1.4: Create uiStore (Pinia)
9. Task 1.5: Create websocketStore (Pinia)
10. Task 1.6: Migrate Components to Pinia Stores

### Week 3: Composables & API

11. Task 3.1: Create API Client
12. Task 3.2: Create itemsApi Module
13. Task 3.3: Create configApi Module
14. Task 3.4: Create messagesApi Module
15. Task 3.5: Update Stores to Use API Layer
16. Task 2.1: Create useMap Composable
17. Task 2.2: Create useItems Composable

### Week 4: Main.vue Decomposition (Progressive)

18. Task 2.3: Create useWebSocket Composable
19. Task 4.1: Extract MapContainer from Main.vue
20. Task 4.4: Extract AppNavbar from Main.vue
21. Task 4.5: Extract AppSidebar from Main.vue
22. Task 4.2: Extract MapToolbar from Main.vue

### Week 5: Remaining Components & Cleanup

23. Task 4.3: Extract MapMarkers from Main.vue
24. Task 4.6: Final Main.vue Cleanup and <script setup> Migration
25. Task 2.4: Create useDrawing Composable
26. Task 2.5: Create useNavigation Composable
27. Task 4.7: Migrate Sidebar.vue to <script setup>
28. Task 4.8: Migrate Item Detail Components to <script setup>
29. Task 4.9: Migrate Modal Components to <script setup>

### Week 6: TypeScript & Testing

30. Task 5.1: Define Core Type Interfaces
31. Task 5.2: Migrate Stores to TypeScript
32. Task 5.3: Migrate Composables to TypeScript
33. Task 5.4: Migrate API Layer to TypeScript
34. Task 6.1: Set up Vitest
35. Task 6.2: Write Tests for Stores
36. Task 6.3: Write Tests for Composables
37. Task 6.4: Set up ESLint and Prettier
