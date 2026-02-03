/**
 * Item Utilities
 *
 * Functions for creating, cleaning, and managing items.
 */
import { uuidv4 } from "./id.js";
import { ROLE_MAP } from "../constants/roles.js";
import { CATEGORY_REPORT } from "../constants/categories.js";

/**
 * Clean a unit object by removing marker references
 * @param {Object} u - Unit object
 * @returns {Object} Cleaned unit object
 */
export function cleanUnit(u) {
  let res = {};

  for (const k in u) {
    if (
      k !== "marker" &&
      k !== "infoMarker" &&
      k !== "textLabel" &&
      k !== "polygon"
    ) {
      res[k] = u[k];
    }
  }
  return res;
}

/**
 * Get human-readable type name
 * @param {string} type - Type code
 * @returns {string} Human-readable name
 */
export function humanReadableType(type) {
  switch (type) {
    case "u-d-f":
      return "ناحیه";
    case "b-m-r":
      return "مسیر";
  }

  // Note: This requires store to be available globally
  // In the new architecture, this should be moved to a composable
  if (typeof store !== "undefined" && store.getSidc) {
    let sidc = store.getSidc(type.substring(4));
    if (sidc) return sidc.name;
  }
  return type;
}

/**
 * Create a new map item with default values
 * @param {Object} options - Item options
 * @returns {Object} New item object
 */
export function createMapItem(options) {
  const now = new Date();
  const stale = new Date(now);
  stale.setDate(stale.getDate() + 365);

  const baseItem = {
    uid: options.uid || options.category[0] + "_" + uuidv4().substring(0, 6),
    category: options.category || "",
    callsign: options.callsign || "",
    sidc: options.sidc || "",
    start_time: now,
    last_seen: now,
    stale_time: stale,
    type: options.type || "",
    lat: options.lat || 0,
    lon: options.lon || 0,
    hae: options.hae || 0,
    speed: options.speed || 0,
    course: options.course || 0,
    status: options.status || "",
    text: options.text || "",
    parent_uid: options.parent_uid || "",
    parent_callsign: options.parent_callsign || "",
    local: options.local !== undefined ? options.local : true,
    send: options.send !== undefined ? options.send : true,
    web_sensor: options.web_sensor || "",
    links: options.links || [],
  };

  if (options.isNew !== undefined) {
    baseItem.isNew = options.isNew;
  }

  if (options.category === "drawing" || options.category === "route") {
    baseItem.color = options.color || "white";
    baseItem.geofence = options.geofence || false;
    baseItem.geofence_aff = options.geofence_aff || "All";
  }

  // Casevac Item
  if (options.category === CATEGORY_REPORT && options.type === "b-r-f-h-c") {
    baseItem.casevac_detail = {
      casevac: true,
      freq: 0,
      urgent: 0,
      priority: 0,
      routine: 0,
      hoist: false,
      extraction_equipment: false,
      ventilator: false,
      equipment_other: false,
      equipment_detail: "",
      litter: 0,
      ambulatory: 0,
      security: 0,
      us_military: 0,
      us_civilian: 0,
      nonus_military: 0,
      nonus_civilian: 0,
      epw: 0,
      child: 0,
      hlz_marking: 0,
    };
  }

  return baseItem;
}
