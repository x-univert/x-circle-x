import './styles/tailwind.css';
import './styles/style.css';

import { walletConnectV2ProjectId, nativeAuth } from 'config';
import { EnvironmentsEnum, InitAppType } from './lib';

// Fonction pour obtenir le réseau sélectionné depuis localStorage
const getSelectedNetwork = (): EnvironmentsEnum => {
  const savedNetwork = localStorage.getItem('selectedNetwork');

  switch (savedNetwork) {
    case 'testnet':
      return EnvironmentsEnum.testnet;
    case 'devnet':
      return EnvironmentsEnum.devnet;
    case 'mainnet':
    default:
      return EnvironmentsEnum.mainnet;  // Mainnet par defaut
  }
};

// Sur mainnet, utiliser le gateway comme apiAddress pour eviter les erreurs CORS
// (api.multiversx.com bloque CORS depuis localhost, le gateway est plus permissif)
const getCustomNetworkConfig = () => {
  const network = getSelectedNetwork();
  if (network === EnvironmentsEnum.mainnet) {
    return { apiAddress: 'https://gateway.multiversx.com' };
  }
  return {};
};

export const config: InitAppType = {
  storage: { getStorageCallback: () => sessionStorage },
  dAppConfig: {
    nativeAuth,
    environment: getSelectedNetwork(),
    theme: 'mvx:dark-theme',
    customNetworkConfig: getCustomNetworkConfig(),
    providers: {
      walletConnect: {
        walletConnectV2ProjectId
      }
    }
  }
};
