import { useState } from 'react'
import { ChatMessage } from '../../services/chatService'
import { ReactionPicker, MessageReactions } from './ReactionPicker'
import { MediaPreview } from './MediaPreview'
import { VoicePlayer } from './VoicePlayer'

interface UserProfile {
  displayName: string
  avatarUrl?: string
}

interface MessageBubbleProps {
  message: ChatMessage
  isOwn: boolean
  userAddress: string
  availableReactions: string[]
  senderProfile?: UserProfile
  onReply: (message: ChatMessage) => void
  onReaction: (messageId: string, emoji: string) => void
}

export function MessageBubble({
  message,
  isOwn,
  userAddress,
  availableReactions,
  senderProfile,
  onReply,
  onReaction
}: MessageBubbleProps) {
  const [showActions, setShowActions] = useState(false)
  const [showReactionPicker, setShowReactionPicker] = useState(false)

  const formatTime = (timestamp: any) => {
    if (!timestamp) return ''
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const handleReaction = (emoji: string) => {
    onReaction(message.id, emoji)
    setShowReactionPicker(false)
  }

  // Get display name - prefer profile displayName, then message sender, then truncated address
  const getDisplayName = () => {
    if (senderProfile?.displayName && senderProfile.displayName.trim()) {
      return senderProfile.displayName
    }
    if (message.sender && message.sender.trim() && !message.sender.startsWith('erd1')) {
      return message.sender
    }
    return `${message.senderAddress.slice(0, 8)}...${message.senderAddress.slice(-4)}`
  }

  const displayName = getDisplayName()

  // Generate avatar initials from display name
  const getInitials = (name: string): string => {
    if (!name || name.length === 0) return '??'

    // If it's an address format, use first 2 chars after erd1
    if (name.startsWith('erd1')) {
      return name.slice(4, 6).toUpperCase()
    }

    const cleanName = name.trim()
    const parts = cleanName.split(' ').filter(p => p.length > 0)

    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase()
    }

    return cleanName.slice(0, 2).toUpperCase()
  }

  // Avatar component - always renders with initials, shows image if available
  const Avatar = ({ isOwnMessage }: { isOwnMessage: boolean }) => {
    const avatarUrl = senderProfile?.avatarUrl
    const bgGradient = isOwnMessage
      ? 'from-green-500 to-teal-500'
      : 'from-purple-500 to-pink-500'
    const initials = getInitials(displayName)

    if (avatarUrl) {
      return (
        <div className={`flex-shrink-0 ${isOwnMessage ? 'ml-3' : 'mr-3'}`}>
          <img
            src={avatarUrl}
            alt={displayName}
            className="w-10 h-10 rounded-full object-cover border-2 border-purple-500/50 shadow-lg"
            onError={(e) => {
              // Hide broken image and show initials fallback
              e.currentTarget.style.display = 'none'
            }}
          />
        </div>
      )
    }

    return (
      <div className={`flex-shrink-0 ${isOwnMessage ? 'ml-3' : 'mr-3'}`}>
        <div
          className={`w-10 h-10 rounded-full bg-gradient-to-br ${bgGradient} flex items-center justify-center text-white text-sm font-bold border-2 border-white/30 shadow-lg`}
          title={displayName}
        >
          {initials}
        </div>
      </div>
    )
  }

  return (
    <div
      className={`flex items-start ${isOwn ? 'flex-row-reverse' : 'flex-row'} group`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => {
        setShowActions(false)
        setShowReactionPicker(false)
      }}
    >
      {/* Avatar - always shows */}
      <Avatar isOwnMessage={isOwn} />

      <div className="relative max-w-[70%]">
        {/* Action buttons */}
        {showActions && (
          <div
            className={`absolute top-0 ${isOwn ? 'right-full mr-2' : 'left-full ml-2'}
              flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity`}
          >
            {/* Reply button */}
            <button
              onClick={() => onReply(message)}
              className="p-1.5 bg-gray-700 hover:bg-gray-600 rounded text-gray-300 hover:text-white transition"
              title="Reply"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
            </button>

            {/* Reaction button */}
            <button
              onClick={() => setShowReactionPicker(!showReactionPicker)}
              className="p-1.5 bg-gray-700 hover:bg-gray-600 rounded text-gray-300 hover:text-white transition"
              title="Add reaction"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>

            {/* Reaction picker */}
            {showReactionPicker && (
              <div className="relative">
                <ReactionPicker
                  reactions={availableReactions}
                  onSelectReaction={handleReaction}
                  position="top"
                />
              </div>
            )}
          </div>
        )}

        {/* Message bubble */}
        <div
          className={`rounded-2xl px-4 py-2 ${
            isOwn
              ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
              : 'bg-white/10 text-white'
          }`}
        >
          {/* Sender name (for others' messages) */}
          {!isOwn && (
            <p className="text-xs text-purple-300 font-semibold mb-1">{displayName}</p>
          )}

          {/* Reply quote */}
          {message.replyTo && (
            <div className={`mb-2 pl-2 border-l-2 ${isOwn ? 'border-white/50' : 'border-purple-400'}`}>
              <p className={`text-xs ${isOwn ? 'text-white/70' : 'text-purple-300'} font-semibold`}>
                {message.replyTo.sender}
              </p>
              <p className={`text-xs ${isOwn ? 'text-white/60' : 'text-gray-400'} truncate`}>
                {message.replyTo.content}
              </p>
            </div>
          )}

          {/* Voice message */}
          {message.voice && (
            <VoicePlayer url={message.voice.url} duration={message.voice.duration} />
          )}

          {/* Media */}
          {message.media && <MediaPreview media={message.media} />}

          {/* Text content (hide if only voice) */}
          {(!message.voice || message.content !== '...Voice message') && (
            <p className="break-words whitespace-pre-wrap">{message.content}</p>
          )}

          {/* Timestamp */}
          <p className={`text-xs mt-1 ${isOwn ? 'text-purple-200' : 'text-gray-500'}`}>
            {formatTime(message.timestamp)}
          </p>
        </div>

        {/* Reactions */}
        {message.reactions && (
          <MessageReactions
            reactions={message.reactions}
            userAddress={userAddress}
            onToggleReaction={(emoji) => onReaction(message.id, emoji)}
          />
        )}
      </div>
    </div>
  )
}

export default MessageBubble
