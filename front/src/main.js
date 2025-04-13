import Vue from 'vue';
import App from './App.vue';

// Import Bootstrap
import 'bootstrap/dist/js/bootstrap.bundle.min.js';

// Import Leaflet
import L from 'leaflet';

// Import custom styles
import './assets/css/style.css';

// Import components
import Sidebar from './components/Sidebar.vue';
import FeedsModal from './components/FeedsModal.vue';
import AlarmsModal from './components/AlarmsModal.vue';
import MessagesModal from './components/MessagesModal.vue';
import EditDrawingModal from './components/EditDrawingModal.vue';

// Register components
Vue.component('Sidebar', Sidebar);
Vue.component('FeedsModal', FeedsModal);
Vue.component('AlarmsModal', AlarmsModal);
Vue.component('MessagesModal', MessagesModal);
Vue.component('EditDrawingModal', EditDrawingModal);

// Create Vue instance
new Vue({
  render: h => h(App)
}).$mount('#app');