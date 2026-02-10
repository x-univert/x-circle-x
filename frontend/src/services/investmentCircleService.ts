import {
  Address,
  SmartContractTransactionsFactory,
  TransactionsFactoryConfig,
  U64Value,
  BytesValue,
  BigUIntValue
} from '@multiversx/sdk-core';
import { signAndSendTransactionsWithHash } from '../helpers/signAndSendTransactions';
import BigNumber from 'bignumber.js';
import {
  INVESTMENT_CIRCLE_ADDRESS,
  INVESTMENT_CIRCLE_GAS_LIMITS,
  NETWORK_CONFIG
} from '../config/contracts';
import { chainId } from '../config';

const factoryConfig = new TransactionsFactoryConfig({ chainID: chainId });
const factory = new SmartContractTransactionsFactory({ config: factoryConfig });

// ============================================================================
// TYPES
// ============================================================================

export enum ContributionFrequency {
  Weekly = 0,
  BiWeekly = 1,
  Monthly = 2,
  Quarterly = 3
}

export enum CircleStatus {
  Pending = 0,
  Active = 1,
  Completed = 2,
  Cancelled = 3
}

export interface CircleInfo {
  id: number;
  creator: string;
  name: string;
  description?: string; // Stored locally (not on-chain)
  contributionAmount: string;
  frequency: ContributionFrequency;
  totalContributions: number;
  minMembers: number;
  maxMembers: number;
  currentMembers: number;
  currentPeriod: number;
  status: CircleStatus;
  createdAt: number;
  startedAt: number;
  nextContributionDeadline: number;
}

// ============================================================================
// LOCAL STORAGE FOR DESCRIPTIONS
// ============================================================================

const DESCRIPTIONS_STORAGE_KEY = 'investment_circle_descriptions';

export const saveCircleDescription = (circleId: number, description: string): void => {
  try {
    const stored = localStorage.getItem(DESCRIPTIONS_STORAGE_KEY);
    const descriptions = stored ? JSON.parse(stored) : {};
    descriptions[circleId] = description;
    localStorage.setItem(DESCRIPTIONS_STORAGE_KEY, JSON.stringify(descriptions));
  } catch (e) {
    console.error('Error saving circle description:', e);
  }
};

export const getCircleDescription = (circleId: number): string | undefined => {
  try {
    const stored = localStorage.getItem(DESCRIPTIONS_STORAGE_KEY);
    if (stored) {
      const descriptions = JSON.parse(stored);
      return descriptions[circleId];
    }
  } catch (e) {
    console.error('Error reading circle description:', e);
  }
  return undefined;
};

export interface MemberInfo {
  address: string;
  collateralDeposited: string;
  collateralUsed: string;
  collateralUnlocked: string;
  contributionsPaid: number;
  joinedAt: number;
  lastContributionAt: number;
  isActive: boolean;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const base64ToHex = (base64: string): string => {
  const binary = atob(base64);
  let hex = '';
  for (let i = 0; i < binary.length; i++) {
    hex += binary.charCodeAt(i).toString(16).padStart(2, '0');
  }
  return hex;
};

const numberToHex = (num: number | bigint): string => {
  const hex = BigInt(num).toString(16);
  return hex.length % 2 === 0 ? hex : '0' + hex;
};

const hexToBigInt = (hex: string): bigint => {
  if (!hex || hex === '') return BigInt(0);
  return BigInt('0x' + hex);
};

const parseEgldAmount = (hex: string): string => {
  if (!hex || hex === '') return '0';
  const wei = hexToBigInt(hex);
  const amount = new BigNumber(wei.toString()).dividedBy(new BigNumber(10).pow(18));
  return amount.toString();
};

const addressToHex = (address: string): string => {
  const addr = new Address(address);
  return addr.toHex();
};

const hexToBech32 = (hex: string): string => {
  try {
    if (!hex || hex.length !== 64) {
      console.error('Invalid hex for address:', hex);
      return '';
    }
    // Convert hex to Uint8Array (public key bytes)
    const bytes = new Uint8Array(32);
    for (let i = 0; i < 32; i++) {
      bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
    }
    // Create address from public key bytes
    const address = new Address(bytes);
    return address.toBech32();
  } catch (error) {
    console.error('Error converting hex to bech32:', error, 'hex:', hex);
    return '';
  }
};

const hexToString = (hex: string): string => {
  let str = '';
  for (let i = 0; i < hex.length; i += 2) {
    str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
  }
  return str;
};

/**
 * Query the Investment Circle smart contract
 */
const queryContract = async (funcName: string, args: string[] = []): Promise<any> => {
  try {
    const response = await fetch(
      `${NETWORK_CONFIG.apiAddress}/vm-values/query`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scAddress: INVESTMENT_CIRCLE_ADDRESS,
          funcName,
          args
        })
      }
    );

    const data = await response.json();

    if (data.data?.data?.returnData) {
      return data.data.data.returnData;
    }
    return null;
  } catch (error) {
    console.error(`Error querying ${funcName}:`, error);
    return null;
  }
};

// ============================================================================
// TRANSACTION FUNCTIONS
// ============================================================================

/**
 * Create a new investment circle
 * Requires depositing collateral = contributionAmount * totalContributions
 */
export const createCircle = async (
  name: string,
  contributionAmount: string,
  frequency: ContributionFrequency,
  totalContributions: number,
  minMembers: number,
  maxMembers: number,
  senderAddress: string
): Promise<string[]> => {
  const amountInWei = new BigNumber(contributionAmount)
    .multipliedBy(new BigNumber(10).pow(18))
    .toFixed(0);

  // Calculate required collateral
  const collateral = new BigNumber(amountInWei).multipliedBy(totalContributions).toFixed(0);

  const sender = new Address(senderAddress);
  const contract = new Address(INVESTMENT_CIRCLE_ADDRESS);

  const transaction = await factory.createTransactionForExecute(sender, {
    contract,
    function: 'createCircle',
    gasLimit: BigInt(INVESTMENT_CIRCLE_GAS_LIMITS.createCircle),
    arguments: [
      BytesValue.fromUTF8(name),
      new BigUIntValue(BigInt(amountInWei)),
      new U64Value(BigInt(frequency)),
      new U64Value(BigInt(totalContributions)),
      new U64Value(BigInt(minMembers)),
      new U64Value(BigInt(maxMembers))
    ],
    nativeTransferAmount: BigInt(collateral)
  });

  const result = await signAndSendTransactionsWithHash({
    transactions: [transaction],
    transactionsDisplayInfo: {
      processingMessage: 'Creating investment circle...',
      errorMessage: 'Failed to create circle',
      successMessage: 'Circle created successfully!'
    }
  });

  return result.transactionHashes;
};

/**
 * Join an existing circle by depositing collateral
 */
export const joinCircle = async (
  circleId: number,
  collateralAmount: string,
  senderAddress: string
): Promise<string[]> => {
  const collateralInWei = new BigNumber(collateralAmount)
    .multipliedBy(new BigNumber(10).pow(18))
    .toFixed(0);

  const sender = new Address(senderAddress);
  const contract = new Address(INVESTMENT_CIRCLE_ADDRESS);

  const transaction = await factory.createTransactionForExecute(sender, {
    contract,
    function: 'joinCircle',
    gasLimit: BigInt(INVESTMENT_CIRCLE_GAS_LIMITS.joinCircle),
    arguments: [new U64Value(BigInt(circleId))],
    nativeTransferAmount: BigInt(collateralInWei)
  });

  const result = await signAndSendTransactionsWithHash({
    transactions: [transaction],
    transactionsDisplayInfo: {
      processingMessage: 'Joining circle...',
      errorMessage: 'Failed to join circle',
      successMessage: 'Successfully joined the circle!'
    }
  });

  return result.transactionHashes;
};

/**
 * Start the circle (when minimum members reached)
 */
export const startCircle = async (
  circleId: number,
  senderAddress: string
): Promise<string[]> => {
  const sender = new Address(senderAddress);
  const contract = new Address(INVESTMENT_CIRCLE_ADDRESS);

  const transaction = await factory.createTransactionForExecute(sender, {
    contract,
    function: 'startCircle',
    gasLimit: BigInt(INVESTMENT_CIRCLE_GAS_LIMITS.startCircle),
    arguments: [new U64Value(BigInt(circleId))]
  });

  const result = await signAndSendTransactionsWithHash({
    transactions: [transaction],
    transactionsDisplayInfo: {
      processingMessage: 'Starting circle...',
      errorMessage: 'Failed to start circle',
      successMessage: 'Circle started!'
    }
  });

  return result.transactionHashes;
};

/**
 * Make a contribution for the current period
 */
export const contribute = async (
  circleId: number,
  amount: string,
  senderAddress: string
): Promise<string[]> => {
  const amountInWei = new BigNumber(amount)
    .multipliedBy(new BigNumber(10).pow(18))
    .toFixed(0);

  const sender = new Address(senderAddress);
  const contract = new Address(INVESTMENT_CIRCLE_ADDRESS);

  const transaction = await factory.createTransactionForExecute(sender, {
    contract,
    function: 'contribute',
    gasLimit: BigInt(INVESTMENT_CIRCLE_GAS_LIMITS.contribute),
    arguments: [new U64Value(BigInt(circleId))],
    nativeTransferAmount: BigInt(amountInWei)
  });

  const result = await signAndSendTransactionsWithHash({
    transactions: [transaction],
    transactionsDisplayInfo: {
      processingMessage: 'Making contribution...',
      errorMessage: 'Contribution failed',
      successMessage: 'Contribution successful!'
    }
  });

  return result.transactionHashes;
};

/**
 * Process a missed contribution (uses member's collateral)
 */
export const processMissedContribution = async (
  circleId: number,
  memberAddress: string,
  senderAddress: string
): Promise<string[]> => {
  const sender = new Address(senderAddress);
  const contract = new Address(INVESTMENT_CIRCLE_ADDRESS);

  const transaction = await factory.createTransactionForExecute(sender, {
    contract,
    function: 'processMissedContribution',
    gasLimit: BigInt(INVESTMENT_CIRCLE_GAS_LIMITS.processMissedContribution),
    arguments: [
      new U64Value(BigInt(circleId)),
      new Address(memberAddress)
    ]
  });

  const result = await signAndSendTransactionsWithHash({
    transactions: [transaction],
    transactionsDisplayInfo: {
      processingMessage: 'Processing missed contribution...',
      errorMessage: 'Failed to process',
      successMessage: 'Missed contribution processed!'
    }
  });

  return result.transactionHashes;
};

/**
 * Advance to the next period and distribute pool
 */
export const advancePeriod = async (
  circleId: number,
  senderAddress: string
): Promise<string[]> => {
  const sender = new Address(senderAddress);
  const contract = new Address(INVESTMENT_CIRCLE_ADDRESS);

  const transaction = await factory.createTransactionForExecute(sender, {
    contract,
    function: 'advancePeriod',
    gasLimit: BigInt(INVESTMENT_CIRCLE_GAS_LIMITS.advancePeriod),
    arguments: [new U64Value(BigInt(circleId))]
  });

  const result = await signAndSendTransactionsWithHash({
    transactions: [transaction],
    transactionsDisplayInfo: {
      processingMessage: 'Advancing to next period...',
      errorMessage: 'Failed to advance period',
      successMessage: 'Period advanced! Pool distributed.'
    }
  });

  return result.transactionHashes;
};

/**
 * Claim unlocked collateral
 */
export const claimCollateral = async (
  circleId: number,
  senderAddress: string
): Promise<string[]> => {
  const sender = new Address(senderAddress);
  const contract = new Address(INVESTMENT_CIRCLE_ADDRESS);

  const transaction = await factory.createTransactionForExecute(sender, {
    contract,
    function: 'claimCollateral',
    gasLimit: BigInt(INVESTMENT_CIRCLE_GAS_LIMITS.claimCollateral),
    arguments: [new U64Value(BigInt(circleId))]
  });

  const result = await signAndSendTransactionsWithHash({
    transactions: [transaction],
    transactionsDisplayInfo: {
      processingMessage: 'Claiming collateral...',
      errorMessage: 'Claim failed',
      successMessage: 'Collateral claimed!'
    }
  });

  return result.transactionHashes;
};

/**
 * Leave a pending circle and get collateral back
 */
export const leaveCircle = async (
  circleId: number,
  senderAddress: string
): Promise<string[]> => {
  const sender = new Address(senderAddress);
  const contract = new Address(INVESTMENT_CIRCLE_ADDRESS);

  const transaction = await factory.createTransactionForExecute(sender, {
    contract,
    function: 'leaveCircle',
    gasLimit: BigInt(INVESTMENT_CIRCLE_GAS_LIMITS.leaveCircle),
    arguments: [new U64Value(BigInt(circleId))]
  });

  const result = await signAndSendTransactionsWithHash({
    transactions: [transaction],
    transactionsDisplayInfo: {
      processingMessage: 'Leaving circle...',
      errorMessage: 'Failed to leave circle',
      successMessage: 'Left circle. Collateral refunded.'
    }
  });

  return result.transactionHashes;
};

/**
 * Cancel a pending circle (creator only)
 */
export const cancelCircle = async (
  circleId: number,
  senderAddress: string
): Promise<string[]> => {
  const sender = new Address(senderAddress);
  const contract = new Address(INVESTMENT_CIRCLE_ADDRESS);

  const transaction = await factory.createTransactionForExecute(sender, {
    contract,
    function: 'cancelCircle',
    gasLimit: BigInt(INVESTMENT_CIRCLE_GAS_LIMITS.cancelCircle),
    arguments: [new U64Value(BigInt(circleId))]
  });

  const result = await signAndSendTransactionsWithHash({
    transactions: [transaction],
    transactionsDisplayInfo: {
      processingMessage: 'Cancelling circle...',
      errorMessage: 'Failed to cancel circle',
      successMessage: 'Circle cancelled. All collateral refunded.'
    }
  });

  return result.transactionHashes;
};

// ============================================================================
// VIEW FUNCTIONS
// ============================================================================

/**
 * Get total number of circles
 */
export const getTotalCircles = async (): Promise<number> => {
  const result = await queryContract('getTotalCircles');

  if (!result || result.length === 0 || result[0] === '') {
    return 0;
  }

  const hex = base64ToHex(result[0]);
  return parseInt(hex, 16) || 0;
};

/**
 * Get circle info by ID
 */
export const getCircleInfo = async (circleId: number): Promise<CircleInfo | null> => {
  const circleIdHex = numberToHex(circleId);
  const result = await queryContract('getCircleInfo', [circleIdHex]);

  if (!result || result.length === 0 || result[0] === '') {
    return null;
  }

  try {
    const hex = base64ToHex(result[0]);
    let offset = 0;

    // id (u64 - 8 bytes)
    const id = parseInt(hex.slice(offset, offset + 16), 16);
    offset += 16;

    // creator (32 bytes address)
    const creatorHex = hex.slice(offset, offset + 64);
    const creator = hexToBech32(creatorHex);
    offset += 64;

    // name (4 bytes length + data)
    const nameLen = parseInt(hex.slice(offset, offset + 8), 16);
    offset += 8;
    const nameHex = hex.slice(offset, offset + nameLen * 2);
    const name = hexToString(nameHex);
    offset += nameLen * 2;

    // contribution_amount (4 bytes length + BigUint data)
    const amountLen = parseInt(hex.slice(offset, offset + 8), 16);
    offset += 8;
    const amountHex = hex.slice(offset, offset + amountLen * 2);
    const contributionAmount = parseEgldAmount(amountHex);
    offset += amountLen * 2;

    // frequency (1 byte)
    const frequency = parseInt(hex.slice(offset, offset + 2), 16) as ContributionFrequency;
    offset += 2;

    // total_contributions (u64)
    const totalContributions = parseInt(hex.slice(offset, offset + 16), 16);
    offset += 16;

    // min_members (u64)
    const minMembers = parseInt(hex.slice(offset, offset + 16), 16);
    offset += 16;

    // max_members (u64)
    const maxMembers = parseInt(hex.slice(offset, offset + 16), 16);
    offset += 16;

    // current_members (u64)
    const currentMembers = parseInt(hex.slice(offset, offset + 16), 16);
    offset += 16;

    // current_period (u64)
    const currentPeriod = parseInt(hex.slice(offset, offset + 16), 16);
    offset += 16;

    // status (1 byte)
    const status = parseInt(hex.slice(offset, offset + 2), 16) as CircleStatus;
    offset += 2;

    // created_at (u64)
    const createdAt = parseInt(hex.slice(offset, offset + 16), 16);
    offset += 16;

    // started_at (u64)
    const startedAt = parseInt(hex.slice(offset, offset + 16), 16);
    offset += 16;

    // next_contribution_deadline (u64)
    const nextContributionDeadline = parseInt(hex.slice(offset, offset + 16), 16);

    // Get description from localStorage
    const description = getCircleDescription(id);

    return {
      id,
      creator,
      name,
      description,
      contributionAmount,
      frequency,
      totalContributions,
      minMembers,
      maxMembers,
      currentMembers,
      currentPeriod,
      status,
      createdAt,
      startedAt,
      nextContributionDeadline
    };
  } catch (error) {
    console.error('Error parsing circle info:', error);
    return null;
  }
};

/**
 * Get member info
 */
export const getMemberInfo = async (circleId: number, memberAddress: string): Promise<MemberInfo | null> => {
  const circleIdHex = numberToHex(circleId);
  const memberHex = addressToHex(memberAddress);
  const result = await queryContract('getMemberInfo', [circleIdHex, memberHex]);

  if (!result || result.length === 0 || result[0] === '') {
    return null;
  }

  try {
    const hex = base64ToHex(result[0]);
    let offset = 0;

    // address (32 bytes)
    const addressHex = hex.slice(offset, offset + 64);
    const address = hexToBech32(addressHex);
    offset += 64;

    // collateral_deposited (4 bytes len + BigUint)
    const depositedLen = parseInt(hex.slice(offset, offset + 8), 16);
    offset += 8;
    const depositedHex = hex.slice(offset, offset + depositedLen * 2);
    const collateralDeposited = parseEgldAmount(depositedHex);
    offset += depositedLen * 2;

    // collateral_used (4 bytes len + BigUint)
    const usedLen = parseInt(hex.slice(offset, offset + 8), 16);
    offset += 8;
    const usedHex = hex.slice(offset, offset + usedLen * 2);
    const collateralUsed = parseEgldAmount(usedHex);
    offset += usedLen * 2;

    // collateral_unlocked (4 bytes len + BigUint)
    const unlockedLen = parseInt(hex.slice(offset, offset + 8), 16);
    offset += 8;
    const unlockedHex = hex.slice(offset, offset + unlockedLen * 2);
    const collateralUnlocked = parseEgldAmount(unlockedHex);
    offset += unlockedLen * 2;

    // contributions_paid (u64)
    const contributionsPaid = parseInt(hex.slice(offset, offset + 16), 16);
    offset += 16;

    // joined_at (u64)
    const joinedAt = parseInt(hex.slice(offset, offset + 16), 16);
    offset += 16;

    // last_contribution_at (u64)
    const lastContributionAt = parseInt(hex.slice(offset, offset + 16), 16);
    offset += 16;

    // is_active (1 byte bool)
    const isActive = hex.slice(offset, offset + 2) === '01';

    return {
      address,
      collateralDeposited,
      collateralUsed,
      collateralUnlocked,
      contributionsPaid,
      joinedAt,
      lastContributionAt,
      isActive
    };
  } catch (error) {
    console.error('Error parsing member info:', error);
    return null;
  }
};

/**
 * Get all circles for a user
 */
export const getUserCircles = async (userAddress: string): Promise<number[]> => {
  const userHex = addressToHex(userAddress);
  const result = await queryContract('getUserCircles', [userHex]);

  if (!result || result.length === 0) {
    return [];
  }

  const circleIds: number[] = [];
  for (const item of result) {
    if (item && item !== '') {
      const hex = base64ToHex(item);
      const id = parseInt(hex, 16);
      if (!isNaN(id)) {
        circleIds.push(id);
      }
    }
  }

  return circleIds;
};

/**
 * Get all members of a circle
 */
export const getCircleMembers = async (circleId: number): Promise<string[]> => {
  const circleIdHex = numberToHex(circleId);
  const result = await queryContract('getCircleMembers', [circleIdHex]);

  if (!result || result.length === 0) {
    return [];
  }

  const members: string[] = [];
  for (const item of result) {
    if (item && item !== '') {
      const hex = base64ToHex(item);
      const address = hexToBech32(hex);
      if (address) {
        members.push(address);
      }
    }
  }

  return members;
};

/**
 * Get required collateral for a circle
 */
export const getRequiredCollateral = async (circleId: number): Promise<string> => {
  const circleIdHex = numberToHex(circleId);
  const result = await queryContract('getRequiredCollateral', [circleIdHex]);

  if (!result || result.length === 0 || result[0] === '') {
    return '0';
  }

  const hex = base64ToHex(result[0]);
  return parseEgldAmount(hex);
};

/**
 * Get current pool balance
 */
export const getPoolBalance = async (circleId: number): Promise<string> => {
  const circleIdHex = numberToHex(circleId);
  const result = await queryContract('getPoolBalance', [circleIdHex]);

  if (!result || result.length === 0 || result[0] === '') {
    return '0';
  }

  const hex = base64ToHex(result[0]);
  return parseEgldAmount(hex);
};

/**
 * Get claimable collateral for a member
 */
export const getClaimableCollateral = async (circleId: number, memberAddress: string): Promise<string> => {
  const circleIdHex = numberToHex(circleId);
  const memberHex = addressToHex(memberAddress);
  const result = await queryContract('getClaimableCollateral', [circleIdHex, memberHex]);

  if (!result || result.length === 0 || result[0] === '') {
    return '0';
  }

  const hex = base64ToHex(result[0]);
  return parseEgldAmount(hex);
};

/**
 * Get all circles with their info (for listing)
 */
export const getAllCircles = async (): Promise<CircleInfo[]> => {
  const total = await getTotalCircles();
  const circles: CircleInfo[] = [];

  for (let i = 1; i <= total; i++) {
    const circle = await getCircleInfo(i);
    if (circle) {
      circles.push(circle);
    }
  }

  return circles;
};

/**
 * Get user's EGLD balance
 */
export const getUserEgldBalance = async (userAddress: string): Promise<string> => {
  try {
    const response = await fetch(
      `${NETWORK_CONFIG.apiRestAddress}/accounts/${userAddress}`
    );

    if (!response.ok) {
      return '0';
    }

    const data = await response.json();
    const balance = new BigNumber(data.balance || '0');
    return balance.dividedBy(new BigNumber(10).pow(18)).toString();
  } catch (error) {
    console.error('Error fetching EGLD balance:', error);
    return '0';
  }
};

/**
 * Check if a circle can start (enough members + fair distribution)
 */
export const canStartCircle = async (circleId: number): Promise<boolean> => {
  const circleIdHex = numberToHex(circleId);
  const result = await queryContract('canStartCircle', [circleIdHex]);

  if (!result || result.length === 0 || result[0] === '') {
    return false;
  }

  const hex = base64ToHex(result[0]);
  return hex === '01';
};

/**
 * Get how many payouts each member will receive
 */
export const getPayoutsPerMember = async (circleId: number): Promise<number> => {
  const circleIdHex = numberToHex(circleId);
  const result = await queryContract('getPayoutsPerMember', [circleIdHex]);

  if (!result || result.length === 0 || result[0] === '') {
    return 0;
  }

  const hex = base64ToHex(result[0]);
  return parseInt(hex, 16) || 0;
};

/**
 * Check if joining would keep fair distribution possible
 */
export const canJoinFairly = async (circleId: number): Promise<boolean> => {
  const circleIdHex = numberToHex(circleId);
  const result = await queryContract('canJoinFairly', [circleIdHex]);

  if (!result || result.length === 0 || result[0] === '') {
    return false;
  }

  const hex = base64ToHex(result[0]);
  return hex === '01';
};

/**
 * Check if a given member count is fair for distribution
 * (local calculation, doesn't query contract)
 */
export const isFairDistribution = (totalContributions: number, memberCount: number): boolean => {
  if (memberCount === 0) return false;
  return totalContributions % memberCount === 0;
};

/**
 * Get valid member counts for fair distribution
 * Returns all divisors of totalContributions within min-max range
 */
export const getValidMemberCounts = (totalContributions: number, minMembers: number, maxMembers: number): number[] => {
  const validCounts: number[] = [];
  for (let i = minMembers; i <= maxMembers; i++) {
    if (totalContributions % i === 0) {
      validCounts.push(i);
    }
  }
  return validCounts;
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export const getFrequencyLabel = (frequency: ContributionFrequency): string => {
  switch (frequency) {
    case ContributionFrequency.Weekly:
      return 'Weekly';
    case ContributionFrequency.BiWeekly:
      return 'Bi-Weekly';
    case ContributionFrequency.Monthly:
      return 'Monthly';
    case ContributionFrequency.Quarterly:
      return 'Quarterly';
    default:
      return 'Unknown';
  }
};

export const getStatusLabel = (status: CircleStatus): string => {
  switch (status) {
    case CircleStatus.Pending:
      return 'Pending';
    case CircleStatus.Active:
      return 'Active';
    case CircleStatus.Completed:
      return 'Completed';
    case CircleStatus.Cancelled:
      return 'Cancelled';
    default:
      return 'Unknown';
  }
};

export const getStatusColor = (status: CircleStatus): string => {
  switch (status) {
    case CircleStatus.Pending:
      return 'text-yellow-500';
    case CircleStatus.Active:
      return 'text-green-500';
    case CircleStatus.Completed:
      return 'text-blue-500';
    case CircleStatus.Cancelled:
      return 'text-red-500';
    default:
      return 'text-gray-500';
  }
};

export const formatTimestamp = (timestamp: number): string => {
  if (!timestamp) return 'N/A';
  return new Date(timestamp * 1000).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const getTimeRemaining = (deadline: number): string => {
  if (!deadline) return 'N/A';

  const now = Math.floor(Date.now() / 1000);
  const remaining = deadline - now;

  if (remaining <= 0) return 'Expired';

  const days = Math.floor(remaining / 86400);
  const hours = Math.floor((remaining % 86400) / 3600);
  const minutes = Math.floor((remaining % 3600) / 60);

  if (days > 0) {
    return `${days}d ${hours}h`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else {
    return `${minutes}m`;
  }
};
