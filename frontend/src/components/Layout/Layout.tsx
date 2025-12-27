import { PropsWithChildren } from 'react';

import { Footer, Header, SkipLink, NetworkStatus } from 'components';
import { AuthRedirectWrapper } from 'wrappers';
import { useTransactionNotifications } from 'hooks/useTransactionNotifications';

// prettier-ignore
const styles = {
  layoutContainer: 'layout-container flex min-h-screen flex-col bg-accent transition-all duration-200 ease-out',
  mainContainer: 'main-container flex flex-grow items-stretch justify-center'
} satisfies Record<string, string>;

export const Layout = ({ children }: PropsWithChildren) => {
  // Activer le systeme de notifications de transactions
  useTransactionNotifications();

  return (
    <div className={styles.layoutContainer}>
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
