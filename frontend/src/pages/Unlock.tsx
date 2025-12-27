import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

import { UnlockPanelManager, useGetLoginInfo } from 'lib';
import { RouteNamesEnum } from 'localConstants';

export const Unlock = () => {
  const navigate = useNavigate();
  const { isLoggedIn } = useGetLoginInfo();
  const hasRedirected = useRef(false);

  const unlockPanelManager = UnlockPanelManager.init({
    loginHandler: () => {
      // Ne pas rediriger ici, laisser le useEffect gérer
      console.log('🔐 Unlock - Login handler called, waiting for useEffect to handle redirect');
    },
    onClose: () => {
      // Redirection uniquement si l'utilisateur ferme sans se connecter
      if (!isLoggedIn) {
        const returnUrl = sessionStorage.getItem('returnUrl');
        if (returnUrl) {
          sessionStorage.removeItem('returnUrl');
          navigate(returnUrl);
        } else {
          navigate(RouteNamesEnum.home);
        }
      }
    }
  });

  const handleOpenUnlockPanel = () => {
    unlockPanelManager.openUnlockPanel();
  };

  useEffect(() => {
    if (isLoggedIn && !hasRedirected.current) {
      hasRedirected.current = true;

      console.log('🔐 Unlock - User is logged in, checking for return URL...');

      // Petit délai pour s'assurer que tout est prêt
      setTimeout(() => {
        const returnUrl = sessionStorage.getItem('returnUrl');
        console.log('🔐 Unlock - Return URL from sessionStorage:', returnUrl);

        if (returnUrl) {
          sessionStorage.removeItem('returnUrl');
          console.log('🔐 Unlock - Redirecting to:', returnUrl);
          navigate(returnUrl);
        } else {
          console.log('🔐 Unlock - No return URL, redirecting to home');
          navigate(RouteNamesEnum.home);
        }
      }, 100);

      return;
    }

    if (!isLoggedIn && !hasRedirected.current) {
      handleOpenUnlockPanel();
    }
  }, [isLoggedIn, navigate]);

  return null;
};

export default Unlock;
