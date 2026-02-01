import {
  Address,
  SmartContractTransactionsFactory,
  TransactionsFactoryConfig,
  Token,
  TokenTransfer,
  U64Value,
  BooleanValue,
  BytesValue,
  AddressValue,
  BigUIntValue
} from '@multiversx/sdk-core';
import { signAndSendTransactionsWithHash } from '../helpers/signAndSendTransactions';
import BigNumber from 'bignumber.js';
import {
  DAO_CONTRACT_ADDRESS,
  XCIRCLEX_TOKEN_ID,
  XCIRCLEX_DECIMALS,
  NETWORK_CONFIG
} from '../config/contracts';
import { chainId } from '../config';

const factoryConfig = new TransactionsFactoryConfig({ chainID: chainId });
const factory = new SmartContractTransactionsFactory({ config: factoryConfig });

// Gas limits for DAO operations
const DAO_GAS_LIMITS = {
  createProposal: 30000000,
  vote: 15000000,
  finalizeProposal: 20000000,
  executeProposal: 50000000,
  cancelProposal: 15000000,
  depositToTreasury: 10000000,
  emergencyWithdraw: 20000000,
  setParameter: 10000000
};

// Types
export interface Proposal {
  id: number;
  proposer: string;
  title: string;
  description: string;
  proposalType: number;
  createdAt: number;
  votingEndsAt: number;
  executionTime: number;
  votesFor: string;
  votesAgainst: string;
  status: ProposalStatus;
  executed: boolean;
  targetAddress: string;  // Address for transfers/member changes
  amount: string;         // Amount for fund transfers
  callData?: string;
}

export enum ProposalStatus {
  Active = 0,
  Passed = 1,
  Failed = 2,
  Executed = 3,
  Cancelled = 4,
  Expired = 5
}

export interface DaoStats {
  treasuryBalance: string;
  egldTreasuryBalance: string;  // NEW: EGLD treasury balance
  proposalCount: number;
  minProposalThreshold: string;
  votingPeriod: number;
  timelockPeriod: number;
  quorumPercentage: number;
  passThreshold: number;
  tokenId: string;
}

export interface VoteInfo {
  hasVoted: boolean;
  votedFor: boolean;
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

const numberToHex = (num: number | bigint): string => {
  const hex = BigInt(num).toString(16);
  // Ensure even length and at least 2 chars for API compatibility
  const padded = hex.length % 2 === 0 ? hex : '0' + hex;
  return padded.length >= 2 ? padded : '0' + padded;
};

/**
 * Query the DAO smart contract
 */
const queryContract = async (funcName: string, args: string[] = []): Promise<any> => {
  try {
    const response = await fetch(
      `${NETWORK_CONFIG.apiAddress}/vm-values/query`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scAddress: DAO_CONTRACT_ADDRESS,
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
// VIEW FUNCTIONS
// ============================================================================

/**
 * Get DAO treasury balance
 */
export const getTreasuryBalance = async (): Promise<string> => {
  const result = await queryContract('getTreasuryBalance');
  if (!result || result.length === 0 || result[0] === '') {
    return '0';
  }
  const hex = base64ToHex(result[0]);
  return parseTokenAmount(hex);
};

/**
 * Get proposal count
 */
export const getProposalCount = async (): Promise<number> => {
  const result = await queryContract('getProposalCount');
  if (!result || result.length === 0 || result[0] === '') {
    return 0;
  }
  const hex = base64ToHex(result[0]);
  return parseInt(hex, 16) || 0;
};

/**
 * Get DAO parameters
 */
export const getDaoStats = async (): Promise<DaoStats> => {
  const [
    treasuryResult,
    egldTreasuryResult,
    countResult,
    thresholdResult,
    votingPeriodResult,
    timelockResult,
    quorumResult,
    passResult,
    tokenResult
  ] = await Promise.all([
    queryContract('getTreasuryBalance'),
    queryContract('getEgldTreasuryBalance'),  // NEW: Get EGLD treasury
    queryContract('getProposalCount'),
    queryContract('getMinProposalThreshold'),
    queryContract('getVotingPeriod'),
    queryContract('getTimelockPeriod'),
    queryContract('getQuorumPercentage'),
    queryContract('getPassThreshold'),
    queryContract('getTokenId')
  ]);

  return {
    treasuryBalance: treasuryResult?.[0] ? parseTokenAmount(base64ToHex(treasuryResult[0])) : '0',
    egldTreasuryBalance: egldTreasuryResult?.[0] ? parseTokenAmount(base64ToHex(egldTreasuryResult[0])) : '0',
    proposalCount: countResult?.[0] ? parseInt(base64ToHex(countResult[0]), 16) || 0 : 0,
    minProposalThreshold: thresholdResult?.[0] ? parseTokenAmount(base64ToHex(thresholdResult[0])) : '0',
    votingPeriod: votingPeriodResult?.[0] ? parseInt(base64ToHex(votingPeriodResult[0]), 16) || 0 : 0,
    timelockPeriod: timelockResult?.[0] ? parseInt(base64ToHex(timelockResult[0]), 16) || 0 : 0,
    quorumPercentage: quorumResult?.[0] ? parseInt(base64ToHex(quorumResult[0]), 16) || 0 : 0,
    passThreshold: passResult?.[0] ? parseInt(base64ToHex(passResult[0]), 16) || 0 : 0,
    tokenId: tokenResult?.[0] ? atob(tokenResult[0]) : XCIRCLEX_TOKEN_ID
  };
};

/**
 * Get user's voting power
 * Calculated as: wallet balance + staked tokens
 * Note: We calculate this client-side because the contract's get_esdt_balance
 * doesn't work reliably for external account balances
 */
export const getVotingPower = async (userAddress: string): Promise<string> => {
  try {
    // Get wallet balance
    const walletBalance = await getUserTokenBalance(userAddress);

    // Get staked balance from staking contract
    let stakedBalance = '0';
    try {
      const { getTotalStakedByUser } = await import('./stakingService');
      stakedBalance = await getTotalStakedByUser(userAddress);
    } catch (e) {
      console.warn('Could not fetch staked balance:', e);
    }

    // Total voting power = wallet + staked
    const total = new BigNumber(walletBalance).plus(new BigNumber(stakedBalance));
    return total.toString();
  } catch (error) {
    console.error('Error calculating voting power:', error);
    return '0';
  }
};

/**
 * Check if user has voted on a proposal
 */
export const hasVoted = async (userAddress: string, proposalId: number): Promise<boolean> => {
  const userHex = addressToHex(userAddress);
  const proposalIdHex = numberToHex(proposalId);
  const result = await queryContract('hasVoted', [userHex, proposalIdHex]);
  if (!result || result.length === 0 || result[0] === '') {
    return false;
  }
  const hex = base64ToHex(result[0]);
  return hex === '01';
};

/**
 * Get user's vote on a proposal
 */
export const getVote = async (userAddress: string, proposalId: number): Promise<VoteInfo> => {
  const userHex = addressToHex(userAddress);
  const proposalIdHex = numberToHex(proposalId);
  const result = await queryContract('getVote', [userHex, proposalIdHex]);

  if (!result || result.length === 0 || result[0] === '') {
    return { hasVoted: false, votedFor: false };
  }

  const hex = base64ToHex(result[0]);
  return {
    hasVoted: true,
    votedFor: hex === '01'
  };
};

/**
 * Check if user is a council member
 */
export const isCouncilMember = async (userAddress: string): Promise<boolean> => {
  const userHex = addressToHex(userAddress);
  const result = await queryContract('isCouncilMember', [userHex]);
  if (!result || result.length === 0 || result[0] === '') {
    return false;
  }
  const hex = base64ToHex(result[0]);
  return hex === '01';
};

/**
 * Get active proposals
 */
export const getActiveProposals = async (): Promise<number[]> => {
  const result = await queryContract('getActiveProposals');
  if (!result || result.length === 0) {
    return [];
  }

  // Parse the list of proposal IDs
  const proposalIds: number[] = [];
  for (const item of result) {
    if (item && item !== '') {
      const hex = base64ToHex(item);
      if (hex) {
        proposalIds.push(parseInt(hex, 16) || 0);
      }
    }
  }
  return proposalIds;
};

/**
 * Helper to convert hex to string (browser compatible)
 */
const hexToString = (hex: string): string => {
  let str = '';
  for (let i = 0; i < hex.length; i += 2) {
    str += String.fromCharCode(parseInt(hex.slice(i, i + 2), 16));
  }
  return str;
};

/**
 * Helper to convert hex to Uint8Array (browser compatible)
 */
const hexToBytes = (hex: string): Uint8Array => {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes;
};

/**
 * Helper to convert hex address to bech32 (browser compatible)
 * Uses Address.newFromHex which works in browser
 */
const hexToAddress = (hex: string): string => {
  try {
    const addr = Address.newFromHex(hex);
    return addr.toBech32();
  } catch (e) {
    console.error('Error converting hex to bech32:', hex, e);
    return `erd1${hex.slice(0, 8)}...${hex.slice(-8)}`;
  }
};

/**
 * Get proposal details by ID
 */
export const getProposal = async (proposalId: number): Promise<Proposal | null> => {
  const proposalIdHex = numberToHex(proposalId);
  const result = await queryContract('getProposal', [proposalIdHex]);

  console.log('getProposal result for ID', proposalId, ':', result);

  if (!result || result.length === 0 || result[0] === '') {
    console.log('No proposal data returned');
    return null;
  }

  try {
    const hex = base64ToHex(result[0]);
    console.log('Proposal hex length:', hex.length);
    let offset = 0;

    // id (u64 = 8 bytes = 16 hex chars)
    const id = parseInt(hex.slice(offset, offset + 16), 16) || 0;
    console.log('Parsed ID:', id);
    offset += 16;

    // proposer (32 bytes = 64 hex chars)
    const proposerHex = hex.slice(offset, offset + 64);
    const proposer = hexToAddress(proposerHex);
    console.log('Parsed proposer:', proposer, 'from hex:', proposerHex);
    offset += 64;

    // title (4 bytes length + data)
    const titleLength = parseInt(hex.slice(offset, offset + 8), 16);
    offset += 8;
    const titleHex = hex.slice(offset, offset + titleLength * 2);
    const title = hexToString(titleHex);
    offset += titleLength * 2;

    // description (4 bytes length + data)
    const descLength = parseInt(hex.slice(offset, offset + 8), 16);
    offset += 8;
    const descHex = hex.slice(offset, offset + descLength * 2);
    const description = hexToString(descHex);
    offset += descLength * 2;

    // proposal_type (1 byte for enum variant)
    const proposalType = parseInt(hex.slice(offset, offset + 2), 16);
    offset += 2;

    // status (1 byte for enum variant)
    const statusValue = parseInt(hex.slice(offset, offset + 2), 16);
    offset += 2;

    // votes_for (BigUint - 4 bytes length + data)
    const votesForLength = parseInt(hex.slice(offset, offset + 8), 16);
    offset += 8;
    const votesForHex = hex.slice(offset, offset + votesForLength * 2);
    const votesFor = votesForLength > 0 ? parseTokenAmount(votesForHex) : '0';
    offset += votesForLength * 2;

    // votes_against (BigUint - 4 bytes length + data)
    const votesAgainstLength = parseInt(hex.slice(offset, offset + 8), 16);
    offset += 8;
    const votesAgainstHex = hex.slice(offset, offset + votesAgainstLength * 2);
    const votesAgainst = votesAgainstLength > 0 ? parseTokenAmount(votesAgainstHex) : '0';
    offset += votesAgainstLength * 2;

    // created_at (u64 = 8 bytes)
    const createdAt = parseInt(hex.slice(offset, offset + 16), 16) || 0;
    offset += 16;

    // voting_ends_at (u64 = 8 bytes)
    const votingEndsAt = parseInt(hex.slice(offset, offset + 16), 16) || 0;
    offset += 16;

    // execution_time (u64 = 8 bytes)
    const executionTime = parseInt(hex.slice(offset, offset + 16), 16) || 0;
    offset += 16;

    // target_address (32 bytes = 64 hex chars)
    const targetAddressHex = hex.slice(offset, offset + 64);
    const targetAddress = hexToAddress(targetAddressHex);
    console.log('Parsed target address:', targetAddress, 'from hex:', targetAddressHex);
    offset += 64;

    // amount (BigUint - 4 bytes length + data)
    const amountLength = parseInt(hex.slice(offset, offset + 8), 16);
    offset += 8;
    const amountHex = hex.slice(offset, offset + amountLength * 2);
    const amount = amountLength > 0 ? parseTokenAmount(amountHex) : '0';
    offset += amountLength * 2;

    // executed (bool = 1 byte)
    const executed = hex.slice(offset, offset + 2) === '01';

    // Map status value to enum
    let status: ProposalStatus;
    switch (statusValue) {
      case 0: status = ProposalStatus.Active; break; // Pending maps to Active for display
      case 1: status = ProposalStatus.Active; break;
      case 2: status = ProposalStatus.Passed; break;
      case 3: status = ProposalStatus.Executed; break;
      case 4: status = ProposalStatus.Failed; break; // Rejected
      case 5: status = ProposalStatus.Cancelled; break;
      case 6: status = ProposalStatus.Expired; break;
      default: status = ProposalStatus.Active;
    }

    const proposal = {
      id,
      proposer,
      title,
      description,
      proposalType,
      createdAt,
      votingEndsAt,
      executionTime,
      votesFor,
      votesAgainst,
      status,
      executed,
      targetAddress,
      amount
    };

    console.log('Parsed proposal:', proposal);
    return proposal;
  } catch (error) {
    console.error('Error parsing proposal:', error);
    return null;
  }
};

/**
 * Get multiple proposals by IDs
 */
export const getProposals = async (proposalIds: number[]): Promise<Proposal[]> => {
  const proposals: Proposal[] = [];

  for (const id of proposalIds) {
    const proposal = await getProposal(id);
    if (proposal) {
      proposals.push(proposal);
    }
  }

  return proposals;
};

// ============================================================================
// TRANSACTION FUNCTIONS
// ============================================================================

/**
 * Deposit tokens to treasury
 */
export const depositToTreasury = async (
  amount: string,
  senderAddress: string
): Promise<string[]> => {
  const amountInWei = new BigNumber(amount)
    .multipliedBy(new BigNumber(10).pow(XCIRCLEX_DECIMALS))
    .toFixed(0);

  const sender = new Address(senderAddress);
  const contract = new Address(DAO_CONTRACT_ADDRESS);

  const tokenTransfer = new TokenTransfer({
    token: new Token({ identifier: XCIRCLEX_TOKEN_ID }),
    amount: BigInt(amountInWei)
  });

  const transaction = await factory.createTransactionForExecute(sender, {
    contract: contract,
    function: 'depositToTreasury',
    gasLimit: BigInt(DAO_GAS_LIMITS.depositToTreasury),
    arguments: [],
    tokenTransfers: [tokenTransfer]
  });

  const result = await signAndSendTransactionsWithHash({
    transactions: [transaction],
    transactionsDisplayInfo: {
      processingMessage: 'Depositing to treasury...',
      errorMessage: 'Deposit failed',
      successMessage: 'Deposit successful!'
    }
  });

  return result.transactionHashes;
};

/**
 * Create a new proposal
 * @param title - Proposal title
 * @param description - Proposal description
 * @param proposalType - Type of proposal (0=TransferFunds, 1=ChangeParameter, 2=AddMember, 3=RemoveMember, 4=UpgradeContract, 5=Custom)
 * @param targetAddress - Target address for transfers/member changes (use sender address for Custom/ChangeParameter)
 * @param amount - Amount for fund transfers (use "0" for non-transfer proposals)
 * @param senderAddress - Sender's wallet address
 * @param tokenAmountForProof - Amount of XCIRCLEX tokens to send as proof (will be returned). Must be >= minProposalThreshold
 */
export const createProposal = async (
  title: string,
  description: string,
  proposalType: number,
  targetAddress: string,
  amount: string,
  senderAddress: string,
  tokenAmountForProof: string = '100000' // Default to 100K tokens for proof
): Promise<string[]> => {
  const sender = new Address(senderAddress);
  const contract = new Address(DAO_CONTRACT_ADDRESS);
  const target = new Address(targetAddress);

  // Convert amount to BigUint (with decimals) - this is the proposal amount for transfers
  const amountInWei = new BigNumber(amount || '0')
    .multipliedBy(new BigNumber(10).pow(XCIRCLEX_DECIMALS))
    .toFixed(0);

  // Convert token proof amount to Wei - this is sent to prove ownership (returned immediately)
  const proofAmountInWei = new BigNumber(tokenAmountForProof)
    .multipliedBy(new BigNumber(10).pow(XCIRCLEX_DECIMALS))
    .toFixed(0);

  // Create token transfer for proof of ownership
  const tokenTransfer = new TokenTransfer({
    token: new Token({ identifier: XCIRCLEX_TOKEN_ID }),
    amount: BigInt(proofAmountInWei)
  });

  const transaction = await factory.createTransactionForExecute(sender, {
    contract: contract,
    function: 'createProposal',
    gasLimit: BigInt(DAO_GAS_LIMITS.createProposal),
    arguments: [
      BytesValue.fromUTF8(title),
      BytesValue.fromUTF8(description),
      new U64Value(proposalType),
      new AddressValue(target),
      new BigUIntValue(BigInt(amountInWei))
    ],
    tokenTransfers: [tokenTransfer] // Send tokens as proof (will be returned)
  });

  const result = await signAndSendTransactionsWithHash({
    transactions: [transaction],
    transactionsDisplayInfo: {
      processingMessage: 'Creating proposal...',
      errorMessage: 'Proposal creation failed',
      successMessage: 'Proposal created!'
    }
  });

  return result.transactionHashes;
};

/**
 * Vote on a proposal
 * @param proposalId - The proposal ID to vote on
 * @param voteFor - true for "For", false for "Against"
 * @param senderAddress - Sender's wallet address
 * @param votingPower - Amount of XCIRCLEX tokens to vote with (will be returned after vote)
 */
export const vote = async (
  proposalId: number,
  voteFor: boolean,
  senderAddress: string,
  votingPower: string
): Promise<string[]> => {
  const sender = new Address(senderAddress);
  const contract = new Address(DAO_CONTRACT_ADDRESS);

  // Convert voting power to Wei
  const votingPowerInWei = new BigNumber(votingPower)
    .multipliedBy(new BigNumber(10).pow(XCIRCLEX_DECIMALS))
    .toFixed(0);

  // Create token transfer for voting power (will be returned after vote)
  const tokenTransfer = new TokenTransfer({
    token: new Token({ identifier: XCIRCLEX_TOKEN_ID }),
    amount: BigInt(votingPowerInWei)
  });

  const transaction = await factory.createTransactionForExecute(sender, {
    contract: contract,
    function: 'vote',
    gasLimit: BigInt(DAO_GAS_LIMITS.vote),
    arguments: [
      new U64Value(proposalId),
      new BooleanValue(voteFor)
    ],
    tokenTransfers: [tokenTransfer] // Send tokens as voting power (will be returned)
  });

  const result = await signAndSendTransactionsWithHash({
    transactions: [transaction],
    transactionsDisplayInfo: {
      processingMessage: 'Submitting vote...',
      errorMessage: 'Vote failed',
      successMessage: 'Vote submitted!'
    }
  });

  return result.transactionHashes;
};

/**
 * Finalize a proposal (after voting period ends)
 */
export const finalizeProposal = async (
  proposalId: number,
  senderAddress: string
): Promise<string[]> => {
  const sender = new Address(senderAddress);
  const contract = new Address(DAO_CONTRACT_ADDRESS);

  const transaction = await factory.createTransactionForExecute(sender, {
    contract: contract,
    function: 'finalizeProposal',
    gasLimit: BigInt(DAO_GAS_LIMITS.finalizeProposal),
    arguments: [new U64Value(proposalId)]
  });

  const result = await signAndSendTransactionsWithHash({
    transactions: [transaction],
    transactionsDisplayInfo: {
      processingMessage: 'Finalizing proposal...',
      errorMessage: 'Finalization failed',
      successMessage: 'Proposal finalized!'
    }
  });

  return result.transactionHashes;
};

/**
 * Execute a passed proposal (after timelock)
 */
export const executeProposal = async (
  proposalId: number,
  senderAddress: string
): Promise<string[]> => {
  const sender = new Address(senderAddress);
  const contract = new Address(DAO_CONTRACT_ADDRESS);

  const transaction = await factory.createTransactionForExecute(sender, {
    contract: contract,
    function: 'executeProposal',
    gasLimit: BigInt(DAO_GAS_LIMITS.executeProposal),
    arguments: [new U64Value(proposalId)]
  });

  const result = await signAndSendTransactionsWithHash({
    transactions: [transaction],
    transactionsDisplayInfo: {
      processingMessage: 'Executing proposal...',
      errorMessage: 'Execution failed',
      successMessage: 'Proposal executed!'
    }
  });

  return result.transactionHashes;
};

/**
 * Cancel a proposal (proposer or admin only)
 */
export const cancelProposal = async (
  proposalId: number,
  senderAddress: string
): Promise<string[]> => {
  const sender = new Address(senderAddress);
  const contract = new Address(DAO_CONTRACT_ADDRESS);

  const transaction = await factory.createTransactionForExecute(sender, {
    contract: contract,
    function: 'cancelProposal',
    gasLimit: BigInt(DAO_GAS_LIMITS.cancelProposal),
    arguments: [new U64Value(proposalId)]
  });

  const result = await signAndSendTransactionsWithHash({
    transactions: [transaction],
    transactionsDisplayInfo: {
      processingMessage: 'Cancelling proposal...',
      errorMessage: 'Cancellation failed',
      successMessage: 'Proposal cancelled!'
    }
  });

  return result.transactionHashes;
};

/**
 * Get user's XCIRCLEX token balance
 */
export const getUserTokenBalance = async (userAddress: string): Promise<string> => {
  try {
    const response = await fetch(
      `${NETWORK_CONFIG.apiAddress}/accounts/${userAddress}/tokens/${XCIRCLEX_TOKEN_ID}`
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
 * Get all proposals (for history)
 */
export const getAllProposals = async (): Promise<Proposal[]> => {
  const count = await getProposalCount();
  const proposals: Proposal[] = [];

  // Fetch all proposals (1-indexed)
  for (let i = 1; i <= count; i++) {
    const proposal = await getProposal(i);
    if (proposal) {
      proposals.push(proposal);
    }
  }

  return proposals;
};

/**
 * Force execute a proposal (owner only - for testing)
 * Bypasses voting period and timelock checks
 */
export const forceExecute = async (
  proposalId: number,
  senderAddress: string
): Promise<string[]> => {
  const sender = new Address(senderAddress);
  const contract = new Address(DAO_CONTRACT_ADDRESS);

  const transaction = await factory.createTransactionForExecute(sender, {
    contract: contract,
    function: 'forceExecute',
    gasLimit: BigInt(DAO_GAS_LIMITS.executeProposal),
    arguments: [new U64Value(proposalId)]
  });

  const result = await signAndSendTransactionsWithHash({
    transactions: [transaction],
    transactionsDisplayInfo: {
      processingMessage: 'Force executing proposal...',
      errorMessage: 'Force execution failed',
      successMessage: 'Proposal force executed!'
    }
  });

  return result.transactionHashes;
};

/**
 * Get DAO contract owner
 */
export const getDaoOwner = async (): Promise<string> => {
  try {
    const response = await fetch(
      `${NETWORK_CONFIG.apiAddress}/accounts/${DAO_CONTRACT_ADDRESS}`
    );

    if (!response.ok) {
      return '';
    }

    const data = await response.json();
    return data.ownerAddress || '';
  } catch (error) {
    console.error('Error fetching DAO owner:', error);
    return '';
  }
};

/**
 * Get all council members
 */
export const getCouncilMembers = async (): Promise<string[]> => {
  const result = await queryContract('getCouncilMembers');
  console.log('getCouncilMembers raw result:', result);
  if (!result || result.length === 0) {
    return [];
  }

  const members: string[] = [];
  for (const item of result) {
    console.log('Processing council member item:', item);
    if (item && item !== '') {
      const hex = base64ToHex(item);
      console.log('Council member hex:', hex, 'length:', hex?.length);
      if (hex && hex.length === 64) {
        try {
          const addr = Address.newFromHex(hex);
          console.log('Council member address:', addr.toBech32());
          members.push(addr.toBech32());
        } catch (e) {
          console.error('Error parsing council member address:', e);
        }
      } else {
        console.log('Invalid hex length or null hex');
      }
    }
  }
  console.log('Final council members list:', members);
  return members;
};

/**
 * Get council member count
 */
export const getCouncilMemberCount = async (): Promise<number> => {
  const result = await queryContract('getCouncilMemberCount');
  if (!result || result.length === 0 || result[0] === '') {
    return 0;
  }
  const hex = base64ToHex(result[0]);
  return parseInt(hex, 16) || 0;
};

/**
 * Veto a proposal (council members only)
 */
export const vetoProposal = async (
  proposalId: number,
  senderAddress: string
): Promise<string[]> => {
  const sender = new Address(senderAddress);
  const contract = new Address(DAO_CONTRACT_ADDRESS);

  const transaction = await factory.createTransactionForExecute(sender, {
    contract: contract,
    function: 'vetoProposal',
    gasLimit: BigInt(DAO_GAS_LIMITS.cancelProposal),
    arguments: [new U64Value(proposalId)]
  });

  const result = await signAndSendTransactionsWithHash({
    transactions: [transaction],
    transactionsDisplayInfo: {
      processingMessage: 'Vetoing proposal...',
      errorMessage: 'Veto failed',
      successMessage: 'Proposal vetoed!'
    }
  });

  return result.transactionHashes;
};

/**
 * Emergency execute a proposal (council members only - bypasses timelock)
 */
export const councilExecute = async (
  proposalId: number,
  senderAddress: string
): Promise<string[]> => {
  const sender = new Address(senderAddress);
  const contract = new Address(DAO_CONTRACT_ADDRESS);

  const transaction = await factory.createTransactionForExecute(sender, {
    contract: contract,
    function: 'councilExecute',
    gasLimit: BigInt(DAO_GAS_LIMITS.executeProposal),
    arguments: [new U64Value(proposalId)]
  });

  const result = await signAndSendTransactionsWithHash({
    transactions: [transaction],
    transactionsDisplayInfo: {
      processingMessage: 'Emergency executing proposal...',
      errorMessage: 'Emergency execution failed',
      successMessage: 'Proposal executed!'
    }
  });

  return result.transactionHashes;
};

/**
 * Create proposal for council members (no token transfer required)
 */
export const createProposalAsCouncil = async (
  title: string,
  description: string,
  proposalType: number,
  targetAddress: string,
  amount: string,
  senderAddress: string
): Promise<string[]> => {
  const sender = new Address(senderAddress);
  const contract = new Address(DAO_CONTRACT_ADDRESS);
  const target = new Address(targetAddress);

  // Convert amount to BigUint (with decimals) - this is the proposal amount for transfers
  const amountInWei = new BigNumber(amount || '0')
    .multipliedBy(new BigNumber(10).pow(XCIRCLEX_DECIMALS))
    .toFixed(0);

  // Council members don't need to send tokens
  const transaction = await factory.createTransactionForExecute(sender, {
    contract: contract,
    function: 'createProposal',
    gasLimit: BigInt(DAO_GAS_LIMITS.createProposal),
    arguments: [
      BytesValue.fromUTF8(title),
      BytesValue.fromUTF8(description),
      new U64Value(proposalType),
      new AddressValue(target),
      new BigUIntValue(BigInt(amountInWei))
    ]
  });

  const result = await signAndSendTransactionsWithHash({
    transactions: [transaction],
    transactionsDisplayInfo: {
      processingMessage: 'Creating proposal (council)...',
      errorMessage: 'Proposal creation failed',
      successMessage: 'Proposal created!'
    }
  });

  return result.transactionHashes;
};
