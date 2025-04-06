<template>
  <div class="modal fade show d-block" tabindex="-1" aria-labelledby="messagesModalLabel" aria-modal="true" role="dialog">
    <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable modal-lg">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title" id="messagesModalLabel">
            چت با {{ partnerCallsign }}
            <span v-if="partnerStatus" class="badge" :class="partnerStatus === 'Online' ? 'text-bg-success' : 'text-bg-secondary'">
              {{ partnerStatus }}
            </span>
          </h5>
          <button type="button" class="btn-close" @click="closeModal" aria-label="Close"></button>
        </div>
        <div class="modal-body" ref="messageBodyRef">
          <div v-if="conversationMessages.length === 0" class="text-center text-muted">
            هنوز پیامی رد و بدل نشده است.
          </div>
          <div v-else v-for="m in conversationMessages" :key="m.message_id" class="mb-2">
             <!-- Basic Message Display -->
            <div class="alert" :class="isMyMessage(m) ? 'alert-success text-end' : 'alert-secondary text-start'">
                <small class="text-muted">{{ formatTimestamp(m.time) }} - {{ m.from_callsign || m.from_uid }}</small><br/>
                {{ m.text }}
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <form @submit.prevent="sendMessageHandler" class="d-flex flex-grow-1">
            <input type="text" class="form-control me-2" v-model="newMessageText" placeholder="پیام خود را بنویسید..."/>
            <button type="submit" class="btn btn-primary" :disabled="!newMessageText.trim()">ارسال</button>
          </form>
          <button type="button" class="btn btn-secondary" @click="closeModal">خروج</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, inject, onMounted, nextTick } from 'vue';
import { formatDateTime } from '../utils'; // Assuming formatDateTime is in utils

const props = defineProps({
  unit: { // This is the chat partner unit
    type: Object,
    default: null
  }
});

const emit = defineEmits(['close']);

// Inject data and functions from App.vue
const messagesState = inject('messagesState'); // Assuming App.vue provides this
const sendMessageFunc = inject('sendMessageFunc'); // Assuming App.vue provides this
const currentUserConfig = inject('currentUserConfig'); // Assuming App.vue provides config
const getStatusFunc = inject('getStatus'); // <-- Inject getStatus

const newMessageText = ref('');
const messageBodyRef = ref(null); // Ref for scrolling

const partnerUid = computed(() => props.unit?.uid);
const partnerCallsign = computed(() => props.unit?.callsign || partnerUid.value || 'Unknown');
// Use injected function for status
const partnerStatus = computed(() => {
    return partnerUid.value ? getStatusFunc(partnerUid.value) : 'Offline';
});

// Get the specific conversation messages for the current partner
const conversation = computed(() => {
    if (!partnerUid.value || !messagesState?.value) return null;
    return messagesState.value[partnerUid.value];
});

const conversationMessages = computed(() => {
    return conversation.value?.messages || [];
});

function isMyMessage(message) {
    return message.from_uid === currentUserConfig?.value?.uid;
}

function formatTimestamp(timeStr) {
    try {
        return formatDateTime(timeStr);
    } catch (e) {
        return timeStr; // Fallback
    }
}

async function sendMessageHandler() {
  if (!newMessageText.value.trim() || !partnerUid.value || !sendMessageFunc) return;

  const textToSend = newMessageText.value;
  newMessageText.value = ''; // Clear input immediately

  const success = await sendMessageFunc(partnerUid.value, textToSend);
  if (!success) {
    // Handle send failure - maybe restore text?
    newMessageText.value = textToSend; 
    alert("خطا در ارسال پیام"); // Simple feedback
  }
  // Wait for message to appear via WebSocket echo
}

function closeModal() {
  emit('close');
}

// Scroll to bottom when messages change or modal opens
function scrollToBottom() {
    nextTick(() => {
        const body = messageBodyRef.value;
        if (body) {
            body.scrollTop = body.scrollHeight;
        }
    });
}

// Mark messages as seen when modal opens or messages update
function markAsSeen() {
    if (conversation.value && conversation.value.unseenCount > 0) {
        console.log(`Marking ${conversation.value.unseenCount} messages as seen for ${partnerUid.value}`);
        conversation.value.unseenCount = 0;
        // TODO: Notify App.vue or recalculate total unseen count if necessary
    }
}

watch(conversationMessages, () => {
    scrollToBottom();
    markAsSeen(); // Mark as seen when new messages arrive while modal is open
}, { deep: true });

onMounted(() => {
    scrollToBottom();
    markAsSeen(); // Mark as seen immediately when modal is mounted
});

</script>

<style scoped>
.modal {
  background-color: rgba(0, 0, 0, 0.5);
}
.modal-body {
    max-height: 60vh; /* Limit height for scrolling */
    overflow-y: auto;
}
.alert {
    padding: 0.5rem 1rem;
}
</style> 