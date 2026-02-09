import { EnvironmentsEnum } from '@multiversx/sdk-dapp/out/types/enums.types';

export * from './sharedConfig';

// Adresse du contrat Circle Manager sur Devnet
export const circleManagerContract = process.env.VITE_CIRCLE_MANAGER_CONTRACT || 'erd1qqqqqqqqqqqqqpgq...'; // À remplacer par votre adresse de contrat

// API URL pour le backend (si vous en avez un)
export const API_URL = process.env.VITE_API_URL || 'http://localhost:3001';

// Domaines authentifiés pour les requêtes API
export const sampleAuthenticatedDomains = [API_URL];

// Detection du reseau selectionne
const getSelectedNetwork = (): 'devnet' | 'testnet' | 'mainnet' => {
  if (typeof window !== 'undefined') {
    return (localStorage.getItem('selectedNetwork') as 'devnet' | 'testnet' | 'mainnet') || 'mainnet';
  }
  return 'mainnet';
};

const selectedNetwork = getSelectedNetwork();

// Configuration par reseau
const networkConfigs = {
  devnet: {
    environment: EnvironmentsEnum.devnet,
    apiUrl: 'https://devnet-api.multiversx.com',
    gatewayUrl: 'https://devnet-gateway.multiversx.com',
    chainId: 'D',
    explorerUrl: 'https://devnet-explorer.multiversx.com'
  },
  testnet: {
    environment: EnvironmentsEnum.testnet,
    apiUrl: 'https://testnet-api.multiversx.com',
    gatewayUrl: 'https://testnet-gateway.multiversx.com',
    chainId: 'T',
    explorerUrl: 'https://testnet-explorer.multiversx.com'
  },
  mainnet: {
    environment: EnvironmentsEnum.mainnet,
    apiUrl: 'https://api.multiversx.com',
    gatewayUrl: 'https://gateway.multiversx.com',
    chainId: '1',
    explorerUrl: 'https://explorer.multiversx.com'
  }
};

const config = networkConfigs[selectedNetwork];

// Environnement MultiversX
export const environment = config.environment;

// URLs de l'API MultiversX
export const multiversxApiUrl = config.apiUrl;
export const multiversxGatewayUrl = config.gatewayUrl;

// Chain ID
export const chainId = config.chainId;

// Explorer URL
export const explorerUrl = config.explorerUrl;

// GitHub Repository URL
export const GITHUB_REPO_URL = 'https://github.com/your-username/X-CIRCLE-X';

// ID API URLs (pour les herotags)
export const ID_API_URL = 'https://id-api.multiversx.com';
export const USERS_API_URL = '/users/api/v1/users/';
