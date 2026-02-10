import {
  Address,
  SmartContractTransactionsFactory,
  TransactionsFactoryConfig,
  Token,
  TokenTransfer,
  U8Value
} from '@multiversx/sdk-core';
import { signAndSendTransactionsWithHash } from '../helpers/signAndSendTransactions';
import BigNumber from 'bignumber.js';
import {
  STAKING_CONTRACT_ADDRESS,
  XCIRCLEX_TOKEN_ID,
  XCIRCLEX_DECIMALS,
  STAKING_GAS_LIMITS,
  NETWORK_CONFIG
} from '../config/contracts';
import { chainId } from '../config';

const factoryConfig = new TransactionsFactoryConfig({ chainID: chainId });
const factory = new SmartContractTransactionsFactory({ config: factoryConfig });

// Types
export interface StakePosition {
  positionId: number;
  amount: string;
  lockLevel: number;
  startEpoch: number;
  endEpoch: number;
  lastClaimEpoch: number;
  accumulatedRewards: string;
}

export interface StakingStats {
  totalStaked: string;
  rewardsPool: string;
  totalRewardsDistributed: string;
  tokenId: string;
}

// Helper functions
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

const parseTokenAmount = (hex: string): string => {
  if (!hex || hex === '') return '0';
  const wei = hexToBigInt(hex);
  const amount = new BigNumber(wei.toString()).dividedBy(new BigNumber(10).pow(XCIRCLEX_DECIMALS));
  return amount.toString();
};

const addressToHex = (address: string): string => {
  const addr = new Address(address);
  return addr.toHex();
};

/**
 * Query the staking smart contract
 */
const queryContract = async (funcName: string, args: string[] = []): Promise<any> => {
  try {
    const response = await fetch(
      `${NETWORK_CONFIG.apiAddress}/vm-values/query`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scAddress: STAKING_CONTRACT_ADDRESS,
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
 * Stake XCIRCLEX tokens with a specific lock level (0-12)
 */
export const stake = async (
  amount: string,
  lockLevel: number,
  senderAddress: string
): Promise<string[]> => {
  const amountInWei = new BigNumber(amount)
    .multipliedBy(new BigNumber(10).pow(XCIRCLEX_DECIMALS))
    .toFixed(0);

  const sender = new Address(senderAddress);
  const contract = new Address(STAKING_CONTRACT_ADDRESS);

  // Create token transfer
  const tokenTransfer = new TokenTransfer({
    token: new Token({ identifier: XCIRCLEX_TOKEN_ID }),
    amount: BigInt(amountInWei)
  });

  const transaction = await factory.createTransactionForExecute(sender, {
    contract: contract,
    function: 'stake',
    gasLimit: BigInt(STAKING_GAS_LIMITS.stake),
    arguments: [new U8Value(lockLevel)],
    tokenTransfers: [tokenTransfer]
  });

  const result = await signAndSendTransactionsWithHash({
    transactions: [transaction],
    transactionsDisplayInfo: {
      processingMessage: 'Staking XCIRCLEX tokens...',
      errorMessage: 'Staking failed',
      successMessage: 'Staking successful!'
    }
  });

  return result.transactionHashes;
};

/**
 * Unstake tokens (only after lock period ends)
 */
export const unstake = async (
  positionId: number,
  senderAddress: string
): Promise<string[]> => {
  const sender = new Address(senderAddress);
  const contract = new Address(STAKING_CONTRACT_ADDRESS);

  const transaction = await factory.createTransactionForExecute(sender, {
    contract: contract,
    function: 'unstake',
    gasLimit: BigInt(STAKING_GAS_LIMITS.unstake),
    arguments: [new U8Value(positionId)]
  });

  const result = await signAndSendTransactionsWithHash({
    transactions: [transaction],
    transactionsDisplayInfo: {
      processingMessage: 'Unstaking tokens...',
      errorMessage: 'Unstaking failed',
      successMessage: 'Unstaking successful!'
    }
  });

  return result.transactionHashes;
};

/**
 * Claim pending rewards for a position
 */
export const claimRewards = async (
  positionId: number,
  senderAddress: string
): Promise<string[]> => {
  const sender = new Address(senderAddress);
  const contract = new Address(STAKING_CONTRACT_ADDRESS);

  const transaction = await factory.createTransactionForExecute(sender, {
    contract: contract,
    function: 'claimRewards',
    gasLimit: BigInt(STAKING_GAS_LIMITS.claimRewards),
    arguments: [new U8Value(positionId)]
  });

  const result = await signAndSendTransactionsWithHash({
    transactions: [transaction],
    transactionsDisplayInfo: {
      processingMessage: 'Claiming rewards...',
      errorMessage: 'Claim failed',
      successMessage: 'Rewards claimed!'
    }
  });

  return result.transactionHashes;
};

/**
 * Emergency unstake (forfeit rewards, 10% penalty if before lock ends)
 */
export const emergencyUnstake = async (
  positionId: number,
  senderAddress: string
): Promise<string[]> => {
  const sender = new Address(senderAddress);
  const contract = new Address(STAKING_CONTRACT_ADDRESS);

  const transaction = await factory.createTransactionForExecute(sender, {
    contract: contract,
    function: 'emergencyUnstake',
    gasLimit: BigInt(STAKING_GAS_LIMITS.emergencyUnstake),
    arguments: [new U8Value(positionId)]
  });

  const result = await signAndSendTransactionsWithHash({
    transactions: [transaction],
    transactionsDisplayInfo: {
      processingMessage: 'Emergency unstaking...',
      errorMessage: 'Emergency unstake failed',
      successMessage: 'Emergency unstake successful (10% penalty applied)'
    }
  });

  return result.transactionHashes;
};

// ============================================================================
// VIEW FUNCTIONS
// ============================================================================

/**
 * Get user's position count
 */
export const getUserPositionCount = async (userAddress: string): Promise<number> => {
  const userHex = addressToHex(userAddress);
  const result = await queryContract('getUserPositionCount', [userHex]);

  if (!result || result.length === 0 || result[0] === '') {
    return 0;
  }

  const hex = base64ToHex(result[0]);
  return parseInt(hex, 16) || 0;
};

/**
 * Get pending rewards for a position
 */
export const getPendingRewards = async (
  userAddress: string,
  positionId: number
): Promise<string> => {
  const userHex = addressToHex(userAddress);
  const positionIdHex = numberToHex(positionId);

  const result = await queryContract('getPendingRewards', [userHex, positionIdHex]);

  if (!result || result.length === 0 || result[0] === '') {
    return '0';
  }

  const hex = base64ToHex(result[0]);
  return parseTokenAmount(hex);
};

/**
 * Check if user can unstake a position
 */
export const canUnstake = async (
  userAddress: string,
  positionId: number
): Promise<boolean> => {
  const userHex = addressToHex(userAddress);
  const positionIdHex = numberToHex(positionId);

  const result = await queryContract('canUnstake', [userHex, positionIdHex]);

  if (!result || result.length === 0 || result[0] === '') {
    return false;
  }

  const hex = base64ToHex(result[0]);
  return hex === '01';
};

/**
 * Get time until unlock (in epochs/days)
 */
export const getTimeUntilUnlock = async (
  userAddress: string,
  positionId: number
): Promise<number> => {
  const userHex = addressToHex(userAddress);
  const positionIdHex = numberToHex(positionId);

  const result = await queryContract('getTimeUntilUnlock', [userHex, positionIdHex]);

  if (!result || result.length === 0 || result[0] === '') {
    return 0;
  }

  const hex = base64ToHex(result[0]);
  return parseInt(hex, 16) || 0;
};

/**
 * Get emergency unstake penalty in basis points (10000 = 100%)
 * Penalty is proportional to remaining lock time
 */
export const getEmergencyPenalty = async (
  userAddress: string,
  positionId: number
): Promise<number> => {
  const userHex = addressToHex(userAddress);
  const positionIdHex = numberToHex(positionId);

  const result = await queryContract('getEmergencyPenalty', [userHex, positionIdHex]);

  if (!result || result.length === 0 || result[0] === '') {
    return 0;
  }

  const hex = base64ToHex(result[0]);
  return parseInt(hex, 16) || 0;
};

/**
 * Get staking statistics
 */
export const getStakingStats = async (): Promise<StakingStats> => {
  const [totalStakedResult, rewardsPoolResult, totalDistributedResult, tokenIdResult] = await Promise.all([
    queryContract('getTotalStaked'),
    queryContract('getRewardsPool'),
    queryContract('getTotalRewardsDistributed'),
    queryContract('getTokenId')
  ]);

  return {
    totalStaked: totalStakedResult?.[0] ? parseTokenAmount(base64ToHex(totalStakedResult[0])) : '0',
    rewardsPool: rewardsPoolResult?.[0] ? parseTokenAmount(base64ToHex(rewardsPoolResult[0])) : '0',
    totalRewardsDistributed: totalDistributedResult?.[0] ? parseTokenAmount(base64ToHex(totalDistributedResult[0])) : '0',
    tokenId: tokenIdResult?.[0] ? atob(tokenIdResult[0]) : XCIRCLEX_TOKEN_ID
  };
};

/**
 * Get user's XCIRCLEX balance
 */
export const getUserTokenBalance = async (userAddress: string): Promise<string> => {
  try {
    const response = await fetch(
      `${NETWORK_CONFIG.apiRestAddress}/accounts/${userAddress}/tokens/${XCIRCLEX_TOKEN_ID}`
    );

    if (!response.ok) {
      return '0';
    }

    const data = await response.json();
    const balance = new BigNumber(data.balance || '0');
    return balance.dividedBy(new BigNumber(10).pow(XCIRCLEX_DECIMALS)).toString();
  } catch (error) {
    console.error('Error fetching token balance:', error);
    return '0';
  }
};

/**
 * Get a single stake position
 */
export const getStakePosition = async (userAddress: string, positionId: number): Promise<StakePosition | null> => {
  const userHex = addressToHex(userAddress);
  const positionIdHex = numberToHex(positionId);

  const result = await queryContract('getStakePosition', [userHex, positionIdHex]);

  if (!result || result.length === 0 || result[0] === '') {
    return null;
  }

  try {
    // Decode the position struct from the response
    // StakePosition: amount (BigUint), lock_level (u8), start_epoch (u64), end_epoch (u64), last_claim_epoch (u64), accumulated_rewards (BigUint)
    const hex = base64ToHex(result[0]);

    // Parse nested encoded struct
    let offset = 0;

    // Amount (BigUint - 4 bytes length prefix + data)
    const amountLen = parseInt(hex.slice(offset, offset + 8), 16);
    offset += 8;
    const amountHex = hex.slice(offset, offset + amountLen * 2);
    offset += amountLen * 2;

    // Lock level (u8 - 1 byte)
    const lockLevel = parseInt(hex.slice(offset, offset + 2), 16);
    offset += 2;

    // Start epoch (u64 - 8 bytes)
    const startEpoch = parseInt(hex.slice(offset, offset + 16), 16);
    offset += 16;

    // End epoch (u64 - 8 bytes)
    const endEpoch = parseInt(hex.slice(offset, offset + 16), 16);
    offset += 16;

    // Last claim epoch (u64 - 8 bytes)
    const lastClaimEpoch = parseInt(hex.slice(offset, offset + 16), 16);
    offset += 16;

    // Accumulated rewards (BigUint - 4 bytes length prefix + data)
    const rewardsLen = parseInt(hex.slice(offset, offset + 8), 16);
    offset += 8;
    const rewardsHex = hex.slice(offset, offset + rewardsLen * 2);

    return {
      positionId,
      amount: parseTokenAmount(amountHex),
      lockLevel,
      startEpoch,
      endEpoch,
      lastClaimEpoch,
      accumulatedRewards: parseTokenAmount(rewardsHex)
    };
  } catch (error) {
    console.error('Error parsing stake position:', error);
    return null;
  }
};

/**
 * Get all user positions
 */
export const getAllUserPositions = async (userAddress: string): Promise<StakePosition[]> => {
  const count = await getUserPositionCount(userAddress);
  const positions: StakePosition[] = [];

  // Fetch each position (positions are 1-indexed)
  for (let i = 1; i <= count; i++) {
    const position = await getStakePosition(userAddress, i);
    if (position) {
      positions.push(position);
    }
  }

  return positions;
};

/**
 * Get total staked by user (for DAO voting power)
 */
export const getTotalStakedByUser = async (userAddress: string): Promise<string> => {
  const userHex = addressToHex(userAddress);
  const result = await queryContract('getTotalStakedByUser', [userHex]);

  if (!result || result.length === 0 || result[0] === '') {
    return '0';
  }

  const hex = base64ToHex(result[0]);
  return parseTokenAmount(hex);
};

/**
 * Get NFT bonus for a user in basis points (500 = 5%)
 */
export const getNftBonus = async (userAddress: string): Promise<number> => {
  const userHex = addressToHex(userAddress);
  const result = await queryContract('getNftBonus', [userHex]);

  if (!result || result.length === 0 || result[0] === '') {
    return 0;
  }

  const hex = base64ToHex(result[0]);
  return parseInt(hex, 16) || 0;
};

/**
 * Get effective APY for a user with NFT bonus applied
 */
export const getEffectiveApy = async (userAddress: string, lockLevel: number): Promise<number> => {
  const userHex = addressToHex(userAddress);
  const lockLevelHex = numberToHex(lockLevel);
  const result = await queryContract('getEffectiveApy', [userHex, lockLevelHex]);

  if (!result || result.length === 0 || result[0] === '') {
    return 0;
  }

  const hex = base64ToHex(result[0]);
  return parseInt(hex, 16) || 0;
};

/**
 * Get NFT contract address configured in staking
 */
export const getNftContract = async (): Promise<string> => {
  const result = await queryContract('getNftContract', []);

  if (!result || result.length === 0 || result[0] === '') {
    return '';
  }

  try {
    const hex = base64ToHex(result[0]);
    const addr = Address.fromHex(hex);
    return addr.bech32();
  } catch {
    return '';
  }
};
