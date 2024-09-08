const html = String.raw;
Vue.component('FeedsModal', {
    data: function () {
        return {
            newFeed: {
                type: "UDP",
                title: "",
                addr: "",
                port: "",
                direction: 1,
                recvQueue: "",
                sendQueue: "",
            },
            sharedState: store.state,
        }
    },
    methods: {
        createFeed: function () {
            console.log("Creating Feed:", this.newFeed);
            store.createFeed({...this.newFeed});
        },
        removeFeed: function () {
            // TODO:
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
    template: html`
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
                                <h5 class="mb-1">نام: {{ feed.title }}</h5>
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
                                  <div v-if="feed.direction == 1 || feed.direction == 3">صف دریافت: {{ feed.recvQueue }}</div>
                                  <div v-if="feed.direction == 2 || feed.direction == 3">صف ارسال: {{ feed.sendQueue }}</div>
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
                            <div class="d-flex mb-3 w-100 justify-content-between">
                                <h5>ایجاد ارتباط جدید:</h5>
                                <div>
                                    <div class="btn-group">
                                        <input type="radio" value="UDP" class="btn-check" name="new-feed-type" id="udp-radio" v-model="newFeed.type">
                                        <label class="btn btn-outline-primary" for="udp-radio">UDP</label>
                                        
                                        <input type="radio" value="Rabbit" class="btn-check" name="new-feed-type" id="rabbit-radio" v-model="newFeed.type">
                                        <label class="btn btn-outline-primary" for="rabbit-radio">RabbitMQ</label>
                                    </div>
                                    <div class="btn-group">
                                        <input type="radio" value="1" class="btn-check" name="new-feed-dir" id="incoming-radio" v-model="newFeed.direction">
                                        <label class="btn btn-outline-success" for="incoming-radio">ورودی</label>
                                        
                                        <input type="radio" value="2" class="btn-check" name="new-feed-dir" id="outgoing-radio" v-model="newFeed.direction">
                                        <label class="btn btn-outline-success" for="outgoing-radio">خروجی</label>

                                        <input type="radio" value="3" class="btn-check" name="new-feed-dir" id="both-radio" v-model="newFeed.direction">
                                        <label class="btn btn-outline-success" for="both-radio">دوطرفه</label>
                                    </div>
                                </div>
                                
                            </div>
                            <div class="form" v-if="newFeed.type === 'UDP'">
                                <div class="form-group row">
                                    <label
                                            for="newFeedTitle"
                                            class="col-sm-4 col-form-label font-weight-bold"
                                    ><strong>نام</strong></label
                                    >
                                    <div class="col-sm-8">
                                        <input
                                                type="text"
                                                class="form-control"
                                                id="newFeedTitle"
                                                v-model="newFeed.title"
                                        />
                                    </div>
                                </div>
                                <div class="form-group row">
                                    <label
                                    for="newFeedAddr"
                                    class="col-sm-4 col-form-label font-weight-bold"
                                    ><strong>آدرس</strong></label
                                    >
                                    <div class="col-sm-8">
                                    <input
                                        type="text"
                                        class="form-control"
                                        id="newFeedAddr"
                                        v-model="newFeed.addr"
                                    />
                                    </div>
                                </div>
                                <div class="form-group row">
                                    <label
                                    for="newFeedPort"
                                    class="col-sm-4 col-form-label font-weight-bold"
                                    ><strong>پورت</strong></label
                                    >
                                    <div class="col-sm-8">
                                    <input
                                        type="text"
                                        class="form-control"
                                        id="newFeedPort"
                                        v-model="newFeed.port"
                                    />
                                    </div>
                                </div>
                            </div>
                            <div class="form" v-if="newFeed.type === 'Rabbit'">
                                <div class="form-group row">
                                    <label
                                            for="newFeedTitle2"
                                            class="col-sm-4 col-form-label font-weight-bold"
                                    ><strong>نام</strong></label
                                    >
                                    <div class="col-sm-8">
                                        <input
                                                type="text"
                                                class="form-control"
                                                id="newFeedTitle2"
                                                v-model="newFeed.title"
                                        />
                                    </div>
                                </div>
                                <div class="form-group row">
                                    <label
                                    for="newFeedAddr2"
                                    class="col-sm-4 col-form-label font-weight-bold"
                                    ><strong>آدرس</strong></label
                                    >
                                    <div class="col-sm-8">
                                    <input
                                        type="text"
                                        class="form-control"
                                        id="newFeedAddr2"
                                        v-model="newFeed.addr"
                                    />
                                    </div>
                                </div>
                                <div class="form-group row" v-if="newFeed.direction == 1 || newFeed.direction == 3">
                                    <label
                                    for="newFeedRecvQueue"
                                    class="col-sm-4 col-form-label font-weight-bold"
                                    ><strong>صف دریافت</strong></label
                                    >
                                    <div class="col-sm-8">
                                    <input
                                        type="text"
                                        class="form-control"
                                        id="newFeedRecvQueue"
                                        v-model="newFeed.recvQueue"
                                    />
                                    </div>
                                </div>
                                <div class="form-group row" v-if="newFeed.direction == 2 || newFeed.direction == 3">
                                    <label
                                    for="newFeedSendQueue"
                                    class="col-sm-4 col-form-label font-weight-bold"
                                    ><strong>صف ارسال</strong></label
                                    >
                                    <div class="col-sm-8">
                                    <input
                                        type="text"
                                        class="form-control"
                                        id="newFeedSendQueue"
                                        v-model="newFeed.sendQueue"
                                    />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-primary" v-on:click="createFeed">ایجاد</button>
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">خروج</button>
                </div>
            </div>
        </div>
    </div>`
})