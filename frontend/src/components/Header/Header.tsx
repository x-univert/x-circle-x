import { faGithub } from '@fortawesome/free-brands-svg-icons';
import {
  faBars,
  faBell,
  faPowerOff,
  faWallet,
  faInfoCircle,
  faCog,
  IconDefinition
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { MouseEvent, useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import classNames from 'classnames';
import { useTranslation } from 'react-i18next';

import { Logo, Tooltip, UserAvatar, NotificationCenter, SettingsModal } from 'components';
import { GITHUB_REPO_URL } from 'config';
import {
  ACCOUNTS_ENDPOINT,
  getAccountProvider,
  MvxButton,
  NotificationsFeedManager,
  useGetAccount,
  useGetIsLoggedIn,
  useGetNetworkConfig
} from 'lib';
import { RouteNamesEnum } from 'localConstants';
import { useNotifications } from 'hooks/useNotifications';

import styles from './header.styles';

interface HeaderBrowseButtonType {
  handleClick: (event: MouseEvent<HTMLDivElement>) => void;
  icon: IconDefinition;
  isVisible: boolean;
  label: string;
  hideOnMobile?: boolean;
}

interface MenuItem {
  labelKey: string;
  route: string;
  icon: string;
}

export const Header = () => {
  const { t } = useTranslation();
  const { network } = useGetNetworkConfig();
  const { address } = useGetAccount();
  const { unreadCount } = useNotifications();

  const isLoggedIn = useGetIsLoggedIn();
  const provider = getAccountProvider();
  const navigate = useNavigate();
  const location = useLocation();
  const explorerAddress = network.explorerAddress;
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleLogout = async (event: MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    await provider.logout();
    navigate(RouteNamesEnum.home);
  };

  const handleGitHubBrowsing = (event: MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    window.open(GITHUB_REPO_URL);
  };

  const handleLogIn = (event: MouseEvent<HTMLElement>) => {
    event.preventDefault();
    navigate(RouteNamesEnum.unlock);
  };

  const handleNotificationsBrowsing = (event: MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsNotificationsOpen(true);
  };

  const handleSettingsBrowsing = (event: MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsSettingsOpen(true);
  };

  const handleAboutBrowsing = (event: MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    navigate(RouteNamesEnum.about);
  };

  const headerBrowseButtons: HeaderBrowseButtonType[] = [
    {
      label: 'About',
      handleClick: handleAboutBrowsing,
      icon: faInfoCircle,
      isVisible: true,
      hideOnMobile: false
    },
    {
      label: 'GitHub',
      handleClick: handleGitHubBrowsing,
      icon: faGithub as IconDefinition,
      isVisible: true,
      hideOnMobile: false
    },
    {
      label: 'Notifications',
      handleClick: handleNotificationsBrowsing,
      icon: faBell,
      isVisible: isLoggedIn,
      hideOnMobile: false
    }
  ];

  const handleLogoClick = (event: MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    navigate(RouteNamesEnum.home);
  };

  // Fermer le menu en cliquant à l'extérieur
  useEffect(() => {
    const handleClickOutside = (event: Event) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

  // Structure de navigation simplifiée pour X-CIRCLE-X
  const navigationItems: MenuItem[] = [
    { labelKey: 'header.circleOfLife', route: RouteNamesEnum.home, icon: '🌀' },
    { labelKey: 'header.investmentCircle', route: RouteNamesEnum.investmentCircle, icon: '💰' },
    { labelKey: 'header.dashboard', route: RouteNamesEnum.dashboard, icon: '📊' },
    { labelKey: 'home.circles', route: RouteNamesEnum.circles, icon: '⭕' },
    { labelKey: 'header.satelliteMap', route: RouteNamesEnum.satelliteMap, icon: '🛰️' },
    { labelKey: 'header.ido', route: RouteNamesEnum.ido, icon: '🚀' },
    { labelKey: 'header.vesting', route: RouteNamesEnum.vesting, icon: '🔒' }
  ];

  const activeRoute = navigationItems.find(item =>
    location.pathname.startsWith(item.route)
  );

  return (
    <header className={styles.header}>
      <div onClick={handleLogoClick} className={styles.headerLogo}>
        <Logo hideTextOnMobile={true} />
      </div>

      {/* Menu de navigation déroulant X-CIRCLE-X */}
      {isLoggedIn && (
        <div className="relative ml-2 sm:ml-4" ref={menuRef}>
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="flex items-center gap-2 px-2 sm:px-4 py-2 bg-secondary border-2 border-secondary vibe-border rounded-lg hover:bg-tertiary transition-all font-medium text-primary"
          >
            <span className="text-lg">{activeRoute?.icon || '📋'}</span>
            <span className="max-[639px]:hidden">{activeRoute ? t(activeRoute.labelKey) : 'Menu'}</span>
            <span className={`max-[639px]:hidden text-secondary transition-transform text-xs ${isMenuOpen ? 'rotate-180' : ''}`}>
              ▼
            </span>
          </button>

          {isMenuOpen && (
            <div className="absolute top-full left-0 mt-2 w-64 bg-secondary border-2 border-secondary vibe-border rounded-lg shadow-xl z-50 overflow-hidden animate-fadeIn">
              {navigationItems.map((item) => (
                <button
                  key={item.route}
                  onClick={() => {
                    navigate(item.route);
                    setIsMenuOpen(false);
                  }}
                  className={`w-full px-4 py-3 flex items-center gap-3 text-left transition-all ${
                    location.pathname.startsWith(item.route)
                      ? 'bg-btn-primary text-btn-primary font-semibold'
                      : 'text-primary hover:bg-tertiary hover:text-accent'
                  }`}
                >
                  <span className="text-lg">{item.icon}</span>
                  <span className="flex-1">{t(item.labelKey)}</span>
                  {location.pathname === item.route && (
                    <span className="ml-auto">✓</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <nav className={styles.headerNavigation}>
        <div className={styles.headerNavigationButtons}>
          {headerBrowseButtons.map((headerBrowseButton) => {
            if (!headerBrowseButton.isVisible) return null;

            const wrapperClass = headerBrowseButton.hideOnMobile ? 'hidden sm:block' : '';

            return (
              <div
                key={`header-${headerBrowseButton.label}-button`}
                className={wrapperClass}
              >
                <Tooltip
                  identifier={`header-${headerBrowseButton.label}-button`}
                  content={headerBrowseButton.label}
                  place='bottom'
                >
                  {() => (
                    <button
                      onClick={headerBrowseButton.handleClick}
                      className={`${styles.headerNavigationButton} relative`}
                      aria-label={headerBrowseButton.label}
                      type="button"
                    >
                      <FontAwesomeIcon
                        className={styles.headerNavigationButtonIcon}
                        icon={headerBrowseButton.icon}
                        aria-hidden="true"
                      />
                      {headerBrowseButton.label === 'Notifications' && unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center border-2 border-white dark:border-gray-800 animate-pulse z-10">
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                      )}
                    </button>
                  )}
                </Tooltip>
              </div>
            );
          })}
        </div>

        {isLoggedIn ? (
          <div className={styles.headerNavigationAddress}>
            <FontAwesomeIcon
              icon={faWallet}
              className={styles.headerNavigationAddressWallet}
            />

            <a
              href={`${explorerAddress}/${ACCOUNTS_ENDPOINT}/${address}`}
              target="_blank"
              rel="noreferrer"
              className={styles.headerNavigationAddressExplorer}
              aria-label={`View account on explorer: ${address}`}
              title={address}
            >
              <span className="font-mono text-sm">
                {address.slice(0, 10)}...{address.slice(-6)}
              </span>
            </a>

            <Tooltip
              place='bottom'
              identifier='disconnect-tooltip-identifier'
              content='Disconnect'
            >
              {() => (
                <button
                  onClick={handleLogout}
                  className={styles.headerNavigationAddressLogout}
                  aria-label='Disconnect'
                  type="button"
                >
                  <FontAwesomeIcon icon={faPowerOff} aria-hidden="true" />
                </button>
              )}
            </Tooltip>

            <Tooltip
              place='bottom'
              identifier='settings-tooltip-identifier'
              content='Settings'
            >
              {() => (
                <button
                  onClick={() => setIsSettingsOpen(true)}
                  className={classNames(
                    styles.headerNavigationAddressLogout,
                    'cursor-pointer hover:bg-tertiary transition-colors'
                  )}
                  aria-label='Settings'
                  type="button"
                >
                  <span className="text-base sm:text-lg" role="img" aria-label="Settings">⚙️</span>
                </button>
              )}
            </Tooltip>

            <Tooltip
              place='bottom'
              identifier='profile-tooltip-identifier'
              content='Profile'
            >
              {() => (
                <button
                  onClick={() => navigate(RouteNamesEnum.profile)}
                  className={classNames(
                    'relative z-1 cursor-pointer hover:opacity-80 transition-opacity',
                    'ml-2'
                  )}
                  aria-label='Profile'
                  type="button"
                >
                  <UserAvatar size="sm" />
                </button>
              )}
            </Tooltip>
          </div>
        ) : (
          <div className={styles.headerNavigationConnect}>
            <button
              onClick={handleLogIn}
              className={styles.headerNavigationConnectDesktop}
            >
              <FontAwesomeIcon icon={faWallet} className="text-white" />
              <span>Connect Wallet</span>
            </button>

            <div
              onClick={handleLogIn}
              className={styles.headerNavigationConnectMobile}
            >
              <FontAwesomeIcon
                icon={faWallet}
                className={styles.headerNavigationConnectIcon}
              />
            </div>
          </div>
        )}
      </nav>

      {/* Notification Center */}
      <NotificationCenter
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </header>
  );
};
