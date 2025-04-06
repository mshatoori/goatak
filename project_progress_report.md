# Project Progress Report (Since 2024-09-15)

This report details the significant functional enhancements, feature implementations, and user interface changes made to the project since mid-September 2024.

## I. Core Functionality & Architecture

### 1. State Management & UI Architecture Overhaul
*   **Centralized State:** Implemented a central data store (similar to Vuex) to manage application state, including map items (units, contacts, points, drawings, routes), sensor/feed status, and user configuration. This improves data consistency and simplifies component interactions.
*   **UI Refactoring:** Replaced the previous accordion-based sidebar with a more modern, tabbed sidebar component (`Sidebar`). Functionality previously housed in the accordion (User Info, Tools, Current Unit Details) is now organized within these tabs.
*   **Modal-Based Interactions:** Introduced dedicated modals for specific workflows like viewing Alarms (`AlarmsModal`), Sending items to specific destinations (`SendModal`), and Editing Drawings/Routes (`DrawingEditModal`), streamlining the user interface.

### 2. Configuration Management
*   **YAML Configuration:** Transitioned from primarily environment variables to using YAML files (`goatak_client.yml`) for main application configuration. This allows for more structured and easier management of settings.
*   **Node-Specific Configurations:** Added support for node-specific YAML files (e.g., `goatak_client-6.yml`) to manage unique settings (IP, URN, Callsign, GPS Port, etc.) for different instances.
*   **Docker Integration:** Updated Docker compose files (`docker-compose.yaml`, `docker-compose.dev.yaml`) to mount the main configuration file, simplifying deployment setup.

### 3. Data Transmission (RabbitMQ)
*   **JSON Message Wrapping:** Refactored RabbitMQ communication to use a specific JSON message structure. The actual CoT payload is now Base64 encoded within a `payLoadData` field.
*   **Source/Destination Handling:** The JSON wrapper now includes explicit source (IP/URN) and destination information, allowing for more controlled message routing.
*   **Durability:** Configured RabbitMQ queues as durable for improved message persistence.

### 4. Object Persistence & Resending
*   **Resend Interval:** Implemented logic to prevent objects marked for sending from being broadcast too frequently (default 10-minute interval). Objects are only sent if they haven't been sent recently.

## II. Mapping & Visualization Features

### 1. Geofencing
*   **Polygon Geofences:** Users can now draw polygons and designate them as active geofences.
*   **Affiliation Monitoring:** Geofences can be configured to monitor for specific affiliations (Hostile, Friendly, or All).
*   **Entry Alerts:** The system automatically generates alerts (`b-a-g` type) when units enter geofences they are monitored by.
*   **UI Integration:** Geofence status (active/inactive) and monitored affiliation can be set via the Drawing Edit modal. Active alarms are displayed in the Alarms modal.

### 2. Routing
*   **Polyline Drawing:** Users can draw polylines on the map using the draw tools.
*   **Route Creation:** Drawn polylines are now treated as "route" items (`b-m-r`) within the system.
*   **Route Editing:** Route properties (Callsign, Color) can be edited using the Drawing Edit modal.

### 3. Overlay Management
*   **Layer Toggling:** Added an "Overlays" tab to the sidebar, allowing users to toggle the visibility of different map item categories (Contacts, Units, Alarms, Points, Drawings, Routes) independently.
*   **Layer Groups:** Implemented separate Leaflet layer groups for each item category for efficient management.

### 4. Map Controls & Interaction
*   **On-Map Controls:** Added "Locate Me" and "Add Unit" buttons directly onto the map interface for quicker access.
*   **Context Menu:** Implemented a right-click context menu on map items (markers, polygons, routes) providing quick actions like "Delete" and "Send...".
*   **Unit Addition:** Streamlined adding new units by clicking a map location via the "Add Unit" tool.

## III. Communication & Safety Features

### 1. Emergency Beacon
*   **Activation Controls:** Added two toggle switches and an emergency type dropdown (Alert, In Contact, Distress) to the User Info section.
*   **Beacon Activation/Deactivation:** Sending an emergency alert requires activating *both* switches. Deactivating either switch sends a cancellation alert.
*   **CoT Integration:** Sends standard emergency CoT messages (`b-a-o-*`) upon activation and cancellation (`b-a-o-can`).
*   **Status Tracking:** Internal state tracks whether the beacon is active.

### 2. Item Sending
*   **Targeted Send:** Implemented a "Send..." option (via context menu and Send Modal) allowing users to send a specific map item to a designated destination (IP address and URN).
*   **Backend Support:** Added API endpoint (`POST /unit/:uid/send/`) to handle these targeted send requests, temporarily overriding the default RabbitMQ destination.

### 3. Chat
*   Existing chat functionality remains, accessible via a button in the sidebar when a contact is selected.

## IV. Sensor Integration

### 1. GPS Serial Proxy Support
*   **TCP Proxy Connection:** The application can now connect to a GPS device via a TCP serial proxy service. Configuration requires setting the proxy address (`TCPProxyAddr`) and the target serial port (`SerialPort`).
*   **Automatic Forwarding:** The system reads NMEA (or other serial data) from the TCP proxy and forwards it via UDP to the internal `gpsd` service for processing.
*   **Host Bridge Script:** Provided a Python script (`gpssim/forwarder.py`) for Windows hosts to monitor for connected COM ports (specifically FTDI devices) and automatically forward their data to the `gpsd` UDP port, simplifying the use of physical GPS devices with the Docker setup.

## V. Build, Deployment, and Tooling

*   **Docker Improvements:** Updated base images, build flags, and compose file structures for clarity and potentially smaller builds. Added development-specific compose file.
*   **Map Tile Downloader:** Added a script (`maps/downloader.py`) to facilitate downloading map tiles based on a list of URLs, useful for offline map setup.
*   **Documentation:** Added initial setup instructions (`setup/Readme.md`) and placeholder notes for adding new message types. 