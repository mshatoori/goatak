<template>
  <div
    class="modal fade"
    id="alarms-modal"
    data-bs-backdrop="static"
    data-bs-keyboard="false"
    tabindex="-1"
    aria-labelledby="staticBackdropLabel"
    aria-hidden="true"
  >
    <div
      class="modal-dialog modal-dialog-centered modal-dialog-scrollable modal-lg"
    >
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">هشدارها</h5>
          <button
            type="button"
            class="btn-close"
            data-bs-dismiss="modal"
            aria-label="Close"
          ></button>
        </div>
        <div class="modal-body">
          <!--                        <div id="alarms-list" class="list-group">-->
          <!--                            <div class="list-group-item" v-for="(alarm, idx) in alarms">-->
          <!--                                <div class="d-flex w-100 justify-content-between">-->
          <!--                                    <div>-->
          <!--                                        <h5 class="mb-1">هشدار {{ idx }}</h5>-->
          <!--                                        <code>{{ alarm }}</code>-->
          <!--                                    </div>-->
          <!--                                </div>-->
          <!--                            </div>-->
          <!--                        </div>-->
          <div id="alarms-list" class="list-group">
            <div class="list-group-item" v-for="(alarm, idx) in alarms">
              <div class="d-flex w-100 justify-content-between">
                <div>
                  <h5 class="mb-1">{{ alarm.callsign }}</h5>
                  <small class="text-muted">هشدار {{ idx + 1 }}</small>
                </div>
                <small class="text-muted">{{ dt(alarm.start_time) }}</small>
                <small style="color: darkred"
                  >({{ readableType(alarm.type) }})</small
                >
              </div>
              <p class="mb-1">
                موقعیت: {{ alarm.lat }}, {{ alarm.lon }}
                <span
                  class="badge rounded-pill bg-success"
                  style="cursor: default"
                  @click="focus(alarm)"
                  ><i class="bi bi-geo"></i
                ></span>
              </p>
              <!--                                <p class="mb-1">وضعیت: {{ alarm.status }}</p>-->
              <p class="mb-1">{{ alarm.text }}</p>
              <small class="text-muted">UID: {{ alarm.uid }}</small>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import store from "../store.js";

export default {
  name: "Alarms",
  data() {
    return {
      sharedState: store.state,
    };
  },
  computed: {
    alarms() {
      let res = [];
      this.sharedState.ts &&
        this.sharedState.items.forEach(function(u) {
          if (u.category === "alarm") res.push(u);
        });
      return res;
    },
  },
  methods: {
    silentAlarm() {
      // TODO:
    },
    dt(str) {
      let d = new Date(Date.parse(str));
      return d.toLocaleString("fa-IR");
    },
    readableType(alarmType) {
      return {
        "b-a-g": "ورود به ژئوفنس",
        "b-a-o-tbl": "هشدار",
        "b-a-o-opn": "مواجهه با دشمن",
        "b-a-o-pan": "تلفات",
      }[alarmType];
    },
    focus(alarm) {
      const map = store.getMap();
      if (map) {
        map.setView([alarm.lat, alarm.lon], 12);
      }
      var myModalEl = document.getElementById("alarms-modal");
      var modal = bootstrap.Modal.getInstance(myModalEl);
      modal.hide();
    },
  },
};
</script>

<style></style>
