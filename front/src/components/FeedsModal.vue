<template>
  <div class="modal fade" id="feeds" tabindex="-1" aria-labelledby="feedsLabel" aria-hidden="true">
    <div class="modal-dialog modal-lg">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title" id="feedsLabel">خوراک‌ها</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>
        <div class="modal-body">
          <div class="table-responsive">
            <table class="table">
              <thead>
                <tr>
                  <th>نام</th>
                  <th>نوع</th>
                  <th>وضعیت</th>
                  <th>عملیات</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="feed in feeds" :key="feed.id">
                  <td>{{ feed.name }}</td>
                  <td>{{ feed.type }}</td>
                  <td>
                    <span :class="['badge', feed.active ? 'bg-success' : 'bg-danger']">
                      {{ feed.active ? 'فعال' : 'غیرفعال' }}
                    </span>
                  </td>
                  <td>
                    <button type="button" class="btn btn-sm btn-primary" @click="editFeed(feed)">
                      <i class="bi bi-pencil-square"></i>
                    </button>
                    <button type="button" class="btn btn-sm btn-danger" @click="deleteFeed(feed)">
                      <i class="bi bi-trash3-fill"></i>
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">بستن</button>
          <button type="button" class="btn btn-primary" @click="addFeed">افزودن خوراک</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'FeedsModal',
  data() {
    return {
      feeds: []
    };
  },
  methods: {
    editFeed(feed) {
      this.$emit('edit-feed', feed);
    },
    deleteFeed(feed) {
      if (confirm('آیا از حذف این خوراک اطمینان دارید؟')) {
        this.$emit('delete-feed', feed);
      }
    },
    addFeed() {
      this.$emit('add-feed');
    }
  }
};
</script> 