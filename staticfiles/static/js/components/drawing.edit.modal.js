Vue.component('DrawingEditModal', {
    data: function () {
        return {
            sharedState: store.state,
        }
    },
    methods: {},
    computed: {
        is_geofence_active: function () {
            return this.unit.geofence;
        }
    },
    props: ["unit", "cancelEditForm", "saveEditForm"],
    template: `
        <div class="modal fade" id="drawing-edit" data-bs-backdrop="static" data-bs-keyboard="false" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="drawing-staticBackdropLabel1">ویرایش</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <form>
                            <div class="form-group row my-2 mx-2">
                                <div class="col-6">
                                    <label for="drawing-ed-callsign">شناسه</label>
                                    <input v-model="unit.callsign" id="drawing-ed-callsign" placeholder="callsign">
                                </div>
                                <div class="form-check col-2">
                                    <input type="checkbox" id="drawing-ed-send" v-model="unit.send"/>
                                    <label for="drawing-ed-send">ارسال</label>
                                </div>
                            </div>
                            <div class="form-group row my-2 mx-2">
                                <div class="col-12">
                                    <label class="my-1 mr-2 col-6" for="drawing-ed-aff">طرف</label>
                                    <select class="form-select my-1 mr-sm-2" id="drawing-ed-aff"
                                            v-model="unit.color">
                                        <option value="red">دشمن</option>
                                        <option value="blue">خودی</option>
                                        <option value="white">خنثی</option>
                                        <option value="gray">نامعلوم</option>
                                        <option value="orange">مشکوک</option>
                                    </select>
                                </div>
                            </div>
                            
                            <hr>
                            <div class="form-group row my-2 mr-sm-2">
                                <div class="form-check col-6">
                                    <input type="checkbox" id="drawing-ed-geofence" v-model="unit.geofence"/>
                                    <label for="drawing-ed-geofence">ژئوفنس</label>
                                </div>
<!--                                <div class="form-check col-2">-->
<!--                                    <input type="checkbox" id="drawing-ed-geofence-send" v-model="unit.geofence_send" :disabled="!unit.geofence"/>-->
<!--                                    <label for="drawing-ed-geofence-send">ارسال ژئوفنس</label>-->
<!--                                </div>-->
                                <div class="col-12">
                                    <label class="my-1 mr-2 col-6" for="drawing-ed-geofence-aff">هشدار هنگام حضور نیروهای:</label>
                                    <select class="form-select my-1 mr-sm-2" id="drawing-ed-geofence-aff"
                                            v-model="unit.geofence_aff">
                                        <option value="Hostile">دشمن</option>
                                        <option value="Friendly">خودی</option>
                                        <option value="All">همه</option>
                                    </select>
                                </div>
                            </div>
                            <!--                            <div class="form-group row my-2 mx-2">-->
                            <!--                                <div class="col-12">-->
                            <!--                                    <label for="drawing-ed-remarks">توضیحات</label>-->
                            <!--                                    <textarea id="drawing-ed-remarks" class="form-control"-->
                            <!--                                              id="drawing-exampleFormControlTextarea1"-->
                            <!--                                              rows="3"-->
                            <!--                                              v-model="unit.text"></textarea>-->
                            <!--                                </div>-->
                            <!--                            </div>-->
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal"
                                v-on:click="cancelEditForm">
                            لغو
                        </button>
                        <button type="button" class="btn btn-primary" data-bs-dismiss="modal" v-on:click="saveEditForm">
                            ذخیره
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `
})