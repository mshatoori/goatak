import { ref } from 'vue';
import L from 'leaflet';
import { generateUUID } from '../utils'; // For generating drawing UIDs

export function useDrawingTools(mapRef, overlaysRef, measurementLayerRef, drawControlRef, onDrawingCreated, onDrawingEdited, onDrawingDeleted) {
    
    const currentToolMode = ref(null);

    // --- Tool Activation & Management ---    
    function setMapCursor(cursorStyle) {
        if (mapRef.value && mapRef.value.getContainer()) {
            mapRef.value.getContainer().style.cursor = cursorStyle || '';
        }
    }

    function cancelCurrentToolMode() {
        const mode = currentToolMode.value;
        console.log("[DrawingTools] Cancelling current tool mode:", mode);
        currentToolMode.value = null;
        setMapCursor('');

        // Disable any active draw handlers
        if (drawControlRef.value && drawControlRef.value._toolbars?.draw?._modes) {
            for (const key in drawControlRef.value._toolbars.draw._modes) {
                drawControlRef.value._toolbars.draw._modes[key].handler.disable();
            }
        }

        // Clear temporary measurement layers if cancelling measure mode
        if (mode === 'measure' && measurementLayerRef.value) {
            measurementLayerRef.value.clearLayers();
        }
        // TODO: Remove visual feedback from buttons in App.vue if needed
    }

    function startDistanceMeasure() {
        if (currentToolMode.value === 'measure') {
            if (measurementLayerRef.value) measurementLayerRef.value.clearLayers();
            console.log("[DrawingTools] Restarting distance measurement.");
            // Ensure the handler is re-enabled if it was somehow disabled
        } else {
            cancelCurrentToolMode();
            console.log("[DrawingTools] MODE: Start Distance Measurement");
            currentToolMode.value = 'measure';
        }

        if (window.L && mapRef.value && drawControlRef.value?.options?.draw?.polyline) {
            try {
                 // Ensure the handler instance exists before enabling
                const polylineHandler = new L.Draw.Polyline(mapRef.value, drawControlRef.value.options.draw.polyline);
                polylineHandler.enable();
                setMapCursor('crosshair');
            } catch (error) {
                 console.error("[DrawingTools] Error enabling Polyline draw handler:", error);
                 cancelCurrentToolMode(); // Reset mode if enable fails
            }
        } else {
            console.error("[DrawingTools] Cannot start distance measure: L, map, or drawControlRef/polyline options not available.");
        }
    }

    function startAddPointMode() {
        if (currentToolMode.value === 'addPoint') {
            cancelCurrentToolMode();
            return;
        }
        cancelCurrentToolMode();
        console.log("[DrawingTools] MODE: Start Add Generic Point");
        currentToolMode.value = 'addPoint';
        setMapCursor('crosshair');
        // No Leaflet.Draw handler needs enabling here; handled by map click in App.vue
    }

    // --- Leaflet Draw Event Handlers ---    
    function handleDrawCreated(e) {
        const type = e.layerType;
        const layer = e.layer;

        if (currentToolMode.value === 'measure' && type === 'polyline') {
            console.log("[DrawingTools] Measure Polyline Created:", layer);
            // Calculate distance
            const latlngs = layer.getLatLngs();
            let totalDistance = 0;
            if (mapRef.value && latlngs.length > 1) {
                 for (let i = 0; i < latlngs.length - 1; i++) {
                    totalDistance += mapRef.value.distance(latlngs[i], latlngs[i + 1]);
                }
            }
            const distanceStr = totalDistance < 1000 ? `${totalDistance.toFixed(0)} m` : `${(totalDistance / 1000).toFixed(2)} km`;
            console.log("[DrawingTools] Calculated Distance:", distanceStr);

            // Add to the temporary measurement layer
            if (measurementLayerRef.value) {
                 measurementLayerRef.value.addLayer(layer);
            } else {
                 console.error("[DrawingTools] Measurement layer ref not available.");
            }
            layer.bindTooltip(`Distance: ${distanceStr}`, { permanent: true, direction: 'center' }).openTooltip();

            // Keep the measurement tool active, but disable the *current* draw instance
            // This allows starting a new measurement without explicitly cancelling.
            if (e.drawControl) { // Check if drawControl is passed in event (might not be standard)
                // e.drawControl._toolbars.draw._activeMode.handler.disable(); // Risky internal access
            } else if (drawControlRef.value) {
                 // Attempt to disable the specific handler instance if possible
                 // This might require finding the active handler more reliably
                 console.warn("[DrawingTools] Disabling draw handler after measurement - check reliability.");
                 // Re-enable the main button? Depends on desired UX.
            }
            setMapCursor('crosshair'); // Keep cursor for next measurement click

        } else if (currentToolMode.value !== 'measure') { // Handle permanent drawings
            console.log('[DrawingTools] Draw Created (Permanent Drawing): ', type, layer);
            let lat, lon;
            let coords = [];

            try {
                if (type === 'polygon' && layer.getLatLngs) {
                    const latlngs = layer.getLatLngs()[0]; // Main ring
                    coords = latlngs.map(ll => [ll.lat, ll.lng]);
                    const center = layer.getBounds().getCenter();
                    lat = center.lat;
                    lon = center.lng;
                } else if (type === 'polyline' && layer.getLatLngs) {
                    const latlngs = layer.getLatLngs();
                    coords = latlngs.map(ll => [ll.lat, ll.lng]);
                    if (latlngs.length > 0) {
                        lat = latlngs[0].lat;
                        lon = latlngs[0].lng;
                    } else return; // Should not happen
                } else {
                    console.warn("[DrawingTools] Unhandled drawing type or invalid layer:", type);
                    return;
                }

                const drawingUnitData = {
                    uid: generateUUID(),
                    category: 'drawing',
                    type: type, 
                    callsign: `Drawing ${Date.now()}`, 
                    lat: lat,
                    lon: lon,
                    points: coords, 
                    timestamp: new Date().toISOString(),
                    text: '',
                    color: type === 'polygon' ? '#bada55' : '#f357a1'
                };

                // Attach UID to the leaflet layer for later identification
                layer.unit_uid = drawingUnitData.uid;
                layer.category = 'drawing'; // Ensure category is set

                // Add the layer to the permanent drawing layer group
                if (overlaysRef.value?.drawing?.layerGroup) {
                    overlaysRef.value.drawing.layerGroup.addLayer(layer);
                } else {
                     console.error("[DrawingTools] Drawing layer group not available.");
                     // Optionally remove the created layer from the map if it can't be added?
                     // mapRef.value?.removeLayer(layer);
                     return;
                }

                // Call the callback provided by App.vue
                if (onDrawingCreated && typeof onDrawingCreated === 'function') {
                    onDrawingCreated(drawingUnitData); 
                }

            } catch (error) {
                 console.error("[DrawingTools] Error processing created drawing:", error, layer);
                 // Clean up partially created layer?
                 if (mapRef.value && layer) mapRef.value.removeLayer(layer);
            }

             // Always cancel the drawing mode after creation of a permanent item
            cancelCurrentToolMode(); 

        } else {
             console.log("[DrawingTools] Ignoring draw:created event, likely in measurement mode or unexpected state.");
             // Potentially cancel mode here too?
             // cancelCurrentToolMode(); 
        }
    }

    function handleDrawEdited(e) {
        const layers = e.layers;
        console.log('[DrawingTools] Draw Edited:', layers);
        const editedLayersInfo = [];

        layers.eachLayer(function (layer) {
            const uid = layer.unit_uid;
            if (!uid || layer.category !== 'drawing') {
                console.warn("[DrawingTools] Edited layer is not a drawing or has no unit_uid:", layer);
                return; // Skip non-drawing layers or those without UID
            }

            let newLat, newLon;
            let newCoords = [];
            let layerType = null;

            try {
                 if (layer instanceof L.Polygon && layer.getLatLngs) {
                    layerType = 'polygon';
                    const latlngs = layer.getLatLngs()[0];
                    newCoords = latlngs.map(ll => [ll.lat, ll.lng]);
                    const center = layer.getBounds().getCenter();
                    newLat = center.lat;
                    newLon = center.lng;
                } else if (layer instanceof L.Polyline && layer.getLatLngs) {
                    layerType = 'polyline';
                    const latlngs = layer.getLatLngs();
                    newCoords = latlngs.map(ll => [ll.lat, ll.lng]);
                    if (latlngs.length > 0) {
                        newLat = latlngs[0].lat;
                        newLon = latlngs[0].lng;
                    } else { // Should not happen for an edited layer
                         console.warn("[DrawingTools] Edited polyline has no points? UID:", uid);
                         return; 
                    }
                } else {
                    console.warn("[DrawingTools] Edited layer type not handled:", layer);
                    return; // Skip unhandled types
                }

                 editedLayersInfo.push({ 
                     uid: uid, 
                     newCoords: newCoords, 
                     newLat: newLat, 
                     newLon: newLon,
                     layerType: layerType 
                 });

            } catch (error) {
                 console.error("[DrawingTools] Error processing edited layer UID:", uid, error, layer);
            }
        });

        // If any layers were successfully processed, call the callback
        if (editedLayersInfo.length > 0 && onDrawingEdited && typeof onDrawingEdited === 'function') {
             onDrawingEdited(editedLayersInfo); // Pass array of info objects
        }
    }

    function handleDrawDeleted(e) {
        const layers = e.layers;
        console.log('[DrawingTools] Draw Deleted:', layers);
        const deletedLayerUids = [];

        layers.eachLayer(function (layer) {
            const uid = layer.unit_uid;
            if (uid && layer.category === 'drawing') {
                deletedLayerUids.push(uid);
            } else {
                 console.warn("[DrawingTools] Deleted layer is not a drawing or has no unit_uid:", layer);
            }
        });

        // Call the callback if any drawing UIDs were collected
        if (deletedLayerUids.length > 0 && onDrawingDeleted && typeof onDrawingDeleted === 'function') {
            onDrawingDeleted({ uids: deletedLayerUids });
        }
    }

    // --- Event Listener Registration ---    
    function registerDrawEventListeners() {
         if (!mapRef.value) {
            console.error("[DrawingTools] Cannot register listeners: Map not available.");
            return;
         }
         // Make sure handlers are defined before registering
         if (typeof handleDrawCreated !== 'function' || typeof handleDrawEdited !== 'function' || typeof handleDrawDeleted !== 'function') {
            console.error("[DrawingTools] Draw handlers not properly defined.");
            return;
         }
         
         console.log("[DrawingTools] Registering Leaflet Draw event listeners.");
         mapRef.value.on(L.Draw.Event.CREATED, handleDrawCreated);
         mapRef.value.on(L.Draw.Event.EDITED, handleDrawEdited);
         mapRef.value.on(L.Draw.Event.DELETED, handleDrawDeleted);
    }
    
    function removeDrawEventListeners() {
        if (!mapRef.value) {
           // console.log("[DrawingTools] Map not available, cannot remove listeners.");
           return;
        }
        console.log("[DrawingTools] Removing Leaflet Draw event listeners.");
        mapRef.value.off(L.Draw.Event.CREATED, handleDrawCreated);
        mapRef.value.off(L.Draw.Event.EDITED, handleDrawEdited);
        mapRef.value.off(L.Draw.Event.DELETED, handleDrawDeleted);
    }

    // --- Exposed Functions & State ---    
    return {
        // State
        currentToolMode, // Expose if needed externally (e.g., for button styling)
        
        // Methods
        startDistanceMeasure,
        startAddPointMode,
        cancelCurrentToolMode,
        registerDrawEventListeners,
        removeDrawEventListeners
    };
} 