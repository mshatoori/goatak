<template>
  <div class="modal fade show d-block" tabindex="-1" aria-labelledby="editUnitModalLabel" aria-modal="true" role="dialog">
    <div class="modal-dialog modal-lg">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title" id="editUnitModalLabel">ویرایش واحد/نقطه</h5>
          <button type="button" class="btn-close" @click="cancelEdit" aria-label="Close"></button>
        </div>
        <div class="modal-body">
          <form v-if="editableUnit">
            <!-- Callsign and Category -->
            <div class="form-group row my-2 mx-2">
              <div class="col-6">
                <label for="ed-callsign">شناسه تماس</label>
                <input v-model="editableUnit.callsign" id="ed-callsign" class="form-control" placeholder="callsign">
              </div>
              <div class="btn-group col-4" role="group" aria-label="Type">
                <input type="radio" class="btn-check" name="categoryRadio" value="point"
                       v-model="editableUnit.category" id="ed-point" :disabled="!isNewUnit">
                <label class="btn btn-outline-primary btn-sm" for="ed-point">نقطه</label>

                <input type="radio" class="btn-check" name="categoryRadio" value="unit"
                       v-model="editableUnit.category" id="ed-unit" :disabled="!isNewUnit">
                <label class="btn btn-outline-primary btn-sm" for="ed-unit">نیرو</label>
              </div>
              <div class="form-check col-2">
                <input type="checkbox" id="ed-send" v-model="editableUnit.send" class="form-check-input"/>
                <label for="ed-send" class="form-check-label">ارسال</label>
              </div>
            </div>

            <!-- Point Specific Type -->
            <div class="form-group row my-2 mx-2" v-if="editableUnit.category === 'point'">
              <div class="col-12">
                <label class="my-1 mr-2 col-6" for="ed-point-type">نوع نقطه</label>
                <select class="form-select my-1 mr-sm-2" id="ed-point-type" v-model="editableUnit.type">
                  <option value="b-m-p-s-m">Spot</option>
                  <option value="b-m-p-w-GOTO">WayPt</option>
                  <option value="b-m-p-s-p-op">OP</option>
                  <option value="b-m-p-a">Aim</option>
                  <!-- Add other point types as needed -->
                </select>
              </div>
            </div>

            <!-- Unit Specific Fields -->
            <div v-if="editableUnit.category === 'unit'">
                <!-- Affiliation -->
                <div class="form-group row my-2 mx-2">
                    <div class="col-12">
                        <label class="my-1 mr-2 col-6" for="ed-aff">طرف</label>
                        <select class="form-select my-1 mr-sm-2" id="ed-aff" v-model="editableUnit.affiliation">
                            <option value="h">دشمن</option>
                            <option value="f">خودی</option>
                            <option value="n">خنثی</option>
                            <option value="u">نامعلوم</option>
                            <option value="s">مشکوک</option>
                        </select>
                    </div>
                </div>
                <!-- Hierarchical Type Selection using the new component -->
                <div class="form-group row my-2 mx-2">
                    <div class="col-12">
                         <label class="my-1 mr-2">نوع</label>
                         <HierarchySelector v-model="editableUnit.sidc" />
                    </div>
                </div>
            </div>

            <!-- Remarks -->
            <div class="form-group row my-2 mx-2">
              <div class="col-12">
                <label for="ed-remarks">توضیحات</label>
                <textarea id="ed-remarks" class="form-control" rows="3" v-model="editableUnit.text"></textarea>
              </div>
            </div>

             <!-- Web Sensor Data (Optional) -->
            <div class="form-group row my-2 mx-2">
                <div class="col-12">
                    <label for="ed-websensor">اطلاعات اضافه</label>
                    <textarea id="ed-websensor" class="form-control" rows="3" v-model="editableUnit.web_sensor"></textarea>
                </div>
            </div>

          </form>
          <div v-else>
              <p>Loading unit data...</p>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" @click="cancelEdit">لغو</button>
          <button type="button" class="btn btn-primary" @click="saveEdit">ذخیره</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';
import HierarchySelector from './HierarchySelector.vue'; // Import the new component

const props = defineProps({
  unit: {
    type: Object,
    required: true
  }
});

const emit = defineEmits(['close', 'save']);

const editableUnit = ref(null);
const isNewUnit = ref(false);

// Watcher to update editableUnit when the prop changes
watch(() => props.unit, (newUnit) => {
    if (newUnit) {
        editableUnit.value = JSON.parse(JSON.stringify(newUnit));
        isNewUnit.value = !newUnit.callsign; // Or based on a unique ID if available
    } else {
        editableUnit.value = null;
    }
}, { immediate: true, deep: true });

function cancelEdit() {
  emit('close');
}

function saveEdit() {
  if (editableUnit.value) {
    // Add any final validation if needed
    console.log("Saving unit:", JSON.parse(JSON.stringify(editableUnit.value)));
    emit('save', editableUnit.value);
  }
}

</script>

<style scoped>
.modal {
  background-color: rgba(0, 0, 0, 0.5); /* Dim background */
}
/* Add any specific styles for the modal here */
</style> 