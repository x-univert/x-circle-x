import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications, Notification, NotificationType } from 'hooks/useNotifications';

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'all' | 'transactions' | 'circles';

// Fonction pour détecter le thème
const getIsXCircleTheme = () => {
  if (typeof document !== 'undefined') {
    return document.documentElement.getAttribute('data-mvx-theme') === 'xcirclex';
  }
  return false;
};

export const NotificationCenter = ({ isOpen, onClose }: NotificationCenterProps) => {
  const navigate = useNavigate();
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll
  } = useNotifications();

  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [localNotifications, setLocalNotifications] = useState<Notification[]>(notifications);

  // Synchroniser avec les notifications du hook
  useEffect(() => {
    setLocalNotifications([...notifications]);
  }, [notifications, isOpen]);

  // Détecter le thème à chaque rendu
  const isXCircleTheme = getIsXCircleTheme();

  if (!isOpen) return null;

  // Couleurs selon le thème
  const colors = isXCircleTheme ? {
    panelBg: '#1a1033',
    headerBg: 'linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)',
    border: 'rgba(124, 58, 237, 0.3)',
    textPrimary: '#ffffff',
    textSecondary: '#e9d5ff',
    textMuted: '#c084fc',
    accent: '#ec4899',
    accentHover: '#f472b6',
    unreadBg: 'rgba(124, 58, 237, 0.2)',
    hoverBg: 'rgba(124, 58, 237, 0.3)',
    tabActive: '#ec4899',
    tabInactive: '#c084fc',
    dot: '#ec4899'
  } : {
    panelBg: '#111827',
    headerBg: 'linear-gradient(to right, #2563eb, #9333ea, #ec4899)',
    border: '#374151',
    textPrimary: '#f3f4f6',
    textSecondary: '#9ca3af',
    textMuted: '#6b7280',
    accent: '#3b82f6',
    accentHover: '#60a5fa',
    unreadBg: 'rgba(30, 58, 138, 0.2)',
    hoverBg: 'rgba(55, 65, 81, 1)',
    tabActive: '#3b82f6',
    tabInactive: '#9ca3af',
    dot: '#3b82f6'
  };

  const transactionNotifs = localNotifications.filter(n => n.type === NotificationType.Transaction);
  const circleNotifs = localNotifications.filter(n => n.type !== NotificationType.Transaction);

  const getDisplayedNotifications = (): Notification[] => {
    switch (activeTab) {
      case 'transactions':
        return transactionNotifs;
      case 'circles':
        return circleNotifs;
      default:
        return localNotifications;
    }
  };

  const displayedNotifs = getDisplayedNotifications();

  const handleNotificationClick = (notif: Notification) => {
    markAsRead(notif.id);
    if (notif.link) {
      if (notif.link.startsWith('http')) {
        window.open(notif.link, '_blank', 'noopener,noreferrer');
      } else {
        navigate(notif.link);
      }
      onClose();
    }
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'A l\'instant';
    if (minutes < 60) return `Il y a ${minutes}min`;
    if (hours < 24) return `Il y a ${hours}h`;
    if (days < 7) return `Il y a ${days}j`;
    return date.toLocaleDateString('fr-FR');
  };

  const getNotificationIcon = (notif: Notification) => {
    if (notif.icon) return notif.icon;

    switch (notif.type) {
      case NotificationType.Transaction:
        return '💳';
      case NotificationType.CircleCreated:
        return '🎉';
      case NotificationType.CircleJoined:
        return '👋';
      case NotificationType.CircleContribution:
        return '💰';
      case NotificationType.CircleDistribution:
        return '🎁';
      case NotificationType.MembershipRequested:
        return '📝';
      case NotificationType.MembershipApproved:
        return '✅';
      case NotificationType.MembershipRejected:
        return '❌';
      case NotificationType.VoteReceived:
        return '🗳️';
      case NotificationType.CycleCompleted:
        return '🔄';
      default:
        return '🔔';
    }
  };

  return (
    <>
      {/* Overlay */}
      <div
        className='fixed inset-0 bg-black/50'
        style={{ zIndex: 9998 }}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          height: '100vh',
          width: '384px',
          maxWidth: '100%',
          zIndex: 9999,
          backgroundColor: colors.panelBg,
          display: 'flex',
          flexDirection: 'column',
          boxShadow: isXCircleTheme ? '-10px 0 40px rgba(124, 58, 237, 0.3)' : '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          borderLeft: isXCircleTheme ? '1px solid rgba(124, 58, 237, 0.3)' : 'none'
        }}
      >
        {/* Header */}
        <div style={{ background: colors.headerBg, color: 'white', padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div className='flex items-center gap-3'>
            <span className='text-2xl'>🔔</span>
            <div>
              <h2 className='text-xl font-bold'>Notifications</h2>
              {unreadCount > 0 && (
                <p className='text-xs opacity-90'>{unreadCount} non lue{unreadCount > 1 ? 's' : ''}</p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className='text-white hover:bg-white/20 rounded-full p-2 transition-all'
          >
            <svg className='w-6 h-6' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M6 18L18 6M6 6l12 12' />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: `1px solid ${colors.border}` }}>
          <button
            onClick={() => setActiveTab('all')}
            style={{
              flex: 1,
              padding: '12px',
              fontSize: '0.875rem',
              fontWeight: 600,
              color: activeTab === 'all' ? colors.tabActive : colors.tabInactive,
              borderBottom: activeTab === 'all' ? `2px solid ${colors.tabActive}` : 'none',
              background: 'transparent'
            }}
          >
            Tout ({localNotifications.length})
          </button>
          <button
            onClick={() => setActiveTab('transactions')}
            style={{
              flex: 1,
              padding: '12px',
              fontSize: '0.875rem',
              fontWeight: 600,
              color: activeTab === 'transactions' ? colors.tabActive : colors.tabInactive,
              borderBottom: activeTab === 'transactions' ? `2px solid ${colors.tabActive}` : 'none',
              background: 'transparent'
            }}
          >
            Transactions ({transactionNotifs.length})
          </button>
          <button
            onClick={() => setActiveTab('circles')}
            style={{
              flex: 1,
              padding: '12px',
              fontSize: '0.875rem',
              fontWeight: 600,
              color: activeTab === 'circles' ? colors.tabActive : colors.tabInactive,
              borderBottom: activeTab === 'circles' ? `2px solid ${colors.tabActive}` : 'none',
              background: 'transparent'
            }}
          >
            Cercles ({circleNotifs.length})
          </button>
        </div>

        {/* Actions */}
        {localNotifications.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', borderBottom: `1px solid ${colors.border}` }}>
            <button
              onClick={markAllAsRead}
              style={{ fontSize: '0.75rem', color: colors.accent, fontWeight: 500, background: 'transparent' }}
            >
              Tout marquer comme lu
            </button>
            <button
              onClick={clearAll}
              style={{ fontSize: '0.75rem', color: '#f87171', fontWeight: 500, background: 'transparent' }}
            >
              Tout effacer
            </button>
          </div>
        )}

        {/* Notifications List */}
        <div
          style={{
            flex: '1 1 auto',
            overflowY: 'auto',
            minHeight: 0,
            backgroundColor: colors.panelBg
          }}
        >
          {displayedNotifs.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', textAlign: 'center', padding: '32px' }}>
              <span style={{ fontSize: '3.75rem', marginBottom: '16px' }}>🔕</span>
              <p style={{ color: colors.textSecondary }}>
                Aucune notification pour le moment
              </p>
            </div>
          ) : (
            <div>
              {displayedNotifs.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  style={{
                    padding: '16px',
                    cursor: 'pointer',
                    backgroundColor: !notif.read ? colors.unreadBg : 'transparent',
                    borderBottom: `1px solid ${colors.border}`
                  }}
                >
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <div style={{ flexShrink: 0 }}>
                      <span style={{ fontSize: '1.875rem' }}>{getNotificationIcon(notif)}</span>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                        <h4 style={{ fontWeight: 600, fontSize: '0.875rem', color: colors.textPrimary }}>
                          {notif.title}
                        </h4>
                        {!notif.read && (
                          <span style={{ flexShrink: 0, width: '8px', height: '8px', borderRadius: '50%', marginTop: '4px', backgroundColor: colors.dot }} />
                        )}
                      </div>
                      <p style={{ fontSize: '0.875rem', marginTop: '4px', color: colors.textSecondary }}>
                        {notif.message}
                      </p>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '8px' }}>
                        <span style={{ fontSize: '0.75rem', color: colors.textMuted }}>
                          {formatTimestamp(notif.timestamp)}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotification(notif.id);
                          }}
                          style={{ fontSize: '0.75rem', color: '#f87171', background: 'transparent' }}
                        >
                          Supprimer
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};
