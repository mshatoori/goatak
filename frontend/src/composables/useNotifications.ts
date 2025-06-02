import { ref, reactive } from 'vue'

// Types
export interface Notification {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message?: string
  timeout?: number
  persistent?: boolean
  actions?: NotificationAction[]
  icon?: string
  color?: string
  timestamp: Date
}

export interface NotificationAction {
  label: string
  action: () => void
  color?: string
}

// Global notification state
const notifications = reactive<Notification[]>([])
const maxNotifications = ref(5)

// Notification composable
export function useNotifications() {
  // Generate unique ID
  const generateId = (): string => {
    return `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  // Add notification
  const addNotification = (notification: Omit<Notification, 'id' | 'timestamp'>): string => {
    const id = generateId()
    const newNotification: Notification = {
      id,
      timestamp: new Date(),
      timeout: 5000, // Default 5 seconds
      persistent: false,
      ...notification,
    }

    notifications.unshift(newNotification)

    // Limit number of notifications
    if (notifications.length > maxNotifications.value) {
      notifications.splice(maxNotifications.value)
    }

    // Auto-remove if not persistent
    if (!newNotification.persistent && newNotification.timeout && newNotification.timeout > 0) {
      setTimeout(() => {
        removeNotification(id)
      }, newNotification.timeout)
    }

    return id
  }

  // Remove notification
  const removeNotification = (id: string) => {
    const index = notifications.findIndex(n => n.id === id)
    if (index > -1) {
      notifications.splice(index, 1)
    }
  }

  // Clear all notifications
  const clearAll = () => {
    notifications.splice(0)
  }

  // Convenience methods for different types
  const success = (title: string, message?: string, options?: Partial<Notification>): string => {
    return addNotification({
      type: 'success',
      title,
      message,
      icon: 'mdi-check-circle',
      color: 'success',
      ...options,
    })
  }

  const error = (title: string, message?: string, options?: Partial<Notification>): string => {
    return addNotification({
      type: 'error',
      title,
      message,
      icon: 'mdi-alert-circle',
      color: 'error',
      timeout: 0, // Errors are persistent by default
      persistent: true,
      ...options,
    })
  }

  const warning = (title: string, message?: string, options?: Partial<Notification>): string => {
    return addNotification({
      type: 'warning',
      title,
      message,
      icon: 'mdi-alert',
      color: 'warning',
      timeout: 7000, // Warnings stay longer
      ...options,
    })
  }

  const info = (title: string, message?: string, options?: Partial<Notification>): string => {
    return addNotification({
      type: 'info',
      title,
      message,
      icon: 'mdi-information',
      color: 'info',
      ...options,
    })
  }

  // System notifications for tactical events
  const tacticalAlert = (
    title: string,
    message?: string,
    options?: Partial<Notification>
  ): string => {
    return addNotification({
      type: 'error',
      title,
      message,
      icon: 'mdi-shield-alert',
      color: 'error',
      persistent: true,
      timeout: 0,
      ...options,
    })
  }

  const unitUpdate = (title: string, message?: string, options?: Partial<Notification>): string => {
    return addNotification({
      type: 'info',
      title,
      message,
      icon: 'mdi-account-group',
      color: 'primary',
      timeout: 3000,
      ...options,
    })
  }

  const connectionStatus = (connected: boolean, message?: string): string => {
    return addNotification({
      type: connected ? 'success' : 'error',
      title: connected ? 'اتصال برقرار شد' : 'اتصال قطع شد',
      message: message || (connected ? 'اتصال به سرور برقرار شد' : 'اتصال به سرور قطع شد'),
      icon: connected ? 'mdi-wifi' : 'mdi-wifi-off',
      color: connected ? 'success' : 'error',
      timeout: connected ? 3000 : 0,
      persistent: !connected,
    })
  }

  const casevacAlert = (callsign: string, location?: string): string => {
    return addNotification({
      type: 'warning',
      title: 'درخواست CASEVAC',
      message: `${callsign}${location ? ` در ${location}` : ''} درخواست تخلیه پزشکی کرده است`,
      icon: 'mdi-medical-bag',
      color: 'warning',
      persistent: true,
      timeout: 0,
      actions: [
        {
          label: 'مشاهده',
          action: () => {
            // This would navigate to the CASEVAC details
            console.log('Navigate to CASEVAC:', callsign)
          },
          color: 'primary',
        },
      ],
    })
  }

  const alarmNotification = (alarmType: string, location: string): string => {
    const alarmTypes: Record<string, string> = {
      'b-a-g': 'ورود به ژئوفنس',
      'b-a-o-tbl': 'هشدار عمومی',
      'b-a-o-opn': 'مواجهه با دشمن',
      'b-a-o-pan': 'تلفات',
    }

    return addNotification({
      type: 'error',
      title: alarmTypes[alarmType] || 'هشدار',
      message: `در موقعیت ${location}`,
      icon: 'mdi-alert-octagon',
      color: 'error',
      persistent: true,
      timeout: 0,
      actions: [
        {
          label: 'مشاهده',
          action: () => {
            console.log('Navigate to alarm location:', location)
          },
          color: 'primary',
        },
      ],
    })
  }

  // Batch operations
  const addMultiple = (notificationList: Omit<Notification, 'id' | 'timestamp'>[]): string[] => {
    return notificationList.map(notification => addNotification(notification))
  }

  const removeMultiple = (ids: string[]) => {
    ids.forEach(id => removeNotification(id))
  }

  // Get notifications by type
  const getByType = (type: Notification['type']): Notification[] => {
    return notifications.filter(n => n.type === type)
  }

  // Get recent notifications
  const getRecent = (minutes = 5): Notification[] => {
    const cutoff = new Date(Date.now() - minutes * 60 * 1000)
    return notifications.filter(n => n.timestamp > cutoff)
  }

  // Mark as read (for future implementation)
  const markAsRead = (id: string) => {
    const notification = notifications.find(n => n.id === id)
    if (notification) {
      ;(notification as any).read = true
    }
  }

  return {
    // State
    notifications,
    maxNotifications,

    // Core methods
    addNotification,
    removeNotification,
    clearAll,

    // Convenience methods
    success,
    error,
    warning,
    info,

    // Tactical methods
    tacticalAlert,
    unitUpdate,
    connectionStatus,
    casevacAlert,
    alarmNotification,

    // Batch operations
    addMultiple,
    removeMultiple,

    // Query methods
    getByType,
    getRecent,
    markAsRead,
  }
}

// Global notification instance
let globalNotifications: ReturnType<typeof useNotifications> | null = null

// Get global notifications instance
export function getGlobalNotifications() {
  if (!globalNotifications) {
    globalNotifications = useNotifications()
  }
  return globalNotifications
}

// Quick access functions for global notifications
export const notify = {
  success: (title: string, message?: string, options?: Partial<Notification>) =>
    getGlobalNotifications().success(title, message, options),

  error: (title: string, message?: string, options?: Partial<Notification>) =>
    getGlobalNotifications().error(title, message, options),

  warning: (title: string, message?: string, options?: Partial<Notification>) =>
    getGlobalNotifications().warning(title, message, options),

  info: (title: string, message?: string, options?: Partial<Notification>) =>
    getGlobalNotifications().info(title, message, options),

  tacticalAlert: (title: string, message?: string, options?: Partial<Notification>) =>
    getGlobalNotifications().tacticalAlert(title, message, options),

  unitUpdate: (title: string, message?: string, options?: Partial<Notification>) =>
    getGlobalNotifications().unitUpdate(title, message, options),

  connectionStatus: (connected: boolean, message?: string) =>
    getGlobalNotifications().connectionStatus(connected, message),

  casevacAlert: (callsign: string, location?: string) =>
    getGlobalNotifications().casevacAlert(callsign, location),

  alarmNotification: (alarmType: string, location: string) =>
    getGlobalNotifications().alarmNotification(alarmType, location),
}
