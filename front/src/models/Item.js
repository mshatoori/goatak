import { generateUUID } from '../utils';

/**
 * Represents a generic item (Unit, Point, Drawing, Alert, etc.)
 * mirroring the backend's WebUnit struct.
 */
export class Item {
    // --- Core Identification & Metadata ---
    uid = '';
    category = 'unit'; // Default category
    type = '';         // CoT type
    callsign = '';
    scope = '';
    team = '';
    role = '';
    sidc = '';
    parent_uid = '';
    parent_callsign = '';
    status = ''; // e.g., 'online', 'offline'
    tak_version = '';
    device = '';
    ip_address = '';
    urn = 0;
    by = ''; // Creator/Source identifier
    from = ''; // Sender identifier (often same as 'by')

    // --- Timestamps ---
    time = null;       // Primary timestamp (ISO string or Date object)
    last_seen = null;  // Last received time
    stale_time = null; // Time when considered stale
    start_time = null; // Event start time
    send_time = null;  // Time it was sent

    // --- Geospatial ---
    lat = 0.0;
    lon = 0.0;
    hae = 0.0;         // Height Above Ellipsoid
    speed = 0.0;
    course = 0.0;

    // --- Visuals & Details ---
    text = '';         // Associated text/remark
    color = '';        // Preferred display color hex (e.g., '#FF0000')
    icon = '';         // Icon identifier or URL

    // --- Specific Item Type Data ---
    web_sensor = '';   // Associated web sensor UID
    sensor_data = {};  // Key-value pairs for sensor readings
    missions = [];     // Associated missions
    links = [];        // Related item UIDs

    // --- Flags ---
    local = false;     // Is this item locally generated only?
    send = true;       // Should this item be sent to the backend?
    geofence = false;  // Is this a geofence?
    geofence_aff = ''; // Geofence affiliation (f, h, n, u)

    // --- Frontend Only Properties (will be excluded from API payload) ---
    marker = null; // Leaflet marker instance
    // Add other frontend-specific properties here if needed

    /**
     * Creates an instance of Item.
     * @param {Partial<Item>} initialData - Initial data to populate the item.
     */
    constructor(initialData = {}) {
        // Assign known properties from initialData
        Object.keys(this).forEach(key => {
            if (initialData.hasOwnProperty(key) && key !== 'marker') { // Avoid overwriting prototype methods etc.
                this[key] = initialData[key];
            }
        });

        // Ensure UID exists
        if (!this.uid) {
            this.uid = generateUUID();
        }

        // Ensure timestamps are consistently handled (e.g., always Date objects or ISO strings)
        // For simplicity, we'll leave them as is for now, assuming ISO strings from backend/Date objects from frontend
        if (!this.time) {
            this.time = new Date().toISOString();
        }
        if (!this.timestamp) { // Handle potential 'timestamp' alias
             this.time = initialData.timestamp || this.time;
        }

         // Ensure points array exists for drawings (if category indicates)
        if (this.category === 'drawing' && !Array.isArray(this.points)) {
            this.points = initialData.points || [];
        }
        // Ensure sensor_data is an object
        if (typeof this.sensor_data !== 'object' || this.sensor_data === null) {
            this.sensor_data = {};
        }
        // Ensure missions and links are arrays
        if (!Array.isArray(this.missions)) {
            this.missions = [];
        }
         if (!Array.isArray(this.links)) {
            this.links = [];
        }
    }

    /**
     * Returns a plain object representation suitable for sending to the API.
     * Excludes frontend-only properties like 'marker'.
     * @returns {object} Plain object representation.
     */
    toPayload() {
        const payload = {};
        for (const key in this) {
            // Exclude functions and frontend-only properties
            if (typeof this[key] !== 'function' && key !== 'marker' /* add other exclusions if needed */) {
                 // Ensure Date objects are converted to ISO strings if backend expects strings
                if (this[key] instanceof Date) {
                    payload[key] = this[key].toISOString();
                } else {
                    payload[key] = this[key];
                }
            }
        }
        // Ensure required fields have default values if somehow missing (optional)
        payload.uid = payload.uid || generateUUID();
        payload.category = payload.category || 'unit';
        payload.lat = payload.lat ?? 0.0;
        payload.lon = payload.lon ?? 0.0;
        payload.send = payload.send ?? true;
        payload.time = payload.time || new Date().toISOString();

        // Handle potential 'timestamp' alias if present
        if (payload.timestamp && !payload.time) {
            payload.time = payload.timestamp;
        }
        delete payload.timestamp; // Remove alias if present

        return payload;
    }
} 