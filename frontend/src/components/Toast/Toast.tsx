import { useEffect, useState } from 'react';
import { Toast as ToastType } from '../../contexts/ToastContext';

interface ToastProps {
  toast: ToastType;
  onClose: () => void;
}

export const Toast = ({ toast, onClose }: ToastProps) => {
  const [isExiting, setIsExiting] = useState(false);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      onClose();
    }, 300); // Animation duration
  };

  // Auto-close on duration
  useEffect(() => {
    if (toast.duration && toast.duration > 0) {
      const timer = setTimeout(() => {
        handleClose();
      }, toast.duration);

      return () => clearTimeout(timer);
    }
  }, [toast.duration]);

  const typeStyles = {
    success: {
      bg: 'bg-green-50 border-green-200',
      text: 'text-green-900',
      icon: '✅',
      iconBg: 'bg-green-100',
    },
    info: {
      bg: 'bg-blue-50 border-blue-200',
      text: 'text-blue-900',
      icon: 'ℹ️',
      iconBg: 'bg-blue-100',
    },
    warning: {
      bg: 'bg-yellow-50 border-yellow-200',
      text: 'text-yellow-900',
      icon: '⚠️',
      iconBg: 'bg-yellow-100',
    },
    error: {
      bg: 'bg-red-50 border-red-200',
      text: 'text-red-900',
      icon: '❌',
      iconBg: 'bg-red-100',
    },
  };

  const style = typeStyles[toast.type];

  // Format timestamp
  const timeAgo = () => {
    const seconds = Math.floor((Date.now() - toast.timestamp.getTime()) / 1000);
    if (seconds < 5) return "À l'instant";
    if (seconds < 60) return `Il y a ${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    return `Il y a ${minutes}min`;
  };

  return (
    <div
      className={`
        ${style.bg} ${style.text}
        border-2 rounded-lg shadow-lg p-4 mb-3 min-w-[320px] max-w-md
        transition-all duration-300 transform
        ${isExiting ? 'opacity-0 translate-x-full' : 'opacity-100 translate-x-0'}
      `}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className={`${style.iconBg} rounded-full p-2 flex-shrink-0`}>
          <span className="text-2xl leading-none">{style.icon}</span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h4 className="font-bold text-sm">{toast.title}</h4>
            <button
              onClick={handleClose}
              className="text-current opacity-60 hover:opacity-100 transition-opacity flex-shrink-0"
              aria-label="Fermer"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>

          {toast.message && (
            <p className="text-xs mt-1 opacity-90 break-words">{toast.message}</p>
          )}

          <p className="text-xs mt-2 opacity-60">{timeAgo()}</p>
        </div>
      </div>
    </div>
  );
};
