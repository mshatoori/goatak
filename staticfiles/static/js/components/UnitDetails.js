Vue.component("UnitDetails", {
  props: ["item", "coords", "map", "locked_unit_uid", "config"],
  components: {
    NavigationInfo: Vue.component("NavigationInfo"),
  },
  data: function () {
    return {
      editing: false,
      editingData: null,
      sharedState: store.state,
    };
  },
  mounted: function () {
    // Automatically start editing if this is a new item
    if (this.item && this.item.isNew) {
      this.$nextTick(() => this.startEditing());
    }
  },
  watch: {
    item: function (newVal, oldVal) {
      if (newVal && newVal.uid !== oldVal.uid) {
        if (newVal.isNew) {
          this.$nextTick(() => this.startEditing());
        }
      }
    },
  },
  methods: {
    getSidc: (s) => store.getSidc(s),
    getRootSidc: (s) => store.getRootSidc(s),
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
      console.log("startEditing called for item:", this.item); // Added log
      // Use a structured deep copy to avoid circular references
      this.editingData = {
        uid: this.item.uid,
        category: this.item.category,
        callsign: this.item.callsign,
        type: this.item.type,
        aff: this.item.type.substring(2, 3),
        subtype: this.item.type.substring(4),
        lat: this.item.lat,
        lon: this.item.lon,
        text: this.item.text || "",
        send: this.item.send || false,
        web_sensor: this.item.web_sensor || "",
        parent_uid: this.item.parent_uid || "",
        parent_callsign: this.item.parent_callsign || "",
        isNew: this.item.isNew || false, // Include isNew flag
      };

      console.log("Editing Data:", this.editingData); // Added log

      // Initialize root_sidc and subtype if not present
      if (!this.item.root_sidc) {
        this.editingData.root_sidc = this.getSidc(
          this.editingData.subtype || ""
        );
      } else {
        this.editingData.root_sidc = this.item.root_sidc;
      }

      this.editing = true;
      console.log("editing set to:", this.editing); // Added log
    },
    cancelEditing: function () {
      this.editing = false;
      this.editingData = null;

      if (this.item.isNew) {
        this.deleteItem();
      }
    },
    saveEditing: function () {
      // Update the item with the edited data
      for (const key in this.editingData) {
        this.item[key] = this.editingData[key];
      }

      this.item["type"] = "a-" + this.item["aff"] + "-" + this.item.subtype;
      this.item["sidc"] = store.sidcFromType(this.item["type"]);

      this.editing = false;
      this.editingData = null;

      this.$emit("save", this.item);
    },
    deleteItem: function () {
      this.$emit("delete", this.item.uid);
    },
    openChat: function (uid, callsign) {
      // Implement chat opening functionality
      console.log("Opening chat with", uid, callsign);
    },
    // Method to handle navigation between subtype levels
    setFormRootSidc: function (code) {
      this.editingData.root_sidc = this.getSidc(code);
      this.editingData.subtype = code;
    },
  },
  computed: {
    renderedItem: function () {
      if (this.editing)
        return {
          ...this.editingData,
          sidc: store.sidcFromType(
            "a-" + this.editingData["aff"] + "-" + this.editingData.subtype
          ),
        };
      return this.item;
    },
    isContact: function () {
      return this.item && this.item.category === "contact";
    },
  },
  template: html`
    <div class="card">
      <!-- Header -->
      <div class="card-header">
        <span class="pull-left fw-bold" v-on:click.stop="mapToUnit(item)">
          <img :src="milImg(renderedItem)" /> {{ getUnitName(renderedItem) }}
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
        <span class="pull-right" v-if="!editing && !isContact">
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
              <label class="col-form-label"
                >{{Utils.humanReadableType(item.type)}}</label
              >
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

        <!-- Navigation Info Component -->
        <navigation-info
          v-if="!editing"
          :target-item="item"
          :user-position="config"
          @navigation-line-toggle="$emit('navigation-line-toggle', $event)"
        ></navigation-info>

        <!-- Unit Tracking Control Component -->
        <unit-tracking-control
          v-if="!editing && item.category === 'unit'"
          :unit="item"
          :tracking-manager="$parent.trackingManager"
        ></unit-tracking-control>
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
            <label for="edit-aff" class="col-sm-4 col-form-label">طرف</label>
            <div class="col-sm-8">
              <select
                class="form-select"
                id="edit-aff"
                v-model="editingData.aff"
              >
                <option value="h">دشمن</option>
                <option value="f">خودی</option>
                <option value="n">خنثی</option>
                <option value="u">نامعلوم</option>
                <option value="s">مشکوک</option>
              </select>
            </div>
          </div>
          <div class="form-group row my-2 mx-2">
            <div class="col-12">
              <label class="my-1 mr-2">نوع</label>
              <hierarchy-selector v-model="editingData.subtype" />
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
