/**
 * Math Utilities
 *
 * Mathematical calculation functions for distances, bearings, etc.
 */
import { formatNumber } from "./formatting.js";

/**
 * Calculate distance and bearing between two points
 * @param {{lat: number, lng: number}} p1 - First point
 * @param {{lat: number, lng: number}} p2 - Second point
 * @returns {string} Formatted distance and bearing string
 */
export function distBea(p1, p2) {
  const toRadian = Math.PI / 180;

  // Calculate bearing
  const y =
    Math.sin((p2.lng - p1.lng) * toRadian) * Math.cos(p2.lat * toRadian);
  const x =
    Math.cos(p1.lat * toRadian) * Math.sin(p2.lat * toRadian) -
    Math.sin(p1.lat * toRadian) *
      Math.cos(p2.lat * toRadian) *
      Math.cos((p2.lng - p1.lng) * toRadian);
  let brng = (Math.atan2(y, x) * 180) / Math.PI;
  brng += brng < 0 ? 360 : 0;

  // Calculate distance using haversine formula
  const R = 6371000; // Earth's radius in meters
  const deltaF = (p2.lat - p1.lat) * toRadian;
  const deltaL = (p2.lng - p1.lng) * toRadian;
  const a =
    Math.sin(deltaF / 2) * Math.sin(deltaF / 2) +
    Math.cos(p1.lat * toRadian) *
      Math.cos(p2.lat * toRadian) *
      Math.sin(deltaL / 2) *
      Math.sin(deltaL / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return (
    (distance < 10000
      ? formatNumber(distance, 0) + "m "
      : formatNumber(distance / 1000, 1) + "km ") +
    formatNumber(brng, 1) +
    "°T"
  );
}

/**
 * Calculate distance between two points in meters
 * @param {{lat: number, lng: number}} p1 - First point
 * @param {{lat: number, lng: number}} p2 - Second point
 * @returns {number} Distance in meters
 */
export function calculateDistance(p1, p2) {
  const toRadian = Math.PI / 180;
  const R = 6371000; // Earth's radius in meters
  const deltaF = (p2.lat - p1.lat) * toRadian;
  const deltaL = (p2.lng - p1.lng) * toRadian;
  const a =
    Math.sin(deltaF / 2) * Math.sin(deltaF / 2) +
    Math.cos(p1.lat * toRadian) *
      Math.cos(p2.lat * toRadian) *
      Math.sin(deltaL / 2) *
      Math.sin(deltaL / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Calculate bearing between two points
 * @param {{lat: number, lng: number}} p1 - First point
 * @param {{lat: number, lng: number}} p2 - Second point
 * @returns {number} Bearing in degrees (0-360)
 */
export function calculateBearing(p1, p2) {
  const toRadian = Math.PI / 180;
  const y =
    Math.sin((p2.lng - p1.lng) * toRadian) * Math.cos(p2.lat * toRadian);
  const x =
    Math.cos(p1.lat * toRadian) * Math.sin(p2.lat * toRadian) -
    Math.sin(p1.lat * toRadian) *
      Math.cos(p2.lat * toRadian) *
      Math.cos((p2.lng - p1.lng) * toRadian);
  let brng = (Math.atan2(y, x) * 180) / Math.PI;
  brng += brng < 0 ? 360 : 0;
  return brng;
}
