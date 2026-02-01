import { useState, useEffect } from 'react'
import { useVoiceRecorder } from '../../hooks/useVoiceRecorder'

interface VoiceRecorderProps {
  onSend: (audioBlob: Blob, duration: number) => void
  onCancel: () => void
  disabled?: boolean
}

export function VoiceRecorder({ onSend, onCancel, disabled }: VoiceRecorderProps) {
  const { isRecording, duration, startRecording, stopRecording, cancelRecording, error } = useVoiceRecorder()
  const [showRecorder, setShowRecorder] = useState(false)

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleStartRecording = async () => {
    const started = await startRecording()
    if (started) {
      setShowRecorder(true)
    }
  }

  const handleStopAndSend = async () => {
    const blob = await stopRecording()
    if (blob && duration > 0) {
      onSend(blob, duration)
    }
    setShowRecorder(false)
  }

  const handleCancel = () => {
    cancelRecording()
    setShowRecorder(false)
    onCancel()
  }

  if (showRecorder && isRecording) {
    return (
      <div className="flex items-center gap-3 bg-red-500/20 rounded-lg px-4 py-2 animate-pulse">
        {/* Recording indicator */}
        <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />

        {/* Duration */}
        <span className="text-white font-mono min-w-[50px]">{formatDuration(duration)}</span>

        {/* Waveform animation */}
        <div className="flex items-center gap-0.5 flex-1">
          {Array.from({ length: 30 }).map((_, i) => (
            <div
              key={i}
              className="w-1 bg-red-400 rounded-full animate-pulse"
              style={{
                height: `${8 + Math.sin(Date.now() / 100 + i) * 8 + Math.random() * 4}px`,
                animationDelay: `${i * 50}ms`
              }}
            />
          ))}
        </div>

        {/* Cancel button */}
        <button
          onClick={handleCancel}
          className="p-2 hover:bg-white/10 rounded-full transition text-gray-300 hover:text-white"
          title="Cancel"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Send button */}
        <button
          onClick={handleStopAndSend}
          className="p-2 bg-green-500 hover:bg-green-600 rounded-full transition text-white"
          title="Send"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
          </svg>
        </button>
      </div>
    )
  }

  // Microphone button
  return (
    <button
      onClick={handleStartRecording}
      disabled={disabled}
      className="p-3 bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition text-white"
      title="Record voice message"
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
      </svg>
      {error && <span className="text-red-400 text-xs">{error}</span>}
    </button>
  )
}

export default VoiceRecorder
