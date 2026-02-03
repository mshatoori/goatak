/**
 * Coordinate Utilities
 *
 * Functions for coordinate formatting, conversion, and calculations.
 */
import { formatNumber } from "./formatting.js";

/**
 * Create a latlng object (MapLibre compatible)
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @returns {{lat: number, lng: number}} Lat/lng object
 */
export function latlng(lat, lon) {
  return { lat, lng: lon };
}

/**
 * Print coordinates from a latlng object
 * @param {{lat: number, lng: number}} latlng - Lat/lng object
 * @returns {string} Formatted coordinates
 */
export function printCoordsll(latlng) {
  return printCoords(latlng.lat, latlng.lng);
}

/**
 * Print coordinates in ISO 6709 format: DD°MM′SS″N/S DDD°MM′SS″E/W
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {string} Formatted coordinate string
 */
export function printCoords(lat, lng) {
  const absLat = Math.abs(lat);
  const absLng = Math.abs(lng);

  const latDeg = Math.floor(absLat);
  const latMin = Math.floor((absLat - latDeg) * 60);
  const latSec = Math.round(((absLat - latDeg) * 60 - latMin) * 60);

  const lngDeg = Math.floor(absLng);
  const lngMin = Math.floor((absLng - lngDeg) * 60);
  const lngSec = Math.round(((absLng - lngDeg) * 60 - lngMin) * 60);

  const format = (n) => n.toLocaleString("fa-IR");

  // Handle seconds overflow
  let finalLatMin = latMin;
  let finalLatDeg = latDeg;
  let finalLatSec = latSec;
  if (latSec >= 60) {
    finalLatSec = 0;
    finalLatMin += 1;
    if (finalLatMin >= 60) {
      finalLatMin = 0;
      finalLatDeg += 1;
    }
  }

  let finalLngMin = lngMin;
  let finalLngDeg = lngDeg;
  let finalLngSec = lngSec;
  if (lngSec >= 60) {
    finalLngSec = 0;
    finalLngMin += 1;
    if (finalLngMin >= 60) {
      finalLngMin = 0;
      finalLngDeg += 1;
    }
  }

  const latHemisphere = lat >= 0 ? "N" : "S";
  const lngHemisphere = lng >= 0 ? "E" : "W";

  const latStr =
    format(finalLatDeg) +
    "°" +
    format(finalLatMin).padStart(2, "۰") +
    "′" +
    format(finalLatSec).padStart(2, "۰") +
    "″" +
    latHemisphere;

  const lngStr =
    format(finalLngDeg) +
    "°" +
    format(finalLngMin).padStart(2, "۰") +
    "′" +
    format(finalLngSec).padStart(2, "۰") +
    "″" +
    lngHemisphere;

  return latStr + " " + lngStr;
}

/**
 * Format coordinates in degrees, minutes, seconds (alternative format)
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {string} Formatted coordinate string
 */
export function formatCoordinates(lat, lng) {
  if (!lat || !lng) return "N/A";

  const absLat = Math.abs(lat);
  const absLng = Math.abs(lng);

  const latDeg = Math.floor(absLat);
  const latMin = Math.floor((absLat - latDeg) * 60);
  const latSec = Math.round(((absLat - latDeg) * 60 - latMin) * 60);

  const lngDeg = Math.floor(absLng);
  const lngMin = Math.floor((absLng - lngDeg) * 60);
  const lngSec = Math.round(((absLng - lngDeg) * 60 - lngMin) * 60);

  const latDir = lat >= 0 ? "N" : "S";
  const lngDir = lng >= 0 ? "E" : "W";

  return `${formatNumber(latDeg)}°${formatNumber(latMin)}′${formatNumber(
    latSec,
  )}″${latDir} ${formatNumber(lngDeg)}°${formatNumber(lngMin)}′${formatNumber(
    lngSec,
  )}″${lngDir}`;
}

/**
 * Convert lat/long to ISO 6709 string format
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @returns {string} ISO 6709 formatted string
 */
export function latLongToIso6709(lat, lon) {
  const isLatNegative = lat < 0;
  const isLonNegative = lon < 0;
  lat = Math.abs(lat);
  lon = Math.abs(lon);

  const degreesLat = Math.floor(lat);
  const minutesLat = Math.floor((lat - degreesLat) * 60);
  const decimalMinutesLat = (
    ((lat - degreesLat) * 60 - minutesLat) *
    60
  ).toFixed(2);

  const degreesLon = Math.floor(lon);
  const minutesLon = Math.floor((lon - degreesLon) * 60);
  const decimalMinutesLon = (
    ((lon - degreesLon) * 60 - minutesLon) *
    60
  ).toFixed(2);

  const latHemisphere = isLatNegative ? "S" : "N";
  const lonHemisphere = isLonNegative ? "W" : "E";

  const isoLat =
    degreesLat +
    "°" +
    minutesLat +
    "'" +
    decimalMinutesLat +
    '"' +
    latHemisphere;
  const isoLon =
    degreesLon +
    "°" +
    minutesLon +
    "'" +
    decimalMinutesLon +
    '"' +
    lonHemisphere;

  return isoLat + " " + isoLon;
}
