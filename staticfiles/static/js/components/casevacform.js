Vue.component("CasevacForm", {
  props: ["location", "onDone", "initialData"],
  data: function () {
    return {
      casevacDetails: {
        casevac: true, // Default to true as it's a Casevac form
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
        terrain_slope: false,
        terrain_rough: false,
        obstacles: "",
        terrain_slope_dir: "",
        medline_remarks: "",
        zone_prot_selection: "",
        zone_protected_coord: "",
        zone_prot_marker: "",
      },
      remarks: "",
    };
  },
  methods: {
    mounted() {
      if (this.initialData) {
        this.remarks = this.initialData.remarks;
        this.casevacDetails = this.initialData.casevacDetails;
      }
    },
    sendCasevac: function () {
      let now = new Date();
      let stale = new Date(now);
      stale.setDate(stale.getDate() + 365);

      let lat = 0;
      let lon = 0;

      if (this.location) {
        lat = this.location.lat;
        lon = this.location.lng;
      } else if (this.initialData) {
        lat = this.lat;
        lon = this.lon;
      }

      let uid =
        "MED." +
        now.getDay() +
        "." +
        now.getHours() +
        "" +
        now.getMinutes() +
        "" +
        now.getSeconds();
      let u = {
        uid: uid,
        category: "report",
        callsign: uid,
        sidc: "",
        start_time: now,
        last_seen: now,
        stale_time: stale,
        type: "b-r-f-h-c",
        lat: lat,
        lon: lon,
        hae: 0,
        speed: 0,
        course: 0,
        status: "",
        text: "",
        parent_uid: "",
        parent_callsign: "",
        local: true,
        send: true,
        web_sensor: "",
        remarks: this.remarks,
        casevac_detail: this.casevacDetails,
      };
      if (this.config && this.config.uid) {
        u.parent_uid = this.config.uid;
        u.parent_callsign = this.config.callsign;
      }
      this.onDone(u);
    },
  },
  template: html`
    <div class="card">
      <div class="card-header">گزارش درخواست امداد</div>
      <div class="card-body">
        <div class="mb-3" v-if="location">
          <label for="location" class="form-label">مکان:</label>
          <input
            type="text"
            class="form-control"
            id="location"
            :value="Utils.printCoords(location.lat, location.lng)"
            readonly
          />
        </div>
        <div class="mb-3">
          <label for="remarks" class="form-label">توضیحات:</label>
          <textarea
            class="form-control"
            id="remarks"
            rows="3"
            v-model="remarks"
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
                    v-model.number="casevacDetails.urgent"
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
                    v-model.number="casevacDetails.priority"
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
                    v-model.number="casevacDetails.routine"
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
                  <label for="litter" class="form-label">تعداد برانکارد:</label>
                  <input
                    type="number"
                    class="form-control"
                    id="litter"
                    v-model.number="casevacDetails.litter"
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
                    v-model.number="casevacDetails.ambulatory"
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
                  <label for="us_military" class="form-label"
                    >تعداد نظامی خودی:</label
                  >
                  <input
                    type="number"
                    class="form-control"
                    id="us_military"
                    v-model.number="casevacDetails.us_military"
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
                    v-model.number="casevacDetails.us_civilian"
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
                    v-model.number="casevacDetails.nonus_military"
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
                    v-model.number="casevacDetails.nonus_civilian"
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
                    v-model.number="casevacDetails.epw"
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
                    v-model.number="casevacDetails.child"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="card mb-3">
          <div class="card-header">وضعیت امنیتی منطقه</div>
          <div class="card-body">
            <div class="mb-3">
              <select
                class="form-select"
                id="security"
                v-model.number="casevacDetails.security"
              >
                <option value="0">عدم حضور نیروهای دشمن در منطقه</option>
                <option value="1">احتمال حضور نیروهای دشمن در منطقه</option>
                <option value="2">نیروهای دشمن، با احتیاط نزدیک شوید</option>
                <option value="3">نیروهای دشمن، نیاز به اسکورت مسلح</option>
              </select>
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
                    v-model="casevacDetails.hoist"
                  />
                  <label class="form-check-label" for="hoist"> بالابر </label>
                </div>
                <div class="form-check mb-2">
                  <input
                    class="form-check-input"
                    type="checkbox"
                    id="extraction_equipment"
                    v-model="casevacDetails.extraction_equipment"
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
                    v-model="casevacDetails.ventilator"
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
                    v-model="casevacDetails.equipment_other"
                  />
                  <label class="form-check-label" for="equipment_other">
                    سایر تجهیزات
                  </label>
                </div>
              </div>
            </div>
            <div class="mb-3" v-if="casevacDetails.equipment_other">
              <label for="equipment_detail" class="form-label"
                >توضیحات تجهیزات:</label
              >
              <textarea
                class="form-control"
                id="equipment_detail"
                rows="2"
                v-model="casevacDetails.equipment_detail"
              ></textarea>
            </div>
          </div>
        </div>

        <!-- <div class="form-check">
          <input
            class="form-check-input"
            type="checkbox"
            id="terrain_slope"
            v-model="casevacDetails.terrain_slope"
          />
          <label class="form-check-label" for="terrain_slope"> شیب زمین </label>
        </div>
        <div class="mb-3" v-if="casevacDetails.terrain_slope">
          <label for="terrain_slope_dir" class="form-label"
            >جهت شیب زمین:</label
          >
          <input
            type="text"
            class="form-control"
            id="terrain_slope_dir"
            v-model="casevacDetails.terrain_slope_dir"
          />
        </div>
        <div class="form-check">
          <input
            class="form-check-input"
            type="checkbox"
            id="terrain_rough"
            v-model="casevacDetails.terrain_rough"
          />
          <label class="form-check-label" for="terrain_rough">
            زمین ناهموار
          </label>
        </div>
        <div class="mb-3">
          <label for="obstacles" class="form-label">موانع:</label>
          <input
            type="text"
            class="form-control"
            id="obstacles"
            v-model="casevacDetails.obstacles"
          />
        </div>
        <div class="mb-3">
          <label for="medline_remarks" class="form-label"
            >توضیحات مدلاین:</label
          >
          <textarea
            class="form-control"
            id="medline_remarks"
            rows="3"
            v-model="casevacDetails.medline_remarks"
          ></textarea>
        </div>
        <div class="mb-3">
          <label for="zone_prot_selection" class="form-label"
            >انتخاب حفاظت منطقه:</label
          >
          <input
            type="text"
            class="form-control"
            id="zone_prot_selection"
            v-model="casevacDetails.zone_prot_selection"
          />
        </div>
        <div class="mb-3">
          <label for="zone_protected_coord" class="form-label"
            >مختصات حفاظت شده منطقه:</label
          >
          <input
            type="text"
            class="form-control"
            id="zone_protected_coord"
            v-model="casevacDetails.zone_protected_coord"
          />
        </div>
        <div class="mb-3">
          <label for="zone_prot_marker" class="form-label"
            >علامت حفاظت منطقه:</label
          >
          <input
            type="text"
            class="form-control"
            id="zone_prot_marker"
            v-model="casevacDetails.zone_prot_marker"
          />
        </div> -->
        <div class="mb-3">
          <label for="freq" class="form-label">فرکانس تماس:</label>
          <input
            type="number"
            class="form-control"
            id="freq"
            v-model.number="casevacDetails.freq"
          />
        </div>
        <button
          type="button"
          class="btn btn-primary"
          @click="sendCasevac"
          v-if="initialData === null"
        >
          درخواست امداد
        </button>
        <button
          type="button"
          class="btn btn-secondary"
          @click="onDone(null)"
          v-if="initialData === null"
        >
          لغو
        </button>
      </div>
    </div>
  `,
});
