import { useState, useEffect, useCallback, useRef } from 'react'
import {
  ForumTopic,
  ForumComment,
  ForumCategory,
  createTopic,
  getTopics,
  getTopic,
  subscribeToTopics,
  addComment,
  getComments,
  subscribeToComments,
  voteTopic,
  voteComment,
  getUserTopicVote,
  deleteTopic,
  deleteComment,
  togglePinTopic,
  toggleLockTopic
} from '../services/forumService'
import { isFirebaseConfigured, initializeFirebase } from '../config/firebase'
import { formatAddress } from '../services/chatService'

interface UseForumReturn {
  // State
  isConfigured: boolean
  isLoading: boolean
  error: string | null
  topics: ForumTopic[]
  currentTopic: ForumTopic | null
  comments: ForumComment[]
  selectedCategory: ForumCategory | null

  // Actions
  loadTopics: (category?: ForumCategory) => Promise<void>
  selectTopic: (topicId: string) => Promise<void>
  closeTopic: () => void
  createNewTopic: (title: string, content: string, category: ForumCategory) => Promise<string | null>
  addNewComment: (content: string, parentCommentId?: string) => Promise<string | null>
  voteOnTopic: (topicId: string, voteType: 'up' | 'down') => Promise<boolean>
  voteOnComment: (commentId: string, voteType: 'up' | 'down') => Promise<boolean>
  setSelectedCategory: (category: ForumCategory | null) => void
  clearError: () => void

  // Moderation (for admins)
  deleteTopicById: (topicId: string) => Promise<boolean>
  deleteCommentById: (commentId: string) => Promise<boolean>
  pinTopic: (topicId: string, isPinned: boolean) => Promise<boolean>
  lockTopic: (topicId: string, isLocked: boolean) => Promise<boolean>
}

export function useForum(userAddress: string | undefined): UseForumReturn {
  const [isConfigured] = useState(() => isFirebaseConfigured())
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [topics, setTopics] = useState<ForumTopic[]>([])
  const [currentTopic, setCurrentTopic] = useState<ForumTopic | null>(null)
  const [comments, setComments] = useState<ForumComment[]>([])
  const [selectedCategory, setSelectedCategory] = useState<ForumCategory | null>(null)

  const topicsUnsubscribeRef = useRef<(() => void) | null>(null)
  const commentsUnsubscribeRef = useRef<(() => void) | null>(null)

  // Initialize Firebase if configured
  useEffect(() => {
    if (isConfigured) {
      initializeFirebase()
    }
    setIsLoading(false)
  }, [isConfigured])

  // Load topics
  const loadTopics = useCallback(async (category?: ForumCategory) => {
    if (!isConfigured) return

    setIsLoading(true)
    try {
      // Unsubscribe from previous subscription
      if (topicsUnsubscribeRef.current) {
        topicsUnsubscribeRef.current()
      }

      // Subscribe to topics
      topicsUnsubscribeRef.current = subscribeToTopics(
        (newTopics) => {
          setTopics(newTopics)
          setIsLoading(false)
        },
        category
      )
    } catch (err) {
      console.error('Error loading topics:', err)
      setError('Failed to load topics')
      setIsLoading(false)
    }
  }, [isConfigured])

  // Auto-load topics on mount
  useEffect(() => {
    if (isConfigured) {
      loadTopics(selectedCategory || undefined)
    }

    return () => {
      if (topicsUnsubscribeRef.current) {
        topicsUnsubscribeRef.current()
      }
    }
  }, [isConfigured, selectedCategory, loadTopics])

  // Select a topic to view
  const selectTopic = useCallback(async (topicId: string) => {
    if (!isConfigured) return

    setIsLoading(true)
    try {
      // Get topic details
      const topic = await getTopic(topicId)
      if (!topic) {
        setError('Topic not found')
        setIsLoading(false)
        return
      }

      setCurrentTopic(topic)

      // Unsubscribe from previous comments
      if (commentsUnsubscribeRef.current) {
        commentsUnsubscribeRef.current()
      }

      // Subscribe to comments
      commentsUnsubscribeRef.current = subscribeToComments(
        topicId,
        (newComments) => {
          setComments(newComments)
        }
      )

      setIsLoading(false)
    } catch (err) {
      console.error('Error selecting topic:', err)
      setError('Failed to load topic')
      setIsLoading(false)
    }
  }, [isConfigured])

  // Close current topic
  const closeTopic = useCallback(() => {
    setCurrentTopic(null)
    setComments([])

    if (commentsUnsubscribeRef.current) {
      commentsUnsubscribeRef.current()
      commentsUnsubscribeRef.current = null
    }
  }, [])

  // Create new topic
  const createNewTopic = useCallback(async (
    title: string,
    content: string,
    category: ForumCategory
  ): Promise<string | null> => {
    if (!userAddress || !title.trim() || !content.trim()) return null

    try {
      const topicId = await createTopic(
        title.trim(),
        content.trim(),
        userAddress,
        category,
        formatAddress(userAddress)
      )

      if (topicId) {
        // Refresh topics
        loadTopics(selectedCategory || undefined)
      }

      return topicId
    } catch (err) {
      console.error('Error creating topic:', err)
      setError('Failed to create topic')
      return null
    }
  }, [userAddress, selectedCategory, loadTopics])

  // Add comment
  const addNewComment = useCallback(async (
    content: string,
    parentCommentId?: string
  ): Promise<string | null> => {
    if (!userAddress || !currentTopic || !content.trim()) return null

    try {
      const commentId = await addComment(
        currentTopic.id,
        content.trim(),
        userAddress,
        formatAddress(userAddress),
        parentCommentId
      )

      return commentId
    } catch (err) {
      console.error('Error adding comment:', err)
      setError('Failed to add comment')
      return null
    }
  }, [userAddress, currentTopic])

  // Vote on topic
  const voteOnTopic = useCallback(async (
    topicId: string,
    voteType: 'up' | 'down'
  ): Promise<boolean> => {
    if (!userAddress) return false

    try {
      return await voteTopic(topicId, userAddress, voteType)
    } catch (err) {
      console.error('Error voting on topic:', err)
      setError('Failed to vote')
      return false
    }
  }, [userAddress])

  // Vote on comment
  const voteOnComment = useCallback(async (
    commentId: string,
    voteType: 'up' | 'down'
  ): Promise<boolean> => {
    if (!userAddress || !currentTopic) return false

    try {
      return await voteComment(currentTopic.id, commentId, userAddress, voteType)
    } catch (err) {
      console.error('Error voting on comment:', err)
      setError('Failed to vote')
      return false
    }
  }, [userAddress, currentTopic])

  // Delete topic
  const deleteTopicById = useCallback(async (topicId: string): Promise<boolean> => {
    try {
      const result = await deleteTopic(topicId)
      if (result && currentTopic?.id === topicId) {
        closeTopic()
      }
      return result
    } catch (err) {
      console.error('Error deleting topic:', err)
      setError('Failed to delete topic')
      return false
    }
  }, [currentTopic, closeTopic])

  // Delete comment
  const deleteCommentById = useCallback(async (commentId: string): Promise<boolean> => {
    if (!currentTopic) return false

    try {
      return await deleteComment(currentTopic.id, commentId)
    } catch (err) {
      console.error('Error deleting comment:', err)
      setError('Failed to delete comment')
      return false
    }
  }, [currentTopic])

  // Pin topic
  const pinTopic = useCallback(async (topicId: string, isPinned: boolean): Promise<boolean> => {
    try {
      return await togglePinTopic(topicId, isPinned)
    } catch (err) {
      console.error('Error pinning topic:', err)
      setError('Failed to pin topic')
      return false
    }
  }, [])

  // Lock topic
  const lockTopic = useCallback(async (topicId: string, isLocked: boolean): Promise<boolean> => {
    try {
      return await toggleLockTopic(topicId, isLocked)
    } catch (err) {
      console.error('Error locking topic:', err)
      setError('Failed to lock topic')
      return false
    }
  }, [])

  // Clear error
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (topicsUnsubscribeRef.current) {
        topicsUnsubscribeRef.current()
      }
      if (commentsUnsubscribeRef.current) {
        commentsUnsubscribeRef.current()
      }
    }
  }, [])

  return {
    isConfigured,
    isLoading,
    error,
    topics,
    currentTopic,
    comments,
    selectedCategory,
    loadTopics,
    selectTopic,
    closeTopic,
    createNewTopic,
    addNewComment,
    voteOnTopic,
    voteOnComment,
    setSelectedCategory,
    clearError,
    deleteTopicById,
    deleteCommentById,
    pinTopic,
    lockTopic
  }
}

export default useForum
