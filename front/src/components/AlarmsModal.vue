<template>
  <div class="modal fade" id="alarms" tabindex="-1" aria-labelledby="alarmsLabel" aria-hidden="true">
    <div class="modal-dialog modal-lg">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title" id="alarmsLabel">هشدارها</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>
        <div class="modal-body">
          <div class="table-responsive">
            <table class="table">
              <thead>
                <tr>
                  <th>زمان</th>
                  <th>نوع</th>
                  <th>واحد</th>
                  <th>پیام</th>
                  <th>عملیات</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="alarm in alarms" :key="alarm.id">
                  <td>{{ formatDate(alarm.time) }}</td>
                  <td>
                    <span :class="['badge', getAlarmTypeClass(alarm.type)]">
                      {{ alarm.type }}
                    </span>
                  </td>
                  <td>{{ alarm.unit }}</td>
                  <td>{{ alarm.message }}</td>
                  <td>
                    <button type="button" class="btn btn-sm btn-primary" @click="viewAlarm(alarm)">
                      <i class="bi bi-eye"></i>
                    </button>
                    <button type="button" class="btn btn-sm btn-danger" @click="deleteAlarm(alarm)">
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
          <button type="button" class="btn btn-danger" @click="clearAlarms">پاک کردن همه</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'AlarmsModal',
  data() {
    return {
      alarms: []
    };
  },
  methods: {
    formatDate(date) {
      const d = new Date(date);
      return ("0" + d.getDate()).slice(-2) + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" +
        d.getFullYear() + " " + ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2);
    },
    getAlarmTypeClass(type) {
      const classes = {
        'error': 'bg-danger',
        'warning': 'bg-warning',
        'info': 'bg-info',
        'success': 'bg-success'
      };
      return classes[type] || 'bg-secondary';
    },
    viewAlarm(alarm) {
      this.$emit('view-alarm', alarm);
    },
    deleteAlarm(alarm) {
      if (confirm('آیا از حذف این هشدار اطمینان دارید؟')) {
        this.$emit('delete-alarm', alarm);
      }
    },
    clearAlarms() {
      if (confirm('آیا از پاک کردن همه هشدارها اطمینان دارید؟')) {
        this.$emit('clear-alarms');
      }
    }
  }
};
</script> 