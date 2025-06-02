import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Home',
    component: () => import('@/views/MapView.vue'),
    meta: {
      title: 'نقشه اصلی',
      requiresAuth: false
    }
  },
  {
    path: '/map',
    name: 'Map',
    component: () => import('@/views/MapView.vue'),
    meta: {
      title: 'نقشه',
      requiresAuth: false
    }
  },
  {
    path: '/units',
    name: 'Units',
    component: () => import('@/views/UnitsView.vue'),
    meta: {
      title: 'واحدها',
      requiresAuth: false
    }
  },
  {
    path: '/casevac',
    name: 'Casevac',
    component: () => import('@/views/CasevacView.vue'),
    meta: {
      title: 'تخلیه پزشکی',
      requiresAuth: false
    }
  },
  {
    path: '/drawings',
    name: 'Drawings',
    component: () => import('@/views/DrawingsView.vue'),
    meta: {
      title: 'نقشه‌کشی',
      requiresAuth: false
    }
  },
  {
    path: '/points',
    name: 'Points',
    component: () => import('@/views/PointsView.vue'),
    meta: {
      title: 'نقاط',
      requiresAuth: false
    }
  },
  {
    path: '/settings',
    name: 'Settings',
    component: () => import('@/views/SettingsView.vue'),
    meta: {
      title: 'تنظیمات',
      requiresAuth: false
    }
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/views/NotFoundView.vue'),
    meta: {
      title: 'صفحه یافت نشد',
      requiresAuth: false
    }
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    } else {
      return { top: 0 }
    }
  }
})

// Navigation guards
router.beforeEach((to, from, next) => {
  // Set page title
  if (to.meta.title) {
    document.title = `${to.meta.title} - GoATAK`
  }
  
  // Add authentication logic here if needed
  // if (to.meta.requiresAuth && !isAuthenticated()) {
  //   next('/login')
  // } else {
  //   next()
  // }
  
  next()
})

export default router