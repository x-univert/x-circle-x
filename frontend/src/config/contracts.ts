// Configuration des smart contracts
// CircleManager v2 - Version complete (upgradeable + payable)
// Deploye le 28 novembre 2025 sur Devnet
export const CIRCLE_MANAGER_ADDRESS = 'erd1qqqqqqqqqqqqqpgq4v9m37smxz06p858t5mzdzc69tu6pvlsflfqwf7tf8';

// Circle of Life Center (SC0) v3 - Deploye le 3 decembre 2025 sur Devnet
// Contract central pour les transactions circulaires
// NOUVEAU: Deploie de vrais smart contracts pour chaque membre (SC1, SC2...)
export const CIRCLE_OF_LIFE_ADDRESS = 'erd1qqqqqqqqqqqqqpgqa6yjeghz6c38cdmk4z0xhsd2jdus0m74flfq0df5xn';

// XCIRCLEX Token - PI-based supply (314,159,265.358979323846264338)
export const XCIRCLEX_TOKEN_ID = 'XCIRCLEX-3b9d57';
export const XCIRCLEX_DECIMALS = 18;

// XCIRCLEX Staking Contract - Deploye le 6 decembre 2025
// 12 niveaux de staking (30-360 jours, 5%-42% APY)
export const STAKING_CONTRACT_ADDRESS = 'erd1qqqqqqqqqqqqqpgqd5r76rsws9kvzcdsxqqgjlrjlw90x44uflfq386xhw';

// XCIRCLEX Vesting Contract - Deploye le 6 decembre 2025
// Team (10%), Marketing (5%), Advisors (3%)
export const VESTING_CONTRACT_ADDRESS = 'erd1qqqqqqqqqqqqqpgqc00rmsjfsk6prqwpcjggxzmdeus0vwa0flfqhxgel0';

// XCIRCLEX DAO Contract V2 - Deploye le 11 janvier 2026
// Governance: propositions, votes, treasury XCIRCLEX + EGLD, timelock (payable)
// Recoit 30% des EGLD distribues par SC0
export const DAO_CONTRACT_ADDRESS = 'erd1qqqqqqqqqqqqqpgq90jjjlwjfg2s45y8mxm6xgweavdhyxw8flfqaatay7';

// Ancien DAO v1 (deprecated)
export const DAO_V1_CONTRACT_ADDRESS = 'erd1qqqqqqqqqqqqqpgq35zrtzej655v2czk5plzaa6hp4wluun7flfql80l9d';

// XCIRCLEX NFT Contract V2 - NFT evolutif avec IPFS et 10% royalties
// Deploye le 17 decembre 2025 sur Devnet
// Collection: XCIRCLEX (XCIRCLEX-957f5a) - True NFT (NonFungibleESDTv2)
export const NFT_CONTRACT_ADDRESS = 'erd1qqqqqqqqqqqqqpgqjwd6xwycht2hmm5h76qcgzdqdxnz8g9wflfqt5v6zc';
export const NFT_TOKEN_ID = 'XCIRCLEX-957f5a';

// Liquidity Pool Address (xExchange DEX)
// Paire XCIRCLEX/WEGLD sur xExchange Devnet
export const LIQUIDITY_POOL_ADDRESS = 'erd1qqqqqqqqqqqqqpgqy4g7upd4dz4mp9qzw3w9x43jqu36qjwc0n4sm37le3';

// LP Locker Contract - Deploye le 20 decembre 2025
// Verrouillage des LP tokens pour 12 mois minimum
export const LP_LOCKER_ADDRESS = 'erd1qqqqqqqqqqqqqpgqtwutsamdra4capldu6nkzsu8zwkkdxfaflfqmzvuzz';

// Token Protection Contract - Deploye le 20 decembre 2025
// Anti-whale (2% max), Sell tax progressive (10%/5%/0%)
export const TOKEN_PROTECTION_ADDRESS = 'erd1qqqqqqqqqqqqqpgqescv0dcpdgu62sa7a89s3w2qdc9njsydflfqwfxdvx';

// XCIRCLEX IDO Contract - Deploye le 4 janvier 2026 (avec metadata-payable)
// Initial DEX Offering: 5% du supply (15.7M XCIRCLEX) pour lever 360 EGLD
// Start: +1h, End: +15 jours
export const IDO_CONTRACT_ADDRESS = 'erd1qqqqqqqqqqqqqpgq5h7twxcl5fd0fwkfujxsnj7v6ww8ezd2flfqxnd5lt';

// IDO Configuration
export const IDO_CONFIG = {
  // Allocation: 5% du supply pour l'IDO (pris sur la pool de liquidite)
  allocation: 15_707_963, // ~15.7M XCIRCLEX (5% de PI x 10^8)
  // Prix: 1 EGLD = 43,633 XCIRCLEX (pour lever 360 EGLD minimum)
  rate: 43_633,
  // Minimum: 0.5 EGLD
  minContribution: 0.5,
  // Maximum: 20 EGLD par wallet
  maxContribution: 20,
  // Soft cap: 180 EGLD (50%)
  softCap: 180,
  // Hard cap: 360 EGLD (objectif minimum)
  hardCap: 360,
  // Date de debut (timestamp)
  startTime: Date.now(), // A ajuster
  // Duree: 14 jours
  duration: 14 * 24 * 60 * 60 * 1000,
};

export const NETWORK_CONFIG = {
  id: 'devnet',
  name: 'Devnet',
  egldLabel: 'xEGLD',
  decimals: 18,
  gasPerDataByte: 1500,
  walletConnectDeepLink: 'https://maiar.page.link/?apn=com.multiversx.maiar.wallet&isi=1519405832&ibi=com.multiversx.maiar.wallet&link=https://maiar.com/',
  walletConnectV2ProjectId: '9b1a9564f91cb659ffe21b73d5c4e2d8',
  walletAddress: 'https://devnet-wallet.multiversx.com/dapp/init',
  apiAddress: 'https://devnet-api.multiversx.com',
  explorerAddress: 'https://devnet-explorer.multiversx.com',
  apiTimeout: 6000
};

// Gas limits pour les transactions Circle Manager
export const GAS_LIMITS = {
  createCircle: 15_000_000,
  requestMembership: 10_000_000,
  voteForMember: 20_000_000,  // Vote peut ajouter un membre, necessite plus de gas
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

// Staking levels configuration (matches smart contract)
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
export const PROTOCOL_FEE_PERCENTAGE = 300; // 300 basis points = 3%
