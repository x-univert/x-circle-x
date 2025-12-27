import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

export const NetworkStatus = () => {
  const { t } = useTranslation();
  const [isOnline, setIsOnline] = useState(true);
  const [showOfflineMessage, setShowOfflineMessage] = useState(false);

  useEffect(() => {
    // Initialiser l'état
    setIsOnline(navigator.onLine);

    // Handlers pour les événements online/offline
    const handleOnline = () => {
      console.log('✅ Connexion rétablie');
      setIsOnline(true);
      setShowOfflineMessage(false);
    };

    const handleOffline = () => {
      console.warn('⚠️ Connexion perdue');
      setIsOnline(false);
      setShowOfflineMessage(true);
    };

    // Écouter les événements
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Cleanup
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Ne rien afficher si en ligne
  if (isOnline && !showOfflineMessage) {
    return null;
  }

  return (
    <>
      {/* Message hors ligne */}
      {!isOnline && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-red-600 text-white py-3 px-4 shadow-lg animate-slideDown">
          <div className="container mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">📡</span>
              <div>
                <p className="font-bold">
                  {t('networkStatus.offline', 'Mode Hors Ligne')}
                </p>
                <p className="text-sm opacity-90">
                  {t('networkStatus.offlineMessage', 'Vous êtes déconnecté. Certaines fonctionnalités sont limitées.')}
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowOfflineMessage(false)}
              className="text-white hover:text-gray-200 transition-colors"
              aria-label="Fermer"
            >
              <span className="text-2xl">×</span>
            </button>
          </div>
        </div>
      )}

      {/* Message connexion rétablie */}
      {isOnline && showOfflineMessage && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-green-600 text-white py-3 px-4 shadow-lg animate-slideDown">
          <div className="container mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">✅</span>
              <div>
                <p className="font-bold">
                  {t('networkStatus.online', 'Connexion Rétablie')}
                </p>
                <p className="text-sm opacity-90">
                  {t('networkStatus.onlineMessage', 'Vous êtes de nouveau en ligne.')}
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowOfflineMessage(false)}
              className="text-white hover:text-gray-200 transition-colors"
              aria-label="Fermer"
            >
              <span className="text-2xl">×</span>
            </button>
          </div>
        </div>
      )}

      {/* Indicateur permanent dans le coin */}
      {!isOnline && (
        <div className="fixed bottom-4 right-4 z-40 bg-red-600 text-white rounded-full p-3 shadow-lg animate-pulse">
          <span className="text-xl">📡</span>
        </div>
      )}
    </>
  );
};
