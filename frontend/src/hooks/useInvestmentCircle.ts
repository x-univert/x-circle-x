import { useState, useEffect, useCallback } from 'react';
import { useGetAccountInfo, useGetPendingTransactions } from './sdkDappHooks';
import * as investmentCircleService from '../services/investmentCircleService';
import type {
  CircleInfo,
  MemberInfo
} from '../services/investmentCircleService';
import {
  ContributionFrequency,
  CircleStatus
} from '../services/investmentCircleService';

export interface UseInvestmentCircleReturn {
  // Loading states
  isLoading: boolean;
  isLoadingCircles: boolean;
  isLoadingUserCircles: boolean;
  error: string | null;

  // Data
  allCircles: CircleInfo[];
  userCircles: CircleInfo[];
  selectedCircle: CircleInfo | null;
  selectedCircleMembers: string[];
  userMemberInfo: MemberInfo | null;
  poolBalance: string;
  claimableCollateral: string;
  totalCircles: number;
  userEgldBalance: string;

  // Fair distribution info
  canStartFairly: boolean;
  payoutsPerMember: number;
  canJoinFairly: boolean;

  // Actions
  createCircle: (
    name: string,
    contributionAmount: string,
    frequency: ContributionFrequency,
    totalContributions: number,
    minMembers: number,
    maxMembers: number,
    description?: string
  ) => Promise<string[] | null>;
  joinCircle: (circleId: number) => Promise<string[] | null>;
  startCircle: (circleId: number) => Promise<string[] | null>;
  contribute: (circleId: number) => Promise<string[] | null>;
  processMissedContribution: (circleId: number, memberAddress: string) => Promise<string[] | null>;
  advancePeriod: (circleId: number) => Promise<string[] | null>;
  claimCollateral: (circleId: number) => Promise<string[] | null>;
  leaveCircle: (circleId: number) => Promise<string[] | null>;
  cancelCircle: (circleId: number) => Promise<string[] | null>;

  // Navigation
  selectCircle: (circleId: number | null) => void;

  // Refresh
  refreshAllCircles: () => Promise<void>;
  refreshUserCircles: () => Promise<void>;
  refreshSelectedCircle: () => Promise<void>;
}

export const useInvestmentCircle = (): UseInvestmentCircleReturn => {
  const { address: userAddress } = useGetAccountInfo();
  const { hasPendingTransactions } = useGetPendingTransactions();

  // Loading states
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingCircles, setIsLoadingCircles] = useState(false);
  const [isLoadingUserCircles, setIsLoadingUserCircles] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Data states
  const [allCircles, setAllCircles] = useState<CircleInfo[]>([]);
  const [userCircles, setUserCircles] = useState<CircleInfo[]>([]);
  const [selectedCircleId, setSelectedCircleId] = useState<number | null>(null);
  const [selectedCircle, setSelectedCircle] = useState<CircleInfo | null>(null);
  const [selectedCircleMembers, setSelectedCircleMembers] = useState<string[]>([]);
  const [userMemberInfo, setUserMemberInfo] = useState<MemberInfo | null>(null);
  const [poolBalance, setPoolBalance] = useState('0');
  const [claimableCollateral, setClaimableCollateral] = useState('0');
  const [totalCircles, setTotalCircles] = useState(0);
  const [userEgldBalance, setUserEgldBalance] = useState('0');

  // Fair distribution states
  const [canStartFairly, setCanStartFairly] = useState(false);
  const [payoutsPerMember, setPayoutsPerMember] = useState(0);
  const [canJoinFairly, setCanJoinFairly] = useState(false);

  // ============================================================================
  // LOAD FUNCTIONS
  // ============================================================================

  const refreshAllCircles = useCallback(async () => {
    setIsLoadingCircles(true);
    try {
      const [circles, total] = await Promise.all([
        investmentCircleService.getAllCircles(),
        investmentCircleService.getTotalCircles()
      ]);
      setAllCircles(circles);
      setTotalCircles(total);
    } catch (err: any) {
      console.error('Error loading circles:', err);
      setError(err.message || 'Failed to load circles');
    } finally {
      setIsLoadingCircles(false);
    }
  }, []);

  const refreshUserCircles = useCallback(async () => {
    if (!userAddress) {
      setUserCircles([]);
      return;
    }

    setIsLoadingUserCircles(true);
    try {
      const [circleIds, balance] = await Promise.all([
        investmentCircleService.getUserCircles(userAddress),
        investmentCircleService.getUserEgldBalance(userAddress)
      ]);

      setUserEgldBalance(balance);

      // Load circle info for each user circle
      const circleInfos: CircleInfo[] = [];
      for (const id of circleIds) {
        const info = await investmentCircleService.getCircleInfo(id);
        if (info) {
          circleInfos.push(info);
        }
      }
      setUserCircles(circleInfos);
    } catch (err: any) {
      console.error('Error loading user circles:', err);
      setError(err.message || 'Failed to load user circles');
    } finally {
      setIsLoadingUserCircles(false);
    }
  }, [userAddress]);

  const refreshSelectedCircle = useCallback(async () => {
    if (!selectedCircleId) {
      setSelectedCircle(null);
      setSelectedCircleMembers([]);
      setUserMemberInfo(null);
      setPoolBalance('0');
      setClaimableCollateral('0');
      setCanStartFairly(false);
      setPayoutsPerMember(0);
      setCanJoinFairly(false);
      return;
    }

    setIsLoading(true);
    try {
      const [circleInfo, members, pool, canStart, payouts, canJoin] = await Promise.all([
        investmentCircleService.getCircleInfo(selectedCircleId),
        investmentCircleService.getCircleMembers(selectedCircleId),
        investmentCircleService.getPoolBalance(selectedCircleId),
        investmentCircleService.canStartCircle(selectedCircleId),
        investmentCircleService.getPayoutsPerMember(selectedCircleId),
        investmentCircleService.canJoinFairly(selectedCircleId)
      ]);

      setSelectedCircle(circleInfo);
      setSelectedCircleMembers(members);
      setPoolBalance(pool);
      setCanStartFairly(canStart);
      setPayoutsPerMember(payouts);
      setCanJoinFairly(canJoin);

      // Load user-specific data if connected
      if (userAddress && members.includes(userAddress)) {
        const [memberInfo, claimable] = await Promise.all([
          investmentCircleService.getMemberInfo(selectedCircleId, userAddress),
          investmentCircleService.getClaimableCollateral(selectedCircleId, userAddress)
        ]);
        setUserMemberInfo(memberInfo);
        setClaimableCollateral(claimable);
      } else {
        setUserMemberInfo(null);
        setClaimableCollateral('0');
      }
    } catch (err: any) {
      console.error('Error loading selected circle:', err);
      setError(err.message || 'Failed to load circle details');
    } finally {
      setIsLoading(false);
    }
  }, [selectedCircleId, userAddress]);

  // ============================================================================
  // EFFECTS
  // ============================================================================

  // Load all circles on mount
  useEffect(() => {
    refreshAllCircles();
  }, [refreshAllCircles]);

  // Load user circles when address changes
  useEffect(() => {
    refreshUserCircles();
  }, [refreshUserCircles]);

  // Refresh selected circle when it changes
  useEffect(() => {
    refreshSelectedCircle();
  }, [refreshSelectedCircle]);

  // Refresh data after transactions complete
  useEffect(() => {
    if (!hasPendingTransactions) {
      const timer = setTimeout(() => {
        refreshAllCircles();
        refreshUserCircles();
        if (selectedCircleId) {
          refreshSelectedCircle();
        }
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [hasPendingTransactions, refreshAllCircles, refreshUserCircles, refreshSelectedCircle, selectedCircleId]);

  // ============================================================================
  // ACTIONS
  // ============================================================================

  const createCircle = useCallback(async (
    name: string,
    contributionAmount: string,
    frequency: ContributionFrequency,
    totalContributions: number,
    minMembers: number,
    maxMembers: number,
    description?: string
  ): Promise<string[] | null> => {
    if (!userAddress) {
      setError('Please connect your wallet');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Get current total to predict next circle ID
      const currentTotal = await investmentCircleService.getTotalCircles();
      const newCircleId = currentTotal + 1;

      const hashes = await investmentCircleService.createCircle(
        name,
        contributionAmount,
        frequency,
        totalContributions,
        minMembers,
        maxMembers,
        userAddress
      );

      // Save description locally if provided
      if (description && description.trim()) {
        investmentCircleService.saveCircleDescription(newCircleId, description.trim());
      }

      return hashes;
    } catch (err: any) {
      setError(err.message || 'Failed to create circle');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [userAddress]);

  const joinCircle = useCallback(async (circleId: number): Promise<string[] | null> => {
    if (!userAddress) {
      setError('Please connect your wallet');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const requiredCollateral = await investmentCircleService.getRequiredCollateral(circleId);
      const hashes = await investmentCircleService.joinCircle(circleId, requiredCollateral, userAddress);
      return hashes;
    } catch (err: any) {
      setError(err.message || 'Failed to join circle');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [userAddress]);

  const startCircle = useCallback(async (circleId: number): Promise<string[] | null> => {
    if (!userAddress) {
      setError('Please connect your wallet');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const hashes = await investmentCircleService.startCircle(circleId, userAddress);
      return hashes;
    } catch (err: any) {
      setError(err.message || 'Failed to start circle');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [userAddress]);

  const contribute = useCallback(async (circleId: number): Promise<string[] | null> => {
    if (!userAddress) {
      setError('Please connect your wallet');
      return null;
    }

    if (!selectedCircle) {
      setError('Circle not loaded');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const hashes = await investmentCircleService.contribute(
        circleId,
        selectedCircle.contributionAmount,
        userAddress
      );
      return hashes;
    } catch (err: any) {
      setError(err.message || 'Contribution failed');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [userAddress, selectedCircle]);

  const processMissedContribution = useCallback(async (
    circleId: number,
    memberAddress: string
  ): Promise<string[] | null> => {
    if (!userAddress) {
      setError('Please connect your wallet');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const hashes = await investmentCircleService.processMissedContribution(
        circleId,
        memberAddress,
        userAddress
      );
      return hashes;
    } catch (err: any) {
      setError(err.message || 'Failed to process missed contribution');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [userAddress]);

  const advancePeriod = useCallback(async (circleId: number): Promise<string[] | null> => {
    if (!userAddress) {
      setError('Please connect your wallet');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const hashes = await investmentCircleService.advancePeriod(circleId, userAddress);
      return hashes;
    } catch (err: any) {
      setError(err.message || 'Failed to advance period');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [userAddress]);

  const claimCollateralAction = useCallback(async (circleId: number): Promise<string[] | null> => {
    if (!userAddress) {
      setError('Please connect your wallet');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const hashes = await investmentCircleService.claimCollateral(circleId, userAddress);
      return hashes;
    } catch (err: any) {
      setError(err.message || 'Failed to claim collateral');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [userAddress]);

  const leaveCircle = useCallback(async (circleId: number): Promise<string[] | null> => {
    if (!userAddress) {
      setError('Please connect your wallet');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const hashes = await investmentCircleService.leaveCircle(circleId, userAddress);
      return hashes;
    } catch (err: any) {
      setError(err.message || 'Failed to leave circle');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [userAddress]);

  const cancelCircle = useCallback(async (circleId: number): Promise<string[] | null> => {
    if (!userAddress) {
      setError('Please connect your wallet');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const hashes = await investmentCircleService.cancelCircle(circleId, userAddress);
      return hashes;
    } catch (err: any) {
      setError(err.message || 'Failed to cancel circle');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [userAddress]);

  const selectCircle = useCallback((circleId: number | null) => {
    setSelectedCircleId(circleId);
  }, []);

  return {
    // Loading states
    isLoading,
    isLoadingCircles,
    isLoadingUserCircles,
    error,

    // Data
    allCircles,
    userCircles,
    selectedCircle,
    selectedCircleMembers,
    userMemberInfo,
    poolBalance,
    claimableCollateral,
    totalCircles,
    userEgldBalance,

    // Fair distribution info
    canStartFairly,
    payoutsPerMember,
    canJoinFairly,

    // Actions
    createCircle,
    joinCircle,
    startCircle,
    contribute,
    processMissedContribution,
    advancePeriod,
    claimCollateral: claimCollateralAction,
    leaveCircle,
    cancelCircle,

    // Navigation
    selectCircle,

    // Refresh
    refreshAllCircles,
    refreshUserCircles,
    refreshSelectedCircle
  };
};

// Types are exported from '../services/investmentCircleService'
