/**
 * Template Utilities
 *
 * Functions for template string processing.
 */

/**
 * HTML template literal tag
 * Allows using String.raw functionality with template literals
 * @param {TemplateStringsArray} strings - Template strings array
 * @param {...any} values - Interpolated values
 * @returns {string} Raw string with preserved escape sequences
 * @example
 * const html = html`<div class="foo">${content}</div>`;
 */
export function html(strings, ...values) {
  return String.raw({ raw: strings }, ...values);
}

/**
 * Escape HTML special characters to prevent XSS
 * @param {string} str - String to escape
 * @returns {string} Escaped string
 */
export function escapeHtml(str) {
  if (typeof str !== "string") return "";
  return str
    .replace(/&/g, "&")
    .replace(/</g, "<")
    .replace(/>/g, ">")
    .replace(/"/g, """)
    .replace(/'/g, "&#039;");
}

/**
 * Template for creating a simple HTML element
 * @param {string} tag - HTML tag name
 * @param {Object} attrs - Attributes object
 * @param {string} content - Inner content
 * @returns {string} HTML string
 */
export function createElement(tag, attrs = {}, content = "") {
  const attrString = Object.entries(attrs)
    .map(([key, value]) => `${key}="${escapeHtml(String(value))}"`)
    .join(" ");
  return `<${tag}${attrString ? " " + attrString : ""}>${content}</${tag}>`;
}
