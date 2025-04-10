<template>
  <div class="modal fade show d-block" tabindex="-1" aria-labelledby="editUnitModalLabel" aria-modal="true" role="dialog">
    <div class="modal-dialog modal-lg">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title" id="editUnitModalLabel">ویرایش واحد/نقطه</h5>
          <button type="button" class="btn-close" @click="cancelEdit" aria-label="Close"></button>
        </div>
        <div class="modal-body">
          <form v-if="editableUnit">
            <!-- Callsign and Category -->
            <div class="form-group row my-2 mx-2">
              <div class="col-6">
                <label for="ed-callsign">شناسه تماس</label>
                <input v-model="editableUnit.callsign" id="ed-callsign" class="form-control" placeholder="callsign">
              </div>
              <div class="btn-group col-4" role="group" aria-label="Type">
                <input type="radio" class="btn-check" name="categoryRadio" value="point"
                       v-model="editableUnit.category" id="ed-point" :disabled="!isNewUnit">
                <label class="btn btn-outline-primary btn-sm" for="ed-point">نقطه</label>

                <input type="radio" class="btn-check" name="categoryRadio" value="unit"
                       v-model="editableUnit.category" id="ed-unit" :disabled="!isNewUnit">
                <label class="btn btn-outline-primary btn-sm" for="ed-unit">نیرو</label>
              </div>
              <div class="form-check col-2">
                <input type="checkbox" id="ed-send" v-model="editableUnit.send" class="form-check-input"/>
                <label for="ed-send" class="form-check-label">ارسال</label>
              </div>
            </div>

            <!-- Point Specific Type -->
            <div class="form-group row my-2 mx-2" v-if="editableUnit.category === 'point'">
              <div class="col-12">
                <label class="my-1 mr-2 col-6" for="ed-point-type">نوع نقطه</label>
                <select class="form-select my-1 mr-sm-2" id="ed-point-type" v-model="editableUnit.type">
                  <option value="b-m-p-s-m">Spot</option>
                  <option value="b-m-p-w-GOTO">WayPt</option>
                  <option value="b-m-p-s-p-op">OP</option>
                  <option value="b-m-p-a">Aim</option>
                  <!-- Add other point types as needed -->
                </select>
              </div>
            </div>

            <!-- Unit Specific Fields -->
            <div v-if="editableUnit.category === 'unit'">
                <div class="form-group row my-2 mx-2">
                    <div class="col-12">
                        <label class="my-1 mr-2 col-6" for="ed-aff">طرف</label>
                        <select class="form-select my-1 mr-sm-2" id="ed-aff" v-model="editableUnit.affiliation">
                            <option value="h">دشمن</option>
                            <option value="f">خودی</option>
                            <option value="n">خنثی</option>
                            <option value="u">نامعلوم</option>
                            <option value="s">مشکوک</option>
                        </select>
                    </div>
                </div>
                <!-- SIDC Selection - Placeholder -->
                <div class="form-group row my-2 mx-2">
                    <div class="col-12">
                         <label class="my-1 mr-2">نوع (SIDC)</label>
                         <div class="input-group">
                             <span v-if="isLoadingSidc" class="input-group-text">Loading SIDC...</span>
                             <span v-else-if="sidcError" class="input-group-text text-danger">Error loading SIDC!</span>
                             <button v-else type="button" class="btn btn-secondary" :disabled="!canGoBackSidc" @click="goBackSidc">
                                 &lt; <!-- Back -->
                             </button>
                             <select v-if="!isLoadingSidc && !sidcError" class="form-select" id="ed-sidc-subtype" @change="handleSidcSelect">
                                 <!-- Add a placeholder/current level option -->
                                 <option :value="editableUnit.sidc" selected disabled>
                                     {{ currentSidcDisplay }} ({{ editableUnit.sidc }})
                                 </option>
                                 <option v-for="option in sidcOptions" :key="option.code" :value="option.code">
                                     {{ option.name }}
                                 </option>
                             </select>
                             <button v-if="!isLoadingSidc && !sidcError" type="button" class="btn btn-secondary" :disabled="!canGoForwardSidc" @click="goForwardSidc">
                                 &gt; <!-- Forward -->
                             </button>
                         </div>
                    </div>
                </div>
            </div>

            <!-- Remarks -->
            <div class="form-group row my-2 mx-2">
              <div class="col-12">
                <label for="ed-remarks">توضیحات</label>
                <textarea id="ed-remarks" class="form-control" rows="3" v-model="editableUnit.text"></textarea>
              </div>
            </div>

             <!-- Web Sensor Data (Optional) -->
            <div class="form-group row my-2 mx-2">
                <div class="col-12">
                    <label for="ed-websensor">اطلاعات اضافه</label>
                    <textarea id="ed-websensor" class="form-control" rows="3" v-model="editableUnit.web_sensor"></textarea>
                </div>
            </div>

          </form>
          <div v-else>
              <p>Loading unit data...</p>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" @click="cancelEdit">لغو</button>
          <button type="button" class="btn btn-primary" @click="saveEdit">ذخیره</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, computed, onMounted } from 'vue';

// --- Remove Hardcoded SIDC Data ---
/*
const SIDC_STRUCTURE = { ... }; 
*/

// Map affiliation character (prop) to SIDC Standard Identity (2nd char)
const AFFILIATION_TO_SIDC = {
  'f': 'F', // Friendly
  'h': 'H', // Hostile
  'n': 'N', // Neutral
  'u': 'U', // Unknown
  'p': 'P', // Pending
  'a': 'A', // Assumed Friend
  's': 'S', // Suspect
  'g': 'G', // Exercise Ground Truth
  'w': 'W', // Exercise White
  'd': 'D', // Exercise Friend
  'l': 'L', // Exercise Neutral
  'm': 'M', // Exercise Hostile
  'j': 'J', // Joker
  'k': 'K'  // Faker
};
// -------------------------------------

const props = defineProps({
  unit: {
    type: Object,
    required: true
  }
});

const emit = defineEmits(['close', 'save']);

const editableUnit = ref(null);
const isNewUnit = ref(false);

// --- Add State for Fetched Data ---
const sidcHierarchyData = ref(null); // To store data from /types
const isLoadingSidc = ref(false);
const sidcError = ref(null);

// --- SIDC State --- 
const currentSidcLevel = ref('dimension'); // 'dimension', 'function', 'modifier1', etc.
const currentDimensionNode = ref(null);
const currentFunctionNode = ref(null);
// Add more refs for deeper levels if needed

const sidcOptions = computed(() => {
    if (isLoadingSidc.value || sidcError.value || !sidcHierarchyData.value) return [];
    // Adapt logic based on fetched data structure
    try {
        switch (currentSidcLevel.value) {
            case 'dimension':
                // Assuming fetched data is keyed by dimension code at the root
                return Object.values(sidcHierarchyData.value).filter(v => v && typeof v === 'object'); 
            case 'function':
                // Assuming dimension node has a 'functions' property
                return currentDimensionNode.value?.functions ? Object.values(currentDimensionNode.value.functions) : [];
            case 'modifier1': 
                // Assuming function node has a 'next' property
                return currentFunctionNode.value?.next ? Object.values(currentFunctionNode.value.next) : [];
            default:
                return [];
        }
    } catch (e) {
        console.error("Error computing SIDC options:", e);
        return []; // Prevent errors breaking the UI
    }
});

const currentSidcDisplay = computed(() => {
    // Adapt based on fetched data structure (e.g., node.name)
    if (isLoadingSidc.value) return "Loading...";
    if (sidcError.value) return "Error";
    if (currentSidcLevel.value === 'modifier1' && currentFunctionNode.value) return currentFunctionNode.value.name || 'Select Modifier';
    if (currentSidcLevel.value === 'function' && currentDimensionNode.value) return currentDimensionNode.value.name || 'Select Function';
    return 'Select Dimension';
});

const canGoBackSidc = computed(() => currentSidcLevel.value !== 'dimension');
// Can go forward if current selection has children OR if we are at dimension level
const canGoForwardSidc = computed(() => {
    if (currentSidcLevel.value === 'dimension') return !!currentDimensionNode.value?.functions;
    if (currentSidcLevel.value === 'function') return !!currentFunctionNode.value?.next;
    // Add checks for deeper levels
    return false;
});

// Fetch SIDC Hierarchy Data
async function fetchSidcHierarchy() {
  isLoadingSidc.value = true;
  sidcError.value = null;
  console.log("Fetching SIDC hierarchy from /types...");
  try {
    const response = await fetch('/api/types');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    sidcHierarchyData.value = await response.json();
    console.log("SIDC hierarchy loaded:", sidcHierarchyData.value);
    // Re-initialize selection after data is loaded
    initializeSidcSelection(); 
  } catch (e) {
    console.error("Error fetching SIDC hierarchy:", e);
    sidcError.value = e.message || 'Failed to load SIDC data';
    sidcHierarchyData.value = {}; // Set to empty object on error
  } finally {
    isLoadingSidc.value = false;
  }
}

// Initialize SIDC selection based on unit data
function initializeSidcSelection() {
    // Wait until data is loaded and no error
    if (isLoadingSidc.value || sidcError.value || !sidcHierarchyData.value) {
         console.log("SIDC init skipped: Data not ready or error.");
         resetSidcState();
         return;
    }
    if (!editableUnit.value || editableUnit.value.category !== 'unit') {
        resetSidcState();
        return;
    }

    let sidc = editableUnit.value.sidc || 'SFGPU----------';
    if (sidc.length !== 15) sidc = 'SUGPU----------';

    // const identity = AFFILIATION_TO_SIDC[editableUnit.value.affiliation] || 'U'; // Already handled by watcher
    const dimensionCode = sidc[2];
    const functionId = sidc.substring(4, 10);

    // Find nodes in the fetched data structure
    currentDimensionNode.value = sidcHierarchyData.value[dimensionCode] || null;
    // Assuming fetched functions are keyed by the 6-char function ID
    currentFunctionNode.value = currentDimensionNode.value?.functions?.[functionId] || null;
    
    // Determine current level
    if (currentFunctionNode.value?.next) { // Check if function has further modifiers
        currentSidcLevel.value = 'modifier1';
    } else if (currentFunctionNode.value) { // Function exists but is terminal or has no 'next'
        currentSidcLevel.value = 'function'; // Stay at function level if terminal?
    } else if (currentDimensionNode.value) {
        currentSidcLevel.value = 'function';
    } else {
        currentSidcLevel.value = 'dimension';
    }
    console.log(`Initialized SIDC: Dim=${currentDimensionNode.value?.code}, Func=${currentFunctionNode.value?.code}, Level=${currentSidcLevel.value}`);
    // updateSidcString(); // Don't update string on init, just reflect state
}

function resetSidcState() {
    currentSidcLevel.value = 'dimension';
    currentDimensionNode.value = null;
    currentFunctionNode.value = null;
    // Reset deeper levels
}

// Update the full SIDC string based on current selections
function updateSidcString() {
    if (!editableUnit.value || editableUnit.value.category !== 'unit') return;
    // Ensure data is loaded
    if (isLoadingSidc.value || sidcError.value || !sidcHierarchyData.value) return;

    const identity = AFFILIATION_TO_SIDC[editableUnit.value.affiliation] || 'U';
    const dimension = currentDimensionNode.value?.code || 'Z'; 
    const status = editableUnit.value.sidc?.[3] || 'P'; // Default to Present? Or Keep existing?
    let functionId = '------';
    let modifiers = '----'; // Just placeholders for now

    // Get function ID based on selection
    if (currentFunctionNode.value) {
        functionId = currentFunctionNode.value.code;
    } else if (currentDimensionNode.value) {
        // Find a default function ID if only dimension is selected (e.g., the first one?)
        const defaultFuncKey = Object.keys(currentDimensionNode.value.functions || {})[0];
        functionId = defaultFuncKey || '------';
    }

    // Assemble the SIDC
    editableUnit.value.sidc = `S${identity}${dimension}${status}${functionId}${modifiers}-`;
    console.log("Updated SIDC String:", editableUnit.value.sidc);
}

// Navigate back in the SIDC hierarchy
function goBackSidc() {
  if (!canGoBackSidc.value) return;

  if (currentSidcLevel.value === 'modifier1') {
    currentFunctionNode.value = null;
    // Clear deeper modifiers
    currentSidcLevel.value = 'function';
  } else if (currentSidcLevel.value === 'function') {
    currentDimensionNode.value = null;
    currentFunctionNode.value = null;
    currentSidcLevel.value = 'dimension';
  }
  updateSidcString(); // Update SIDC to reflect the backed-up state
}

// Navigate forward (deeper) into the selected SIDC option
function goForwardSidc() {
  if (!canGoForwardSidc.value) return;
  // Ensure data is loaded
  if (isLoadingSidc.value || sidcError.value || !sidcHierarchyData.value) return;

  if (currentSidcLevel.value === 'dimension' && currentDimensionNode.value?.functions) {
      currentSidcLevel.value = 'function';
  } else if (currentSidcLevel.value === 'function' && currentFunctionNode.value?.next) {
      currentSidcLevel.value = 'modifier1';
  }
}

// Handle selection change in the dropdown
function handleSidcSelect(event) {
    const selectedCode = event.target.value;
    // Ensure data is loaded
    if (isLoadingSidc.value || sidcError.value || !sidcHierarchyData.value) return;

    console.log("SIDC Selected Code:", selectedCode, "at level:", currentSidcLevel.value);

    if (currentSidcLevel.value === 'dimension') {
        // Find the selected dimension object from the hierarchy using its code
        currentDimensionNode.value = Object.values(sidcHierarchyData.value).find(d => d.code === selectedCode) || null;
        currentFunctionNode.value = null; // Reset deeper levels
        goForwardSidc(); // Automatically move to function selection
    } else if (currentSidcLevel.value === 'function') {
        // Find the selected function object using its code
        currentFunctionNode.value = Object.values(currentDimensionNode.value?.functions || {}).find(f => f.code === selectedCode) || null;
        if (currentFunctionNode.value?.next) { // If it has further options
             goForwardSidc(); // Automatically move to next level
        }
    } else if (currentSidcLevel.value === 'modifier1') {
        // Find and set modifier node...
    }

    updateSidcString(); // Update the full SIDC string based on new selection
}

// Watchers
watch(() => props.unit, (newUnit) => {
    if (newUnit) {
        editableUnit.value = JSON.parse(JSON.stringify(newUnit));
        isNewUnit.value = !newUnit.callsign;
        initializeSidcSelection(); // Initialize SIDC when unit changes
    } else {
        editableUnit.value = null;
        resetSidcState();
    }
}, { immediate: true, deep: true });

watch(() => editableUnit.value?.affiliation, (newAffiliation, oldAffiliation) => {
    if (editableUnit.value && newAffiliation && newAffiliation !== oldAffiliation && editableUnit.value.category === 'unit') {
        console.log("Affiliation changed, updating SIDC identity");
        // Just update the identity part of the existing SIDC
        const currentSidc = editableUnit.value.sidc || 'SUGPU----------';
        const identity = AFFILIATION_TO_SIDC[newAffiliation] || 'U';
        editableUnit.value.sidc = `S${identity}${currentSidc.substring(2)}`;
        // No need to re-initialize hierarchy level unless desired
        // initializeSidcSelection(); 
    }
});

function cancelEdit() {
  emit('close');
}

function saveEdit() {
  if (editableUnit.value) {
    // TODO: Add validation if needed
    emit('save', editableUnit.value);
  }
}

// Fetch SIDC data when component mounts
onMounted(() => {
    fetchSidcHierarchy();
});

</script>

<style scoped>
.modal {
  background-color: rgba(0, 0, 0, 0.5); /* Dim background */
}
/* Add any specific styles for the modal here */
</style> 