# Drawing Creation/Editing Refactoring Plan

This plan outlines the steps to refactor the Drawing creation and editing flow to be more consistent with how Unit and Point items are handled in the application.

**Current State Analysis:**

-   Unit and Point creation is initiated by clicking on the map when a specific mode (e.g., `add_unit`, `add_casevac`) is active. The new item is added to the Vuex store, a marker is added to the map, and the item is set as the active item, triggering the sidebar to display the relevant details component.
-   Drawing creation is handled by the Leaflet Draw control. When a drawing is completed, an object is created, immediately saved (likely to the backend), added to the map, set as the active item, and a specific Bootstrap modal (`#drawing-edit`) is explicitly shown for editing.

**Refactoring Goal:**

Align the Drawing creation/editing flow with the Unit and Point flow by:
1.  Initiating Drawing creation through dedicated modes activated by UI elements.
2.  Adding newly created Drawings to the store first, similar to Units and Points.
3.  Removing the explicit modal call for editing and relying on the sidebar to display the `DrawingDetails` component.

**Detailed Plan:**

1.  **Modify `front/header.html`:**
    -   Add buttons or controls to the UI (e.g., in the navbar or sidebar) to activate drawing modes for different shapes (e.g., "Add Polygon", "Add Polyline"). These UI elements will be responsible for enabling the corresponding drawing tools from the Leaflet Draw control.
    -   Consider hiding or removing the default Leaflet Draw control buttons if the new UI elements replace their functionality.

2.  **Modify `front/static/js/map.js`:**
    -   Introduce new data properties to track drawing modes (e.g., `drawingMode: null`).
    -   Add methods to activate drawing modes. These methods will enable the specific drawing handler (e.g., `this.drawControl.enable(L.Draw.Polygon)`) and set the `drawingMode` data property.
    -   Modify the `map.on(L.Draw.Event.CREATED, ...)` handler:
        -   After a drawing is created and the `u` object is prepared, instead of immediately calling `vm.saveItem(u, ...)`, add the new drawing object to the store: `store.state.items.set(u.uid, u); store.state.ts += 1;`.
        -   Call `this._processAddition(u);` to add the drawing layer to the map.
        -   Call `this.setActiveItemUid(u.uid, true);` to set the newly created drawing as the active item.
        -   Remove the line `new bootstrap.Modal(document.querySelector("#drawing-edit")).show();`.
        -   Reset the drawing mode after creation (e.g., `this.drawingMode = null;`).
    -   Review and ensure that `_processDrawing` and `_processUpdate` correctly handle adding and updating drawing layers based on data from the store.

3.  **Modify `front/static/js/store.js`:**
    -   Verify that the `saveItem` method correctly handles items with `category: "drawing"` and `category: "route"` and sends the appropriate data to the backend for persistence.
    -   Confirm that the `handleItemChangeMessage` method properly processes incoming WebSocket messages for drawings and updates the store, triggering reactivity in the map and sidebar components.

4.  **Modify `front/static/js/components/DrawingDetails.js`:**
    -   Ensure this Vue component is fully implemented to display and allow editing of Drawing item properties (callsign, color, etc.). It should receive the drawing item data as a prop.
    -   Implement methods within `DrawingDetails.js` to update the drawing item in the store when changes are made by the user.

5.  **Modify `front/static/js/components/sidebar.js`:**
    -   Confirm that the sidebar component watches the `activeItem` prop and dynamically renders the appropriate details component (`UnitDetails`, `PointDetails`, `DrawingDetails`, etc.) based on the `activeItem.category`.

**Reasoning for Changes:**

-   **Consistent User Experience:** Initiating drawing from dedicated UI elements aligns the interaction pattern with creating other item types like Units and Points.
-   **Unified Data Flow:** Adding drawings to the store before saving centralizes state management and leverages Vue's reactivity for UI updates, making the data flow more consistent across different item types.
-   **Centralized Details Display:** Relying on the sidebar to display drawing details, rather than a separate modal, consolidates the item editing interface and follows the pattern used for Units and Points.
-   **Simplified `map.js` Logic:** Moving the responsibility of showing the details form to the sidebar simplifies the `map.js` file, which should primarily focus on map interactions and data processing.

This plan provides a clear path to refactor the Drawing flow to be more consistent with the existing Unit and Point flows, improving code maintainability and user experience.