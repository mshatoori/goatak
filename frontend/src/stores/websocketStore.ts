import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { WebSocketMessage, Messages, ChatMessage } from '@/types'
import { useUnitsStore } from './unitsStore'

export const useWebSocketStore = defineStore('websocket', () => {
  // State
  const connection = ref<WebSocket | null>(null)
  const isConnected = ref(false)
  const isConnecting = ref(false)
  const reconnectAttempts = ref(0)
  const maxReconnectAttempts = ref(5)
  const reconnectDelay = ref(3000)

  // Messages state
  const messages = ref<Messages>({})
  const seenMessages = ref<Set<string>>(new Set())

  // Getters
  const connectionStatus = computed(() => {
    if (isConnecting.value) return 'connecting'
    if (isConnected.value) return 'connected'
    return 'disconnected'
  })

  const unreadMessageCount = computed(() => {
    let count = 0
    Object.values(messages.value).forEach(conversation => {
      if (conversation.messages) {
        conversation.messages.forEach(msg => {
          if (!seenMessages.value.has(msg.message_id)) {
            count++
          }
        })
      }
    })
    return count
  })

  const getUnreadCountForUser = computed(() => (uid: string) => {
    if (!messages.value[uid]?.messages) return 0
    let count = 0
    messages.value[uid].messages.forEach(msg => {
      if (!seenMessages.value.has(msg.message_id)) {
        count++
      }
    })
    return count
  })

  const getMessagesForUser = computed(() => (uid: string) => {
    return messages.value[uid]?.messages || []
  })

  // Actions
  const connect = () => {
    if (connection.value?.readyState === WebSocket.OPEN) {
      console.log('WebSocket already connected')
      return
    }

    if (isConnecting.value) {
      console.log('WebSocket connection already in progress')
      return
    }

    isConnecting.value = true

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    // Use port 8081 for WebSocket connection
    const url = `${protocol}//localhost:8081/ws`

    console.log('Connecting to WebSocket:', url)

    try {
      connection.value = new WebSocket(url)

      connection.value.onopen = handleOpen
      connection.value.onmessage = handleMessage
      connection.value.onerror = handleError
      connection.value.onclose = handleClose
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error)
      isConnecting.value = false
      scheduleReconnect()
    }
  }

  const disconnect = () => {
    if (connection.value) {
      connection.value.close()
      connection.value = null
    }
    isConnected.value = false
    isConnecting.value = false
    reconnectAttempts.value = 0
  }

  const send = (message: any) => {
    if (connection.value?.readyState === WebSocket.OPEN) {
      connection.value.send(JSON.stringify(message))
      return true
    } else {
      console.warn('WebSocket not connected, cannot send message:', message)
      return false
    }
  }

  // Event handlers
  const handleOpen = (event: Event) => {
    console.log('WebSocket connected')
    isConnected.value = true
    isConnecting.value = false
    reconnectAttempts.value = 0
  }

  const handleMessage = (event: MessageEvent) => {
    try {
      const data: WebSocketMessage = JSON.parse(event.data)
      processMessage(data)
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error, event.data)
    }
  }

  const handleError = (event: Event) => {
    console.error('WebSocket error:', event)
    isConnecting.value = false
  }

  const handleClose = (event: CloseEvent) => {
    console.log('WebSocket closed:', event.code, event.reason)
    isConnected.value = false
    isConnecting.value = false
    connection.value = null

    // Schedule reconnect if not a normal closure
    if (event.code !== 1000) {
      scheduleReconnect()
    }
  }

  // Message processing
  const processMessage = (message: WebSocketMessage) => {
    const unitsStore = useUnitsStore()

    switch (message.type) {
      case 'unit':
        if (message.unit) {
          const result = unitsStore.handleItemChangeMessage(message.unit)
          // Emit events for map updates if needed
          console.log('Unit update processed:', result)
        }
        break

      case 'delete':
        if (message.unit) {
          const result = unitsStore.handleItemChangeMessage(message.unit, true)
          console.log('Unit deletion processed:', result)
        }
        break

      case 'chat':
        if (message.chat_msg) {
          handleChatMessage(message.chat_msg)
        }
        break

      default:
        console.log('Unknown message type:', message.type, message)
    }
  }

  const handleChatMessage = (chatMsg: ChatMessage) => {
    console.log('Chat message received:', chatMsg)
    // Trigger message fetch or update messages directly
    // For now, we'll just log it and let the component fetch messages
  }

  // Reconnection logic
  const scheduleReconnect = () => {
    if (reconnectAttempts.value >= maxReconnectAttempts.value) {
      console.log('Max reconnection attempts reached')
      return
    }

    reconnectAttempts.value++
    const delay = reconnectDelay.value * Math.pow(2, reconnectAttempts.value - 1) // Exponential backoff

    console.log(`Scheduling reconnect attempt ${reconnectAttempts.value} in ${delay}ms`)

    setTimeout(() => {
      if (!isConnected.value && !isConnecting.value) {
        connect()
      }
    }, delay)
  }

  // Message management
  const setMessages = (newMessages: Messages) => {
    messages.value = newMessages
  }

  const markMessageAsSeen = (messageId: string) => {
    seenMessages.value.add(messageId)
  }

  const markAllMessagesAsSeen = (uid: string) => {
    if (messages.value[uid]?.messages) {
      messages.value[uid].messages.forEach(msg => {
        seenMessages.value.add(msg.message_id)
      })
    }
  }

  const sendChatMessage = async (
    to_uid: string,
    chatroom: string,
    text: string,
    from: string,
    from_uid: string
  ) => {
    const message = {
      from,
      from_uid,
      chatroom,
      to_uid,
      text,
    }

    try {
      // Use port 8081 for API calls
      const response = await fetch(`http://localhost:8081/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message),
      })

      if (response.ok) {
        const data = await response.json()
        setMessages(data)
        return true
      } else {
        console.error('Failed to send message:', response.statusText)
        return false
      }
    } catch (error) {
      console.error('Error sending message:', error)
      return false
    }
  }

  return {
    // State
    connection,
    isConnected,
    isConnecting,
    reconnectAttempts,
    maxReconnectAttempts,
    reconnectDelay,
    messages,
    seenMessages,

    // Getters
    connectionStatus,
    unreadMessageCount,
    getUnreadCountForUser,
    getMessagesForUser,

    // Actions
    connect,
    disconnect,
    send,
    setMessages,
    markMessageAsSeen,
    markAllMessagesAsSeen,
    sendChatMessage,
  }
})
