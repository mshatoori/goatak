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
  if (item.icon && item.icon.startsWith("COT_MAPPING_SPOTMAP/")) {
    return {
      uri: toUri(circle(16, item.color ?? "green", "#000", null)),
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
      uri: toUri(circle(16, item.color ?? "green", "#000", null)),
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

Vue.prototype.Utils = {
  getIconUri: getIconUri,
  getMilIcon: getMilIcon,
  getIcon: getIcon,
};

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
  return lat.toFixed(6) + "," + lng.toFixed(6);
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

function formatDt(str) {
  // Renamed the second dt to formatDt
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
  dt: formatDt, // Renamed the second dt to formatDt
  sp: sp,
  toUri: toUri,
  uuidv4: uuidv4,
  popup: popup,
  latLongToIso6709: latLongToIso6709,
  needIconUpdate: needIconUpdate,
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

    this._unitButton = this._createButton(
      '<i class="bi bi-plus-circle-fill" id="map-add-unit-btn"></i>',
      "افزودن نیرو به نقشه",
      controlName + "-in",
      container,
      this._addUnit
    );
    this._casevacButton = this._createButton(
      '<i class="bi bi-bandaid-fill" id="map-add-casevac-btn"></i>',
      "افزودن گزارش Casevac",
      controlName + "-in",
      container,
      this._addCasevac
    );
    // this._pointButton = this._createButton('<i class="bi bi-crosshair" id="map-add-point-btn"></i>', 'افزودن نقطه به نقشه',
    //     controlName + '-in', container, this._locate);

    return container;
  },

  onRemove: function (map) {},

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

const html = (strings, ...values) => String.raw({ raw: strings }, ...values);
