const colors = new Map([
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

const roles = new Map([
    ['HQ', 'HQ'],
    ['Team Lead', 'TL'],
    ['K9', 'K9'],
    ['Forward Observer', 'FO'],
    ['Sniper', 'S'],
    ['Medic', 'M'],
    ['RTO', 'R'],
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
        return {uri: toUri(circle(16, item.color ?? 'green', '#000', null)), x: 8, y: 8}
    }
    if (item.type === "b") {
        return {uri: "/static/icons/b.png", x: 16, y: 16}
    }
    if (item.type.startsWith("b-a-o-")) {
        return {uri: "/static/icons/" + item.type +".png", x: 16, y: 16}
    }
    if (item.type === "b-m-p-w-GOTO") {
        return {uri: "/static/icons/green_flag.png", x: 6, y: 30}
    }
    if (item.type === "b-m-p-s-p-op") {
        return {uri: "/static/icons/binos.png", x: 16, y: 16}
    }
    if (item.type === "b-m-p-s-p-loc") {
        return {uri: "/static/icons/sensor_location.png", x: 16, y: 16}
    }
    if (item.type === "b-m-p-s-p-i") {
        return {uri: "/static/icons/b-m-p-s-p-i.png", x: 16, y: 16}
    }
    if (item.type === "b-m-p-a") {
        return {uri: "/static/icons/aimpoint.png", x: 16, y: 16}
    }
    if (item.category === "point") {
        return {uri: toUri(circle(16, item.color ?? 'green', '#000', null)), x: 8, y: 8}
    }
    return getMilIcon(item, withText);
}

function getMilIcon(item, withText) {
    let opts = {size: 24};

    if (!item.sidc) {
        return "";
    }

    // if (item.team && item.role) {
    //     opts["uniqueDesignation"] = item.uid
    // }

    if (withText) {
        // opts['uniqueDesignation'] = item.callsign;
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

function getIcon(item, withText) {
    let img = getIconUri(item, withText);

    return L.icon({
        iconUrl: img.uri,
        iconAnchor: [img.x, img.y],
    })
}

function circle(size, color, bg, text) {
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

function dt(str) {
    let d = new Date(Date.parse(str));
    return ("0" + d.getDate()).slice(-2) + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" +
        d.getFullYear() + " " + ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2);
}

function toUri(s) {
    return encodeURI("data:image/svg+xml," + s).replaceAll("#", "%23");
}

function uuidv4() {
    return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
        (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    );
}

var store = {
    debug: true,
    state: {
        items: new Map(),
        ts: 0,
        sensors: [],
        flows: [],
        unitToSend: {},
        emergency: {
            type: "b-a-o-tbl",
            switch1: false,
            switch2: false,
        }
    },

    // Items
    createItem: function (item) {
        this.state.items.set(item.uid, item)
        this.state.ts += 1

        const requestOptions = {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify(app.cleanUnit(item))
        };

        return fetch("/unit", requestOptions)
            .then(response => response.json())
            .then(response => this._processItems([response], true))
    },

    fetchItems: function () {
        return fetch('/unit')
            .then(response => response.json())
            .then(response => this._processItems(response))
    },

    removeItem: function (uid) {
        return fetch("unit/" + uid, {method: "DELETE"})
            .then(function (response) {
                return response.json()
            })
            .then(({units}) => this._processItems(units))
            ;
    },

    handleWSMessage: function (item, is_delete = false) {
        if (is_delete) {
            this.state.items.delete(item.uid)
            this.state.ts += 1
            return {
                removed: [item]
            }
        }
        return this._processItems([item], true)
    },

    _processItems(response, partial = false) {
        let results = {
            removed: [],
            added: [],
            updated: [],
        };
        let keys = new Set();

        console.log("units:")
        console.log(response)

        for (let u of response) {
            let item = this.state.items.get(u.uid);
            keys.add(u.uid)

            // Special Case: Canceling of an alarm
            if (u.type === "b-a-o-can") {
                if (item) {
                    console.log("REMOVED: ", u.uid, this.state.items.get(u.uid))
                    results["removed"].push(item)
                    this.state.items.delete(u.uid);
                }
                continue;
            }

            if (!item) {
                this.state.items.set(u.uid, u)
                results["added"].push(u)
            } else {
                for (const k of Object.keys(u)) {
                    item[k] = u[k];
                }
                results["updated"].push(item)
            }
        }

        if (!partial) {
            for (const k of this.state.items.keys()) {
                if (!keys.has(k)) {
                    console.log("REMOVED: ", k, this.state.items.get(k))
                    results["removed"].push(this.state.items.get(k))
                    this.state.items.delete(k);
                }
            }
        }

        this.state.ts += 1;

        return results;
    },

    // Sensors
    createSensor(sensorData) {
        const sensorJson = {
            uid: uuidv4(), ...sensorData,
            port: parseInt(sensorData.port),
            interval: parseInt(sensorData.interval)
        }
        fetch('/sensors', {
            headers: {"Content-Type": "application/json"},
            method: "POST",
            body: JSON.stringify(sensorJson)
        })
            .then(response => response.json())
            .then(response => this.state.sensors = response);
    },

    fetchSensors() {
        fetch('/sensors')
            .then(response => response.json())
            .then(response => this.state.sensors = response);
    },

    removeSensor: function (uid) {
        fetch(`/sensors/${uid}`, {
            headers: {"Content-Type": "application/json"},
            method: "DELETE"
        }).then(response => response.json())
            .then(response => this.state.sensors = response);
    },

    editSensor(sensorData) {
        const sensorJson = {
            ...sensorData,
            port: parseInt(sensorData.port),
            interval: parseInt(sensorData.interval)
        }
        fetch(`/sensors/${sensorData.uid}`, {
            headers: {"Content-Type": "application/json"},
            method: "PUT",
            body: JSON.stringify(sensorJson)
        })
            .then(response => response.json())
            .then(response => this.state.sensors = response);
    },

    // Flows
    createFlow(flowData) {
        const flowJson = {
            uid: uuidv4(), ...flowData,
            port: parseInt(flowData.port),
            direction: parseInt(flowData.direction)
        }
        fetch('/flows', {headers: {"Content-Type": "application/json"}, method: "POST", body: JSON.stringify(flowJson)})
            .then(response => response.json())
            .then(response => this.state.flows = response);
    },

    fetchFlows() {
        fetch('/flows')
            .then(response => response.json())
            .then(response => this.state.flows = response);
    },

    removeFlow: function (uid) {
        // TODO
    },

    createShape(shapeData, parentUID, parentCallsign, callback) {
        console.log("SHAPE ADDED: ", shapeData)
        callback()
        return
    },

    editShape(shapeData) {
        // TODO
    },

    removeShape(shapeData) {
        // TODO
    },

    setMessageAction(newValue) {
        if (this.debug) console.log('setMessageAction triggered with', newValue)
        this.state.message = newValue
    },
    clearMessageAction() {
        if (this.debug) console.log('clearMessageAction triggered')
        this.state.message = ''
    }
}