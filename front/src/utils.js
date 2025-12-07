import store from "./store.js";

if (window.baseUrl === undefined) {
  window.baseUrl = ""; // Default value
}

const colors = new Map([
  ["Clear", "white"],
  ["White", "white"],
  ["Yellow", "yellow"],
  ["Orange", "orange"],
  ["Magenta", "magenta"],
  ["Red", "red"],
  ["Maroon", "maroon"],
  ["Purple", "purple"],
  ["Dark Blue", "darkblue"],
  ["Blue", "blue"],
  ["Cyan", "cyan"],
  ["Teal", "teal"],
  ["Green", "green"],
  ["Dark Green", "darkgreen"],
  ["Brown", "brown"],
]);

const roles = new Map([
  ["HQ", "HQ"],
  ["Team Lead", "TL"],
  ["K9", "K9"],
  ["Forward Observer", "FO"],
  ["Sniper", "S"],
  ["Medic", "M"],
  ["RTO", "R"],
]);

// Tooltip field configuration - controls which fields are shown in marker tooltips
const tooltipFieldConfig = {
  callsign: true, // Always show (bold)
  humanReadableType: true, // Use humanReadableType(item.type)
  lastSeen: true, // Format item.last_seen with dt()
  distanceToSelf: true, // Calculate using distBea(), needs access to self coords
  // team: true,               // Show team + role
  speed: true, // Show if > 0
  altitude: true, // Show for air units (sidc[2] === 'A')
  coordinates: true, // lat/lon formatted
  course: false, // Heading in degrees
  status: false, // Online/Offline for contacts
  text: true, // Remarks
};

function getIconUri(item, withText) {
  // TEMP:
  // if (item.team && item.role) {
  //     let col = "#555";
  //     if (item.status !== "Offline") {
  //         col = colors.get(item.team);
  //     }
  //     return {uri: toUri(circle(24, col, '#000', roles.get(item.role) ?? '')), x: 12, y: 12};
  // }
  if (item === null)
    return {
      uri: "",
      x: 0,
      y: 0,
    };
  if (item.icon && item.icon.startsWith("COT_MAPPING_SPOTMAP/")) {
    return {
      uri: toUri(circle(16, item.color ?? "black", "#000", null)),
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
      uri: toUri(circle(16, item.color ?? "black", "#000", null)),
      x: 8,
      y: 8,
    };
  }
  if (item.type === "b-r-f-h-c") {
    return { uri: "static/icons/casevac.svg", x: 16, y: 16 };
  }
  return getMilIcon(item, withText);
}

function getMilIcon(item, withText) {
  let opts = { size: 24 };

  // console.log("[getMilIcon]", item);

  if (!item.sidc) {
    return "";
  }

  // if (item.team && item.role) {
  //     opts["uniqueDesignation"] = item.uid
  // }

  if (withText) {
    // opts['uniqueDesignation'] = item.callsign;
    if (item.speed > 0) {
      opts["speed"] = formatNumber(item.speed * 3.6, 1) + " km/h";
      opts["direction"] = item.course;
    }
    if (item.sidc.charAt(2) === "A") {
      opts["altitudeDepth"] = formatNumber(item.hae, 0) + " m";
    }
  }

  let symb = new ms.Symbol(item.sidc, opts);
  return {
    uri: symb.toDataURL(),
    x: symb.getAnchor().x,
    y: symb.getAnchor().y,
  };
}

function getIcon(item, withText) {
  let img = getIconUri(item, withText);

  // console.log("[getIcon] image = ", img);

  return L.icon({
    iconUrl: img.uri,
    iconAnchor: [img.x, img.y],
  });
}

function circle(size, color, bg, text) {
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

function dt(str) {
  let d = new Date(Date.parse(str));
  return d.toLocaleString("fa-IR");
}

function printCoordsll(latlng) {
  return Vue.prototype.Utils.printCoords(latlng.lat, latlng.lng);
}

function printCoords(lat, lng) {
  // ISO 6709 format: DD°MM′SS″N/S DDD°MM′SS″E/W
  const absLat = Math.abs(lat);
  const absLng = Math.abs(lng);

  // Convert to degrees, minutes, seconds
  const latDeg = Math.floor(absLat);
  const latMin = Math.floor((absLat - latDeg) * 60);
  const latSec = Math.round(((absLat - latDeg) * 60 - latMin) * 60);

  const lngDeg = Math.floor(absLng);
  const lngMin = Math.floor((absLng - lngDeg) * 60);
  const lngSec = Math.round(((absLng - lngDeg) * 60 - lngMin) * 60);

  // Format numbers with Persian locale
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

  // Determine hemispheres
  const latHemisphere = lat >= 0 ? "N" : "S";
  const lngHemisphere = lng >= 0 ? "E" : "W";

  // Format: DD°MM′SS″N DDD°MM′SS″W
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

function latlng(lat, lon) {
  return L.latLng(lat, lon);
}

function distBea(p1, p2) {
  let toRadian = Math.PI / 180;
  // haversine formula
  // bearing
  let y = Math.sin((p2.lng - p1.lng) * toRadian) * Math.cos(p2.lat * toRadian);
  let x =
    Math.cos(p1.lat * toRadian) * Math.sin(p2.lat * toRadian) -
    Math.sin(p1.lat * toRadian) *
      Math.cos(p2.lat * toRadian) *
      Math.cos((p2.lng - p1.lng) * toRadian);
  let brng = (Math.atan2(y, x) * 180) / Math.PI;
  brng += brng < 0 ? 360 : 0;
  // distance
  let R = 6371000; // meters
  let deltaF = (p2.lat - p1.lat) * toRadian;
  let deltaL = (p2.lng - p1.lng) * toRadian;
  let a =
    Math.sin(deltaF / 2) * Math.sin(deltaF / 2) +
    Math.cos(p1.lat * toRadian) *
      Math.cos(p2.lat * toRadian) *
      Math.sin(deltaL / 2) *
      Math.sin(deltaL / 2);
  let c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  let distance = R * c;
  return (
    (distance < 10000
      ? formatNumber(distance, 0) + "m "
      : formatNumber(distance / 1000, 1) + "km ") +
    formatNumber(brng, 1) +
    "°T"
  );
}

function sp(v) {
  return formatNumber(v * 3.6, 1);
}

function toUri(s) {
  return encodeURI("data:image/svg+xml," + s).replaceAll("#", "%23");
}

function uuidv4() {
  return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, (c) =>
    (
      c ^
      (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))
    ).toString(16)
  );
}

/**
 * Generate tooltip content for a map marker
 * @param {Object} item - The item to generate tooltip for
 * @param {Object} selfCoords - Optional self coordinates {lat, lon} for distance calculation
 * @param {boolean} isSelf - Whether this is the self marker (skip distance calculation)
 * @returns {string} HTML content for the tooltip
 */
function popup(item, selfCoords, isSelf) {
  let v = "";

  // Callsign - always shown in bold
  if (tooltipFieldConfig.callsign) {
    v += "<b>" + item.callsign + "</b><br/>";
  }

  // Human readable type
  if (tooltipFieldConfig.humanReadableType && item.type) {
    const readableType = humanReadableType(item.type);
    // Only show if it's different from the raw type (meaning we found a readable name)
    if (readableType && readableType !== item.type) {
      v += "نوع: " + readableType + "<br/>";
    }
  }

  // Last seen/update time
  if (tooltipFieldConfig.lastSeen && item.last_seen) {
    v += "آخرین آپدیت: " + dt(item.last_seen) + "<br/>";
  }

  // Distance to self (only if not self marker and selfCoords provided)
  if (
    tooltipFieldConfig.distanceToSelf &&
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

  // Team and role
  // if (tooltipFieldConfig.team && item.team) {
  //   v += item.team;
  //   if (item.role) {
  //     v += " " + item.role;
  //   }
  //   v += "<br/>";
  // }

  // Speed (only if > 0)
  if (tooltipFieldConfig.speed && item.speed && item.speed > 0) {
    v += "سرعت: " + formatNumber(item.speed * 3.6, 1) + " km/h<br/>";
  }

  // Altitude (only for air units)
  if (tooltipFieldConfig.altitude && item.sidc && item.sidc.charAt(2) === "A") {
    v += "ارتفاع: " + formatNumber(item.hae, 0) + " m<br/>";
  }

  // Heading/Course
  if (tooltipFieldConfig.course && item.course && item.course > 0) {
    v += "جهت: " + formatNumber(item.course, 0) + "°<br/>";
  }

  // Status (for contacts)
  if (tooltipFieldConfig.status && item.status) {
    v += "وضعیت: " + item.status + "<br/>";
  }

  // Coordinates
  if (tooltipFieldConfig.coordinates) {
    v +=
      '<span dir="ltr">' +
      latLongToIso6709(item.lat, item.lon) +
      "</span><br/>";
  }

  // Text/Remarks
  if (tooltipFieldConfig.text && item.text) {
    v += item.text.replaceAll("\n", "<br/>").replaceAll("; ", "<br/>");
  }

  return v;
}

/**
 * Generate tooltip content for the self marker
 * @param {Object} config - The config object with self information
 * @returns {string} HTML content for the tooltip
 */
function selfPopup(config) {
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
  if (tooltipFieldConfig.coordinates) {
    v +=
      '<span dir="ltr">' +
      latLongToIso6709(config.lat, config.lon) +
      "</span><br/>";
  }

  return v;
}

function latLongToIso6709(lat, lon) {
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

function needIconUpdate(oldUnit, newUnit) {
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

function cleanUnit(u) {
  let res = {};

  for (const k in u) {
    if (
      k !== "marker" &&
      k !== "infoMarker" &&
      k !== "textLabel" &&
      k !== "polygon"
    ) {
      res[k] = u[k];
    }
  }
  return res;
}

function humanReadableType(type) {
  switch (type) {
    case "u-d-f":
      return "ناحیه";
    case "b-m-r":
      return "مسیر";
  }

  let sidc = store.getSidc(type.substring(4));
  if (sidc) return sidc.name;
  return type;
}

// Export all utility functions
export {
  getIconUri,
  getMilIcon,
  getIcon,
  circle,
  dt,
  printCoordsll,
  printCoords,
  latlng,
  distBea,
  sp,
  formatNumber,
  toUri,
  uuidv4,
  popup,
  selfPopup,
  latLongToIso6709,
  needIconUpdate,
  humanReadableType,
  cleanUnit,
  createMapItem,
  LocationControl,
  ToolsControl,
  html,
  tooltipFieldConfig,
};

L.Marker.RotatedMarker = L.Marker.extend({
  _reset: function () {
    var pos = this._map.latLngToLayerPoint(this._latlng).round();

    L.DomUtil.setPosition(this._icon, pos);
    if (this._shadow) {
      L.DomUtil.setPosition(this._shadow, pos);
    }

    if (this.options.iconAngle) {
      this._icon.style.WebkitTransform =
        this._icon.style.WebkitTransform +
        " rotate(" +
        this.options.iconAngle +
        "deg)";
      this._icon.style.TransformOrigin = "center";
    }

    this._icon.style.zIndex = pos.y;
  },

  setIconAngle: function (iconAngle) {
    if (this._map) {
      this._removeIcon();
    }

    this.options.iconAngle = iconAngle;

    if (this._map) {
      this._initIcon();
      this._reset();
    }
  },
});

// Define LocationControl and ToolsControl before making them globally accessible
var LocationControl = L.Control.extend({
  options: {
    position: "bottomleft",
  },

  onAdd: function (map) {
    var controlName = "leaflet-control-location",
      container = L.DomUtil.create("div", controlName + " leaflet-bar"),
      options = this.options;

    this._button = this._createButton(
      '<i class="bi bi-crosshair" id="map-locate-btn"></i>',
      "My Location",
      controlName + "-in",
      container,
      this._locate
    );

    return container;
  },

  onRemove: function (map) {},

  _locate: function (e) {
    if (!this._disabled && this._map.options.locateCallback) {
      this._map.options.locateCallback(e);
    }
  },

  _createButton: function (html, title, className, container, fn) {
    var link = L.DomUtil.create("a", className, container);
    link.innerHTML = html;
    link.href = "#";
    link.title = title;

    /*
     * Will force screen readers like VoiceOver to read this as "Zoom in - button"
     */
    link.setAttribute("role", "button");
    link.setAttribute("aria-label", title);

    L.DomEvent.disableClickPropagation(link);
    // L.DomEvent.on(link, "click", stop);
    L.DomEvent.on(link, "click", fn, this);
    L.DomEvent.on(link, "click", this._refocusOnMap, this);

    return link;
  },
});

var ToolsControl = L.Control.extend({
  options: {
    position: "topleft",
  },

  onAdd: function (map) {
    var controlName = "leaflet-control-tools",
      container = L.DomUtil.create("div", controlName + " leaflet-bar"),
      options = this.options;

    this._pointButton = this._createButton(
      '<img src="static/icons/add-point.svg" id="map-add-point-btn" alt="Add Point" style="width: 30px; height: 30px;">',
      "افزودن نقطه به نقشه",
      controlName + "-in",
      container,
      this._addPoint
    );
    this._unitButton = this._createButton(
      '<img src="static/icons/add-unit.svg" id="map-add-unit-btn" alt="Add Unit" style="width: 30px; height: 30px;">',
      "افزودن نیرو به نقشه",
      controlName + "-in",
      container,
      this._addUnit
    );
    this._casevacButton = this._createButton(
      '<img src="static/icons/add-casevac.svg" id="map-add-casevac-btn" alt="Add Casevac" style="width: 30px; height: 30px;">',
      "افزودن درخواست امداد",
      controlName + "-in",
      container,
      this._addCasevac
    );
    // this._pointButton = this._createButton('<i class="bi bi-crosshair" id="map-add-point-btn"></i>', 'افزودن نقطه به نقشه',
    //     controlName + '-in', container, this._locate);

    return container;
  },

  onRemove: function (map) {},

  _addPoint: function (e) {
    if (!this._disabled && this._map.options.changeMode) {
      this._map.options.changeMode("add_point");
    }
  },

  _addUnit: function (e) {
    if (!this._disabled && this._map.options.changeMode) {
      this._map.options.changeMode("add_unit");
    }
  },

  _addCasevac: function (e) {
    if (!this._disabled && this._map.options.changeMode) {
      this._map.options.changeMode("add_casevac");
    }
  },

  _createButton: function (html, title, className, container, fn) {
    var link = L.DomUtil.create("a", className, container);
    link.innerHTML = html;
    link.href = "#";
    link.title = title;

    /*
     * Will force screen readers like VoiceOver to read this as "Zoom in - button"
     */
    link.setAttribute("role", "button");
    link.setAttribute("aria-label", title);

    L.DomEvent.disableClickPropagation(link);
    // L.DomEvent.on(link, "click", stop);
    L.DomEvent.on(link, "click", fn, this);
    L.DomEvent.on(link, "click", this._refocusOnMap, this);

    return link;
  },
});

// Make LocationControl and ToolsControl globally accessible
window.LocationControl = LocationControl;
window.ToolsControl = ToolsControl;

function createMapItem(options) {
  const now = new Date();
  const stale = new Date(now);
  stale.setDate(stale.getDate() + 365);

  const baseItem = {
    uid: options.uid || options.category[0] + "_" + uuidv4().substring(0, 6),
    category: options.category || "",
    callsign: options.callsign || "",
    sidc: options.sidc || "",
    start_time: now,
    last_seen: now,
    stale_time: stale,
    type: options.type || "",
    lat: options.lat || 0,
    lon: options.lon || 0,
    hae: options.hae || 0,
    speed: options.speed || 0,
    course: options.course || 0,
    status: options.status || "",
    text: options.text || "",
    parent_uid: options.parent_uid || "",
    parent_callsign: options.parent_callsign || "",
    local: options.local !== undefined ? options.local : true,
    send: options.send !== undefined ? options.send : true,
    web_sensor: options.web_sensor || "",
    links: options.links || [],
  };

  if (options.isNew !== undefined) {
    baseItem.isNew = options.isNew;
  }

  if (options.category === "drawing" || options.category === "route") {
    baseItem.color = options.color || "white";
    baseItem.geofence = options.geofence || false;
    baseItem.geofence_aff = options.geofence_aff || "All";
  }

  // Casevac Item
  if (options.category === "report" && options.type === "b-r-f-h-c") {
    baseItem.casevac_detail = {
      casevac: true,
      freq: 0,
      urgent: 0,
      priority: 0,
      routine: 0,
      hoist: false,
      extraction_equipment: false,
      ventilator: false,
      equipment_other: false,
      equipment_detail: "",
      litter: 0,
      ambulatory: 0,
      security: 0,
      us_military: 0,
      us_civilian: 0,
      nonus_military: 0,
      nonus_civilian: 0,
      epw: 0,
      child: 0,
      hlz_marking: 0,
    };
  }

  return baseItem;
}

const html = (strings, ...values) => String.raw({ raw: strings }, ...values);

/**
 * Format numbers with Persian locale
 * @param {number} num - The number to format
 * @param {number} decimals - Number of decimal places (default: 0)
 * @returns {string} Formatted number string
 */
function formatNumber(num, decimals = 0) {
  if (num === null || num === undefined || isNaN(num)) {
    return "0";
  }
  return num.toLocaleString("fa-IR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Format speed from m/s to km/h with Persian locale
 * @param {number} speed - Speed in m/s
 * @returns {string} Formatted speed string
 */
export function formatSpeed(speed) {
  if (!speed || speed <= 0) return "0";
  return formatNumber(speed * 3.6, 1);
}

/**
 * Format distance with appropriate units
 * @param {number} distance - Distance in meters
 * @returns {string} Formatted distance string
 */
export function formatDistance(distance) {
  if (!distance || distance < 0) return "0";
  return distance < 10000
    ? `${formatNumber(distance.toFixed(0))}m`
    : `${formatNumber((distance / 1000).toFixed(1))}km`;
}

/**
 * Format bearing with degree symbol
 * @param {number} bearing - Bearing in degrees
 * @returns {string} Formatted bearing string
 */
export function formatBearing(bearing) {
  if (!bearing || isNaN(bearing)) return "N/A";
  return `${formatNumber(bearing.toFixed(1))}°T`;
}

/**
 * Format coordinates in degrees, minutes, seconds
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

  // Format numbers with Persian locale
  const format = (n) => n.toLocaleString("fa-IR");

  const latDir = lat >= 0 ? "N" : "S";
  const lngDir = lng >= 0 ? "E" : "W";

  return `${format(latDeg)}°${format(latMin)}′${format(
    latSec
  )}″${latDir} ${format(lngDeg)}°${format(lngMin)}′${format(lngSec)}″${lngDir}`;
}
