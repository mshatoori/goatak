import { createRouter, createWebHistory } from 'vue-router';
import Login from './views/Login.vue';
import Main from './views/Main.vue';

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: Login,
  },
  {
    path: '/',
    name: 'Main',
    component: Main,
    meta: { requiresAuth: true },
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('access_token');

  if (to.meta.requiresAuth && !token) {
    next('/login');
  } else if (to.name === 'Login' && token) {
     // Optional: redirect to main if already logged in?
     // next('/');
     next();
  } else {
    next();
  }
});

export default router;
