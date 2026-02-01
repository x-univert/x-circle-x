import { useState } from 'react'

// Common emoji categories
const EMOJI_CATEGORIES = {
  smileys: ['😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊', '😇', '🙂', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '😎', '🤓', '🧐'],
  gestures: ['👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✍️', '💪', '🦾', '🦿', '🦵', '🦶'],
  hearts: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '♥️'],
  objects: ['🎉', '🎊', '🎈', '🎁', '🏆', '🥇', '🥈', '🥉', '⚽', '🏀', '🎮', '🎲', '🎯', '🎨', '🎭', '🎪', '🎬', '🎤', '🎧', '🎵', '🎶', '🎹', '🎸', '🎺', '🎻', '🪘', '📱', '💻', '🖥️', '📷', '📹', '📺', '📻', '⏰', '💡', '🔦', '💰', '💵', '💎', '🔑', '🗝️'],
  nature: ['🌸', '🌺', '🌻', '🌹', '🌷', '🌱', '🌲', '🌳', '🌴', '🌵', '🍀', '🍁', '🍂', '🍃', '🌾', '🌿', '☘️', '🪴', '🌈', '☀️', '🌤️', '⛅', '🌥️', '☁️', '🌦️', '🌧️', '⛈️', '🌩️', '🌨️', '❄️', '☃️', '⛄', '🌬️', '💨', '🌪️', '🌫️', '🌊', '💧', '💦', '☔'],
  food: ['🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🍆', '🥑', '🥦', '🥬', '🥒', '🌶️', '🫑', '🌽', '🥕', '🫒', '🧄', '🧅', '🥔', '🍠', '🥐', '🥖', '🍕', '🍔', '🍟', '🌭', '🥪', '🌮', '🌯', '🫔', '🥙', '🧆', '🍜', '🍝', '🍣', '🍱', '🍛', '🍲', '🍚'],
  animals: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🙈', '🙉', '🙊', '🐔', '🐧', '🐦', '🐤', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🪱', '🐛', '🦋', '🐌', '🐞', '🐜', '🪰', '🪲', '🪳', '🦟', '🦗', '🕷️', '🦂', '🐢', '🐍', '🦎', '🦖', '🦕', '🐙', '🦑', '🦐', '🦞', '🦀', '🐡', '🐠', '🐟', '🐬', '🐳', '🐋', '🦈', '🐊'],
  travel: ['🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑', '🚒', '🚐', '🛻', '🚚', '🚛', '🚜', '🏍️', '🛵', '🚲', '🛴', '🚨', '🚔', '🚍', '🚘', '🚖', '✈️', '🛫', '🛬', '🛩️', '💺', '🚀', '🛸', '🚁', '🛶', '⛵', '🚤', '🛥️', '🛳️', '⛴️', '🚢', '🗼', '🏰', '🏯', '🏟️', '🎡', '🎢', '🎠']
}

interface EmojiPickerProps {
  onSelectEmoji: (emoji: string) => void
  position?: 'top' | 'bottom'
}

export function EmojiPicker({ onSelectEmoji, position = 'top' }: EmojiPickerProps) {
  const [activeCategory, setActiveCategory] = useState<keyof typeof EMOJI_CATEGORIES>('smileys')

  const categoryIcons: Record<keyof typeof EMOJI_CATEGORIES, string> = {
    smileys: '😀',
    gestures: '👋',
    hearts: '❤️',
    objects: '🎉',
    nature: '🌸',
    food: '🍎',
    animals: '🐶',
    travel: '🚗'
  }

  return (
    <div
      className={`absolute ${position === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'} left-0
        bg-gray-800 rounded-xl shadow-xl border border-white/10 z-20 w-72`}
    >
      {/* Category tabs */}
      <div className="flex border-b border-white/10 p-1">
        {Object.keys(EMOJI_CATEGORIES).map((category) => (
          <button
            key={category}
            onClick={() => setActiveCategory(category as keyof typeof EMOJI_CATEGORIES)}
            className={`flex-1 p-2 text-lg rounded transition ${
              activeCategory === category
                ? 'bg-purple-500/30'
                : 'hover:bg-white/10'
            }`}
          >
            {categoryIcons[category as keyof typeof EMOJI_CATEGORIES]}
          </button>
        ))}
      </div>

      {/* Emoji grid */}
      <div className="p-2 h-48 overflow-y-auto">
        <div className="grid grid-cols-8 gap-1">
          {EMOJI_CATEGORIES[activeCategory].map((emoji, index) => (
            <button
              key={`${emoji}-${index}`}
              onClick={() => onSelectEmoji(emoji)}
              className="w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded transition text-lg hover:scale-125"
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// Simple emoji button that toggles the picker
interface EmojiButtonProps {
  onSelectEmoji: (emoji: string) => void
  disabled?: boolean
}

export function EmojiButton({ onSelectEmoji, disabled }: EmojiButtonProps) {
  const [showPicker, setShowPicker] = useState(false)

  const handleSelectEmoji = (emoji: string) => {
    onSelectEmoji(emoji)
    // Don't close picker so user can add multiple emojis
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowPicker(!showPicker)}
        disabled={disabled}
        className="p-3 bg-white/10 hover:bg-white/20 disabled:opacity-50 rounded-lg transition text-white"
        title="Add emoji"
      >
        <span className="text-xl">😀</span>
      </button>

      {showPicker && (
        <>
          {/* Backdrop to close picker */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowPicker(false)}
          />
          <EmojiPicker onSelectEmoji={handleSelectEmoji} position="top" />
        </>
      )}
    </div>
  )
}

export default EmojiPicker
