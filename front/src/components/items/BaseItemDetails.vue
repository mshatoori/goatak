<template>
  <div class="card">
    <!-- Header -->
    <div class="card-header">
      <span class="pull-left fw-bold" @click.stop="mapToUnit(item)">
        <slot name="header-icon">
          <i class="bi bi-geo-alt-fill"></i>
        </slot>
        {{ item.callsign || defaultCallsign }}
        <!-- Coordinate Lock Icons -->
        <img
          height="24"
          src="/static/icons/coord_unlock.png"
          v-if="locked_unit_uid != item.uid"
          @click.stop="$emit('update:locked_unit_uid', item.uid)"
        />
        <img
          height="24"
          src="/static/icons/coord_lock.png"
          v-if="locked_unit_uid == item.uid"
          @click.stop="$emit('update:locked_unit_uid', '')"
        />
      </span>
      <span class="pull-right" v-if="!editing">
        <button
          type="button"
          class="btn btn-sm btn-primary"
          @click.stop="$emit('start-editing')"
        >
          <i class="bi bi-pencil-square"></i>
        </button>
        <button
          type="button"
          class="btn btn-sm btn-danger"
          @click.stop="$emit('delete')"
        >
          <i class="bi bi-trash3-fill"></i>
        </button>
      </span>
    </div>

    <!-- View Mode -->
    <div class="card-body" v-if="!editing">
      <dl>
        <!-- UID -->
        <div class="form-group row">
          <label class="col-sm-4 col-form-label font-weight-bold">
            <strong>UID</strong>
          </label>
          <div class="col-sm-8">
            <label class="col-form-label">{{ item.uid }}</label>
          </div>
        </div>

        <!-- Type -->
        <div class="form-group row">
          <label class="col-sm-4 col-form-label font-weight-bold">
            <strong>نوع</strong>
          </label>
          <div class="col-sm-8">
            <label class="col-form-label">{{ typeDisplay }}</label>
          </div>
        </div>

        <!-- Coordinates -->
        <div class="form-group row">
          <label class="col-sm-4 col-form-label font-weight-bold">
            <strong>مختصات</strong>
          </label>
          <div class="col-sm-8">
            <Location
              :lat="item.lat"
              :lon="item.lon"
              :otherCoords="coords"
              @focus="focusOnItem"
            />
          </div>
        </div>

        <!-- Parent/Creator Info -->
        <div class="form-group row" v-if="item.parent_uid">
          <label class="col-sm-4 col-form-label font-weight-bold">
            <strong>سازنده</strong>
          </label>
          <div class="col-sm-8">
            <label class="col-form-label">
              {{ item.parent_uid }}
              <span v-if="item.parent_callsign"
                >({{ item.parent_callsign }})</span
              >
            </label>
          </div>
        </div>

        <!-- Times -->
        <div class="form-group row">
          <label class="col-sm-4 col-form-label font-weight-bold">
            <strong>زمان ایجاد</strong>
          </label>
          <div class="col-sm-8">
            <label class="col-form-label">{{ dt(item.start_time) }}</label>
          </div>
        </div>
        <div class="form-group row" v-if="item.send_time">
          <label class="col-sm-4 col-form-label font-weight-bold">
            <strong>زمان ارسال</strong>
          </label>
          <div class="col-sm-8">
            <label class="col-form-label">{{ dt(item.send_time) }}</label>
          </div>
        </div>
        <div class="form-group row" v-if="item.stale_time">
          <label class="col-sm-4 col-form-label font-weight-bold">
            <strong>زمان انقضا</strong>
          </label>
          <div class="col-sm-8">
            <label class="col-form-label">{{ dt(item.stale_time) }}</label>
          </div>
        </div>

        <!-- Type-specific content slot -->
        <slot name="view-content"></slot>
      </dl>

      <!-- Text/Remarks -->
      <div class="form-group row" v-if="item.text">
        {{ item.text }}
      </div>

      <!-- Navigation Info -->
      <NavigationInfo
        :target-item="item"
        :user-position="config"
        @navigation-line-toggle="$emit('navigation-line-toggle', $event)"
      />

      <!-- Additional controls slot (e.g., UnitTrackingControl) -->
      <slot name="additional-controls"></slot>
    </div>

    <!-- Edit Mode -->
    <div class="card-body" v-if="editing">
      <form @submit.prevent>
        <!-- Type-specific edit content slot (includes callsign, send mode, etc.) -->
        <slot name="edit-content"></slot>

        <!-- Action Buttons -->
        <div class="d-flex justify-content-end">
          <button
            type="button"
            class="btn btn-secondary me-2"
            @click="$emit('cancel-editing')"
          >
            لغو
          </button>
          <button
            type="button"
            class="btn btn-primary"
            @click="$emit('save-editing')"
          >
            ذخیره
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script>
import { dt } from "../../utils.js";
import store from "../../store.js";
import Location from "../Location.vue";
import NavigationInfo from "../NavigationInfo.vue";

export default {
  name: "BaseItemDetails",
  components: {
    Location,
    NavigationInfo,
  },
  props: {
    item: {
      type: Object,
      required: true,
    },
    coords: {
      type: Object,
      default: null,
    },
    locked_unit_uid: {
      type: String,
      default: "",
    },
    config: {
      type: Object,
      default: null,
    },
    editing: {
      type: Boolean,
      default: false,
    },
    typeDisplay: {
      type: String,
      default: "",
    },
    defaultCallsign: {
      type: String,
      default: "",
    },
  },
  emits: [
    "update:locked_unit_uid",
    "start-editing",
    "cancel-editing",
    "save-editing",
    "delete",
    "navigation-line-toggle",
  ],
  setup() {
    function mapToUnit(unit) {
      if (unit && unit.lat && unit.lon) {
        const map = store.getMap();
        if (map) {
          map.flyTo({ center: [unit.lon, unit.lat] });
        }
      }
    }

    function focusOnItem(item) {
      mapToUnit(item);
    }

    return {
      mapToUnit,
      focusOnItem,
      dt,
    };
  },
};
</script>

<style scoped>
.form-group.row {
  margin-bottom: 0.5rem;
}
</style>
