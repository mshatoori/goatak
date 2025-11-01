/**
 * TrackingManager - Manages trail visualization on Leaflet maps
 *
 * This class provides comprehensive trail management functionality including:
 * - Adding/updating/removing trails on the map
 * - Trail rendering with customizable colors, widths, and lengths
 * - Real-time trail updates via WebSocket integration
 * - Trail data management and caching
 * - Performance optimization for large trail datasets
 */
class TrackingManager {
  constructor(map, options = {}) {
    this.map = map;
    this.trails = new Map(); // uid -> L.polyline
    this.trailData = new Map(); // uid -> array of positions
    this.trailConfigs = new Map(); // uid -> trail configuration
    this.trackingEnabled = true;

    // Default configuration
    this.defaultConfig = {
      enabled: true,
      trailLength: 50,
      trailColor: "#FF0000",
      trailWidth: 2,
      trailOpacity: 0.7,
      updateInterval: 30000, // 30 seconds
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      smoothUpdates: true,
      ...options,
    };

    // Create tracking overlay if it doesn't exist
    if (!this.map.trackingOverlay) {
      this.map.trackingOverlay = L.layerGroup();
      this.map.trackingOverlay.addTo(this.map);
    }

    // Performance optimization
    this.updateQueue = new Set();
    this.isUpdating = false;

    // Cleanup interval
    this.cleanupInterval = setInterval(() => {
      this.cleanupOldTrails();
    }, 5 * 60 * 1000); // Every 5 minutes

    console.log("TrackingManager initialized");
  }

  /**
   * Add a new trail to the map
   * @param {string} unitUid - Unique identifier for the unit
   * @param {Array} positions - Array of position objects {lat, lon, timestamp}
   * @param {Object} config - Trail configuration options
   */
  addTrail(unitUid, positions, config = {}) {
    if (!unitUid || !positions || !Array.isArray(positions)) {
      console.warn("TrackingManager.addTrail: Invalid parameters");
      return false;
    }

    // Merge with default configuration
    const trailConfig = {
      ...this.defaultConfig,
      ...config,
    };

    this.trailConfigs.set(unitUid, trailConfig);

    // Filter and sort positions by timestamp
    const validPositions = positions
      .filter((pos) => pos.lat && pos.lon && pos.timestamp)
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    if (validPositions.length === 0) {
      console.warn(
        `TrackingManager.addTrail: No valid positions for unit ${unitUid}`
      );
      return false;
    }

    // Limit trail length
    const limitedPositions = validPositions.slice(-trailConfig.trailLength);
    this.trailData.set(unitUid, limitedPositions);

    // Create trail visualization
    this.updateTrailVisualization(unitUid);

    console.log(
      `Trail added for unit ${unitUid} with ${limitedPositions.length} positions`
    );
    return true;
  }

  /**
   * Update existing trail with new position
   * @param {string} unitUid - Unique identifier for the unit
   * @param {Object} newPosition - New position object {lat, lon, timestamp}
   */
  updateTrail(unitUid, newPosition) {
    if (!unitUid || !newPosition || !newPosition.lat || !newPosition.lon) {
      console.warn("TrackingManager.updateTrail: Invalid parameters");
      return false;
    }

    const config = this.getTrailConfig(unitUid);
    if (!config.enabled) {
      return false;
    }

    // Get or create trail data
    if (!this.trailData.has(unitUid)) {
      this.trailData.set(unitUid, []);
    }

    const trail = this.trailData.get(unitUid);

    // Add timestamp if not provided
    if (!newPosition.timestamp) {
      newPosition.timestamp = new Date().toISOString();
    }

    // Add new position
    trail.push({
      lat: parseFloat(newPosition.lat),
      lon: parseFloat(newPosition.lon),
      timestamp: newPosition.timestamp,
      speed: newPosition.speed || 0,
      course: newPosition.course || 0,
    });

    // Limit trail length
    if (trail.length > config.trailLength) {
      trail.splice(0, trail.length - config.trailLength);
    }

    // Queue update for performance
    this.queueTrailUpdate(unitUid);

    return true;
  }

  /**
   * Remove trail from map
   * @param {string} unitUid - Unique identifier for the unit
   */
  removeTrail(unitUid) {
    if (!unitUid) {
      console.warn("TrackingManager.removeTrail: Invalid unitUid");
      return false;
    }

    // Remove from map
    if (this.trails.has(unitUid)) {
      const polyline = this.trails.get(unitUid);
      this.map.trackingOverlay.removeLayer(polyline);
      this.trails.delete(unitUid);
    }

    // Clean up data
    this.trailData.delete(unitUid);
    this.trailConfigs.delete(unitUid);

    console.log(`Trail removed for unit ${unitUid}`);
    return true;
  }

  /**
   * Update trail configuration
   * @param {string} unitUid - Unique identifier for the unit
   * @param {Object} config - New configuration options
   */
  setTrailConfig(unitUid, config) {
    if (!unitUid || !config) {
      console.warn("TrackingManager.setTrailConfig: Invalid parameters");
      return false;
    }

    const currentConfig = this.getTrailConfig(unitUid);
    const newConfig = { ...currentConfig, ...config };

    this.trailConfigs.set(unitUid, newConfig);

    // Update trail length if changed
    if (config.trailLength && this.trailData.has(unitUid)) {
      const trail = this.trailData.get(unitUid);
      if (trail.length > config.trailLength) {
        trail.splice(0, trail.length - config.trailLength);
      }
    }

    // Update visualization
    this.updateTrailVisualization(unitUid);

    console.log(`Trail config updated for unit ${unitUid}`);
    return true;
  }

  /**
   * Clear all trails from map
   */
  clearAllTrails() {
    // Remove all polylines from map
    this.trails.forEach((polyline, unitUid) => {
      this.map.trackingOverlay.removeLayer(polyline);
    });

    // Clear all data
    this.trails.clear();
    this.trailData.clear();
    this.trailConfigs.clear();

    console.log("All trails cleared");
  }

  /**
   * Get trail configuration for a unit
   * @param {string} unitUid - Unique identifier for the unit
   * @returns {Object} Trail configuration
   */
  getTrailConfig(unitUid) {
    return this.trailConfigs.get(unitUid) || { ...this.defaultConfig };
  }

  /**
   * Get trail data for a unit
   * @param {string} unitUid - Unique identifier for the unit
   * @returns {Array} Array of position objects
   */
  getTrailData(unitUid) {
    return this.trailData.get(unitUid) || [];
  }

  /**
   * Get all active trails
   * @returns {Array} Array of trail objects with uid and data
   */
  getAllTrails() {
    const trails = [];
    this.trailData.forEach((data, unitUid) => {
      trails.push({
        unitUid,
        positions: data,
        config: this.getTrailConfig(unitUid),
      });
    });
    return trails;
  }

  /**
   * Update trail visualization on map
   * @param {string} unitUid - Unique identifier for the unit
   */
  updateTrailVisualization(unitUid) {
    const trail = this.trailData.get(unitUid);
    const config = this.getTrailConfig(unitUid);

    if (!trail || trail.length < 2 || !config.enabled) {
      // Remove trail if it exists but has insufficient data
      if (this.trails.has(unitUid)) {
        this.map.trackingOverlay.removeLayer(this.trails.get(unitUid));
        this.trails.delete(unitUid);
      }
      return;
    }

    // Convert to LatLng array
    const latlngs = trail.map((point) => [point.lat, point.lon]);

    // Create or update polyline
    if (!this.trails.has(unitUid)) {
      // Create new polyline
      const polyline = L.polyline(latlngs, {
        color: config.trailColor,
        weight: config.trailWidth,
        opacity: config.trailOpacity,
        smoothFactor: config.smoothUpdates ? 1.0 : 0,
        className: `tracking-trail tracking-trail-${unitUid}`,
      });

      // Add popup with trail info
      polyline.bindPopup(this.createTrailPopup(unitUid, trail));

      // Add to map
      polyline.addTo(this.map.trackingOverlay);
      this.trails.set(unitUid, polyline);
    } else {
      // Update existing polyline
      const polyline = this.trails.get(unitUid);
      polyline.setLatLngs(latlngs);
      polyline.setStyle({
        color: config.trailColor,
        weight: config.trailWidth,
        opacity: config.trailOpacity,
      });

      // Update popup
      polyline.setPopupContent(this.createTrailPopup(unitUid, trail));
    }
  }

  /**
   * Create popup content for trail
   * @param {string} unitUid - Unique identifier for the unit
   * @param {Array} trail - Trail data
   * @returns {string} HTML content for popup
   */
  createTrailPopup(unitUid, trail) {
    const config = this.getTrailConfig(unitUid);
    const startTime = trail.length > 0 ? new Date(trail[0].timestamp) : null;
    const endTime =
      trail.length > 0 ? new Date(trail[trail.length - 1].timestamp) : null;

    let content = `<div class="tracking-trail-popup" dir="rtl">`;
    content += `<h6><strong>رد: ${unitUid}</strong></h6>`;
    content += `<p><strong>تعداد نقاط:</strong> ${trail.length}</p>`;

    if (startTime && endTime) {
      content += `<p><strong>زمان:</strong> ${dt(startTime)} - ${dt(
        endTime
      )}</p>`;
    }

    if (trail.length > 1) {
      const distance = this.calculateTrailDistance(trail);
      content += `<p><strong>مسافت:</strong> ${distance.toFixed(1)} km</p>`;
    }

    content += `</div>`;

    return content;
  }

  /**
   * Calculate total distance of trail
   * @param {Array} trail - Trail data
   * @returns {number} Distance in kilometers
   */
  calculateTrailDistance(trail) {
    if (trail.length < 2) return 0;

    let totalDistance = 0;
    for (let i = 1; i < trail.length; i++) {
      const p1 = L.latLng(trail[i - 1].lat, trail[i - 1].lon);
      const p2 = L.latLng(trail[i].lat, trail[i].lon);
      totalDistance += p1.distanceTo(p2);
    }

    return totalDistance / 1000; // Convert to kilometers
  }

  /**
   * Queue trail update for performance optimization
   * @param {string} unitUid - Unique identifier for the unit
   */
  queueTrailUpdate(unitUid) {
    this.updateQueue.add(unitUid);

    if (!this.isUpdating) {
      this.isUpdating = true;
      requestAnimationFrame(() => {
        this.processUpdateQueue();
      });
    }
  }

  /**
   * Process queued trail updates
   */
  processUpdateQueue() {
    this.updateQueue.forEach((unitUid) => {
      this.updateTrailVisualization(unitUid);
    });

    this.updateQueue.clear();
    this.isUpdating = false;
  }

  /**
   * Clean up old trail data
   */
  cleanupOldTrails() {
    const now = new Date();
    const maxAge = this.defaultConfig.maxAge;

    this.trailData.forEach((trail, unitUid) => {
      const filteredTrail = trail.filter((point) => {
        const pointAge = now - new Date(point.timestamp);
        return pointAge <= maxAge;
      });

      if (filteredTrail.length !== trail.length) {
        if (filteredTrail.length === 0) {
          this.removeTrail(unitUid);
        } else {
          this.trailData.set(unitUid, filteredTrail);
          this.updateTrailVisualization(unitUid);
        }
      }
    });
  }

  /**
   * Handle WebSocket tracking update message
   * @param {Object} data - WebSocket message data
   */
  handleTrackingUpdate(data) {
    if (!data || data.type !== "tracking_update") {
      return;
    }

    const { unit_uid, latitude, longitude, timestamp, speed, course } =
      data.tracking_update;

    if (!unit_uid || !latitude || !longitude) {
      console.warn(
        "TrackingManager.handleTrackingUpdate: Invalid tracking data",
        data
      );
      return;
    }

    this.updateTrail(unit_uid, {
      lat: latitude,
      lon: longitude,
      timestamp: timestamp || new Date().toISOString(),
      speed: speed || 0,
      course: course || 0,
    });
  }

  /**
   * Enable/disable tracking globally
   * @param {boolean} enabled - Whether tracking is enabled
   */
  setTrackingEnabled(enabled) {
    this.trackingEnabled = enabled;

    if (!enabled) {
      // Hide all trails
      this.trails.forEach((polyline) => {
        polyline.setStyle({ opacity: 0 });
      });
    } else {
      // Show all trails
      this.trails.forEach((polyline, unitUid) => {
        const config = this.getTrailConfig(unitUid);
        polyline.setStyle({ opacity: config.trailOpacity });
      });
    }

    console.log(`Tracking ${enabled ? "enabled" : "disabled"}`);
  }

  /**
   * Get tracking status
   * @returns {boolean} Whether tracking is enabled
   */
  isTrackingEnabled() {
    return this.trackingEnabled;
  }

  /**
   * Export trail data for a unit
   * @param {string} unitUid - Unique identifier for the unit
   * @param {string} format - Export format ('json', 'csv', 'gpx')
   * @returns {string} Exported data
   */
  exportTrailData(unitUid, format = "json") {
    const trail = this.getTrailData(unitUid);
    const config = this.getTrailConfig(unitUid);

    if (trail.length === 0) {
      console.warn(`داده‌ای برای ردگیری واحد ${unitUid} یافت نشد`);
      return null;
    }

    switch (format.toLowerCase()) {
      case "json":
        return JSON.stringify(
          {
            unitUid,
            config,
            positions: trail,
            exportedAt: new Date().toISOString(),
          },
          null,
          2
        );

      case "csv":
        let csv = "timestamp,latitude,longitude,speed,course\n";
        trail.forEach((point) => {
          csv += `${point.timestamp},${point.lat},${point.lon},${
            point.speed || 0
          },${point.course || 0}\n`;
        });
        return csv;

      case "gpx":
        // Basic GPX export
        let gpx = '<?xml version="1.0" encoding="UTF-8"?>\n';
        gpx += '<gpx version="1.1" creator="GoATAK Tracking">\n';
        gpx += `<trk><name>Trail ${unitUid}</name><trkseg>\n`;
        trail.forEach((point) => {
          gpx += `<trkpt lat="${point.lat}" lon="${point.lon}">`;
          gpx += `<time>${point.timestamp}</time>`;
          if (point.speed) gpx += `<speed>${point.speed}</speed>`;
          gpx += `</trkpt>\n`;
        });
        gpx += "</trkseg></trk></gpx>";
        return gpx;

      default:
        console.warn(`فرمت خروجی پشتیبانی نمی‌شود: ${format}`);
        return null;
    }
  }

  /**
   * Import trail data for a unit
   * @param {string} unitUid - Unique identifier for the unit
   * @param {string} data - Import data
   * @param {string} format - Import format ('json', 'csv')
   * @returns {boolean} Success status
   */
  importTrailData(unitUid, data, format = "json") {
    try {
      let positions = [];
      let config = {};

      switch (format.toLowerCase()) {
        case "json":
          const parsed = JSON.parse(data);
          positions = parsed.positions || [];
          config = parsed.config || {};
          break;

        case "csv":
          const lines = data.split("\n");
          const headers = lines[0].split(",");

          for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(",");
            if (values.length >= 3) {
              positions.push({
                timestamp: values[0],
                lat: parseFloat(values[1]),
                lon: parseFloat(values[2]),
                speed: parseFloat(values[3]) || 0,
                course: parseFloat(values[4]) || 0,
              });
            }
          }
          break;

        default:
          console.warn(`فرمت ورودی پشتیبانی نمی‌شود: ${format}`);
          return false;
      }

      return this.addTrail(unitUid, positions, config);
    } catch (error) {
      console.error("خطا در ورود داده‌های رد:", error);
      return false;
    }
  }

  /**
   * Destroy the tracking manager and clean up resources
   */
  destroy() {
    // Clear cleanup interval
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    // Clear all trails
    this.clearAllTrails();

    // Remove tracking overlay
    if (this.map.trackingOverlay) {
      this.map.removeLayer(this.map.trackingOverlay);
      delete this.map.trackingOverlay;
    }

    console.log("TrackingManager destroyed");
  }
}

export default TrackingManager;
