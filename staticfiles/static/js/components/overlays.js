Vue.component("OverlaysList", {
  data: function () {
    return {
      sharedState: store.state,
      counts: new Map(),
      overlays: {
        contact: {
          active: true,
          title: "مخاطبین",
        },
        unit: {
          active: true,
          title: "نیروها",
        },
        alarm: {
          active: true,
          title: "هشدارها",
        },
        point: {
          active: true,
          title: "نقاط",
        },
        drawing: {
          active: true,
          title: "ناحیه ها",
        },
        route: {
          active: true,
          title: "مسیرها",
        },
      },
    };
  },
  watch: {
    overlays: {
      handler(newValue) {
        for (const [overlayName, overlay] of Object.entries(newValue)) {
          console.log("overlay", overlayName, overlay);
          let overlayActive = overlay.active;
          this.toggleOverlay(overlayName, overlayActive);
        }
      },
      immediate: true,
      deep: true,
    },
  },
  methods: {
    countByCategory(category) {
      let total = 0;
      this.sharedState.items.forEach(function (u) {
        if (u.category === category && !u.uid.endsWith("-fence")) total += 1;
      });

      return this.sharedState.ts && total;
    },
  },
  props: ["toggleOverlay", "config", "coords", "configUpdated"],
  inject: [],
  template: html`
    <div class="card">
      <h5 class="card-header">لایه‌ها</h5>
      <div class="card-body">
        <!--                <h5 class="card-title">Special title treatment</h5>-->
        <ul class="list-group">
          <li
            class="list-group-item d-flex justify-content-between align-items-center"
            v-for="(overlay, name, index) in overlays"
          >
            <input
              class="form-check-input me-1"
              type="checkbox"
              v-model="overlay.active"
              :id="'overlay-'+name"
            />
            <label class="form-check-label" :for="'overlay-'+name"
              >{{overlay.title}}</label
            >
            <span class="badge bg-success rounded-pill"
              >{{countByCategory(name)}}</span
            >
          </li>
        </ul>
        <!--                <a href="#" class="btn btn-primary">Go somewhere</a>-->
      </div>
    </div>
  `,
});
