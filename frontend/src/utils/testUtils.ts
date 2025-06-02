import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createVuetify } from 'vuetify'
import { mount, VueWrapper } from '@vue/test-utils'
import type { ComponentMountingOptions } from '@vue/test-utils'

// Mock data generators
export const mockMapItem = (overrides = {}) => ({
  uid: 'test-uid-' + Math.random().toString(36).substr(2, 9),
  category: 'unit' as const,
  callsign: 'TEST-UNIT',
  type: 'a-f-G-U-C',
  lat: 35.7219,
  lon: 51.3347,
  speed: 0,
  course: 0,
  status: 'active',
  text: 'Test unit',
  remarks: 'Test remarks',
  local: false,
  send: true,
  start_time: new Date().toISOString(),
  last_seen: new Date().toISOString(),
  stale_time: new Date(Date.now() + 300000).toISOString(),
  ...overrides,
})

export const mockCasevacDetail = (overrides = {}) => ({
  casevac: true,
  title: 'Test CASEVAC',
  freq: 123.45,
  urgent: 1,
  priority: 2,
  routine: 0,
  hoist: false,
  extraction_equipment: true,
  ventilator: false,
  equipment_other: false,
  equipment_detail: '',
  litter: 1,
  ambulatory: 2,
  security: 1,
  hlz_marking: 0,
  us_military: 3,
  us_civilian: 0,
  nonus_military: 0,
  nonus_civilian: 0,
  epw: 0,
  child: 0,
  ...overrides,
})

export const mockChatMessage = (overrides = {}) => ({
  message_id: 'msg-' + Math.random().toString(36).substr(2, 9),
  from: 'Test User',
  from_uid: 'test-user-uid',
  to_uid: 'target-user-uid',
  chatroom: '',
  text: 'Test message',
  timestamp: new Date().toISOString(),
  ...overrides,
})

export const mockSensor = (overrides = {}) => ({
  id: 'sensor-' + Math.random().toString(36).substr(2, 9),
  title: 'Test Sensor',
  type: 'GPS',
  addr: '192.168.1.100',
  port: 2947,
  interval: 5,
  status: 'active',
  ...overrides,
})

export const mockFlow = (overrides = {}) => ({
  id: 'flow-' + Math.random().toString(36).substr(2, 9),
  title: 'Test Flow',
  type: 'UDP',
  addr: '192.168.1.200',
  port: 8080,
  direction: 1,
  ...overrides,
})

export const mockConfig = (overrides = {}) => ({
  uid: 'config-uid',
  callsign: 'TEST-CONFIG',
  lat: 35.7219,
  lon: 51.3347,
  zoom: 10,
  layers: [],
  ...overrides,
})

// Test wrapper utilities
export const createTestApp = () => {
  const app = createApp({})
  const pinia = createPinia()
  const vuetify = createVuetify({
    theme: {
      defaultTheme: 'light',
    },
  })

  app.use(pinia)
  app.use(vuetify)

  return { app, pinia, vuetify }
}

export const mountComponent = <T extends Record<string, any>>(
  component: T,
  options: ComponentMountingOptions<T> = {}
) => {
  const { pinia, vuetify } = createTestApp()

  const defaultOptions: ComponentMountingOptions<T> = {
    global: {
      plugins: [pinia, vuetify],
      stubs: {
        'v-dialog': {
          template: '<div class="v-dialog"><slot /></div>',
          props: ['modelValue'],
        },
        'v-card': {
          template: '<div class="v-card"><slot /></div>',
        },
        'v-card-title': {
          template: '<div class="v-card-title"><slot /></div>',
        },
        'v-card-text': {
          template: '<div class="v-card-text"><slot /></div>',
        },
        'v-card-actions': {
          template: '<div class="v-card-actions"><slot /></div>',
        },
        'v-btn': {
          template: '<button class="v-btn" @click="$emit(\'click\')"><slot /></button>',
          emits: ['click'],
        },
        'v-icon': {
          template: '<i class="v-icon">{{ icon }}</i>',
          props: ['icon'],
        },
        'v-text-field': {
          template:
            '<input class="v-text-field" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
          props: ['modelValue', 'label', 'rules'],
          emits: ['update:modelValue'],
        },
        'v-select': {
          template:
            '<select class="v-select" :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)"><option v-for="item in items" :key="item.value" :value="item.value">{{ item.title }}</option></select>',
          props: ['modelValue', 'items'],
          emits: ['update:modelValue'],
        },
      },
    },
    ...options,
  }

  return mount(component, defaultOptions)
}

// Mock API responses
export const mockApiResponse = <T>(data: T, success = true) => ({
  success,
  data: success ? data : undefined,
  error: success ? undefined : 'Mock error',
  message: success ? 'Success' : 'Error occurred',
})

// Mock WebSocket
export class MockWebSocket {
  static CONNECTING = 0
  static OPEN = 1
  static CLOSING = 2
  static CLOSED = 3

  readyState = MockWebSocket.CONNECTING
  url: string
  onopen: ((event: Event) => void) | null = null
  onmessage: ((event: MessageEvent) => void) | null = null
  onerror: ((event: Event) => void) | null = null
  onclose: ((event: CloseEvent) => void) | null = null

  constructor(url: string) {
    this.url = url
    // Simulate connection
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN
      if (this.onopen) {
        this.onopen(new Event('open'))
      }
    }, 10)
  }

  send(data: string) {
    if (this.readyState !== MockWebSocket.OPEN) {
      throw new Error('WebSocket is not open')
    }
    // Mock sending - could trigger mock responses
  }

  close() {
    this.readyState = MockWebSocket.CLOSED
    if (this.onclose) {
      this.onclose(new CloseEvent('close', { code: 1000, reason: 'Normal closure' }))
    }
  }

  // Helper method to simulate receiving a message
  simulateMessage(data: any) {
    if (this.onmessage) {
      this.onmessage(new MessageEvent('message', { data: JSON.stringify(data) }))
    }
  }
}

// Mock geolocation
export const mockGeolocation = {
  getCurrentPosition: (success: PositionCallback, error?: PositionErrorCallback) => {
    const position: GeolocationPosition = {
      coords: {
        latitude: 35.7219,
        longitude: 51.3347,
        accuracy: 10,
        altitude: null,
        altitudeAccuracy: null,
        heading: null,
        speed: null,
      },
      timestamp: Date.now(),
    }

    setTimeout(() => success(position), 10)
  },
  watchPosition: () => 1,
  clearWatch: () => {},
}

// Test helpers
export const waitFor = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

export const waitForNextTick = () => new Promise(resolve => setTimeout(resolve, 0))

export const flushPromises = () => new Promise(resolve => setTimeout(resolve, 0))

// Assertion helpers
export const expectToBeVisible = (wrapper: VueWrapper<any>, selector: string) => {
  const element = wrapper.find(selector)
  expect(element.exists()).toBe(true)
  expect(element.isVisible()).toBe(true)
}

export const expectToHaveText = (wrapper: VueWrapper<any>, selector: string, text: string) => {
  const element = wrapper.find(selector)
  expect(element.exists()).toBe(true)
  expect(element.text()).toContain(text)
}

export const expectToEmit = (wrapper: VueWrapper<any>, eventName: string, payload?: any) => {
  const emitted = wrapper.emitted(eventName)
  expect(emitted).toBeTruthy()
  if (payload !== undefined) {
    expect(emitted![emitted!.length - 1]).toEqual([payload])
  }
}

// Setup and teardown helpers
export const setupTestEnvironment = () => {
  // Mock global objects
  Object.defineProperty(window, 'WebSocket', {
    writable: true,
    value: MockWebSocket,
  })

  Object.defineProperty(navigator, 'geolocation', {
    writable: true,
    value: mockGeolocation,
  })

  // Mock fetch
  global.fetch = jest.fn()

  // Mock console methods to reduce noise in tests
  jest.spyOn(console, 'log').mockImplementation(() => {})
  jest.spyOn(console, 'warn').mockImplementation(() => {})
  jest.spyOn(console, 'error').mockImplementation(() => {})
}

export const cleanupTestEnvironment = () => {
  jest.restoreAllMocks()
  jest.clearAllMocks()
}

// Custom matchers (if using Jest)
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidCoordinate(): R
      toBeValidSIDC(): R
    }
  }
}

// Coordinate validation matcher
export const toBeValidCoordinate = (received: { lat: number; lon: number }) => {
  const pass =
    typeof received.lat === 'number' &&
    typeof received.lon === 'number' &&
    received.lat >= -90 &&
    received.lat <= 90 &&
    received.lon >= -180 &&
    received.lon <= 180

  return {
    message: () =>
      pass
        ? `Expected ${JSON.stringify(received)} not to be a valid coordinate`
        : `Expected ${JSON.stringify(received)} to be a valid coordinate`,
    pass,
  }
}

// SIDC validation matcher
export const toBeValidSIDC = (received: string) => {
  const pass = typeof received === 'string' && received.length === 15

  return {
    message: () =>
      pass
        ? `Expected ${received} not to be a valid SIDC`
        : `Expected ${received} to be a valid SIDC (15 characters)`,
    pass,
  }
}

// Export for Jest setup
export const setupJestMatchers = () => {
  if (typeof expect !== 'undefined' && expect.extend) {
    expect.extend({
      toBeValidCoordinate,
      toBeValidSIDC,
    })
  }
}
