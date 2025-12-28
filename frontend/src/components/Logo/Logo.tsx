import classNames from 'classnames';
import { useEffect, useState } from 'react';

// prettier-ignore
const styles = {
  logo: 'logo flex items-center justify-center gap-2 sm:gap-3 cursor-pointer hover:opacity-75',
  logoIcon: 'logo-icon transition-all duration-200 ease-in-out',
  logoText: 'logo-text text-xl lg:text-2xl font-bold flex text-primary relative -top-0.5 leading-none transition-all duration-200 ease-in-out lg:top-0',
  logoTextHidden: 'logo-text-hidden hidden md:!flex'
} satisfies Record<string, string>;

interface LogoPropsType {
  hideTextOnMobile?: boolean;
}

// Composant SVG du logo X-CIRCLE-X (nouveau design branding)
export const XCircleLogo = ({ size = 32, animate = true }: { size?: number; animate?: boolean }) => {
  // Unique ID pour les gradients (éviter conflits si plusieurs logos)
  const uniqueId = `xcircle-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <svg
      viewBox="0 0 200 200"
      width={size}
      height={size}
      className={animate ? 'xcircle-logo-animate' : ''}
    >
      <defs>
        {/* Gradient principal violet/rose */}
        <linearGradient id={`mainGradient-${uniqueId}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{stopColor:'#8B5CF6'}} />
          <stop offset="50%" style={{stopColor:'#A855F7'}} />
          <stop offset="100%" style={{stopColor:'#EC4899'}} />
        </linearGradient>

        {/* Gradient pour le X central */}
        <linearGradient id={`xGradient-${uniqueId}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{stopColor:'#F0ABFC'}} />
          <stop offset="100%" style={{stopColor:'#FFFFFF'}} />
        </linearGradient>

        {/* Gradient pour les fleches rotatives */}
        <linearGradient id={`arrowGradient-${uniqueId}`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" style={{stopColor:'#22D3EE'}} />
          <stop offset="100%" style={{stopColor:'#A855F7'}} />
        </linearGradient>

        {/* Ombre portee */}
        <filter id={`glow-${uniqueId}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>

      {/* Cercle externe avec bordure gradient */}
      <circle cx="100" cy="100" r="90" fill="none" stroke={`url(#mainGradient-${uniqueId})`} strokeWidth="6" opacity="0.9"/>

      {/* Cercle interne */}
      <circle cx="100" cy="100" r="75" fill="none" stroke={`url(#mainGradient-${uniqueId})`} strokeWidth="2" opacity="0.5"/>

      {/* Fleches de rotation autour du cercle (3 fleches a 120 degres) */}
      {animate ? (
        <>
          {/* Fleche 1 - Haut */}
          <path d="M100 18 L108 30 L100 26 L92 30 Z" fill={`url(#arrowGradient-${uniqueId})`} filter={`url(#glow-${uniqueId})`}>
            <animateTransform attributeName="transform" type="rotate" from="0 100 100" to="360 100 100" dur="8s" repeatCount="indefinite"/>
          </path>

          {/* Fleche 2 - Bas gauche */}
          <path d="M100 18 L108 30 L100 26 L92 30 Z" fill={`url(#arrowGradient-${uniqueId})`} filter={`url(#glow-${uniqueId})`} transform="rotate(120 100 100)">
            <animateTransform attributeName="transform" type="rotate" from="120 100 100" to="480 100 100" dur="8s" repeatCount="indefinite"/>
          </path>

          {/* Fleche 3 - Bas droite */}
          <path d="M100 18 L108 30 L100 26 L92 30 Z" fill={`url(#arrowGradient-${uniqueId})`} filter={`url(#glow-${uniqueId})`} transform="rotate(240 100 100)">
            <animateTransform attributeName="transform" type="rotate" from="240 100 100" to="600 100 100" dur="8s" repeatCount="indefinite"/>
          </path>

          {/* Arc de cercle rotatif (trace de rotation) */}
          <circle cx="100" cy="100" r="82" fill="none" stroke={`url(#arrowGradient-${uniqueId})`} strokeWidth="3" strokeDasharray="40 180" strokeLinecap="round" opacity="0.7">
            <animateTransform attributeName="transform" type="rotate" from="0 100 100" to="360 100 100" dur="8s" repeatCount="indefinite"/>
          </circle>
        </>
      ) : (
        <>
          {/* Version statique des fleches */}
          <path d="M100 18 L108 30 L100 26 L92 30 Z" fill={`url(#arrowGradient-${uniqueId})`} filter={`url(#glow-${uniqueId})`}/>
          <path d="M100 18 L108 30 L100 26 L92 30 Z" fill={`url(#arrowGradient-${uniqueId})`} filter={`url(#glow-${uniqueId})`} transform="rotate(120 100 100)"/>
          <path d="M100 18 L108 30 L100 26 L92 30 Z" fill={`url(#arrowGradient-${uniqueId})`} filter={`url(#glow-${uniqueId})`} transform="rotate(240 100 100)"/>
          <circle cx="100" cy="100" r="82" fill="none" stroke={`url(#arrowGradient-${uniqueId})`} strokeWidth="3" strokeDasharray="40 180" strokeLinecap="round" opacity="0.7"/>
        </>
      )}

      {/* X Central */}
      <g filter={`url(#glow-${uniqueId})`}>
        {/* Premiere barre du X */}
        <rect x="60" y="95" width="80" height="10" rx="5" fill={`url(#xGradient-${uniqueId})`} transform="rotate(45 100 100)"/>
        {/* Deuxieme barre du X */}
        <rect x="60" y="95" width="80" height="10" rx="5" fill={`url(#xGradient-${uniqueId})`} transform="rotate(-45 100 100)"/>
      </g>

      {/* Points decoratifs sur le cercle (representant les SC peripheriques) */}
      <circle cx="100" cy="20" r="4" fill="#22D3EE"/>
      <circle cx="169" cy="60" r="4" fill="#A855F7"/>
      <circle cx="180" cy="100" r="4" fill="#EC4899"/>
      <circle cx="169" cy="140" r="4" fill="#F472B6"/>
      <circle cx="100" cy="180" r="4" fill="#22D3EE"/>
      <circle cx="31" cy="140" r="4" fill="#A855F7"/>
      <circle cx="20" cy="100" r="4" fill="#EC4899"/>
      <circle cx="31" cy="60" r="4" fill="#F472B6"/>
    </svg>
  );
};

export const Logo = ({ hideTextOnMobile }: LogoPropsType) => {
  const [isXCircleTheme, setIsXCircleTheme] = useState(false);

  useEffect(() => {
    // Vérifier le thème actuel
    const checkTheme = () => {
      const theme = document.documentElement.getAttribute('data-mvx-theme');
      setIsXCircleTheme(theme === 'xcirclex');
    };

    checkTheme();

    // Observer les changements de thème
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-mvx-theme']
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div className={styles.logo}>
      <div className={styles.logoIcon}>
        <XCircleLogo size={36} animate={isXCircleTheme} />
      </div>

      <div
        className={classNames(styles.logoText, {
          [styles.logoTextHidden]: hideTextOnMobile
        })}
      >
        <span className={isXCircleTheme ? 'bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 bg-clip-text text-transparent' : ''}>
          X-CIRCLE-X
        </span>
      </div>
    </div>
  );
};
