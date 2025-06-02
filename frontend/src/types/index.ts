// Common types for the application based on existing JavaScript implementation

export interface MapItem {
  uid: string
  category: 'unit' | 'point' | 'drawing' | 'route' | 'report' | 'contact' | 'alarm'
  callsign: string
  type: string
  sidc?: string
  lat: number
  lon: number
  hae?: number
  speed?: number
  course?: number
  status?: string
  text?: string
  remarks?: string
  parent_uid?: string
  parent_callsign?: string
  local?: boolean
  send?: boolean
  isNew?: boolean
  start_time?: string
  last_seen?: string
  stale_time?: string
  send_time?: string
  web_sensor?: string
  links?: string[]
  color?: string
  geofence?: boolean
  geofence_aff?: string
  team?: string
  role?: string
  ip_address?: string
  urn?: string
  sensor_data?: Record<string, any>
  casevac_detail?: CasevacDetail
  marker?: any // L.Marker
  infoMarker?: any // L.Marker
  polygon?: any // L.Polygon
  root_sidc?: string
  subtype?: string
  aff?: string
}

export interface CasevacDetail {
  casevac?: boolean
  title?: string
  freq?: number
  urgent?: number
  priority?: number
  routine?: number
  hoist?: boolean
  extraction_equipment?: boolean
  ventilator?: boolean
  equipment_other?: boolean
  equipment_detail?: string
  litter?: number
  ambulatory?: number
  security?: number
  hlz_marking?: number
  us_military?: number
  us_civilian?: number
  nonus_military?: number
  nonus_civilian?: number
  epw?: number
  child?: number
}

export interface Config {
  uid: string
  callsign: string
  lat: number
  lon: number
  zoom: number
  ip_address?: string
  urn?: string
  layers: MapLayer[]
}

export interface MapLayer {
  name: string
  url: string
  minZoom?: number
  maxZoom?: number
  maxNativeZoom?: number
  parts?: string[]
  bounds?: any // L.LatLngBounds
}

export interface WebSocketMessage {
  type: 'unit' | 'delete' | 'chat'
  unit?: MapItem
  chat_msg?: ChatMessage
}

export interface ChatMessage {
  message_id: string
  from: string
  from_uid: string
  to_uid: string
  chatroom: string
  text: string
  timestamp: string
}

export interface Messages {
  [uid: string]: {
    messages: ChatMessage[]
  }
}

export interface Sensor {
  id: string
  name: string
  type: string
  data: Record<string, any>
}

export interface Flow {
  id: string
  direction: 1 | 2 | 3 // 1=incoming, 2=outgoing, 3=bidirectional
  source: string
  destination: string
  data: any
}

export interface NavigationData {
  distance: number
  bearing: number
  targetPosition: {
    lat: number
    lng: number
  }
}

export interface NavigationLineToggleEvent {
  show: boolean
  targetItem?: MapItem
  userPosition?: Config
  navigationData?: NavigationData
}

export interface EmergencyState {
  switch1: boolean
  switch2: boolean
  type: string
}

export interface StoreState {
  items: Map<string, MapItem>
  ts: number
  types: Map<string, any>
  sensors: Sensor[]
  flows: Flow[]
  emergency: EmergencyState
  unitToSend?: MapItem
}

// Leaflet related types
export interface LeafletMarkerOptions {
  icon?: any // L.Icon
  draggable?: boolean
  title?: string
  alt?: string
  zIndexOffset?: number
  opacity?: number
  riseOnHover?: boolean
  riseOffset?: number
}

export interface MapOverlays {
  contact: any // L.LayerGroup
  unit: any // L.LayerGroup
  alarm: any // L.LayerGroup
  point: any // L.LayerGroup
  drawing: any // L.LayerGroup
  route: any // L.LayerGroup
  report: any // L.LayerGroup
  navigation: any // L.LayerGroup
}

// Form validation types
export interface ValidationRule {
  (value: any): boolean | string
}

export interface FormField {
  value: any
  rules: ValidationRule[]
  errorMessages: string[]
  valid: boolean
}

// API Response types
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface ItemsResponse {
  added: MapItem[]
  updated: MapItem[]
  removed: MapItem[]
}

// Coordinate utilities
export interface LatLng {
  lat: number
  lng: number
}

export interface CoordinateFormat {
  format: 'd' | 'dm' | 'dms' | 'mgrs'
}

// Map settings
export interface MapSettings {
  center: {
    lat: number
    lng: number
  }
  zoom: number
  baseLayer: string
  showGrid: boolean
  showCoordinates: boolean
  coordinateFormat: 'd' | 'dm' | 'dms' | 'mgrs'
}

// User interface types
export interface User {
  id: string
  name: string
  callsign: string
  role: string
  team: string
  status: 'online' | 'offline' | 'busy'
  lastSeen: Date
}

// Drawing types
export interface Drawing {
  id: string
  name: string
  type: 'line' | 'polygon' | 'circle' | 'rectangle'
  coordinates: number[][]
  style: {
    color: string
    weight: number
    opacity: number
    fillColor?: string
    fillOpacity?: number
  }
  description?: string
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

// Tool types for map tools
export interface MapTool {
  name: string
  marker: any // L.Marker
  active: boolean
}

// Mode types
export type MapMode = 'map' | 'add_point' | 'add_unit' | 'add_casevac'

// Hierarchy selector types
export interface HierarchyItem {
  code: string
  name: string
  children?: HierarchyItem[]
}
