import { ref, computed, reactive, watch } from 'vue'
import { useWebSocketStore } from '@/stores/websocketStore'
import { useApi } from '@/composables/useApi'
import type { ChatMessage, Messages } from '@/types'

// Types
export interface ChatRoom {
  id: string
  name: string
  type: 'direct' | 'group' | 'broadcast'
  participants: string[]
  lastMessage?: ChatMessage
  unreadCount: number
  active: boolean
}

export interface ChatState {
  rooms: Map<string, ChatRoom>
  messages: Messages
  activeRoom: string | null
  typing: Map<string, string[]> // roomId -> userIds
  onlineUsers: Set<string>
}

// Global chat state
const chatState = reactive<ChatState>({
  rooms: new Map(),
  messages: {},
  activeRoom: null,
  typing: new Map(),
  onlineUsers: new Set(),
})

export function useChat() {
  const wsStore = useWebSocketStore()
  const { getMessages, sendMessage: apiSendMessage } = useApi()

  const isConnected = ref(false)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // Computed
  const activeRoomData = computed(() => {
    return chatState.activeRoom ? chatState.rooms.get(chatState.activeRoom) : null
  })

  const activeMessages = computed(() => {
    if (!chatState.activeRoom) return []
    return chatState.messages[chatState.activeRoom]?.messages || []
  })

  const sortedRooms = computed(() => {
    return Array.from(chatState.rooms.values()).sort((a, b) => {
      // Sort by last message time, then by name
      const aTime = a.lastMessage?.timestamp ? new Date(a.lastMessage.timestamp).getTime() : 0
      const bTime = b.lastMessage?.timestamp ? new Date(b.lastMessage.timestamp).getTime() : 0

      if (aTime !== bTime) {
        return bTime - aTime // Most recent first
      }

      return a.name.localeCompare(b.name)
    })
  })

  const totalUnreadCount = computed(() => {
    return Array.from(chatState.rooms.values()).reduce((total, room) => total + room.unreadCount, 0)
  })

  const typingUsers = computed(() => {
    if (!chatState.activeRoom) return []
    return chatState.typing.get(chatState.activeRoom) || []
  })

  // Methods
  const initializeChat = async () => {
    isLoading.value = true
    error.value = null

    try {
      // Load existing messages
      const response = await getMessages()
      if (response.success && response.data) {
        chatState.messages = response.data
        updateRoomsFromMessages()
      }

      // Setup WebSocket listeners
      setupWebSocketListeners()

      isConnected.value = true
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to initialize chat'
      console.error('Chat initialization error:', err)
    } finally {
      isLoading.value = false
    }
  }

  const setupWebSocketListeners = () => {
    // Listen for incoming messages
    wsStore.onMessage(data => {
      if (data.type === 'chat' && data.chat_msg) {
        handleIncomingMessage(data.chat_msg)
      }
    })

    // Listen for connection status
    watch(
      () => wsStore.isConnected,
      connected => {
        isConnected.value = connected
        if (connected) {
          // Refresh messages when reconnected
          loadMessages()
        }
      }
    )
  }

  const handleIncomingMessage = (message: ChatMessage) => {
    const roomId = message.chatroom || message.from_uid

    // Update room info
    updateRoomFromMessage(message)

    // Mark as unread if not active room
    if (chatState.activeRoom !== roomId) {
      const room = chatState.rooms.get(roomId)
      if (room) {
        room.unreadCount++
      }
    }
  }

  const updateRoomsFromMessages = () => {
    for (const [roomId, roomMessages] of Object.entries(chatState.messages)) {
      if (roomMessages.messages.length > 0) {
        const lastMessage = roomMessages.messages[roomMessages.messages.length - 1]
        updateRoomFromMessage(lastMessage, roomId)
      }
    }
  }

  const updateRoomFromMessage = (message: ChatMessage, roomId?: string) => {
    const id = roomId || message.chatroom || message.from_uid

    let room = chatState.rooms.get(id)
    if (!room) {
      room = {
        id,
        name: getRoomName(message),
        type: message.chatroom ? 'group' : 'direct',
        participants: [message.from_uid, message.to_uid].filter(Boolean),
        unreadCount: 0,
        active: true,
      }
      chatState.rooms.set(id, room)
    }

    room.lastMessage = message
  }

  const getRoomName = (message: ChatMessage): string => {
    if (message.chatroom) {
      return message.chatroom
    }
    return message.from || message.from_uid
  }

  const sendMessage = async (text: string, toUid?: string, chatroom?: string): Promise<boolean> => {
    if (!text.trim()) return false

    try {
      const messageData = {
        from: 'Current User', // This should come from user store
        from_uid: 'current-user-uid', // This should come from user store
        chatroom: chatroom || '',
        to_uid: toUid || '',
        text: text.trim(),
      }

      const response = await apiSendMessage(messageData)

      if (response.success) {
        // Message will be handled by WebSocket listener
        return true
      } else {
        error.value = response.error || 'Failed to send message'
        return false
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to send message'
      return false
    }
  }

  const setActiveRoom = (roomId: string) => {
    chatState.activeRoom = roomId

    // Mark room as read
    const room = chatState.rooms.get(roomId)
    if (room) {
      room.unreadCount = 0
    }
  }

  const createRoom = (
    name: string,
    type: 'direct' | 'group' | 'broadcast',
    participants: string[] = []
  ): string => {
    const roomId = `room-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    const room: ChatRoom = {
      id: roomId,
      name,
      type,
      participants,
      unreadCount: 0,
      active: true,
    }

    chatState.rooms.set(roomId, room)
    chatState.messages[roomId] = { messages: [] }

    return roomId
  }

  const deleteRoom = (roomId: string) => {
    chatState.rooms.delete(roomId)
    delete chatState.messages[roomId]

    if (chatState.activeRoom === roomId) {
      chatState.activeRoom = null
    }
  }

  const loadMessages = async () => {
    try {
      const response = await getMessages()
      if (response.success && response.data) {
        wsStore.setMessages(response.data)
        chatState.messages = response.data
        updateRoomsFromMessages()
      }
    } catch (err) {
      console.error('Failed to load messages:', err)
    }
  }

  const markRoomAsRead = (roomId: string) => {
    const room = chatState.rooms.get(roomId)
    if (room) {
      room.unreadCount = 0
    }
  }

  const markAllAsRead = () => {
    for (const room of chatState.rooms.values()) {
      room.unreadCount = 0
    }
  }

  const searchMessages = (query: string, roomId?: string): ChatMessage[] => {
    const searchIn = roomId ? [roomId] : Object.keys(chatState.messages)
    const results: ChatMessage[] = []

    for (const id of searchIn) {
      const roomMessages = chatState.messages[id]?.messages || []
      const matches = roomMessages.filter(
        msg =>
          msg.text.toLowerCase().includes(query.toLowerCase()) ||
          msg.from.toLowerCase().includes(query.toLowerCase())
      )
      results.push(...matches)
    }

    return results.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  }

  const getMessageHistory = (roomId: string, limit = 50): ChatMessage[] => {
    const messages = chatState.messages[roomId]?.messages || []
    return messages.slice(-limit)
  }

  const startTyping = (roomId: string, userId: string) => {
    const typing = chatState.typing.get(roomId) || []
    if (!typing.includes(userId)) {
      typing.push(userId)
      chatState.typing.set(roomId, typing)
    }
  }

  const stopTyping = (roomId: string, userId: string) => {
    const typing = chatState.typing.get(roomId) || []
    const filtered = typing.filter(id => id !== userId)
    chatState.typing.set(roomId, filtered)
  }

  const setUserOnline = (userId: string) => {
    chatState.onlineUsers.add(userId)
  }

  const setUserOffline = (userId: string) => {
    chatState.onlineUsers.delete(userId)

    // Remove from all typing indicators
    for (const [roomId, typing] of chatState.typing.entries()) {
      const filtered = typing.filter(id => id !== userId)
      chatState.typing.set(roomId, filtered)
    }
  }

  const isUserOnline = (userId: string): boolean => {
    return chatState.onlineUsers.has(userId)
  }

  // Broadcast message to all users
  const broadcast = async (text: string): Promise<boolean> => {
    return sendMessage(text, '', 'broadcast')
  }

  // Send direct message
  const sendDirectMessage = async (text: string, toUid: string): Promise<boolean> => {
    return sendMessage(text, toUid)
  }

  // Send group message
  const sendGroupMessage = async (text: string, chatroom: string): Promise<boolean> => {
    return sendMessage(text, '', chatroom)
  }

  return {
    // State
    chatState,
    isConnected,
    isLoading,
    error,

    // Computed
    activeRoomData,
    activeMessages,
    sortedRooms,
    totalUnreadCount,
    typingUsers,

    // Methods
    initializeChat,
    sendMessage,
    sendDirectMessage,
    sendGroupMessage,
    broadcast,
    setActiveRoom,
    createRoom,
    deleteRoom,
    loadMessages,
    markRoomAsRead,
    markAllAsRead,
    searchMessages,
    getMessageHistory,
    startTyping,
    stopTyping,
    setUserOnline,
    setUserOffline,
    isUserOnline,
  }
}

// Global chat instance
let globalChat: ReturnType<typeof useChat> | null = null

export function getGlobalChat() {
  if (!globalChat) {
    globalChat = useChat()
  }
  return globalChat
}
