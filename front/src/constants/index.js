/**
 * Constants Module - Barrel Export
 *
 * Centralized export point for all application constants.
 * Import constants from this file for cleaner imports.
 *
 * @example
 * import { COLOR_MAP, DEFAULT_MAP_CENTER, SEND_MODES } from '@/constants';
 */

// Colors
export {
  COLOR_MAP,
  DEFAULT_COLOR,
  DEFAULT_BG_COLOR,
  getColor,
} from "./colors.js";

// Roles
export { ROLE_MAP, AVAILABLE_ROLES, getRoleAbbreviation } from "./roles.js";

// Tooltip Configuration
export {
  TOOLTIP_FIELD_CONFIG,
  getTooltipConfig,
  isTooltipFieldEnabled,
} from "./tooltip.js";

// Item Categories
export {
  CATEGORY_UNIT,
  CATEGORY_CONTACT,
  CATEGORY_POINT,
  CATEGORY_ALARM,
  CATEGORY_DRAWING,
  CATEGORY_ROUTE,
  CATEGORY_REPORT,
  ITEM_CATEGORIES,
  isValidCategory,
} from "./categories.js";

// Map Configuration
export {
  DEFAULT_MAP_CENTER,
  DEFAULT_MAP_ZOOM,
  MIN_MAP_ZOOM,
  MAX_MAP_ZOOM,
  DEFAULT_MAP_CONFIG,
  MARKER_SIZES,
  DEFAULT_MARKER_SIZE,
} from "./map.js";

// Timeouts and Intervals
export {
  WS_RECONNECT_INTERVAL,
  UNIT_FETCH_INTERVAL,
  REQUEST_TIMEOUT,
  SEARCH_DEBOUNCE_DELAY,
  NOTIFICATION_DURATION,
  MAX_RECONNECT_ATTEMPTS,
} from "./timeouts.js";

// Send Modes
export {
  SEND_MODE_BROADCAST,
  SEND_MODE_SUBNET,
  SEND_MODE_DIRECT,
  SEND_MODE_NONE,
  SEND_MODES,
  DEFAULT_SEND_MODE,
  SEND_MODE_LABELS,
  isValidSendMode,
} from "./sendModes.js";
