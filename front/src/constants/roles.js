/**
 * Role Constants
 *
 * Maps full role names to their abbreviated forms used in the application.
 */

/**
 * Map of full role names to abbreviations
 * @type {Map<string, string>}
 */
export const ROLE_MAP = new Map([
  ["HQ", "HQ"],
  ["Team Lead", "TL"],
  ["K9", "K9"],
  ["Forward Observer", "FO"],
  ["Sniper", "S"],
  ["Medic", "M"],
  ["RTO", "R"],
]);

/**
 * Get role abbreviation from full role name
 * @param {string} roleName - The full role name
 * @returns {string} The role abbreviation or the original name if not found
 */
export function getRoleAbbreviation(roleName) {
  return ROLE_MAP.get(roleName) || roleName;
}

/**
 * List of all available roles
 * @type {string[]}
 */
export const AVAILABLE_ROLES = Array.from(ROLE_MAP.keys());
