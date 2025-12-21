<template>
  <div class="card">
    <!-- Header -->
    <div class="card-header">
      <span class="pull-left fw-bold" v-on:click.stop="mapToUnit(item)">
        <i :class="isRoute ? 'bi bi-bezier2' : 'bi bi-pentagon'"></i>
        {{ item.callsign || (isRoute ? "مسیر" : "چندضلعی") }}
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

    <!-- Drawing View (non-editing mode) -->
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
            <label class="col-form-label">{{
              humanReadableType(item.type)
            }}</label>
          </div>
        </div>
        <div class="form-group row">
          <label class="col-sm-4 col-form-label font-weight-bold"
            ><strong>رنگ</strong></label
          >
          <div class="col-sm-8">
            <label class="col-form-label">{{ colorName(item.color) }}</label>
          </div>
        </div>
        <div class="form-group row" v-if="isPolygon && item.geofence">
          <label class="col-sm-4 col-form-label font-weight-bold"
            ><strong>ژئوفنس</strong></label
          >
          <div class="col-sm-8">
            <label class="col-form-label">فعال</label>
          </div>
        </div>
        <div class="form-group row" v-if="isPolygon && item.geofence">
          <label class="col-sm-4 col-form-label font-weight-bold"
            ><strong>هشدار برای</strong></label
          >
          <div class="col-sm-8">
            <label class="col-form-label">{{ item.geofence_aff }}</label>
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

    <!-- Drawing Edit Form -->
    <div class="card-body" v-if="editing">
      <form>
        <div class="form-group row my-2 mx-2">
          <div class="col-6">
            <label for="drawing-ed-callsign">شناسه</label>
            <input
              v-model="editingData.callsign"
              id="drawing-ed-callsign"
              placeholder="callsign"
              class="form-control"
            />
          </div>
          <div class="form-check col-2 mt-4">
            <input
              type="checkbox"
              id="drawing-ed-send"
              v-model="editingData.send"
              class="form-check-input"
            />
            <label for="drawing-ed-send" class="form-check-label">ارسال</label>
          </div>
        </div>
        <div class="form-group row my-2 mx-2">
          <div class="col-12">
            <label class="my-1 mr-2 col-6" for="drawing-ed-aff">رنگ</label>
            <select
              class="form-select my-1 mr-sm-2"
              id="drawing-ed-aff"
              v-model="editingData.color"
            >
              <option value="red">قرمز</option>
              <option value="blue">آبی</option>
              <option value="white">سفید</option>
              <option value="gray">خاکستری</option>
              <option value="orange">نارنجی</option>
            </select>
          </div>
        </div>

        <hr />
        <div class="form-group row my-2 mr-sm-2" v-if="isPolygon">
          <div class="form-check col-6">
            <input
              type="checkbox"
              id="drawing-ed-geofence"
              v-model="editingData.geofence"
              class="form-check-input"
            />
            <label for="drawing-ed-geofence" class="form-check-label"
              >ژئوفنس</label
            >
          </div>
          <div class="col-12">
            <label class="my-1 mr-2 col-6" for="drawing-ed-geofence-aff"
              >هشدار هنگام حضور نیروهای:</label
            >
            <select
              class="form-select my-1 mr-sm-2"
              id="drawing-ed-geofence-aff"
              v-model="editingData.geofence_aff"
            >
              <option value="Hostile">دشمن</option>
              <option value="Friendly">خودی</option>
              <option value="All">همه</option>
            </select>
          </div>
        </div>
        <div class="form-group row my-2 mx-2">
          <div class="col-12">
            <label for="drawing-ed-remarks">توضیحات</label>
            <textarea
              id="drawing-ed-remarks"
              class="form-control"
              rows="3"
              v-model="editingData.text"
            ></textarea>
          </div>
        </div>
        <div class="d-flex justify-content-end mt-3">
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
import { humanReadableType, dt } from "../utils.js";

export default {
  props: ["item", "coords", "locked_unit_uid", "config"],
  // components: {
  //   NavigationInfo: Vue.component("NavigationInfo"),
  // },
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
    isPolygon() {
      return this.item && this.item.type === "u-d-f";
    },
    isRoute() {
      return this.item && this.item.category === "route";
    },
  },
  methods: {
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
        points: this.item.points || [],
        color: this.item.color || "blue",
        text: this.item.text || "",
        send: this.item.send || false,
        web_sensor: this.item.web_sensor || "",
        parent_uid: this.item.parent_uid || "",
        parent_callsign: this.item.parent_callsign || "",
      };

      // Copy polygon-specific properties if they exist
      if (this.isPolygon) {
        this.editingData.geofence = this.item.geofence || false;
        this.editingData.geofence_aff = this.item.geofence_aff || "All";
      }

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

      this.editing = false;
      this.editingData = null;

      this.$emit("save", this.item);
    },
    deleteItem: function() {
      this.$emit("delete", this.item.uid);
    },
    colorName: function(color) {
      switch (color) {
        case "white":
          return "سفید";
        case "gray":
          return "خاکستری";
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
    humanReadableType,
    dt,
  },
};
</script>

<style></style>
