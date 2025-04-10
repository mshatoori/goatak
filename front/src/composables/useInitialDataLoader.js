import { onMounted } from 'vue';

export function useInitialDataLoader(fetchFunctions) {
    const { 
        fetchConfigFunc, 
        fetchInitialUnitsFunc, 
        fetchInitialFeedsFunc, 
        // Note: fetchInitialSensorsCountFunc is called *within* fetchConfigFunc in the original App.vue
        // We should maintain that dependency unless explicitly refactoring it.
    } = fetchFunctions;

    const loadInitialData = async () => {
        console.log("[InitialDataLoader] Loading initial data...");
        try {
            // Fetch config first, as it might be needed by others (and it calls sensor count fetch)
            if (fetchConfigFunc && typeof fetchConfigFunc === 'function') {
                 await fetchConfigFunc();
            } else {
                 console.warn("[InitialDataLoader] fetchConfigFunc not provided or not a function.");
            }

            // Fetch units and feeds, potentially in parallel after config
            const promises = [];
            if (fetchInitialUnitsFunc && typeof fetchInitialUnitsFunc === 'function') {
                 promises.push(fetchInitialUnitsFunc());
            } else {
                 console.warn("[InitialDataLoader] fetchInitialUnitsFunc not provided or not a function.");
            }
            
            if (fetchInitialFeedsFunc && typeof fetchInitialFeedsFunc === 'function') {
                 promises.push(fetchInitialFeedsFunc());
            } else {
                 console.warn("[InitialDataLoader] fetchInitialFeedsFunc not provided or not a function.");
            }

            await Promise.all(promises);
            console.log("[InitialDataLoader] Initial data loading complete.");

        } catch (error) {
            console.error("[InitialDataLoader] Error during initial data load sequence:", error);
            // Optionally notify the user about the failure
        }
    };

    // Expose the main function to trigger the load sequence
    return {
        loadInitialData
    };
} 