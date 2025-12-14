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
                {{ node.name }} {{ node.code ? `(${node.code})` : "#" }}
              </button>
              <span v-else aria-current="page">
                {{ node.name }} {{ node.code ? `(${node.code})` : "#" }}
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
            <span
              >{{ option.name }}
              {{ option.code ? `(${option.code})` : "" }}</span
            >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              fill="currentColor"
              class="bi bi-chevron-left"
              viewBox="0 0 16 16"
            >
              <path
                fill-rule="evenodd"
                d="M11.354 1.646a.5.5 0 0 1 0 .708L5.707 8l5.647 5.646a.5.5 0 0 1-.708.708l-6-6a.5.5 0 0 1 0-.708l6-6a.5.5 0 0 1 .708 0"
              />
            </svg>
          </li>
        </ul>
      </div>
      <div v-else class="text-muted">برای شروع نوعی را انتخاب کنید.</div>
    </div>
  </div>
</template>

<script>
import store from "../store.js";

export default {
  name: "HierarchySelector",
  props: {
    value: {
      type: String,
      default: "",
    },
  },
  emits: ["update:modelValue"],
  data: function() {
    return {
      hierarchyData: null, // Stores the root node of the hierarchy
      isLoading: false,
      error: null,
      currentNode: null, // The current node object in the hierarchy
      selectedPath: [], // Array of nodes from root to current node
      sharedState: store.state,
    };
  },
  computed: {
    childOptions: function() {
      // Ensure currentNode and its 'next' property exist
      return this.currentNode?.next || [];
    },
    currentDisplay: function() {
      // This computed property might not be directly used in the template,
      // but kept for potential future use or debugging.
      if (this.isLoading) return "Loading...";
      if (this.error) return "Error";
      return this.currentNode?.name || "Select Type";
    },
    canGoForward: function() {
      // Check if currentNode exists and has a 'next' array with items
      return !!this.currentNode?.next?.length;
    },
  },
  methods: {
    findNodeByCode: function(node, code) {
      if (!node) return null;
      if (node.code === code) return node;
      if (node.next) {
        for (const child of node.next) {
          const found = this.findNodeByCode(child, code);
          if (found) return found;
        }
      }
      return null;
    },
    buildPathToNode: function(startNode, targetNode) {
      if (!startNode || !targetNode) return [];
      if (startNode.code === targetNode.code) return [startNode];

      if (startNode.next) {
        for (const child of startNode.next) {
          const path = this.buildPathToNode(child, targetNode);
          if (path.length > 0) {
            return [startNode, ...path];
          }
        }
      }
      return [];
    },
    fetchHierarchy: function() {
      this.isLoading = true;
      this.error = null;

      console.log("Fetching type hierarchy from store...");

      // Use the types from the store instead of fetching from API
      if (this.sharedState.types) {
        this.hierarchyData = this.sharedState.types;
        console.log("Type hierarchy loaded from store:", this.hierarchyData);
        this.isLoading = false;
        this.initializeSelection();
      } else {
        // If types are not in the store yet, fetch them
        console.log("Types not in store, fetching...");
        store.fetchTypes();

        // Check for types every 100ms until they're available or timeout after 5 seconds
        let attempts = 0;
        const maxAttempts = 50; // 5 seconds

        const checkTypes = () => {
          attempts++;
          if (this.sharedState.types) {
            this.hierarchyData = this.sharedState.types;
            console.log(
              "Type hierarchy loaded from store:",
              this.hierarchyData
            );
            this.initializeSelection();
            this.isLoading = false;
          } else if (attempts < maxAttempts) {
            setTimeout(checkTypes, 100);
          } else {
            console.error("Error fetching type hierarchy: Timeout");
            this.error = "Failed to load type data (timeout)";
            this.hierarchyData = null;
            this.resetState();
            this.isLoading = false;
          }
        };

        checkTypes();
      }
    },
    initializeSelection: function() {
      // Guard against running initialization logic before data is ready or if there was an error
      if (this.isLoading || this.error || !this.hierarchyData) {
        console.log(
          "Hierarchy init skipped: Data not ready, error occurred, or no data."
        );
        // If hierarchyData is null here (e.g., after an error), resetState handles it
        if (!this.hierarchyData) {
          this.resetState();
        }
        return;
      }

      // Determine the target code: use value if provided, otherwise default to the root node's code
      const targetCode =
        this.value && this.value !== "" ? this.value : this.hierarchyData?.code;
      let targetNode = null;

      if (targetCode !== null && targetCode !== undefined) {
        targetNode = this.findNodeByCode(this.hierarchyData, targetCode);
        console.log(
          `Hierarchy searching for initial node code: "${targetCode}". Found:`,
          targetNode ? targetNode.code : "Not Found"
        );
      } else {
        console.log(
          "Hierarchy: No initial target code specified, will default to root."
        );
      }

      if (targetNode) {
        const path = this.buildPathToNode(this.hierarchyData, targetNode);
        if (path.length > 0) {
          this.selectedPath = path;
          this.currentNode = targetNode;
          console.log(
            "Hierarchy initialized path:",
            path.map((n) => n.code)
          );
          // Ensure v-model is synced if the initial value led to a valid node
          if (this.value !== this.currentNode.code) {
            console.log(
              `Hierarchy: Syncing value on init. Was "${this.value}", now "${this.currentNode.code}"`
            );
            this.$emit("update:modelValue", this.currentNode.code);
          }
        } else {
          // This case should be rare if findNodeByCode found the node, but handle it defensively.
          console.warn(
            `Hierarchy: Could not build path to found node "${targetCode}", resetting to root.`
          );
          this.resetState(); // Reset to root if path building fails
        }
      } else {
        // If the provided value code wasn't found, or no code was provided, reset to the root node.
        console.log(
          `Hierarchy: Target code "${targetCode}" not found or invalid, initializing to root.`
        );
        this.resetState(); // Reset to root if target node not found
      }
    },
    resetState: function() {
      if (this.hierarchyData) {
        // Set current node and path to the root of the hierarchy
        this.currentNode = this.hierarchyData;
        this.selectedPath = [this.hierarchyData];
        console.log("Hierarchy state reset to root:", this.currentNode?.code);
        // If the current value is not the root code, update it.
        if (this.value !== this.currentNode.code) {
          console.log(
            `Hierarchy: Emitting root code "${this.currentNode.code}" after reset.`
          );
          this.$emit("update:modelValue", this.currentNode.code);
        }
      } else {
        // If there's no hierarchy data (e.g., initial load failed), clear the state.
        this.currentNode = null;
        this.selectedPath = [];
        console.log("Hierarchy state reset to empty (no data).");
        // Emit an empty value if the value isn't already empty.
        if (this.value !== "") {
          console.log("Hierarchy: Emitting empty value after reset (no data).");
          this.$emit("update:modelValue", "");
        }
      }
    },
    // Method for breadcrumb navigation
    navigateToNode: function(node, index) {
      // Prevent navigating to the already current node via breadcrumb
      if (index === this.selectedPath.length - 1) return;

      console.log("Hierarchy navigating via breadcrumb to:", node.code);
      // Trim the path back to the clicked node (inclusive)
      this.selectedPath = this.selectedPath.slice(0, index + 1);
      this.currentNode = node;
      this.$emit("update:modelValue", this.currentNode.code);
    },
    // Method for selecting a child from the list
    selectChild: function(selectedNode) {
      if (!selectedNode || !this.canGoForward) return; // Basic guard

      const childExists = this.currentNode?.next?.some(
        (child) => child.code === selectedNode.code
      );
      if (!childExists) {
        console.warn(
          "Hierarchy: Attempted to select a node not present in current children:",
          selectedNode.code
        );
        return;
      }

      console.log("Hierarchy selected child:", selectedNode.code);
      this.selectedPath.push(selectedNode);
      this.currentNode = selectedNode;
      this.$emit("update:modelValue", selectedNode.code);
    },
  },
  watch: {
    value: function(newCode, oldCode) {
      // Re-initialize if the value changes externally,
      // but only if the change wasn't caused by an internal emit
      // (i.e., newCode is different from the current node's code)
      // Also ensure hierarchy data is loaded before attempting re-initialization.
      if (
        newCode !== oldCode &&
        newCode !== this.currentNode?.code &&
        this.hierarchyData
      ) {
        console.log(
          `Hierarchy value changed externally from "${oldCode}" to "${newCode}", re-initializing.`
        );
        this.initializeSelection();
      } else if (newCode !== oldCode && !this.hierarchyData) {
        // If value changes but hierarchy isn't loaded yet, log it but wait for data.
        console.log(
          `Hierarchy value changed externally to "${newCode}", but hierarchy data not yet loaded. Initialization will occur upon data load.`
        );
      }
    },
    "sharedState.types": function(newData, oldData) {
      // Initialize only if new data is present and differs from old data,
      // or if it's the initial load (oldData is null/undefined).
      if (newData && newData !== oldData) {
        console.log(
          "Hierarchy data loaded or changed in store, ensuring selection is initialized."
        );
        this.hierarchyData = newData;
        this.initializeSelection();
      } else if (!newData && oldData) {
        // If data is removed (e.g., becomes null after being valid), reset the state.
        console.log("Hierarchy data removed from store, resetting state.");
        this.hierarchyData = null;
        this.resetState();
      }
    },
  },
  mounted: function() {
    this.fetchHierarchy();
  },
};
</script>

<style></style>
