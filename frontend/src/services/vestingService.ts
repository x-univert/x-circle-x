import {
  Address,
  SmartContractTransactionsFactory,
  TransactionsFactoryConfig,
  U64Value
} from '@multiversx/sdk-core';
import { signAndSendTransactionsWithHash } from '../helpers/signAndSendTransactions';
import BigNumber from 'bignumber.js';
import {
  VESTING_CONTRACT_ADDRESS,
  XCIRCLEX_TOKEN_ID,
  XCIRCLEX_DECIMALS,
  NETWORK_CONFIG
} from '../config/contracts';
import { chainId } from '../config';

const factoryConfig = new TransactionsFactoryConfig({ chainID: chainId });
const factory = new SmartContractTransactionsFactory({ config: factoryConfig });

// Gas limits for vesting transactions
const VESTING_GAS_LIMITS = {
  release: 15_000_000,
  releaseAll: 30_000_000,
};

// Types
export interface VestingSchedule {
  scheduleId: number;
  beneficiary: string;
  totalAmount: string;
  releasedAmount: string;
  startEpoch: number;
  cliffEpochs: number;
  vestingDurationEpochs: number;
  category: string;
  isRevoked: boolean;
}

export interface VestingStats {
  totalVested: string;
  totalReleased: string;
  contractBalance: string;
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

const hexToAddress = (hex: string): string => {
  // Convert hex string to Uint8Array
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  // Create Address from pubkey bytes
  const addr = new Address(bytes);
  return addr.toBech32();
};

const categoryFromInt = (value: number): string => {
  switch (value) {
    case 0: return 'Team';
    case 1: return 'Advisors';
    case 2: return 'Marketing';
    case 3: return 'Custom';
    default: return 'Unknown';
  }
};

/**
 * Query the vesting smart contract
 */
const queryContract = async (funcName: string, args: string[] = []): Promise<any> => {
  const url = `${NETWORK_CONFIG.apiAddress}/vm-values/query`;
  const body = {
    scAddress: VESTING_CONTRACT_ADDRESS,
    funcName,
    args
  };

  console.log(`[Vesting] Querying ${funcName} with args:`, args);
  console.log(`[Vesting] URL: ${url}`);
  console.log(`[Vesting] Contract: ${VESTING_CONTRACT_ADDRESS}`);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const data = await response.json();
    console.log(`[Vesting] Response for ${funcName}:`, data);

    if (data.data?.data?.returnData) {
      console.log(`[Vesting] Return data for ${funcName}:`, data.data.data.returnData);
      return data.data.data.returnData;
    }
    console.log(`[Vesting] No returnData for ${funcName}`);
    return null;
  } catch (error) {
    console.error(`[Vesting] Error querying ${funcName}:`, error);
    return null;
  }
};

// ============================================================================
// TRANSACTION FUNCTIONS
// ============================================================================

/**
 * Release vested tokens for a specific schedule
 */
export const release = async (
  scheduleId: number,
  senderAddress: string
): Promise<string[]> => {
  const sender = new Address(senderAddress);
  const contract = new Address(VESTING_CONTRACT_ADDRESS);

  const transaction = await factory.createTransactionForExecute(sender, {
    contract: contract,
    function: 'release',
    gasLimit: BigInt(VESTING_GAS_LIMITS.release),
    arguments: [new U64Value(BigInt(scheduleId))]
  });

  const result = await signAndSendTransactionsWithHash({
    transactions: [transaction],
    transactionsDisplayInfo: {
      processingMessage: 'Liberation des tokens en cours...',
      errorMessage: 'Liberation echouee',
      successMessage: 'Tokens liberes avec succes!'
    }
  });

  return result.transactionHashes;
};

/**
 * Release all vested tokens for all schedules of the caller
 */
export const releaseAll = async (
  senderAddress: string
): Promise<string[]> => {
  const sender = new Address(senderAddress);
  const contract = new Address(VESTING_CONTRACT_ADDRESS);

  const transaction = await factory.createTransactionForExecute(sender, {
    contract: contract,
    function: 'releaseAll',
    gasLimit: BigInt(VESTING_GAS_LIMITS.releaseAll),
    arguments: []
  });

  const result = await signAndSendTransactionsWithHash({
    transactions: [transaction],
    transactionsDisplayInfo: {
      processingMessage: 'Liberation de tous les tokens...',
      errorMessage: 'Liberation echouee',
      successMessage: 'Tous les tokens disponibles ont ete liberes!'
    }
  });

  return result.transactionHashes;
};

// ============================================================================
// VIEW FUNCTIONS
// ============================================================================

/**
 * Get beneficiary's schedule IDs
 */
export const getBeneficiarySchedules = async (beneficiaryAddress: string): Promise<number[]> => {
  console.log('[Vesting] getBeneficiarySchedules called with address:', beneficiaryAddress);
  const beneficiaryHex = addressToHex(beneficiaryAddress);
  console.log('[Vesting] Address converted to hex:', beneficiaryHex);

  const result = await queryContract('getBeneficiarySchedules', [beneficiaryHex]);
  console.log('[Vesting] Raw result from contract:', result);

  if (!result || result.length === 0) {
    console.log('[Vesting] No result or empty result');
    return [];
  }

  const scheduleIds: number[] = [];
  for (let i = 0; i < result.length; i++) {
    const item = result[i];
    console.log(`[Vesting] Processing item ${i}:`, item, 'type:', typeof item);

    try {
      // Empty string in base64 means value 0 (MultiversX top-encoding)
      if (!item || item === '') {
        console.log(`[Vesting] Item ${i} is empty = ID 0`);
        scheduleIds.push(0);
        continue;
      }

      const hex = base64ToHex(item);
      console.log(`[Vesting] Item ${i} decoded to hex:`, hex);
      if (hex && hex.length > 0) {
        const id = parseInt(hex, 16);
        console.log(`[Vesting] Item ${i} parsed as ID:`, id);
        if (!isNaN(id) && id >= 0) {
          scheduleIds.push(id);
        }
      } else {
        // Empty hex also means 0
        scheduleIds.push(0);
      }
    } catch (e) {
      console.warn('[Vesting] Error parsing schedule ID:', e);
    }
  }

  console.log('[Vesting] Final schedule IDs:', scheduleIds);
  return scheduleIds;
};

/**
 * Get vesting schedule details
 */
export const getVestingSchedule = async (scheduleId: number): Promise<VestingSchedule | null> => {
  const scheduleIdHex = numberToHex(scheduleId);
  const result = await queryContract('getVestingSchedule', [scheduleIdHex]);

  if (!result || result.length === 0 || result[0] === '') {
    console.log('No schedule data returned for ID:', scheduleId);
    return null;
  }

  try {
    const hex = base64ToHex(result[0]);
    console.log(`Parsing schedule ${scheduleId}, hex length: ${hex.length}`);
    let offset = 0;

    // Beneficiary (32 bytes address)
    const beneficiaryHex = hex.slice(offset, offset + 64);
    offset += 64;
    const beneficiary = hexToAddress(beneficiaryHex);

    // Total amount (BigUint - 4 bytes length prefix + data)
    const totalAmountLen = parseInt(hex.slice(offset, offset + 8), 16);
    offset += 8;
    const totalAmountHex = totalAmountLen > 0 ? hex.slice(offset, offset + totalAmountLen * 2) : '0';
    offset += totalAmountLen * 2;

    // Released amount (BigUint - 4 bytes length prefix + data)
    const releasedAmountLen = parseInt(hex.slice(offset, offset + 8), 16);
    offset += 8;
    const releasedAmountHex = releasedAmountLen > 0 ? hex.slice(offset, offset + releasedAmountLen * 2) : '0';
    offset += releasedAmountLen * 2;

    // Start epoch (u64 - 8 bytes)
    const startEpoch = parseInt(hex.slice(offset, offset + 16), 16) || 0;
    offset += 16;

    // Cliff epochs (u64 - 8 bytes)
    const cliffEpochs = parseInt(hex.slice(offset, offset + 16), 16) || 0;
    offset += 16;

    // Vesting duration epochs (u64 - 8 bytes)
    const vestingDurationEpochs = parseInt(hex.slice(offset, offset + 16), 16) || 0;
    offset += 16;

    // Category (u8 - 1 byte)
    const categoryInt = parseInt(hex.slice(offset, offset + 2), 16) || 0;
    offset += 2;

    // Is revoked (bool - 1 byte)
    const isRevoked = hex.slice(offset, offset + 2) === '01';

    const schedule = {
      scheduleId,
      beneficiary,
      totalAmount: parseTokenAmount(totalAmountHex),
      releasedAmount: parseTokenAmount(releasedAmountHex),
      startEpoch,
      cliffEpochs,
      vestingDurationEpochs,
      category: categoryFromInt(categoryInt),
      isRevoked
    };

    console.log('Parsed schedule:', schedule);
    return schedule;
  } catch (error) {
    console.error('Error parsing vesting schedule:', error);
    return null;
  }
};

/**
 * Get releasable amount for a schedule
 */
export const getReleasableAmount = async (scheduleId: number): Promise<string> => {
  const scheduleIdHex = numberToHex(scheduleId);
  const result = await queryContract('getReleasableAmount', [scheduleIdHex]);

  if (!result || result.length === 0 || result[0] === '') {
    return '0';
  }

  const hex = base64ToHex(result[0]);
  return parseTokenAmount(hex);
};

/**
 * Get vested amount for a schedule
 */
export const getVestedAmount = async (scheduleId: number): Promise<string> => {
  const scheduleIdHex = numberToHex(scheduleId);
  const result = await queryContract('getVestedAmount', [scheduleIdHex]);

  if (!result || result.length === 0 || result[0] === '') {
    return '0';
  }

  const hex = base64ToHex(result[0]);
  return parseTokenAmount(hex);
};

/**
 * Get time until cliff ends for a schedule
 */
export const getTimeUntilCliffEnd = async (scheduleId: number): Promise<number> => {
  const scheduleIdHex = numberToHex(scheduleId);
  const result = await queryContract('getTimeUntilCliffEnd', [scheduleIdHex]);

  if (!result || result.length === 0 || result[0] === '') {
    return 0;
  }

  const hex = base64ToHex(result[0]);
  return parseInt(hex, 16) || 0;
};

/**
 * Get time until fully vested for a schedule
 */
export const getTimeUntilFullyVested = async (scheduleId: number): Promise<number> => {
  const scheduleIdHex = numberToHex(scheduleId);
  const result = await queryContract('getTimeUntilFullyVested', [scheduleIdHex]);

  if (!result || result.length === 0 || result[0] === '') {
    return 0;
  }

  const hex = base64ToHex(result[0]);
  return parseInt(hex, 16) || 0;
};

/**
 * Get total vested amount across all schedules
 */
export const getTotalVested = async (): Promise<string> => {
  const result = await queryContract('getTotalVested');

  if (!result || result.length === 0 || result[0] === '') {
    return '0';
  }

  const hex = base64ToHex(result[0]);
  return parseTokenAmount(hex);
};

/**
 * Get total released amount across all schedules
 */
export const getTotalReleased = async (): Promise<string> => {
  const result = await queryContract('getTotalReleased');

  if (!result || result.length === 0 || result[0] === '') {
    return '0';
  }

  const hex = base64ToHex(result[0]);
  return parseTokenAmount(hex);
};

/**
 * Get vesting contract token balance
 */
export const getContractBalance = async (): Promise<string> => {
  try {
    const response = await fetch(
      `${NETWORK_CONFIG.apiRestAddress}/accounts/${VESTING_CONTRACT_ADDRESS}/tokens/${XCIRCLEX_TOKEN_ID}`
    );

    if (!response.ok) {
      return '0';
    }

    const data = await response.json();
    const balance = new BigNumber(data.balance || '0');
    return balance.dividedBy(new BigNumber(10).pow(XCIRCLEX_DECIMALS)).toString();
  } catch (error) {
    console.error('Error fetching contract balance:', error);
    return '0';
  }
};

/**
 * Get vesting statistics
 */
export const getVestingStats = async (): Promise<VestingStats> => {
  const [totalVested, totalReleased, contractBalance] = await Promise.all([
    getTotalVested(),
    getTotalReleased(),
    getContractBalance()
  ]);

  return {
    totalVested,
    totalReleased,
    contractBalance,
    tokenId: XCIRCLEX_TOKEN_ID
  };
};

/**
 * Get all vesting schedules for a beneficiary with computed values
 */
export const getAllBeneficiarySchedules = async (beneficiaryAddress: string): Promise<VestingSchedule[]> => {
  const scheduleIds = await getBeneficiarySchedules(beneficiaryAddress);
  const schedules: VestingSchedule[] = [];

  for (const id of scheduleIds) {
    const schedule = await getVestingSchedule(id);
    if (schedule) {
      schedules.push(schedule);
    }
  }

  return schedules;
};

/**
 * Get current blockchain epoch
 */
export const getCurrentEpoch = async (): Promise<number> => {
  try {
    const response = await fetch(`${NETWORK_CONFIG.apiRestAddress}/stats`);
    const data = await response.json();
    return data.epoch || 0;
  } catch (error) {
    console.error('Error fetching current epoch:', error);
    return 0;
  }
};
