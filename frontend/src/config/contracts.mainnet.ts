// Configuration des smart contracts pour MAINNET
// Deployes le 8 Fevrier 2026

// === CONTRATS PRINCIPAUX ===
export const CIRCLE_OF_LIFE_ADDRESS = 'erd1qqqqqqqqqqqqqpgq0hn8eauvdlpxpytv9h0j77xkv7segnfysh0qcwlgaz';
export const INVESTMENT_CIRCLE_ADDRESS = 'erd1qqqqqqqqqqqqqpgqvv73p6a3qd0dsznnfu8yccupnqwhjlelsh0q8pp29g';
export const CIRCLE_PERIPHERAL_TEMPLATE = 'erd1qqqqqqqqqqqqqpgq5cqn99z4zl9wvwn0dssdkele2r8a8ak2sh0qku4vqv';

// === TOKEN ===
// Cree le 8 Fevrier 2026 - Supply = 314,159,265.358979323846264338 (pi x 10^8 avec decimales de pi)
export const XCIRCLEX_TOKEN_ID = 'XCX-589604';

// === CONTRATS SECONDAIRES ===
export const CIRCLE_MANAGER_ADDRESS = ''; // Legacy - non utilise
export const STAKING_CONTRACT_ADDRESS = 'erd1qqqqqqqqqqqqqpgq9dhmjuda9mmvy83pvuhzgxf080crrhnwsh0qwhchk3';
export const VESTING_CONTRACT_ADDRESS = 'erd1qqqqqqqqqqqqqpgq67krm8g9r54pg67vst5sk8f765jwlycvsh0q59se9c';
export const DAO_CONTRACT_ADDRESS = 'erd1qqqqqqqqqqqqqpgqefur6rzytxmc9l8y3akg2d0js25ktxa9sh0qhngx24';
export const DAO_V1_CONTRACT_ADDRESS = ''; // Legacy
export const NFT_CONTRACT_ADDRESS = 'erd1qqqqqqqqqqqqqpgq5vlhuwg53yn55q88x3krhan93erd2e2dsh0qu5rhlq';
export const NFT_TOKEN_ID = 'XCIRCLEX-fdfce1'; // Collection XCIRCLEX - Cree le 8 Fevrier 2026
export const LIQUIDITY_POOL_ADDRESS = ''; // xExchange pool - a configurer apres listing
export const LP_LOCKER_ADDRESS = 'erd1qqqqqqqqqqqqqpgqmeupfcpr78uj6att3tk5ykfa7uem3lulsh0q8h63y4';
export const TOKEN_PROTECTION_ADDRESS = ''; // A deployer si necessaire
export const IDO_CONTRACT_ADDRESS = 'erd1qqqqqqqqqqqqqpgqr3rmwdfw2qc4pkkzqth8nhcmslffh490sh0qe6m3kh';

// === CONFIGURATION RESEAU ===
// apiAddress = gateway (pour vm-values/query, CORS OK depuis localhost)
// apiRestAddress = api (pour /accounts/, /tokens/, /nfts/ REST endpoints)
export const NETWORK_CONFIG = {
  id: 'mainnet',
  name: 'MultiversX Mainnet',
  apiAddress: 'https://gateway.multiversx.com',
  apiRestAddress: 'https://api.multiversx.com',
  gatewayAddress: 'https://gateway.multiversx.com',
  explorerAddress: 'https://explorer.multiversx.com',
  chainId: '1',
};
