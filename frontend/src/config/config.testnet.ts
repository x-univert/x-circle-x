import { EnvironmentsEnum } from '@multiversx/sdk-dapp';

export * from './sharedConfig';

// Adresse du contrat Circle Manager sur Testnet
export const circleManagerContract = process.env.VITE_CIRCLE_MANAGER_CONTRACT || 'erd1qqqqqqqqqqqqqpgq...'; // À remplacer

// API URL
export const API_URL = process.env.VITE_API_URL || 'http://localhost:3001';

// Domaines authentifiés
export const sampleAuthenticatedDomains = [API_URL];

// Environnement MultiversX
export const environment = EnvironmentsEnum.testnet;

// URLs de l'API MultiversX
export const multiversxApiUrl = 'https://testnet-api.multiversx.com';
export const multiversxGatewayUrl = 'https://testnet-gateway.multiversx.com';

// Chain ID
export const chainId = 'T';

// Explorer URL
export const explorerUrl = 'https://testnet-explorer.multiversx.com';

// GitHub Repository URL
export const GITHUB_REPO_URL = 'https://github.com/your-username/X-CIRCLE-X';

// ID API URLs (pour les herotags)
export const ID_API_URL = 'https://testnet-id-api.multiversx.com';
export const USERS_API_URL = '/users/';
