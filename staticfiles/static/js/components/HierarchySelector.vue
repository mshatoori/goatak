<template>
  <div class="hierarchy-selector card">
    <div class="card-body">
      <!-- Loading State -->
      <div v-if="isLoading" class="d-flex align-items-center text-muted">
        <div class="spinner-border spinner-border-sm me-2" role="status">
          <span class="visually-hidden">Loading...</span>
        </div>
        <span>بارگذاری نوع...</span>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="alert alert-danger p-2" role="alert">
        خطا در بارگذاری نوع: {{ error }}
      </div>

      <!-- Hierarchy Navigation -->
      <div v-else-if="hierarchyData">
        <!-- Breadcrumb Trail -->
        <nav aria-label="breadcrumb" class="breadcrumb-nav mb-3">
          <ol class="breadcrumb mb-0">
            <li
              v-for="(node, index) in selectedPath"
              :key="node.code"
              class="breadcrumb-item"
              :class="{ active: index === selectedPath.length - 1 }"
            >
              <button
                v-if="index < selectedPath.length - 1"
                type="button"
                class="btn btn-link p-0 text-decoration-none"
                @click="navigateToNode(node, index)"
              >
                {{ node.name }} {{ node.code ? `(${node.code})` : '' }}
              </button>
              <span v-else aria-current="page">
                {{ node.name }} {{ node.code ? `(${node.code})` : '' }}
              </span>
            </li>
          </ol>
        </nav>

        <!-- Child Options List -->
        <ul v-if="canGoForward" class="list-group child-options">
          <li
            v-for="option in childOptions"
            :key="option.code"
            class="list-group-item list-group-item-action d-flex justify-content-between align-items-center"
            @click="selectChild(option)"
            role="button"
          >
            <span>{{ option.name }} {{ option.code ? `(${option.code})` : '' }}</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-chevron-left" viewBox="0 0 16 16">
              <path fill-rule="evenodd" d="M11.354 1.646a.5.5 0 0 1 0 .708L5.707 8l5.647 5.646a.5.5 0 0 1-.708.708l-6-6a.5.5 0 0 1 0-.708l6-6a.5.5 0 0 1 .708 0"/>
            </svg>
          </li>
        </ul>
        <!-- Message removed as per request -->
        <!-- <div v-else class="text-muted fst-italic mt-2 no-children-message">
           زیرشاخه‌ای برای "{{ currentNode?.name }}" وجود ندارد.
         </div> -->
      </div>
       <div v-else class="text-muted">
         برای شروع نوعی را انتخاب کنید.
       </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, computed, onMounted } from 'vue';
import { fetchTypes } from '../apiService.js'; // Import the new API function

const props = defineProps({
  modelValue: { // For v-model
    type: String,
    default: ''
  },
  // Removed apiUrl prop as it's now handled by apiService
  // apiUrl: {
  //   type: String,
  //   default: '/api/types'
  // }
});

const emit = defineEmits(['update:modelValue']);

// --- State ---
const hierarchyData = ref(null); // Stores the root node of the hierarchy
const isLoading = ref(false);
const error = ref(null);
const currentNode = ref(null); // The current node object in the hierarchy
const selectedPath = ref([]); // Array of nodes from root to current node

// --- Computed ---
const childOptions = computed(() => {
    // Ensure currentNode and its 'next' property exist
    return currentNode.value?.next || [];
});

const currentDisplay = computed(() => {
    // This computed property might not be directly used in the new template,
    // but kept for potential future use or debugging.
    if (isLoading.value) return "Loading...";
    if (error.value) return "Error";
    return currentNode.value?.name || 'Select Type';
});

// canGoBack is implicitly handled by the breadcrumb logic (not disabling the last item)
// const canGoBack = computed(() => selectedPath.value.length > 1);

const canGoForward = computed(() => {
    // Check if currentNode exists and has a 'next' array with items
    return !!currentNode.value?.next?.length;
});

// --- Helpers ---
function findNodeByCode(node, code) {
  if (!node) return null;
  if (node.code === code) return node;
  if (node.next) {
    for (const child of node.next) {
      const found = findNodeByCode(child, code);
      if (found) return found;
    }
  }
  return null;
}

function buildPathToNode(startNode, targetNode) {
  if (!startNode || !targetNode) return [];
  if (startNode.code === targetNode.code) return [startNode]; 

  if (startNode.next) {
    for (const child of startNode.next) {
      const path = buildPathToNode(child, targetNode);
      if (path.length > 0) {
        return [startNode, ...path]; 
      }
    }
  }
  return []; 
}

// --- Methods ---
async function fetchHierarchy() {
  isLoading.value = true;
  error.value = null;
  
  console.log(`Fetching type hierarchy using apiService...`);
  try {
    const data = await fetchTypes(); // Use API service function

    // Basic validation of the fetched data structure
    if (typeof data === 'object' && data !== null && data.code !== undefined && data.name !== undefined) {
        hierarchyData.value = data;
        console.log("Type hierarchy loaded:", hierarchyData.value);
        initializeSelection();
    } else {
        console.error("Invalid hierarchy data structure received:", data);
        throw new Error('Invalid data structure received from API.');
    }
  } catch (e) {
    console.error("Error fetching type hierarchy:", e);
    // Use the error message directly from the apiService if it exists
    error.value = e.message || 'Failed to load type data';
    hierarchyData.value = null; // Ensure data is null on error
    resetState(); // Reset state properly on fetch error
  } finally {
    isLoading.value = false;
  }
}

function initializeSelection() {
    // Guard against running initialization logic before data is ready or if there was an error
    if (isLoading.value || error.value || !hierarchyData.value) {
         console.log("Hierarchy init skipped: Data not ready, error occurred, or no data.");
         // If hierarchyData is null here (e.g., after an error), resetState handles it
         if (!hierarchyData.value) {
             resetState();
         }
         return;
    }

    // Determine the target code: use modelValue if provided, otherwise default to the root node's code
    const targetCode = props.modelValue && props.modelValue !== '' ? props.modelValue : hierarchyData.value?.code;
    let targetNode = null;

    if (targetCode !== null && targetCode !== undefined) {
       targetNode = findNodeByCode(hierarchyData.value, targetCode);
       console.log(`Hierarchy searching for initial node code: "${targetCode}". Found:`, targetNode ? targetNode.code : 'Not Found');
    } else {
        console.log("Hierarchy: No initial target code specified, will default to root.");
        // If targetCode is null/undefined (should only happen if root code is also null/undefined),
        // we'll default to the root in the resetState logic below.
    }


    if (targetNode) {
        const path = buildPathToNode(hierarchyData.value, targetNode);
        if (path.length > 0) {
            selectedPath.value = path;
            currentNode.value = targetNode;
            console.log("Hierarchy initialized path:", path.map(n => n.code));
            // Ensure v-model is synced if the initial value led to a valid node
            // (Handles cases where modelValue might be slightly different but resolves to a node)
            if(props.modelValue !== currentNode.value.code) {
                console.log(`Hierarchy: Syncing modelValue on init. Was "${props.modelValue}", now "${currentNode.value.code}"`);
                emit('update:modelValue', currentNode.value.code);
            }
        } else {
            // This case should be rare if findNodeByCode found the node, but handle it defensively.
            console.warn(`Hierarchy: Could not build path to found node "${targetCode}", resetting to root.`);
            resetState(); // Reset to root if path building fails
        }
    } else {
        // If the provided modelValue code wasn't found, or no code was provided, reset to the root node.
        console.log(`Hierarchy: Target code "${targetCode}" not found or invalid, initializing to root.`);
        resetState(); // Reset to root if target node not found
    }
}


function resetState() {
    if (hierarchyData.value) {
        // Set current node and path to the root of the hierarchy
        currentNode.value = hierarchyData.value;
        selectedPath.value = [hierarchyData.value];
        console.log("Hierarchy state reset to root:", currentNode.value?.code);
        // If the current modelValue is not the root code, update it.
        if (props.modelValue !== currentNode.value.code) {
             console.log(`Hierarchy: Emitting root code "${currentNode.value.code}" after reset.`);
             emit('update:modelValue', currentNode.value.code);
        }
    } else {
        // If there's no hierarchy data (e.g., initial load failed), clear the state.
        currentNode.value = null;
        selectedPath.value = [];
        console.log("Hierarchy state reset to empty (no data).");
        // Emit an empty value if the modelValue isn't already empty.
        if (props.modelValue !== '') {
             console.log("Hierarchy: Emitting empty modelValue after reset (no data).");
             emit('update:modelValue', '');
        }
    }
}


// New method for breadcrumb navigation
function navigateToNode(node, index) {
  // Prevent navigating to the already current node via breadcrumb
  if (index === selectedPath.value.length - 1) return;

  console.log("Hierarchy navigating via breadcrumb to:", node.code);
  // Trim the path back to the clicked node (inclusive)
  selectedPath.value = selectedPath.value.slice(0, index + 1);
  currentNode.value = node;
  emit('update:modelValue', currentNode.value.code);
}

// New method for selecting a child from the list
function selectChild(selectedNode) {
  if (!selectedNode || !canGoForward.value) return; // Basic guard

  const childExists = currentNode.value?.next?.some(child => child.code === selectedNode.code);
  if (!childExists) {
      console.warn("Hierarchy: Attempted to select a node not present in current children:", selectedNode.code);
      return;
  }


  console.log("Hierarchy selected child:", selectedNode.code);
  selectedPath.value.push(selectedNode);
  currentNode.value = selectedNode;
  emit('update:modelValue', selectedNode.code);
}


// --- Watchers ---
watch(() => props.modelValue, (newCode, oldCode) => {
    // Re-initialize if the modelValue changes externally,
    // but only if the change wasn't caused by an internal emit
    // (i.e., newCode is different from the current node's code)
    // Also ensure hierarchy data is loaded before attempting re-initialization.
    if (newCode !== oldCode && newCode !== currentNode.value?.code && hierarchyData.value) {
        console.log(`Hierarchy modelValue changed externally from "${oldCode}" to "${newCode}", re-initializing.`);
        initializeSelection();
    } else if (newCode !== oldCode && !hierarchyData.value) {
        // If modelValue changes but hierarchy isn't loaded yet, log it but wait for data.
        console.log(`Hierarchy modelValue changed externally to "${newCode}", but hierarchy data not yet loaded. Initialization will occur upon data load.`);
    }
});

// Watch for hierarchy data to load/change (handles case where modelValue is set before fetch completes)
watch(hierarchyData, (newData, oldData) => {
    // Initialize only if new data is present and differs from old data,
    // or if it's the initial load (oldData is null/undefined).
    // This prevents re-initializing if the data reference somehow changes but content is the same.
    if (newData && newData !== oldData) {
        console.log("Hierarchy data loaded or changed, ensuring selection is initialized.");
        initializeSelection();
    } else if (!newData && oldData) {
        // If data is removed (e.g., becomes null after being valid), reset the state.
        console.log("Hierarchy data removed, resetting state.");
        resetState();
    }
});

// --- Lifecycle Hook ---
onMounted(() => {
    fetchHierarchy();
});

</script>

<style scoped>
.hierarchy-selector {
  /* Keep card styling or adjust as needed */
  min-height: 24px; /* Ensure minimum height for loading/empty states */
}

.breadcrumb-nav .breadcrumb {
  background-color: transparent; /* Remove default Bootstrap breadcrumb background */
  padding: 0; /* Remove default padding */
  margin-bottom: 0.5rem; /* Add some space below */
}

.breadcrumb-item + .breadcrumb-item::before {
 content: ">"; /* Use > as separator */
 color: var(--bs-secondary-color); /* Style separator */
}

/* Hide separator before the active (last) breadcrumb item */
.breadcrumb-item.active::before {
    content: none;
}

.breadcrumb-item button.btn-link {
  font-size: inherit; /* Match surrounding text size */
  color: var(--bs-link-color); /* Use standard link color */
  text-decoration: none; /* Remove underline */
  vertical-align: baseline; /* Align properly with text */
}

.breadcrumb-item button.btn-link:hover {
  text-decoration: underline; /* Underline on hover */
}

.breadcrumb-item.active {
  color: var(--bs-emphasis-color); /* Make active item more prominent */
  font-weight: 500; /* Slightly bolder */
}

.child-options {
  max-height: 250px; /* Adjust height as needed */
  overflow-y: auto;
}

.child-options .list-group-item {
  cursor: pointer;
  padding: 0.5rem 0.75rem; /* Slightly smaller padding */
  border-color: var(--bs-border-color-translucent); /* Lighter border */
}
.child-options .list-group-item:hover {
   background-color: var(--bs-tertiary-bg); /* Subtle hover effect */
}

.child-options .list-group-item svg {
    color: var(--bs-secondary-color); /* Chevron color */
    transition: transform 0.2s ease-in-out;
}
.child-options .list-group-item:hover svg {
    /* Adjust transform for RTL, move slightly left on hover */
    transform: translateX(-3px);
}

/* Styles for .no-children-message removed as the element is commented out */

.card-body {
    padding: 0.75rem; /* Adjust card padding */
}

/* Ensure consistent alignment and spacing for loading state */
.loading-state {
  padding: 0.5rem 0;
}
</style> 