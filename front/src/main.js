window.baseUrl = "";

import { createApp } from "vue";
import App from "./App.vue";
import router from "./router";

// Import styles
import "./main.css";

// Import utilities and store
import "./utils.js";
import "./store.js";

// Import Vue components
import Sidebar from "./components/Sidebar.vue";
import FlowsModal from "./components/modals/Flows.vue";
import AlarmsModal from "./components/modals/Alarms.vue";
import SendModal from "./components/modals/Send.vue";
import SensorsModal from "./components/modals/SensorsModal.vue";
import CotLog from "./components/CotLog.vue";
import BaseItemDetails from "./components/items/BaseItemDetails.vue";
import CasevacDetails from "./components/items/CasevacDetails.vue";
import DrawingDetails from "./components/items/DrawingDetails.vue";
import FilterComponent from "./components/FilterComponent.vue";
import HierarchySelector from "./components/HierarchySelector.vue";
import ItemDetails from "./components/items/ItemDetails.vue";
import NavigationInfo from "./components/NavigationInfo.vue";
import OverlaysList from "./components/OverlaysList.vue";
import PointDetails from "./components/items/PointDetails.vue";
import PredicateComponent from "./components/PredicateComponent.vue";
import ResendingPanel from "./components/ResendingPanel.vue";
import SendModeSelector from "./components/SendModeSelector.vue";
import UnitDetails from "./components/items/UnitDetails.vue";
import UserInfo from "./components/UserInfo.vue";
import TrackingManager from "./TrackingManager.js";
import TrackingControl from "./components/TrackingControl.vue";
import Location from "./components/Location.vue";

const app = createApp(App);

app.use(router);

// Register all Vue components
app.component("Sidebar", Sidebar);
app.component("FlowsModal", FlowsModal);
app.component("AlarmsModal", AlarmsModal);
app.component("SendModal", SendModal);
app.component("SensorsModal", SensorsModal);
app.component("BaseItemDetails", BaseItemDetails);
app.component("CasevacDetails", CasevacDetails);
app.component("CotLog", CotLog);
app.component("DrawingDetails", DrawingDetails);
app.component("FilterComponent", FilterComponent);
app.component("HierarchySelector", HierarchySelector);
app.component("ItemDetails", ItemDetails);
app.component("NavigationInfo", NavigationInfo);
app.component("OverlaysList", OverlaysList);
app.component("PointDetails", PointDetails);
app.component("PredicateComponent", PredicateComponent);
app.component("ResendingPanel", ResendingPanel);
app.component("SendModeSelector", SendModeSelector);
app.component("UnitDetails", UnitDetails);
app.component("UserInfo", UserInfo);
app.component("TrackingManager", TrackingManager);
app.component("TrackingControl", TrackingControl);
app.component("Location", Location);

app.mount("#app");
