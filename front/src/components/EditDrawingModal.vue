<template>
  <div class="modal fade" id="drawing-edit" tabindex="-1" aria-labelledby="drawingEditLabel" aria-hidden="true">
    <div class="modal-dialog modal-lg">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title" id="drawingEditLabel">ویرایش ترسیم</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>
        <div class="modal-body">
          <div class="form-group row">
            <label for="input-drawing-name" class="col-sm-4 col-form-label font-weight-bold"><strong>نام</strong></label>
            <div class="col-sm-8">
              <input type="text" class="form-control" id="input-drawing-name" v-model="drawing.name"/>
            </div>
          </div>
          <div class="form-group row">
            <label for="input-drawing-type" class="col-sm-4 col-form-label font-weight-bold"><strong>نوع</strong></label>
            <div class="col-sm-8">
              <select class="form-control" id="input-drawing-type" v-model="drawing.type">
                <option value="polyline">خط</option>
                <option value="polygon">چندضلعی</option>
                <option value="rectangle">مستطیل</option>
                <option value="circle">دایره</option>
                <option value="marker">نشانگر</option>
              </select>
            </div>
          </div>
          <div class="form-group row">
            <label for="input-drawing-style" class="col-sm-4 col-form-label font-weight-bold"><strong>استایل</strong></label>
            <div class="col-sm-8">
              <select class="form-control" id="input-drawing-style" v-model="drawing.style">
                <option value="default">پیش‌فرض</option>
                <option value="dashed">خط‌چین</option>
                <option value="dotted">نقطه‌چین</option>
              </select>
            </div>
          </div>
          <div class="form-group row">
            <label for="input-drawing-color" class="col-sm-4 col-form-label font-weight-bold"><strong>رنگ</strong></label>
            <div class="col-sm-8">
              <input type="color" class="form-control" id="input-drawing-color" v-model="drawing.color"/>
            </div>
          </div>
          <div class="form-group row">
            <label for="input-drawing-opacity" class="col-sm-4 col-form-label font-weight-bold"><strong>شفافیت</strong></label>
            <div class="col-sm-8">
              <input type="range" class="form-range" id="input-drawing-opacity" v-model="drawing.opacity" min="0" max="1" step="0.1"/>
            </div>
          </div>
          <div class="form-group row">
            <label for="input-drawing-weight" class="col-sm-4 col-form-label font-weight-bold"><strong>ضخامت</strong></label>
            <div class="col-sm-8">
              <input type="number" class="form-control" id="input-drawing-weight" v-model="drawing.weight" min="1" max="10"/>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">انصراف</button>
          <button type="button" class="btn btn-primary" @click="saveDrawing">ذخیره</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'EditDrawingModal',
  props: {
    drawing: {
      type: Object,
      required: true
    }
  },
  methods: {
    saveDrawing() {
      this.$emit('save-drawing', this.drawing);
    }
  }
};
</script> 