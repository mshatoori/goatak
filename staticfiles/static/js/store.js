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
    },
  },

  // Items
  createItem: function (item) {
    this.state.items.set(item.uid, item);
    this.state.ts += 1;

    const requestOptions = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(app.cleanUnit(item)),
    };

    return fetch("/unit", requestOptions)
      .then((response) => response.json())
      .then((response) => this._processItems([response], true));
  },

  fetchItems: function () {
    return fetch("/unit")
      .then((response) => response.json())
      .then((response) => this._processItems(response));
  },

  removeItem: function (uid) {
    return fetch("unit/" + uid, { method: "DELETE" })
      .then(function (response) {
        return response.json();
      })
      .then(({ units }) => this._processItems(units));
  },

  handleWSMessage: function (item, is_delete = false) {
    if (is_delete) {
      this.state.items.delete(item.uid);
      this.state.ts += 1;
      return {
        removed: [item],
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

    console.log("units:");
    console.log(response);

    for (let u of response) {
      let item = this.state.items.get(u.uid);
      keys.add(u.uid);

      // Special Case: Canceling of an alarm
      if (u.type === "b-a-o-can") {
        if (item) {
          console.log("REMOVED: ", u.uid, this.state.items.get(u.uid));
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
        if (!keys.has(k)) {
          console.log("REMOVED: ", k, this.state.items.get(k));
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
    fetch("/sensors", {
      headers: { "Content-Type": "application/json" },
      method: "POST",
      body: JSON.stringify(sensorJson),
    })
      .then((response) => response.json())
      .then((response) => (this.state.sensors = response));
  },

  fetchSensors() {
    fetch("/sensors")
      .then((response) => response.json())
      .then((response) => (this.state.sensors = response));
  },

  removeSensor: function (uid) {
    fetch(`/sensors/${uid}`, {
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
    fetch(`/sensors/${sensorData.uid}`, {
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
    fetch("/flows", {
      headers: { "Content-Type": "application/json" },
      method: "POST",
      body: JSON.stringify(flowJson),
    })
      .then((response) => response.json())
      .then((response) => (this.state.flows = response));
  },

  fetchFlows() {
    fetch("/flows")
      .then((response) => response.json())
      .then((response) => (this.state.flows = response));
  },

  removeFlow: function (uid) {
    // TODO
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
};
