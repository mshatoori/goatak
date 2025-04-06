# Project Progress Report III (Since 2024-09-15)

This report provides a detailed account of the functional evolution, feature implementations, and user experience enhancements within the project since mid-September 2024, expanding upon the previous summary.

## I. Core Functionality & Architecture Enhancements

### 1. State Management & UI Architecture Overhaul
A fundamental shift occurred in how application data and UI are managed.
*   **Centralized State (Vuex-like Store):** A dedicated `store` object (`util.js`) now manages the application's state, including all map items (units, contacts, points, drawings, routes), sensor connections, feed configurations, and the status of the emergency beacon. This replaced previous methods of direct component data handling, leading to more predictable data flow and easier state synchronization across the application. Key actions like fetching, creating, and removing items are now mediated through store functions (`fetchItems`, `createItem`, `removeItem`), which handle both state updates and backend API communication. WebSocket messages are also processed via the store (`handleWSMessage`) to ensure consistent state updates.
*   **UI Refactoring (Tabbed Sidebar & Modals):** The user interface was significantly restructured. The bulky accordion sidebar was removed and replaced by a cleaner, tabbed vertical sidebar (`Sidebar.js` component). This sidebar now organizes primary functions into distinct tabs: Overlays, User Info, Tools, and Current Unit Details. Secondary or more complex workflows were moved into dedicated Bootstrap modals, including:
    *   `AlarmsModal`: Displays active geofence and emergency alerts.
    *   `SendModal`: Allows sending selected items to specific IP/URN destinations.
    *   `DrawingEditModal`: Handles editing properties for polygons and routes (including geofence settings).
    *   Standard Edit Modal (`#edit`): Remains for editing basic unit/point properties.
    This modular approach declutters the main interface and provides focused contexts for specific tasks.

### 2. Configuration Management Strategy
Configuration handling was standardized and made more flexible.
*   **YAML Configuration:** The primary method shifted from environment variables to using YAML files (`goatak_client.yml` by default). This allows for richer configuration structures, comments, and easier editing compared to long strings of environment variables. Backend services now load settings directly from this file using Viper.
*   **Node-Specific Configurations:** Support was added for multiple YAML configuration files (e.g., `goatak_client-6.yml`, `goatak_client-7.yml`), enabling distinct setups for different nodes in a deployment, each specifying unique Callsigns, UIDs, IPs, URNs, GPS ports, etc.
*   **Docker Integration:** Deployment via Docker was simplified. The `docker-compose.yaml` files now primarily rely on mounting the appropriate YAML configuration file rather than passing numerous environment variables, making container startup commands cleaner.

### 3. Data Transmission Protocols (RabbitMQ)
The protocol for exchanging CoT data via RabbitMQ underwent a significant change.
*   **JSON Message Wrapping:** Instead of sending raw CoT XML or protobuf messages directly, messages are now wrapped in a specific JSON structure (`RabbitMsg`). The actual CoT data is Base64 encoded within the `payLoadData` field of this JSON object.
*   **Explicit Source/Destination:** This JSON wrapper mandates the inclusion of source (`ClientInfo` with IP/URN) and destination (`Destinations` array with IP/URN) information, providing better context and facilitating more complex routing logic if needed in the message broker or receiving clients.
*   **Queue Durability:** RabbitMQ queues used for sending and receiving were configured as durable, increasing the likelihood that messages persist through broker restarts. Binding to specific event types (`VmfMessageReceivedEvent`) was also implemented.

### 4. Object Persistence & Resending Logic
*   **Broadcast Interval:** To avoid flooding the network, a mechanism was added to limit the resending frequency of locally created/modified items marked for broadcast. An item will only be sent if a certain interval (default 10 minutes, `ResendObject`) has passed since its last transmission (`lastSent` timestamp tracking in `Item` model).

## II. Mapping & Visualization Feature Development

### 1. Polygon Drawing, Geofencing, and Properties
Functionality related to drawing and utilizing polygons was significantly expanded.
*   **Drawing:** Users can draw polygons using the Leaflet.Draw toolbar.
*   **Properties:** Newly drawn polygons default to "Area" ("┘å╪º╪¡█î┘ç") callsign and white color. Users can edit the Callsign and Color via the `DrawingEditModal`.
*   **Geofencing Activation:** Within the `DrawingEditModal`, users can explicitly enable/disable a polygon as an active geofence using a checkbox (`Geofence: true/false`).
*   **Affiliation Monitoring:** When geofencing is active, users can select which affiliation(s) the fence should monitor (Hostile, Friendly, or All) via a dropdown menu (`GeofenceAff`).
*   **Backend Detection:** The backend (`checkGeofences` function) monitors position updates (`changeCb` callback) for units and contacts. For each update, it checks against all active geofence polygons (`item.GetMsg().IsGeofenceActive()`).
*   **Alert Generation:** If a unit enters a geofence that is configured to monitor its affiliation (`item.GetMsg().GetGeofenceAff()`), an alarm CoT message (`b-a-g`) is automatically generated. This alarm links back to the triggering unit (`t-p-b` relation) and the geofence polygon (`t-p-f` relation).
*   **Alert Display:** These generated alarms appear in the `AlarmsModal` and are visually represented on the map (though specific styling wasn't detailed in the diff). Alarms are automatically cleared if the triggering unit or geofence is deleted (`updateGeofencesAfterDelete`).

### 2. Routing Capabilities
Basic support for creating and displaying routes was added.
*   **Polyline Drawing:** The Leaflet.Draw toolbar was configured to allow drawing polylines.
*   **Route Creation:** Drawn polylines are now interpreted as "route" items (`category: "route"`, `type: "b-m-r"`). They default to the callsign "Route" ("┘à╪│█î╪▒") and white color.
*   **Editing:** Route Callsign and Color can be modified using the `DrawingEditModal`.
*   **Display:** Routes are added to a dedicated "route" overlay layer group for separate visibility control via the Overlays tab.

### 3. Overlay Management System
Control over map clutter and item visibility was improved.
*   **Sidebar Tab:** A dedicated "Overlays" tab was added to the main sidebar.
*   **Category Toggles:** This tab lists all major item categories (Contacts, Units, Alarms, Points, Drawings, Routes) with checkboxes. Users can toggle these checkboxes to show or hide all items belonging to that category on the map (`toggleOverlay` function).
*   **Item Counts:** The number of items currently present in each category is displayed next to the toggle.
*   **Layer Group Implementation:** Backend map logic now uses distinct Leaflet layer groups (`L.layerGroup()`) for each category (`this.overlays`). Toggling an overlay adds or removes the corresponding layer group from the map.

### 4. Map User Interface / User Experience (UI/UX) Changes
Several changes refined the direct map interaction experience.
*   **On-Map Controls:** Dedicated buttons for "Locate Me" (`LocationControl`) and "Add Unit" (`ToolsControl`) were added directly to the map canvas (bottom-left and top-left respectively), making these common actions more accessible than digging through menus.
*   **Right-Click Context Menu:** A context menu was added to all user-interactable map items (markers, polygons, routes, excluding automatic fences). Right-clicking an item brings up a small menu with "Delete" and "Send..." options, triggering corresponding store actions (`menuDeleteAction`, `menuSendAction`).
*   **Simplified Unit Addition:** The "Add Unit" map tool (`mode = "add_unit"`) allows placing a new default unit directly via a map click, immediately opening the edit modal for customization.
*   **Drawing Toolbar Configuration:** The Leaflet.Draw toolbar was restricted to only show Polygon and Polyline drawing tools. Editing and deleting shapes via the toolbar itself were disabled (actions moved to context menu or modals).
*   **Visual Styling:** CSS adjustments were made to increase the size/usability of touch controls, style the new sidebar tabs, refine marker info labels (font, background opacity, hover effect), and style the context menu. Emergency icons were added.

## III. Communication & Safety Feature Enhancements

### 1. Emergency Beacon Functionality
A dedicated emergency beacon system was implemented.
*   **UI Controls:** The "User Info" tab in the sidebar now contains two toggle switches and a dropdown menu for emergency type selection (mapped to "911", "In Contact", "Ring The Bell").
*   **Activation Logic:** *Both* switches must be enabled simultaneously to activate the beacon. The selected dropdown type determines the specific CoT message sent (`b-a-o-tbl`, `b-a-o-opn`, `b-a-o-pan`). Activation sends the corresponding alert message associated with the user's own UID. The application state (`beacon_active`, `store.state.emergency`) tracks activation.
*   **Deactivation Logic:** Disabling either switch deactivates the beacon and triggers sending a cancellation CoT message (`b-a-o-can`) linked to the original alert.
*   **Persistence:** The system attempts to handle state correctly, including sending cancel messages even if the original alert item isn't found in the local store upon deactivation.

### 2. Targeted Item Sending
Functionality was added to send specific items to chosen destinations.
*   **"Send..." Action:** Available via the right-click context menu on map items.
*   **Send Modal:** Invoking "Send..." opens the `SendModal`, prompting the user to enter the destination IP address and URN.
*   **Backend API:** A new endpoint (`POST /unit/:uid/send/`) receives the item UID and destination details.
*   **Transmission:** The backend temporarily overrides the default RabbitMQ feed's destination list with the one provided in the request, sends the specified item's CoT message via RabbitMQ (using the JSON wrapping protocol), and then restores the feed's original destinations. A toast notification confirms success or failure.

### 3. Chat Functionality
*   The existing text chat feature remains available. It is accessed via a button displayed in the "Current Unit" sidebar tab when a "contact" item is selected.

## IV. Sensor Integration Advances

### 1. GPS Serial Proxy Support
Enhanced flexibility for integrating physical GPS devices, especially in Dockerized environments.
*   **TCP Proxy Connectivity:** The `GpsdSensor` component was updated to optionally connect to a TCP endpoint (`TCPProxyAddr`) instead of directly to a local `gpsd` socket.
*   **Serial Port Configuration:** Upon connecting to the proxy, the application sends a specific command sequence containing the desired host serial port name (e.g., "COM9", configured via `gps_port` in YAML) to instruct the proxy which serial device to bridge.
*   **Data Forwarding:** The application reads serial data (e.g., NMEA sentences) received over the TCP proxy connection and forwards it via UDP datagrams to the configured internal `gpsd` service address (e.g., `gpsd:2947`), allowing the existing `gpsd` processing logic to handle the data.
*   **Host Bridge Script:** A helper Python script (`gpssim/forwarder.py`) was created for Windows hosts. This script uses WMI to detect when specific FTDI-based serial devices are plugged in, automatically opens the corresponding COM port, reads the data, and forwards it to the `gpsd` UDP port, acting as a bridge between the physical device and the container network.

## V. Build, Deployment, and Tooling Improvements

*   **Docker Enhancements:** Dockerfiles were updated to use different base images (from `balad.ir` registry), potentially reducing image size (`-w` flag added to Go build). Standardized `docker-compose.yaml` (for deployment using pre-built images) and `docker-compose.dev.yaml` (for development using local builds) were added. An external Docker network (`mmhs-network`) is now used.
*   **Map Tile Downloader:** A utility script (`maps/downloader.py`) was added to download map tiles from a list of URLs provided in `export.txt`. It supports parallel downloads and mimics browser headers, aiding in setting up offline map caches.
*   **Documentation:** Initial `setup/Readme.md` created with basic setup instructions (in Persian). A placeholder file (`new_message.md`) outlines steps for developers adding new CoT message types. 