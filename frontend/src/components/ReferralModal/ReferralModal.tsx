import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useFocusTrap } from 'hooks/useFocusTrap';
import { validateReferralCode } from '../../services/circleOfLifeService';

interface ReferralModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (referrerAddress: string | null) => void;
}

export const ReferralModal = ({ isOpen, onClose, onSubmit }: ReferralModalProps) => {
  const modalRef = useFocusTrap(isOpen);
  const clickOutsideRef = useRef<HTMLDivElement>(null);
  const { t } = useTranslation();

  const [code, setCode] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState('');
  const [validatedAddress, setValidatedAddress] = useState<string | null>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setCode('');
      setError('');
      setValidatedAddress(null);
      setIsValidating(false);
    }
  }, [isOpen]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (clickOutsideRef.current && !clickOutsideRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Close with Escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  // Validate code as user types (debounced)
  useEffect(() => {
    if (!code.trim()) {
      setError('');
      setValidatedAddress(null);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setIsValidating(true);
      setError('');

      try {
        const address = await validateReferralCode(code.trim());
        if (address) {
          setValidatedAddress(address);
          setError('');
        } else {
          setValidatedAddress(null);
          setError(t('referral.invalidCode', 'Code de parrainage invalide'));
        }
      } catch {
        setValidatedAddress(null);
        setError(t('referral.validationError', 'Erreur de validation'));
      } finally {
        setIsValidating(false);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [code, t]);

  const handleSubmit = () => {
    if (code.trim() && validatedAddress) {
      onSubmit(validatedAddress);
    } else if (!code.trim()) {
      // Skip without referral
      onSubmit(null);
    }
  };

  const handleSkip = () => {
    onSubmit(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Modal */}
      <div
        ref={(node) => {
          clickOutsideRef.current = node;
          if (modalRef && 'current' in modalRef) {
            (modalRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
          }
        }}
        className="relative bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-2xl shadow-2xl border border-purple-500/20 max-w-md w-full mx-4 overflow-hidden"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 p-6 border-b border-purple-500/20">
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <span className="text-3xl">🎁</span>
            {t('referral.title', 'Code de Parrainage')}
          </h2>
          <p className="text-gray-300 mt-2 text-sm">
            {t('referral.subtitle', 'Avez-vous un code de parrainage ? Votre parrain recevra +1% de bonus sur ses recompenses !')}
          </p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Input */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">
              {t('referral.inputLabel', 'Entrez votre code de parrainage')}
            </label>
            <div className="relative">
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="@herotag ou erd1..."
                className={`w-full px-4 py-3 bg-gray-800/50 border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 transition-all ${
                  error
                    ? 'border-red-500/50 focus:ring-red-500/50'
                    : validatedAddress
                    ? 'border-green-500/50 focus:ring-green-500/50'
                    : 'border-gray-600/50 focus:ring-purple-500/50'
                }`}
              />
              {/* Status indicator */}
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {isValidating && (
                  <div className="w-5 h-5 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
                )}
                {!isValidating && validatedAddress && (
                  <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
                {!isValidating && error && code.trim() && (
                  <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
              </div>
            </div>

            {/* Error message */}
            {error && code.trim() && (
              <p className="text-red-400 text-sm flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                {error}
              </p>
            )}

            {/* Success message */}
            {validatedAddress && (
              <p className="text-green-400 text-sm flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {t('referral.validCode', 'Code valide ! Parrain verifie.')}
              </p>
            )}
          </div>

          {/* Info box */}
          <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
            <h4 className="text-purple-300 font-medium mb-2 flex items-center gap-2">
              <span>💡</span>
              {t('referral.bonusInfo', 'Bonus de Parrainage')}
            </h4>
            <ul className="text-gray-300 text-sm space-y-1">
              <li>• {t('referral.bonus1', '1 parrainage = +1% bonus pour le parrain')}</li>
              <li>• {t('referral.bonus2', 'Maximum 360 parrainages = +360% bonus')}</li>
              <li>• {t('referral.bonus3', 'Bonus applique sur les recompenses XCIRCLEX')}</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-purple-500/20 bg-gray-900/50 flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleSkip}
            className="flex-1 px-4 py-3 bg-gray-700/50 hover:bg-gray-700 text-gray-300 rounded-lg font-medium transition-all"
          >
            {t('referral.skip', 'Passer')}
          </button>
          <button
            onClick={handleSubmit}
            disabled={isValidating || (code.trim() !== '' && !validatedAddress)}
            className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
              isValidating || (code.trim() !== '' && !validatedAddress)
                ? 'bg-purple-500/30 text-purple-300/50 cursor-not-allowed'
                : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white'
            }`}
          >
            {isValidating ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                {t('referral.validating', 'Validation...')}
              </>
            ) : (
              t('referral.continue', 'Continuer')
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReferralModal;
