// Configuration des smart contracts - DEVNET
// Deployes sur Devnet

export const CIRCLE_MANAGER_ADDRESS = 'erd1qqqqqqqqqqqqqpgq4v9m37smxz06p858t5mzdzc69tu6pvlsflfqwf7tf8';
export const CIRCLE_OF_LIFE_ADDRESS = 'erd1qqqqqqqqqqqqqpgqa6yjeghz6c38cdmk4z0xhsd2jdus0m74flfq0df5xn';
export const XCIRCLEX_TOKEN_ID = 'XCIRCLEX-3b9d57';
export const STAKING_CONTRACT_ADDRESS = 'erd1qqqqqqqqqqqqqpgqd5r76rsws9kvzcdsxqqgjlrjlw90x44uflfq386xhw';
export const VESTING_CONTRACT_ADDRESS = 'erd1qqqqqqqqqqqqqpgqc00rmsjfsk6prqwpcjggxzmdeus0vwa0flfqhxgel0';
export const DAO_CONTRACT_ADDRESS = 'erd1qqqqqqqqqqqqqpgq90jjjlwjfg2s45y8mxm6xgweavdhyxw8flfqaatay7';
export const DAO_V1_CONTRACT_ADDRESS = 'erd1qqqqqqqqqqqqqpgq35zrtzej655v2czk5plzaa6hp4wluun7flfql80l9d';
export const NFT_CONTRACT_ADDRESS = 'erd1qqqqqqqqqqqqqpgqjwd6xwycht2hmm5h76qcgzdqdxnz8g9wflfqt5v6zc';
export const NFT_TOKEN_ID = 'XCIRCLEX-957f5a';
export const LIQUIDITY_POOL_ADDRESS = 'erd1qqqqqqqqqqqqqpgqy4g7upd4dz4mp9qzw3w9x43jqu36qjwc0n4sm37le3';
export const LP_LOCKER_ADDRESS = 'erd1qqqqqqqqqqqqqpgqtwutsamdra4capldu6nkzsu8zwkkdxfaflfqmzvuzz';
export const TOKEN_PROTECTION_ADDRESS = 'erd1qqqqqqqqqqqqqpgqescv0dcpdgu62sa7a89s3w2qdc9njsydflfqwfxdvx';
export const IDO_CONTRACT_ADDRESS = 'erd1qqqqqqqqqqqqqpgq5h7twxcl5fd0fwkfujxsnj7v6ww8ezd2flfqxnd5lt';
export const INVESTMENT_CIRCLE_ADDRESS = 'erd1qqqqqqqqqqqqqpgqawyzdfj8ezzgtmysvq8xcgcwlg8ujzckflfq40xcxu';

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
  apiRestAddress: 'https://devnet-api.multiversx.com',
  explorerAddress: 'https://devnet-explorer.multiversx.com',
  apiTimeout: 6000
};
