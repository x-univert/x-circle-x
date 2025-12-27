import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useHandleThemeManagement } from 'hooks/useHandleThemeManagement';
import { useFocusTrap } from 'hooks/useFocusTrap';
import { ThemeTooltipDots } from '../Header/components/ThemeTooltip/components/ThemeTooltipDots';
import { useGetNetworkConfig } from 'lib';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ThemeMode = 'mvx:dark-theme' | 'mvx:vibe-theme' | 'mvx:light-theme' | 'xcirclex' | 'auto';
type Language = 'fr' | 'en' | 'es';
type Network = 'devnet' | 'testnet' | 'mainnet';

const THEME_LABELS: Record<ThemeMode, string> = {
  'mvx:dark-theme': 'Sombre (TealLab)',
  'mvx:light-theme': 'Clair (BrightLight)',
  'mvx:vibe-theme': 'VibeMode',
  'xcirclex': 'X-CIRCLE-X',
  'auto': 'Auto'
};

const THEME_DOT_COLORS: Record<string, string[]> = {
  'mvx:dark-theme': ['#23F7DD', '#262626', '#B6B3AF', '#FFFFFF'],
  'mvx:vibe-theme': ['#471150', '#5A2A62', '#D200FA', '#FFFFFF'],
  'mvx:light-theme': ['#000000', '#A5A5A5', '#E2DEDC', '#F3EFED'],
  'xcirclex': ['#1E3A8A', '#7C3AED', '#EC4899', '#F59E0B']
};

const LANGUAGE_LABELS: Record<Language, string> = {
  fr: 'Français',
  en: 'English',
  es: 'Español'
};

const NETWORK_LABELS: Record<Network, string> = {
  devnet: 'Devnet',
  testnet: 'Testnet',
  mainnet: 'Mainnet'
};

export const SettingsModal = ({ isOpen, onClose }: SettingsModalProps) => {
  const modalRef = useFocusTrap(isOpen);
  const clickOutsideRef = useRef<HTMLDivElement>(null);
  const { activeTheme, handleThemeSwitch } = useHandleThemeManagement();
  const { network } = useGetNetworkConfig();
  const { t, i18n } = useTranslation();

  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('themeMode') as ThemeMode;
    return saved || 'auto';
  });

  const [language, setLanguage] = useState<Language>(() => {
    return i18n.language as Language || 'fr';
  });

  const [selectedNetwork, setSelectedNetwork] = useState<Network>(() => {
    const saved = localStorage.getItem('selectedNetwork') as Network;
    return saved || 'devnet';
  });

  // États pour les menus déroulants
  const [isThemeOpen, setIsThemeOpen] = useState(false);
  const [isNetworkOpen, setIsNetworkOpen] = useState(false);
  const [isLanguageOpen, setIsLanguageOpen] = useState(false);

  // Fermer le modal en cliquant à l'extérieur
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (clickOutsideRef.current && !clickOutsideRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Fermer avec la touche Escape
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  // Appliquer le thème
  useEffect(() => {
    const applyTheme = (mode: ThemeMode) => {
      if (mode === 'auto') {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const autoTheme = prefersDark ? 'mvx:dark-theme' : 'mvx:light-theme';
        document.documentElement.setAttribute('data-mvx-theme', autoTheme);
      } else {
        document.documentElement.setAttribute('data-mvx-theme', mode);
      }
    };

    applyTheme(themeMode);
    localStorage.setItem('themeMode', themeMode);

    // Écouter les changements de préférence système si Auto est sélectionné
    if (themeMode === 'auto') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = () => applyTheme('auto');
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    }
  }, [themeMode]);

  // Changer la langue
  useEffect(() => {
    i18n.changeLanguage(language);
    localStorage.setItem('language', language);
  }, [language, i18n]);

  // Sauvegarder le réseau sélectionné et recharger l'application
  useEffect(() => {
    const currentNetwork = localStorage.getItem('selectedNetwork') || 'devnet';

    if (selectedNetwork !== currentNetwork) {
      localStorage.setItem('selectedNetwork', selectedNetwork);

      // Afficher un message de confirmation avant le rechargement
      const confirmReload = window.confirm(
        t('settings.network.confirmReload', {
          defaultValue: 'Le changement de réseau nécessite un rechargement de l\'application. Continuer ?'
        })
      );

      if (confirmReload) {
        // Recharger la page pour appliquer le nouveau réseau
        window.location.reload();
      } else {
        // Annuler le changement
        setSelectedNetwork(currentNetwork as Network);
      }
    }
  }, [selectedNetwork, t]);

  const handleThemeChange = (newMode: ThemeMode) => {
    setThemeMode(newMode);
  };

  const handleLanguageChange = (newLanguage: Language) => {
    setLanguage(newLanguage);
  };

  const handleNetworkChange = (newNetwork: Network) => {
    setSelectedNetwork(newNetwork);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end pt-20 pr-4">
      <div
        ref={(el) => {
          (modalRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
          (clickOutsideRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
        }}
        className="bg-secondary border-2 border-secondary vibe-border rounded-xl shadow-2xl p-6 w-80 animate-fadeIn"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 id="settings-modal-title" className="text-xl font-bold text-primary flex items-center gap-2">
            <span className="text-2xl" role="img" aria-label="Settings">⚙️</span>
            {t('settings.title')}
          </h2>
          <button
            onClick={onClose}
            className="text-secondary hover:text-primary text-2xl leading-none transition-colors"
            aria-label={t('common.close')}
            type="button"
          >
            ×
          </button>
        </div>

        {/* Sélecteur de thème (déroulant) */}
        <div className="mb-4">
          <button
            onClick={() => setIsThemeOpen(!isThemeOpen)}
            className="w-full flex items-center justify-between px-4 py-3 bg-primary border-2 border-secondary vibe-border rounded-lg hover:bg-tertiary transition-all"
            type="button"
            aria-expanded={isThemeOpen}
            aria-controls="theme-options"
          >
            <div className="flex items-center gap-3">
              {themeMode === 'auto' ? (
                <span className="text-xl">🔄</span>
              ) : themeMode === 'xcirclex' ? (
                <div className="w-6 h-6 flex items-center justify-center">
                  <svg viewBox="0 0 100 100" width="20" height="20">
                    <defs>
                      <linearGradient id="xcircle-btn-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" style={{stopColor:'#7C3AED'}} />
                        <stop offset="50%" style={{stopColor:'#EC4899'}} />
                        <stop offset="100%" style={{stopColor:'#F59E0B'}} />
                      </linearGradient>
                    </defs>
                    <circle cx="50" cy="50" r="42" fill="none" stroke="url(#xcircle-btn-grad)" strokeWidth="6"/>
                    <line x1="30" y1="30" x2="70" y2="70" stroke="url(#xcircle-btn-grad)" strokeWidth="8" strokeLinecap="round"/>
                    <line x1="70" y1="30" x2="30" y2="70" stroke="url(#xcircle-btn-grad)" strokeWidth="8" strokeLinecap="round"/>
                  </svg>
                </div>
              ) : (
                <ThemeTooltipDots dotColors={THEME_DOT_COLORS[themeMode]} size="large" />
              )}
              <span className="font-semibold text-primary">
                {t('settings.theme.label')}: <span className={themeMode === 'xcirclex' ? 'bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent font-bold' : 'text-accent'}>
                  {themeMode === 'xcirclex' ? 'X-CIRCLE-X' : t(`settings.theme.${themeMode === 'auto' ? 'auto' : themeMode === 'mvx:dark-theme' ? 'dark' : themeMode === 'mvx:light-theme' ? 'light' : 'vibe'}`)}
                </span>
              </span>
            </div>
            <span className={`text-secondary transition-transform ${isThemeOpen ? 'rotate-180' : ''}`}>
              ▼
            </span>
          </button>

          {isThemeOpen && (
            <div id="theme-options" className="mt-2 flex flex-col gap-2 pl-2">
              {/* Thème X-CIRCLE-X - En premier */}
              <button
                onClick={() => {
                  handleThemeChange('xcirclex');
                  setIsThemeOpen(false);
                }}
                className={`px-3 py-2 rounded-lg font-medium transition-all text-left flex items-center gap-3 text-sm ${
                  themeMode === 'xcirclex'
                    ? 'bg-gradient-to-r from-blue-900 via-purple-900 to-pink-900 text-white shadow-md border-2 border-purple-500'
                    : 'bg-primary text-secondary border border-secondary hover:bg-tertiary'
                }`}
                type="button"
                role="radio"
                aria-checked={themeMode === 'xcirclex'}
              >
                <div className="w-6 h-6 flex items-center justify-center">
                  <svg viewBox="0 0 100 100" width="24" height="24">
                    <defs>
                      <linearGradient id="xcircle-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" style={{stopColor:'#7C3AED'}} />
                        <stop offset="50%" style={{stopColor:'#EC4899'}} />
                        <stop offset="100%" style={{stopColor:'#F59E0B'}} />
                      </linearGradient>
                    </defs>
                    <circle cx="50" cy="50" r="42" fill="none" stroke="url(#xcircle-grad)" strokeWidth="6"/>
                    <line x1="30" y1="30" x2="70" y2="70" stroke="url(#xcircle-grad)" strokeWidth="8" strokeLinecap="round"/>
                    <line x1="70" y1="30" x2="30" y2="70" stroke="url(#xcircle-grad)" strokeWidth="8" strokeLinecap="round"/>
                  </svg>
                </div>
                <span className="flex-1 font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                  X-CIRCLE-X
                </span>
                {themeMode === 'xcirclex' && (
                  <span className="text-lg text-purple-400">✓</span>
                )}
              </button>

              {/* Thèmes MultiversX */}
              {(['mvx:dark-theme', 'mvx:light-theme', 'mvx:vibe-theme'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => {
                    handleThemeChange(t);
                    setIsThemeOpen(false);
                  }}
                  className={`px-3 py-2 rounded-lg font-medium transition-all text-left flex items-center gap-3 text-sm ${
                    themeMode === t
                      ? 'bg-btn-primary text-btn-primary shadow-md'
                      : 'bg-primary text-secondary border border-secondary hover:bg-tertiary'
                  }`}
                  type="button"
                  role="radio"
                  aria-checked={themeMode === t}
                >
                  <ThemeTooltipDots dotColors={THEME_DOT_COLORS[t]} size="large" />
                  <span className="flex-1">{THEME_LABELS[t]}</span>
                  {themeMode === t && (
                    <span className="text-lg">✓</span>
                  )}
                </button>
              ))}

              {/* Mode Auto */}
              <button
                onClick={() => {
                  handleThemeChange('auto');
                  setIsThemeOpen(false);
                }}
                className={`px-3 py-2 rounded-lg font-medium transition-all text-left flex items-center gap-3 text-sm ${
                  themeMode === 'auto'
                    ? 'bg-btn-primary text-btn-primary shadow-md'
                    : 'bg-primary text-secondary border border-secondary hover:bg-tertiary'
                }`}
                type="button"
                role="radio"
                aria-checked={themeMode === 'auto'}
              >
                <span className="text-xl">🔄</span>
                <span className="flex-1">{THEME_LABELS['auto']}</span>
                {themeMode === 'auto' && (
                  <span className="text-lg">✓</span>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Sélecteur de réseau (déroulant) */}
        <div className="mb-4">
          <button
            onClick={() => setIsNetworkOpen(!isNetworkOpen)}
            className="w-full flex items-center justify-between px-4 py-3 bg-primary border-2 border-secondary vibe-border rounded-lg hover:bg-tertiary transition-all"
            type="button"
            aria-expanded={isNetworkOpen}
            aria-controls="network-options"
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">
                {selectedNetwork === 'devnet' && '🔧'}
                {selectedNetwork === 'testnet' && '🧪'}
                {selectedNetwork === 'mainnet' && '🌐'}
              </span>
              <span className="font-semibold text-primary">
                {t('settings.network.label')}: <span className="text-accent">{t(`settings.network.${selectedNetwork}`)}</span>
              </span>
            </div>
            <span className={`text-secondary transition-transform ${isNetworkOpen ? 'rotate-180' : ''}`}>
              ▼
            </span>
          </button>

          {isNetworkOpen && (
            <div id="network-options" className="mt-2 flex flex-col gap-2 pl-2">
              {(['devnet', 'testnet', 'mainnet'] as Network[]).map((net) => (
                <button
                  key={net}
                  onClick={() => {
                    handleNetworkChange(net);
                    setIsNetworkOpen(false);
                  }}
                  className={`px-3 py-2 rounded-lg font-medium transition-all text-left flex items-center gap-3 text-sm ${
                    selectedNetwork === net
                      ? 'bg-btn-primary text-btn-primary shadow-md'
                      : 'bg-primary text-secondary border border-secondary hover:bg-tertiary'
                  }`}
                  type="button"
                  role="radio"
                  aria-checked={selectedNetwork === net}
                >
                  <span className="text-xl">
                    {net === 'devnet' && '🔧'}
                    {net === 'testnet' && '🧪'}
                    {net === 'mainnet' && '🌐'}
                  </span>
                  <span className="flex-1">{NETWORK_LABELS[net]}</span>
                  {selectedNetwork === net && (
                    <span className="text-lg">✓</span>
                  )}
                </button>
              ))}
            </div>
          )}

          {selectedNetwork !== network.id && (
            <p className="text-xs text-warning mt-2 px-2">
              {t('settings.network.reloadWarning')}
            </p>
          )}
        </div>

        {/* Sélecteur de langue (déroulant) */}
        <div>
          <button
            onClick={() => setIsLanguageOpen(!isLanguageOpen)}
            className="w-full flex items-center justify-between px-4 py-3 bg-primary border-2 border-secondary vibe-border rounded-lg hover:bg-tertiary transition-all"
            type="button"
            aria-expanded={isLanguageOpen}
            aria-controls="language-options"
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">
                {language === 'fr' && '🇫🇷'}
                {language === 'en' && '🇬🇧'}
                {language === 'es' && '🇪🇸'}
              </span>
              <span className="font-semibold text-primary">
                {t('settings.language.label')}: <span className="text-accent">{t(`settings.language.${language}`)}</span>
              </span>
            </div>
            <span className={`text-secondary transition-transform ${isLanguageOpen ? 'rotate-180' : ''}`}>
              ▼
            </span>
          </button>

          {isLanguageOpen && (
            <div id="language-options" className="mt-2 flex flex-col gap-2 pl-2">
              {(['fr', 'en', 'es'] as Language[]).map((lang) => (
                <button
                  key={lang}
                  onClick={() => {
                    handleLanguageChange(lang);
                    setIsLanguageOpen(false);
                  }}
                  className={`px-3 py-2 rounded-lg font-medium transition-all text-left flex items-center gap-3 text-sm ${
                    language === lang
                      ? 'bg-btn-primary text-btn-primary shadow-md'
                      : 'bg-primary text-secondary border border-secondary hover:bg-tertiary'
                  }`}
                  type="button"
                  role="radio"
                  aria-checked={language === lang}
                >
                  <span className="text-xl">
                    {lang === 'fr' && '🇫🇷'}
                    {lang === 'en' && '🇬🇧'}
                    {lang === 'es' && '🇪🇸'}
                  </span>
                  <span className="flex-1">{LANGUAGE_LABELS[lang]}</span>
                  {language === lang && (
                    <span className="text-lg">✓</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
