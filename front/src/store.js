import { reactive } from "vue";
import { cleanUnit, uuidv4 } from "./utils.js";

const store = {
  debug: true,
  state: reactive({
    items: new Map(),
    ts: 0,
    sensors: [],
    flows: [],
    types: null,
    unitToSend: {},
    emergency: {
      type: "b-a-o-tbl",
      switch1: false,
      switch2: false,
    },
  }),

  // Items
  createItem: function(item) {
    console.log("store.createItem called with:", item);
    item.isNew = false;
    this.state.items.set(item.uid, item);
    this.state.ts += 1;

    const requestOptions = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cleanUnit(item)),
    };

    return fetch(window.baseUrl + "/unit", requestOptions)
      .then((response) => response.json())
      .then((response) => {
        console.log("store.createItem fetch response:", response);
        // Explicitly return the result of _processItems
        return this._processItems([response], true);
      });
  },

  fetchItems: function() {
    return fetch(window.baseUrl + "/unit")
      .then((response) => response.json())
      .then((response) => this._processItems(response));
  },

  removeItem: function(uid) {
    if (this.state.items.get(uid)?.isNew) {
      console.warn("[removeItem] Item is new:", uid);

      return new Promise((resolve, _reject) => {
        resolve(this.handleItemChangeMessage(this.state.items.get(uid), true));
      });
    }

    return fetch(window.baseUrl + "/unit/" + uid, { method: "DELETE" })
      .then(function(response) {
        return response.json();
      })
      .then(({ units }) => this._processItems(units));
  },

  handleItemChangeMessage: function(item, is_delete = false) {
    if (is_delete) {
      this.state.items.delete(item.uid);
      this.state.ts += 1;
      return {
        added: [],
        removed: [item],
        updated: [],
      };
    }
    return this._processItems([item], true);
  },

  _processItems(response, partial = false) {
    let results = {
      removed: [],
      added: [],
      updated: [],
    };
    let keys = new Set();

    // console.log("units:");
    // console.log(response);

    for (let u of response) {
      let item = this.state.items.get(u.uid);
      keys.add(u.uid);

      // Special Case: Canceling of an alarm
      if (u.type === "b-a-o-can") {
        if (item) {
          // console.log("REMOVED: ", u.uid, this.state.items.get(u.uid));
          results["removed"].push(item);
          this.state.items.delete(u.uid);
        }
        continue;
      }

      if (!item) {
        this.state.items.set(u.uid, u);
        results["added"].push(u);
      } else {
        for (const k of Object.keys(u)) {
          item[k] = u[k];
        }
        results["updated"].push(item);
      }
    }

    if (!partial) {
      for (const k of this.state.items.keys()) {
        if (!keys.has(k) && !this.state.items.get(k).isNew) {
          // console.log("REMOVED: ", k, this.state.items.get(k));
          results["removed"].push(this.state.items.get(k));
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
      uid: uuidv4(),
      ...sensorData,
      port: parseInt(sensorData.port),
      interval: parseInt(sensorData.interval),
    };
    fetch(window.baseUrl + "/sensors", {
      headers: { "Content-Type": "application/json" },
      method: "POST",
      body: JSON.stringify(sensorJson),
    })
      .then((response) => response.json())
      .then((response) => (this.state.sensors = response));
  },

  fetchSensors() {
    fetch(window.baseUrl + "/sensors")
      .then((response) => response.json())
      .then((response) => (this.state.sensors = response));
  },

  removeSensor: function(uid) {
    fetch(window.baseUrl + `/sensors/${uid}`, {
      headers: { "Content-Type": "application/json" },
      method: "DELETE",
    })
      .then((response) => response.json())
      .then((response) => (this.state.sensors = response));
  },

  editSensor(sensorData) {
    const sensorJson = {
      ...sensorData,
      port: parseInt(sensorData.port),
      interval: parseInt(sensorData.interval),
    };
    fetch(window.baseUrl + `/sensors/${sensorData.uid}`, {
      headers: { "Content-Type": "application/json" },
      method: "PUT",
      body: JSON.stringify(sensorJson),
    })
      .then((response) => response.json())
      .then((response) => (this.state.sensors = response));
  },

  // Flows
  createFlow(flowData) {
    const flowJson = {
      uid: uuidv4(),
      ...flowData,
      port: parseInt(flowData.port),
      direction: parseInt(flowData.direction),
    };
    fetch(window.baseUrl + "/flows", {
      headers: { "Content-Type": "application/json" },
      method: "POST",
      body: JSON.stringify(flowJson),
    })
      .then((response) => response.json())
      .then((response) => (this.state.flows = response));
  },

  fetchFlows() {
    fetch(window.baseUrl + "/flows")
      .then((response) => response.json())
      .then((response) => (this.state.flows = response));
  },

  removeFlow: function(uid) {
    return fetch(window.baseUrl + "/flows/" + uid, {
      method: "DELETE",
    })
      .then((response) => {
        if (response.ok) {
          return response.text();
        } else {
          throw new Error(`Failed to delete flow: ${response.status}`);
        }
      })
      .then(() => {
        // Refresh the flows list after successful deletion
        return this.fetchFlows();
      });
  },

  createShape(shapeData, parentUID, parentCallsign, callback) {
    console.log("SHAPE ADDED: ", shapeData);
    callback();
    return;
  },

  editShape(shapeData) {
    // TODO
  },

  removeShape(shapeData) {
    // TODO
  },

  setMessageAction(newValue) {
    if (this.debug) console.log("setMessageAction triggered with", newValue);
    this.state.message = newValue;
  },
  clearMessageAction() {
    if (this.debug) console.log("clearMessageAction triggered");
    this.state.message = "";
  },

  // Types
  fetchTypes: function() {
    let vm = this;
    fetch(window.baseUrl + "/types")
      .then(function(response) {
        return response.json();
      })
      .then(function(data) {
        vm.state.types = data;
      });
  },

  getSidc: function(s) {
    let curr = this.state.types;

    if (s === "") {
      return curr;
    }

    if (!curr?.next) {
      return null;
    }

    let cont = false;

    for (;;) {
      cont = false;
      for (const k of curr.next) {
        if (k.code === s) {
          return k;
        }

        if (s.startsWith(k.code)) {
          curr = k;
          cont = true;
          break;
        }
      }
      if (!cont) break;
    }
    return null;
  },

  getRootSidc: function(s) {
    let curr = this.state.types;

    if (!curr?.next) {
      return null;
    }

    for (;;) {
      let found = false;
      for (const k of curr.next) {
        if (k.code === s) {
          return curr;
        }

        if (s.startsWith(k.code)) {
          curr = k;
          found = true;
          break;
        }
      }
      if (!found) {
        return null;
      }
    }
  },

  sidcFromType: function(s) {
    if (!s.startsWith("a-")) return "";

    let n = s.split("-");

    let sidc = "S" + n[1];

    if (n.length > 2) {
      sidc += n[2] + "P";
    } else {
      sidc += "-P";
    }

    if (n.length > 3) {
      for (let i = 3; i < n.length; i++) {
        if (n[i].length > 1) {
          break;
        }
        sidc += n[i];
      }
    }

    if (sidc.length < 10) {
      sidc += "-".repeat(10 - sidc.length);
    }

    return sidc.toUpperCase();
  },
};

export default store;
