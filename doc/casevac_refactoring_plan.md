# Revised Refactoring Plan: Standardizing Casevac Flow

**Objective:** To refactor the Casevac creation and editing flow to align with the existing Unit and Point item handling, primarily by integrating Casevac details and form functionality into the sidebar component structure and standardizing the creation process, while ignoring the `casevacform.js` file.

**Current State:**
*   Unit and Point items are likely created via map interaction or a UI element, added to the `store`, and their details/editing are handled in dedicated components (`UnitDetails.js`, `PointDetails.js`) displayed in the sidebar when the item is active.
*   Casevac items appear to have a separate creation flow, potentially involving a dedicated form/modal, and their details are shown in `CasevacDetails.js`. The integration with the main item handling flow seems different. The `casevacform.js` file exists but should be ignored for this refactoring.

**Desired State:**
*   Casevac creation is initiated similarly to Units and Points.
*   Casevac details and editing are handled within the sidebar using the `CasevacDetails.js` component, similar to how `UnitDetails.js` and `PointDetails.js` are used.
*   The `casevacform.js` file is not used in this refactoring.
*   Data handling and saving for Casevac items utilize the existing `store` and `saveItem` function in `map.js`.

**Plan Steps:**

1.  **Analyze Unit and Point Creation/Editing Flow:**
    *   **Files:** `staticfiles/static/js/map.js`, `staticfiles/static/js/components/UnitDetails.js`, `staticfiles/static/js/components/PointDetails.js`, `staticfiles/header.html`
    *   **Action:** Examine the code in detail to fully understand how Unit and Point items are created (e.g., which map events trigger creation, how the initial data is structured) and how their details are displayed and edited in the sidebar components. Pay close attention to how data is passed to and from the sidebar components and how changes are saved via the `store` and `saveItem`.
    *   **Reasoning:** A thorough understanding of the existing, desired flow is crucial for effectively refactoring the Casevac flow to match it.

2.  **Analyze Current Casevac Creation/Editing Flow (Ignoring `casevacform.js`):**
    *   **Files:** `staticfiles/static/js/map.js`, `staticfiles/static/js/components/CasevacDetails.js`, `staticfiles/header.html`
    *   **Action:** Examine the code related to Casevac handling, specifically in `map.js` and `CasevacDetails.js`. Identify where Casevac creation is initiated (e.g., the commented-out `add_casevac` in `mapClick`), how `CasevacDetails.js` is currently used (for display only, or does it have editing capabilities?), and how Casevac data is handled and potentially saved. Ignore any references or logic related to `casevacform.js`.
    *   **Reasoning:** To pinpoint the exact differences and areas that require refactoring within the allowed files.

3.  **Enhance `CasevacDetails.js` for Editing:**
    *   **File:** `staticfiles/static/js/components/CasevacDetails.js`
    *   **Action:** If `CasevacDetails.js` currently only displays details, add the necessary form elements and logic to allow editing of Casevac properties. Model this after the editing capabilities found in `UnitDetails.js` and `PointDetails.js`.
    *   **Reasoning:** To enable the sidebar component to handle Casevac editing consistently with other item types.

4.  **Modify `map.js` to Standardize Casevac Creation:**
    *   **File:** `staticfiles/static/js/map.js`
    *   **Action:**
        *   Uncomment and adapt the `add_casevac` logic within the `mapClick` function or create a new function for Casevac creation that mirrors the `mapClickAddUnit` function.
        *   Ensure that a new Casevac item is created in the `store` with a unique UID and initial properties when the creation is triggered.
        *   Set the newly created Casevac item as the `activeItemUid` to display its details/form in the sidebar using `CasevacDetails.js`.
        *   Remove any code that specifically handles Casevac forms or modals separately from the standard item details flow.
    *   **Reasoning:** To initiate Casevac creation in a manner consistent with other item types and leverage the existing `activeItemUid` mechanism for displaying details/forms in the sidebar.

5.  **Update `header.html` and other relevant files:**
    *   **Files:** `staticfiles/header.html`, and potentially other files that might have referenced `casevacform.js`.
    *   **Action:** Remove any references to `casevacform.js`. Ensure that the sidebar component is correctly configured to display `CasevacDetails.js` when a Casevac item is active.
    *   **Reasoning:** To remove any potential dependencies on the ignored Casevac form component and ensure the correct component is loaded in the UI.

6.  **Refactor Data Handling and Saving:**
    *   **Files:** `staticfiles/static/js/map.js`, `staticfiles/static/js/store.js`, `staticfiles/static/js/components/CasevacDetails.js`
    *   **Action:**
        *   Verify that Casevac data is stored in the `store` using a similar structure to Unit and Point items.
        *   Ensure that saving changes to a Casevac item from `CasevacDetails.js` correctly uses the `saveItem` function in `map.js`, which interacts with the `store`.
        *   If necessary, update the `store.js` to handle Casevac data consistently with other item types.
    *   **Reasoning:** To standardize data management and persistence for all relevant item types.

7.  **Testing:**
    *   **Action:** Thoroughly test the Casevac creation and editing flow to ensure it functions correctly and consistently with the Unit and Point flows. Test creating new Casevac items, editing existing ones, and verifying that data is saved correctly.
    *   **Reasoning:** To ensure the refactoring did not introduce any bugs and that the desired behavior is achieved.

**Mermaid Diagram (Conceptual Data Flow - Before Refactoring):**

```mermaid
graph TD
    A[Map Click] --> B{Item Type?}
    B -- Unit/Point --> C[Create Item in Store]
    C --> D[Add Marker to Map]
    D --> E[Set Active Item]
    E --> F[Sidebar Component (Unit/Point Details)]
    F --> G[Edit Form]
    G --> H[Save via Store]
    B -- Casevac --> I[Trigger Casevac Form/Modal]
    I --> J[Casevac Form Component]
    J --> K[Save Casevac Data]
```

**Mermaid Diagram (Conceptual Data Flow - After Refactoring):**

```mermaid
graph TD
    A[Map Click or UI Action] --> B{Item Type?}
    B -- Unit/Point/Casevac --> C[Create Item in Store]
    C --> D[Add Marker to Map]
    D --> E[Set Active Item]
    E --> F[Sidebar Component (Unit/Point/Casevac Details)]
    F --> G[Edit Form]
    G --> H[Save via Store]