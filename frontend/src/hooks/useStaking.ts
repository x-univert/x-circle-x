import { useState, useEffect, useCallback } from 'react';
import { useGetAccountInfo, useGetPendingTransactions } from './sdkDappHooks';
import {
  stake as stakeService,
  unstake as unstakeService,
  claimRewards as claimRewardsService,
  emergencyUnstake as emergencyUnstakeService,
  getStakingStats,
  getUserTokenBalance,
  getAllUserPositions,
  getPendingRewards,
  canUnstake,
  getTimeUntilUnlock,
  StakePosition,
  StakingStats
} from '../services/stakingService';
import { STAKING_LEVELS } from '../config/contracts';

export interface UseStakingReturn {
  // State
  isLoading: boolean;
  error: string | null;

  // Data
  positions: StakePosition[];
  stats: StakingStats | null;
  tokenBalance: string;
  stakingLevels: typeof STAKING_LEVELS;

  // Actions
  stake: (amount: string, lockLevel: number) => Promise<string[] | null>;
  unstake: (positionId: number) => Promise<string[] | null>;
  claimRewards: (positionId: number) => Promise<string[] | null>;
  emergencyUnstake: (positionId: number) => Promise<string[] | null>;

  // Helpers
  refreshData: () => Promise<void>;
  clearError: () => void;
  getPositionPendingRewards: (positionId: number) => Promise<string>;
  getPositionCanUnstake: (positionId: number) => Promise<boolean>;
  getPositionTimeUntilUnlock: (positionId: number) => Promise<number>;
}

export const useStaking = (): UseStakingReturn => {
  const { address } = useGetAccountInfo();
  const { hasPendingTransactions } = useGetPendingTransactions();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [positions, setPositions] = useState<StakePosition[]>([]);
  const [stats, setStats] = useState<StakingStats | null>(null);
  const [tokenBalance, setTokenBalance] = useState('0');

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const refreshData = useCallback(async () => {
    if (!address) return;

    setIsLoading(true);
    try {
      const [userPositions, stakingStats, balance] = await Promise.all([
        getAllUserPositions(address),
        getStakingStats(),
        getUserTokenBalance(address)
      ]);

      setPositions(userPositions);
      setStats(stakingStats);
      setTokenBalance(balance);
    } catch (err) {
      console.error('Error refreshing staking data:', err);
      setError('Failed to load staking data');
    } finally {
      setIsLoading(false);
    }
  }, [address]);

  // Refresh data when pending transactions complete
  useEffect(() => {
    if (!hasPendingTransactions) {
      const timer = setTimeout(() => {
        refreshData();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [hasPendingTransactions, refreshData]);

  // Initial load
  useEffect(() => {
    if (address) {
      refreshData();
    }
  }, [address, refreshData]);

  const stake = useCallback(async (amount: string, lockLevel: number): Promise<string[] | null> => {
    if (!address) {
      setError('Wallet not connected');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const txHashes = await stakeService(amount, lockLevel, address);
      return txHashes;
    } catch (err: any) {
      console.error('Staking error:', err);
      setError(err.message || 'Staking failed');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [address]);

  const unstake = useCallback(async (positionId: number): Promise<string[] | null> => {
    if (!address) {
      setError('Wallet not connected');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const txHashes = await unstakeService(positionId, address);
      return txHashes;
    } catch (err: any) {
      console.error('Unstaking error:', err);
      setError(err.message || 'Unstaking failed');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [address]);

  const claimRewards = useCallback(async (positionId: number): Promise<string[] | null> => {
    if (!address) {
      setError('Wallet not connected');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const txHashes = await claimRewardsService(positionId, address);
      return txHashes;
    } catch (err: any) {
      console.error('Claim rewards error:', err);
      setError(err.message || 'Claim rewards failed');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [address]);

  const emergencyUnstake = useCallback(async (positionId: number): Promise<string[] | null> => {
    if (!address) {
      setError('Wallet not connected');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const txHashes = await emergencyUnstakeService(positionId, address);
      return txHashes;
    } catch (err: any) {
      console.error('Emergency unstake error:', err);
      setError(err.message || 'Emergency unstake failed');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [address]);

  const getPositionPendingRewards = useCallback(async (positionId: number): Promise<string> => {
    if (!address) return '0';
    return await getPendingRewards(address, positionId);
  }, [address]);

  const getPositionCanUnstake = useCallback(async (positionId: number): Promise<boolean> => {
    if (!address) return false;
    return await canUnstake(address, positionId);
  }, [address]);

  const getPositionTimeUntilUnlock = useCallback(async (positionId: number): Promise<number> => {
    if (!address) return 0;
    return await getTimeUntilUnlock(address, positionId);
  }, [address]);

  return {
    // State
    isLoading,
    error,

    // Data
    positions,
    stats,
    tokenBalance,
    stakingLevels: STAKING_LEVELS,

    // Actions
    stake,
    unstake,
    claimRewards,
    emergencyUnstake,

    // Helpers
    refreshData,
    clearError,
    getPositionPendingRewards,
    getPositionCanUnstake,
    getPositionTimeUntilUnlock
  };
};

export default useStaking;
