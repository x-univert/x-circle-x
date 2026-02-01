import { useState } from 'react'

interface ReactionPickerProps {
  reactions: string[]
  onSelectReaction: (emoji: string) => void
  position?: 'top' | 'bottom'
}

export function ReactionPicker({ reactions, onSelectReaction, position = 'top' }: ReactionPickerProps) {
  return (
    <div
      className={`absolute ${position === 'top' ? 'bottom-full mb-1' : 'top-full mt-1'} left-0
        flex items-center gap-1 bg-gray-800 rounded-full px-2 py-1 shadow-lg border border-white/10 z-10`}
    >
      {reactions.map((emoji) => (
        <button
          key={emoji}
          onClick={() => onSelectReaction(emoji)}
          className="w-7 h-7 flex items-center justify-center hover:bg-white/10 rounded-full transition text-lg hover:scale-125"
        >
          {emoji}
        </button>
      ))}
    </div>
  )
}

interface MessageReactionsProps {
  reactions: Record<string, string[]>
  userAddress: string
  onToggleReaction: (emoji: string) => void
}

export function MessageReactions({ reactions, userAddress, onToggleReaction }: MessageReactionsProps) {
  if (!reactions || Object.keys(reactions).length === 0) return null

  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {Object.entries(reactions).map(([emoji, users]) => {
        if (users.length === 0) return null
        const hasReacted = users.includes(userAddress)

        return (
          <button
            key={emoji}
            onClick={() => onToggleReaction(emoji)}
            className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition ${
              hasReacted
                ? 'bg-purple-500/30 border border-purple-500/50'
                : 'bg-white/10 border border-white/20 hover:bg-white/20'
            }`}
          >
            <span>{emoji}</span>
            <span className="text-gray-300">{users.length}</span>
          </button>
        )
      })}
    </div>
  )
}

export default ReactionPicker
