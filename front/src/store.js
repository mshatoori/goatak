import { reactive } from 'vue'; // Import reactive if making state reactive

// Data cleaning function (moved here as it often prepares data for/from the store)
export function cleanUnit(unit) {
    // remove fields starting with _
    // remove fields which are functions
    // remove empty fields
    // remove objects where lat or lon is 0
    // remove fields where values are Infinity or Nan
    let cleaned = {};
    for (const [k, v] of Object.entries(unit)) {
        if (k.startsWith('_') || 
            typeof v === 'function' || 
            v === null || v === '' ||
            Number.isNaN(v) || !Number.isFinite(v)) {
            continue
        }
        if (typeof v === 'object' && v !== null) {
            // Special case: allow self coordinates to be 0,0 initially?
            if (k !== 'self' && (v.lat === 0 || v.lon === 0)) { 
                // This rule might be too strict, depends on use case.
                // If 0,0 is a valid temporary state, this needs adjustment.
                // console.warn(`Cleaning unit ${unit.uid}, removing field ${k} due to 0 lat/lon`, v);
                // continue // Temporarily disabling this part of cleaning
            }
        }
        cleaned[k] = v;
    }
    return cleaned
}

// Store management class
export class Store {
    constructor() {
        // Use reactive() for the state object to ensure Vue components update
        this.state = reactive({
            items: new Map(), // Maps UID to unit/item object
            timestamp: 0, // Simple counter to trigger reactivity if needed
            // Removed sensors, feeds, unitToSend, emergency as they seem unused/managed elsewhere now
        });
    }

    processItems(items, partial = false) {
        const results = {
            removed: [],
            added: [],
            updated: []
        };
        const incomingKeys = new Set();

        for (const item of items) {
            if (!item || !item.uid) {
                 console.warn("[Store] Skipping item with missing UID:", item);
                 continue; 
            }
            
            const existingItem = this.state.items.get(item.uid);
            incomingKeys.add(item.uid);

            // Handle deletion messages (e.g., from CoT events)
            if (item.type === "b-a-o-can" || item._delete === true) { // Check for explicit delete flag too
                if (existingItem) {
                    results.removed.push({...existingItem}); // Push a copy before deleting
                    this.state.items.delete(item.uid);
                    console.log(`[Store] Removed item via delete message: ${item.uid}`);
                }
                continue; // Skip further processing for deletion items
            }

            // Add or Update
            if (!existingItem) {
                // Ensure we store a reactive version if necessary, 
                // although top-level state is already reactive.
                // Cleaning before adding?
                // const cleanedItem = cleanUnit(item);
                this.state.items.set(item.uid, item); // Directly set the item
                results.added.push(item);
                // console.log(`[Store] Added item: ${item.uid}`);
            } else {
                // Merge new data into existing item
                // Ensure cleanUnit doesn't remove essential fields accidentally during update
                // const cleanedUpdate = cleanUnit(item);
                Object.assign(existingItem, item); // Merge updates into the existing reactive object
                results.updated.push(existingItem);
                 // console.log(`[Store] Updated item: ${item.uid}`);
            }
        }

        // Handle removals if it's not a partial update
        if (!partial) {
            const keysToRemove = [];
            for (const key of this.state.items.keys()) {
                if (!incomingKeys.has(key)) {
                    keysToRemove.push(key);
                }
            }
            keysToRemove.forEach(key => {
                const removedItem = this.state.items.get(key);
                results.removed.push({...removedItem}); // Push a copy
                this.state.items.delete(key);
                console.log(`[Store] Removed stale item (not in full update): ${key}`);
            });
        }

        // Increment timestamp only if changes occurred?
        if (results.added.length > 0 || results.updated.length > 0 || results.removed.length > 0) {
             this.state.timestamp++;
        }
        
        return results;
    }
}

// Export a singleton instance of the store
export const store = new Store(); 