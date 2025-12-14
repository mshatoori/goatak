<template>
  <div>
    <div
      class="modal fade"
      id="send-modal"
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
            <h5 class="modal-title">ارسال به ...</h5>
            <button
              type="button"
              class="btn-close"
              data-bs-dismiss="modal"
              aria-label="Close"
            ></button>
          </div>
          <div class="modal-body">
            <div id="dest-to-send" class="card mt-4">
              <div class="card-body">
                <div class="form">
                  <div class="form-group row">
                    <label
                      for="dest-urn-select"
                      class="col-sm-4 col-form-label font-weight-bold"
                      ><strong>URN (مخاطب)</strong></label
                    >
                    <div class="col-sm-8">
                      <select
                        id="dest-urn-select"
                        class="form-control"
                        v-model="selectedUrn"
                        @change="onUrnSelected"
                      >
                        <option value="" disabled>URN را انتخاب کنید</option>
                        <option
                          v-for="contact in contactsData"
                          :key="contact.urn"
                          :value="contact.urn"
                        >
                          {{ contact.urn }} ({{ contact.callsign }})
                        </option>
                      </select>
                    </div>
                  </div>
                  <div class="form-group row mt-3">
                    <label
                      for="dest-ip-select"
                      class="col-sm-4 col-form-label font-weight-bold"
                      ><strong>IP Address</strong></label
                    >
                    <div class="col-sm-8">
                      <select
                        id="dest-ip-select"
                        class="form-control"
                        v-model="selectedIp"
                        :disabled="!selectedUrn"
                      >
                        <option value="" disabled>IP را انتخاب کنید</option>
                        <option
                          v-for="ip in availableIps"
                          :key="ip"
                          :value="ip"
                        >
                          {{ ip }}
                        </option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button
              type="button"
              class="btn btn-primary"
              @click="send"
              :disabled="!selectedUrn || !selectedIp"
            >
              ارسال
            </button>
            <button
              type="button"
              class="btn btn-secondary"
              data-bs-dismiss="modal"
            >
              خروج
            </button>
          </div>
        </div>
      </div>
    </div>
    <div class="toast-container position-fixed bottom-0 end-0 p-3">
      <div
        id="sendToast"
        class="toast hide"
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
      >
        <div class="toast-header">
          <i class="bi" :class="toast.icon"></i>
          <strong class="me-auto">ارسال</strong>
          <button
            type="button"
            class="btn-close"
            data-bs-dismiss="toast"
            aria-label="Close"
          ></button>
        </div>
        <div class="toast-body">{{ toast.text }}</div>
      </div>
    </div>
  </div>
</template>

<script>
import store from "../store.js";
import api from "../api/axios.js";

export default {
  name: "Send",
  data() {
    return {
      selectedUrn: "",
      availableIps: [],
      selectedIp: "",
      sharedState: store.state,
      toast: { text: "ارسال با موفقیت انجام شد", icon: "bi-mailbox" },
    };
  },
  computed: {
    contactsData() {
      let contacts = [];
      if (this.sharedState.ts) {
        this.sharedState.items.forEach(function(u) {
          if (u.category === "contact") {
            contacts.push(u);
          }
        });
      }

      return contacts;
    },
  },
  methods: {
    onUrnSelected() {
      console.log("URN SELECTED", this.contactsData);
      const selectedContact = this.contactsData.find(
        (contact) => contact.urn.toString() == this.selectedUrn
      );
      console.log("selectedUrn", this.selectedUrn);
      console.log("selectedContact", selectedContact);
      if (selectedContact) {
        this.availableIps = selectedContact.ip_address.split(",");
        this.selectedIp =
          this.availableIps.length > 0 ? this.availableIps[0] : ""; // Select first IP by default
      } else {
        this.availableIps = [];
        this.selectedIp = "";
      }
    },
    send() {
      // Use selectedIp and selectedUrn for sending
      api
        .post(`/unit/${this.sharedState.unitToSend.uid}/send/`, {
          ipAddress: this.selectedIp,
          urn: parseInt(this.selectedUrn),
        })
        .then((response) => {
          if (response.status === 200) {
            this.toast.text = "ارسال با موفقیت انجام شد";
            this.toast.icon = "bi-mailbox";
          } else {
            this.toast.text = "ارسال با خطا مواجه شد";
            this.toast.icon = "bi-x";
          }

          const sentToastElement = document.getElementById("sendToast");
          const sendToast = bootstrap.Toast.getOrCreateInstance(
            sentToastElement
          );
          sendToast.show();
        });
    },
  },
};
</script>

<style></style>
