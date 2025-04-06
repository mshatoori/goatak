<template>
  <div class="card">
    <h5 class="card-header">اطلاعات من</h5>
    <div class="card-body">
      <dl>
        <div class="form-group row">
          <label for="input-callsign" class="col-sm-4 col-form-label font-weight-bold"><strong>نام</strong></label>
          <div class="col-sm-8">
            <input type="text" class="form-control" id="input-callsign" v-model="config.callsign" v-if="editing"/>
            <label class="col-form-label" v-else>{{config.callsign}}</label>
          </div>
        </div>
        <div class="form-group row">
          <label for="input-team" class="col-sm-4 col-form-label font-weight-bold"><strong>تیم</strong></label>
          <div class="col-sm-8">
            <input type="text" class="form-control" id="input-team" v-model="config.team" v-if="editing"/>
            <label class="col-form-label" v-else>{{config.team}}</label>
          </div>
        </div>
        <div class="form-group row">
          <label for="input-role" class="col-sm-4 col-form-label font-weight-bold"><strong>نقش</strong></label>
          <div class="col-sm-8">
            <input type="text" class="form-control" id="input-role" v-model="config.role" v-if="editing"/>
            <label class="col-form-label" v-else>{{config.role}}</label>
          </div>
        </div>
        <div class="form-group row">
          <label for="input-type" class="col-sm-4 col-form-label font-weight-bold"><strong>نوع</strong></label>
          <div class="col-sm-8">
            <input type="text" class="form-control" id="input-type" v-model="config.type" v-if="editing"/>
            <label class="col-form-label" v-else>{{config.type}}</label>
          </div>
        </div>
        <div class="form-group row">
          <label class="col-sm-4 col-form-label font-weight-bold"><strong>مختصات</strong></label>
          <div class="col-sm-8">
            <label class="col-form-label">
              {{ printCoords(coords.lat, coords.lng) }}
              <span class="badge rounded-pill bg-success" style="cursor:default;" @click="map.setView([coords.lat, coords.lng])">
                <i class="bi bi-geo"></i>
              </span>
            </label>
          </div>
        </div>
      </dl>
      <div class="form-group row">
        <div class="col-sm-12">
          <button type="button" class="btn btn-primary" @click="toggleEdit" v-if="!editing">ویرایش</button>
          <button type="button" class="btn btn-success" @click="saveChanges" v-if="editing">ذخیره</button>
          <button type="button" class="btn btn-danger" @click="cancelEdit" v-if="editing">انصراف</button>
        </div>
      </div>
      <div class="form-group row">
        <div class="col-sm-12">
          <button type="button" class="btn btn-warning" @click="checkEmergency">وضعیت اضطراری</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'UserInfo',
  props: {
    config: {
      type: Object,
      required: true
    },
    coords: {
      type: Object,
      required: true
    },
    configUpdated: {
      type: Function,
      required: true
    },
    checkEmergency: {
      type: Function,
      required: true
    },
    map: {
      type: Object,
      required: true
    }
  },
  data() {
    return {
      editing: false,
      originalConfig: null
    };
  },
  methods: {
    printCoords(lat, lng) {
      return lat.toFixed(6) + "," + lng.toFixed(6);
    },
    toggleEdit() {
      this.editing = true;
      this.originalConfig = JSON.parse(JSON.stringify(this.config));
    },
    saveChanges() {
      this.configUpdated(this.config);
      this.editing = false;
    },
    cancelEdit() {
      Object.assign(this.config, this.originalConfig);
      this.editing = false;
    }
  }
};
</script> 