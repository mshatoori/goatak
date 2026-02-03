/**
 * Color Constants
 *
 * Maps color names to CSS color values used throughout the application.
 */

/**
 * Map of color names to CSS color values
 * @type {Map<string, string>}
 */
export const COLOR_MAP = new Map([
  ["Clear", "white"],
  ["White", "white"],
  ["Yellow", "yellow"],
  ["Orange", "orange"],
  ["Magenta", "magenta"],
  ["Red", "red"],
  ["Maroon", "maroon"],
  ["Purple", "purple"],
  ["Dark Blue", "darkblue"],
  ["Blue", "blue"],
  ["Cyan", "cyan"],
  ["Teal", "teal"],
  ["Green", "green"],
  ["Dark Green", "darkgreen"],
  ["Brown", "brown"],
]);

/**
 * Get CSS color value from color name
 * @param {string} colorName - The color name
 * @returns {string} The CSS color value
 */
export function getColor(colorName) {
  return COLOR_MAP.get(colorName) || "black";
}

/**
 * Default color for items without a specified color
 * @type {string}
 */
export const DEFAULT_COLOR = "black";

/**
 * Default background color for icons
 * @type {string}
 */
export const DEFAULT_BG_COLOR = "#000";
