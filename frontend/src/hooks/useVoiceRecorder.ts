import { useState, useRef, useCallback, useEffect } from 'react'

interface UseVoiceRecorderReturn {
  isRecording: boolean
  duration: number
  audioBlob: Blob | null
  startRecording: () => Promise<boolean>
  stopRecording: () => Promise<Blob | null>
  cancelRecording: () => void
  error: string | null
}

export function useVoiceRecorder(): UseVoiceRecorderReturn {
  const [isRecording, setIsRecording] = useState(false)
  const [duration, setDuration] = useState(0)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [error, setError] = useState<string | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const startTimeRef = useRef<number>(0)

  // Cleanup function
  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    mediaRecorderRef.current = null
    chunksRef.current = []
  }, [])

  // Start recording
  const startRecording = useCallback(async (): Promise<boolean> => {
    try {
      setError(null)
      setAudioBlob(null)
      chunksRef.current = []

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        }
      })
      streamRef.current = stream

      // Determine supported MIME type
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/mp4'

      const mediaRecorder = new MediaRecorder(stream, { mimeType })
      mediaRecorderRef.current = mediaRecorder

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data)
        }
      }

      mediaRecorder.onerror = () => {
        setError('Recording error occurred')
        cleanup()
        setIsRecording(false)
      }

      mediaRecorder.start(100) // Collect data every 100ms
      setIsRecording(true)
      setDuration(0)
      startTimeRef.current = Date.now()

      // Start duration timer
      timerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000)
        setDuration(elapsed)
      }, 100)

      return true
    } catch (err) {
      console.error('Error starting recording:', err)
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          setError('Microphone access denied. Please allow microphone access.')
        } else if (err.name === 'NotFoundError') {
          setError('No microphone found.')
        } else {
          setError('Failed to start recording')
        }
      }
      cleanup()
      return false
    }
  }, [cleanup])

  // Stop recording
  const stopRecording = useCallback((): Promise<Blob | null> => {
    return new Promise((resolve) => {
      if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') {
        cleanup()
        setIsRecording(false)
        resolve(null)
        return
      }

      mediaRecorderRef.current.onstop = () => {
        const mimeType = mediaRecorderRef.current?.mimeType || 'audio/webm'
        const blob = new Blob(chunksRef.current, { type: mimeType })
        setAudioBlob(blob)
        cleanup()
        setIsRecording(false)
        resolve(blob)
      }

      mediaRecorderRef.current.stop()
    })
  }, [cleanup])

  // Cancel recording without saving
  const cancelRecording = useCallback(() => {
    cleanup()
    setIsRecording(false)
    setDuration(0)
    setAudioBlob(null)
  }, [cleanup])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup()
    }
  }, [cleanup])

  return {
    isRecording,
    duration,
    audioBlob,
    startRecording,
    stopRecording,
    cancelRecording,
    error
  }
}

export default useVoiceRecorder
