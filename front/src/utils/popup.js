/**
 * Popup/Tooltip Utilities
 *
 * Functions for generating popup and tooltip content.
 */
import { dt } from "./dateTime.js";
import { distBea } from "./math.js";
import { formatNumber } from "./formatting.js";
import { latLongToIso6709 } from "./coordinates.js";
import { TOOLTIP_FIELD_CONFIG } from "../constants/tooltip.js";
import { humanReadableType } from "./items.js";

/**
 * Generate tooltip content for a map marker
 * @param {Object} item - The item to generate tooltip for
 * @param {Object} selfCoords - Optional self coordinates {lat, lon} for distance calculation
 * @param {boolean} isSelf - Whether this is the self marker (skip distance calculation)
 * @returns {string} HTML content for the tooltip
 */
export function popup(item, selfCoords, isSelf) {
  let v = "";

  // Callsign - always shown in bold
  if (TOOLTIP_FIELD_CONFIG.callsign) {
    v += "<b>" + item.callsign + "</b><br/>";
  }

  // Human readable type
  if (TOOLTIP_FIELD_CONFIG.humanReadableType && item.type) {
    const readableType = humanReadableType(item.type);
    // Only show if it's different from the raw type
    if (readableType && readableType !== item.type) {
      v += "نوع: " + readableType + "<br/>";
    }
  }

  // Last seen/update time
  if (TOOLTIP_FIELD_CONFIG.lastSeen && item.last_seen) {
    v += "آخرین آپدیت: " + dt(item.last_seen) + "<br/>";
  }

  // Distance to self (only if not self marker and selfCoords provided)
  if (
    TOOLTIP_FIELD_CONFIG.distanceToSelf &&
    !isSelf &&
    selfCoords &&
    selfCoords.lat !== undefined &&
    selfCoords.lon !== undefined
  ) {
    const selfPoint = { lat: selfCoords.lat, lng: selfCoords.lon };
    const itemPoint = { lat: item.lat, lng: item.lon };
    const distanceInfo = distBea(selfPoint, itemPoint);
    v += "فاصله: " + distanceInfo + "<br/>";
  }

  // Speed (only if > 0)
  if (TOOLTIP_FIELD_CONFIG.speed && item.speed && item.speed > 0) {
    v += "سرعت: " + formatNumber(item.speed * 3.6, 1) + " km/h<br/>";
  }

  // Altitude (only for air units)
  if (
    TOOLTIP_FIELD_CONFIG.altitude &&
    item.sidc &&
    item.sidc.charAt(2) === "A"
  ) {
    v += "ارتفاع: " + formatNumber(item.hae, 0) + " m<br/>";
  }

  // Heading/Course
  if (TOOLTIP_FIELD_CONFIG.course && item.course && item.course > 0) {
    v += "جهت: " + formatNumber(item.course, 0) + "°<br/>";
  }

  // Status (for contacts)
  if (TOOLTIP_FIELD_CONFIG.status && item.status) {
    v += "وضعیت: " + item.status + "<br/>";
  }

  // Coordinates
  if (TOOLTIP_FIELD_CONFIG.coordinates) {
    v +=
      '<span dir="ltr">' +
      latLongToIso6709(item.lat, item.lon) +
      "</span><br/>";
  }

  // Text/Remarks
  if (TOOLTIP_FIELD_CONFIG.text && item.text) {
    v += item.text.replaceAll("\n", "<br/>").replaceAll("; ", "<br/>");
  }

  return v;
}

/**
 * Generate tooltip content for the self marker
 * @param {Object} config - The config object with self information
 * @returns {string} HTML content for the tooltip
 */
export function selfPopup(config) {
  let v = "<b>" + config.callsign + "</b><br/>";

  // Team and role if available
  if (config.team) {
    v += config.team;
    if (config.role) {
      v += " " + config.role;
    }
    v += "<br/>";
  }

  // Coordinates
  if (TOOLTIP_FIELD_CONFIG.coordinates) {
    v +=
      '<span dir="ltr">' +
      latLongToIso6709(config.lat, config.lon) +
      "</span><br/>";
  }

  return v;
}
