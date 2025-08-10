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
    return { uri: "/static/icons/b.png", x: 16, y: 16 };
  }
  if (item.type.startsWith("b-a-o-")) {
    return { uri: "/static/icons/" + item.type + ".png", x: 16, y: 16 };
  }
  if (item.type === "b-m-p-w-GOTO") {
    return { uri: "/static/icons/green_flag.png", x: 6, y: 30 };
  }
  if (item.type === "b-m-p-s-p-op") {
    return { uri: "/static/icons/binos.png", x: 16, y: 16 };
  }
  if (item.type === "b-m-p-s-p-loc") {
    return { uri: "/static/icons/sensor_location.png", x: 16, y: 16 };
  }
  if (item.type === "b-m-p-s-p-i") {
    return { uri: "/static/icons/b-m-p-s-p-i.png", x: 16, y: 16 };
  }
  if (item.type === "b-m-p-a") {
    return { uri: "/static/icons/aimpoint.png", x: 16, y: 16 };
  }
  if (item.category === "point") {
    return {
      uri: toUri(circle(16, item.color ?? "black", "#000", null)),
      x: 8,
      y: 8,
    };
  }
  if (item.type === "b-r-f-h-c") {
    return { uri: "/static/icons/casevac.svg", x: 16, y: 16 };
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
      opts["speed"] = (item.speed * 3.6).toFixed(1) + " km/h";
      opts["direction"] = item.course;
    }
    if (item.sidc.charAt(2) === "A") {
      opts["altitudeDepth"] = item.hae.toFixed(0) + " m";
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
  return (
    ("0" + d.getDate()).slice(-2) +
    "-" +
    ("0" + (d.getMonth() + 1)).slice(-2) +
    "-" +
    d.getFullYear() +
    " " +
    ("0" + d.getHours()).slice(-2) +
    ":" +
    ("0" + d.getMinutes()).slice(-2)
  );
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
    finalLatDeg +
    "°" +
    finalLatMin.toString().padStart(2, "0") +
    "′" +
    finalLatSec.toString().padStart(2, "0") +
    "″" +
    latHemisphere;

  const lngStr =
    finalLngDeg +
    "°" +
    finalLngMin.toString().padStart(2, "0") +
    "′" +
    finalLngSec.toString().padStart(2, "0") +
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
      ? distance.toFixed(0) + "m "
      : (distance / 1000).toFixed(1) + "km ") +
    brng.toFixed(1) +
    "°T"
  );
}

function sp(v) {
  return (v * 3.6).toFixed(1);
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

function popup(item) {
  let v = "<b>" + item.callsign + "</b><br/>";
  if (item.team) v += item.team + " " + item.role + "<br/>";
  if (item.speed && item.speed > 0)
    v += "Speed: " + item.speed.toFixed(0) + " m/s<br/>";
  if (item.sidc.charAt(2) === "A") {
    v += "hae: " + item.hae.toFixed(0) + " m<br/>";
  }
  v +=
    '<span dir="ltr">' + latLongToIso6709(item.lat, item.lon) + "</span><br/>";
  v += item.text.replaceAll("\n", "<br/>").replaceAll("; ", "<br/>");
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

Vue.prototype.Utils = {
  getIconUri: getIconUri,
  getMilIcon: getMilIcon,
  getIcon: getIcon,
  circle: circle,
  dt: dt,
  printCoordsll: printCoordsll,
  printCoords: printCoords,
  latlng: latlng,
  distBea: distBea,
  sp: sp,
  toUri: toUri,
  uuidv4: uuidv4,
  popup: popup,
  latLongToIso6709: latLongToIso6709,
  needIconUpdate: needIconUpdate,
  humanReadableType: humanReadableType,
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
