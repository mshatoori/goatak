/**
 * Send Mode Constants
 *
 * Defines the different message sending modes available in the application.
 */

/** @type {string} */
export const SEND_MODE_BROADCAST = "broadcast";

/** @type {string} */
export const SEND_MODE_SUBNET = "subnet";

/** @type {string} */
export const SEND_MODE_DIRECT = "direct";

/** @type {string} */
export const SEND_MODE_NONE = "none";

/**
 * All available send modes
 * @type {string[]}
 */
export const SEND_MODES = [
  SEND_MODE_BROADCAST,
  SEND_MODE_SUBNET,
  SEND_MODE_DIRECT,
  SEND_MODE_NONE,
];

/**
 * Default send mode
 * @type {string}
 */
export const DEFAULT_SEND_MODE = SEND_MODE_BROADCAST;

/**
 * Send mode labels for display
 * @type {Object.<string, string>}
 */
export const SEND_MODE_LABELS = {
  [SEND_MODE_BROADCAST]: "Broadcast",
  [SEND_MODE_SUBNET]: "Subnet",
  [SEND_MODE_DIRECT]: "Direct",
  [SEND_MODE_NONE]: "None",
};

/**
 * Check if a send mode is valid
 * @param {string} mode - The send mode to check
 * @returns {boolean}
 */
export function isValidSendMode(mode) {
  return SEND_MODES.includes(mode);
}
