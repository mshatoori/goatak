<template>
  <nav class="navbar navbar-expand-md navbar-dark fixed-top bg-dark">
    <div class="container-fluid">
      <a class="navbar-brand" href="#">سامانه آگاهی وضعیتی تاکتیکی</a>
      <span class="badge rounded-pill bg-primary"
            :class="{ 'bg-success': connectionStatus, 'bg-secondary': !connectionStatus }">.</span>
      <span class="flex-grow-1"></span>
      <div class="NOT-collapse NOT-navbar-collapse" id="navbarCollapse">
        <ul class="navbar-nav mb-2 mb-md-0">
          <li class="nav-item">
            <a class="nav-link" href="#" id="navbarAlarmsMenuLink" role="button"
               @click="$emit('open-alarms')"> <!-- Emit event -->
              <i :class="{'alarm-active': alarmsCount > 0 }"
                 class="bi bi-exclamation-diamond-fill"></i>
              {{ alarmsCount }}
            </a>
          </li>
          <li class="nav-item">
            <a class="nav-link" href="#" id="navbarSensorsMenuLink" role="button"
               @click="$emit('open-sensors')"> <!-- Emit event -->
              سنسورها<span class="badge rounded-pill bg-success">{{ sensorsCount }}</span>
            </a>
          </li>
          <li class="nav-item">
            <a class="nav-link" href="#" id="navbarFeedsMenuLink" role="button" @click="$emit('open-feeds')"> <!-- Emit event -->
              ارتباطات <span class="badge rounded-pill bg-success">{{ feedsCount }}</span>
            </a>
          </li>
          <li class="nav-item dropdown">
            <a class="nav-link dropdown-toggle" href="#" id="navbarDarkDropdownMenuLink" role="button"
               data-bs-toggle="dropdown" aria-expanded="false">
              مخاطبین <span class="badge rounded-pill bg-success">{{ contactsCount }}</span>
            </a>
            <ul class="dropdown-menu dropdown-menu-dark" aria-labelledby="navbarDarkDropdownMenuLink">
               <!-- Use contacts prop -->
              <li v-if="!contacts || contacts.length === 0"><span class="dropdown-item text-muted">هیچ مخاطبی یافت نشد</span></li>
              <li v-for="u in contacts" :key="u.uid">
                <a class="dropdown-item" href="#" @click="$emit('set-unit', u.uid, true)"> <!-- Emit event -->
                  <span v-if="u.lat === 0 && u.lon === 0">* </span>{{ u.callsign }}<span
                      v-if="u.status"> ({{ u.status }})</span>
                </a>
              </li>
            </ul>
          </li>
          <li class="nav-item dropdown">
            <a class="nav-link dropdown-toggle" href="#" id="navbarDarkDropdownMenuLink2" role="button"
               data-bs-toggle="dropdown" aria-expanded="false">
              نیروها <span class="badge rounded-pill bg-success">{{ unitsCount }}</span>
            </a>
            <ul class="dropdown-menu dropdown-menu-dark" aria-labelledby="navbarDarkDropdownMenuLink2">
               <!-- Use units prop -->
              <li v-if="!units || units.length === 0"><span class="dropdown-item text-muted">هیچ نیرویی یافت نشد</span></li>
              <li v-for="u in units" :key="u.uid">
                <a class="dropdown-item" href="#" @click="$emit('set-unit', u.uid, true)"> <!-- Emit event -->
                  {{ u.callsign || u.uid }} <!-- Simplified name display -->
                </a>
              </li>
            </ul>
          </li>
          <li class="nav-item dropdown">
            <a class="nav-link dropdown-toggle" href="#" id="navbarDarkDropdownMenuLink3" role="button"
               data-bs-toggle="dropdown" aria-expanded="false">
              نقاط <span class="badge rounded-pill bg-success">{{ pointsCount }}</span>
            </a>
            <ul class="dropdown-menu dropdown-menu-dark" aria-labelledby="navbarDarkDropdownMenuLink3">
               <!-- Use points prop -->
              <li v-if="!points || points.length === 0"><span class="dropdown-item text-muted">هیچ نقطه‌ای یافت نشد</span></li>
              <li v-for="u in points" :key="u.uid">
                <a class="dropdown-item" href="#" @click="$emit('set-unit', u.uid, true)"> <!-- Emit event -->
                  {{ u.callsign || u.uid }} <!-- Simplified name display -->
                </a>
              </li>
            </ul>
          </li>
          <li class="nav-item dropdown">
            <a class="nav-link dropdown-toggle" href="#" id="navbarDarkDropdownMenuLink4" role="button"
               data-bs-toggle="dropdown" aria-expanded="false">
              پیام‌ها 
               <span v-if="totalUnseenMessages > 0" class="badge rounded-pill bg-danger">{{ totalUnseenMessages }}</span>
               <span v-else class="badge rounded-pill bg-secondary">{{ chatsCount }}</span> <!-- Use chatsCount prop -->
            </a>
            <ul class="dropdown-menu dropdown-menu-dark" aria-labelledby="navbarDarkDropdownMenuLink4">
               <!-- Use chats prop -->
               <li v-if="!chats || chats.length === 0">
                   <span class="dropdown-item text-muted">هیچ چتی فعال نیست</span>
               </li>
               <li v-for="chat in chats" :key="chat.uid">
                 <a class="dropdown-item d-flex justify-content-between align-items-center" href="#" @click="$emit('open-messages', chat.partnerUnit)"> <!-- Emit event -->
                   {{ chat.partnerCallsign }}
                   <span v-if="chat.unseenCount > 0" class="badge rounded-pill bg-danger ms-2">{{ chat.unseenCount }}</span>
                 </a>
               </li>
            </ul>
          </li>
        </ul>
      </div>
    </div>
  </nav>
</template>

<script setup>
import { defineProps, defineEmits } from 'vue';

// Define Props required by the template
const props = defineProps({
  connectionStatus: {
    type: Boolean,
    required: true,
  },
  alarmsCount: {
    type: Number,
    required: true,
    default: 0,
  },
  sensorsCount: {
    type: Number,
    required: true,
    default: 0,
  },
  feedsCount: {
    type: Number,
    required: true,
    default: 0,
  },
  contactsCount: {
    type: Number,
    required: true,
    default: 0,
  },
  contacts: {
    type: Array,
    required: true,
    default: () => [],
  },
  unitsCount: {
    type: Number,
    required: true,
    default: 0,
  },
  units: {
    type: Array,
    required: true,
    default: () => [],
  },
  pointsCount: {
    type: Number,
    required: true,
    default: 0,
  },
  points: {
    type: Array,
    required: true,
    default: () => [],
  },
  totalUnseenMessages: {
    type: Number,
    required: true,
    default: 0,
  },
  chatsCount: {
    type: Number,
    required: true,
    default: 0,
  },
  chats: {
    type: Array,
    required: true,
    default: () => [],
  },
});

// Define Emits for actions triggered in the template
const emit = defineEmits([
    'open-alarms',
    'open-sensors',
    'open-feeds',
    'set-unit', // Emits (uid, panTo)
    'open-messages' // Emits (partnerUnit object)
]);

</script>

<style scoped>
/* Add any navbar specific styles here if needed */
.alarm-active {
  color: #ffc107; /* Example active color */
}
.dropdown-menu {
    max-height: 300px; /* Example max height for dropdowns */
    overflow-y: auto;
}
</style> 