import { useState } from 'react'
import { MediaAttachment } from '../../services/chatService'

interface MediaPreviewProps {
  media: MediaAttachment
}

export function MediaPreview({ media }: MediaPreviewProps) {
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  if (media.type === 'image') {
    return (
      <>
        <div className="mt-2 relative group">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/5 rounded-lg">
              <div className="animate-spin text-2xl">...</div>
            </div>
          )}
          <img
            src={media.url}
            alt={media.filename}
            className="max-w-full max-h-64 rounded-lg cursor-pointer hover:opacity-90 transition"
            onLoad={() => setIsLoading(false)}
            onClick={() => setIsFullscreen(true)}
          />
          <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition">
            <a
              href={media.url}
              download={media.filename}
              onClick={(e) => e.stopPropagation()}
              className="bg-black/50 hover:bg-black/70 text-white px-2 py-1 rounded text-xs flex items-center gap-1"
            >
              <span>Download</span>
            </a>
          </div>
        </div>

        {/* Fullscreen modal */}
        {isFullscreen && (
          <div
            className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
            onClick={() => setIsFullscreen(false)}
          >
            <button
              className="absolute top-4 right-4 text-white hover:text-gray-300 text-2xl"
              onClick={() => setIsFullscreen(false)}
            >
              X
            </button>
            <img
              src={media.url}
              alt={media.filename}
              className="max-w-full max-h-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}
      </>
    )
  }

  if (media.type === 'video') {
    return (
      <div className="mt-2">
        <video
          src={media.url}
          controls
          className="max-w-full max-h-64 rounded-lg"
        />
        <div className="text-xs text-gray-400 mt-1">
          {media.filename} - {formatFileSize(media.size)}
        </div>
      </div>
    )
  }

  // File type
  return (
    <a
      href={media.url}
      download={media.filename}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-2 flex items-center gap-3 bg-white/5 hover:bg-white/10 rounded-lg p-3 transition"
    >
      <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center text-xl">
        {media.mimeType === 'application/pdf' ? '📄' : '📎'}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm text-white truncate">{media.filename}</div>
        <div className="text-xs text-gray-400">{formatFileSize(media.size)}</div>
      </div>
      <div className="text-purple-400 text-sm">Download</div>
    </a>
  )
}

interface MediaUploadPreviewProps {
  file: File
  onRemove: () => void
  uploadProgress?: number
}

export function MediaUploadPreview({ file, onRemove, uploadProgress }: MediaUploadPreviewProps) {
  const [preview, setPreview] = useState<string | null>(null)

  // Generate preview for images
  if (file.type.startsWith('image/') && !preview) {
    const reader = new FileReader()
    reader.onload = (e) => setPreview(e.target?.result as string)
    reader.readAsDataURL(file)
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="relative bg-white/10 rounded-lg p-2 flex items-center gap-2">
      {/* Preview */}
      {preview ? (
        <img src={preview} alt={file.name} className="w-12 h-12 object-cover rounded" />
      ) : (
        <div className="w-12 h-12 bg-purple-500/20 rounded flex items-center justify-center text-xl">
          {file.type === 'application/pdf' ? '📄' : file.type.startsWith('video/') ? '🎬' : '📎'}
        </div>
      )}

      {/* File info */}
      <div className="flex-1 min-w-0">
        <div className="text-sm text-white truncate">{file.name}</div>
        <div className="text-xs text-gray-400">{formatFileSize(file.size)}</div>
        {uploadProgress !== undefined && uploadProgress > 0 && (
          <div className="mt-1 h-1 bg-white/20 rounded overflow-hidden">
            <div
              className="h-full bg-purple-500 transition-all"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        )}
      </div>

      {/* Remove button */}
      <button
        onClick={onRemove}
        className="text-gray-400 hover:text-white p-1"
        disabled={uploadProgress !== undefined && uploadProgress > 0}
      >
        X
      </button>
    </div>
  )
}

export default MediaPreview
