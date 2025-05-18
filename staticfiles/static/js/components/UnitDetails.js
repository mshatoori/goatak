Vue.component("UnitDetails", {
  props: [
    "item",
    "coords",
    "map",
    "locked_unit_uid",
    "deleteItem",
    "onDone",
    "config",
  ],
  data: function () {
    return {
      editing: false,
      editingData: null,
      sharedState: store.state,
    };
  },
  mounted: function () {
    // Automatically start editing if this is a new item
    if (this.item && this.item.isNew === true) {
      this.$nextTick(() => this.startEditing());
    }
  },
  methods: {
    milImg: function (item) {
      return getMilIcon(item, false).uri;
    },
    getUnitName: function (u) {
      let res = u.callsign || "no name";
      if (u.parent_uid === this.config.uid) {
        if (u.send === true) {
          res = "+ " + res;
        } else {
          res = "* " + res;
        }
      }
      return res;
    },
    mapToUnit: function (unit) {
      if (unit && unit.lat && unit.lon) {
        this.map.setView([unit.lat, unit.lon]);
      }
    },
    startEditing: function () {
      // Use a structured deep copy to avoid circular references
      this.editingData = {
        uid: this.item.uid,
        category: this.item.category,
        callsign: this.item.callsign,
        type: this.item.type || "",
        aff: this.item.aff || "",
        lat: this.item.lat,
        lon: this.item.lon,
        text: this.item.text || "",
        send: this.item.send || false,
        web_sensor: this.item.web_sensor || "",
        parent_uid: this.item.parent_uid || "",
        parent_callsign: this.item.parent_callsign || "",
      };

      // Copy any other specific fields that might be needed
      if (this.item.root_sidc) {
        this.editingData.root_sidc = this.item.root_sidc;
      }
      if (this.item.subtype) {
        this.editingData.subtype = this.item.subtype;
      }

      this.editing = true;
    },
    cancelEditing: function () {
      this.editing = false;
      this.editingData = null;
    },
    saveEditing: function () {
      // Update the item with the edited data
      for (const key in this.editingData) {
        this.item[key] = this.editingData[key];
      }

      // Save to server/store
      this.editing = false;
      this.editingData = null;
    },
    openChat: function (uid, callsign) {
      // Implement chat opening functionality
      console.log("Opening chat with", uid, callsign);
    },
  },
  template: html`
    <div class="card">
      <!-- Header -->
      <div class="card-header">
        <span class="pull-left fw-bold" v-on:click.stop="mapToUnit(item)">
          <img :src="milImg(item)" /> {{ getUnitName(item) }}
          <span v-if="item.status"> ({{ item.status }}) </span>
          <img
            height="24"
            src="/static/icons/coord_unlock.png"
            v-if="locked_unit_uid != item.uid"
            v-on:click.stop="locked_unit_uid=item.uid"
          />
          <img
            height="24"
            src="/static/icons/coord_lock.png"
            v-if="locked_unit_uid == item.uid"
            v-on:click.stop="locked_unit_uid=''"
          />
        </span>
        <span class="pull-right" v-if="!editing">
          <button
            type="button"
            class="btn btn-sm btn-primary"
            v-on:click.stop="startEditing"
          >
            <i class="bi bi-pencil-square"></i>
          </button>
          <button
            type="button"
            class="btn btn-sm btn-danger"
            v-on:click.stop="deleteItem()"
          >
            <i class="bi bi-trash3-fill"></i>
          </button>
        </span>
      </div>

      <!-- Unit View (non-editing mode) -->
      <div class="card-body" v-if="!editing">
        <dl>
          <div class="form-group row">
            <label
              for="input-UID"
              class="col-sm-4 col-form-label font-weight-bold"
              ><strong>UID</strong></label
            >
            <div class="col-sm-8">
              <label class="col-form-label">{{item.uid}}</label>
            </div>
          </div>
          <template v-if="item.team">
            <div class="form-group row">
              <label
                for="input-team"
                class="col-sm-4 col-form-label font-weight-bold"
                ><strong>تیم</strong></label
              >
              <div class="col-sm-8">
                <label class="col-form-label">{{item.team}}</label>
              </div>
            </div>
            <div class="form-group row">
              <label
                for="input-role"
                class="col-sm-4 col-form-label font-weight-bold"
                ><strong>نقش</strong></label
              >
              <div class="col-sm-8">
                <label class="col-form-label">{{item.role}}</label>
              </div>
            </div>
          </template>
          <div class="form-group row">
            <label
              for="input-type"
              class="col-sm-4 col-form-label font-weight-bold"
              ><strong>نوع</strong></label
            >
            <div class="col-sm-8">
              <label class="col-form-label">{{item.type}}</label>
            </div>
          </div>
          <div class="form-group row">
            <label class="col-sm-4 col-form-label font-weight-bold"
              ><strong>مختصات</strong></label
            >
            <div class="col-sm-8">
              <label class="col-form-label"
                >{{ Utils.printCoords(item.lat, item.lon) }}
                <span
                  class="badge rounded-pill bg-success"
                  style="cursor:default;"
                  v-on:click="map.setView([item.lat, item.lon])"
                  ><i class="bi bi-geo"></i
                ></span>
                <span v-if="coords"
                  >({{ Utils.distBea(Utils.latlng(item.lat, item.lon), coords)
                  }} تا نشانگر)</span
                ></label
              >
            </div>
          </div>
          <div class="form-group row">
            <label class="col-sm-4 col-form-label font-weight-bold"
              ><strong>سرعت</strong></label
            >
            <div class="col-sm-8">
              <label class="col-form-label"
                >{{Utils.sp(item.speed)}} KM/H</label
              >
            </div>
          </div>
          <div class="form-group row">
            <label class="col-sm-4 col-form-label font-weight-bold"
              ><strong>ارتفاع</strong></label
            >
            <div class="col-sm-8">
              <label class="col-form-label">{{item.hae.toFixed(1)}}</label>
            </div>
          </div>

          <div v-if="item.parent_uid">
            <div class="form-group row">
              <label class="col-sm-4 col-form-label font-weight-bold"
                ><strong>سازنده</strong></label
              >
              <div class="col-sm-8">
                <label class="col-form-label"
                  >{{ item.parent_uid }}<span v-if="item.parent_callsign"
                    >({{ item.parent_callsign }})</span
                  ></label
                >
              </div>
            </div>
          </div>
          <div class="form-group row">
            <label class="col-sm-4 col-form-label font-weight-bold"
              ><strong>زمان ایجاد</strong></label
            >
            <div class="col-sm-8">
              <label class="col-form-label"
                >{{ Utils.dt(item.start_time) }}</label
              >
            </div>
          </div>
          <div class="form-group row">
            <label class="col-sm-4 col-form-label font-weight-bold"
              ><strong>زمان ارسال</strong></label
            >
            <div class="col-sm-8">
              <label class="col-form-label"
                >{{ Utils.dt(item.send_time) }}</label
              >
            </div>
          </div>
          <div class="form-group row">
            <label class="col-sm-4 col-form-label font-weight-bold"
              ><strong>زمان انقضا</strong></label
            >
            <div class="col-sm-8">
              <label class="col-form-label"
                >{{ Utils.dt(item.stale_time) }}</label
              >
            </div>
          </div>
        </dl>
        <div v-if="Object.keys(item.sensor_data || {}).length > 0">
          <h6>آخرین داده‌های سنسور</h6>
          <table class="table" style="table-layout: fixed">
            <tr v-for="(value, key) in item.sensor_data">
              <td class="col-3">{{key}}</td>
              <td
                class="col-9"
                style="text-overflow: ellipsis;white-space: nowrap;overflow: hidden;"
                :title="value"
              >
                {{value}}
              </td>
            </tr>
          </table>
        </div>
        <div class="form-group row">{{ item.text }}</div>
      </div>

      <!-- Unit Edit Form -->
      <div class="card-body" v-if="editing">
        <form>
          <div class="form-group row mb-3">
            <label for="edit-callsign" class="col-sm-4 col-form-label"
              >شناسه</label
            >
            <div class="col-sm-8">
              <input
                type="text"
                class="form-control"
                id="edit-callsign"
                v-model="editingData.callsign"
              />
            </div>
          </div>
          <div class="form-group row mb-3">
            <label for="edit-type" class="col-sm-4 col-form-label">نوع</label>
            <div class="col-sm-8">
              <input
                type="text"
                class="form-control"
                id="edit-type"
                v-model="editingData.type"
              />
            </div>
          </div>
          <div class="form-group row mb-3">
            <label for="edit-remarks" class="col-sm-4 col-form-label"
              >توضیحات</label
            >
            <div class="col-sm-8">
              <textarea
                class="form-control"
                id="edit-remarks"
                rows="3"
                v-model="editingData.text"
              ></textarea>
            </div>
          </div>
          <div class="form-check mb-3">
            <input
              class="form-check-input"
              type="checkbox"
              id="edit-send"
              v-model="editingData.send"
            />
            <label class="form-check-label" for="edit-send"> ارسال </label>
          </div>
          <div class="d-flex justify-content-end">
            <button
              type="button"
              class="btn btn-secondary me-2"
              v-on:click="cancelEditing"
            >
              لغو
            </button>
            <button
              type="button"
              class="btn btn-primary"
              v-on:click="saveEditing"
            >
              ذخیره
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
});
