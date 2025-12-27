import { MouseEvent, FunctionComponent, SVGProps } from 'react';
import { useNavigate } from 'react-router-dom';
import { faArrowRightLong } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

import { useGetIsLoggedIn, useGetAccountInfo, getAccountProvider, getNetworkConfig, BrowserEnum, getDetectedBrowser } from 'lib';
import { RouteNamesEnum } from 'localConstants';
import { XCircleLogo } from '../components/Logo/Logo';
import {
  GET_LEDGER,
  GET_XPORTAL,
  CHROME_EXTENSION_LINK,
  CHROME_METAMASK_EXTENSION_LINK,
  FIREFOX_ADDON_LINK,
  FIREFOX_METAMASK_ADDON_LINK
} from 'localConstants';

// Import wallet icons
import LedgerIcon from 'assets/img/ledger-icon.svg?react';
import MetamaskIcon from 'assets/img/metamask-icon.svg?react';
import PasskeyIcon from 'assets/img/passkey-icon.svg?react';
import WebWalletIcon from 'assets/img/web-wallet-icon.svg?react';
import XPortalIcon from 'assets/img/xportal-icon.svg?react';
import ChromeLogo from 'assets/img/chrome-logo.svg?react';
import FirefoxLogo from 'assets/img/firefox-logo.svg?react';
import BraveLogo from 'assets/img/brave-logo.svg?react';
import ArcLogo from 'assets/img/arc-logo.svg?react';
import WalletChromeLogo from 'assets/img/wallet-chrome-logo.svg?react';
import WalletFirefoxLogo from 'assets/img/wallet-firefox-logo.svg?react';
import WalletBraveLogo from 'assets/img/wallet-brave-logo.svg?react';

// Styles
const styles = {
  homeContainer: 'flex flex-col items-center justify-center gap-10 bg-transparent px-2 pb-10 max-w-320 w-screen rounded-3xl overflow-hidden',
  heroContainer: 'relative flex flex-col items-center justify-center text-center w-full min-h-[600px] bg-gradient-to-br from-violet-900 via-purple-800 to-fuchsia-900 rounded-3xl overflow-hidden px-4 py-16',
  heroOverlay: 'absolute inset-0 bg-black/20',
  heroContent: 'relative z-10 flex flex-col items-center gap-8 max-w-4xl mx-auto',
  heroTitle: 'text-6xl md:text-8xl font-bold text-white tracking-tight',
  heroSubtitle: 'text-2xl md:text-3xl text-white/90 font-light',
  heroDescription: 'text-lg md:text-xl text-white/80 max-w-2xl',
  heroButtons: 'flex flex-col sm:flex-row gap-4 mt-4',
  heroConnectButton: 'bg-white text-purple-900 px-8 py-4 rounded-xl font-bold text-lg hover:bg-purple-100 transition-all hover:scale-105 shadow-xl',
  heroAboutButton: 'border-2 border-white/50 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-white/10 transition-all',
  heroFeatures: 'flex flex-wrap justify-center gap-6 mt-8',
  heroFeature: 'flex items-center gap-2 text-white/80 text-sm',
  // How to connect section
  howToConnectContainer: 'flex flex-col items-center w-full justify-center gap-16 lg:gap-20 px-2 lg:px-6 pb-2 lg:pb-6 pt-20 lg:pt-32 bg-primary rounded-4xl transition-all duration-200 ease-out',
  howToConnectHeader: 'flex flex-col gap-4 items-center justify-center',
  howToConnectTitle: 'text-primary text-center text-4xl xxs:text-5xl xs:text-6xl font-medium leading-[1] tracking-[-1.92px] transition-all duration-200 ease-out',
  howToConnectDescription: 'text-secondary text-xl leading-[1.5] tracking-[-0.21px] transition-all duration-200 ease-out',
  howToConnectContent: 'flex flex-col gap-6 items-center justify-center w-full',
  howToConnectContentCards: 'grid grid-cols-1 items-stretch justify-center lg:grid-cols-3 gap-2 lg:gap-6',
  // Extension card
  extensionCardContainer: 'flex flex-col lg:flex-row gap-8 lg:gap-16 items-center justify-between w-full bg-secondary p-6 lg:p-10 rounded-2xl lg:rounded-3xl transition-all duration-200 ease-out',
  extensionCardContent: 'flex flex-col gap-6 lg:gap-8 items-start flex-1',
  extensionCardText: 'flex flex-col gap-4',
  extensionCardTitle: 'text-2xl lg:text-3xl text-primary font-medium tracking-[-0.96px] leading-[1] transition-all duration-200 ease-out',
  extensionCardDescription: 'text-secondary text-lg lg:text-xl tracking-[-0.21px] leading-[1.5] transition-all duration-200 ease-out max-w-xl',
  extensionCardDownloadSection: 'flex flex-col gap-4',
  extensionCardLink: 'text-accent hover:opacity-75 text-lg font-semibold transition-all duration-200 ease-out flex items-center gap-3',
  extensionCardLogos: 'flex gap-4 items-center',
  // Connect card
  connectCardContainer: 'bg-secondary p-8 lg:p-10 flex flex-col gap-10 rounded-2xl lg:rounded-3xl transition-all duration-200 ease-out',
  connectCardText: 'flex flex-col gap-4 flex-1',
  connectCardTitle: 'text-3xl text-primary font-medium tracking-[-0.96px] leading-[1] transition-all duration-200 ease-out',
  connectCardDescription: 'text-secondary text-xl tracking-[-0.21px] leading-[1.5] transition-all duration-200 ease-out',
  connectCardLink: 'text-accent hover:opacity-75 text-lg font-semibold transition-all duration-200 ease-out',
  connectCardLinkTitle: 'p-3'
};

interface BrowserLogo {
  icon: FunctionComponent<SVGProps<SVGSVGElement>>;
}

const browserLogos: BrowserLogo[] = [
  { icon: ChromeLogo },
  { icon: FirefoxLogo },
  { icon: ArcLogo },
  { icon: BraveLogo }
];

const getBrowserIcon = (browser?: BrowserEnum) => {
  switch (browser) {
    case BrowserEnum.Firefox:
      return <WalletFirefoxLogo className="w-16 h-16" />;
    case BrowserEnum.Brave:
      return <WalletBraveLogo className="w-16 h-16" />;
    case BrowserEnum.Chrome:
      return <WalletChromeLogo className="w-16 h-16" />;
    default:
      return <WebWalletIcon className="w-16 h-16" />;
  }
};

interface ConnectCardProps {
  icon: FunctionComponent<SVGProps<SVGSVGElement>>;
  title: string;
  description: string;
  linkTitle: string;
  linkDownloadAddress: string;
}

const ConnectCard = ({ icon: IconComponent, title, description, linkTitle, linkDownloadAddress }: ConnectCardProps) => (
  <div className={styles.connectCardContainer}>
    <IconComponent className="w-12 h-12" />
    <div className={styles.connectCardText}>
      <h2 className={styles.connectCardTitle}>{title}</h2>
      <p className={styles.connectCardDescription}>{description}</p>
    </div>
    <a href={linkDownloadAddress} target="_blank" rel="noreferrer" className={styles.connectCardLink}>
      <span className={styles.connectCardLinkTitle}>{linkTitle}</span>
      <FontAwesomeIcon icon={faArrowRightLong} />
    </a>
  </div>
);

function Home() {
  const isLoggedIn = useGetIsLoggedIn();
  const { address, account } = useGetAccountInfo();
  const navigate = useNavigate();
  const provider = getAccountProvider();

  const walletAddress = getNetworkConfig().network.walletAddress;
  const detectedBrowser = getDetectedBrowser();
  const isFirefox = detectedBrowser === BrowserEnum.Firefox;

  const handleLogout = async () => {
    await provider.logout();
    window.location.href = '/';
  };

  const handleLogin = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    navigate(RouteNamesEnum.unlock);
  };

  const formatAddress = (addr: string) => {
    if (!addr) return '';
    return `${addr.substring(0, 10)}...${addr.substring(addr.length - 6)}`;
  };

  const formatBalance = (balance: string) => {
    if (!balance) return '0';
    const egld = parseFloat(balance) / 10 ** 18;
    return egld.toFixed(4);
  };

  const connectCards = [
    {
      icon: MetamaskIcon,
      title: 'Metamask Snap',
      description: 'Explore the entire MultiversX ecosystem with Metamask! Securely manage, swap and transfer your assets.',
      linkTitle: 'Get Metamask',
      linkDownloadAddress: isFirefox ? FIREFOX_METAMASK_ADDON_LINK : CHROME_METAMASK_EXTENSION_LINK
    },
    {
      icon: PasskeyIcon,
      title: 'Passkey',
      description: 'Passkeys offer a more secure and user-friendly way to authenticate and sign transactions.',
      linkTitle: 'Get Passkey',
      linkDownloadAddress: walletAddress
    },
    {
      icon: XPortalIcon,
      title: 'xPortal Wallet',
      description: 'The easiest way to invest, spend globally with a crypto card and earn yield across DeFi and stablecoins.',
      linkTitle: 'Get xPortal',
      linkDownloadAddress: GET_XPORTAL
    },
    {
      icon: LedgerIcon,
      title: 'Ledger',
      description: 'You can safely store your EGLD by installing the MultiversX EGLD app on your Ledger Nano S or Ledger Nano X device',
      linkTitle: 'Get Started',
      linkDownloadAddress: GET_LEDGER
    },
    {
      icon: WebWalletIcon,
      title: 'MultiversX Web Wallet',
      description: 'Store, swap, and transfer tokens or NFTs. Connect to Web3 apps on MultiversX blockchain.',
      linkTitle: 'Get MultiversX Wallet',
      linkDownloadAddress: walletAddress
    }
  ];

  const browserIcon = getBrowserIcon(detectedBrowser);

  // If logged in, redirect to circles or show dashboard
  if (isLoggedIn) {
    return (
      <div className="min-h-screen">
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-4xl mx-auto">
            <div className="bg-secondary border-2 border-secondary vibe-border rounded-2xl p-8 shadow-2xl">
              <h2 className="text-3xl font-semibold text-primary mb-6 text-center">
                Bienvenue sur X-CIRCLE-X !
              </h2>

              {/* Wallet Info Card */}
              <div className="bg-accent/10 border-2 border-accent/30 rounded-lg p-6 mb-8">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <p className="text-secondary text-sm mb-1">Adresse Wallet</p>
                    <p className="text-primary font-mono text-lg">{formatAddress(address)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-secondary text-sm mb-1">Solde</p>
                    <p className="text-primary font-bold text-2xl">{formatBalance(account.balance)} EGLD</p>
                  </div>
                </div>
                <div className="mt-4 flex gap-2 flex-wrap">
                  <span className="bg-green-500/20 text-green-400 text-xs px-3 py-1 rounded-full">Connecte</span>
                  <span className="bg-purple-500/20 text-purple-400 text-xs px-3 py-1 rounded-full">Devnet</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div
                  className="bg-tertiary p-6 rounded-lg hover:bg-accent/10 transition cursor-pointer border-2 border-secondary hover:border-accent"
                  onClick={() => navigate(RouteNamesEnum.circles)}
                >
                  <div className="text-3xl mb-3">⭕</div>
                  <h3 className="text-xl font-semibold text-primary mb-2">Cercles</h3>
                  <p className="text-secondary text-sm">Creez ou rejoignez des cercles d'epargne</p>
                  <p className="text-green-400 text-xs mt-3">Disponible</p>
                </div>

                <div
                  className="bg-tertiary p-6 rounded-lg hover:bg-accent/10 transition cursor-pointer border-2 border-secondary hover:border-accent"
                  onClick={() => navigate(RouteNamesEnum.dashboard)}
                >
                  <div className="text-3xl mb-3">📊</div>
                  <h3 className="text-xl font-semibold text-primary mb-2">Dashboard</h3>
                  <p className="text-secondary text-sm">Suivez vos cercles et transactions</p>
                  <p className="text-green-400 text-xs mt-3">Disponible</p>
                </div>

                <div
                  className="bg-tertiary p-6 rounded-lg hover:bg-accent/10 transition cursor-pointer border-2 border-secondary hover:border-accent"
                  onClick={() => navigate(RouteNamesEnum.about)}
                >
                  <div className="text-3xl mb-3">📖</div>
                  <h3 className="text-xl font-semibold text-primary mb-2">A propos</h3>
                  <p className="text-secondary text-sm">Decouvrez X-CIRCLE-X</p>
                  <p className="text-green-400 text-xs mt-3">Disponible</p>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-4 px-6 rounded-lg transition duration-200 flex items-center justify-center gap-2"
              >
                <span>🚪</span>
                Deconnexion
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.homeContainer}>
      {/* Hero Section */}
      <div className={styles.heroContainer}>
        <div className={styles.heroOverlay} />
        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>
            <span className="inline-flex items-center gap-4">
              <span className="animate-spin-slow">
                <XCircleLogo size={80} animate={true} />
              </span>
              <span>X-CIRCLE-X</span>
            </span>
          </h1>
          <p className={styles.heroSubtitle}>Tontines Decentralisees sur MultiversX</p>
          <p className={styles.heroDescription}>
            La premiere plateforme de tontine (ROSCA) 100% decentralisee.
            Creez des cercles d'epargne, contribuez ensemble, et beneficiez de la confiance de la blockchain.
          </p>

          <div className={styles.heroButtons}>
            <button onClick={handleLogin} className={styles.heroConnectButton}>
              Connecter mon Wallet
            </button>
            <button onClick={() => navigate(RouteNamesEnum.about)} className={styles.heroAboutButton}>
              En savoir plus
            </button>
          </div>

          <div className={styles.heroFeatures}>
            <div className={styles.heroFeature}>
              <span>🔒</span>
              <span>100% Securise</span>
            </div>
            <div className={styles.heroFeature}>
              <span>⚡</span>
              <span>Transactions Rapides</span>
            </div>
            <div className={styles.heroFeature}>
              <span>🌍</span>
              <span>Accessible Partout</span>
            </div>
            <div className={styles.heroFeature}>
              <span>👥</span>
              <span>Gouvernance DAO</span>
            </div>
          </div>
        </div>
      </div>

      {/* How to Connect Section */}
      <div className={styles.howToConnectContainer}>
        <div className={styles.howToConnectHeader}>
          <h1 className={styles.howToConnectTitle}>How can you connect</h1>
          <p className={styles.howToConnectDescription}>Choose your path, you must.</p>
        </div>

        <div className={styles.howToConnectContent}>
          {/* Extension Card */}
          <div className={styles.extensionCardContainer}>
            <div className={styles.extensionCardContent}>
              {browserIcon}
              <div className={styles.extensionCardText}>
                <h2 className={styles.extensionCardTitle}>MultiversX Wallet Extension</h2>
                <p className={styles.extensionCardDescription}>
                  The MultiversX DeFi Wallet can be installed on Firefox, Chrome, Brave, and other chromium-based browsers.
                  This extension is free and secure.
                </p>
              </div>
              <div className={styles.extensionCardDownloadSection}>
                <a
                  href={isFirefox ? FIREFOX_ADDON_LINK : CHROME_EXTENSION_LINK}
                  target="_blank"
                  rel="noreferrer"
                  className={styles.extensionCardLink}
                >
                  <span>Get Extension</span>
                  <FontAwesomeIcon icon={faArrowRightLong} />
                </a>
                <div className={styles.extensionCardLogos}>
                  {browserLogos.map(({ icon: Icon }, index) => (
                    <Icon key={index} className="w-8 h-8 opacity-70 hover:opacity-100 transition" />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Connect Cards Grid */}
          <div className={styles.howToConnectContentCards}>
            {connectCards.map((card, index) => (
              <ConnectCard
                key={index}
                icon={card.icon}
                title={card.title}
                description={card.description}
                linkTitle={card.linkTitle}
                linkDownloadAddress={card.linkDownloadAddress}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Home;
