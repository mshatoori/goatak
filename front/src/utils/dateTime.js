/**
 * Date and Time Utilities
 *
 * Functions for formatting dates and times.
 */

/**
 * Format a date string to Persian locale string
 * @param {string} str - ISO date string
 * @returns {string} Formatted date string in Persian locale
 */
export function dt(str) {
  let d = new Date(Date.parse(str));
  return d.toLocaleString("fa-IR");
}

/**
 * Format date to relative time (e.g., "2 minutes ago")
 * @param {string|Date} date - Date to format
 * @returns {string} Relative time string
 */
export function timeAgo(date) {
  const now = new Date();
  const then = new Date(date);
  const seconds = Math.floor((now - then) / 1000);

  if (seconds < 60) return "همین الان";
  if (seconds < 3600) return `${Math.floor(seconds / 60)} دقیقه پیش`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} ساعت پیش`;
  return `${Math.floor(seconds / 86400)} روز پیش`;
}

/**
 * Check if a date is stale (older than staleTime)
 * @param {string|Date} date - Date to check
 * @param {string|Date} staleTime - Stale threshold
 * @returns {boolean}
 */
export function isStale(date, staleTime) {
  return new Date(date) < new Date(staleTime);
}
