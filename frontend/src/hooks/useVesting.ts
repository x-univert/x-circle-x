import { useState, useEffect, useCallback } from 'react';
import { useGetAccountInfo, useGetPendingTransactions } from './sdkDappHooks';
import {
  release as releaseService,
  releaseAll as releaseAllService,
  getVestingStats,
  getAllBeneficiarySchedules,
  getReleasableAmount,
  getVestedAmount,
  getTimeUntilCliffEnd,
  getTimeUntilFullyVested,
  getCurrentEpoch,
  VestingSchedule,
  VestingStats
} from '../services/vestingService';

export interface VestingScheduleWithDetails extends VestingSchedule {
  vestedAmount: string;
  releasableAmount: string;
  timeUntilCliffEnd: number;
  timeUntilFullyVested: number;
  progressPercent: number;
  cliffEndEpoch: number;
  vestingEndEpoch: number;
}

export interface UseVestingReturn {
  // State
  isLoading: boolean;
  error: string | null;

  // Data
  schedules: VestingScheduleWithDetails[];
  stats: VestingStats | null;
  currentEpoch: number;
  totalReleasable: string;

  // Actions
  release: (scheduleId: number) => Promise<string[] | null>;
  releaseAll: () => Promise<string[] | null>;

  // Helpers
  refreshData: () => Promise<void>;
  clearError: () => void;
}

export const useVesting = (): UseVestingReturn => {
  const { address } = useGetAccountInfo();
  const { hasPendingTransactions } = useGetPendingTransactions();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [schedules, setSchedules] = useState<VestingScheduleWithDetails[]>([]);
  const [stats, setStats] = useState<VestingStats | null>(null);
  const [currentEpoch, setCurrentEpoch] = useState(0);
  const [totalReleasable, setTotalReleasable] = useState('0');

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const refreshData = useCallback(async () => {
    console.log('[useVesting] refreshData called, address:', address);
    if (!address) {
      console.log('[useVesting] No address, returning early');
      return;
    }

    setIsLoading(true);
    try {
      console.log('[useVesting] Fetching vesting data for:', address);
      // Fetch basic data
      const [vestingStats, epoch, baseSchedules] = await Promise.all([
        getVestingStats(),
        getCurrentEpoch(),
        getAllBeneficiarySchedules(address)
      ]);
      console.log('[useVesting] Base schedules received:', baseSchedules);

      setStats(vestingStats);
      setCurrentEpoch(epoch);

      // Enrich schedules with computed values
      const enrichedSchedules: VestingScheduleWithDetails[] = [];
      let totalReleasableSum = 0;

      for (const schedule of baseSchedules) {
        const [vestedAmount, releasableAmount, timeUntilCliffEnd, timeUntilFullyVested] = await Promise.all([
          getVestedAmount(schedule.scheduleId),
          getReleasableAmount(schedule.scheduleId),
          getTimeUntilCliffEnd(schedule.scheduleId),
          getTimeUntilFullyVested(schedule.scheduleId)
        ]);

        const cliffEndEpoch = schedule.startEpoch + schedule.cliffEpochs;
        const vestingEndEpoch = cliffEndEpoch + schedule.vestingDurationEpochs;

        // Calculate progress percentage
        let progressPercent = 0;
        if (epoch < cliffEndEpoch) {
          progressPercent = 0;
        } else if (epoch >= vestingEndEpoch) {
          progressPercent = 100;
        } else {
          const elapsed = epoch - cliffEndEpoch;
          progressPercent = (elapsed / schedule.vestingDurationEpochs) * 100;
        }

        enrichedSchedules.push({
          ...schedule,
          vestedAmount,
          releasableAmount,
          timeUntilCliffEnd,
          timeUntilFullyVested,
          progressPercent,
          cliffEndEpoch,
          vestingEndEpoch
        });

        totalReleasableSum += parseFloat(releasableAmount) || 0;
      }

      setSchedules(enrichedSchedules);
      setTotalReleasable(totalReleasableSum.toFixed(2));
    } catch (err) {
      console.error('Error refreshing vesting data:', err);
      setError('Erreur lors du chargement des donnees de vesting');
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

  const release = useCallback(async (scheduleId: number): Promise<string[] | null> => {
    if (!address) {
      setError('Wallet non connecte');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const txHashes = await releaseService(scheduleId, address);
      return txHashes;
    } catch (err: any) {
      console.error('Release error:', err);
      setError(err.message || 'Liberation echouee');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [address]);

  const releaseAll = useCallback(async (): Promise<string[] | null> => {
    if (!address) {
      setError('Wallet non connecte');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const txHashes = await releaseAllService(address);
      return txHashes;
    } catch (err: any) {
      console.error('Release all error:', err);
      setError(err.message || 'Liberation echouee');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [address]);

  return {
    // State
    isLoading,
    error,

    // Data
    schedules,
    stats,
    currentEpoch,
    totalReleasable,

    // Actions
    release,
    releaseAll,

    // Helpers
    refreshData,
    clearError
  };
};

export default useVesting;
