// Configuration des smart contracts pour MAINNET
// Deployes le 8 Fevrier 2026

// === CONTRATS PRINCIPAUX ===
export const CIRCLE_OF_LIFE_ADDRESS = 'erd1qqqqqqqqqqqqqpgq0hn8eauvdlpxpytv9h0j77xkv7segnfysh0qcwlgaz';
export const INVESTMENT_CIRCLE_ADDRESS = 'erd1qqqqqqqqqqqqqpgqvv73p6a3qd0dsznnfu8yccupnqwhjlelsh0q8pp29g';
export const CIRCLE_PERIPHERAL_TEMPLATE = 'erd1qqqqqqqqqqqqqpgqdkct62rmhnmxyvd4gvd5zapk26vxzu8msh0qs6zy6v';

// === TOKEN ===
// TODO: Creer le token XCIRCLEX sur mainnet
export const XCIRCLEX_TOKEN_ID = 'XCIRCLEX-XXXXXX'; // A remplacer apres creation

// === CONTRATS SECONDAIRES (A deployer) ===
export const CIRCLE_MANAGER_ADDRESS = ''; // Legacy - non utilise
export const STAKING_CONTRACT_ADDRESS = ''; // A deployer avec token_id
export const VESTING_CONTRACT_ADDRESS = ''; // A deployer avec token_id
export const DAO_CONTRACT_ADDRESS = ''; // A deployer avec token_id
export const DAO_V1_CONTRACT_ADDRESS = ''; // Legacy
export const NFT_CONTRACT_ADDRESS = ''; // A deployer
export const NFT_TOKEN_ID = 'XCIRCLENFT-XXXXXX'; // A creer
export const LIQUIDITY_POOL_ADDRESS = ''; // xExchange pool
export const LP_LOCKER_ADDRESS = ''; // A deployer
export const TOKEN_PROTECTION_ADDRESS = ''; // A deployer
export const IDO_CONTRACT_ADDRESS = ''; // A deployer avec parametres

// === CONFIGURATION RESEAU ===
export const NETWORK_CONFIG = {
  id: 'mainnet',
  name: 'MultiversX Mainnet',
  apiAddress: 'https://api.multiversx.com',
  gatewayAddress: 'https://gateway.multiversx.com',
  explorerAddress: 'https://explorer.multiversx.com',
  chainId: '1',
};
