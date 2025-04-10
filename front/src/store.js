import { reactive } from 'vue'; // Import reactive if making state reactive
import { Item } from './models/Item'; // Import the Item class

// Removed cleanUnit function as its logic is integrated into Item.toPayload()
// or handled during Item instantiation/update.

// Store management class
export class Store {
    constructor() {
        // Use reactive() for the state object to ensure Vue components update
        this.state = reactive({
            items: new Map(), // Maps UID to Item instance
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

        for (const itemData of items) {
            if (!itemData || !itemData.uid) {
                console.warn("[Store] Skipping item with missing UID:", itemData);
                continue;
            }

            const existingItem = this.state.items.get(itemData.uid);
            incomingKeys.add(itemData.uid);

            // Handle deletion messages
            if (itemData.type === "b-a-o-can" || itemData._delete === true) {
                if (existingItem) {
                    results.removed.push(existingItem); // Push the Item instance
                    this.state.items.delete(itemData.uid);
                    console.log(`[Store] Removed item via delete message: ${itemData.uid}`);
                }
                continue;
            }

            // Add or Update
            if (!existingItem) {
                // Create a new Item instance from the incoming data
                const newItem = new Item(itemData);
                this.state.items.set(newItem.uid, newItem);
                results.added.push(newItem);
            } else {
                // Merge new data into the existing Item instance
                // Use Object.assign for reactivity, but ensure it doesn't add non-Item props
                const updateData = {};
                for (const key in itemData) {
                   // Only assign keys that are defined in the Item class or are standard props
                   // This check might be overly cautious depending on source data cleanliness
                   if (existingItem.hasOwnProperty(key) || Item.prototype.hasOwnProperty(key)) {
                       updateData[key] = itemData[key];
                   } else if (key === 'timestamp') { // Handle timestamp alias
                       updateData['time'] = itemData[key];
                   }
                }
                Object.assign(existingItem, updateData);

                 // Ensure essential fields are updated if they were changed
                // This might be redundant if updateData copying is perfect
                existingItem.time = updateData.time || existingItem.time;
                // ... update other potentially complex fields if needed ...

                results.updated.push(existingItem);
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
                results.removed.push(removedItem); // Push the Item instance
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