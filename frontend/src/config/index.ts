import { EnvironmentsEnum } from '@multiversx/sdk-dapp/out/types/enums.types';

export * from './sharedConfig';

// Adresse du contrat Circle Manager sur Devnet
export const circleManagerContract = process.env.VITE_CIRCLE_MANAGER_CONTRACT || 'erd1qqqqqqqqqqqqqpgq...'; // À remplacer par votre adresse de contrat

// API URL pour le backend (si vous en avez un)
export const API_URL = process.env.VITE_API_URL || 'http://localhost:3001';

// Domaines authentifiés pour les requêtes API
export const sampleAuthenticatedDomains = [API_URL];

// Environnement MultiversX
export const environment = EnvironmentsEnum.devnet;

// URLs de l'API MultiversX
export const multiversxApiUrl = 'https://devnet-api.multiversx.com';
export const multiversxGatewayUrl = 'https://devnet-gateway.multiversx.com';

// Chain ID
export const chainId = 'D';

// Explorer URL
export const explorerUrl = 'https://devnet-explorer.multiversx.com';

// GitHub Repository URL
export const GITHUB_REPO_URL = 'https://github.com/your-username/X-CIRCLE-X';

// ID API URLs (pour les herotags)
export const ID_API_URL = 'https://id-api.multiversx.com';
export const USERS_API_URL = '/users/api/v1/users/';
