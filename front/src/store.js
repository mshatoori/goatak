import { reactive } from "vue";
import { cleanUnit, uuidv4 } from "./utils.js";
import api from "./api/axios.js";

const store = {
  debug: true,

  // Map instance stored outside reactive state to avoid Vue3 reactivity wrapping issues
  _map: null,

  state: reactive({
    items: new Map(),
    ts: 0,
    sensors: [],
    flows: [],
    resendConfigs: [],
    types: null,
    unitToSend: {},
    emergency: {
      type: "b-a-o-tbl",
      switch1: false,
      switch2: false,
    },
  }),

  // Map management methods
  setMap(mapInstance) {
    this._map = mapInstance;
  },

  getMap() {
    return this._map;
  },

  // Items
  createItem: function (item) {
    console.log("store.createItem called with:", item);
    item.isNew = false;
    this.state.items.set(item.uid, item);
    this.state.ts += 1;

    return api.post("/unit", cleanUnit(item)).then((response) => {
      console.log("store.createItem axios response:", response.data);
      // Explicitly return the result of _processItems
      return this._processItems([response.data], true);
    });
  },

  fetchItems: function () {
    return api
      .get("/unit")
      .then((response) => this._processItems(response.data));
  },

  removeItem: function (uid) {
    if (this.state.items.get(uid)?.isNew) {
      console.warn("[removeItem] Item is new:", uid);

      return new Promise((resolve, _reject) => {
        resolve(this.handleItemChangeMessage(this.state.items.get(uid), true));
      });
    }

    return api
      .delete(`/unit/${uid}`)
      .then((response) => this._processItems(response.data.units));
  },

  handleItemChangeMessage: function (item, is_delete = false) {
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
    api
      .post("/sensors", sensorJson)
      .then((response) => (this.state.sensors = response.data));
  },

  fetchSensors() {
    api
      .get("/sensors")
      .then((response) => (this.state.sensors = response.data));
  },

  removeSensor: function (uid) {
    api
      .delete(`/sensors/${uid}`)
      .then((response) => (this.state.sensors = response.data));
  },

  editSensor(sensorData) {
    const sensorJson = {
      ...sensorData,
      port: parseInt(sensorData.port),
      interval: parseInt(sensorData.interval),
    };
    api
      .put(`/sensors/${sensorData.uid}`, sensorJson)
      .then((response) => (this.state.sensors = response.data));
  },

  // Flows
  createFlow(flowData) {
    const flowJson = {
      uid: uuidv4(),
      ...flowData,
      port: parseInt(flowData.port),
      direction: parseInt(flowData.direction),
    };
    api
      .post("/flows", flowJson)
      .then((response) => (this.state.flows = response.data));
  },

  fetchFlows() {
    api.get("/flows").then((response) => (this.state.flows = response.data));
  },

  removeFlow: function (uid) {
    return api.delete(`/flows/${uid}`).then(() => {
      // Refresh the flows list after successful deletion
      return this.fetchFlows();
    });
  },

  // Resend Configs
  fetchResendConfigs() {
    return api
      .get("/resend/configs")
      .then((response) => {
        if (response.data.success) {
          this.state.resendConfigs = response.data.data || [];
        }
        return response.data;
      });
  },

  createResendConfig(configData) {
    return api
      .post("/resend/configs", configData)
      .then((response) => {
        if (response.data.success) {
          return this.fetchResendConfigs();
        }
        return response.data;
      });
  },

  editResendConfig(configData) {
    return api
      .put(`/resend/configs/${configData.uid}`, configData)
      .then((response) => {
        if (response.data.success) {
          return this.fetchResendConfigs();
        }
        return response.data;
      });
  },

  removeResendConfig(uid) {
    return api
      .delete(`/resend/configs/${uid}`)
      .then((response) => {
        if (response.data.success) {
          return this.fetchResendConfigs();
        }
        return response.data;
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
  fetchTypes: function () {
    let vm = this;
    api.get("/types").then(function (response) {
      vm.state.types = response.data;
    });
  },

  getSidc: function (s) {
    let curr = this.state.types;

    if (s === "") {
      return curr;
    }

    if (!curr?.next) {
      return null;
    }

    let cont = false;

    for (; ;) {
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

  getRootSidc: function (s) {
    let curr = this.state.types;

    if (!curr?.next) {
      return null;
    }

    for (; ;) {
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

  sidcFromType: function (s) {
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
