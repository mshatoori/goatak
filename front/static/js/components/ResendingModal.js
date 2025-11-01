Vue.component("ResendingModal", {
  props: ["config", "map"],
  template: `
    <div
      class="modal fade"
      id="resending-modal"
      data-bs-backdrop="static"
      data-bs-keyboard="false"
      tabindex="-1"
      aria-labelledby="resendingModalLabel"
      aria-hidden="true"
    >
      <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="resendingModalLabel">بازارسال پیام‌ها</h5>
            <button
              type="button"
              class="btn-close"
              data-bs-dismiss="modal"
              aria-label="Close"
            ></button>
          </div>
          <div class="modal-body p-0">
            <resending-panel :config="config" :map="map"></resending-panel>
          </div>
        </div>
      </div>
    </div>
  `,
});