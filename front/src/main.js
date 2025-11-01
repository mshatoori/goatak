import { createApp } from 'vue'
import App from './App.vue'

// Import utilities and store
import '../static/js/utils.js'
import '../static/js/store.js'

window.baseUrl = "http://localhost:8080"

// Import Vue components
import Sidebar from './components/Sidebar.vue'
import FlowsModal from './components/Flows.vue'
import AlarmsModal from './components/Alarms.vue'
import SendModal from './components/Send.vue'
import SensorsModal from '../static/js/components/sensorsmodal.js'
import CotLog from '../static/js/components/cotlog.js'
import CasevacDetails from './components/CasevacDetails.vue'
import DrawingDetails from './components/DrawingDetails.vue'
import FilterComponent from './components/FilterComponent.vue'
import HierarchySelector from './components/HierarchySelector.vue'
import ItemDetails from './components/ItemDetails.vue'
import NavigationInfo from '../static/js/components/NavigationInfo.js'
import OverlaysList from '../static/js/components/overlays.js'
import PointDetails from './components/PointDetails.vue'
import PredicateComponent from '../static/js/components/PredicateComponent.js'
import ResendingPanel from '../static/js/components/ResendingPanel.js'
import UnitDetails from './components/UnitDetails.vue'
import UserInfo from '../static/js/components/userinfo.js'
import TrackingManager from '../static/js/components/TrackingManager.js'
import TrackingControl from './components/TrackingControl.vue'

const app = createApp(App)

// Register all Vue components
app.component('Sidebar', Sidebar)
app.component('FlowsModal', FlowsModal)
app.component('AlarmsModal', AlarmsModal)
app.component('SendModal', SendModal)
app.component('SensorsModal', SensorsModal)
app.component('CasevacDetails', CasevacDetails)
app.component('CotLog', CotLog)
app.component('DrawingDetails', DrawingDetails)
app.component('FilterComponent', FilterComponent)
app.component('HierarchySelector', HierarchySelector)
app.component('ItemDetails', ItemDetails)
app.component('NavigationInfo', NavigationInfo)
app.component('OverlaysList', OverlaysList)
app.component('PointDetails', PointDetails)
app.component('PredicateComponent', PredicateComponent)
app.component('ResendingPanel', ResendingPanel)
app.component('UnitDetails', UnitDetails)
app.component('UserInfo', UserInfo)
app.component('TrackingManager', TrackingManager)
app.component('TrackingControl', TrackingControl)

app.mount('#app')