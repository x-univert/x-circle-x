import {
  collection,
  doc,
  addDoc,
  getDocs,
  query,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  where,
  updateDoc,
  deleteDoc,
  getDoc,
  setDoc,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore'
import { signInAnonymously, onAuthStateChanged, User } from 'firebase/auth'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { getFirebaseDb, getFirebaseAuth, getFirebaseStorage, isFirebaseConfigured, isStorageConfigured, initializeFirebase } from '../config/firebase'
import { getLocalProfile } from './profileService'

// Types
export interface ReplyTo {
  messageId: string
  sender: string
  content: string
}

export interface MediaAttachment {
  type: 'image' | 'file' | 'video'
  url: string
  filename: string
  size: number
  mimeType: string
  thumbnailUrl?: string
}

export interface VoiceMessage {
  url: string
  duration: number
  waveform?: number[]
}

export interface ChatMessage {
  id: string
  sender: string // Display name or address
  senderAddress: string // MultiversX address
  content: string
  timestamp: Timestamp | null
  channelId: string
  replyTo?: ReplyTo
  reactions?: Record<string, string[]> // emoji -> list of addresses
  media?: MediaAttachment
  voice?: VoiceMessage
}

// Constants
export const AVAILABLE_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🔥']
export const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
export const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'video/mp4']

export interface ChatChannel {
  id: string
  name: string
  description: string
  icon: string
  isPrivate: boolean
}

export interface PrivateConversation {
  id: string
  participants: string[]
  lastMessage: string
  lastMessageTime: Timestamp | null
  unreadCount: Map<string, number>
}

export interface OnlineUser {
  address: string
  displayName: string
  lastSeen: Timestamp | null
  isOnline: boolean
}

// Default channels
export const DEFAULT_CHANNELS: ChatChannel[] = [
  { id: 'general', name: 'General', description: 'Discussion generale', icon: '💬', isPrivate: false },
  { id: 'aide', name: 'Aide', description: 'Questions et assistance', icon: '❓', isPrivate: false },
  { id: 'announcements', name: 'Annonces', description: 'Annonces officielles', icon: '📢', isPrivate: false },
  { id: 'trading', name: 'Trading', description: 'Discussion trading', icon: '📈', isPrivate: false }
]

// Circle ID (can be configured)
const CIRCLE_ID = 'xcirclex-main'

// Initialize Firebase auth with MultiversX address
export const signInWithMultiversX = async (address: string): Promise<User | null> => {
  if (!isFirebaseConfigured()) return null

  initializeFirebase()
  const auth = getFirebaseAuth()
  if (!auth) return null

  try {
    // Sign in anonymously
    const userCredential = await signInAnonymously(auth)

    // Store the MultiversX address in Firestore user profile
    const db = getFirebaseDb()
    if (db) {
      // Get display name from local profile if available
      const localProfile = getLocalProfile(address)
      const displayName = localProfile?.displayName && localProfile.displayName.trim()
        ? localProfile.displayName
        : formatAddress(address)

      const userRef = doc(db, 'users', userCredential.user.uid)
      await setDoc(userRef, {
        multiversxAddress: address,
        displayName,
        lastSeen: serverTimestamp(),
        isOnline: true
      }, { merge: true })
    }

    return userCredential.user
  } catch (error) {
    console.error('Error signing in with MultiversX:', error)
    return null
  }
}

// Update online status
export const updateOnlineStatus = async (address: string, isOnline: boolean, displayName?: string): Promise<void> => {
  const db = getFirebaseDb()
  if (!db) return

  try {
    const userQuery = query(
      collection(db, 'users'),
      where('multiversxAddress', '==', address)
    )
    const snapshot = await getDocs(userQuery)

    if (!snapshot.empty) {
      const userDoc = snapshot.docs[0]
      const updateData: Record<string, any> = {
        isOnline,
        lastSeen: serverTimestamp()
      }
      // Update displayName if provided and not empty
      if (displayName && displayName.trim()) {
        updateData.displayName = displayName
      }
      await updateDoc(doc(db, 'users', userDoc.id), updateData)
    }
  } catch (error) {
    console.error('Error updating online status:', error)
  }
}

// Get channels
export const getChannels = async (): Promise<ChatChannel[]> => {
  const db = getFirebaseDb()
  if (!db) return DEFAULT_CHANNELS

  try {
    const channelsRef = collection(db, `circles/${CIRCLE_ID}/channels`)
    const snapshot = await getDocs(channelsRef)

    if (snapshot.empty) {
      // Initialize default channels
      await initializeDefaultChannels()
      return DEFAULT_CHANNELS
    }

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as ChatChannel))
  } catch (error) {
    console.error('Error getting channels:', error)
    return DEFAULT_CHANNELS
  }
}

// Initialize default channels
const initializeDefaultChannels = async (): Promise<void> => {
  const db = getFirebaseDb()
  if (!db) return

  try {
    for (const channel of DEFAULT_CHANNELS) {
      const channelRef = doc(db, `circles/${CIRCLE_ID}/channels`, channel.id)
      await setDoc(channelRef, channel)
    }
  } catch (error) {
    console.error('Error initializing channels:', error)
  }
}

// Send message with optional reply
export const sendMessage = async (
  channelId: string,
  content: string,
  senderAddress: string,
  senderName?: string,
  replyTo?: ReplyTo
): Promise<string | null> => {
  const db = getFirebaseDb()
  if (!db) return null

  try {
    const messagesRef = collection(db, `circles/${CIRCLE_ID}/messages/${channelId}/messages`)
    const messageData: Record<string, any> = {
      sender: senderName || formatAddress(senderAddress),
      senderAddress,
      content,
      timestamp: serverTimestamp(),
      channelId
    }

    if (replyTo) {
      messageData.replyTo = {
        messageId: replyTo.messageId,
        sender: replyTo.sender,
        content: replyTo.content.substring(0, 50) + (replyTo.content.length > 50 ? '...' : '')
      }
    }

    const docRef = await addDoc(messagesRef, messageData)
    return docRef.id
  } catch (error) {
    console.error('Error sending message:', error)
    return null
  }
}

// Get messages with real-time updates
export const subscribeToMessages = (
  channelId: string,
  callback: (messages: ChatMessage[]) => void,
  messageLimit: number = 50
): (() => void) => {
  const db = getFirebaseDb()
  if (!db) {
    callback([])
    return () => {}
  }

  const messagesRef = collection(db, `circles/${CIRCLE_ID}/messages/${channelId}/messages`)
  const q = query(messagesRef, orderBy('timestamp', 'desc'), limit(messageLimit))

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const messages: ChatMessage[] = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as ChatMessage)).reverse()
    callback(messages)
  }, (error) => {
    console.error('Error subscribing to messages:', error)
    callback([])
  })

  return unsubscribe
}

// Send private message
export const sendPrivateMessage = async (
  fromAddress: string,
  toAddress: string,
  content: string,
  fromName?: string
): Promise<string | null> => {
  const db = getFirebaseDb()
  if (!db) return null

  try {
    // Create conversation ID (sorted addresses to ensure consistency)
    const participants = [fromAddress, toAddress].sort()
    const conversationId = participants.join('_')

    // Create or update conversation
    const conversationRef = doc(db, `circles/${CIRCLE_ID}/privateConversations`, conversationId)
    await setDoc(conversationRef, {
      participants,
      lastMessage: content,
      lastMessageTime: serverTimestamp()
    }, { merge: true })

    // Add message
    const messagesRef = collection(db, `circles/${CIRCLE_ID}/privateMessages/${conversationId}/messages`)
    const docRef = await addDoc(messagesRef, {
      sender: fromName || formatAddress(fromAddress),
      senderAddress: fromAddress,
      receiverAddress: toAddress,
      content,
      timestamp: serverTimestamp()
    })

    return docRef.id
  } catch (error) {
    console.error('Error sending private message:', error)
    return null
  }
}

// Subscribe to private messages
export const subscribeToPrivateMessages = (
  userAddress: string,
  otherAddress: string,
  callback: (messages: ChatMessage[]) => void
): (() => void) => {
  const db = getFirebaseDb()
  if (!db) {
    callback([])
    return () => {}
  }

  const participants = [userAddress, otherAddress].sort()
  const conversationId = participants.join('_')

  const messagesRef = collection(db, `circles/${CIRCLE_ID}/privateMessages/${conversationId}/messages`)
  const q = query(messagesRef, orderBy('timestamp', 'desc'), limit(50))

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const messages: ChatMessage[] = snapshot.docs.map(doc => ({
      id: doc.id,
      channelId: 'private',
      ...doc.data()
    } as ChatMessage)).reverse()
    callback(messages)
  })

  return unsubscribe
}

// Get user's conversations
export const getUserConversations = async (userAddress: string): Promise<PrivateConversation[]> => {
  const db = getFirebaseDb()
  if (!db) return []

  try {
    const conversationsRef = collection(db, `circles/${CIRCLE_ID}/privateConversations`)
    const q = query(conversationsRef, where('participants', 'array-contains', userAddress))
    const snapshot = await getDocs(q)

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as PrivateConversation))
  } catch (error) {
    console.error('Error getting conversations:', error)
    return []
  }
}

// Get online users
export const subscribeToOnlineUsers = (
  callback: (users: OnlineUser[]) => void
): (() => void) => {
  const db = getFirebaseDb()
  if (!db) {
    callback([])
    return () => {}
  }

  const usersRef = collection(db, 'users')
  const q = query(usersRef, where('isOnline', '==', true))

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const users: OnlineUser[] = snapshot.docs.map(doc => ({
      address: doc.data().multiversxAddress,
      displayName: doc.data().displayName,
      lastSeen: doc.data().lastSeen,
      isOnline: doc.data().isOnline
    }))
    callback(users)
  })

  return unsubscribe
}

// Delete message (for moderation)
export const deleteMessage = async (channelId: string, messageId: string): Promise<boolean> => {
  const db = getFirebaseDb()
  if (!db) return false

  try {
    await deleteDoc(doc(db, `circles/${CIRCLE_ID}/messages/${channelId}/messages`, messageId))
    return true
  } catch (error) {
    console.error('Error deleting message:', error)
    return false
  }
}

// Helper: Format address for display
export const formatAddress = (address: string): string => {
  if (!address) return 'Unknown'
  if (address.length <= 12) return address
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

// ============================================
// REACTIONS
// ============================================

// Add reaction to a message
export const addReaction = async (
  channelId: string,
  messageId: string,
  emoji: string,
  userAddress: string
): Promise<boolean> => {
  const db = getFirebaseDb()
  if (!db) return false

  try {
    const messageRef = doc(db, `circles/${CIRCLE_ID}/messages/${channelId}/messages`, messageId)
    await updateDoc(messageRef, {
      [`reactions.${emoji}`]: arrayUnion(userAddress)
    })
    return true
  } catch (error) {
    console.error('Error adding reaction:', error)
    return false
  }
}

// Remove reaction from a message
export const removeReaction = async (
  channelId: string,
  messageId: string,
  emoji: string,
  userAddress: string
): Promise<boolean> => {
  const db = getFirebaseDb()
  if (!db) return false

  try {
    const messageRef = doc(db, `circles/${CIRCLE_ID}/messages/${channelId}/messages`, messageId)
    await updateDoc(messageRef, {
      [`reactions.${emoji}`]: arrayRemove(userAddress)
    })
    return true
  } catch (error) {
    console.error('Error removing reaction:', error)
    return false
  }
}

// Toggle reaction (add if not present, remove if present)
export const toggleReaction = async (
  channelId: string,
  messageId: string,
  emoji: string,
  userAddress: string,
  currentReactions?: Record<string, string[]>
): Promise<boolean> => {
  const hasReaction = currentReactions?.[emoji]?.includes(userAddress)
  if (hasReaction) {
    return removeReaction(channelId, messageId, emoji, userAddress)
  }
  return addReaction(channelId, messageId, emoji, userAddress)
}

// ============================================
// MEDIA UPLOAD
// ============================================

// Upload media file to Firebase Storage
export const uploadMedia = async (
  channelId: string,
  file: File,
  senderAddress: string
): Promise<MediaAttachment> => {
  // Check if storage is configured
  if (!isStorageConfigured()) {
    throw new Error('Firebase Storage non configuré. Ajoutez VITE_FIREBASE_STORAGE_BUCKET dans votre fichier .env')
  }

  const storage = getFirebaseStorage()
  if (!storage) {
    throw new Error('Firebase Storage non initialisé. Vérifiez votre configuration Firebase.')
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error('Fichier trop volumineux (max 10MB)')
  }

  if (!ALLOWED_FILE_TYPES.includes(file.type)) {
    throw new Error(`Type de fichier non autorisé: ${file.type}. Types acceptés: JPEG, PNG, GIF, WebP, PDF, MP4`)
  }

  const timestamp = Date.now()
  const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
  const path = `chat/${channelId}/${senderAddress}/${timestamp}_${safeName}`

  try {
    console.log('Uploading media to:', path)
    const storageRef = ref(storage, path)
    await uploadBytes(storageRef, file)
    const url = await getDownloadURL(storageRef)
    console.log('Media uploaded successfully:', url)

    const type: 'image' | 'video' | 'file' = file.type.startsWith('image/')
      ? 'image'
      : file.type.startsWith('video/')
      ? 'video'
      : 'file'

    return {
      type,
      url,
      filename: file.name,
      size: file.size,
      mimeType: file.type
    }
  } catch (error: any) {
    console.error('Error uploading media:', error)
    if (error.code === 'storage/unauthorized') {
      throw new Error('Accès refusé. Vérifiez les règles Firebase Storage.')
    } else if (error.code === 'storage/canceled') {
      throw new Error('Upload annulé.')
    } else if (error.code === 'storage/unknown') {
      throw new Error('Erreur inconnue lors de l\'upload. Vérifiez votre connexion.')
    }
    throw new Error(`Erreur upload: ${error.message || 'Erreur inconnue'}`)
  }
}

// Send message with media attachment
export const sendMessageWithMedia = async (
  channelId: string,
  content: string,
  senderAddress: string,
  senderName: string,
  media: MediaAttachment,
  replyTo?: ReplyTo
): Promise<string | null> => {
  const db = getFirebaseDb()
  if (!db) return null

  try {
    const messagesRef = collection(db, `circles/${CIRCLE_ID}/messages/${channelId}/messages`)
    const messageData: Record<string, any> = {
      sender: senderName || formatAddress(senderAddress),
      senderAddress,
      content: content || (media.type === 'image' ? '📷 Photo' : media.type === 'video' ? '🎬 Video' : '📎 File'),
      timestamp: serverTimestamp(),
      channelId,
      media
    }

    if (replyTo) {
      messageData.replyTo = {
        messageId: replyTo.messageId,
        sender: replyTo.sender,
        content: replyTo.content.substring(0, 50) + (replyTo.content.length > 50 ? '...' : '')
      }
    }

    const docRef = await addDoc(messagesRef, messageData)
    return docRef.id
  } catch (error) {
    console.error('Error sending message with media:', error)
    return null
  }
}

// ============================================
// VOICE MESSAGES
// ============================================

// Upload voice message to Firebase Storage
export const uploadVoiceMessage = async (
  channelId: string,
  audioBlob: Blob,
  senderAddress: string
): Promise<string> => {
  // Check if storage is configured
  if (!isStorageConfigured()) {
    throw new Error('Firebase Storage non configuré. Ajoutez VITE_FIREBASE_STORAGE_BUCKET dans votre fichier .env')
  }

  const storage = getFirebaseStorage()
  if (!storage) {
    throw new Error('Firebase Storage non initialisé. Vérifiez votre configuration Firebase.')
  }

  const timestamp = Date.now()
  const path = `chat/${channelId}/${senderAddress}/voice_${timestamp}.webm`

  try {
    console.log('Uploading voice message to:', path)
    const storageRef = ref(storage, path)
    await uploadBytes(storageRef, audioBlob)
    const url = await getDownloadURL(storageRef)
    console.log('Voice message uploaded successfully:', url)
    return url
  } catch (error: any) {
    console.error('Error uploading voice message:', error)
    if (error.code === 'storage/unauthorized') {
      throw new Error('Accès refusé. Vérifiez les règles Firebase Storage.')
    } else if (error.code === 'storage/canceled') {
      throw new Error('Upload annulé.')
    }
    throw new Error(`Erreur upload audio: ${error.message || 'Erreur inconnue'}`)
  }
}

// Send voice message
export const sendVoiceMessage = async (
  channelId: string,
  senderAddress: string,
  senderName: string,
  voiceUrl: string,
  duration: number,
  replyTo?: ReplyTo
): Promise<string | null> => {
  const db = getFirebaseDb()
  if (!db) return null

  try {
    const messagesRef = collection(db, `circles/${CIRCLE_ID}/messages/${channelId}/messages`)
    const messageData: Record<string, any> = {
      sender: senderName || formatAddress(senderAddress),
      senderAddress,
      content: '🎤 Voice message',
      timestamp: serverTimestamp(),
      channelId,
      voice: {
        url: voiceUrl,
        duration
      }
    }

    if (replyTo) {
      messageData.replyTo = {
        messageId: replyTo.messageId,
        sender: replyTo.sender,
        content: replyTo.content.substring(0, 50) + (replyTo.content.length > 50 ? '...' : '')
      }
    }

    const docRef = await addDoc(messagesRef, messageData)
    return docRef.id
  } catch (error) {
    console.error('Error sending voice message:', error)
    return null
  }
}
