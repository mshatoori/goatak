import L from 'leaflet';
import ms from 'milsymbol';

// --- Constants --- //
export const colors = new Map([
    ['Clear', 'white'],
    ['White', 'white'],
    ['Yellow', 'yellow'],
    ['Orange', 'orange'],
    ['Magenta', 'magenta'],
    ['Red', 'red'],
    ['Maroon', 'maroon'],
    ['Purple', 'purple'],
    ['Dark Blue', 'darkblue'],
    ['Blue', 'blue'],
    ['Cyan', 'cyan'],
    ['Teal', 'teal'],
    ['Green', 'green'],
    ['Dark Green', 'darkgreen'],
    ['Brown', 'brown'],
]);

export const roles = new Map([
    ['HQ', 'HQ'],
    ['Team Lead', 'TL'],
    ['K9', 'K9'],
    ['Forward Observer', 'FO'],
    ['Sniper', 'S'],
    ['Medic', 'M'],
    ['RTO', 'R'],
]);

// --- SVG Utilities --- //
export function circle(size, color, bg, text) {
    let x = Math.round(size / 2);
    let r = x - 1;

    let s = '<svg width="' + size + '" height="' + size + '" xmlns="http://www.w3.org/2000/svg"><metadata id="metadata1">image/svg+xml</metadata>';
    s += '<circle style="fill: ' + color + '; stroke: ' + bg + ';" cx="' + x + '" cy="' + x + '" r="' + r + '"/>';

    if (text != null && text !== '') {
        s += '<text x="50%" y="50%" text-anchor="middle" font-size="12px" font-family="Arial" dy=".3em">' + text + '</text>';
    }
    s += '</svg>';
    return s;
}

export function toUri(s) {
    // Ensure '#' is encoded correctly for data URIs
    return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(s);
}

// --- MilSymbol Icon Generation --- //
export function getMilIcon(item, withText) {
    if (typeof ms === 'undefined') {
        console.error("milsymbol library (ms) not loaded.");
        return { uri: '', x: 12, y: 12 }; // Return default/empty object
    }
    if (!item || !item.sidc) {
        // console.warn("[MapUtils] Missing SIDC for MilSymbol generation:", item);
        return { uri: '', x: 12, y: 12 }; 
    }

    let opts = { size: 24 }; // Default size

    if (withText) {
        if (item.speed != null && item.speed > 0) { // Check for null/undefined
            opts['speed'] = (item.speed * 3.6).toFixed(1) + " km/h";
            opts['direction'] = item.course; // Assume course is provided in degrees
        }
        if (item.sidc.charAt(2) === 'A' && item.hae != null) { // Check affiliation (Air) and altitude
            opts['altitudeDepth'] = item.hae.toFixed(0) + " m";
        }
        // Add other text modifiers based on item properties if needed
    }

    try {
        let symb = new ms.Symbol(item.sidc, opts);
        if (symb.isValid()) {
             return { uri: symb.toDataURL(), x: symb.getAnchor().x, y: symb.getAnchor().y };
        } else {
             console.warn("[MapUtils] Generated MilSymbol is invalid for SIDC:", item.sidc, "Options:", opts);
             // Fallback for invalid symbol? Maybe a default icon URI?
             return { uri: '', x: 12, y: 12 }; 
        }
    } catch (error) {
        console.error("[MapUtils] Error generating MilSymbol for SIDC:", item.sidc, error);
        return { uri: '', x: 12, y: 12 }; // Fallback on error
    }
}

// --- Icon URI Determination --- //
export function getIconUri(item, withText) {
    if (!item) return { uri: '', x: 12, y: 12 }; // Handle null item

    // Prioritize specific icon definitions if present
    if (item.icon && item.icon.startsWith("COT_MAPPING_SPOTMAP/")) {
        return { uri: toUri(circle(16, item.color ?? 'green', '#000', null)), x: 8, y: 8 };
    }
    
    // Handle specific types (ensure paths are correct)
    const typeIcons = {
        "b": "/icons/b.png",
        "b-m-p-w-GOTO": "/icons/green_flag.png",
        "b-m-p-s-p-op": "/icons/binos.png",
        "b-m-p-s-p-loc": "/icons/sensor_location.png",
        "b-m-p-s-p-i": "/icons/b-m-p-s-p-i.png",
        "b-m-p-a": "/icons/aimpoint.png"
    };

    if (item.type && typeIcons[item.type]) {
        let x = 16, y = 16;
        if (item.type === "b-m-p-w-GOTO") { x = 6; y = 30; } // Specific anchor for flag
        return { uri: typeIcons[item.type], x: x, y: y };
    }

    // Handle types starting with "b-a-o-"
    if (item.type && item.type.startsWith("b-a-o-")) {
        return { uri: "/icons/" + item.type + ".png", x: 16, y: 16 };
    }

    // Handle generic points
    if (item.category === "point") {
        return { uri: toUri(circle(16, item.color ?? 'green', '#000', null)), x: 8, y: 8 };
    }

    // Fallback to MilSymbol if SIDC exists
    if (item.sidc) {
        return getMilIcon(item, withText);
    }

    // Default fallback if no other rule matches
    console.warn("[MapUtils] No specific icon rule matched for item, using default:", item);
    return { uri: '', x: 12, y: 12 }; // Consider a default placeholder icon URI
}

// --- Leaflet Icon Creation --- //
export function getIcon(item, withText) {
    let img = getIconUri(item, withText);
    
    // Use Leaflet's default icon if URI is empty or invalid
    if (!img || !img.uri) {
        console.warn("[MapUtils] getIconUri returned empty URI for item, using default Leaflet icon:", item);
        return L.Icon.Default(); 
    }

    return L.icon({
        iconUrl: img.uri,
        iconAnchor: [img.x, img.y],
        // Optionally add popupAnchor, tooltipAnchor, iconSize based on context or defaults
        // iconSize: [24, 24], // Example fixed size
        // popupAnchor: [0, -img.y] // Example popup anchor adjustment
    });
} 