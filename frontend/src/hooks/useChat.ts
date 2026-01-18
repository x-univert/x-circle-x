import { useState, useEffect, useCallback, useRef } from 'react'
import {
  ChatMessage,
  ChatChannel,
  OnlineUser,
  PrivateConversation,
  DEFAULT_CHANNELS,
  getChannels,
  sendMessage,
  subscribeToMessages,
  sendPrivateMessage,
  subscribeToPrivateMessages,
  getUserConversations,
  subscribeToOnlineUsers,
  signInWithMultiversX,
  updateOnlineStatus,
  formatAddress
} from '../services/chatService'
import { isFirebaseConfigured, initializeFirebase } from '../config/firebase'

interface UseChatReturn {
  // State
  isConfigured: boolean
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  channels: ChatChannel[]
  currentChannel: ChatChannel | null
  messages: ChatMessage[]
  onlineUsers: OnlineUser[]
  privateConversations: PrivateConversation[]
  currentPrivateChat: string | null // Address of the person we're chatting with

  // Actions
  setCurrentChannel: (channel: ChatChannel) => void
  sendChannelMessage: (content: string) => Promise<boolean>
  startPrivateChat: (address: string) => void
  sendPrivateChatMessage: (content: string) => Promise<boolean>
  closePrivateChat: () => void
  authenticate: (address: string) => Promise<boolean>
  clearError: () => void
}

export function useChat(userAddress: string | undefined): UseChatReturn {
  const [isConfigured] = useState(() => isFirebaseConfigured())
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [channels, setChannels] = useState<ChatChannel[]>(DEFAULT_CHANNELS)
  const [currentChannel, setCurrentChannel] = useState<ChatChannel | null>(DEFAULT_CHANNELS[0])
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([])
  const [privateConversations, setPrivateConversations] = useState<PrivateConversation[]>([])
  const [currentPrivateChat, setCurrentPrivateChat] = useState<string | null>(null)

  const messagesUnsubscribeRef = useRef<(() => void) | null>(null)
  const onlineUsersUnsubscribeRef = useRef<(() => void) | null>(null)
  const privateChatUnsubscribeRef = useRef<(() => void) | null>(null)

  // Initialize Firebase if configured
  useEffect(() => {
    if (isConfigured) {
      initializeFirebase()
    }
    setIsLoading(false)
  }, [isConfigured])

  // Authenticate with MultiversX address
  const authenticate = useCallback(async (address: string): Promise<boolean> => {
    if (!isConfigured) return false

    try {
      const user = await signInWithMultiversX(address)
      if (user) {
        setIsAuthenticated(true)
        return true
      }
      return false
    } catch (err) {
      console.error('Authentication error:', err)
      setError('Failed to authenticate')
      return false
    }
  }, [isConfigured])

  // Auto-authenticate when address is available
  useEffect(() => {
    if (userAddress && isConfigured && !isAuthenticated) {
      authenticate(userAddress)
    }
  }, [userAddress, isConfigured, isAuthenticated, authenticate])

  // Update online status
  useEffect(() => {
    if (!userAddress || !isAuthenticated) return

    updateOnlineStatus(userAddress, true)

    // Set offline when leaving
    const handleBeforeUnload = () => {
      updateOnlineStatus(userAddress, false)
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      updateOnlineStatus(userAddress, false)
    }
  }, [userAddress, isAuthenticated])

  // Load channels
  useEffect(() => {
    if (!isConfigured || !isAuthenticated) return

    const loadChannels = async () => {
      const loadedChannels = await getChannels()
      setChannels(loadedChannels)
      if (!currentChannel && loadedChannels.length > 0) {
        setCurrentChannel(loadedChannels[0])
      }
    }

    loadChannels()
  }, [isConfigured, isAuthenticated])

  // Subscribe to messages when channel changes
  useEffect(() => {
    if (!isConfigured || !isAuthenticated || !currentChannel) return

    // Unsubscribe from previous channel
    if (messagesUnsubscribeRef.current) {
      messagesUnsubscribeRef.current()
    }

    // Subscribe to new channel
    messagesUnsubscribeRef.current = subscribeToMessages(
      currentChannel.id,
      (newMessages) => {
        setMessages(newMessages)
      }
    )

    return () => {
      if (messagesUnsubscribeRef.current) {
        messagesUnsubscribeRef.current()
      }
    }
  }, [isConfigured, isAuthenticated, currentChannel])

  // Subscribe to online users
  useEffect(() => {
    if (!isConfigured || !isAuthenticated) return

    onlineUsersUnsubscribeRef.current = subscribeToOnlineUsers((users) => {
      setOnlineUsers(users)
    })

    return () => {
      if (onlineUsersUnsubscribeRef.current) {
        onlineUsersUnsubscribeRef.current()
      }
    }
  }, [isConfigured, isAuthenticated])

  // Load private conversations
  useEffect(() => {
    if (!isConfigured || !isAuthenticated || !userAddress) return

    const loadConversations = async () => {
      const conversations = await getUserConversations(userAddress)
      setPrivateConversations(conversations)
    }

    loadConversations()
  }, [isConfigured, isAuthenticated, userAddress])

  // Subscribe to private chat messages
  useEffect(() => {
    if (!isConfigured || !isAuthenticated || !userAddress || !currentPrivateChat) return

    if (privateChatUnsubscribeRef.current) {
      privateChatUnsubscribeRef.current()
    }

    privateChatUnsubscribeRef.current = subscribeToPrivateMessages(
      userAddress,
      currentPrivateChat,
      (newMessages) => {
        setMessages(newMessages)
      }
    )

    return () => {
      if (privateChatUnsubscribeRef.current) {
        privateChatUnsubscribeRef.current()
      }
    }
  }, [isConfigured, isAuthenticated, userAddress, currentPrivateChat])

  // Send message to current channel
  const sendChannelMessage = useCallback(async (content: string): Promise<boolean> => {
    if (!userAddress || !currentChannel || !content.trim()) return false

    try {
      const result = await sendMessage(
        currentChannel.id,
        content.trim(),
        userAddress,
        formatAddress(userAddress)
      )
      return !!result
    } catch (err) {
      console.error('Error sending message:', err)
      setError('Failed to send message')
      return false
    }
  }, [userAddress, currentChannel])

  // Start private chat
  const startPrivateChat = useCallback((address: string) => {
    setCurrentPrivateChat(address)
    setCurrentChannel(null) // Clear channel selection
    setMessages([]) // Clear messages before loading private chat
  }, [])

  // Send private message
  const sendPrivateChatMessage = useCallback(async (content: string): Promise<boolean> => {
    if (!userAddress || !currentPrivateChat || !content.trim()) return false

    try {
      const result = await sendPrivateMessage(
        userAddress,
        currentPrivateChat,
        content.trim(),
        formatAddress(userAddress)
      )
      return !!result
    } catch (err) {
      console.error('Error sending private message:', err)
      setError('Failed to send message')
      return false
    }
  }, [userAddress, currentPrivateChat])

  // Close private chat
  const closePrivateChat = useCallback(() => {
    setCurrentPrivateChat(null)
    setCurrentChannel(channels[0] || DEFAULT_CHANNELS[0])
  }, [channels])

  // Clear error
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return {
    isConfigured,
    isAuthenticated,
    isLoading,
    error,
    channels,
    currentChannel,
    messages,
    onlineUsers,
    privateConversations,
    currentPrivateChat,
    setCurrentChannel,
    sendChannelMessage,
    startPrivateChat,
    sendPrivateChatMessage,
    closePrivateChat,
    authenticate,
    clearError
  }
}

export default useChat
