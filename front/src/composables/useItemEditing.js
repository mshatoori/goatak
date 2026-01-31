import { ref, computed } from "vue";
import api from "../api/axios.js";

/**
 * Composable for managing item editing state and logic
 * Shared across UnitDetails, PointDetails, CasevacDetails, and DrawingDetails
 */
export function useItemEditing() {
  // State
  const editing = ref(false);
  const editingData = ref(null);
  const availableDestinations = ref(null);

  // Computed
  const availableSubnets = computed(() => {
    return availableDestinations.value
      ? availableDestinations.value.ownAddresses || []
      : [];
  });

  const availableContacts = computed(() => {
    if (
      !availableDestinations.value ||
      !availableDestinations.value.directDestinations
    ) {
      return [];
    }

    const contactMap = new Map();
    availableDestinations.value.directDestinations.forEach((dest) => {
      const urn = dest.urn.toString();
      if (!contactMap.has(urn)) {
        contactMap.set(urn, {
          urn: dest.urn,
          callsign: dest.name,
          ip_address: dest.ip,
        });
      } else {
        const existing = contactMap.get(urn);
        existing.ip_address += "," + dest.ip;
      }
    });

    return Array.from(contactMap.values());
  });

  // Methods
  function startEditing(item, typeSpecificFields = {}) {
    // Common fields for all item types
    const commonFields = {
      uid: item.uid,
      category: item.category,
      callsign: item.callsign,
      type: item.type || "",
      lat: item.lat,
      lon: item.lon,
      text: item.text || "",
      send: item.send || false,
      send_mode: item.send_mode || (item.send ? "broadcast" : "none"),
      selected_subnet: item.selected_subnet || "",
      selected_urn: item.selected_urn || "",
      selected_ip: item.selected_ip || "",
      web_sensor: item.web_sensor || "",
      parent_uid: item.parent_uid || "",
      parent_callsign: item.parent_callsign || "",
      isNew: item.isNew || false,
    };

    // Merge with type-specific fields
    editingData.value = {
      ...commonFields,
      ...typeSpecificFields,
    };

    // Fetch destinations for send mode
    fetchDestinations();

    editing.value = true;
  }

  function cancelEditing(item, emit) {
    editing.value = false;
    editingData.value = null;

    if (item.isNew) {
      emit("delete", item.uid);
    }
  }

  function saveEditing(item, emit, additionalProcessing = null) {
    // Update item with edited data
    for (const key in editingData.value) {
      if (key !== "stale_duration" && key !== "aff" && key !== "subtype") {
        item[key] = editingData.value[key];
      }
    }

    // Update send field for backward compatibility
    item.send =
      editingData.value.send_mode === "broadcast" ||
      editingData.value.send_mode === "subnet" ||
      editingData.value.send_mode === "direct";

    // Parse selected_urn as integer
    item.selected_urn = parseInt(editingData.value.selected_urn) || 0;

    // Allow additional processing specific to item type
    if (additionalProcessing) {
      additionalProcessing(item, editingData.value);
    }

    editing.value = false;
    editingData.value = null;

    emit("save", item);
  }

  function deleteItem(item, emit) {
    emit("delete", item.uid);
  }

  async function fetchDestinations() {
    try {
      const response = await api.get("/destinations");
      availableDestinations.value = response.data;
    } catch (error) {
      console.error("Error fetching destinations:", error);
      availableDestinations.value = { subnets: [], contacts: [] };
    }
  }

  function getAvailableIps(selectedUrn) {
    if (!selectedUrn || !availableContacts.value) {
      return [];
    }
    const selectedContact = availableContacts.value.find(
      (contact) => contact.urn == selectedUrn
    );
    if (selectedContact && selectedContact.ip_address) {
      return selectedContact.ip_address.split(",");
    }
    return [];
  }

  return {
    // State
    editing,
    editingData,
    availableDestinations,
    // Computed
    availableSubnets,
    availableContacts,
    // Methods
    startEditing,
    cancelEditing,
    saveEditing,
    deleteItem,
    fetchDestinations,
    getAvailableIps,
  };
}
