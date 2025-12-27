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

// Composant SVG du logo X-CIRCLE-X
export const XCircleLogo = ({ size = 32, animate = false }: { size?: number; animate?: boolean }) => (
  <svg
    viewBox="0 0 100 100"
    width={size}
    height={size}
    className={animate ? 'xcircle-logo-animate' : ''}
  >
    <defs>
      <linearGradient id="xcircle-logo-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style={{stopColor:'#7C3AED'}} />
        <stop offset="50%" style={{stopColor:'#EC4899'}} />
        <stop offset="100%" style={{stopColor:'#F59E0B'}} />
      </linearGradient>
      <filter id="logo-glow">
        <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
        <feMerge>
          <feMergeNode in="coloredBlur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    </defs>
    {/* Cercle extérieur */}
    <circle
      cx="50"
      cy="50"
      r="42"
      fill="none"
      stroke="url(#xcircle-logo-gradient)"
      strokeWidth="5"
      filter="url(#logo-glow)"
    />
    {/* X au centre */}
    <line
      x1="30"
      y1="30"
      x2="70"
      y2="70"
      stroke="url(#xcircle-logo-gradient)"
      strokeWidth="7"
      strokeLinecap="round"
      filter="url(#logo-glow)"
    />
    <line
      x1="70"
      y1="30"
      x2="30"
      y2="70"
      stroke="url(#xcircle-logo-gradient)"
      strokeWidth="7"
      strokeLinecap="round"
      filter="url(#logo-glow)"
    />
    {/* Point central */}
    <circle
      cx="50"
      cy="50"
      r="5"
      fill="url(#xcircle-logo-gradient)"
      filter="url(#logo-glow)"
    />
  </svg>
);

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
