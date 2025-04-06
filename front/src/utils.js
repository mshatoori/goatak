// Constants
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

// Icon utilities
export function getIconUri(item, withText) {
    if (item.icon && item.icon.startsWith("COT_MAPPING_SPOTMAP/")) {
        return {uri: toUri(circle(16, item.color ?? 'green', '#000', null)), x: 8, y: 8}
    }
    if (item.type === "b") {
        return {uri: "/icons/b.png", x: 16, y: 16}
    }
    if (item.type.startsWith("b-a-o-")) {
        return {uri: "/icons/" + item.type +".png", x: 16, y: 16}
    }
    if (item.type === "b-m-p-w-GOTO") {
        return {uri: "/icons/green_flag.png", x: 6, y: 30}
    }
    if (item.type === "b-m-p-s-p-op") {
        return {uri: "/icons/binos.png", x: 16, y: 16}
    }
    if (item.type === "b-m-p-s-p-loc") {
        return {uri: "/icons/sensor_location.png", x: 16, y: 16}
    }
    if (item.type === "b-m-p-s-p-i") {
        return {uri: "/icons/b-m-p-s-p-i.png", x: 16, y: 16}
    }
    if (item.type === "b-m-p-a") {
        return {uri: "/icons/aimpoint.png", x: 16, y: 16}
    }
    if (item.category === "point") {
        return {uri: toUri(circle(16, item.color ?? 'green', '#000', null)), x: 8, y: 8}
    }
    return getMilIcon(item, withText);
}

export function getMilIcon(item, withText) {
    let opts = {size: 24};

    if (!item.sidc) {
        return "";
    }

    if (withText) {
        if (item.speed > 0) {
            opts['speed'] = (item.speed * 3.6).toFixed(1) + " km/h";
            opts['direction'] = item.course;
        }
        if (item.sidc.charAt(2) === 'A') {
            opts['altitudeDepth'] = item.hae.toFixed(0) + " m";
        }
    }

    let symb = new ms.Symbol(item.sidc, opts);
    return {uri: symb.toDataURL(), x: symb.getAnchor().x, y: symb.getAnchor().y}
}

export function getIcon(item, withText) {
    let img = getIconUri(item, withText);
    return L.icon({
        iconUrl: img.uri,
        iconAnchor: [img.x, img.y],
    })
}

// SVG utilities
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
    return encodeURI("data:image/svg+xml," + s).replaceAll("#", "%23");
}

// Date formatting
export function formatDateTime(str) {
    let d = new Date(Date.parse(str));
    return ("0" + d.getDate()).slice(-2) + "-" + 
           ("0" + (d.getMonth() + 1)).slice(-2) + "-" +
           d.getFullYear() + " " + 
           ("0" + d.getHours()).slice(-2) + ":" + 
           ("0" + d.getMinutes()).slice(-2);
}

// UUID generation
export function generateUUID() {
    return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
        (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    );
}

// API utilities
export async function fetchUnits() {
    const response = await fetch('/unit');
    return response.json();
}

export async function createUnit(unit) {
    const response = await fetch('/unit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cleanUnit(unit))
    });
    return response.json();
}

export async function deleteUnit(uid) {
    const response = await fetch(`/unit/${uid}`, { method: 'DELETE' });
    return response.json();
}

export async function fetchSensors() {
    const response = await fetch('/sensors');
    return response.json();
}

export async function createSensor(sensorData) {
    const sensorJson = {
        uid: generateUUID(),
        ...sensorData,
        port: parseInt(sensorData.port),
        interval: parseInt(sensorData.interval)
    };
    const response = await fetch('/sensors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sensorJson)
    });
    return response.json();
}

export async function deleteSensor(uid) {
    const response = await fetch(`/sensors/${uid}`, { method: 'DELETE' });
    // Check if the response indicates success (e.g., status code 200 or 204)
    if (!response.ok) {
        // Attempt to parse error message from backend if available
        let errorMsg = `Failed to delete sensor (status: ${response.status})`;
        try {
            const errorData = await response.json();
            errorMsg = errorData.message || errorData.error || errorMsg;
        } catch (e) { /* Ignore if response is not JSON */ }
        throw new Error(errorMsg);
    }
    // Return something indicating success, or nothing if 204 No Content
    if (response.status === 204) {
        return;
    }
    return response.json(); // Or handle other success responses
}

export async function fetchFeeds() {
    const response = await fetch('/feeds');
    return response.json();
}

export async function createFeed(feedData) {
    const response = await fetch('/feeds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(feedData)
    });
    return response.json();
}

// Data cleaning
export function cleanUnit(unit) {
    const cleaned = { ...unit };
    delete cleaned.icon;
    delete cleaned.marker;
    delete cleaned.popup;
    return cleaned;
}

// Store management
export class Store {
    constructor() {
        this.state = {
            items: new Map(),
            timestamp: 0,
            sensors: [],
            feeds: [],
            unitToSend: {},
            emergency: {
                type: "b-a-o-tbl",
                switch1: false,
                switch2: false,
            }
        };
    }

    processItems(items, partial = false) {
        const results = {
            removed: [],
            added: [],
            updated: []
        };
        const keys = new Set();

        for (const item of items) {
            const existingItem = this.state.items.get(item.uid);
            keys.add(item.uid);

            if (item.type === "b-a-o-can") {
                if (existingItem) {
                    results.removed.push(existingItem);
                    this.state.items.delete(item.uid);
                }
                continue;
            }

            if (!existingItem) {
                this.state.items.set(item.uid, item);
                results.added.push(item);
            } else {
                Object.assign(existingItem, item);
                results.updated.push(existingItem);
            }
        }

        if (!partial) {
            for (const key of this.state.items.keys()) {
                if (!keys.has(key)) {
                    results.removed.push(this.state.items.get(key));
                    this.state.items.delete(key);
                }
            }
        }

        this.state.timestamp++;
        return results;
    }
}

// Export store instance
export const store = new Store(); 