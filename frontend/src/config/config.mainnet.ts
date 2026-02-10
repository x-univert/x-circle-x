import { EnvironmentsEnum } from '@multiversx/sdk-dapp/out/types/enums.types';

export * from './sharedConfig';

// Adresse du contrat Circle Manager sur Mainnet
export const circleManagerContract = process.env.VITE_CIRCLE_MANAGER_CONTRACT || 'erd1qqqqqqqqqqqqqpgq...'; // À remplacer

// API URL
export const API_URL = process.env.VITE_API_URL || 'https://your-api.com';

// Domaines authentifiés
export const sampleAuthenticatedDomains = [API_URL];

// Environnement MultiversX
export const environment = EnvironmentsEnum.mainnet;

// URLs de l'API MultiversX
export const multiversxApiUrl = 'https://api.multiversx.com';
export const multiversxGatewayUrl = 'https://gateway.multiversx.com';

// Chain ID
export const chainId = '1';

// Explorer URL
export const explorerUrl = 'https://explorer.multiversx.com';

// GitHub Repository URL
export const GITHUB_REPO_URL = 'https://github.com/your-username/X-CIRCLE-X';

// ID API URLs (pour les herotags)
export const ID_API_URL = 'https://id-api.multiversx.com';
export const USERS_API_URL = '/users/api/v1/users/';

// Dynamic network config (pour les services qui lisent le reseau a chaque appel)
// Utilise le gateway pour les requetes vm-values (CORS plus permissif que l'API)
export const getNetworkConfig = () => ({
  apiUrl: multiversxGatewayUrl,
  apiRestUrl: multiversxApiUrl,
  gatewayUrl: multiversxGatewayUrl,
  chainId,
  explorerUrl,
  environment
});
