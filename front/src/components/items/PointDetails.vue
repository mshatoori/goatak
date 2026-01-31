<template>
  <BaseItemDetails
    :item="item"
    :coords="coords"
    :locked_unit_uid="locked_unit_uid"
    :config="config"
    :editing="editing"
    :type-display="typeName(item.type)"
    @update:locked_unit_uid="$emit('update:locked_unit_uid', $event)"
    @start-editing="startEditing"
    @cancel-editing="cancelEditingWrapper"
    @save-editing="saveEditingWrapper"
    @delete="deleteItemWrapper"
    @navigation-line-toggle="$emit('navigation-line-toggle', $event)"
  >
    <template #header-icon>
      <img :src="getIconUri(editingData || item).uri" />
    </template>

    <template #view-content>
      <!-- Color -->
      <div class="form-group row" v-if="item.color">
        <label class="col-sm-4 col-form-label font-weight-bold">
          <strong>رنگ</strong>
        </label>
        <div class="col-sm-8">
          <label class="col-form-label">{{ colorName(item.color) }}</label>
        </div>
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

      <!-- Type Selection -->
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

      <!-- Color -->
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

      <!-- Web Sensor -->
      <div class="form-group row mb-3">
        <label for="edit-websensor" class="col-sm-4 col-form-label">
          اطلاعات اضافه
        </label>
        <div class="col-sm-8">
          <textarea
            class="form-control"
            id="edit-websensor"
            rows="3"
            v-model="editingData.web_sensor"
          ></textarea>
        </div>
      </div>
    </template>
  </BaseItemDetails>
</template>

<script>
import { watch } from "vue";
import { getIconUri } from "../../utils.js";
import { useItemEditing } from "../../composables/useItemEditing.js";
import BaseItemDetails from "./BaseItemDetails.vue";
import SendModeSelector from "../SendModeSelector.vue";

export default {
  name: "PointDetails",
  components: {
    BaseItemDetails,
    SendModeSelector,
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

    function startEditing() {
      const typeSpecificFields = {
        type: props.item.type || "b-m-p-s-m",
        color: props.item.color || "black",
        web_sensor: props.item.web_sensor || "",
      };
      baseStartEditing(props.item, typeSpecificFields);
    }

    function cancelEditingWrapper() {
      cancelEditing(props.item, emit);
    }

    function saveEditingWrapper() {
      baseSaveEditing(props.item, emit);
    }

    function deleteItemWrapper() {
      deleteItem(props.item, emit);
    }

    function colorName(color) {
      const colorMap = {
        red: "قرمز",
        blue: "آبی",
        green: "سبز",
        yellow: "زرد",
        orange: "نارنجی",
        purple: "بنفش",
        black: "سیاه",
      };
      return colorMap[color] || color;
    }

    function typeName(type) {
      const typeMap = {
        "b-m-p-s-m": "محل",
        "b-m-p-w-GOTO": "نشانگر مسیر",
        "b-m-p-s-p-op": "نقطه دیده‌بانی",
        "b-m-p-a": "نقطه هدف",
      };
      return typeMap[type] || type;
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
      startEditing,
      cancelEditingWrapper,
      saveEditingWrapper,
      deleteItemWrapper,
      getIconUri,
      colorName,
      typeName,
    };
  },
};
</script>

<style></style>
