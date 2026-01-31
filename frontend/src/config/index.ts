import { EnvironmentsEnum } from '@multiversx/sdk-dapp/out/types/enums.types';

export * from './sharedConfig';

// Configuration par réseau
interface NetworkConfig {
  environment: EnvironmentsEnum;
  chainId: string;
  apiUrl: string;
  gatewayUrl: string;
  explorerUrl: string;
}

const networkConfigs: Record<string, NetworkConfig> = {
  devnet: {
    environment: EnvironmentsEnum.devnet,
    chainId: 'D',
    apiUrl: 'https://devnet-api.multiversx.com',
    gatewayUrl: 'https://devnet-gateway.multiversx.com',
    explorerUrl: 'https://devnet-explorer.multiversx.com'
  },
  testnet: {
    environment: EnvironmentsEnum.testnet,
    chainId: 'T',
    apiUrl: 'https://testnet-api.multiversx.com',
    gatewayUrl: 'https://testnet-gateway.multiversx.com',
    explorerUrl: 'https://testnet-explorer.multiversx.com'
  },
  mainnet: {
    environment: EnvironmentsEnum.mainnet,
    chainId: '1',
    apiUrl: 'https://api.multiversx.com',
    gatewayUrl: 'https://gateway.multiversx.com',
    explorerUrl: 'https://explorer.multiversx.com'
  }
};

// Détecter le réseau sélectionné
const getSelectedNetwork = (): 'devnet' | 'testnet' | 'mainnet' => {
  if (typeof window !== 'undefined') {
    return (localStorage.getItem('selectedNetwork') as 'devnet' | 'testnet' | 'mainnet') || 'devnet';
  }
  return 'devnet';
};

const selectedNetwork = getSelectedNetwork();
const config = networkConfigs[selectedNetwork];

// Adresse du contrat Circle Manager
export const circleManagerContract = process.env.VITE_CIRCLE_MANAGER_CONTRACT || 'erd1qqqqqqqqqqqqqpgq...';

// API URL pour le backend (si vous en avez un)
export const API_URL = process.env.VITE_API_URL || 'http://localhost:3001';

// Domaines authentifiés pour les requêtes API
export const sampleAuthenticatedDomains = [API_URL];

// Configuration dynamique basée sur le réseau
export const environment = config.environment;
export const chainId = config.chainId;
export const multiversxApiUrl = config.apiUrl;
export const multiversxGatewayUrl = config.gatewayUrl;
export const explorerUrl = config.explorerUrl;

// GitHub Repository URL
export const GITHUB_REPO_URL = 'https://github.com/x-univert/x-circle-x';

// ID API URLs (pour les herotags)
export const ID_API_URL = 'https://id-api.multiversx.com';
export const USERS_API_URL = '/users/api/v1/users/';
