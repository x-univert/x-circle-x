import { useState, useEffect, useCallback, useRef } from 'react'
import {
  ChatMessage,
  ChatChannel,
  OnlineUser,
  PrivateConversation,
  ReplyTo,
  MediaAttachment,
  DEFAULT_CHANNELS,
  AVAILABLE_REACTIONS,
  getChannels,
  sendMessage,
  subscribeToMessages,
  sendPrivateMessage,
  subscribeToPrivateMessages,
  getUserConversations,
  subscribeToOnlineUsers,
  signInWithMultiversX,
  updateOnlineStatus,
  formatAddress,
  toggleReaction,
  uploadMedia,
  sendMessageWithMedia,
  uploadVoiceMessage,
  sendVoiceMessage
} from '../services/chatService'
import { isFirebaseConfigured, initializeFirebase } from '../config/firebase'
import { getLocalProfile } from '../services/profileService'

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
  replyingTo: ChatMessage | null
  isUploading: boolean
  uploadProgress: number

  // Actions
  setCurrentChannel: (channel: ChatChannel) => void
  sendChannelMessage: (content: string, replyTo?: ReplyTo) => Promise<boolean>
  startPrivateChat: (address: string) => void
  sendPrivateChatMessage: (content: string) => Promise<boolean>
  closePrivateChat: () => void
  authenticate: (address: string) => Promise<boolean>
  clearError: () => void
  // New actions
  setReplyingTo: (message: ChatMessage | null) => void
  handleReaction: (messageId: string, emoji: string, currentReactions?: Record<string, string[]>) => Promise<boolean>
  sendMediaMessage: (file: File, content?: string) => Promise<boolean>
  sendVoiceMsg: (audioBlob: Blob, duration: number) => Promise<boolean>
  availableReactions: string[]
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
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  const messagesUnsubscribeRef = useRef<(() => void) | null>(null)
  const onlineUsersUnsubscribeRef = useRef<(() => void) | null>(null)
  const privateChatUnsubscribeRef = useRef<(() => void) | null>(null)

  // Get user display name from profile or fallback to formatted address
  const getUserDisplayName = useCallback((address: string): string => {
    const profile = getLocalProfile(address)
    if (profile?.displayName && profile.displayName.trim()) {
      return profile.displayName
    }
    return formatAddress(address)
  }, [])

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

    // Update online status with user's display name
    const displayName = getUserDisplayName(userAddress)
    updateOnlineStatus(userAddress, true, displayName)

    // Set offline when leaving
    const handleBeforeUnload = () => {
      updateOnlineStatus(userAddress, false)
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      updateOnlineStatus(userAddress, false)
    }
  }, [userAddress, isAuthenticated, getUserDisplayName])

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
  const sendChannelMessage = useCallback(async (content: string, replyToData?: ReplyTo): Promise<boolean> => {
    if (!userAddress || !currentChannel || !content.trim()) return false

    try {
      const result = await sendMessage(
        currentChannel.id,
        content.trim(),
        userAddress,
        getUserDisplayName(userAddress),
        replyToData || (replyingTo ? {
          messageId: replyingTo.id,
          sender: replyingTo.sender,
          content: replyingTo.content
        } : undefined)
      )
      if (result) {
        setReplyingTo(null) // Clear reply after sending
      }
      return !!result
    } catch (err) {
      console.error('Error sending message:', err)
      setError('Failed to send message')
      return false
    }
  }, [userAddress, currentChannel, replyingTo, getUserDisplayName])

  // Handle reaction toggle
  const handleReaction = useCallback(async (
    messageId: string,
    emoji: string,
    currentReactions?: Record<string, string[]>
  ): Promise<boolean> => {
    if (!userAddress || !currentChannel) return false

    try {
      return await toggleReaction(
        currentChannel.id,
        messageId,
        emoji,
        userAddress,
        currentReactions
      )
    } catch (err) {
      console.error('Error toggling reaction:', err)
      setError('Failed to react')
      return false
    }
  }, [userAddress, currentChannel])

  // Send media message
  const sendMediaMessage = useCallback(async (file: File, content?: string): Promise<boolean> => {
    if (!userAddress || !currentChannel) return false

    try {
      setIsUploading(true)
      setUploadProgress(0)

      // Upload media
      setUploadProgress(30)
      const media = await uploadMedia(currentChannel.id, file, userAddress)
      setUploadProgress(70)

      // Send message with media
      const result = await sendMessageWithMedia(
        currentChannel.id,
        content || '',
        userAddress,
        getUserDisplayName(userAddress),
        media,
        replyingTo ? {
          messageId: replyingTo.id,
          sender: replyingTo.sender,
          content: replyingTo.content
        } : undefined
      )

      setUploadProgress(100)
      if (result) {
        setReplyingTo(null)
      }
      return !!result
    } catch (err) {
      console.error('Error sending media message:', err)
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Failed to send media')
      }
      return false
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
    }
  }, [userAddress, currentChannel, replyingTo, getUserDisplayName])

  // Send voice message
  const sendVoiceMsg = useCallback(async (audioBlob: Blob, duration: number): Promise<boolean> => {
    if (!userAddress || !currentChannel) return false

    try {
      setIsUploading(true)
      setUploadProgress(30)

      // Upload voice
      const voiceUrl = await uploadVoiceMessage(currentChannel.id, audioBlob, userAddress)
      setUploadProgress(70)

      // Send voice message
      const result = await sendVoiceMessage(
        currentChannel.id,
        userAddress,
        getUserDisplayName(userAddress),
        voiceUrl,
        duration,
        replyingTo ? {
          messageId: replyingTo.id,
          sender: replyingTo.sender,
          content: replyingTo.content
        } : undefined
      )

      setUploadProgress(100)
      if (result) {
        setReplyingTo(null)
      }
      return !!result
    } catch (err) {
      console.error('Error sending voice message:', err)
      setError('Failed to send voice message')
      return false
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
    }
  }, [userAddress, currentChannel, replyingTo, getUserDisplayName])

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
        getUserDisplayName(userAddress)
      )
      return !!result
    } catch (err) {
      console.error('Error sending private message:', err)
      setError('Failed to send message')
      return false
    }
  }, [userAddress, currentPrivateChat, getUserDisplayName])

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
    replyingTo,
    isUploading,
    uploadProgress,
    setCurrentChannel,
    sendChannelMessage,
    startPrivateChat,
    sendPrivateChatMessage,
    closePrivateChat,
    authenticate,
    clearError,
    setReplyingTo,
    handleReaction,
    sendMediaMessage,
    sendVoiceMsg,
    availableReactions: AVAILABLE_REACTIONS
  }
}

export default useChat
