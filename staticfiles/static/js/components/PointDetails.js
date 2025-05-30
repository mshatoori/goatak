Vue.component("PointDetails", {
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
    if (this.item && this.item.isNew === true) {
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
  computed: {
    renderedItem: function () {
      if (this.editing) return this.editingData;
      return this.item;
    },
  },
  methods: {
    getIconUri: getIconUri,
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
        lat: this.item.lat,
        lon: this.item.lon,
        text: this.item.text || "",
        send: this.item.send || false,
        web_sensor: this.item.web_sensor || "",
        color: this.item.color || "",
        parent_uid: this.item.parent_uid || "",
        parent_callsign: this.item.parent_callsign || "",
      };

      this.editing = true;
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

      this.$emit("save", this.item);
      this.editing = false;
      this.editingData = null;
    },
    deleteItem: function () {
      this.$emit("delete", this.item.uid);
    },
    colorName: function (color) {
      switch (color) {
        case "red":
          return "قرمز";
        case "blue":
          return "آبی";
        case "green":
          return "سبز";
        case "yellow":
          return "زرد";
        case "orange":
          return "نارنجی";
        case "purple":
          return "بنفش";
        case "black":
          return "سیاه";
      }
    },
  },
  template: html`
    <div class="card">
      <!-- Header -->
      <div class="card-header">
        <span class="pull-left fw-bold" v-on:click.stop="mapToUnit(item)">
          <!-- <i class="bi bi-geo-alt-fill"></i> {{ item.callsign || "نقطه" }} -->
          <img :src="getIconUri(editingData).uri" /> {{ renderedItem.callsign }}
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

      <!-- Point View (non-editing mode) -->
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
          <div class="form-group row" v-if="item.color">
            <label class="col-sm-4 col-form-label font-weight-bold"
              ><strong>رنگ</strong></label
            >
            <div class="col-sm-8">
              <label class="col-form-label">{{colorName(item.color)}}</label>
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
        </dl>
        <div class="form-group row">{{ item.text }}</div>
        
        <!-- Navigation Info Component -->
        <navigation-info
          v-if="!editing"
          :target-item="item"
          :user-position="config"
          @navigation-line-toggle="$emit('navigation-line-toggle', $event)"
        ></navigation-info>
      </div>

      <!-- Point Edit Form -->
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
              <select
                class="form-select"
                id="edit-type"
                v-model="editingData.type"
              >
                <option value="b-m-p-s-m">محل</option>
                <option value="b-m-p-w-GOTO">نشانگر مسیر</option>
                <option value="b-m-p-s-p-op">نقطه دیده‌بانی</option>
                <option value="b-m-p-a">نقطه هدف</option>
              </select>
            </div>
          </div>
          <div class="form-group row mb-3">
            <label for="edit-color" class="col-sm-4 col-form-label">رنگ</label>
            <div class="col-sm-8">
              <select
                class="form-select"
                id="edit-color"
                v-model="editingData.color"
              >
                <option value="red">قرمز</option>
                <option value="blue">آبی</option>
                <option value="green">سبز</option>
                <option value="yellow">زرد</option>
                <option value="orange">نارنجی</option>
                <option value="purple">بنفش</option>
                <option value="black">سیاه</option>
              </select>
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
          <div class="form-group row mb-3">
            <label for="edit-websensor" class="col-sm-4 col-form-label"
              >اطلاعات اضافه</label
            >
            <div class="col-sm-8">
              <textarea
                class="form-control"
                id="edit-websensor"
                rows="3"
                v-model="editingData.web_sensor"
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
