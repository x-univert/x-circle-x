// Configuration des smart contracts - Dynamic Network Loading
// Charge automatiquement les adresses en fonction du reseau selectionne

import * as devnetContracts from './contracts.devnet';
import * as testnetContracts from './contracts.testnet';
import * as mainnetContracts from './contracts.mainnet';

// Detecter le reseau selectionne
const getSelectedNetwork = (): 'devnet' | 'testnet' | 'mainnet' => {
  if (typeof window !== 'undefined') {
    return (localStorage.getItem('selectedNetwork') as 'devnet' | 'testnet' | 'mainnet') || 'devnet';
  }
  return 'devnet';
};

const selectedNetwork = getSelectedNetwork();

// Selectionner les contrats en fonction du reseau
const getContracts = () => {
  switch (selectedNetwork) {
    case 'mainnet':
      return mainnetContracts;
    case 'testnet':
      return testnetContracts;
    default:
      return devnetContracts;
  }
};

const contracts = getContracts();

// Exports dynamiques
export const CIRCLE_MANAGER_ADDRESS = contracts.CIRCLE_MANAGER_ADDRESS;
export const CIRCLE_OF_LIFE_ADDRESS = contracts.CIRCLE_OF_LIFE_ADDRESS;
export const XCIRCLEX_TOKEN_ID = contracts.XCIRCLEX_TOKEN_ID;
export const STAKING_CONTRACT_ADDRESS = contracts.STAKING_CONTRACT_ADDRESS;
export const VESTING_CONTRACT_ADDRESS = contracts.VESTING_CONTRACT_ADDRESS;
export const DAO_CONTRACT_ADDRESS = contracts.DAO_CONTRACT_ADDRESS;
export const DAO_V1_CONTRACT_ADDRESS = contracts.DAO_V1_CONTRACT_ADDRESS;
export const NFT_CONTRACT_ADDRESS = contracts.NFT_CONTRACT_ADDRESS;
export const NFT_TOKEN_ID = contracts.NFT_TOKEN_ID;
export const LIQUIDITY_POOL_ADDRESS = contracts.LIQUIDITY_POOL_ADDRESS;
export const LP_LOCKER_ADDRESS = contracts.LP_LOCKER_ADDRESS;
export const TOKEN_PROTECTION_ADDRESS = contracts.TOKEN_PROTECTION_ADDRESS;
export const IDO_CONTRACT_ADDRESS = contracts.IDO_CONTRACT_ADDRESS;
export const INVESTMENT_CIRCLE_ADDRESS = contracts.INVESTMENT_CIRCLE_ADDRESS;
export const NETWORK_CONFIG = contracts.NETWORK_CONFIG;

// Token constants (same for all networks)
export const XCIRCLEX_DECIMALS = 18;

// NFT IPFS Configuration
export const NFT_IPFS_CID = 'QmPjnNcnzdVzmF4NwDgRQPZHBu5ABkwSngvZyGki6zQxTV';
export const NFT_IPFS_GATEWAY = 'https://ipfs.io/ipfs';
export const NFT_IPFS_BASE_URL = `${NFT_IPFS_GATEWAY}/${NFT_IPFS_CID}/xcirclex`;

// Helper pour obtenir l'URL du GIF NFT par niveau
export const getNftGifUrl = (level: number): string => {
  return `/nft-gifs/${level}.gif`;
};

// Helper pour obtenir l'URL IPFS du GIF NFT
export const getNftIpfsUrl = (level: number): string => {
  return `ipfs://${NFT_IPFS_CID}/xcirclex/${level}.gif`;
};

// IDO Configuration
export const IDO_CONFIG = {
  allocation: 15_707_963,
  rate: 43_633,
  minContribution: 0.5,
  maxContribution: 20,
  softCap: 180,
  hardCap: 360,
  startTime: Date.now(),
  duration: 14 * 24 * 60 * 60 * 1000,
};

// Gas limits pour les transactions Circle Manager
export const GAS_LIMITS = {
  createCircle: 15_000_000,
  requestMembership: 10_000_000,
  voteForMember: 20_000_000,
  contribute: 10_000_000,
};

// Gas limits pour les transactions Staking
export const STAKING_GAS_LIMITS = {
  stake: 15_000_000,
  unstake: 15_000_000,
  claimRewards: 10_000_000,
  emergencyUnstake: 15_000_000,
};

// Gas limits pour les transactions IDO
export const IDO_GAS_LIMITS = {
  contribute: 15_000_000,
  claimTokens: 15_000_000,
  refund: 15_000_000,
};

// Gas limits pour les transactions Investment Circle
export const INVESTMENT_CIRCLE_GAS_LIMITS = {
  createCircle: 30_000_000,
  joinCircle: 20_000_000,
  startCircle: 15_000_000,
  contribute: 15_000_000,
  processMissedContribution: 20_000_000,
  advancePeriod: 50_000_000,
  claimCollateral: 15_000_000,
  leaveCircle: 15_000_000,
  cancelCircle: 30_000_000,
};

// Contribution frequencies for Investment Circle
export const CONTRIBUTION_FREQUENCIES = [
  { value: 0, label: 'Weekly', days: 7 },
  { value: 1, label: 'Bi-Weekly', days: 14 },
  { value: 2, label: 'Monthly', days: 30 },
  { value: 3, label: 'Quarterly', days: 90 },
];

// Staking levels configuration
export const STAKING_LEVELS = [
  { level: 0, days: 0, apy: 3, label: 'Flexible' },
  { level: 1, days: 30, apy: 5, label: '30 Days' },
  { level: 2, days: 60, apy: 8, label: '60 Days' },
  { level: 3, days: 90, apy: 12, label: '90 Days' },
  { level: 4, days: 120, apy: 15, label: '120 Days' },
  { level: 5, days: 150, apy: 18, label: '150 Days' },
  { level: 6, days: 180, apy: 22, label: '180 Days' },
  { level: 7, days: 210, apy: 25, label: '210 Days' },
  { level: 8, days: 240, apy: 28, label: '240 Days' },
  { level: 9, days: 270, apy: 32, label: '270 Days' },
  { level: 10, days: 300, apy: 35, label: '300 Days' },
  { level: 11, days: 330, apy: 38, label: '330 Days' },
  { level: 12, days: 360, apy: 42, label: '360 Days (Perfect Circle)' },
];

// Frais de protocole (3%)
export const PROTOCOL_FEE_PERCENTAGE = 300;

// Export network info for debugging
export const CURRENT_NETWORK = selectedNetwork;
