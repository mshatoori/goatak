/**
 * Timeout and Interval Constants
 *
 * Time-related constants for polling, reconnection, and delays.
 */

/**
 * WebSocket reconnection interval in milliseconds
 * @type {number}
 */
export const WS_RECONNECT_INTERVAL = 3000;

/**
 * Unit fetch interval in milliseconds
 * @type {number}
 */
export const UNIT_FETCH_INTERVAL = 5000;

/**
 * Default request timeout in milliseconds
 * @type {number}
 */
export const REQUEST_TIMEOUT = 10000;

/**
 * Debounce delay for search inputs in milliseconds
 * @type {number}
 */
export const SEARCH_DEBOUNCE_DELAY = 300;

/**
 * Notification display duration in milliseconds
 * @type {number}
 */
export const NOTIFICATION_DURATION = 5000;

/**
 * Maximum reconnection attempts
 * @type {number}
 */
export const MAX_RECONNECT_ATTEMPTS = 5;
