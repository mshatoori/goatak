Vue.component("CasevacDetails", {
  props: ["item", "coords", "map", "locked_unit_uid", "config"],
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
  methods: {
    mapToUnit: function (unit) {
      if (unit && unit.lat && unit.lon) {
        this.map.setView([unit.lat, unit.lon]);
      }
    },
    startEditing: function () {
      // Fix for cyclic object value error - create a structured deep copy instead of JSON.parse/stringify
      this.editingData = {
        uid: this.item.uid,
        category: this.item.category,
        callsign: this.item.callsign,
        type: this.item.type,
        lat: this.item.lat,
        lon: this.item.lon,
        remarks: this.item.remarks || "",
        casevac_detail: {},
      };

      // Copy casevac_detail properties individually to avoid circular references
      if (this.item.casevac_detail) {
        const detail = this.item.casevac_detail;
        this.editingData.casevac_detail = {
          casevac: detail.casevac || true,
          freq: detail.freq || 0,
          urgent: detail.urgent || 0,
          priority: detail.priority || 0,
          routine: detail.routine || 0,
          hoist: detail.hoist || false,
          extraction_equipment: detail.extraction_equipment || false,
          ventilator: detail.ventilator || false,
          equipment_other: detail.equipment_other || false,
          equipment_detail: detail.equipment_detail || "",
          litter: detail.litter || 0,
          ambulatory: detail.ambulatory || 0,
          security: detail.security || 0,
          hlz_marking: detail.hlz_marking || 0,
          us_military: detail.us_military || 0,
          us_civilian: detail.us_civilian || 0,
          nonus_military: detail.nonus_military || 0,
          nonus_civilian: detail.nonus_civilian || 0,
          epw: detail.epw || 0,
          child: detail.child || 0,
        };
      } else {
        this.editingData.casevac_detail = {
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

      this.editing = true;
    },
    cancelEditing: function () {
      this.editing = false;
      this.editingData = null;

      if (this.item.isNew) {
        this.deleteItem();
      }
    },
    deleteItem: function () {
      this.$emit("delete", this.item.uid);
    },
    saveEditing: function () {
      // Validate form fields if necessary
      if (!this.validateForm()) {
        return;
      }

      // Update the item object with the new values from the form fields
      this.item.casevac_detail = {
        title: this.editingData.casevac_detail.title,
        priority: this.editingData.casevac_detail.priority,
        urgent: this.editingData.casevac_detail.urgent,
        routine: this.editingData.casevac_detail.routine,
        hoist: this.editingData.casevac_detail.hoist,
        extraction_equipment:
          this.editingData.casevac_detail.extraction_equipment,
        ventilator: this.editingData.casevac_detail.ventilator,
        equipment_other: this.editingData.casevac_detail.equipment_other,
        equipment_detail: this.editingData.casevac_detail.equipment_detail,
        litter: this.editingData.casevac_detail.litter,
        ambulatory: this.editingData.casevac_detail.ambulatory,
        security: this.editingData.casevac_detail.security,
        hlz_marking: this.editingData.casevac_detail.hlz_marking,
        us_military: this.editingData.casevac_detail.us_military,
        us_civilian: this.editingData.casevac_detail.us_civilian,
        nonus_military: this.editingData.casevac_detail.nonus_military,
        nonus_civilian: this.editingData.casevac_detail.nonus_civilian,
        epw: this.editingData.casevac_detail.epw,
        child: this.editingData.casevac_detail.child,
        freq: this.editingData.casevac_detail.freq,
      };

      // If `type` and `category` are editable, update them as well
      this.item.type = this.editingData.type;
      this.item.category = this.editingData.category;
      this.item.remarks = this.editingData.remarks;

      // Emit the save event with the updated item object
      this.$emit("save", this.item);
      this.editing = false;
    },
    validateForm: function () {
      // Add any necessary form validation logic here
      // For now, we'll just return true to allow saving
      return true;
    },
  },
  template: `
    <div class="card">
      <!-- Header -->
      <div class="card-header">
        <span class="pull-left fw-bold" v-on:click.stop="mapToUnit(item)">
          <img src="/static/icons/casevac.svg" height="24" /> {{ item.callsign }}
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

      <!-- Casevac View (non-editing mode) -->
      <div class="card-body" v-if="!editing">
        <div class="mb-3">
          <label class="form-label fw-bold">مکان:</label>
          <div>{{ Utils.printCoords(item.lat, item.lon) }}</div>
        </div>
        <div class="mb-3">
          <label class="form-label fw-bold">توضیحات:</label>
          <div>{{ item.remarks || "" }}</div>
        </div>

        <h6 class="fw-bold">اطلاعات بیماران:</h6>

        <div class="card mb-3">
          <div class="card-header">اولویت بیماران</div>
          <div class="card-body">
            <div class="row">
              <div class="col">
                <div class="mb-3">
                  <label class="form-label fw-bold">بحرانی:</label>
                  <div>{{ item.casevac_detail?.urgent || 0 }}</div>
                </div>
              </div>
              <div class="col">
                <div class="mb-3">
                  <label class="form-label fw-bold">بااولویت:</label>
                  <div>{{ item.casevac_detail?.priority || 0 }}</div>
                </div>
              </div>
              <div class="col">
                <div class="mb-3">
                  <label class="form-label fw-bold">روتین:</label>
                  <div>{{ item.casevac_detail?.routine || 0 }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="card mb-3">
          <div class="card-header">وضعیت حرکتی بیماران</div>
          <div class="card-body">
            <div class="row">
              <div class="col">
                <div class="mb-3">
                  <label class="form-label fw-bold">تعداد برانکارد:</label>
                  <div>{{ item.casevac_detail?.litter || 0 }}</div>
                </div>
              </div>
              <div class="col">
                <div class="mb-3">
                  <label class="form-label fw-bold"
                    >تعداد بیماران قابل حمل:</label
                  >
                  <div>{{ item.casevac_detail?.ambulatory || 0 }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="card mb-3">
          <div class="card-header">نوع بیماران</div>
          <div class="card-body">
            <div class="row">
              <div class="col">
                <div class="mb-3">
                  <label class="form-label fw-bold">تعداد امنیتی:</label>
                  <div>{{ item.casevac_detail?.security || 0 }}</div>
                </div>
              </div>
              <div class="col">
                <div class="mb-3">
                  <label class="form-label fw-bold">تعداد نظامی خودی:</label>
                  <div>{{ item.casevac_detail?.us_military || 0 }}</div>
                </div>
              </div>
            </div>
            <div class="row">
              <div class="col">
                <div class="mb-3">
                  <label class="form-label fw-bold">تعداد غیرنظامی خودی:</label>
                  <div>{{ item.casevac_detail?.us_civilian || 0 }}</div>
                </div>
              </div>
              <div class="col">
                <div class="mb-3">
                  <label class="form-label fw-bold"
                    >تعداد نظامی غیر خودی:</label
                  >
                  <div>{{ item.casevac_detail?.nonus_military || 0 }}</div>
                </div>
              </div>
            </div>
            <div class="row">
              <div class="col">
                <div class="mb-3">
                  <label class="form-label fw-bold"
                    >تعداد غیرنظامی غیر خودی:</label
                  >
                  <div>{{ item.casevac_detail?.nonus_civilian || 0 }}</div>
                </div>
              </div>
              <div class="col">
                <div class="mb-3">
                  <label class="form-label fw-bold">تعداد اسیران جنگی:</label>
                  <div>{{ item.casevac_detail?.epw || 0 }}</div>
                </div>
              </div>
            </div>
            <div class="row">
              <div class="col">
                <div class="mb-3">
                  <label class="form-label fw-bold">تعداد کودکان:</label>
                  <div>{{ item.casevac_detail?.child || 0 }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="card mb-3">
          <div class="card-header">تجهیزات مورد نیاز</div>
          <div class="card-body">
            <div class="row">
              <div class="col-md-6">
                <div class="mb-2">
                  <i
                    :class="item.casevac_detail?.hoist ? 'bi bi-check-square' : 'bi bi-square'"
                  ></i>
                  <span class="ms-2">بالابر</span>
                </div>
                <div class="mb-2">
                  <i
                    :class="item.casevac_detail?.extraction_equipment ? 'bi bi-check-square' : 'bi bi-square'"
                  ></i>
                  <span class="ms-2">تجهیزات نجات و رهاسازی</span>
                </div>
              </div>
              <div class="col-md-6">
                <div class="mb-2">
                  <i
                    :class="item.casevac_detail?.ventilator ? 'bi bi-check-square' : 'bi bi-square'"
                  ></i>
                  <span class="ms-2">ونتیلاتور</span>
                </div>
                <div class="mb-2">
                  <i
                    :class="item.casevac_detail?.equipment_other ? 'bi bi-check-square' : 'bi bi-square'"
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

        <div class="mb-3">
          <label class="form-label fw-bold">فرکانس تماس:</label>
          <div>{{ item.casevac_detail?.freq || 0 }}</div>
        </div>
      </div>

      <!-- Casevac Edit Form -->
      <div class="card-body" v-if="editing">
        <form>
          <div class="mb-3">
            <label for="location" class="form-label">مکان:</label>
            <input
              type="text"
              class="form-control"
              id="location"
              :value="Utils.printCoords(item.lat, item.lon)"
              readonly
            />
          </div>
          <div class="mb-3">
            <label for="remarks" class="form-label">توضیحات:</label>
            <textarea
              class="form-control"
              id="remarks"
              rows="3"
              v-model="editingData.remarks"
            ></textarea>
          </div>

          <h6>اطلاعات بیماران:</h6>

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

          <div class="card mb-3">
            <div class="card-header">وضعیت حرکتی بیماران</div>
            <div class="card-body">
              <div class="row">
                <div class="col">
                  <div class="mb-3">
                    <label for="litter" class="form-label"
                      >تعداد برانکارد:</label
                    >
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

          <div class="card mb-3">
            <div class="card-header">نوع بیماران</div>
            <div class="card-body">
              <div class="row">
                <div class="col">
                  <div class="mb-3">
                    <label for="security" class="form-label"
                      >تعداد امنیتی:</label
                    >
                    <input
                      type="number"
                      class="form-control"
                      id="security"
                      v-model.number="editingData.casevac_detail.security"
                    />
                  </div>
                </div>
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
                    <label for="epw" class="form-label"
                      >تعداد اسیران جنگی:</label
                    >
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
              <div
                class="mb-3"
                v-if="editingData.casevac_detail.equipment_other"
              >
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

          <div class="mb-3">
            <label for="freq" class="form-label">فرکانس تماس:</label>
            <input
              type="number"
              class="form-control"
              id="freq"
              v-model.number="editingData.casevac_detail.freq"
            />
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
