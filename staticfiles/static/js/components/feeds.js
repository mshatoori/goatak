Vue.component('FeedsModal', {
    data: function () {
        return {
            newFeed: {
                type: "UDP",
                addr: "",
            },
            sharedState: store.state,
        }
    },
    methods: {
        createFeed: function () {
            console.log("Creating Feed:", this.newFeed);
            store.createFeed({...this.newFeed});
        },
        removeSensor: function () {
            // TODO:
        },
        newOutFeed: function () {
            // TODO: put in create feed
            let postData = {
                addr: this.new_out_feed.ip,
                port: parseInt(this.new_out_feed.port),
                outgoing: this.new_out_feed.outgoing,
            }
            const requestOptions = {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify(postData),
            };
            fetch("/feeds", requestOptions)
                .then(function (response) {
                    return response.json()
                })
                .then(this.processFeeds);
        },
        feedDirectionText: function (direction) {
            switch (direction) {
                case 1:
                    return "ورودی"
                case 2:
                    return "خروجی"
                case 3:
                    return "دوطرفه"
            }
        },
        feedTypeText: function (type) {
            switch (type) {
                case "UDP":
                    return "UDP"
                case "Rabbit":
                    return "RabbitMQ"
            }
        }
    },
    computed: {
        allFeeds: function () {
            return this.sharedState.feeds;
        },
    },
    template: `
    <div class="modal fade" id="feeds-modal" data-bs-backdrop="static" data-bs-keyboard="false" tabindex="-1"
        aria-labelledby="staticBackdropLabel" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable modal-lg">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">ارتباطات</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <div id="feeds-list" class="list-group">
                        <div class="list-group-item" v-for="(feed, idx) in allFeeds">
                            <div class="d-flex w-100 justify-content-between" v-if="feed.type === 'UDP'">
                              <div>
                                <h5 class="mb-1">شناسه: {{ feed.uid }}</h5>
                                <div>آدرس: {{ feed.addr }}</div>
                                <div>پورت: {{ feed.port }}</div>
                              </div>
                              <div>
                                <span class="badge rounded-pill bg-primary">{{ feedTypeText(feed.type) }}</span>
                                <span class="badge rounded-pill bg-success">{{ feedDirectionText(feed.direction) }}</span>
                              </div>
                            </div>
                            <div class="d-flex w-100 justify-content-between" v-if="feed.type === 'Rabbit'">
                              <div>
                                  <h5 class="mb-1">شناسه: {{ feed.uid }}</h5>
                                  <div>آدرس: {{ feed.addr }}</div>
                                  <div>صف دریافت: {{ feed.recvQueue }}</div>
                                  <div>صف ارسال: {{ feed.sendQueue }}</div>
                              </div>
                              <div>
                                <span class="badge rounded-pill bg-primary">{{ feedTypeText(feed.type) }}</span>
                                <span class="badge rounded-pill bg-success">{{ feedDirectionText(feed.direction) }}</span>
                              </div>
                            </div>
                        </div>
                    </div>
                    <div id="new-feed" class="card mt-4">
                        <div class="card-body">
                            <div class="d-flex w-100 justify-content-between">
                                <h5>ایجاد ارتباط جدید:</h5>
                                <div class="btn-group">
                                    <input type="radio" value="UDP" class="btn-check" name="new-feed-type" id="udp-radio" v-model="newFeed.type">
                                    <label class="btn btn-outline-primary" for="udp-radio">UDP</label>
                                    
                                    <input type="radio" value="Rabbit" class="btn-check" name="new-feed-type" id="rabbit-radio" v-model="newFeed.type">
                                    <label class="btn btn-outline-primary" for="rabbit-radio">RabbitMQ</label>
                                </div>
                            </div>
                            <!-- TODO: UDP & RABBIT FORM -->
                        </div>
                    </div>
                </div>
                <!-- <div class="modal-footer">
                    <form @submit.prevent="sendMessage">
                        <input type="text" class="form-control" id="message-text" v-model="chat_msg" />
                    </form>
                    <button type="button" class="btn btn-primary" v-on:click="sendMessage">ارسال پیام</button>
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">خروج</button>
                </div> -->
            </div>
        </div>
    </div>`
})