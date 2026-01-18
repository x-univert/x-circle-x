// Configuration des smart contracts - TESTNET
// A deployer sur Testnet

// Placeholder addresses - A REMPLACER apres deploiement
export const CIRCLE_MANAGER_ADDRESS = ''; // TODO: Deploy CircleManager
export const CIRCLE_OF_LIFE_ADDRESS = ''; // TODO: Deploy Circle of Life Center
export const XCIRCLEX_TOKEN_ID = ''; // TODO: Issue XCIRCLEX token
export const STAKING_CONTRACT_ADDRESS = ''; // TODO: Deploy Staking
export const VESTING_CONTRACT_ADDRESS = ''; // TODO: Deploy Vesting
export const DAO_CONTRACT_ADDRESS = ''; // TODO: Deploy DAO v2
export const DAO_V1_CONTRACT_ADDRESS = '';
export const NFT_CONTRACT_ADDRESS = ''; // TODO: Deploy NFT
export const NFT_TOKEN_ID = '';
export const LIQUIDITY_POOL_ADDRESS = ''; // TODO: Create LP on xExchange
export const LP_LOCKER_ADDRESS = ''; // TODO: Deploy LP Locker
export const TOKEN_PROTECTION_ADDRESS = ''; // TODO: Deploy Token Protection
export const IDO_CONTRACT_ADDRESS = ''; // TODO: Deploy IDO

export const NETWORK_CONFIG = {
  id: 'testnet',
  name: 'Testnet',
  egldLabel: 'xEGLD',
  decimals: 18,
  gasPerDataByte: 1500,
  walletConnectDeepLink: 'https://maiar.page.link/?apn=com.multiversx.maiar.wallet&isi=1519405832&ibi=com.multiversx.maiar.wallet&link=https://maiar.com/',
  walletConnectV2ProjectId: '9b1a9564f91cb659ffe21b73d5c4e2d8',
  walletAddress: 'https://testnet-wallet.multiversx.com/dapp/init',
  apiAddress: 'https://testnet-api.multiversx.com',
  explorerAddress: 'https://testnet-explorer.multiversx.com',
  apiTimeout: 6000
};
