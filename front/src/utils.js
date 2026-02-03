/**
 * Utility Functions - Legacy Export File
 *
 * @deprecated This file is deprecated. Import from '@/utils' or specific modules instead.
 * This file will be removed in a future update.
 *
 * @example
 * // Instead of:
 * import { formatNumber, dt } from './utils.js';
 *
 * // Use:
 * import { formatNumber, dt } from '@/utils';
 * // Or:
 * import { formatNumber } from '@/utils/formatting.js';
 * import { dt } from '@/utils/dateTime.js';
 */

// Re-export all utilities from the new modular structure
export {
  // Coordinates
  latlng,
  printCoordsll,
  printCoords,
  formatCoordinates,
  latLongToIso6709,
  // Date/Time
  dt,
  timeAgo,
  isStale,
  // Formatting
  formatNumber,
  formatNumberEn,
  formatSpeed,
  formatDistance,
  formatBearing,
  sp,
  // Icons
  getIconUri,
  getMilIcon,
  circle,
  toUri,
  needIconUpdate,
  // ID
  uuidv4,
  shortId,
  generateId,
  // Items
  cleanUnit,
  humanReadableType,
  createMapItem,
  // Math
  distBea,
  calculateDistance,
  calculateBearing,
  // Popup
  popup,
  selfPopup,
  // Template
  html,
  escapeHtml,
  createElement,
} from "./utils/index.js";

// Also export constants that were previously in this file
export {
  COLOR_MAP,
  DEFAULT_COLOR,
  DEFAULT_BG_COLOR,
  getColor,
} from "./constants/colors.js";

export {
  ROLE_MAP,
  AVAILABLE_ROLES,
  getRoleAbbreviation,
} from "./constants/roles.js";

export {
  TOOLTIP_FIELD_CONFIG,
  getTooltipConfig,
  isTooltipFieldEnabled,
} from "./constants/tooltip.js";

// Console warning to encourage migration
console.warn(
  "[DEPRECATED] Importing from 'utils.js' is deprecated. " +
    "Please import from '@/utils' or specific utility modules instead.",
);
