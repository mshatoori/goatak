<template>
  <div class="modal fade show d-block" id="feeds" tabindex="-1" aria-labelledby="feedsLabel" aria-hidden="true">
    <div class="modal-dialog modal-lg">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title" id="feedsLabel">ارتباطات</h5>
          <button type="button" class="btn-close" @click="closeModal" aria-label="Close"></button>
        </div>
        <div class="modal-body">
          <div v-if="isLoading" class="text-center p-3">
            <div class="spinner-border text-primary" role="status">
              <span class="visually-hidden">Loading...</span>
            </div>
            <p class="mt-2">در حال بارگذاری ارتباطات...</p>
          </div>
          <div v-else-if="error" class="alert alert-danger">
            <i class="bi bi-exclamation-triangle-fill me-2"></i>
            خطا در بارگذاری ارتباطات: {{ error }}
          </div>
          <div v-else>
            <!-- Existing feeds list -->
            <div class="mb-4">
              <div class="d-flex justify-content-between align-items-center mb-3">
                <h6 class="m-0">لیست ارتباطات</h6>
                <span class="badge bg-secondary rounded-pill">{{ feeds.length }}</span>
              </div>
              
              <!-- Empty state -->
              <div v-if="feeds.length === 0" class="text-center py-4 text-muted border rounded">
                <i class="bi bi-info-circle me-2"></i>هیچ ارتباطی یافت نشد
              </div>
              
              <!-- List group instead of table -->
              <div v-else class="list-group">
                <div v-for="feed in feeds" :key="feed.uid" class="list-group-item list-group-item-action">
                  <div class="d-flex w-100 justify-content-between align-items-center mb-2">
                    <h6 class="mb-0">{{ feed.title }}</h6>
                    <button type="button" class="btn btn-sm btn-danger"
                      @click="deleteFeedHandler(feed)"
                      :disabled="isDeleting === feed.uid">
                      <span v-if="isDeleting === feed.uid" class="spinner-border spinner-border-sm" role="status"
                        aria-hidden="true"></span>
                      <i v-else class="bi bi-trash3-fill"></i>
                    </button>
                  </div>
                  
                  <div class="row">
                    <div class="col-md-6">
                      <p class="mb-1">
                        <span class="badge bg-light text-dark border me-2">{{ feed.type }}</span>
                        <span class="text-muted">آدرس:</span> {{ feed.addr }}
                      </p>
                    </div>
                    <div class="col-md-6">
                      <p class="mb-1" v-if="feed.type === 'UDP'">
                        <span class="text-muted">پورت:</span> {{ feed.port }}
                      </p>
                      <div v-else-if="feed.type === 'Rabbit'">
                        <p class="mb-1" v-if="feed.recvQueue">
                          <span class="text-muted">صف دریافت:</span>
                          <small class="text-success">
                            <i class="bi bi-arrow-down-right"></i> {{ feed.recvQueue }}
                          </small>
                        </p>
                        <p class="mb-1" v-if="feed.sendQueue">
                          <span class="text-muted">صف ارسال:</span>
                          <small class="text-primary">
                            <i class="bi bi-arrow-up-right"></i> {{ feed.sendQueue }}
                          </small>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Add new feed form -->
            <hr>
            <h6 class="mb-3">افزودن ارتباط جدید</h6>
            <div class="row g-3">
              <div class="col-md-6">
                <label for="feedTitle" class="form-label">نام</label>
                <input type="text" class="form-control" id="feedTitle" v-model="newFeed.title"
                  placeholder="نام ارتباط">
              </div>
              <div class="col-md-6">
                  <label class="form-label d-block">نوع</label>
                  <div class="btn-group w-100" role="group" aria-label="Feed type">
                      <input type="radio" class="btn-check" name="feedTypeRadio" id="feedTypeUDP" value="UDP" v-model="newFeed.type" autocomplete="off">
                      <label class="btn btn-outline-primary w-50" for="feedTypeUDP">UDP</label>

                      <input type="radio" class="btn-check" name="feedTypeRadio" id="feedTypeRabbit" value="Rabbit" v-model="newFeed.type" autocomplete="off">
                      <label class="btn btn-outline-primary w-50" for="feedTypeRabbit">RabbitMQ</label>
                  </div>
              </div>
              <div class="col-md-6">
                  <label class="form-label d-block">جهت</label>
                  <div class="btn-group w-100" role="group" aria-label="Feed direction">
                      <input type="radio" class="btn-check" name="feedDirectionRadio" id="feedDirIn" value="1" v-model="newFeed.direction" autocomplete="off">
                      <label class="btn btn-outline-secondary w-33" for="feedDirIn">ورودی</label>

                      <input type="radio" class="btn-check" name="feedDirectionRadio" id="feedDirOut" value="2" v-model="newFeed.direction" autocomplete="off">
                      <label class="btn btn-outline-secondary w-34" for="feedDirOut">خروجی</label>

                      <input type="radio" class="btn-check" name="feedDirectionRadio" id="feedDirBoth" value="3" v-model="newFeed.direction" autocomplete="off">
                      <label class="btn btn-outline-secondary w-33" for="feedDirBoth">دوطرفه</label>
                  </div>
              </div>
              <div class="col-md-6">
                <label for="feedAddr" class="form-label">آدرس / هاست</label>
                <input type="text" class="form-control" id="feedAddr" v-model="newFeed.addr"
                  placeholder="آدرس یا هاست">
              </div>

              <div v-if="newFeed.type === 'UDP'" class="col-md-6">
                <label for="feedPort" class="form-label">پورت</label>
                <input type="number" min="1" max="65535" class="form-control" id="feedPort"
                  v-model.number="newFeed.port" placeholder="پورت">
              </div>

              <template v-if="newFeed.type === 'Rabbit'">
                <div v-if="newFeed.direction === '1' || newFeed.direction === '3'" class="col-md-6">
                  <label for="recvQueue" class="form-label">صف دریافت</label>
                  <input type="text" class="form-control" id="recvQueue" v-model="newFeed.recvQueue"
                    placeholder="نام صف دریافت">
                </div>
                <div v-if="newFeed.direction === '2' || newFeed.direction === '3'" class="col-md-6">
                  <label for="sendQueue" class="form-label">صف ارسال</label>
                  <input type="text" class="form-control" id="sendQueue" v-model="newFeed.sendQueue"
                    placeholder="نام صف ارسال">
                </div>
              </template>

              <div class="col-12 mt-3">
                <button type="button" class="btn btn-primary" @click="createFeedHandler" :disabled="isCreating">
                  <span v-if="isCreating" class="spinner-border spinner-border-sm me-1" role="status"
                    aria-hidden="true"></span>
                  افزودن ارتباط
                </button>
              </div>
            </div>

            <div v-if="creationError" class="alert alert-danger mt-3">
              <i class="bi bi-exclamation-triangle-fill me-2"></i>
              خطا در ایجاد ارتباط: {{ creationError }}
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" @click="closeModal">بستن</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { fetchFeeds, createFeed, deleteFeed } from '../apiService';

const emit = defineEmits(['close', 'feeds-updated']);

const feeds = ref([]);
const newFeed = ref({
  type: "UDP",
  title: "",
  direction: "1",
  addr: "",
  port: null,
  recvQueue: "",
  sendQueue: ""
});

const isLoading = ref(true);
const isCreating = ref(false);
const isDeleting = ref(null);
const error = ref(null);
const creationError = ref(null);

async function fetchFeedsData() {
  isLoading.value = true;
  error.value = null;
  try {
    const data = await fetchFeeds();
    feeds.value = data || [];
  } catch (err) {
    console.error("Error fetching feeds:", err);
    error.value = err.message || 'Unknown error';
    feeds.value = [];
  } finally {
    isLoading.value = false;
  }
}

async function createFeedHandler() {
  console.log(newFeed.value);
  console.log(newFeed.value.type);
  if (!newFeed.value.type || !newFeed.value.title || !newFeed.value.addr) {
    creationError.value = "لطفا تمام فیلدهای لازم را پر کنید.";
    return;
  }
  if (newFeed.value.type === "UDP" && !newFeed.value.port) {
    creationError.value = "برای نوع UDP، پورت الزامی است.";
    return;
  }
  if (newFeed.value.type === "Rabbit" &&
    (
      (
        (newFeed.value.direction === "1" || newFeed.value.direction === "3") && !newFeed.value.recvQueue
      )
      ||
      (
        (newFeed.value.direction === "2" || newFeed.value.direction === "3") && !newFeed.value.sendQueue
      )
    )
  ) {
    creationError.value = "برای نوع Rabbit، صف‌های مربوطه الزامی هستند.";
    return;
  }

  isCreating.value = true;
  creationError.value = null;
  try {
    await createFeed(newFeed.value);
    // Reset form
    newFeed.value = {
      type: "UDP",
      title: "",
      direction: "1",
      addr: "",
      port: null,
      recvQueue: "",
      sendQueue: ""
    };
    emit('feeds-updated');
    await fetchFeedsData();
  } catch (err) {
    console.error("Error creating feed:", err);
    creationError.value = err.message || 'Unknown error';
  } finally {
    isCreating.value = false;
  }
}

async function deleteFeedHandler(feed) {
  if (!confirm('آیا از حذف این ارتباط اطمینان دارید؟')) {
    return;
  }
  isDeleting.value = feed.uid;
  try {
    await deleteFeed(feed.uid);
    emit('feeds-updated');
    await fetchFeedsData();
  } catch (err) {
    console.error("Error deleting feed:", err);
    alert(`خطا در حذف ارتباط: ${err.message}`);
  } finally {
    isDeleting.value = null;
  }
}

function closeModal() {
  emit('close');
}

// Fetch data when the component is mounted
onMounted(() => {
  fetchFeedsData();
});
</script>

<style scoped>
.modal {
  background-color: rgba(0, 0, 0, 0.5);
}
</style>