// Re-export du context pour la compatibilité
import { useNotificationsContext } from '../contexts/NotificationsContext';
import { explorerUrl as configExplorerUrl } from '../config';

export enum NotificationType {
  // Transactions
  Transaction = 'transaction',

  // Circles (xCircle specific)
  CircleCreated = 'circle_created',
  CircleJoined = 'circle_joined',
  CircleContribution = 'circle_contribution',
  CircleDistribution = 'circle_distribution',
  MembershipRequested = 'membership_requested',
  MembershipApproved = 'membership_approved',
  MembershipRejected = 'membership_rejected',
  VoteReceived = 'vote_received',
  CycleCompleted = 'cycle_completed'
}

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  link?: string;
  icon?: string;
  data?: any;
}

// Hook wrapper pour utiliser le context
export const useNotifications = () => {
  return useNotificationsContext();
};

// Helper functions pour créer des notifications spécifiques

// ============= TRANSACTIONS =============
export const createTransactionNotification = (txHash: string, status: 'success' | 'pending' | 'failed', message: string, explorerUrl?: string) => ({
  type: NotificationType.Transaction,
  title: status === 'success' ? 'Transaction reussie' : status === 'pending' ? 'Transaction en cours' : 'Transaction echouee',
  message: message,
  icon: status === 'success' ? '✅' : status === 'pending' ? '⏳' : '❌',
  link: explorerUrl || `${configExplorerUrl}/transactions/${txHash}`
});

// ============= CIRCLES =============
export const createCircleCreatedNotification = (circleId: number, circleName: string) => ({
  type: NotificationType.CircleCreated,
  title: 'Cercle cree',
  message: `Le cercle "${circleName}" a ete cree avec succes`,
  icon: '🎉',
  link: `/circles/${circleId}`
});

export const createCircleJoinedNotification = (circleId: number, circleName: string) => ({
  type: NotificationType.CircleJoined,
  title: 'Cercle rejoint',
  message: `Vous avez rejoint le cercle "${circleName}"`,
  icon: '👋',
  link: `/circles/${circleId}`
});

export const createContributionNotification = (circleId: number, circleName: string, amount: string) => ({
  type: NotificationType.CircleContribution,
  title: 'Contribution envoyee',
  message: `Vous avez contribue ${amount} EGLD au cercle "${circleName}"`,
  icon: '💰',
  link: `/circles/${circleId}`
});

export const createDistributionNotification = (circleId: number, circleName: string, amount: string, recipient: string) => ({
  type: NotificationType.CircleDistribution,
  title: 'Distribution effectuee',
  message: `${amount} EGLD distribue dans le cercle "${circleName}"`,
  icon: '🎁',
  link: `/circles/${circleId}`
});

export const createMembershipRequestNotification = (circleId: number, circleName: string, requesterAddress: string) => ({
  type: NotificationType.MembershipRequested,
  title: 'Demande d\'adhesion',
  message: `Nouvelle demande d'adhesion pour le cercle "${circleName}"`,
  icon: '📝',
  link: `/circles/${circleId}`
});

export const createMembershipApprovedNotification = (circleId: number, circleName: string) => ({
  type: NotificationType.MembershipApproved,
  title: 'Adhesion approuvee',
  message: `Votre demande d'adhesion au cercle "${circleName}" a ete acceptee!`,
  icon: '✅',
  link: `/circles/${circleId}`
});

export const createMembershipRejectedNotification = (circleId: number, circleName: string) => ({
  type: NotificationType.MembershipRejected,
  title: 'Adhesion refusee',
  message: `Votre demande d'adhesion au cercle "${circleName}" a ete refusee`,
  icon: '❌',
  link: `/circles/${circleId}`
});

export const createVoteReceivedNotification = (circleId: number, circleName: string, candidateAddress: string, approve: boolean) => ({
  type: NotificationType.VoteReceived,
  title: 'Vote enregistre',
  message: `Vote ${approve ? 'positif' : 'negatif'} enregistre pour le cercle "${circleName}"`,
  icon: approve ? '👍' : '👎',
  link: `/circles/${circleId}`
});

export const createCycleCompletedNotification = (circleId: number, circleName: string, cycleNumber: number) => ({
  type: NotificationType.CycleCompleted,
  title: 'Cycle termine',
  message: `Le cycle ${cycleNumber} du cercle "${circleName}" est termine`,
  icon: '🔄',
  link: `/circles/${circleId}`
});
