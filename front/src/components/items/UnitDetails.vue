<template>
  <BaseItemDetails
    :item="item"
    :coords="coords"
    :locked_unit_uid="locked_unit_uid"
    :config="config"
    :editing="editing"
    :type-display="humanReadableType(item.type)"
    @update:locked_unit_uid="$emit('update:locked_unit_uid', $event)"
    @start-editing="startEditing"
    @cancel-editing="cancelEditingWrapper"
    @save-editing="saveEditingWrapper"
    @delete="deleteItemWrapper"
    @navigation-line-toggle="$emit('navigation-line-toggle', $event)"
  >
    <template #header-icon>
      <img :src="milImg(renderedItem)" />
      {{ getUnitName(renderedItem) }}
      <span v-if="item.status">({{ item.status }})</span>
    </template>

    <template #view-content>
      <!-- Team and Role -->
      <template v-if="item.team">
        <div class="form-group row">
          <label class="col-sm-4 col-form-label font-weight-bold">
            <strong>تیم</strong>
          </label>
          <div class="col-sm-8">
            <label class="col-form-label">{{ item.team }}</label>
          </div>
        </div>
        <div class="form-group row">
          <label class="col-sm-4 col-form-label font-weight-bold">
            <strong>نقش</strong>
          </label>
          <div class="col-sm-8">
            <label class="col-form-label">{{ item.role }}</label>
          </div>
        </div>
      </template>

      <!-- Speed -->
      <div class="form-group row">
        <label class="col-sm-4 col-form-label font-weight-bold">
          <strong>سرعت</strong>
        </label>
        <div class="col-sm-8">
          <label class="col-form-label">{{ formatSpeed(item.speed) }}</label>
        </div>
      </div>

      <!-- Altitude -->
      <div class="form-group row">
        <label class="col-sm-4 col-form-label font-weight-bold">
          <strong>ارتفاع</strong>
        </label>
        <div class="col-sm-8">
          <label class="col-form-label">{{ item.hae?.toFixed(1) || 0 }}</label>
        </div>
      </div>

      <!-- Sensor Data -->
      <div v-if="Object.keys(item.sensor_data || {}).length > 0">
        <h6>آخرین داده‌های سنسور</h6>
        <table class="table" style="table-layout: fixed">
          <tr v-for="(value, key) in item.sensor_data" :key="key">
            <td class="col-3">{{ key }}</td>
            <td
              class="col-9"
              style="text-overflow: ellipsis; white-space: nowrap; overflow: hidden"
              :title="value"
            >
              {{ value }}
            </td>
          </tr>
        </table>
      </div>
    </template>

    <template #edit-content>
      <!-- Callsign -->
      <div class="form-group row mb-3">
        <label for="edit-callsign" class="col-sm-4 col-form-label">شناسه</label>
        <div class="col-sm-8">
          <input
            type="text"
            class="form-control"
            id="edit-callsign"
            v-model="editingData.callsign"
          />
        </div>
      </div>

      <!-- Affiliation -->
      <div class="form-group row mb-3">
        <label for="edit-aff" class="col-sm-4 col-form-label">طرف</label>
        <div class="col-sm-8">
          <select class="form-select" id="edit-aff" v-model="editingData.aff">
            <option value="h">دشمن</option>
            <option value="f">خودی</option>
            <option value="n">خنثی</option>
            <option value="u">نامعلوم</option>
            <option value="s">مشکوک</option>
          </select>
        </div>
      </div>

      <!-- Hierarchy/Subtype -->
      <div class="form-group row my-2 mx-2">
        <div class="col-12">
          <label class="my-1 mr-2">نوع</label>
          <HierarchySelector v-model="editingData.subtype" />
        </div>
      </div>

      <!-- Stale Duration -->
      <div class="form-group row mb-3">
        <label for="edit-stale-duration" class="col-sm-4 col-form-label">
          مدت انقضا (ساعت)
        </label>
        <div class="col-sm-8">
          <input
            type="number"
            class="form-control"
            id="edit-stale-duration"
            v-model.number="editingData.stale_duration"
            min="1"
            max="168"
            step="1"
          />
        </div>
      </div>

      <!-- Send Mode Selector -->
      <SendModeSelector
        v-model="editingData"
        :available-subnets="availableSubnets"
        :available-contacts="availableContacts"
      />

      <!-- Remarks -->
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
    </template>

    <template #additional-controls>
      <UnitTrackingControl
        v-if="item.category === 'unit'"
        :unit="item"
        :tracking-manager="$root.trackingManager"
      />
    </template>
  </BaseItemDetails>
</template>

<script>
import { computed, watch } from "vue";
import store from "../../store.js";
import { getMilIcon, humanReadableType, formatSpeed } from "../../utils.js";
import { useItemEditing } from "../../composables/useItemEditing.js";
import BaseItemDetails from "./BaseItemDetails.vue";
import HierarchySelector from "../HierarchySelector.vue";
import SendModeSelector from "../SendModeSelector.vue";
import UnitTrackingControl from "../UnitTrackingControl.vue";

export default {
  name: "UnitDetails",
  components: {
    BaseItemDetails,
    HierarchySelector,
    SendModeSelector,
    UnitTrackingControl,
  },
  props: ["item", "coords", "locked_unit_uid", "config"],
  emits: ["save", "delete", "update:locked_unit_uid", "navigation-line-toggle"],
  setup(props, { emit }) {
    const {
      editing,
      editingData,
      availableSubnets,
      availableContacts,
      startEditing: baseStartEditing,
      cancelEditing,
      saveEditing: baseSaveEditing,
      deleteItem,
    } = useItemEditing();

    const getSidc = (s) => store.getSidc(s);

    const renderedItem = computed(() => {
      if (editing.value && editingData.value) {
        return {
          ...editingData.value,
          sidc: store.sidcFromType(
            "a-" + editingData.value.aff + "-" + editingData.value.subtype
          ),
        };
      }
      return props.item;
    });

    function milImg(item) {
      return getMilIcon(item, false).uri;
    }

    function getUnitName(u) {
      let res = u.callsign || "no name";
      if (u.parent_uid === props.config?.uid) {
        const send_mode = u.send_mode || (u.send ? "broadcast" : "none");
        switch (send_mode) {
          case "broadcast":
            res = "+ " + res;
            break;
          case "subnet":
            res = "~ " + res;
            break;
          case "direct":
            res = "→ " + res;
            break;
          case "none":
          default:
            res = "* " + res;
            break;
        }
      }
      return res;
    }

    function startEditing() {
      const typeSpecificFields = {
        aff: props.item.type?.substring(2, 3) || "u",
        subtype: props.item.type?.substring(4) || "",
        stale_duration: 24,
      };

      baseStartEditing(props.item, typeSpecificFields);

      // Initialize root_sidc if needed
      if (!props.item.root_sidc) {
        editingData.value.root_sidc = getSidc(editingData.value.subtype || "");
      } else {
        editingData.value.root_sidc = props.item.root_sidc;
      }
    }

    function cancelEditingWrapper() {
      cancelEditing(props.item, emit);
    }

    function saveEditingWrapper() {
      const additionalProcessing = (item, data) => {
        // Calculate stale_time from duration
        if (data.stale_duration) {
          const lastSeen = new Date(item.last_seen || new Date());
          const staleDurationMs = data.stale_duration * 60 * 60 * 1000;
          item.stale_time = new Date(
            lastSeen.getTime() + staleDurationMs
          ).toISOString();
        }

        // Update type and sidc
        item.type = "a-" + data.aff + "-" + data.subtype;
        item.sidc = store.sidcFromType(item.type);
      };

      baseSaveEditing(props.item, emit, additionalProcessing);
    }

    function deleteItemWrapper() {
      deleteItem(props.item, emit);
    }

    // Auto-start editing for new items
    watch(
      () => props.item,
      (newVal, oldVal) => {
        if (newVal && newVal.uid !== oldVal?.uid) {
          if (newVal.isNew) {
            startEditing();
          }
        }
      },
      { immediate: true }
    );

    return {
      editing,
      editingData,
      availableSubnets,
      availableContacts,
      renderedItem,
      startEditing,
      cancelEditingWrapper,
      saveEditingWrapper,
      deleteItemWrapper,
      milImg,
      getUnitName,
      humanReadableType,
      formatSpeed,
    };
  },
};
</script>

<style></style>
