// Configuration des smart contracts - TESTNET
// Deployes sur Testnet

export const CIRCLE_MANAGER_ADDRESS = 'erd1qqqqqqqqqqqqqpgq5t359myktkfeeu4q28w6jghw9xa5fjqyflfqngz3k3';
export const CIRCLE_OF_LIFE_ADDRESS = 'erd1qqqqqqqqqqqqqpgqvddnk9lv2x6xvq7dsjkfdsr0f79za3k0flfqp0yey5';
export const XCIRCLEX_TOKEN_ID = 'XCX-fa8353';
export const STAKING_CONTRACT_ADDRESS = 'erd1qqqqqqqqqqqqqpgq6dang8kg5487lchamyj47uh4j9pg426uflfqc8pgrw';
export const VESTING_CONTRACT_ADDRESS = 'erd1qqqqqqqqqqqqqpgqdtq6gqe7lhzqdaah9ryysnsy704jqmvkflfq5x05rq';
export const DAO_CONTRACT_ADDRESS = 'erd1qqqqqqqqqqqqqpgq58jy4tx3k6xerrjn8jxjd6sy6etz9kycflfqyf3rvj';
export const DAO_V1_CONTRACT_ADDRESS = '';
export const NFT_CONTRACT_ADDRESS = 'erd1qqqqqqqqqqqqqpgqavw52x72xm33x7cszrz9uankyr9hkmsjflfq7qjnph';
export const NFT_TOKEN_ID = 'XCIRCLEX-b8caaf';
export const LIQUIDITY_POOL_ADDRESS = ''; // TODO: Create LP on xExchange
export const LP_LOCKER_ADDRESS = 'erd1qqqqqqqqqqqqqpgqttt9jrazafjckrkdw2mcpk53y8lw95dcflfq04yzsc';
export const TOKEN_PROTECTION_ADDRESS = 'erd1qqqqqqqqqqqqqpgqp0f7ej3e72cfxj8vj693x4la06hmh2sdflfq5wu26e';
export const IDO_CONTRACT_ADDRESS = 'erd1qqqqqqqqqqqqqpgqpr97f9dy0x5z22r6klfzmtsmr2jc824wflfqhe3lgy';
export const PERIPHERAL_TEMPLATE_ADDRESS = 'erd1qqqqqqqqqqqqqpgq9dmz03jtxu2v7dzzkx50nwtc2zwvu0r7flfq94jhd3';

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
