import { useState, useEffect, useCallback, useMemo } from 'react';
import { useGetAccountInfo, useGetPendingTransactions } from 'lib';
import * as circleOfLifeService from '../services/circleOfLifeService';
import { CircleInfo, CycleStats, ScStats, RewardsInfo, CanClaimResult, BurnStats, AutoSignStatus, StarterBonusInfo, OptionFInfo, PioneerInfo, DepositBonusInfo, DistributionStats } from '../services/circleOfLifeService';

export interface UseCircleOfLifeReturn {
  // State
  isLoading: boolean;
  error: string | null;
  address: string;

  // Data
  circleInfo: CircleInfo | null;
  isMember: boolean;
  isActive: boolean;
  isMyTurn: boolean;
  activeMembers: string[];
  inactiveContracts: string[];
  allContracts: string[];
  contractBalance: string;
  isPaused: boolean;
  sc0Owner: string | null;
  cycleHolder: string | null;

  // Contract owners mapping (scAddress -> ownerAddress)
  contractOwners: Map<string, string>;

  // SC statistics mapping (scAddress -> ScStats)
  scStats: Map<string, ScStats>;

  // Peripheral balances mapping (scAddress -> balance in EGLD)
  peripheralBalances: Map<string, string>;

  // Pre-sign data
  hasPreSigned: boolean;
  hasSignedThisCycle: boolean;
  preSignedMembers: string[];
  pendingAutoTransfers: number;

  // Cycle statistics
  cycleStats: CycleStats;

  // Rewards data
  rewardsInfo: RewardsInfo;
  pendingRewards: string;
  canClaim: CanClaimResult;
  dayOfWeek: number;

  // Burn stats
  burnStats: BurnStats;

  // Auto-sign status
  autoSignStatus: AutoSignStatus;

  // Starter bonus info
  starterBonusInfo: StarterBonusInfo;

  // Option F reward system info
  optionFInfo: OptionFInfo;

  // Pioneer info (bonus π% pour les 360 premiers SC)
  pioneerInfo: PioneerInfo;

  // Deposit bonus info (1 EGLD = 1%, max 360%)
  depositBonusInfo: DepositBonusInfo;

  // Distribution stats (EGLD distribution: 3.14% treasury, 70% liquidity, 30% DAO)
  distributionStats: DistributionStats;

  // Actions
  joinCircle: (entryFee?: string) => Promise<any>;
  signAndForward: () => Promise<any>;
  startDailyCycle: () => Promise<any>;
  setActive: () => Promise<any>;
  setInactive: () => Promise<any>;
  leaveCircle: () => Promise<any>;
  deposit: (amount: string) => Promise<any>;

  // Pre-sign actions
  preSign: () => Promise<any>;
  processNextTransfer: () => Promise<any>;
  processAllPendingTransfers: () => Promise<any>;

  // Auto-sign actions
  enableAutoSign: () => Promise<any>;
  enableAutoSignForCycles: (numCycles: number) => Promise<any>;
  disableAutoSign: () => Promise<any>;

  // Cycle management
  failCycle: () => Promise<any>;

  // Rewards actions
  claimRewards: () => Promise<any>;

  // Helpers
  refreshData: () => Promise<void>;
  clearError: () => void;

  // Legacy aliases
  myContract: string | null;
  activeContracts: string[];
  createPeripheralContract: () => Promise<any>;
}

export const useCircleOfLife = (): UseCircleOfLifeReturn => {
  const { address } = useGetAccountInfo();
  const { hasPendingTransactions } = useGetPendingTransactions();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Data state
  const [circleInfo, setCircleInfo] = useState<CircleInfo | null>(null);
  const [isMemberState, setIsMemberState] = useState(false);
  const [isActiveState, setIsActiveState] = useState(false);
  const [isMyTurnState, setIsMyTurnState] = useState(false);
  const [activeContracts, setActiveContracts] = useState<string[]>([]);
  const [allContractsState, setAllContractsState] = useState<string[]>([]);
  const [myContractAddress, setMyContractAddress] = useState<string | null>(null);
  const [contractBalance, setContractBalance] = useState('0');
  const [isPausedState, setIsPausedState] = useState(false);
  const [sc0Owner, setSc0Owner] = useState<string | null>(null);
  const [cycleHolder, setCycleHolder] = useState<string | null>(null);

  // Contract owners state (scAddress -> ownerAddress)
  const [contractOwners, setContractOwners] = useState<Map<string, string>>(new Map());

  // SC statistics state (scAddress -> ScStats)
  const [scStats, setScStats] = useState<Map<string, ScStats>>(new Map());

  // Peripheral balances state (scAddress -> balance in EGLD)
  const [peripheralBalances, setPeripheralBalances] = useState<Map<string, string>>(new Map());

  // Pre-sign state
  const [hasPreSignedState, setHasPreSignedState] = useState(false);
  const [hasSignedThisCycleState, setHasSignedThisCycleState] = useState(false);
  const [preSignedMembers, setPreSignedMembers] = useState<string[]>([]);
  const [pendingAutoTransfers, setPendingAutoTransfers] = useState(0);

  // Cycle statistics state
  const [cycleStats, setCycleStats] = useState<CycleStats>({
    cyclesCompleted: 0,
    cyclesFailed: 0,
    totalCycles: 0
  });

  // Rewards state
  const [rewardsInfo, setRewardsInfo] = useState<RewardsInfo>({
    rewardsPool: '0',
    rewardPerCycle: '0',
    rewardTokenId: '',
    totalRewardsDistributed: '0'
  });
  const [pendingRewardsState, setPendingRewardsState] = useState('0');
  const [canClaimState, setCanClaimState] = useState<CanClaimResult>({
    isSunday: false,
    pendingRewards: '0',
    hasRewards: false
  });
  const [dayOfWeek, setDayOfWeek] = useState(-1);

  // Burn stats state
  const [burnStats, setBurnStats] = useState<BurnStats>({
    totalBurned: '0',
    burnPerSc: '0',
    estimatedNextBurn: '0'
  });

  // Auto-sign state
  const [autoSignStatus, setAutoSignStatus] = useState<AutoSignStatus>({
    isPermanent: false,
    untilEpoch: 0,
    remainingCycles: 0
  });

  // Starter bonus state
  const [starterBonusInfo, setStarterBonusInfo] = useState<StarterBonusInfo>({
    percentage: 0,
    cycleStarter: null,
    potentialBonus: '0',
    totalDistributed: '0'
  });

  // Option F reward system state
  const [optionFInfo, setOptionFInfo] = useState<OptionFInfo>({
    currentReward: '0',
    currentEra: 0,
    nextCircleComplete: 360,
    cyclesUntilHalving: 360,
    piBonusAmount: '0'
  });

  // Pioneer info state (bonus π% pour les 360 premiers SC)
  const [pioneerInfo, setPioneerInfo] = useState<PioneerInfo>({
    isPioneer: false,
    index: 0,
    bonusPercentage: 0,
    remainingSlots: 360,
    totalPioneers: 0
  });

  // Deposit bonus info state (1 EGLD = 1%, max 360%)
  const [depositBonusInfo, setDepositBonusInfo] = useState<DepositBonusInfo>({
    totalDeposits: '0',
    bonusPercent: 0,
    bonusBps: 0,
    maxBonusPercent: 360
  });

  // Distribution stats state (EGLD distribution: 3.14% treasury, 70% liquidity, 30% DAO)
  const [distributionStats, setDistributionStats] = useState<DistributionStats>({
    totalDistributedTreasury: '0',
    totalDistributedDao: '0',
    pendingLiquidityEgld: '0',
    distributionEnabled: false
  });

  /**
   * Charge les donnees essentielles rapidement (pour affichage initial)
   */
  const loadEssentialData = useCallback(async () => {
    try {
      // PHASE 1: Essential data for circle visualization (fast)
      const [
        infoResult,
        contractsResult,
        cycleHolderResult,
        pausedResult
      ] = await Promise.all([
        circleOfLifeService.getCircleInfo(),
        circleOfLifeService.getActiveContracts(),
        circleOfLifeService.getCycleHolder(),
        circleOfLifeService.isPaused()
      ]);

      setCircleInfo(infoResult);
      setActiveContracts(contractsResult);
      setCycleHolder(cycleHolderResult);
      setIsPausedState(pausedResult);

      return contractsResult;
    } catch (err: any) {
      console.error('Error loading essential data:', err);
      throw err;
    }
  }, []);

  /**
   * Charge les donnees secondaires (en arriere-plan)
   */
  const loadSecondaryData = useCallback(async (contractsResult: string[]) => {
    try {
      // PHASE 2: Secondary data (can load in background)
      const [
        allContractsResult,
        balanceResult,
        ownerResult,
        preSignedMembersResult,
        pendingTransfersResult,
        cycleStatsResult,
        contractOwnersResult,
        scStatsResult,
        rewardsInfoResult,
        dayOfWeekResult,
        burnStatsResult,
        starterBonusInfoResult,
        optionFInfoResult,
        distributionStatsResult
      ] = await Promise.all([
        circleOfLifeService.getAllContracts(),
        circleOfLifeService.getContractBalance(),
        circleOfLifeService.getOwner(),
        circleOfLifeService.getPreSignedMembers(),
        circleOfLifeService.getPendingAutoTransfers(),
        circleOfLifeService.getCycleStats(),
        circleOfLifeService.getAllContractsWithOwners(),
        circleOfLifeService.getAllScStats(),
        circleOfLifeService.getRewardsInfo(),
        circleOfLifeService.getDayOfWeek(),
        circleOfLifeService.getBurnStats(),
        circleOfLifeService.getStarterBonusInfo(),
        circleOfLifeService.getOptionFInfo(),
        circleOfLifeService.getDistributionStats()
      ]);

      setAllContractsState(allContractsResult);
      setContractBalance(balanceResult);
      setSc0Owner(ownerResult);
      setPreSignedMembers(preSignedMembersResult);
      setPendingAutoTransfers(pendingTransfersResult);
      setCycleStats(cycleStatsResult);
      setContractOwners(contractOwnersResult);
      setScStats(scStatsResult);
      setRewardsInfo(rewardsInfoResult);
      setDayOfWeek(dayOfWeekResult);
      setBurnStats(burnStatsResult);
      setStarterBonusInfo(starterBonusInfoResult);
      setOptionFInfo(optionFInfoResult);
      setDistributionStats(distributionStatsResult);

      // Fetch peripheral balances for active contracts
      if (contractsResult && contractsResult.length > 0) {
        const balancesResult = await circleOfLifeService.getPeripheralBalances(contractsResult);
        setPeripheralBalances(balancesResult);
      }
    } catch (err: any) {
      console.error('Error loading secondary data:', err);
    }
  }, []);

  /**
   * Charge les donnees utilisateur
   */
  const loadUserData = useCallback(async () => {
    if (!address) return;

    try {
      const [isMemberResult, isActiveResult, isMyTurnResult, myContractResult, hasPreSignedResult, hasSignedThisCycleResult, pendingRewardsResult, canClaimResult, autoSignResult, pioneerInfoResult, depositBonusResult] = await Promise.all([
        circleOfLifeService.isMember(address),
        circleOfLifeService.isActive(address),
        circleOfLifeService.isMyTurn(address),
        circleOfLifeService.getMyContract(address),
        circleOfLifeService.hasPreSigned(address),
        circleOfLifeService.hasSignedThisCycle(address),
        circleOfLifeService.getPendingRewardsForMember(address),
        circleOfLifeService.canClaimRewards(address),
        circleOfLifeService.getAutoSignStatus(address),
        circleOfLifeService.getPioneerInfo(address),
        circleOfLifeService.getDepositBonusInfo(address)
      ]);

      setIsMemberState(isMemberResult);
      setIsActiveState(isActiveResult);
      setIsMyTurnState(isMyTurnResult);
      setMyContractAddress(myContractResult);
      setHasPreSignedState(hasPreSignedResult);
      setHasSignedThisCycleState(hasSignedThisCycleResult);
      setPendingRewardsState(pendingRewardsResult);
      setCanClaimState(canClaimResult);
      setAutoSignStatus(autoSignResult);
      setPioneerInfo(pioneerInfoResult);
      setDepositBonusInfo(depositBonusResult);
    } catch (err: any) {
      console.error('Error loading user data:', err);
    }
  }, [address]);

  /**
   * Charge toutes les donnees du contrat (optimise en phases)
   */
  const refreshData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Phase 1: Essential data (fast initial render)
      const contracts = await loadEssentialData();

      // Phase 2 & 3: Secondary and user data in parallel (background)
      await Promise.all([
        loadSecondaryData(contracts),
        loadUserData()
      ]);

    } catch (err: any) {
      console.error('Error refreshing Circle of Life data:', err);
      setError(err.message || 'Erreur lors du chargement des donnees');
    } finally {
      setIsLoading(false);
    }
  }, [loadEssentialData, loadSecondaryData, loadUserData]);

  // Load data on mount and when address changes
  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Refresh when pending transactions complete
  useEffect(() => {
    if (!hasPendingTransactions) {
      // Small delay to allow blockchain to update
      const timer = setTimeout(() => {
        refreshData();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [hasPendingTransactions, refreshData]);

  /**
   * Rejoindre le cercle
   */
  const joinCircle = async (entryFee: string = '1') => {
    if (!address) {
      setError('Wallet non connecte');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await circleOfLifeService.joinCircle(address, entryFee);
      return result;
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l\'adhesion');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Signe et valide le cycle
   */
  const signAndForward = async () => {
    if (!address) {
      setError('Wallet non connecte');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await circleOfLifeService.signAndForward(address);
      return result;
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la signature');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Demarre le cycle quotidien
   */
  const startDailyCycle = async () => {
    if (!address) {
      setError('Wallet non connecte');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await circleOfLifeService.startDailyCycle(address);
      return result;
    } catch (err: any) {
      setError(err.message || 'Erreur lors du demarrage du cycle');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Se mettre actif
   */
  const setActive = async () => {
    if (!address) {
      setError('Wallet non connecte');
      return null;
    }

    try {
      const result = await circleOfLifeService.setActive(address);
      return result;
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l\'activation');
      return null;
    }
  };

  /**
   * Se mettre inactif
   */
  const setInactive = async () => {
    if (!address) {
      setError('Wallet non connecte');
      return null;
    }

    try {
      const result = await circleOfLifeService.setInactive(address);
      return result;
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la desactivation');
      return null;
    }
  };

  /**
   * Quitter le cercle
   */
  const leaveCircle = async () => {
    if (!address) {
      setError('Wallet non connecte');
      return null;
    }

    try {
      const result = await circleOfLifeService.leaveCircle(address);
      return result;
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la sortie du cercle');
      return null;
    }
  };

  /**
   * Deposer des EGLD
   */
  const deposit = async (amount: string) => {
    if (!address) {
      setError('Wallet non connecte');
      return null;
    }

    try {
      const result = await circleOfLifeService.deposit(amount, address);
      return result;
    } catch (err: any) {
      setError(err.message || 'Erreur lors du depot');
      return null;
    }
  };

  /**
   * Pre-signe pour le cycle (peut etre fait a l'avance)
   */
  const preSign = async () => {
    if (!address) {
      setError('Wallet non connecte');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await circleOfLifeService.preSign(address);
      return result;
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la pre-signature');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Traite UN SEUL transfert en attente (permissionless)
   */
  const processNextTransfer = async () => {
    if (!address) {
      setError('Wallet non connecte');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await circleOfLifeService.processNextTransfer(address);
      return result;
    } catch (err: any) {
      setError(err.message || 'Erreur lors du traitement');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Traite TOUS les transferts en attente en une seule transaction (permissionless)
   */
  const processAllPendingTransfers = async () => {
    if (!address) {
      setError('Wallet non connecte');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await circleOfLifeService.processAllPendingTransfers(address);
      return result;
    } catch (err: any) {
      setError(err.message || 'Erreur lors du traitement des transferts');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Declarer un cycle echoue (timeout) - banni le SC responsable
   */
  const failCycle = async () => {
    if (!address) {
      setError('Wallet non connecte');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await circleOfLifeService.failCycle(address);
      return result;
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la declaration d\'echec');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Reclamer les recompenses XCIRCLEX (uniquement le dimanche)
   */
  const claimRewards = async () => {
    if (!address) {
      setError('Wallet non connecte');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await circleOfLifeService.claimRewards(address);
      return result;
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la reclamation des recompenses');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Active l'auto-sign permanent (indefini)
   */
  const enableAutoSign = async () => {
    if (!address) {
      setError('Wallet non connecte');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await circleOfLifeService.enableAutoSign(address);
      return result;
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l\'activation de l\'auto-sign');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Active l'auto-sign pour un nombre specifique de cycles
   */
  const enableAutoSignForCycles = async (numCycles: number) => {
    if (!address) {
      setError('Wallet non connecte');
      return null;
    }

    if (numCycles < 1 || numCycles > 365) {
      setError('Nombre de cycles invalide (1-365)');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await circleOfLifeService.enableAutoSignForCycles(address, numCycles);
      return result;
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l\'activation de l\'auto-sign');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Desactive l'auto-sign
   */
  const disableAutoSign = async () => {
    if (!address) {
      setError('Wallet non connecte');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await circleOfLifeService.disableAutoSign(address);
      return result;
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la desactivation de l\'auto-sign');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    // State
    isLoading: isLoading || hasPendingTransactions,
    error,
    address,

    // Data
    circleInfo,
    isMember: isMemberState,
    isActive: isActiveState,
    isMyTurn: isMyTurnState,
    activeMembers: activeContracts, // Ce sont les adresses des SC peripheriques (SC1, SC2...)
    inactiveContracts: allContractsState.filter(c => !activeContracts.includes(c)), // Contrats inactifs
    allContracts: allContractsState, // Tous les contrats
    contractBalance,
    isPaused: isPausedState,
    sc0Owner,
    cycleHolder,

    // Contract owners mapping (scAddress -> ownerAddress)
    contractOwners,

    // SC statistics mapping (scAddress -> ScStats)
    scStats,

    // Peripheral balances mapping (scAddress -> balance in EGLD)
    peripheralBalances,

    // Pre-sign data
    hasPreSigned: hasPreSignedState,
    hasSignedThisCycle: hasSignedThisCycleState,
    preSignedMembers,
    pendingAutoTransfers,

    // Cycle statistics
    cycleStats,

    // Rewards data
    rewardsInfo,
    pendingRewards: pendingRewardsState,
    canClaim: canClaimState,
    dayOfWeek,

    // Burn stats
    burnStats,

    // Auto-sign status
    autoSignStatus,

    // Starter bonus info
    starterBonusInfo,

    // Option F reward system info
    optionFInfo,

    // Pioneer info (bonus π% pour les 360 premiers SC)
    pioneerInfo,

    // Deposit bonus info (1 EGLD = 1%, max 360%)
    depositBonusInfo,

    // Distribution stats (EGLD distribution: 3.14% treasury, 70% liquidity, 30% DAO)
    distributionStats,

    // Actions
    joinCircle,
    signAndForward,
    startDailyCycle,
    setActive,
    setInactive,
    leaveCircle,
    deposit,

    // Pre-sign actions
    preSign,
    processNextTransfer,
    processAllPendingTransfers,

    // Auto-sign actions
    enableAutoSign,
    enableAutoSignForCycles,
    disableAutoSign,

    // Cycle management
    failCycle,

    // Rewards actions
    claimRewards,

    // Helpers
    refreshData,
    clearError: () => setError(null),

    // Legacy aliases (pour compatibilite avec l'ancien code)
    myContract: myContractAddress, // Adresse du SC peripherique de l'utilisateur
    activeContracts: activeContracts,
    createPeripheralContract: () => joinCircle('1')
  };
};

export default useCircleOfLife;
