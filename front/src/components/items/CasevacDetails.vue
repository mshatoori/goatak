<template>
  <BaseItemDetails
    :item="item"
    :coords="coords"
    :locked_unit_uid="locked_unit_uid"
    :config="config"
    :editing="editing"
    type-display="درخواست پزشکی"
    @update:locked_unit_uid="$emit('update:locked_unit_uid', $event)"
    @start-editing="startEditing"
    @cancel-editing="cancelEditingWrapper"
    @save-editing="saveEditingWrapper"
    @delete="deleteItemWrapper"
    @navigation-line-toggle="$emit('navigation-line-toggle', $event)"
  >
    <template #header-icon>
      <img src="/static/icons/casevac.svg" height="24" />
    </template>

    <template #view-content>
      <!-- Patient Priority -->
      <div class="card mb-3">
        <div class="card-header">اولویت بیماران</div>
        <div class="card-body">
          <div class="row">
            <div class="col">
              <div class="mb-3">
                <label class="form-label fw-bold">بحرانی:</label>
                <div>{{ formatNumber(item.casevac_detail?.urgent || 0) }}</div>
              </div>
            </div>
            <div class="col">
              <div class="mb-3">
                <label class="form-label fw-bold">بااولویت:</label>
                <div>
                  {{ formatNumber(item.casevac_detail?.priority || 0) }}
                </div>
              </div>
            </div>
            <div class="col">
              <div class="mb-3">
                <label class="form-label fw-bold">روتین:</label>
                <div>{{ formatNumber(item.casevac_detail?.routine || 0) }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Security Status -->
      <div class="card mb-3">
        <div class="card-header">وضعیت امنیتی منطقه</div>
        <div class="card-body">
          <div class="mb-3">
            <div v-if="item.casevac_detail?.security === 0">
              عدم حضور نیروهای دشمن در منطقه
            </div>
            <div v-if="item.casevac_detail?.security === 1">
              احتمال حضور نیروهای دشمن در منطقه
            </div>
            <div v-if="item.casevac_detail?.security === 2">
              نیروهای دشمن، با احتیاط نزدیک شوید
            </div>
            <div v-if="item.casevac_detail?.security === 3">
              نیروهای دشمن، نیاز به اسکورت مسلح
            </div>
          </div>
        </div>
      </div>

      <!-- Patient Mobility -->
      <div class="card mb-3">
        <div class="card-header">وضعیت حرکتی بیماران</div>
        <div class="card-body">
          <div class="row">
            <div class="col">
              <div class="mb-3">
                <label class="form-label fw-bold">تعداد برانکارد:</label>
                <div>{{ formatNumber(item.casevac_detail?.litter || 0) }}</div>
              </div>
            </div>
            <div class="col">
              <div class="mb-3">
                <label class="form-label fw-bold"
                  >تعداد بیماران قابل حمل:</label
                >
                <div>
                  {{ formatNumber(item.casevac_detail?.ambulatory || 0) }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Patient Types -->
      <div class="card mb-3">
        <div class="card-header">نوع بیماران</div>
        <div class="card-body">
          <div class="row">
            <div class="col">
              <div class="mb-3">
                <label class="form-label fw-bold">تعداد نظامی خودی:</label>
                <div>
                  {{ formatNumber(item.casevac_detail?.us_military || 0) }}
                </div>
              </div>
            </div>
          </div>
          <div class="row">
            <div class="col">
              <div class="mb-3">
                <label class="form-label fw-bold">تعداد غیرنظامی خودی:</label>
                <div>
                  {{ formatNumber(item.casevac_detail?.us_civilian || 0) }}
                </div>
              </div>
            </div>
            <div class="col">
              <div class="mb-3">
                <label class="form-label fw-bold">تعداد نظامی غیر خودی:</label>
                <div>
                  {{ formatNumber(item.casevac_detail?.nonus_military || 0) }}
                </div>
              </div>
            </div>
          </div>
          <div class="row">
            <div class="col">
              <div class="mb-3">
                <label class="form-label fw-bold"
                  >تعداد غیرنظامی غیر خودی:</label
                >
                <div>
                  {{ formatNumber(item.casevac_detail?.nonus_civilian || 0) }}
                </div>
              </div>
            </div>
            <div class="col">
              <div class="mb-3">
                <label class="form-label fw-bold">تعداد اسیران جنگی:</label>
                <div>{{ formatNumber(item.casevac_detail?.epw || 0) }}</div>
              </div>
            </div>
          </div>
          <div class="row">
            <div class="col">
              <div class="mb-3">
                <label class="form-label fw-bold">تعداد کودکان:</label>
                <div>{{ formatNumber(item.casevac_detail?.child || 0) }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Equipment -->
      <div class="card mb-3">
        <div class="card-header">تجهیزات مورد نیاز</div>
        <div class="card-body">
          <div class="row">
            <div class="col-md-6">
              <div class="mb-2">
                <i
                  :class="
                    item.casevac_detail?.hoist
                      ? 'bi bi-check-square'
                      : 'bi bi-square'
                  "
                ></i>
                <span class="ms-2">بالابر</span>
              </div>
              <div class="mb-2">
                <i
                  :class="
                    item.casevac_detail?.extraction_equipment
                      ? 'bi bi-check-square'
                      : 'bi bi-square'
                  "
                ></i>
                <span class="ms-2">تجهیزات نجات و رهاسازی</span>
              </div>
            </div>
            <div class="col-md-6">
              <div class="mb-2">
                <i
                  :class="
                    item.casevac_detail?.ventilator
                      ? 'bi bi-check-square'
                      : 'bi bi-square'
                  "
                ></i>
                <span class="ms-2">ونتیلاتور</span>
              </div>
              <div class="mb-2">
                <i
                  :class="
                    item.casevac_detail?.equipment_other
                      ? 'bi bi-check-square'
                      : 'bi bi-square'
                  "
                ></i>
                <span class="ms-2">سایر تجهیزات</span>
              </div>
            </div>
          </div>
          <div class="mb-3" v-if="item.casevac_detail?.equipment_other">
            <label class="form-label fw-bold">توضیحات تجهیزات:</label>
            <div>{{ item.casevac_detail?.equipment_detail || "" }}</div>
          </div>
        </div>
      </div>

      <!-- Frequency -->
      <div class="mb-3">
        <label class="form-label fw-bold">فرکانس تماس:</label>
        <div>{{ formatNumber(item.casevac_detail?.freq || 0) }}</div>
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

      <!-- Location -->
      <div class="form-group row mb-3">
        <label for="edit-lat" class="col-sm-4 col-form-label"
          >عرض جغرافیایی</label
        >
        <div class="col-sm-8">
          <input
            type="number"
            class="form-control"
            id="edit-lat"
            v-model.number="editingData.lat"
            step="0.000001"
            min="-90"
            max="90"
          />
        </div>
      </div>
      <div class="form-group row mb-3">
        <label for="edit-lon" class="col-sm-4 col-form-label"
          >طول جغرافیایی</label
        >
        <div class="col-sm-8">
          <input
            type="number"
            class="form-control"
            id="edit-lon"
            v-model.number="editingData.lon"
            step="0.000001"
            min="-180"
            max="180"
          />
        </div>
      </div>

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
            v-model="editingData.remarks"
          ></textarea>
        </div>
      </div>

      <!-- Send Mode Selector -->
      <SendModeSelector
        v-model="editingData"
        :available-subnets="availableSubnets"
        :available-contacts="availableContacts"
      />

      <!-- Patient Priority -->
      <div class="card mb-3">
        <div class="card-header">اولویت بیماران</div>
        <div class="card-body">
          <div class="row">
            <div class="col">
              <div class="mb-3">
                <label for="urgent" class="form-label">بحرانی:</label>
                <input
                  type="number"
                  class="form-control"
                  id="urgent"
                  v-model.number="editingData.casevac_detail.urgent"
                />
              </div>
            </div>
            <div class="col">
              <div class="mb-3">
                <label for="priority" class="form-label">بااولویت:</label>
                <input
                  type="number"
                  class="form-control"
                  id="priority"
                  v-model.number="editingData.casevac_detail.priority"
                />
              </div>
            </div>
            <div class="col">
              <div class="mb-3">
                <label for="routine" class="form-label">روتین:</label>
                <input
                  type="number"
                  class="form-control"
                  id="routine"
                  v-model.number="editingData.casevac_detail.routine"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Security Status -->
      <div class="card mb-3">
        <div class="card-header">وضعیت امنیتی منطقه</div>
        <div class="card-body">
          <div class="mb-3">
            <select
              class="form-select"
              id="security"
              v-model.number="editingData.casevac_detail.security"
            >
              <option value="0">عدم حضور نیروهای دشمن در منطقه</option>
              <option value="1">احتمال حضور نیروهای دشمن در منطقه</option>
              <option value="2">نیروهای دشمن، با احتیاط نزدیک شوید</option>
              <option value="3">نیروهای دشمن، نیاز به اسکورت مسلح</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Patient Mobility -->
      <div class="card mb-3">
        <div class="card-header">وضعیت حرکتی بیماران</div>
        <div class="card-body">
          <div class="row">
            <div class="col">
              <div class="mb-3">
                <label for="litter" class="form-label">تعداد برانکارد:</label>
                <input
                  type="number"
                  class="form-control"
                  id="litter"
                  v-model.number="editingData.casevac_detail.litter"
                />
              </div>
            </div>
            <div class="col">
              <div class="mb-3">
                <label for="ambulatory" class="form-label"
                  >تعداد بیماران قابل حمل:</label
                >
                <input
                  type="number"
                  class="form-control"
                  id="ambulatory"
                  v-model.number="editingData.casevac_detail.ambulatory"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Patient Types -->
      <div class="card mb-3">
        <div class="card-header">نوع بیماران</div>
        <div class="card-body">
          <div class="row">
            <div class="col">
              <div class="mb-3">
                <label for="us_military" class="form-label"
                  >تعداد نظامی خودی:</label
                >
                <input
                  type="number"
                  class="form-control"
                  id="us_military"
                  v-model.number="editingData.casevac_detail.us_military"
                />
              </div>
            </div>
          </div>
          <div class="row">
            <div class="col">
              <div class="mb-3">
                <label for="us_civilian" class="form-label"
                  >تعداد غیرنظامی خودی:</label
                >
                <input
                  type="number"
                  class="form-control"
                  id="us_civilian"
                  v-model.number="editingData.casevac_detail.us_civilian"
                />
              </div>
            </div>
            <div class="col">
              <div class="mb-3">
                <label for="nonus_military" class="form-label"
                  >تعداد نظامی غیر خودی:</label
                >
                <input
                  type="number"
                  class="form-control"
                  id="nonus_military"
                  v-model.number="editingData.casevac_detail.nonus_military"
                />
              </div>
            </div>
          </div>
          <div class="row">
            <div class="col">
              <div class="mb-3">
                <label for="nonus_civilian" class="form-label"
                  >تعداد غیرنظامی غیر خودی:</label
                >
                <input
                  type="number"
                  class="form-control"
                  id="nonus_civilian"
                  v-model.number="editingData.casevac_detail.nonus_civilian"
                />
              </div>
            </div>
            <div class="col">
              <div class="mb-3">
                <label for="epw" class="form-label">تعداد اسیران جنگی:</label>
                <input
                  type="number"
                  class="form-control"
                  id="epw"
                  v-model.number="editingData.casevac_detail.epw"
                />
              </div>
            </div>
          </div>
          <div class="row">
            <div class="col">
              <div class="mb-3">
                <label for="child" class="form-label">تعداد کودکان:</label>
                <input
                  type="number"
                  class="form-control"
                  id="child"
                  v-model.number="editingData.casevac_detail.child"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Equipment -->
      <div class="card mb-3">
        <div class="card-header">تجهیزات مورد نیاز</div>
        <div class="card-body">
          <div class="row">
            <div class="col-md-6">
              <div class="form-check mb-2">
                <input
                  class="form-check-input"
                  type="checkbox"
                  id="hoist"
                  v-model="editingData.casevac_detail.hoist"
                />
                <label class="form-check-label" for="hoist"> بالابر </label>
              </div>
              <div class="form-check mb-2">
                <input
                  class="form-check-input"
                  type="checkbox"
                  id="extraction_equipment"
                  v-model="editingData.casevac_detail.extraction_equipment"
                />
                <label class="form-check-label" for="extraction_equipment">
                  تجهیزات نجات و رهاسازی
                </label>
              </div>
            </div>
            <div class="col-md-6">
              <div class="form-check mb-2">
                <input
                  class="form-check-input"
                  type="checkbox"
                  id="ventilator"
                  v-model="editingData.casevac_detail.ventilator"
                />
                <label class="form-check-label" for="ventilator">
                  ونتیلاتور
                </label>
              </div>
              <div class="form-check mb-2">
                <input
                  class="form-check-input"
                  type="checkbox"
                  id="equipment_other"
                  v-model="editingData.casevac_detail.equipment_other"
                />
                <label class="form-check-label" for="equipment_other">
                  سایر تجهیزات
                </label>
              </div>
            </div>
          </div>
          <div class="mb-3" v-if="editingData.casevac_detail.equipment_other">
            <label for="equipment_detail" class="form-label"
              >توضیحات تجهیزات:</label
            >
            <textarea
              class="form-control"
              id="equipment_detail"
              rows="2"
              v-model="editingData.casevac_detail.equipment_detail"
            ></textarea>
          </div>
        </div>
      </div>

      <!-- Frequency -->
      <div class="mb-3">
        <label for="freq" class="form-label">فرکانس تماس:</label>
        <input
          type="number"
          class="form-control"
          id="freq"
          v-model.number="editingData.casevac_detail.freq"
        />
      </div>
    </template>
  </BaseItemDetails>
</template>

<script>
import { watch } from "vue";
import { formatNumber } from "../../utils.js";
import { useItemEditing } from "../../composables/useItemEditing.js";
import BaseItemDetails from "./BaseItemDetails.vue";
import SendModeSelector from "../SendModeSelector.vue";

export default {
  name: "CasevacDetails",
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

    function createDefaultCasevacDetail() {
      return {
        casevac: true,
        freq: 0,
        urgent: 0,
        priority: 0,
        routine: 0,
        hoist: false,
        extraction_equipment: false,
        ventilator: false,
        equipment_other: false,
        equipment_detail: "",
        litter: 0,
        ambulatory: 0,
        security: 0,
        hlz_marking: 0,
        us_military: 0,
        us_civilian: 0,
        nonus_military: 0,
        nonus_civilian: 0,
        epw: 0,
        child: 0,
      };
    }

    function startEditing() {
      const detail = props.item.casevac_detail || {};
      const typeSpecificFields = {
        remarks: props.item.remarks || "",
        casevac_detail: {
          ...createDefaultCasevacDetail(),
          ...detail,
        },
      };
      baseStartEditing(props.item, typeSpecificFields);
    }

    function cancelEditingWrapper() {
      cancelEditing(props.item, emit);
    }

    function saveEditingWrapper() {
      const additionalProcessing = (item, data) => {
        // Update casevac_detail
        item.casevac_detail = { ...data.casevac_detail };
        // Update remarks
        item.remarks = data.remarks;
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
      { immediate: true },
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
      formatNumber,
    };
  },
};
</script>

<style></style>
