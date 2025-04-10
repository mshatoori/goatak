import L from 'leaflet';
import { getIcon } from '../mapUtils';

// Helper function (can be kept outside the main composable function if stateless)
function latLongToIso6709(lat, lon) {
    if (lat == null || lon == null) return 'N/A';
    const ns = lat >= 0 ? 'N' : 'S';
    const ew = lon >= 0 ? 'E' : 'W';
    return `${Math.abs(lat).toFixed(6)}${ns}${Math.abs(lon).toFixed(6)}${ew}`;
}

export function useMarkerManager(mapRef, overlaysRef, selfMarkerRef, openMessagesModalCallback, openEditUnitModalCallback, setCurrentUnitForDeletionCallback) {

    // --- Marker Finding ---    
    function findMarkerByUnit(unit) {
        if (!unit || !unit.uid || !overlaysRef || !overlaysRef.value) return null;
        let found = null;
        const categoriesToSearch = ['unit', 'contact', 'point', 'alarm']; 

        for (const category of categoriesToSearch) {
            const layerGroup = overlaysRef.value[category]?.layerGroup;
            if (layerGroup) {
                // Use window.L for safety if L instance might be tricky
                layerGroup.eachLayer((layer) => {
                    if (window.L && layer instanceof window.L.Marker && layer.unit?.uid === unit.uid) {
                        found = layer;
                        return false; // Stop iteration
                    }
                });
            }
            if (found) break;
        }
        return found;
    }

    // --- Popup Content Creation ---    
    function createUnitPopupContent(unit) {
        return `
            <div class="unit-popup">
                <h6>${unit.callsign || unit.uid}</h6>
                <p>Team: ${unit.team || 'N/A'}</p>
                <p>Role: ${unit.role || 'N/A'}</p>
                <p>Speed: ${unit.speed != null ? (unit.speed * 3.6).toFixed(1) + ' km/h' : 'N/A'}</p>
                <p>Altitude: ${unit.altitude != null ? unit.altitude.toFixed(0) + ' m' : 'N/A'}</p>
                <p>Coordinates: ${latLongToIso6709(unit.lat, unit.lon)}</p>
            </div>
        `;
    }

    function createSelfPopupContent(cfg) {
        return `
            <div class="unit-popup">
                <h6>${cfg.callsign || 'Self'} (You)</h6>
                <p>Team: ${cfg.team || 'N/A'}</p>
                <p>Role: ${cfg.role || 'N/A'}</p>
                <p>Coordinates: ${latLongToIso6709(cfg.lat, cfg.lon)}</p>
            </div>
        `;
    }

    // --- Context Menu ---    
    function handleContextMenuClick(event) {
        const target = event.target;
        if (target && target.tagName === 'BUTTON' && target.dataset.action) {
            const action = target.dataset.action;
            const uid = target.dataset.uid;
            console.log(`Context menu action: ${action}, UID: ${uid}`);
    
            if (!uid) return;
    
            // Find the marker associated with this popup event if possible (might need refinement)
            // This assumes the popup is still attached to the marker that triggered it.
            // A more robust way might involve searching the map's popups or attaching UID differently.
            let unitData = null;
            if (event.target?.closest) {
                const popupElement = event.target.closest('.leaflet-popup-content');
                // How to get back to the marker/unit data reliably from here?
                // Option 1: Search store (requires importing store)
                // Option 2: Find the marker the popup is bound to (if possible)
                // Option 3: Pass unit data directly when setting up the listener (better)
                // Let's assume for now we can retrieve unit data via UID somehow
                // We need the full unit object for the callbacks.
                 // **** TEMPORARY/INCOMPLETE: Need a reliable way to get unit object ****
                console.warn("Need reliable way to get unit data in handleContextMenuClick");
                 // const unit = store.state.items.get(uid); // Requires importing store
                 // For now, we'll pass null and rely on callbacks handling it
                 unitData = { uid: uid, callsign: 'Unknown' }; // Placeholder

            }
             if (!unitData) {
                 console.error("Could not retrieve unit data for context menu action");
                 return;
             }

            // Close the popup
            if (mapRef.value) {
                 mapRef.value.closePopup();
            }
    
            // Call the appropriate action handler passed from App.vue
            if (action === 'message' && openMessagesModalCallback) {
                openMessagesModalCallback(unitData); // Pass the full unit object
            } else if (action === 'edit' && openEditUnitModalCallback) {
                openEditUnitModalCallback(unitData); // Pass the full unit object
            } else if (action === 'delete' && setCurrentUnitForDeletionCallback) {
                // Confirmation is good practice here
                if (confirm(`Are you sure you want to delete ${unitData.callsign || uid}?`)) {
                    setCurrentUnitForDeletionCallback(unitData); // Pass the full unit object
                }
            }
        }
    }

    function showContextMenuPopup(marker) {
        if (!marker || !marker.unit || !mapRef.value) return;
        
        const unit = marker.unit; // Unit data is attached to the marker
        const uid = unit.uid;
      
        // Avoid reopening if already open with the context menu
        if (marker.isPopupOpen() && marker.getPopup().getContent().includes('context-menu-actions')) {
            return;
        }
      
        const popupContent = `
          <div class="context-menu-actions" data-marker-uid="${uid}"> <!-- Add UID for potential retrieval -->
            <h6>${unit.callsign || uid}</h6>
            <button class="btn btn-sm btn-primary w-100 mb-1" data-action="message" data-uid="${uid}">Send Message</button>
            <button class="btn btn-sm btn-secondary w-100 mb-1" data-action="edit" data-uid="${uid}">Edit</button>
            <button class="btn btn-sm btn-danger w-100" data-action="delete" data-uid="${uid}">Delete</button>
          </div>
        `;
      
        marker.bindPopup(popupContent, { 
            closeButton: true, 
            minWidth: 150 
        }).openPopup();
      
        // Add event listener AFTER the popup is opened and content is in the DOM
        marker.getPopup().on('add', function () {
          const popupElement = this.getElement();
          if (popupElement) {
            // Attach the specific context menu handler from the composable
            popupElement.addEventListener('click', handleContextMenuClick);
          }
        });
      
        // Remove listener when popup closes
        marker.getPopup().on('remove', function () {
           const popupElement = this.getElement();
           if (popupElement) {
              popupElement.removeEventListener('click', handleContextMenuClick);
           }
        });
    }

    // --- Marker CRUD ---    
    function addUnitMarker(unit) {
        if (!unit || !overlaysRef || !overlaysRef.value) return;
        const category = unit.category || 'unit';
        const layerGroup = overlaysRef.value[category]?.layerGroup;

        if (!layerGroup) {
            console.warn(`[MarkerManager] No layer group found for category: ${category}`);
            return;
        }

        const icon = getIcon(unit, true);
        if (!icon) {
            console.error("[MarkerManager] Failed to get icon for unit (using default):", unit);
        }

        const marker = L.marker([unit.lat, unit.lon], {
            icon: icon
        });
        
        marker.category = category;
        marker.unit = unit;
        marker.bindPopup(createUnitPopupContent(unit));

        marker.on('contextmenu', (e) => {
            L.DomEvent.preventDefault(e.originalEvent);
            L.DomEvent.stopPropagation(e.originalEvent);
            showContextMenuPopup(e.target);
        });

        layerGroup.addLayer(marker);
    }

    function updateUnitMarker(unit) {
        if (!unit || !overlaysRef || !overlaysRef.value) return;
        const marker = findMarkerByUnit(unit);
        if (marker) {
            const oldLatLng = marker.getLatLng();
            const newLatLng = L.latLng(unit.lat, unit.lon);
            
            if (!oldLatLng.equals(newLatLng, 0.00001)) { 
                marker.setLatLng(newLatLng);
            }

            const icon = getIcon(unit, true);
            marker.setIcon(icon);

            marker.unit = unit;
            marker.setPopupContent(createUnitPopupContent(unit));

            const category = unit.category || 'unit';
            const currentGroup = overlaysRef.value[marker.category]?.layerGroup;
            const targetGroup = overlaysRef.value[category]?.layerGroup;
            if (targetGroup && currentGroup !== targetGroup) {
                console.warn(`[MarkerManager] Category changed for ${unit.uid}. Moving marker.`);
                currentGroup?.removeLayer(marker);
                targetGroup.addLayer(marker);
                marker.category = category;
            }
        } else {
             console.warn(`[MarkerManager] Marker not found for update, adding new one for ${unit.uid}`);
             addUnitMarker(unit);
        }
    }

    function removeUnitMarker(unit) {
        if (!unit || !overlaysRef || !overlaysRef.value) return;
        const marker = findMarkerByUnit(unit);
        if (marker) {
            const category = marker.category;
            const layerGroup = overlaysRef.value[category]?.layerGroup;
            if (layerGroup) {
                 layerGroup.removeLayer(marker);
            } else {
                 console.warn(`[MarkerManager] Layer group not found for category ${category} during removal.`);
            }
        } else {
             console.warn(`[MarkerManager] Marker not found for removal: ${unit.uid}`);
        }
    }

    // --- Self Marker Specific Updates ---    
    function updateSelfMarkerPosition(lat, lon) {
        if (selfMarkerRef && selfMarkerRef.value && lat != null && lon != null) {
            selfMarkerRef.value.setLatLng([lat, lon]);
        } else {
             console.warn("[MarkerManager] Could not update self marker position. Ref or lat/lon missing.");
        }
    }

    function updateSelfMarkerPopup(configData) {
         if (selfMarkerRef && selfMarkerRef.value && configData) {
            selfMarkerRef.value.setPopupContent(createSelfPopupContent(configData));
        } else {
             console.warn("[MarkerManager] Could not update self marker popup. Ref or config data missing.");
        }
    }

    // --- Exposed Functions ---    
    return {
        updateMarkerForUnit: updateUnitMarker,
        removeMarkerForUnit: removeUnitMarker,
        updateSelfMarkerPosition,
        updateSelfMarkerPopup,
        findMarkerByUnit
    };
} 