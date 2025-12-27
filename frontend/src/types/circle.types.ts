// Types correspondant aux structures du smart contract

export enum CircleStatus {
  Forming = 'Forming',
  Active = 'Active',
  Completed = 'Completed',
  Cancelled = 'Cancelled'
}

export interface Circle {
  id: number;
  creator: string;
  members: string[];
  contributionAmount: string; // en EGLD
  cycleDuration: number; // en secondes
  maxMembers: number;
  currentCycle: number;
  rotationOrder: string[];
  cycleStartTimestamp: number;
  status: CircleStatus;
  currentContributions: string[];
}

export interface MembershipRequest {
  candidate: string;
  timestamp: number;
  votes: Vote[];
  yesVotes: number;
  noVotes: number;
}

export interface Vote {
  voter: string;
  approve: boolean;
}

export interface CreateCircleParams {
  name: string; // Nom du cercle
  contributionAmount: string; // en EGLD
  cycleDuration: number; // en secondes
  maxMembers: number;
}

// Helper pour convertir la durée en format lisible
export const formatCycleDuration = (seconds: number): string => {
  const days = Math.floor(seconds / 86400);
  if (days > 0) {
    return `${days} jour${days > 1 ? 's' : ''}`;
  }
  const hours = Math.floor(seconds / 3600);
  if (hours > 0) {
    return `${hours} heure${hours > 1 ? 's' : ''}`;
  }
  const minutes = Math.floor(seconds / 60);
  return `${minutes} minute${minutes > 1 ? 's' : ''}`;
};

// Helper pour formater le statut
export const getStatusLabel = (status: CircleStatus): string => {
  switch (status) {
    case CircleStatus.Forming:
      return 'Recrutement';
    case CircleStatus.Active:
      return 'En cours';
    case CircleStatus.Completed:
      return 'Terminé';
    case CircleStatus.Cancelled:
      return 'Annulé';
    default:
      return 'Inconnu';
  }
};

// Helper pour calculer le montant total distribué par cycle
export const calculateCycleTotal = (contributionAmount: string, memberCount: number): string => {
  const amount = parseFloat(contributionAmount);
  const total = amount * memberCount;

  // Soustraire les frais de protocole (3%)
  const feePercentage = 3 / 100;
  const netAmount = total * (1 - feePercentage);

  return netAmount.toFixed(4);
};
