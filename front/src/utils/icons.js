/**
 * Icon Utilities
 *
 * Functions for generating and managing icons.
 */
import {
  COLOR_MAP,
  DEFAULT_COLOR,
  DEFAULT_BG_COLOR,
} from "../constants/colors.js";

/**
 * Generate an icon URI for an item
 * @param {Object} item - The item to generate icon for
 * @param {boolean} withText - Whether to include text on the icon
 * @returns {{uri: string, x: number, y: number}} Icon URI and anchor points
 */
export function getIconUri(item, withText) {
  if (item === null) {
    return {
      uri: "",
      x: 0,
      y: 0,
    };
  }

  if (item.icon && item.icon.startsWith("COT_MAPPING_SPOTMAP/")) {
    return {
      uri: toUri(
        circle(16, item.color ?? DEFAULT_COLOR, DEFAULT_BG_COLOR, null),
      ),
      x: 8,
      y: 8,
    };
  }

  if (item.type === "b") {
    return { uri: "static/icons/b.png", x: 16, y: 16 };
  }

  if (item.type.startsWith("b-a-o-")) {
    return { uri: "static/icons/" + item.type + ".png", x: 16, y: 16 };
  }

  if (item.type === "b-m-p-w-GOTO") {
    return { uri: "static/icons/green_flag.png", x: 6, y: 30 };
  }

  if (item.type === "b-m-p-s-p-op") {
    return { uri: "static/icons/binoculars.png", x: 16, y: 16 };
  }

  if (item.type === "b-m-p-s-p-loc") {
    return { uri: "static/icons/sensor_location.png", x: 16, y: 16 };
  }

  if (item.type === "b-m-p-s-p-i") {
    return { uri: "static/icons/b-m-p-s-p-i.png", x: 16, y: 16 };
  }

  if (item.type === "b-m-p-a") {
    return { uri: "static/icons/aimpoint.png", x: 16, y: 16 };
  }

  if (item.category === "point") {
    return {
      uri: toUri(
        circle(16, item.color ?? DEFAULT_COLOR, DEFAULT_BG_COLOR, null),
      ),
      x: 8,
      y: 8,
    };
  }

  if (item.type === "b-r-f-h-c") {
    return { uri: "static/icons/casevac.svg", x: 16, y: 16 };
  }

  return getMilIcon(item, withText);
}

/**
 * Generate a military symbol icon using milsymbol
 * @param {Object} item - The item to generate icon for
 * @param {boolean} withText - Whether to include text
 * @returns {{uri: string, x: number, y: number}} Icon URI and anchor points
 */
export function getMilIcon(item, withText) {
  let opts = { size: 24 };

  if (!item.sidc) {
    return "";
  }

  if (withText) {
    if (item.speed > 0) {
      opts["speed"] = (item.speed * 3.6).toFixed(1) + " km/h";
      opts["direction"] = item.course;
    }
    if (item.sidc.charAt(2) === "A") {
      opts["altitudeDepth"] = (item.hae || 0).toFixed(0) + " m";
    }
  }

  let symb = new ms.Symbol(item.sidc, opts);
  return {
    uri: symb.toDataURL(),
    x: symb.getAnchor().x,
    y: symb.getAnchor().y,
  };
}

/**
 * Create an SVG circle
 * @param {number} size - Size of the circle
 * @param {string} color - Fill color
 * @param {string} bg - Stroke/background color
 * @param {string|null} text - Optional text to display
 * @returns {string} SVG string
 */
export function circle(size, color, bg, text) {
  let x = Math.round(size / 2);
  let r = x - 1;

  let s =
    '<svg width="' +
    size +
    '" height="' +
    size +
    '" xmlns="http://www.w3.org/2000/svg"><metadata id="metadata1">image/svg+xml</metadata>';
  s +=
    '<circle style="fill: ' +
    color +
    "; stroke: " +
    bg +
    ';" cx="' +
    x +
    '" cy="' +
    x +
    '" r="' +
    r +
    '"/>';

  if (text != null && text !== "") {
    s +=
      '<text x="50%" y="50%" text-anchor="middle" font-size="12px" font-family="Arial" dy=".3em">' +
      text +
      "</text>";
  }
  s += "</svg>";
  return s;
}

/**
 * Convert SVG string to data URI
 * @param {string} s - SVG string
 * @returns {string} Data URI
 */
export function toUri(s) {
  return encodeURI("data:image/svg+xml," + s).replaceAll("#", "%23");
}

/**
 * Check if an icon needs to be updated based on property changes
 * @param {Object} oldUnit - Previous unit state
 * @param {Object} newUnit - New unit state
 * @returns {boolean} Whether icon needs update
 */
export function needIconUpdate(oldUnit, newUnit) {
  if (oldUnit.sidc !== newUnit.sidc || oldUnit.status !== newUnit.status)
    return true;
  if (
    oldUnit.speed !== newUnit.speed ||
    oldUnit.direction !== newUnit.direction
  )
    return true;
  if (oldUnit.team !== newUnit.team || oldUnit.role !== newUnit.role)
    return true;

  if (newUnit.sidc.charAt(2) === "A" && oldUnit.hae !== newUnit.hae)
    return true;
  return false;
}
