/**
 * Utilities Module - Barrel Export
 *
 * Centralized export point for all utility functions.
 * Import utilities from this file for cleaner imports.
 *
 * @example
 * import { formatNumber, dt, getIconUri, calculateDistance } from '@/utils';
 */

// Coordinate utilities
export {
  latlng,
  printCoordsll,
  printCoords,
  formatCoordinates,
  latLongToIso6709,
} from "./coordinates.js";

// Date and time utilities
export { dt, timeAgo, isStale } from "./dateTime.js";

// Formatting utilities
export {
  formatNumber,
  formatNumberEn,
  formatSpeed,
  formatDistance,
  formatBearing,
  sp,
} from "./formatting.js";

// Icon utilities
export {
  getIconUri,
  getMilIcon,
  circle,
  toUri,
  needIconUpdate,
} from "./icons.js";

// ID generation utilities
export { uuidv4, shortId, generateId } from "./id.js";

// Item utilities
export { cleanUnit, humanReadableType, createMapItem } from "./items.js";

// Math utilities
export { distBea, calculateDistance, calculateBearing } from "./math.js";

// Popup utilities
export { popup, selfPopup } from "./popup.js";

// Template utilities
export { html, escapeHtml, createElement } from "./template.js";
