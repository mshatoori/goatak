/**
 * TrackingManager Demo and Usage Examples
 *
 * This file demonstrates how to use the TrackingManager for trail visualization
 * and provides example functions for testing the tracking functionality.
 */

// Demo functions for testing TrackingManager functionality
window.TrackingDemo = {
  /**
   * Initialize demo with sample trail data
   */
  initDemo: function () {
    if (!app || !app.trackingManager) {
      console.error("TrackingManager not available");
      return;
    }

    console.log("Initializing TrackingManager demo...");

    // Create sample trail data for demonstration
    this.createSampleTrails();

    // Set up demo controls
    this.setupDemoControls();

    console.log("TrackingManager demo initialized");
  },

  /**
   * Create sample trail data for testing
   */
  createSampleTrails: function () {
    const trackingManager = app.trackingManager;

    // Sample trail 1: Moving east
    const trail1 = this.generateTrailData(35.7, 51.4, 0.01, 0, 20);
    trackingManager.addTrail("demo-unit-1", trail1, {
      trailColor: "#FF0000",
      trailWidth: 3,
      trailLength: 20,
    });

    // Sample trail 2: Moving north
    const trail2 = this.generateTrailData(35.7, 51.4, 0, 0.01, 15);
    trackingManager.addTrail("demo-unit-2", trail2, {
      trailColor: "#00FF00",
      trailWidth: 2,
      trailLength: 15,
    });

    // Sample trail 3: Circular movement
    const trail3 = this.generateCircularTrail(35.72, 51.42, 0.005, 25);
    trackingManager.addTrail("demo-unit-3", trail3, {
      trailColor: "#0000FF",
      trailWidth: 4,
      trailLength: 25,
    });

    console.log("Sample trails created");
  },

  /**
   * Generate linear trail data
   */
  generateTrailData: function (startLat, startLon, deltaLat, deltaLon, points) {
    const trail = [];
    const now = new Date();

    for (let i = 0; i < points; i++) {
      trail.push({
        lat: startLat + deltaLat * i,
        lon: startLon + deltaLon * i,
        timestamp: new Date(now.getTime() - (points - i) * 30000).toISOString(), // 30 seconds apart
        speed: Math.random() * 20 + 5, // 5-25 m/s
        course: Math.random() * 360,
      });
    }

    return trail;
  },

  /**
   * Generate circular trail data
   */
  generateCircularTrail: function (centerLat, centerLon, radius, points) {
    const trail = [];
    const now = new Date();

    for (let i = 0; i < points; i++) {
      const angle = (i / points) * 2 * Math.PI;
      trail.push({
        lat: centerLat + radius * Math.cos(angle),
        lon: centerLon + radius * Math.sin(angle),
        timestamp: new Date(now.getTime() - (points - i) * 45000).toISOString(), // 45 seconds apart
        speed: Math.random() * 15 + 10, // 10-25 m/s
        course: ((angle * 180) / Math.PI + 90) % 360, // Tangent to circle
      });
    }

    return trail;
  },

  /**
   * Set up demo control functions
   */
  setupDemoControls: function () {
    // Add demo controls to window for console access
    window.trackingDemo = {
      // Add a new random trail
      addRandomTrail: () => {
        const unitId = "demo-unit-" + Date.now();
        const trail = this.generateTrailData(
          35.7 + (Math.random() - 0.5) * 0.1,
          51.4 + (Math.random() - 0.5) * 0.1,
          (Math.random() - 0.5) * 0.02,
          (Math.random() - 0.5) * 0.02,
          Math.floor(Math.random() * 30) + 10
        );

        app.trackingManager.addTrail(unitId, trail, {
          trailColor: this.getRandomColor(),
          trailWidth: Math.floor(Math.random() * 5) + 1,
          trailLength: trail.length,
        });

        console.log(`Added random trail: ${unitId}`);
      },

      // Clear all demo trails
      clearDemo: () => {
        app.trackingManager.clearAllTrails();
        console.log("Demo trails cleared");
      },

      // Simulate real-time updates
      startSimulation: () => {
        if (this.simulationInterval) {
          clearInterval(this.simulationInterval);
        }

        this.simulationInterval = setInterval(() => {
          const trails = app.trackingManager.getAllTrails();
          trails.forEach((trail) => {
            if (trail.unitUid.startsWith("demo-unit-")) {
              const lastPos = trail.positions[trail.positions.length - 1];
              const newPos = {
                lat: lastPos.lat + (Math.random() - 0.5) * 0.001,
                lon: lastPos.lon + (Math.random() - 0.5) * 0.001,
                timestamp: new Date().toISOString(),
                speed: Math.random() * 20 + 5,
                course: Math.random() * 360,
              };

              app.trackingManager.updateTrail(trail.unitUid, newPos);
            }
          });
        }, 5000); // Update every 5 seconds

        console.log("Real-time simulation started");
      },

      // Stop simulation
      stopSimulation: () => {
        if (this.simulationInterval) {
          clearInterval(this.simulationInterval);
          this.simulationInterval = null;
          console.log("Real-time simulation stopped");
        }
      },

      // Export all demo data
      exportDemo: () => {
        const trails = app.trackingManager.getAllTrails();
        const demoData = {
          exportedAt: new Date().toISOString(),
          trails: trails.filter((t) => t.unitUid.startsWith("demo-unit-")),
        };

        const dataStr = JSON.stringify(demoData, null, 2);
        const blob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "tracking-demo-data.json";
        link.click();
        URL.revokeObjectURL(url);

        console.log("Demo data exported");
      },

      // Show tracking statistics
      showStats: () => {
        const trails = app.trackingManager.getAllTrails();
        const demoTrails = trails.filter((t) =>
          t.unitUid.startsWith("demo-unit-")
        );

        console.log("=== Tracking Demo Statistics ===");
        console.log(`Total demo trails: ${demoTrails.length}`);

        demoTrails.forEach((trail) => {
          const distance = this.calculateDistance(trail.positions);
          const duration = this.calculateDuration(trail.positions);

          console.log(`${trail.unitUid}:`);
          console.log(`  Points: ${trail.positions.length}`);
          console.log(`  Distance: ${distance.toFixed(2)} km`);
          console.log(`  Duration: ${duration.toFixed(1)} minutes`);
          console.log(`  Color: ${trail.config.trailColor}`);
        });
      },
    };

    console.log("Demo controls available as window.trackingDemo");
    console.log("Available commands:");
    console.log("  trackingDemo.addRandomTrail() - Add a random trail");
    console.log("  trackingDemo.clearDemo() - Clear all demo trails");
    console.log("  trackingDemo.startSimulation() - Start real-time updates");
    console.log("  trackingDemo.stopSimulation() - Stop real-time updates");
    console.log("  trackingDemo.exportDemo() - Export demo data");
    console.log("  trackingDemo.showStats() - Show trail statistics");
  },

  /**
   * Get a random color for trails
   */
  getRandomColor: function () {
    const colors = [
      "#FF0000",
      "#00FF00",
      "#0000FF",
      "#FFFF00",
      "#FF00FF",
      "#00FFFF",
      "#FFA500",
      "#800080",
      "#008000",
      "#000080",
      "#800000",
      "#808000",
      "#FF6B6B",
      "#4ECDC4",
      "#45B7D1",
      "#96CEB4",
      "#FFEAA7",
      "#DDA0DD",
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  },

  /**
   * Calculate total distance of a trail
   */
  calculateDistance: function (positions) {
    if (positions.length < 2) return 0;

    let totalDistance = 0;
    for (let i = 1; i < positions.length; i++) {
      const p1 = L.latLng(positions[i - 1].lat, positions[i - 1].lon);
      const p2 = L.latLng(positions[i].lat, positions[i].lon);
      totalDistance += p1.distanceTo(p2);
    }

    return totalDistance / 1000; // Convert to kilometers
  },

  /**
   * Calculate duration of a trail
   */
  calculateDuration: function (positions) {
    if (positions.length < 2) return 0;

    const start = new Date(positions[0].timestamp);
    const end = new Date(positions[positions.length - 1].timestamp);

    return (end - start) / 60000; // Convert to minutes
  },

  simulationInterval: null,
};

// Auto-initialize demo when page loads (optional)
document.addEventListener("DOMContentLoaded", function () {
  // Uncomment the next line to auto-start demo
  // setTimeout(() => TrackingDemo.initDemo(), 2000);
});

console.log("TrackingDemo loaded. Call TrackingDemo.initDemo() to start demo.");
