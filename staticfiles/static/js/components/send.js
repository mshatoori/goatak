// const html = String.raw;
Vue.component('SendModal', {
    data: function () {
        return {
            dest: {
                addr: "",
                urn: "",
            },
            sharedState: store.state,
            toast: {text: "ارسال با موفقیت انجام شد", icon: 'bi-mailbox'}
        }
    },
    methods: {
        send: function () {
            fetch("unit/" + this.sharedState.unitToSend.uid + "/send/", {
                headers: {"Content-Type": "application/json"},
                method: "POST",
                body: JSON.stringify({ipAddress: this.dest.addr, urn: parseInt(this.dest.urn)})
            }).then((response) => {
                // return response.json()
                if (response.status === 200) {
                    this.toast.text = "ارسال با موفقیت انجام شد"
                    this.toast.icon = "bi-mailbox"
                } else {
                    this.toast.text = "ارسال با خطا مواجه شد"
                    this.toast.icon = "bi-x"
                }

                const sentToastElement = document.getElementById('sendToast')

                const sendToast = bootstrap.Toast.getOrCreateInstance(sentToastElement)
                sendToast.show()
            })
        },
    },
    template: html`
        <div>
            <div class="modal fade" id="send-modal" data-bs-backdrop="static" data-bs-keyboard="false" tabindex="-1"
                 aria-labelledby="staticBackdropLabel" aria-hidden="true">
                <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">ارسال به ...</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <div id="dest-to-send" class="card mt-4">
                                <div class="card-body">
                                    <div class="form">
                                        <div class="form-group row">
                                            <label
                                                    for="dest-addr"
                                                    class="col-sm-4 col-form-label font-weight-bold"
                                            ><strong>IP</strong></label
                                            >
                                            <div class="col-sm-8">
                                                <input
                                                        type="text"
                                                        class="form-control"
                                                        id="dest-addr"
                                                        v-model="dest.addr"
                                                />
                                            </div>
                                        </div>
                                        <div class="form-group row">
                                            <label
                                                    for="dest-urn"
                                                    class="col-sm-4 col-form-label font-weight-bold"
                                            ><strong>URN</strong></label
                                            >
                                            <div class="col-sm-8">
                                                <input
                                                        type="text"
                                                        class="form-control"
                                                        id="dest-urn"
                                                        v-model="dest.urn"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-primary" v-on:click="send">ارسال</button>
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">خروج</button>
                        </div>
                    </div>
                </div>
            </div>
            <div class="toast-container position-fixed bottom-0 end-0 p-3">
                <div id="sendToast" class="toast" role="alert" aria-live="assertive" aria-atomic="true">
                    <div class="toast-header">
                        <i class="bi" :class="toast.icon"></i>
                        <strong class="me-auto">ارسال</strong>
                        <!--                    <small>11 mins ago</small>-->
                        <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
                    </div>
                    <div class="toast-body">
                        {{ toast.text }}
                    </div>
                </div>
            </div>
        </div>
    `
})