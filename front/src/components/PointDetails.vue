<template>
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
          v-on:click.stop="locked_unit_uid = item.uid"
        />
        <img
          height="24"
          src="/static/icons/coord_lock.png"
          v-if="locked_unit_uid == item.uid"
          v-on:click.stop="locked_unit_uid = ''"
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
            <label class="col-form-label">{{ item.uid }}</label>
          </div>
        </div>
        <div class="form-group row">
          <label
            for="input-type"
            class="col-sm-4 col-form-label font-weight-bold"
            ><strong>نوع</strong></label
          >
          <div class="col-sm-8">
            <label class="col-form-label">{{ typeName(item.type) }}</label>
          </div>
        </div>
        <div class="form-group row">
          <label class="col-sm-4 col-form-label font-weight-bold"
            ><strong>مختصات</strong></label
          >
          <div class="col-sm-8">
            <Location
              :lat="item.lat"
              :lon="item.lon"
              :otherCoords="coords"
              @focus="focusOnPoint"
            />
          </div>
        </div>
        <div class="form-group row" v-if="item.color">
          <label class="col-sm-4 col-form-label font-weight-bold"
            ><strong>رنگ</strong></label
          >
          <div class="col-sm-8">
            <label class="col-form-label">{{ colorName(item.color) }}</label>
          </div>
        </div>
        <div v-if="item.parent_uid">
          <div class="form-group row">
            <label class="col-sm-4 col-form-label font-weight-bold"
              ><strong>سازنده</strong></label
            >
            <div class="col-sm-8">
              <label class="col-form-label"
                >{{ item.parent_uid
                }}<span v-if="item.parent_callsign"
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
            <label class="col-form-label">{{ dt(item.start_time) }}</label>
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
            <div class="dropdown">
              <button
                class="btn btn-outline-secondary dropdown-toggle w-100 text-start"
                type="button"
                id="edit-type-dropdown"
                data-bs-toggle="dropdown"
                aria-expanded="false"
              >
                <img
                  v-if="editingData.type === 'b-m-p-w-GOTO'"
                  src="/static/icons/green_flag.png"
                  style="width: 16px; height: 16px; margin-left: 8px"
                />
                <img
                  v-else-if="editingData.type === 'b-m-p-s-p-op'"
                  src="/static/icons/binos.png"
                  style="width: 16px; height: 16px; margin-left: 8px"
                />
                <img
                  v-else-if="editingData.type === 'b-m-p-a'"
                  src="/static/icons/aimpoint.png"
                  style="width: 16px; height: 16px; margin-left: 8px"
                />
                <span
                  v-else-if="editingData.type === 'b-m-p-s-m'"
                  style="
                    display: inline-block;
                    width: 16px;
                    height: 16px;
                    border-radius: 50%;
                    background-color: black;
                    margin-left: 8px;
                  "
                ></span>
                <span v-if="editingData.type === 'b-m-p-s-m'">محل</span>
                <span v-else-if="editingData.type === 'b-m-p-w-GOTO'"
                  >نشانگر مسیر</span
                >
                <span v-else-if="editingData.type === 'b-m-p-s-p-op'"
                  >نقطه دیده‌بانی</span
                >
                <span v-else-if="editingData.type === 'b-m-p-a'">نقطه هدف</span>
                <span v-else>انتخاب نوع</span>
              </button>
              <ul
                class="dropdown-menu w-100"
                aria-labelledby="edit-type-dropdown"
              >
                <li>
                  <a
                    class="dropdown-item d-flex align-items-center"
                    href="#"
                    @click.prevent="editingData.type = 'b-m-p-s-m'"
                  >
                    <span
                      style="
                        display: inline-block;
                        width: 16px;
                        height: 16px;
                        border-radius: 50%;
                        background-color: black;
                        margin-left: 8px;
                      "
                    ></span>
                    محل
                  </a>
                </li>
                <li>
                  <a
                    class="dropdown-item d-flex align-items-center"
                    href="#"
                    @click.prevent="editingData.type = 'b-m-p-w-GOTO'"
                  >
                    <img
                      src="/static/icons/green_flag.png"
                      style="width: 16px; height: 16px; margin-left: 8px"
                    />
                    نشانگر مسیر
                  </a>
                </li>
                <li>
                  <a
                    class="dropdown-item d-flex align-items-center"
                    href="#"
                    @click.prevent="editingData.type = 'b-m-p-s-p-op'"
                  >
                    <img
                      src="/static/icons/binos.png"
                      style="width: 16px; height: 16px; margin-left: 8px"
                    />
                    نقطه دیده‌بانی
                  </a>
                </li>
                <li>
                  <a
                    class="dropdown-item d-flex align-items-center"
                    href="#"
                    @click.prevent="editingData.type = 'b-m-p-a'"
                  >
                    <img
                      src="/static/icons/aimpoint.png"
                      style="width: 16px; height: 16px; margin-left: 8px"
                    />
                    نقطه هدف
                  </a>
                </li>
              </ul>
            </div>
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
</template>

<script>
import store from "../store.js";
import { getIconUri, printCoords, distBea, latlng, dt } from "../utils.js"; // Assuming getIconUri is from utils.js
// import "../../static/js/utils.js";
import Location from "./Location.vue";

export default {
  props: ["item", "coords", "locked_unit_uid", "config"],
  components: {
    Location,
    // NavigationInfo: Vue.component("NavigationInfo"),
  },
  data: function() {
    return {
      editing: false,
      editingData: null,
      sharedState: store.state,
    };
  },
  mounted: function() {
    // Automatically start editing if this is a new item
    if (this.item && this.item.isNew === true) {
      this.$nextTick(() => this.startEditing());
    }
  },
  watch: {
    item: function(newVal, oldVal) {
      if (newVal && newVal.uid !== oldVal.uid) {
        if (newVal.isNew) {
          this.$nextTick(() => this.startEditing());
        }
      }
    },
  },
  computed: {
    renderedItem: function() {
      if (this.editing) return this.editingData;
      return this.item;
    },
  },
  methods: {
    focusOnPoint: function() {
      const map = store.getMap();
      if (map && this.item) {
        map.flyTo({ center: [this.item.lon, this.item.lat] });
      }
    },
    mapToUnit: function(unit) {
      if (unit && unit.lat && unit.lon) {
        const map = store.getMap();
        if (map) {
          map.flyTo({ center: [unit.lon, unit.lat] });
        }
      }
    },
    startEditing: function() {
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
    cancelEditing: function() {
      this.editing = false;
      this.editingData = null;

      if (this.item.isNew) {
        this.deleteItem();
      }
    },
    saveEditing: function() {
      // Update the item with the edited data
      for (const key in this.editingData) {
        this.item[key] = this.editingData[key];
      }

      this.$emit("save", this.item);
      this.editing = false;
      this.editingData = null;
    },
    deleteItem: function() {
      this.$emit("delete", this.item.uid);
    },
    colorName: function(color) {
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
    typeName: function(type) {
      switch (type) {
        case "b-m-p-s-m":
          return "محل";
        case "b-m-p-w-GOTO":
          return "نشانگر مسیر";
        case "b-m-p-s-p-op":
          return "نقطه دیده‌بانی";
        case "b-m-p-a":
          return "نقطه هدف";
        default:
          return type; // Return the original type if no mapping found
      }
    },
    getIconUri, // Make getIconUri available in the template
    printCoords,
    distBea,
    latlng,
    dt,
  },
};
</script>

<style></style>
