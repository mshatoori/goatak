import { ref } from 'vue';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw';
import 'leaflet-draw/dist/leaflet.draw.css';
import { LocationControl } from '../leaflet-controls/LocationControl.js';
import { ToolsControl } from '../leaflet-controls/ToolsControl.js';

// Define the custom icon for the self marker outside the composable function
// as it's a constant configuration
const selfIcon = L.icon({
    iconUrl: '/src/assets/icons/self.png', // Ensure this path is correct relative to your build process/public folder
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12]
});

export function useMapInitialization(locateByGpsCallback, measureCallback, addPointCallback, openSensorsCallback) {
    // Refs to hold map-related instances and state
    const map = ref(null);
    const selfMarker = ref(null);
    const drawnItems = ref(null);
    const drawControlRef = ref(null);
    const measurementLayer = ref(null);
    const overlays = ref({
        contact: { active: true, layerGroup: L.layerGroup() },
        unit:    { active: true, layerGroup: L.layerGroup() },
        point:   { active: true, layerGroup: L.layerGroup() },
        drawing: { active: true, layerGroup: L.featureGroup() }, // Use FeatureGroup for editing
        alarm:   { active: true, layerGroup: L.layerGroup() }
    });

    // The initialization function, takes the map container ID
    const initializeMap = (mapId) => {
        if (map.value) { 
            console.warn("Map already initialized.");
            return; 
        }

        map.value = L.map(mapId, {
            center: [35.7219, 51.3347],
            zoom: 13,
            zoomControl: false,
            attributionControl: false // Optionally disable default attribution
        });

        // Add tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map.value);

        // Add overlay layer groups to map if active
        for (const key in overlays.value) {
            if (overlays.value[key].active) {
                overlays.value[key].layerGroup.addTo(map.value);
            }
        }

        // Assign the drawing layer group to drawnItems ref
        drawnItems.value = overlays.value.drawing.layerGroup;

        // Initialize the self marker
        selfMarker.value = L.marker([0, 0], { icon: selfIcon, zIndexOffset: 1000 }); // Start at 0,0 
        selfMarker.value.addTo(map.value);
        selfMarker.value.bindPopup("Loading position...");

        // Initialize the measurement layer group
        measurementLayer.value = L.layerGroup().addTo(map.value);

        // Add standard controls
        L.control.zoom({ position: 'bottomright' }).addTo(map.value);
        L.control.scale({ imperial: false }).addTo(map.value);
        L.control.attribution({ position: 'bottomleft' }).addTo(map.value); // Add attribution control

        // Add custom controls, passing the callbacks provided to the composable
        new LocationControl({}, locateByGpsCallback).addTo(map.value);
        new ToolsControl({}, {
            measure: measureCallback,
            addPoint: addPointCallback,
            openSensors: openSensorsCallback
        }).addTo(map.value);

        // Initialize the draw control
        drawControlRef.value = new L.Control.Draw({
            edit: {
                featureGroup: drawnItems.value // Edit the drawing layer group
            },
            draw: {
                polygon: { shapeOptions: { color: '#bada55' }, allowIntersection: false },
                polyline: { shapeOptions: { color: '#f357a1', weight: 10 } },
                // Disable buttons for tools activated programmatically
                circle: false, rectangle: false, marker: false, circlemarker: false
            }
        });
        map.value.addControl(drawControlRef.value);

        console.log("Map initialized by composable.");
    };

    // Return the refs and the initialization function
    return {
        map,
        selfMarker,
        overlays,
        drawnItems,
        measurementLayer,
        drawControlRef,
        initializeMap
    };
} 