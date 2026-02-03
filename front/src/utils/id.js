/**
 * ID Generation Utilities
 *
 * Functions for generating unique identifiers.
 */

/**
 * Generate a UUID v4
 * @returns {string} UUID string
 */
export function uuidv4() {
  return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, (c) =>
    (
      c ^
      (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))
    ).toString(16),
  );
}

/**
 * Generate a short ID (8 characters)
 * @returns {string} Short ID
 */
export function shortId() {
  return uuidv4().substring(0, 8);
}

/**
 * Generate a category-prefixed ID
 * @param {string} category - Category prefix (e.g., 'u', 'p', 'r')
 * @returns {string} Prefixed ID
 */
export function generateId(category) {
  return `${category}_${shortId()}`;
}
