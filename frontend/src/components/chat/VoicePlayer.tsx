import { useState, useRef, useEffect } from 'react'

interface VoicePlayerProps {
  url: string
  duration: number
}

export function VoicePlayer({ url, duration }: VoicePlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [isLoaded, setIsLoaded] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    const audio = new Audio(url)
    audioRef.current = audio

    audio.addEventListener('loadedmetadata', () => {
      setIsLoaded(true)
    })

    audio.addEventListener('timeupdate', () => {
      setCurrentTime(audio.currentTime)
    })

    audio.addEventListener('ended', () => {
      setIsPlaying(false)
      setCurrentTime(0)
    })

    audio.addEventListener('error', () => {
      console.error('Error loading audio')
    })

    return () => {
      audio.pause()
      audio.src = ''
    }
  }, [url])

  const togglePlay = () => {
    if (!audioRef.current) return

    if (isPlaying) {
      audioRef.current.pause()
    } else {
      audioRef.current.play()
    }
    setIsPlaying(!isPlaying)
  }

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div className="flex items-center gap-3 bg-white/5 rounded-lg px-3 py-2 min-w-[180px]">
      {/* Play/Pause button */}
      <button
        onClick={togglePlay}
        disabled={!isLoaded}
        className="w-8 h-8 flex items-center justify-center bg-purple-500 hover:bg-purple-600 disabled:bg-gray-500 rounded-full transition text-white"
      >
        {isPlaying ? (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <rect x="6" y="4" width="4" height="16" />
            <rect x="14" y="4" width="4" height="16" />
          </svg>
        ) : (
          <svg className="w-4 h-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </button>

      {/* Waveform / Progress bar */}
      <div className="flex-1 flex flex-col gap-1">
        <div className="h-6 flex items-center gap-0.5">
          {/* Simple waveform visualization */}
          {Array.from({ length: 20 }).map((_, i) => {
            const isActive = (i / 20) * 100 <= progress
            const height = 8 + Math.sin(i * 0.8) * 8 + Math.random() * 4
            return (
              <div
                key={i}
                className={`w-1 rounded-full transition-all ${
                  isActive ? 'bg-purple-400' : 'bg-white/20'
                }`}
                style={{ height: `${height}px` }}
              />
            )
          })}
        </div>

        {/* Duration */}
        <div className="text-xs text-gray-400">
          {formatDuration(currentTime)} / {formatDuration(duration)}
        </div>
      </div>
    </div>
  )
}

export default VoicePlayer
