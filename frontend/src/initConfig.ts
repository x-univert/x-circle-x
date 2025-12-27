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
    case 'mainnet':
      return EnvironmentsEnum.mainnet;
    case 'devnet':
    default:
      return EnvironmentsEnum.devnet;
  }
};

export const config: InitAppType = {
  storage: { getStorageCallback: () => sessionStorage },
  dAppConfig: {
    nativeAuth,
    environment: getSelectedNetwork(),
    theme: 'mvx:dark-theme',
    providers: {
      walletConnect: {
        walletConnectV2ProjectId
      }
    }
  }
};
