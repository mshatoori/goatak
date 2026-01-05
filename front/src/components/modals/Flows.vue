<template>
  <div
    class="modal fade"
    id="flows-modal"
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
          <h5 class="modal-title">ارتباطات</h5>
          <button
            type="button"
            class="btn-close"
            data-bs-dismiss="modal"
            aria-label="Close"
          ></button>
        </div>
        <div class="modal-body">
          <div id="flows-list" class="list-group">
            <div class="list-group-item" v-for="(flow, idx) in allFlows">
              <div
                class="d-flex w-100 justify-content-between"
                v-if="flow.type === 'UDP'"
              >
                <div>
                  <h5 class="mb-1">نام: {{ flow.title }}</h5>
                  <div>آدرس: {{ flow.addr }}</div>
                  <div>پورت: {{ flow.port }}</div>
                </div>
                <div>
                  <span class="badge rounded-pill bg-primary">{{
                    flowTypeText(flow.type)
                  }}</span>
                  <span class="badge rounded-pill bg-success">{{
                    flowDirectionText(flow.direction)
                  }}</span>
                  <button
                    type="button"
                    class="btn btn-sm btn-outline-danger ms-2"
                    v-on:click="removeFlow(flow.uid)"
                    title="حذف ارتباط"
                  >
                    <i class="bi bi-trash"></i>
                  </button>
                </div>
              </div>
              <div
                class="d-flex w-100 justify-content-between"
                v-if="flow.type === 'Rabbit'"
              >
                <div>
                  <h5 class="mb-1">نام: {{ flow.title }}</h5>
                  <div>آدرس: {{ flow.addr }}</div>
                  <div v-if="flow.direction == 1 || flow.direction == 3">
                    صف دریافت: {{ flow.recvQueue }}
                  </div>
                  <div v-if="flow.direction == 2 || flow.direction == 3">
                    صف ارسال: {{ flow.sendExchange }}
                  </div>
                </div>
                <div>
                  <span class="badge rounded-pill bg-primary">{{
                    flowTypeText(flow.type)
                  }}</span>
                  <span class="badge rounded-pill bg-success">{{
                    flowDirectionText(flow.direction)
                  }}</span>
                  <button
                    type="button"
                    class="btn btn-sm btn-outline-danger ms-2"
                    v-on:click="removeFlow(flow.uid)"
                    title="حذف ارتباط"
                  >
                    <i class="bi bi-trash"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div id="new-flow" class="card mt-4">
            <div class="card-body">
              <div class="d-flex mb-3 w-100 justify-content-between">
                <h5>ایجاد ارتباط جدید:</h5>
                <div>
                  <div class="btn-group">
                    <input
                      type="radio"
                      value="UDP"
                      class="btn-check"
                      name="new-flow-type"
                      id="udp-radio"
                      v-model="newFlow.type"
                    />
                    <label class="btn btn-outline-primary" for="udp-radio"
                      >UDP</label
                    >

                    <input
                      type="radio"
                      value="Rabbit"
                      class="btn-check"
                      name="new-flow-type"
                      id="rabbit-radio"
                      v-model="newFlow.type"
                    />
                    <label class="btn btn-outline-primary" for="rabbit-radio"
                      >RabbitMQ</label
                    >
                  </div>
                  <div class="btn-group">
                    <input
                      type="radio"
                      value="1"
                      class="btn-check"
                      name="new-flow-dir"
                      id="incoming-radio"
                      v-model="newFlow.direction"
                    />
                    <label class="btn btn-outline-success" for="incoming-radio"
                      >ورودی</label
                    >

                    <input
                      type="radio"
                      value="2"
                      class="btn-check"
                      name="new-flow-dir"
                      id="outgoing-radio"
                      v-model="newFlow.direction"
                    />
                    <label class="btn btn-outline-success" for="outgoing-radio"
                      >خروجی</label
                    >

                    <input
                      type="radio"
                      value="3"
                      class="btn-check"
                      name="new-flow-dir"
                      id="both-radio"
                      v-model="newFlow.direction"
                    />
                    <label class="btn btn-outline-success" for="both-radio"
                      >دوطرفه</label
                    >
                  </div>
                </div>
              </div>
              <div class="form" v-if="newFlow.type === 'UDP'">
                <div class="form-group row">
                  <label
                    for="newFlowTitle"
                    class="col-sm-4 col-form-label font-weight-bold"
                    ><strong>نام</strong></label
                  >
                  <div class="col-sm-8">
                    <input
                      type="text"
                      class="form-control"
                      id="newFlowTitle"
                      v-model="newFlow.title"
                    />
                  </div>
                </div>
                <div class="form-group row">
                  <label
                    for="newFlowAddr"
                    class="col-sm-4 col-form-label font-weight-bold"
                    ><strong>آدرس</strong></label
                  >
                  <div class="col-sm-8">
                    <input
                      type="text"
                      class="form-control"
                      id="newFlowAddr"
                      v-model="newFlow.addr"
                    />
                  </div>
                </div>
                <div class="form-group row">
                  <label
                    for="newFlowPort"
                    class="col-sm-4 col-form-label font-weight-bold"
                    ><strong>پورت</strong></label
                  >
                  <div class="col-sm-8">
                    <input
                      type="text"
                      class="form-control"
                      id="newFlowPort"
                      v-model="newFlow.port"
                    />
                  </div>
                </div>
              </div>
              <div class="form" v-if="newFlow.type === 'Rabbit'">
                <div class="form-group row">
                  <label
                    for="newFlowTitle2"
                    class="col-sm-4 col-form-label font-weight-bold"
                    ><strong>نام</strong></label
                  >
                  <div class="col-sm-8">
                    <input
                      type="text"
                      class="form-control"
                      id="newFlowTitle2"
                      v-model="newFlow.title"
                    />
                  </div>
                </div>
                <div class="form-group row">
                  <label
                    for="newFlowAddr2"
                    class="col-sm-4 col-form-label font-weight-bold"
                    ><strong>آدرس</strong></label
                  >
                  <div class="col-sm-8">
                    <input
                      type="text"
                      class="form-control"
                      id="newFlowAddr2"
                      v-model="newFlow.addr"
                    />
                  </div>
                </div>
                <div
                  class="form-group row"
                  v-if="newFlow.direction == 1 || newFlow.direction == 3"
                >
                  <label
                    for="newFlowRecvQueue"
                    class="col-sm-4 col-form-label font-weight-bold"
                    ><strong>صف دریافت</strong></label
                  >
                  <div class="col-sm-8">
                    <input
                      type="text"
                      class="form-control"
                      id="newFlowRecvQueue"
                      v-model="newFlow.recvQueue"
                    />
                  </div>
                </div>
                <div
                  class="form-group row"
                  v-if="newFlow.direction == 2 || newFlow.direction == 3"
                >
                  <label
                    for="newFlowSendExchange"
                    class="col-sm-4 col-form-label font-weight-bold"
                    ><strong>صف ارسال</strong></label
                  >
                  <div class="col-sm-8">
                    <input
                      type="text"
                      class="form-control"
                      id="newFlowSendExchange"
                      v-model="newFlow.sendExchange"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-primary" v-on:click="createFlow">
            ایجاد
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
</template>

<script>
import store from "../../store.js";

export default {
  name: "Flows",
  data() {
    return {
      newFlow: {
        type: "UDP",
        title: "",
        addr: "",
        port: "",
        direction: 1,
        recvQueue: "",
        sendExchange: "",
      },
      sharedState: store.state,
    };
  },
  methods: {
    createFlow: function() {
      console.log("Creating Flow:", this.newFlow);
      store.createFlow({ ...this.newFlow });
    },
    removeFlow: function(uid) {
      console.log("Removing Flow:", uid);
      store.removeFlow(uid).catch((error) => {
        console.error("Failed to remove flow:", error);
        // TODO: add user notification here if needed
      });
    },
    flowDirectionText: function(direction) {
      switch (direction) {
        case 1:
          return "ورودی";
        case 2:
          return "خروجی";
        case 3:
          return "دوطرفه";
      }
    },
    flowTypeText: function(type) {
      switch (type) {
        case "UDP":
          return "UDP";
        case "Rabbit":
          return "RabbitMQ";
      }
    },
  },
  computed: {
    allFlows: function() {
      return this.sharedState.flows;
    },
  },
};
</script>

<style></style>
