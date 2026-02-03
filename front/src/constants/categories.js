/**
 * Item Category Constants
 *
 * Defines the different categories of items in the application.
 */

/** @type {string} */
export const CATEGORY_UNIT = "unit";

/** @type {string} */
export const CATEGORY_CONTACT = "contact";

/** @type {string} */
export const CATEGORY_POINT = "point";

/** @type {string} */
export const CATEGORY_ALARM = "alarm";

/** @type {string} */
export const CATEGORY_DRAWING = "drawing";

/** @type {string} */
export const CATEGORY_ROUTE = "route";

/** @type {string} */
export const CATEGORY_REPORT = "report";

/**
 * All item categories
 * @type {string[]}
 */
export const ITEM_CATEGORIES = [
  CATEGORY_UNIT,
  CATEGORY_CONTACT,
  CATEGORY_POINT,
  CATEGORY_ALARM,
  CATEGORY_DRAWING,
  CATEGORY_ROUTE,
  CATEGORY_REPORT,
];

/**
 * Check if a value is a valid item category
 * @param {string} category - The category to check
 * @returns {boolean}
 */
export function isValidCategory(category) {
  return ITEM_CATEGORIES.includes(category);
}
