import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useGetAccount } from 'lib';
import { Notification, NotificationType } from 'hooks/useNotifications';

const STORAGE_KEY_PREFIX = 'xcircle_notifications_';

interface NotificationsContextType {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  deleteNotification: (id: string) => void;
  clearAll: () => void;
  getNotificationsByType: (type: NotificationType) => Notification[];
  getTransactionNotifications: () => Notification[];
  getCircleNotifications: () => Notification[];
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

export const NotificationsProvider = ({ children }: { children: ReactNode }) => {
  const { address } = useGetAccount();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadedAddress, setLoadedAddress] = useState<string | null>(null);

  // Charger les notifications depuis localStorage (une seule fois par adresse)
  useEffect(() => {
    if (address && address !== loadedAddress) {
      console.log('🔄 Loading notifications for address:', address);
      const storageKey = `${STORAGE_KEY_PREFIX}${address}`;
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          console.log('📥 Loaded notifications from localStorage:', parsed.length);
          setNotifications(parsed);
          updateUnreadCount(parsed);
          setLoadedAddress(address);
        } catch (err) {
          console.error('Error loading notifications:', err);
        }
      } else {
        console.log('📥 No saved notifications for this address');
        setNotifications([]);
        setLoadedAddress(address);
      }
    }
  }, [address, loadedAddress]);

  // Mettre à jour le compteur de non lus
  const updateUnreadCount = (notifs: Notification[]) => {
    const count = notifs.filter(n => !n.read).length;
    setUnreadCount(count);
  };

  // Sauvegarder les notifications
  const saveNotifications = (notifs: Notification[]) => {
    if (address) {
      const storageKey = `${STORAGE_KEY_PREFIX}${address}`;
      localStorage.setItem(storageKey, JSON.stringify(notifs));
      setNotifications(notifs);
      updateUnreadCount(notifs);
    }
  };

  // Ajouter une notification
  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const newNotif: Notification = {
      ...notification,
      id: `${Date.now()}_${Math.random()}`,
      timestamp: Date.now(),
      read: false
    };

    console.log('➕ Adding notification:', newNotif.title);

    setNotifications(prev => {
      console.log('📊 Current notifications count:', prev.length);
      const updated = [newNotif, ...prev];
      console.log('📊 Updated notifications count:', updated.length);

      // Sauvegarder dans localStorage
      if (address) {
        const storageKey = `${STORAGE_KEY_PREFIX}${address}`;
        localStorage.setItem(storageKey, JSON.stringify(updated));
        console.log('💾 Saved to localStorage:', storageKey);
      }
      updateUnreadCount(updated);
      return updated;
    });
  }, [address]);

  // Marquer une notification comme lue
  const markAsRead = (id: string) => {
    const updated = notifications.map(n =>
      n.id === id ? { ...n, read: true } : n
    );
    saveNotifications(updated);
  };

  // Marquer toutes comme lues
  const markAllAsRead = () => {
    const updated = notifications.map(n => ({ ...n, read: true }));
    saveNotifications(updated);
  };

  // Supprimer une notification
  const deleteNotification = (id: string) => {
    const updated = notifications.filter(n => n.id !== id);
    saveNotifications(updated);
  };

  // Supprimer toutes les notifications
  const clearAll = () => {
    saveNotifications([]);
  };

  // Filtrer par type
  const getNotificationsByType = (type: NotificationType) => {
    return notifications.filter(n => n.type === type);
  };

  // Obtenir les notifications de transaction
  const getTransactionNotifications = (): Notification[] => {
    return getNotificationsByType(NotificationType.Transaction);
  };

  // Obtenir les notifications de cercles
  const getCircleNotifications = (): Notification[] => {
    return notifications.filter(n =>
      n.type === NotificationType.CircleCreated ||
      n.type === NotificationType.CircleJoined ||
      n.type === NotificationType.CircleContribution ||
      n.type === NotificationType.CircleDistribution ||
      n.type === NotificationType.MembershipRequested ||
      n.type === NotificationType.MembershipApproved ||
      n.type === NotificationType.MembershipRejected ||
      n.type === NotificationType.VoteReceived ||
      n.type === NotificationType.CycleCompleted
    );
  };

  return (
    <NotificationsContext.Provider
      value={{
        notifications,
        unreadCount,
        addNotification,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        clearAll,
        getNotificationsByType,
        getTransactionNotifications,
        getCircleNotifications
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
};

export const useNotificationsContext = () => {
  const context = useContext(NotificationsContext);
  if (context === undefined) {
    throw new Error('useNotificationsContext must be used within a NotificationsProvider');
  }
  return context;
};
