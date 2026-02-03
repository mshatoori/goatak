/**
 * Tooltip Configuration Constants
 *
 * Controls which fields are shown in marker tooltips.
 */

/**
 * Tooltip field configuration
 * Controls visibility of fields in marker tooltips
 * @type {Object.<string, boolean>}
 */
export const TOOLTIP_FIELD_CONFIG = {
  /** Always show callsign (bold) */
  callsign: true,
  /** Use humanReadableType(item.type) */
  humanReadableType: true,
  /** Format item.last_seen with dt() */
  lastSeen: true,
  /** Calculate using distBea(), needs access to self coords */
  distanceToSelf: true,
  /** Show if > 0 */
  speed: true,
  /** Show for air units (sidc[2] === 'A') */
  altitude: true,
  /** lat/lon formatted */
  coordinates: true,
  /** Heading in degrees */
  course: false,
  /** Online/Offline for contacts */
  status: false,
  /** Remarks */
  text: true,
};

/**
 * Get tooltip configuration
 * @returns {Object.<string, boolean>} The tooltip field configuration
 */
export function getTooltipConfig() {
  return { ...TOOLTIP_FIELD_CONFIG };
}

/**
 * Check if a field should be shown in tooltip
 * @param {string} fieldName - The field name to check
 * @returns {boolean} Whether the field should be shown
 */
export function isTooltipFieldEnabled(fieldName) {
  return TOOLTIP_FIELD_CONFIG[fieldName] ?? false;
}
