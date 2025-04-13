<template>
  <nav class="navbar navbar-expand-sm navbar-dark fixed-top bg-dark">
    <div class="container-fluid">
      <a class="navbar-brand" href="#">
        <span class="d-none d-sm-inline">سامانه آگاهی وضعیتی تاکتیکی</span>
      </a>
      <span class="badge rounded-pill connection-badge"
        :class="{ 'bg-success': connectionStatus, 'bg-secondary': !connectionStatus }">.</span>

      <!-- Hamburger toggle button for mobile -->
      <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarCollapse"
        aria-controls="navbarCollapse" aria-expanded="false" aria-label="Toggle navigation">
        <span class="navbar-toggler-icon"></span>
      </button>

      <!-- Collapsible navbar content -->
      <div class="collapse navbar-collapse" id="navbarCollapse">
        <ul class="navbar-nav">
          <li class="nav-item nav-item-mobile">
            <a class="nav-link d-flex align-items-center" href="#" id="navbarAlarmsMenuLink" role="button"
              @click="$emit('open-alarms')">
              <i :class="{ 'alarm-active': alarmsCount > 0 }" class="bi bi-exclamation-diamond-fill me-2"></i>
              <span class="badge rounded-pill bg-danger ms-2" v-if="alarmsCount > 0">{{ alarmsCount }}</span>
            </a>
          </li>
          <li class="nav-item nav-item-mobile">
            <a class="nav-link d-flex align-items-center" href="#" id="navbarSensorsMenuLink" role="button"
              @click="$emit('open-sensors')">
              <div class="d-flex align-items-center nav-item-content">
                <i class="bi bi-broadcast-pin me-2"></i>
                <span class="menu-label">سنسورها</span>
              </div>
              <span class="badge rounded-circle bg-success notif-badge">{{ sensorsCount
              }}</span>
            </a>
          </li>
          <li class="nav-item nav-item-mobile">
            <a class="nav-link d-flex align-items-center" href="#" id="navbarFeedsMenuLink" role="button"
              @click="$emit('open-feeds')">
              <div class="d-flex align-items-center nav-item-content">
                <i class="bi bi-wifi me-2"></i>
                <span class="menu-label">ارتباطات</span>
              </div>
              <span class="badge rounded-circle bg-success notif-badge">{{ feedsCount
              }}</span>
            </a>
          </li>
          <li class="nav-item dropdown nav-item-mobile">
            <a class="nav-link dropdown-toggle d-flex align-items-center" href="#" id="navbarDarkDropdownMenuLink"
              role="button" data-bs-toggle="dropdown" aria-expanded="false">
              <div class="d-flex align-items-center nav-item-content">
                <i class="bi bi-people me-2"></i>
                <span class="menu-label">مخاطبین</span>
              </div>
              <span class="badge rounded-circle bg-success notif-badge">{{ contactsCount
              }}</span>
            </a>
            <ul class="dropdown-menu dropdown-menu-dark dropdown-menu-end" aria-labelledby="navbarDarkDropdownMenuLink">
              <li v-if="!contacts || contacts.length === 0"><span class="dropdown-item text-muted">هیچ مخاطبی یافت
                  نشد</span></li>
              <li v-for="u in contacts" :key="u.uid">
                <a class="dropdown-item" href="#" @click="$emit('set-unit', u.uid, true)">
                  <span v-if="u.lat === 0 && u.lon === 0">* </span>{{ u.callsign }}<span v-if="u.status"> ({{ u.status
                  }})</span>
                </a>
              </li>
            </ul>
          </li>
          <li class="nav-item dropdown nav-item-mobile">
            <a class="nav-link dropdown-toggle d-flex align-items-center" href="#" id="navbarDarkDropdownMenuLink2"
              role="button" data-bs-toggle="dropdown" aria-expanded="false">
              <div class="d-flex align-items-center nav-item-content">
                <i class="bi bi-person-badge me-2"></i>
                <span class="menu-label">نیروها</span>
              </div>
              <span class="badge rounded-circle bg-success notif-badge">{{ unitsCount
              }}</span>
            </a>
            <ul class="dropdown-menu dropdown-menu-dark dropdown-menu-end"
              aria-labelledby="navbarDarkDropdownMenuLink2">
              <li v-if="!units || units.length === 0"><span class="dropdown-item text-muted">هیچ نیرویی یافت نشد</span>
              </li>
              <li v-for="u in units" :key="u.uid">
                <a class="dropdown-item" href="#" @click="$emit('set-unit', u.uid, true)">
                  {{ u.callsign || u.uid }}
                </a>
              </li>
            </ul>
          </li>
          <li class="nav-item dropdown nav-item-mobile">
            <a class="nav-link dropdown-toggle d-flex align-items-center" href="#" id="navbarDarkDropdownMenuLink3"
              role="button" data-bs-toggle="dropdown" aria-expanded="false">
              <div class="d-flex align-items-center nav-item-content">
                <i class="bi bi-geo-alt me-2"></i>
                <span class="menu-label">نقاط</span>
              </div>
              <span class="badge rounded-circle bg-success notif-badge">{{ pointsCount
              }}</span>
            </a>
            <ul class="dropdown-menu dropdown-menu-dark dropdown-menu-end"
              aria-labelledby="navbarDarkDropdownMenuLink3">
              <li v-if="!points || points.length === 0"><span class="dropdown-item text-muted">هیچ نقطه‌ای یافت
                  نشد</span></li>
              <li v-for="u in points" :key="u.uid">
                <a class="dropdown-item" href="#" @click="$emit('set-unit', u.uid, true)">
                  {{ u.callsign || u.uid }}
                </a>
              </li>
            </ul>
          </li>
          <li class="nav-item dropdown nav-item-mobile">
            <a class="nav-link dropdown-toggle d-flex align-items-center" href="#" id="navbarDarkDropdownMenuLink4"
              role="button" data-bs-toggle="dropdown" aria-expanded="false">
              <div class="d-flex align-items-center nav-item-content">
                <i class="bi bi-chat-text me-2"></i>
                <span class="menu-label">پیام‌ها</span>
              </div>
              <span class="badge rounded-circle bg-success notif-badge">{{
                totalUnseenMessages
              }}</span>
            </a>
            <ul class="dropdown-menu dropdown-menu-dark dropdown-menu-end"
              aria-labelledby="navbarDarkDropdownMenuLink4">
              <li v-if="!chats || chats.length === 0">
                <span class="dropdown-item text-muted">هیچ چتی فعال نیست</span>
              </li>
              <li v-for="chat in chats" :key="chat.uid">
                <a class="dropdown-item d-flex justify-content-between align-items-center" href="#"
                  @click="$emit('open-messages', chat.partnerUnit)">
                  {{ chat.partnerCallsign }}
                  <span v-if="chat.unseenCount > 0" class="badge rounded-pill bg-danger ms-2">{{ chat.unseenCount
                  }}</span>
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
import { defineProps, defineEmits, onMounted, onBeforeUnmount, ref } from 'vue';

const isSmallScreen = ref(false);

const handleResize = () => {
  const navbar = document.querySelector('.navbar-nav');
  const menuItems = navbar.querySelectorAll('.nav-item');
  const availableWidth = navbar.offsetWidth;
  let totalWidth = 0;

  menuItems.forEach(item => {
    totalWidth += item.offsetWidth;
  });

  if (totalWidth > availableWidth) {
    navbar.classList.add('small-navbar');
    isSmallScreen.value = true;
  } else {
    navbar.classList.remove('small-navbar');
    isSmallScreen.value = false;
  }
};

onMounted(() => {
  window.addEventListener('resize', handleResize);
  handleResize(); // Call it initially to set the correct state
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize);
});


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
/* Navbar specific styles */
.alarm-active {
  color: #ffc107;
}

.connection-badge {
  margin-right: 5px;
}

.dropdown-menu {
  max-height: 300px;
  overflow-y: auto;
}

@media (max-width: 1220px) {
  nav {
    --bs-navbar-padding-y: 0;
  }
  .navbar-brand {
    font-size: 1.0rem;
  }
  .navbar-nav .nav-item .nav-item-content {
    font-size: 0.8rem;
    flex-direction: column;
    align-items: center;
  }

  .notif-badge {
    position: absolute;
    top: 0;
    right: 0;
    transform: translate(25%, 25%);
    font-size: 0.6rem;
  }
}

/* Responsive adjustments */
/* @media (max-width: 767.98px) {
  .navbar-brand {
    font-size: 1rem;
    max-width: 60%;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  
  .nav-item-mobile {
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    padding: 0.25rem 0;
  }
  
  .nav-item-mobile:last-child {
    border-bottom: none;
  }
  
  .nav-link {
    padding: 0.5rem 1rem;
    font-size: 1rem;
  }
  
  .navbar-collapse {
    max-height: calc(100vh - 56px);
    overflow-y: auto;
  }
  
  .dropdown-menu {
    position: static !important;
    width: 100%;
    margin-top: 0;
    background-color: rgba(0, 0, 0, 0.2);
    border: none;
    box-shadow: none;
    max-height: 200px;
  }
  
  .dropdown-item {
    padding: 0.5rem 2rem;
  }
} */

/* Fix RTL dropdown alignment for Bootstrap */
/* .dropdown-menu-end {
  left: 0 !important;
  right: auto !important;
} */

/* Make navigation buttons more touch-friendly */
.nav-link {
  min-height: 44px;
  display: flex;
  align-items: center;
  position: relative;
}

.navbar-nav.small-navbar .menu-label {
  /* display: none; */
}

.navbar-collapse {
  overflow-x: hidden;
}

.navbar-nav {
  width: 100%;
  justify-content: space-between
}
</style>