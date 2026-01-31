<template>
  <div class="form-group row mb-3">
    <label class="col-sm-4 col-form-label">حالت ارسال</label>
    <div class="col-sm-8">
      <div class="form-check">
        <input
          class="form-check-input"
          type="radio"
          name="send_mode"
          id="send_modeNone"
          value="none"
          v-model="localValue.send_mode"
        />
        <label class="form-check-label" for="send_modeNone">
          عدم ارسال
        </label>
      </div>
      <div class="form-check">
        <input
          class="form-check-input"
          type="radio"
          name="send_mode"
          id="send_modeBroadcast"
          value="broadcast"
          v-model="localValue.send_mode"
        />
        <label class="form-check-label" for="send_modeBroadcast">
          پخش عمومی
        </label>
      </div>
      <div class="form-check">
        <input
          class="form-check-input"
          type="radio"
          name="send_mode"
          id="send_modeSubnet"
          value="subnet"
          v-model="localValue.send_mode"
        />
        <label class="form-check-label" for="send_modeSubnet">
          ارسال به زیرشبکه
        </label>
      </div>
      <div class="form-check">
        <input
          class="form-check-input"
          type="radio"
          name="send_mode"
          id="send_modeDirect"
          value="direct"
          v-model="localValue.send_mode"
        />
        <label class="form-check-label" for="send_modeDirect">
          ارسال مستقیم
        </label>
      </div>
    </div>
  </div>

  <!-- Subnet Selection (shown when send_mode === 'subnet') -->
  <div
    class="form-group row mb-3"
    v-if="localValue.send_mode === 'subnet'"
  >
    <label for="edit-subnet" class="col-sm-4 col-form-label"
      >زیرشبکه</label
    >
    <div class="col-sm-8">
      <select
        class="form-select"
        id="edit-subnet"
        v-model="localValue.selected_subnet"
      >
        <option value="" disabled>زیرشبکه را انتخاب کنید</option>
        <option
          v-for="subnet in availableSubnets"
          :key="subnet"
          :value="subnet"
        >
          {{ subnet }}
        </option>
      </select>
    </div>
  </div>

  <!-- Direct Destination Selection (shown when send_mode === 'direct') -->
  <div v-if="localValue.send_mode === 'direct'">
    <div class="form-group row mb-3">
      <label for="edit-urn" class="col-sm-4 col-form-label"
        >URN (مخاطب)</label
      >
      <div class="col-sm-8">
        <select
          class="form-select"
          id="edit-urn"
          v-model="localValue.selected_urn"
        >
          <option value="" disabled>URN را انتخاب کنید</option>
          <option
            v-for="contact in availableContacts"
            :key="contact.urn"
            :value="contact.urn"
          >
            {{ contact.urn }} ({{ contact.callsign }})
          </option>
        </select>
      </div>
    </div>
    <div class="form-group row mb-3">
      <label for="edit-ip" class="col-sm-4 col-form-label">آدرس IP</label>
      <div class="col-sm-8">
        <select
          class="form-select"
          id="edit-ip"
          v-model="localValue.selected_ip"
          :disabled="!localValue.selected_urn"
        >
          <option value="" disabled>IP را انتخاب کنید</option>
          <option v-for="ip in availableIps" :key="ip" :value="ip">
            {{ ip }}
          </option>
        </select>
      </div>
    </div>
  </div>
</template>

<script>
import { computed, watch } from "vue";

export default {
  name: "SendModeSelector",
  props: {
    modelValue: {
      type: Object,
      required: true,
    },
    availableSubnets: {
      type: Array,
      default: () => [],
    },
    availableContacts: {
      type: Array,
      default: () => [],
    },
  },
  emits: ["update:modelValue"],
  setup(props, { emit }) {
    const localValue = computed({
      get: () => props.modelValue,
      set: (value) => emit("update:modelValue", value),
    });

    const availableIps = computed(() => {
      if (!localValue.value.selected_urn || !props.availableContacts) {
        return [];
      }
      const selectedContact = props.availableContacts.find(
        (contact) => contact.urn == localValue.value.selected_urn
      );
      if (selectedContact && selectedContact.ip_address) {
        return selectedContact.ip_address.split(",");
      }
      return [];
    });

    // Reset IP when URN changes
    watch(
      () => localValue.value.selected_urn,
      () => {
        localValue.value.selected_ip = "";
      }
    );

    return {
      localValue,
      availableIps,
    };
  },
};
</script>
