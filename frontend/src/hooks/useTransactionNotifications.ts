import { useEffect, useRef, useCallback } from 'react';
import { useGetAccount, useGetNetworkConfig, useGetPendingTransactions, NotificationsFeedManager } from 'lib';
import { useNotifications, createTransactionNotification } from './useNotifications';

const NOTIFIED_TXS_KEY = 'xcircle_notified_transactions_';

/**
 * Hook qui utilise le NotificationsFeedManager du SDK pour récupérer les transactions
 * et les ajouter à notre système de notifications personnalisé
 */
export const useTransactionNotifications = () => {
  const { network } = useGetNetworkConfig();
  const { address } = useGetAccount();
  const { addNotification } = useNotifications();
  const { pendingTransactions } = useGetPendingTransactions();
  const previousPendingCount = useRef(0);

  // Charger les transactions déjà notifiées depuis localStorage
  const getNotifiedTransactions = useCallback((): Set<string> => {
    if (!address) return new Set();
    try {
      const stored = localStorage.getItem(`${NOTIFIED_TXS_KEY}${address}`);
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  }, [address]);

  // Sauvegarder les transactions notifiées
  const saveNotifiedTransaction = useCallback((key: string) => {
    if (!address) return;
    const notified = getNotifiedTransactions();
    notified.add(key);
    localStorage.setItem(`${NOTIFIED_TXS_KEY}${address}`, JSON.stringify([...notified]));
  }, [address, getNotifiedTransactions]);

  // Surveiller les transactions via NotificationsFeedManager
  useEffect(() => {
    if (!address) return;

    console.log('🔔 Transaction notification system active for:', address);

    const checkNotificationsFeed = () => {
      try {
        // Récupérer l'instance du NotificationsFeedManager
        const feedManager = NotificationsFeedManager.getInstance();

        // Accéder au store (state management) qui contient les vraies données
        const store = (feedManager as any).store;
        const storeState = store ? store.getState() : null;

        // Le store contient transactions sous forme: { [sessionId]: { transactions: [...], status: '...', ... } }
        const transactionsData = storeState?.transactions || {};

        console.log('🔔 Store transactions sessions:', Object.keys(transactionsData).length);

        // Parcourir toutes les sessions de transactions
        Object.entries(transactionsData).forEach(([sessionId, sessionData]: [string, any]) => {
          const txArray = sessionData?.transactions || [];
          const sessionStatus = sessionData?.status || 'pending';
          const displayInfo = sessionData?.transactionsDisplayInfo || {};

          txArray.forEach((tx: any) => {
            if (tx?.hash) {
              const txHash = tx.hash;
              const status = tx.status || sessionStatus;
              const key = `${txHash}-${status}`;

              // Ignorer les transactions "pending" - notifier seulement success/failed
              if (status === 'pending' || status === 'sent') {
                return;
              }

              // Vérifier si déjà notifié via localStorage
              const notified = getNotifiedTransactions();

              if (!notified.has(key)) {
                // Marquer comme notifié IMMÉDIATEMENT pour éviter les doublons
                saveNotifiedTransaction(key);

                const explorerUrl = `${network.explorerAddress}/transactions/${txHash}`;

                // Utiliser les messages personnalisés si disponibles
                const message =
                  status === 'success' || status === 'successful'
                    ? (displayInfo.successMessage || 'Transaction réussie!') :
                  status === 'failed' || status === 'invalid'
                    ? (displayInfo.errorMessage || 'Transaction échouée') :
                  'Transaction terminée';

                const notifStatus: 'success' | 'pending' | 'failed' =
                  (status === 'success' || status === 'successful') ? 'success' :
                  (status === 'failed' || status === 'invalid') ? 'failed' :
                  'pending';

                const notificationData = createTransactionNotification(txHash, notifStatus, message, explorerUrl);

                console.log('🔔 Creating notification:', {
                  txHash,
                  status: notifStatus,
                  message,
                  key
                });

                try {
                  addNotification(notificationData);
                  console.log('✅ Notification added successfully for key:', key);
                } catch (error) {
                  console.error('❌ Error adding notification:', error);
                }
              }
            }
          });
        });
      } catch (err) {
        console.error('🔔 Error accessing NotificationsFeedManager:', err);
      }
    };

    // Vérifier immédiatement
    checkNotificationsFeed();

    // Polling toutes les 2 secondes pour capturer les nouvelles transactions
    const interval = setInterval(checkNotificationsFeed, 2000);

    return () => {
      clearInterval(interval);
    };
  }, [address, network, addNotification, getNotifiedTransactions, saveNotifiedTransaction]);

  // Aussi surveiller les pendingTransactions comme backup
  useEffect(() => {
    if (!address || !pendingTransactions) return;

    const currentCount = Object.keys(pendingTransactions).length;

    // Nouvelle transaction détectée
    if (currentCount > previousPendingCount.current) {
      console.log('🔔 New pending transaction detected!', pendingTransactions);

      Object.entries(pendingTransactions).forEach(([sessionId, txs]: [string, any]) => {
        const transactions = Array.isArray(txs) ? txs : [txs];

        transactions.forEach((tx: any) => {
          if (tx?.hash) {
            const key = `${tx.hash}-pending`;
            const notified = getNotifiedTransactions();

            if (!notified.has(key)) {
              saveNotifiedTransaction(key);

              const explorerUrl = `${network.explorerAddress}/transactions/${tx.hash}`;

              console.log('🔔 Creating notification for pending tx:', tx.hash);

              addNotification(
                createTransactionNotification(tx.hash, 'pending', 'Transaction en cours...', explorerUrl)
              );
            }
          }
        });
      });
    }

    previousPendingCount.current = currentCount;
  }, [pendingTransactions, address, network, addNotification, getNotifiedTransactions, saveNotifiedTransaction]);

  return null;
};
