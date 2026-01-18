import {
  collection,
  doc,
  addDoc,
  getDocs,
  getDoc,
  query,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  where,
  updateDoc,
  deleteDoc,
  setDoc,
  increment,
  startAfter
} from 'firebase/firestore'
import { getFirebaseDb, isFirebaseConfigured, initializeFirebase } from '../config/firebase'
import { formatAddress } from './chatService'

// Types
export interface ForumTopic {
  id: string
  title: string
  content: string
  author: string
  authorAddress: string
  createdAt: Timestamp | null
  updatedAt: Timestamp | null
  category: ForumCategory
  votes: number
  commentCount: number
  isPinned: boolean
  isLocked: boolean
}

export interface ForumComment {
  id: string
  topicId: string
  content: string
  author: string
  authorAddress: string
  createdAt: Timestamp | null
  votes: number
  parentCommentId?: string // For nested replies
}

export interface UserVote {
  topicId?: string
  commentId?: string
  vote: 'up' | 'down'
}

export enum ForumCategory {
  General = 'general',
  Proposal = 'proposal',
  Technical = 'technical',
  Trading = 'trading',
  OffTopic = 'off-topic',
  Announcement = 'announcement'
}

export const CATEGORY_INFO: Record<ForumCategory, { label: string; icon: string; color: string }> = {
  [ForumCategory.General]: { label: 'General', icon: '💬', color: 'bg-blue-500/20 text-blue-300' },
  [ForumCategory.Proposal]: { label: 'Proposals', icon: '📜', color: 'bg-purple-500/20 text-purple-300' },
  [ForumCategory.Technical]: { label: 'Technical', icon: '🔧', color: 'bg-cyan-500/20 text-cyan-300' },
  [ForumCategory.Trading]: { label: 'Trading', icon: '📈', color: 'bg-green-500/20 text-green-300' },
  [ForumCategory.OffTopic]: { label: 'Off-Topic', icon: '🎭', color: 'bg-gray-500/20 text-gray-300' },
  [ForumCategory.Announcement]: { label: 'Announcements', icon: '📢', color: 'bg-yellow-500/20 text-yellow-300' }
}

// Create a new topic
export const createTopic = async (
  title: string,
  content: string,
  authorAddress: string,
  category: ForumCategory,
  authorName?: string
): Promise<string | null> => {
  const db = getFirebaseDb()
  if (!db) return null

  try {
    const topicsRef = collection(db, 'dao/forum/topics')
    const docRef = await addDoc(topicsRef, {
      title,
      content,
      author: authorName || formatAddress(authorAddress),
      authorAddress,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      category,
      votes: 0,
      commentCount: 0,
      isPinned: false,
      isLocked: false
    })
    return docRef.id
  } catch (error) {
    console.error('Error creating topic:', error)
    return null
  }
}

// Get all topics
export const getTopics = async (
  category?: ForumCategory,
  limitCount: number = 20,
  lastTopic?: ForumTopic
): Promise<ForumTopic[]> => {
  const db = getFirebaseDb()
  if (!db) return []

  try {
    const topicsRef = collection(db, 'dao/forum/topics')
    let q = query(topicsRef, orderBy('isPinned', 'desc'), orderBy('createdAt', 'desc'), limit(limitCount))

    if (category) {
      q = query(topicsRef, where('category', '==', category), orderBy('isPinned', 'desc'), orderBy('createdAt', 'desc'), limit(limitCount))
    }

    if (lastTopic) {
      q = query(q, startAfter(lastTopic.createdAt))
    }

    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as ForumTopic))
  } catch (error) {
    console.error('Error getting topics:', error)
    return []
  }
}

// Get single topic
export const getTopic = async (topicId: string): Promise<ForumTopic | null> => {
  const db = getFirebaseDb()
  if (!db) return null

  try {
    const topicRef = doc(db, 'dao/forum/topics', topicId)
    const snapshot = await getDoc(topicRef)

    if (!snapshot.exists()) return null

    return {
      id: snapshot.id,
      ...snapshot.data()
    } as ForumTopic
  } catch (error) {
    console.error('Error getting topic:', error)
    return null
  }
}

// Subscribe to topics (real-time)
export const subscribeToTopics = (
  callback: (topics: ForumTopic[]) => void,
  category?: ForumCategory
): (() => void) => {
  const db = getFirebaseDb()
  if (!db) {
    callback([])
    return () => {}
  }

  const topicsRef = collection(db, 'dao/forum/topics')
  let q = query(topicsRef, orderBy('isPinned', 'desc'), orderBy('createdAt', 'desc'), limit(50))

  if (category) {
    q = query(topicsRef, where('category', '==', category), orderBy('isPinned', 'desc'), orderBy('createdAt', 'desc'), limit(50))
  }

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const topics: ForumTopic[] = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as ForumTopic))
    callback(topics)
  })

  return unsubscribe
}

// Add comment to topic
export const addComment = async (
  topicId: string,
  content: string,
  authorAddress: string,
  authorName?: string,
  parentCommentId?: string
): Promise<string | null> => {
  const db = getFirebaseDb()
  if (!db) return null

  try {
    const commentsRef = collection(db, `dao/forum/comments/${topicId}/comments`)
    const docRef = await addDoc(commentsRef, {
      topicId,
      content,
      author: authorName || formatAddress(authorAddress),
      authorAddress,
      createdAt: serverTimestamp(),
      votes: 0,
      parentCommentId: parentCommentId || null
    })

    // Update comment count on topic
    const topicRef = doc(db, 'dao/forum/topics', topicId)
    await updateDoc(topicRef, {
      commentCount: increment(1),
      updatedAt: serverTimestamp()
    })

    return docRef.id
  } catch (error) {
    console.error('Error adding comment:', error)
    return null
  }
}

// Get comments for topic
export const getComments = async (topicId: string): Promise<ForumComment[]> => {
  const db = getFirebaseDb()
  if (!db) return []

  try {
    const commentsRef = collection(db, `dao/forum/comments/${topicId}/comments`)
    const q = query(commentsRef, orderBy('createdAt', 'asc'))
    const snapshot = await getDocs(q)

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as ForumComment))
  } catch (error) {
    console.error('Error getting comments:', error)
    return []
  }
}

// Subscribe to comments (real-time)
export const subscribeToComments = (
  topicId: string,
  callback: (comments: ForumComment[]) => void
): (() => void) => {
  const db = getFirebaseDb()
  if (!db) {
    callback([])
    return () => {}
  }

  const commentsRef = collection(db, `dao/forum/comments/${topicId}/comments`)
  const q = query(commentsRef, orderBy('createdAt', 'asc'))

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const comments: ForumComment[] = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as ForumComment))
    callback(comments)
  })

  return unsubscribe
}

// Vote on topic
export const voteTopic = async (
  topicId: string,
  userAddress: string,
  voteType: 'up' | 'down'
): Promise<boolean> => {
  const db = getFirebaseDb()
  if (!db) return false

  try {
    // Check if user already voted
    const voteRef = doc(db, `dao/forum/votes/topics/${topicId}`, userAddress)
    const existingVote = await getDoc(voteRef)

    const topicRef = doc(db, 'dao/forum/topics', topicId)

    if (existingVote.exists()) {
      const oldVote = existingVote.data().vote as 'up' | 'down'

      if (oldVote === voteType) {
        // Remove vote
        await deleteDoc(voteRef)
        await updateDoc(topicRef, {
          votes: increment(voteType === 'up' ? -1 : 1)
        })
      } else {
        // Change vote
        await setDoc(voteRef, { vote: voteType, timestamp: serverTimestamp() })
        await updateDoc(topicRef, {
          votes: increment(voteType === 'up' ? 2 : -2)
        })
      }
    } else {
      // New vote
      await setDoc(voteRef, { vote: voteType, timestamp: serverTimestamp() })
      await updateDoc(topicRef, {
        votes: increment(voteType === 'up' ? 1 : -1)
      })
    }

    return true
  } catch (error) {
    console.error('Error voting on topic:', error)
    return false
  }
}

// Vote on comment
export const voteComment = async (
  topicId: string,
  commentId: string,
  userAddress: string,
  voteType: 'up' | 'down'
): Promise<boolean> => {
  const db = getFirebaseDb()
  if (!db) return false

  try {
    const voteRef = doc(db, `dao/forum/votes/comments/${commentId}`, userAddress)
    const existingVote = await getDoc(voteRef)

    const commentRef = doc(db, `dao/forum/comments/${topicId}/comments`, commentId)

    if (existingVote.exists()) {
      const oldVote = existingVote.data().vote as 'up' | 'down'

      if (oldVote === voteType) {
        await deleteDoc(voteRef)
        await updateDoc(commentRef, {
          votes: increment(voteType === 'up' ? -1 : 1)
        })
      } else {
        await setDoc(voteRef, { vote: voteType, timestamp: serverTimestamp() })
        await updateDoc(commentRef, {
          votes: increment(voteType === 'up' ? 2 : -2)
        })
      }
    } else {
      await setDoc(voteRef, { vote: voteType, timestamp: serverTimestamp() })
      await updateDoc(commentRef, {
        votes: increment(voteType === 'up' ? 1 : -1)
      })
    }

    return true
  } catch (error) {
    console.error('Error voting on comment:', error)
    return false
  }
}

// Get user's vote on topic
export const getUserTopicVote = async (topicId: string, userAddress: string): Promise<'up' | 'down' | null> => {
  const db = getFirebaseDb()
  if (!db) return null

  try {
    const voteRef = doc(db, `dao/forum/votes/topics/${topicId}`, userAddress)
    const snapshot = await getDoc(voteRef)

    if (!snapshot.exists()) return null
    return snapshot.data().vote as 'up' | 'down'
  } catch (error) {
    console.error('Error getting user vote:', error)
    return null
  }
}

// Delete topic (for moderation)
export const deleteTopic = async (topicId: string): Promise<boolean> => {
  const db = getFirebaseDb()
  if (!db) return false

  try {
    await deleteDoc(doc(db, 'dao/forum/topics', topicId))
    return true
  } catch (error) {
    console.error('Error deleting topic:', error)
    return false
  }
}

// Delete comment (for moderation)
export const deleteComment = async (topicId: string, commentId: string): Promise<boolean> => {
  const db = getFirebaseDb()
  if (!db) return false

  try {
    await deleteDoc(doc(db, `dao/forum/comments/${topicId}/comments`, commentId))

    // Update comment count
    const topicRef = doc(db, 'dao/forum/topics', topicId)
    await updateDoc(topicRef, {
      commentCount: increment(-1)
    })

    return true
  } catch (error) {
    console.error('Error deleting comment:', error)
    return false
  }
}

// Pin/Unpin topic (for moderation)
export const togglePinTopic = async (topicId: string, isPinned: boolean): Promise<boolean> => {
  const db = getFirebaseDb()
  if (!db) return false

  try {
    const topicRef = doc(db, 'dao/forum/topics', topicId)
    await updateDoc(topicRef, { isPinned })
    return true
  } catch (error) {
    console.error('Error toggling pin:', error)
    return false
  }
}

// Lock/Unlock topic (for moderation)
export const toggleLockTopic = async (topicId: string, isLocked: boolean): Promise<boolean> => {
  const db = getFirebaseDb()
  if (!db) return false

  try {
    const topicRef = doc(db, 'dao/forum/topics', topicId)
    await updateDoc(topicRef, { isLocked })
    return true
  } catch (error) {
    console.error('Error toggling lock:', error)
    return false
  }
}
