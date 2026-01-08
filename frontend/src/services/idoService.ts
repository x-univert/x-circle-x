import {
  Address,
  SmartContractTransactionsFactory,
  TransactionsFactoryConfig,
  BigUIntValue
} from '@multiversx/sdk-core';
import { signAndSendTransactionsWithHash } from '../helpers/signAndSendTransactions';
import BigNumber from 'bignumber.js';
import {
  IDO_CONTRACT_ADDRESS,
  XCIRCLEX_TOKEN_ID,
  XCIRCLEX_DECIMALS,
  IDO_GAS_LIMITS,
  NETWORK_CONFIG
} from '../config/contracts';

const factoryConfig = new TransactionsFactoryConfig({ chainID: 'D' });
const factory = new SmartContractTransactionsFactory({ config: factoryConfig });

// Types
export interface Contribution {
  amountEgld: string;
  tokensToReceive: string;
  claimed: boolean;
  refunded: boolean;
}

export type IdoStatus = 'NotStarted' | 'Active' | 'Ended' | 'Finalized' | 'Cancelled';

export interface IdoInfo {
  tokenId: string;
  rate: string;
  softCap: string;
  hardCap: string;
  minContribution: string;
  maxContribution: string;
  startTime: number;
  endTime: number;
  totalRaised: string;
  totalParticipants: number;
  isFinalized: boolean;
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
 * Query the IDO smart contract
 */
const queryContract = async (funcName: string, args: string[] = []): Promise<any> => {
  try {
    const response = await fetch(
      `${NETWORK_CONFIG.apiAddress}/vm-values/query`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scAddress: IDO_CONTRACT_ADDRESS,
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
 * Contribute EGLD to the IDO
 */
export const contribute = async (
  amountEgld: string,
  senderAddress: string
): Promise<string[]> => {
  const amountInWei = new BigNumber(amountEgld)
    .multipliedBy(new BigNumber(10).pow(18))
    .toFixed(0);

  const sender = new Address(senderAddress);
  const contract = new Address(IDO_CONTRACT_ADDRESS);

  const transaction = await factory.createTransactionForExecute(sender, {
    contract: contract,
    function: 'contribute',
    gasLimit: BigInt(IDO_GAS_LIMITS.contribute),
    arguments: [],
    nativeTransferAmount: BigInt(amountInWei)
  });

  const result = await signAndSendTransactionsWithHash({
    transactions: [transaction],
    transactionsDisplayInfo: {
      processingMessage: 'Contributing to IDO...',
      errorMessage: 'Contribution failed',
      successMessage: 'Contribution successful!'
    }
  });

  return result.transactionHashes;
};

/**
 * Claim tokens after IDO finalization (if soft cap reached)
 */
export const claimTokens = async (
  senderAddress: string
): Promise<string[]> => {
  const sender = new Address(senderAddress);
  const contract = new Address(IDO_CONTRACT_ADDRESS);

  const transaction = await factory.createTransactionForExecute(sender, {
    contract: contract,
    function: 'claimTokens',
    gasLimit: BigInt(IDO_GAS_LIMITS.claimTokens),
    arguments: []
  });

  const result = await signAndSendTransactionsWithHash({
    transactions: [transaction],
    transactionsDisplayInfo: {
      processingMessage: 'Claiming tokens...',
      errorMessage: 'Claim failed',
      successMessage: 'Tokens claimed successfully!'
    }
  });

  return result.transactionHashes;
};

/**
 * Request refund if IDO is cancelled (soft cap not reached)
 */
export const refund = async (
  senderAddress: string
): Promise<string[]> => {
  const sender = new Address(senderAddress);
  const contract = new Address(IDO_CONTRACT_ADDRESS);

  const transaction = await factory.createTransactionForExecute(sender, {
    contract: contract,
    function: 'refund',
    gasLimit: BigInt(IDO_GAS_LIMITS.refund),
    arguments: []
  });

  const result = await signAndSendTransactionsWithHash({
    transactions: [transaction],
    transactionsDisplayInfo: {
      processingMessage: 'Requesting refund...',
      errorMessage: 'Refund failed',
      successMessage: 'Refund successful!'
    }
  });

  return result.transactionHashes;
};

// ============================================================================
// VIEW FUNCTIONS
// ============================================================================

/**
 * Get user's contribution
 */
export const getContribution = async (userAddress: string): Promise<Contribution> => {
  const userHex = addressToHex(userAddress);
  const result = await queryContract('getContribution', [userHex]);

  if (!result || result.length === 0 || result[0] === '') {
    return {
      amountEgld: '0',
      tokensToReceive: '0',
      claimed: false,
      refunded: false
    };
  }

  try {
    // Decode the Contribution struct
    // amount_egld (BigUint), tokens_to_receive (BigUint), claimed (bool), refunded (bool)
    const hex = base64ToHex(result[0]);
    let offset = 0;

    // Amount EGLD (BigUint - 4 bytes length prefix + data)
    const amountLen = parseInt(hex.slice(offset, offset + 8), 16);
    offset += 8;
    const amountHex = hex.slice(offset, offset + amountLen * 2);
    offset += amountLen * 2;

    // Tokens to receive (BigUint - 4 bytes length prefix + data)
    const tokensLen = parseInt(hex.slice(offset, offset + 8), 16);
    offset += 8;
    const tokensHex = hex.slice(offset, offset + tokensLen * 2);
    offset += tokensLen * 2;

    // Claimed (bool - 1 byte)
    const claimed = hex.slice(offset, offset + 2) === '01';
    offset += 2;

    // Refunded (bool - 1 byte)
    const refunded = hex.slice(offset, offset + 2) === '01';

    return {
      amountEgld: parseEgldAmount(amountHex),
      tokensToReceive: parseTokenAmount(tokensHex),
      claimed,
      refunded
    };
  } catch (error) {
    console.error('Error parsing contribution:', error);
    return {
      amountEgld: '0',
      tokensToReceive: '0',
      claimed: false,
      refunded: false
    };
  }
};

/**
 * Get IDO status
 */
export const getIdoStatus = async (): Promise<IdoStatus> => {
  const result = await queryContract('getIdoStatus', []);

  if (!result || result.length === 0 || result[0] === '') {
    return 'NotStarted';
  }

  const hex = base64ToHex(result[0]);
  const statusValue = parseInt(hex, 16);

  switch (statusValue) {
    case 0: return 'NotStarted';
    case 1: return 'Active';
    case 2: return 'Ended';
    case 3: return 'Finalized';
    case 4: return 'Cancelled';
    default: return 'NotStarted';
  }
};

/**
 * Get complete IDO info by querying individual endpoints
 * Uses a combination of contract queries and hardcoded config for reliability
 */
export const getIdoInfo = async (): Promise<IdoInfo> => {
  try {
    // Query the dynamic values from the contract
    const [
      raisedResult,
      participantsResult,
      statusResult,
      timeRemainingResult
    ] = await Promise.all([
      queryContract('getTotalRaised', []),
      queryContract('getTotalParticipants', []),
      queryContract('getIdoStatus', []),
      queryContract('getTimeRemaining', [])
    ]);

    // Parse total raised
    let totalRaised = '0';
    if (raisedResult && raisedResult.length > 0 && raisedResult[0]) {
      const raisedHex = base64ToHex(raisedResult[0]);
      totalRaised = parseEgldAmount(raisedHex);
    }

    // Parse total participants
    let totalParticipants = 0;
    if (participantsResult && participantsResult.length > 0 && participantsResult[0]) {
      const participantsHex = base64ToHex(participantsResult[0]);
      totalParticipants = parseInt(participantsHex, 16) || 0;
    }

    // Parse status to determine if finalized
    let isFinalized = false;
    if (statusResult && statusResult.length > 0 && statusResult[0]) {
      const statusHex = base64ToHex(statusResult[0]);
      const statusValue = parseInt(statusHex, 16);
      isFinalized = statusValue === 3; // 3 = Finalized
    }

    // Calculate times from config - IDO started 1 hour after deployment (Jan 4, 2026)
    // Start time and end time are set in the contract, we'll derive from timeRemaining
    const now = Math.floor(Date.now() / 1000);
    let endTime = now;
    let startTime = now - 3600; // Default to 1 hour ago

    if (timeRemainingResult && timeRemainingResult.length > 0 && timeRemainingResult[0]) {
      const timeHex = base64ToHex(timeRemainingResult[0]);
      const remaining = parseInt(timeHex, 16) || 0;
      endTime = now + remaining;
      // Start time is end time - 14 days (IDO duration)
      startTime = endTime - (14 * 24 * 60 * 60);
    }

    // Use hardcoded values from IDO_CONFIG for static parameters
    // These don't change after deployment
    const { IDO_CONFIG } = await import('../config/contracts');

    return {
      tokenId: XCIRCLEX_TOKEN_ID,
      rate: String(IDO_CONFIG.rate),
      softCap: String(IDO_CONFIG.softCap), // 180 EGLD
      hardCap: String(IDO_CONFIG.hardCap), // 360 EGLD
      minContribution: String(IDO_CONFIG.minContribution), // 0.5 EGLD
      maxContribution: String(IDO_CONFIG.maxContribution), // 20 EGLD
      startTime,
      endTime,
      totalRaised,
      totalParticipants,
      isFinalized
    };
  } catch (error) {
    console.error('Error fetching IDO info:', error);
    // Return config defaults on error
    const { IDO_CONFIG } = await import('../config/contracts');
    return {
      tokenId: XCIRCLEX_TOKEN_ID,
      rate: String(IDO_CONFIG.rate),
      softCap: String(IDO_CONFIG.softCap),
      hardCap: String(IDO_CONFIG.hardCap),
      minContribution: String(IDO_CONFIG.minContribution),
      maxContribution: String(IDO_CONFIG.maxContribution),
      startTime: 0,
      endTime: 0,
      totalRaised: '0',
      totalParticipants: 0,
      isFinalized: false
    };
  }
};

/**
 * Get total EGLD raised
 */
export const getTotalRaised = async (): Promise<string> => {
  const result = await queryContract('getTotalRaised', []);

  if (!result || result.length === 0 || result[0] === '') {
    return '0';
  }

  const hex = base64ToHex(result[0]);
  return parseEgldAmount(hex);
};

/**
 * Get total participants count
 */
export const getTotalParticipants = async (): Promise<number> => {
  const result = await queryContract('getTotalParticipants', []);

  if (!result || result.length === 0 || result[0] === '') {
    return 0;
  }

  const hex = base64ToHex(result[0]);
  return parseInt(hex, 16) || 0;
};

/**
 * Get time remaining until IDO ends
 */
export const getTimeRemaining = async (): Promise<number> => {
  const result = await queryContract('getTimeRemaining', []);

  if (!result || result.length === 0 || result[0] === '') {
    return 0;
  }

  const hex = base64ToHex(result[0]);
  return parseInt(hex, 16) || 0;
};

/**
 * Get remaining EGLD allocation until hard cap
 */
export const getRemainingAllocation = async (): Promise<string> => {
  const result = await queryContract('getRemainingAllocation', []);

  if (!result || result.length === 0 || result[0] === '') {
    return '0';
  }

  const hex = base64ToHex(result[0]);
  return parseEgldAmount(hex);
};

/**
 * Get total tokens deposited for distribution
 */
export const getTokensDeposited = async (): Promise<string> => {
  const result = await queryContract('getTokensDeposited', []);

  if (!result || result.length === 0 || result[0] === '') {
    return '0';
  }

  const hex = base64ToHex(result[0]);
  return parseTokenAmount(hex);
};

/**
 * Check if soft cap is reached
 */
export const isSoftCapReached = async (): Promise<boolean> => {
  const result = await queryContract('isSoftCapReached', []);

  if (!result || result.length === 0 || result[0] === '') {
    return false;
  }

  const hex = base64ToHex(result[0]);
  return hex === '01';
};

/**
 * Check if hard cap is reached
 */
export const isHardCapReached = async (): Promise<boolean> => {
  const result = await queryContract('isHardCapReached', []);

  if (!result || result.length === 0 || result[0] === '') {
    return false;
  }

  const hex = base64ToHex(result[0]);
  return hex === '01';
};

/**
 * Calculate tokens for a given EGLD amount
 */
export const calculateTokensForEgld = async (egldAmount: string): Promise<string> => {
  const amountInWei = new BigNumber(egldAmount)
    .multipliedBy(new BigNumber(10).pow(18))
    .toFixed(0);

  const amountHex = BigInt(amountInWei).toString(16).padStart(2, '0');

  const result = await queryContract('calculateTokensForEgld', [amountHex]);

  if (!result || result.length === 0 || result[0] === '') {
    return '0';
  }

  const hex = base64ToHex(result[0]);
  return parseTokenAmount(hex);
};

/**
 * Get user's EGLD balance
 */
export const getUserEgldBalance = async (userAddress: string): Promise<string> => {
  try {
    const response = await fetch(
      `${NETWORK_CONFIG.apiAddress}/accounts/${userAddress}`
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
 * Check if user can contribute (not already max, IDO active)
 */
export const canUserContribute = async (userAddress: string): Promise<{
  canContribute: boolean;
  reason?: string;
  maxAmount: string;
}> => {
  try {
    const [idoInfo, contribution, status] = await Promise.all([
      getIdoInfo(),
      getContribution(userAddress),
      getIdoStatus()
    ]);

    if (status !== 'Active' && status !== 'NotStarted') {
      return { canContribute: false, reason: 'IDO is not active', maxAmount: '0' };
    }

    const currentContribution = new BigNumber(contribution.amountEgld);
    const maxContribution = new BigNumber(idoInfo.maxContribution);
    const remainingForUser = maxContribution.minus(currentContribution);

    if (remainingForUser.lte(0)) {
      return { canContribute: false, reason: 'Maximum contribution reached', maxAmount: '0' };
    }

    const remainingAllocation = new BigNumber(idoInfo.hardCap).minus(new BigNumber(idoInfo.totalRaised));
    const actualMax = BigNumber.min(remainingForUser, remainingAllocation);

    if (actualMax.lte(0)) {
      return { canContribute: false, reason: 'Hard cap reached', maxAmount: '0' };
    }

    return {
      canContribute: true,
      maxAmount: actualMax.toString()
    };
  } catch (error) {
    console.error('Error checking contribution eligibility:', error);
    return { canContribute: false, reason: 'Error checking eligibility', maxAmount: '0' };
  }
};
