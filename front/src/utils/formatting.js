/**
 * Formatting Utilities
 *
 * Number and text formatting functions.
 */

/**
 * Format numbers with Persian locale
 * @param {number} num - The number to format
 * @param {number} decimals - Number of decimal places (default: 0)
 * @returns {string} Formatted number string
 */
export function formatNumber(num, decimals = 0) {
  if (num === null || num === undefined || isNaN(num)) {
    return "0";
  }
  return num.toLocaleString("fa-IR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Format numbers with English locale
 * @param {number} num - The number to format
 * @param {number} decimals - Number of decimal places (default: 0)
 * @returns {string} Formatted number string
 */
export function formatNumberEn(num, decimals = 0) {
  if (num === null || num === undefined || isNaN(num)) {
    return "0";
  }
  return num.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Format speed from m/s to km/h with Persian locale
 * @param {number} speed - Speed in m/s
 * @returns {string} Formatted speed string
 */
export function formatSpeed(speed) {
  if (!speed || speed <= 0) return "0";
  return formatNumber(speed * 3.6, 1);
}

/**
 * Format distance with appropriate units
 * @param {number} distance - Distance in meters
 * @returns {string} Formatted distance string
 */
export function formatDistance(distance) {
  if (!distance || distance < 0) return "0";
  return distance < 10000
    ? `${formatNumber(distance.toFixed(0))}m`
    : `${formatNumber((distance / 1000).toFixed(1))}km`;
}

/**
 * Format bearing with degree symbol
 * @param {number} bearing - Bearing in degrees
 * @returns {string} Formatted bearing string
 */
export function formatBearing(bearing) {
  if (!bearing || isNaN(bearing)) return "N/A";
  return `${formatNumber(bearing.toFixed(1))}°T`;
}

/**
 * Format speed for display (legacy alias)
 * @param {number} v - Speed in m/s
 * @returns {string} Formatted speed
 */
export function sp(v) {
  return formatNumber(v * 3.6, 1);
}
