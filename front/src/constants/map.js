/**
 * Map Configuration Constants
 *
 * Default values and settings for the map component.
 */

/**
 * Default map center coordinates [lat, lon]
 * @type {[number, number]}
 */
export const DEFAULT_MAP_CENTER = [35.7, 51.4];

/**
 * Default map zoom level
 * @type {number}
 */
export const DEFAULT_MAP_ZOOM = 11;

/**
 * Minimum allowed zoom level
 * @type {number}
 */
export const MIN_MAP_ZOOM = 3;

/**
 * Maximum allowed zoom level
 * @type {number}
 */
export const MAX_MAP_ZOOM = 19;

/**
 * Default map configuration object
 * @type {Object}
 */
export const DEFAULT_MAP_CONFIG = {
  center: DEFAULT_MAP_CENTER,
  zoom: DEFAULT_MAP_ZOOM,
  minZoom: MIN_MAP_ZOOM,
  maxZoom: MAX_MAP_ZOOM,
};

/**
 * Map marker icon sizes
 * @type {Object.<string, number>}
 */
export const MARKER_SIZES = {
  small: 16,
  medium: 24,
  large: 32,
};

/**
 * Default marker size
 * @type {number}
 */
export const DEFAULT_MARKER_SIZE = 24;
