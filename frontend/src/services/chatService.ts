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
  setDoc
} from 'firebase/firestore'
import { signInAnonymously, onAuthStateChanged, User } from 'firebase/auth'
import { getFirebaseDb, getFirebaseAuth, isFirebaseConfigured, initializeFirebase } from '../config/firebase'

// Types
export interface ChatMessage {
  id: string
  sender: string // Display name or address
  senderAddress: string // MultiversX address
  content: string
  timestamp: Timestamp | null
  channelId: string
}

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
      const userRef = doc(db, 'users', userCredential.user.uid)
      await setDoc(userRef, {
        multiversxAddress: address,
        displayName: formatAddress(address),
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
export const updateOnlineStatus = async (address: string, isOnline: boolean): Promise<void> => {
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
      await updateDoc(doc(db, 'users', userDoc.id), {
        isOnline,
        lastSeen: serverTimestamp()
      })
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

// Send message
export const sendMessage = async (
  channelId: string,
  content: string,
  senderAddress: string,
  senderName?: string
): Promise<string | null> => {
  const db = getFirebaseDb()
  if (!db) return null

  try {
    const messagesRef = collection(db, `circles/${CIRCLE_ID}/messages/${channelId}/messages`)
    const docRef = await addDoc(messagesRef, {
      sender: senderName || formatAddress(senderAddress),
      senderAddress,
      content,
      timestamp: serverTimestamp(),
      channelId
    })
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
