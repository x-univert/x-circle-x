// Dynamic configuration loader based on selected network
import { EnvironmentsEnum } from '@multiversx/sdk-dapp/out/types/enums.types';

export * from './sharedConfig';

// Detecter le reseau selectionne
const getSelectedNetwork = (): 'devnet' | 'testnet' | 'mainnet' => {
  if (typeof window !== 'undefined') {
    return (localStorage.getItem('selectedNetwork') as 'devnet' | 'testnet' | 'mainnet') || 'devnet';
  }
  return 'devnet';
};

const selectedNetwork = getSelectedNetwork();

// Configuration par reseau
const networkConfigs = {
  devnet: {
    environment: EnvironmentsEnum.devnet,
    multiversxApiUrl: 'https://devnet-api.multiversx.com',
    multiversxGatewayUrl: 'https://devnet-gateway.multiversx.com',
    chainId: 'D',
    explorerUrl: 'https://devnet-explorer.multiversx.com',
    ID_API_URL: 'https://id-api.multiversx.com',
    USERS_API_URL: '/users/api/v1/users/',
  },
  testnet: {
    environment: EnvironmentsEnum.testnet,
    multiversxApiUrl: 'https://testnet-api.multiversx.com',
    multiversxGatewayUrl: 'https://testnet-gateway.multiversx.com',
    chainId: 'T',
    explorerUrl: 'https://testnet-explorer.multiversx.com',
    // xPortal/Herotag API is global (same as mainnet) - profiles are not network-specific
    ID_API_URL: 'https://id-api.multiversx.com',
    USERS_API_URL: '/users/api/v1/users/',
  },
  mainnet: {
    environment: EnvironmentsEnum.mainnet,
    multiversxApiUrl: 'https://api.multiversx.com',
    multiversxGatewayUrl: 'https://gateway.multiversx.com',
    chainId: '1',
    explorerUrl: 'https://explorer.multiversx.com',
    ID_API_URL: 'https://id-api.multiversx.com',
    USERS_API_URL: '/users/api/v1/users/',
  },
};

const config = networkConfigs[selectedNetwork];

// Adresse du contrat Circle Manager
export const circleManagerContract = process.env.VITE_CIRCLE_MANAGER_CONTRACT || '';

// API URL pour le backend
export const API_URL = process.env.VITE_API_URL || 'http://localhost:3001';

// Domaines authentifiés pour les requêtes API
export const sampleAuthenticatedDomains = [API_URL];

// Exports dynamiques
export const environment = config.environment;
export const multiversxApiUrl = config.multiversxApiUrl;
export const multiversxGatewayUrl = config.multiversxGatewayUrl;
export const chainId = config.chainId;
export const explorerUrl = config.explorerUrl;
export const ID_API_URL = config.ID_API_URL;
export const USERS_API_URL = config.USERS_API_URL;

// GitHub Repository URL
export const GITHUB_REPO_URL = 'https://github.com/x-univert/x-circle-x';

// Export current network for debugging
export const CURRENT_NETWORK = selectedNetwork;
