import { useEffect, useState, useRef } from 'react';
import { useGetNetworkConfig, useGetAccountInfo } from 'lib';

export type TransactionStep = 'confirm' | 'pending' | 'processing' | 'success' | 'error';

interface TransactionModalProps {
  isOpen: boolean;
  step: TransactionStep;
  title: string;
  confirmTitle?: string;
  confirmDescription?: string;
  confirmDetails?: React.ReactNode;
  successTitle?: string;
  successMessage?: string;
  errorMessage?: string;
  transactionHash?: string;
  onConfirm: () => void;
  onClose: () => void;
  onSuccess?: () => void;
}

export const TransactionModal = ({
  isOpen,
  step,
  title,
  confirmTitle,
  confirmDescription,
  confirmDetails,
  successTitle = 'Transaction Reussie !',
  successMessage = 'Votre transaction a ete confirmee sur la blockchain.',
  errorMessage = 'Une erreur est survenue lors de la transaction.',
  transactionHash,
  onConfirm,
  onClose,
  onSuccess
}: TransactionModalProps) => {
  const { network } = useGetNetworkConfig();
  const { address: userAddress } = useGetAccountInfo();

  const [displayStep, setDisplayStep] = useState<TransactionStep>(step);
  const [retryCount, setRetryCount] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [txHash, setTxHash] = useState<string | null>(null);

  const intervalRef = useRef<number | null>(null);
  const isPollingRef = useRef(false);

  const apiUrl = network.apiAddress || 'https://devnet-api.multiversx.com';
  const explorerUrl = network.explorerAddress || 'https://devnet-explorer.multiversx.com';

  // Sync step prop
  useEffect(() => {
    setDisplayStep(step);
  }, [step]);

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setRetryCount(0);
      setErrorMsg('');
      setTxHash(transactionHash || null);
    }
  }, [isOpen, transactionHash]);

  // Main polling effect
  useEffect(() => {
    // Clear any existing interval
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Only poll when processing
    if (!isOpen || displayStep !== 'processing') {
      isPollingRef.current = false;
      return;
    }

    if (isPollingRef.current) return;
    isPollingRef.current = true;

    console.log('[Modal] Starting polling...');
    let count = 0;

    const doPoll = async () => {
      count++;
      setRetryCount(count);
      console.log(`[Modal] Poll #${count}`);

      try {
        let hashToCheck = txHash || transactionHash;

        // If no hash, search for latest tx
        if (!hashToCheck && userAddress) {
          const res = await fetch(`${apiUrl}/accounts/${userAddress}/transactions?size=3&order=desc`);
          if (res.ok) {
            const txs = await res.json();
            for (const tx of txs) {
              if (tx.timestamp && (Date.now() / 1000 - tx.timestamp) < 120) {
                hashToCheck = tx.txHash;
                setTxHash(tx.txHash);
                console.log('[Modal] Found tx:', tx.txHash, 'status:', tx.status);

                if (tx.status === 'success') {
                  setDisplayStep('success');
                  if (intervalRef.current) window.clearInterval(intervalRef.current);
                  onSuccess?.();
                  return;
                }
                if (tx.status === 'fail' || tx.status === 'invalid') {
                  setDisplayStep('error');
                  setErrorMsg('Transaction echouee');
                  if (intervalRef.current) window.clearInterval(intervalRef.current);
                  return;
                }
                break;
              }
            }
          }
        }

        // If we have a hash, check its status
        if (hashToCheck) {
          const res = await fetch(`${apiUrl}/transactions/${hashToCheck}`);
          if (res.ok) {
            const data = await res.json();
            console.log('[Modal] TX status:', data.status);

            if (data.status === 'success') {
              setDisplayStep('success');
              if (intervalRef.current) window.clearInterval(intervalRef.current);
              onSuccess?.();
              return;
            }
            if (data.status === 'fail' || data.status === 'invalid') {
              setDisplayStep('error');
              setErrorMsg('Transaction echouee');
              if (intervalRef.current) window.clearInterval(intervalRef.current);
              return;
            }
          }
        }

        // Timeout after 60 retries (3 min)
        if (count >= 60) {
          setDisplayStep('error');
          setErrorMsg('Timeout - verifiez l\'explorateur');
          if (intervalRef.current) window.clearInterval(intervalRef.current);
        }
      } catch (err) {
        console.error('[Modal] Poll error:', err);
      }
    };

    // First poll immediately
    doPoll();

    // Then every 3 seconds
    intervalRef.current = window.setInterval(doPoll, 3000);

    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      isPollingRef.current = false;
    };
  }, [isOpen, displayStep]); // Minimal dependencies

  if (!isOpen) return null;

  const effectiveHash = txHash || transactionHash;
  const progress = Math.min((retryCount / 20) * 100, 100);
  const elapsed = retryCount * 3;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">

      {/* CONFIRM */}
      {displayStep === 'confirm' && (
        <div className="bg-secondary rounded-2xl p-8 max-w-md w-full mx-4 border-2 border-secondary vibe-border">
          <div className="text-center mb-6">
            <div className="w-16 h-16 mx-auto mb-4 bg-purple-500/20 rounded-full flex items-center justify-center text-3xl">
              💳
            </div>
            <h3 className="text-2xl font-bold text-primary mb-2">{confirmTitle || title}</h3>
            <p className="text-secondary">{confirmDescription}</p>
          </div>
          {confirmDetails && <div className="mb-6">{confirmDetails}</div>}
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 bg-tertiary hover:bg-secondary text-primary font-semibold py-3 px-4 rounded-lg transition border border-secondary">
              Annuler
            </button>
            <button onClick={onConfirm} className="flex-1 bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white font-semibold py-3 px-4 rounded-lg transition">
              Confirmer
            </button>
          </div>
        </div>
      )}

      {/* PENDING - Waiting for signature */}
      {displayStep === 'pending' && (
        <div className="bg-secondary rounded-2xl p-8 max-w-md w-full mx-4 border-2 border-secondary vibe-border">
          <div className="text-center">
            <div className="w-20 h-20 mx-auto mb-6 relative">
              <div className="absolute inset-0 border-4 border-purple-500/30 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-transparent border-t-purple-500 rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center text-3xl">🔐</div>
            </div>
            <h3 className="text-2xl font-bold text-primary mb-2">Signature requise</h3>
            <p className="text-secondary mb-4">Signez la transaction dans votre wallet...</p>
            <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
              <p className="text-sm text-purple-300">💡 Ouvrez xPortal ou l'extension</p>
            </div>
          </div>
        </div>
      )}

      {/* PROCESSING - Waiting for confirmation */}
      {displayStep === 'processing' && (
        <div className="bg-secondary rounded-2xl p-8 max-w-md w-full mx-4 border-2 border-secondary vibe-border">
          <div className="text-center">
            <div className="w-20 h-20 mx-auto mb-6 relative">
              <div className="absolute inset-0 border-4 border-blue-500/30 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-transparent border-t-blue-500 rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center text-3xl">⚡</div>
            </div>
            <h3 className="text-2xl font-bold text-primary mb-2">Transaction en cours</h3>
            <p className="text-secondary mb-2">Validation sur la blockchain...</p>
            <p className="text-blue-400 text-sm mb-4">
              {elapsed}s - verification #{retryCount}
            </p>

            {effectiveHash && (
              <div className="bg-tertiary rounded-lg p-3 mb-4">
                <p className="text-xs text-secondary mb-1">Hash:</p>
                <a
                  href={`${explorerUrl}/transactions/${effectiveHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-400 hover:text-blue-300 font-mono break-all underline"
                >
                  {effectiveHash.slice(0, 16)}...{effectiveHash.slice(-8)}
                </a>
              </div>
            )}

            <div className="w-full bg-tertiary rounded-full h-3 overflow-hidden mb-2">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                style={{ width: `${progress}%`, transition: 'width 0.5s ease' }}
              />
            </div>
            <p className="text-xs text-secondary">Max 3 minutes</p>
          </div>
        </div>
      )}

      {/* SUCCESS */}
      {displayStep === 'success' && (
        <div className="bg-secondary rounded-2xl p-8 max-w-md w-full mx-4 border-2 border-green-500/30 vibe-border">
          <div className="text-center">
            <div className="w-20 h-20 mx-auto mb-6 bg-green-500 rounded-full flex items-center justify-center animate-bounce">
              <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-green-400 mb-2">{successTitle}</h3>
            <p className="text-secondary mb-6">{successMessage}</p>

            {effectiveHash && (
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 mb-6">
                <a
                  href={`${explorerUrl}/transactions/${effectiveHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-green-400 hover:text-green-300 font-mono break-all underline"
                >
                  Voir la transaction
                </a>
              </div>
            )}

            <button onClick={onClose} className="w-full bg-green-600 hover:bg-green-500 text-white font-semibold py-3 px-4 rounded-lg transition">
              Fermer
            </button>
          </div>
        </div>
      )}

      {/* ERROR */}
      {displayStep === 'error' && (
        <div className="bg-secondary rounded-2xl p-8 max-w-md w-full mx-4 border-2 border-red-500/30 vibe-border">
          <div className="text-center">
            <div className="w-20 h-20 mx-auto mb-6 bg-red-500 rounded-full flex items-center justify-center">
              <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-red-400 mb-2">Erreur</h3>
            <p className="text-secondary mb-6">{errorMsg || errorMessage}</p>

            {effectiveHash && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6">
                <a
                  href={`${explorerUrl}/transactions/${effectiveHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-red-400 hover:text-red-300 underline"
                >
                  Voir sur l'explorateur
                </a>
              </div>
            )}

            <button onClick={onClose} className="w-full bg-red-600 hover:bg-red-500 text-white font-semibold py-3 px-4 rounded-lg transition">
              Fermer
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionModal;
