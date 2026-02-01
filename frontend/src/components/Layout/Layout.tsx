import { PropsWithChildren, useEffect, useState } from 'react';

import { Footer, Header, SkipLink, NetworkStatus, StarryBackground } from 'components';
import { AuthRedirectWrapper } from 'wrappers';
import { useTransactionNotifications } from 'hooks/useTransactionNotifications';

// prettier-ignore
const styles = {
  layoutContainer: 'layout-container flex min-h-screen flex-col transition-all duration-200 ease-out',
  layoutContainerWithBg: 'layout-container flex min-h-screen flex-col bg-accent transition-all duration-200 ease-out',
  mainContainer: 'main-container flex flex-grow items-stretch justify-center'
} satisfies Record<string, string>;

export const Layout = ({ children }: PropsWithChildren) => {
  // Activer le systeme de notifications de transactions
  useTransactionNotifications();

  // Check if xcirclex theme is active for starry background
  const [isXCircleXTheme, setIsXCircleXTheme] = useState(false);

  useEffect(() => {
    const checkTheme = () => {
      const theme = document.documentElement.getAttribute('data-mvx-theme');
      setIsXCircleXTheme(theme === 'xcirclex');
    };

    checkTheme();

    // Observer for theme changes
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-mvx-theme'],
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div className={isXCircleXTheme ? styles.layoutContainer : styles.layoutContainerWithBg}>
      {isXCircleXTheme && <StarryBackground />}
      <SkipLink />
      <NetworkStatus />
      <Header />

      <main id="main-content" className={styles.mainContainer}>
        <AuthRedirectWrapper>{children}</AuthRedirectWrapper>
      </main>

      <Footer />
    </div>
  );
};
