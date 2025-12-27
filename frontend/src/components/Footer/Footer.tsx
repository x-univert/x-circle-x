import { faHeart } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXTwitter, faFacebook, faLinkedin, faTelegram } from '@fortawesome/free-brands-svg-icons';
import moment from 'moment';
import { MouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';

import { useGetNetworkConfig } from 'lib';
import { RouteNamesEnum } from 'localConstants';
import { Logo } from '../Logo';

import { version } from '../../../package.json';

// prettier-ignore
const styles = {
  footer: 'footer w-full border-t-4 border-secondary py-8',
  footerContainer: 'footer-container max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start gap-8 px-6',
  footerLeft: 'footer-left flex flex-col gap-4 items-center md:items-start',
  footerSocials: 'footer-socials flex gap-4 text-2xl justify-center',
  footerSocialIcon: 'footer-social-icon text-accent hover:text-primary transition-colors cursor-pointer',
  footerCopyright: 'footer-copyright text-sm text-tertiary mt-2 text-center md:text-left',
  footerRight: 'footer-right flex flex-col gap-2',
  footerResourcesTitle: 'footer-resources-title text-primary font-bold text-lg mb-2',
  footerResourcesList: 'footer-resources-list flex flex-col gap-2',
  footerLink: 'footer-link text-secondary hover:text-accent transition-colors cursor-pointer text-sm',
  footerBottom: 'footer-bottom max-w-7xl mx-auto mt-6 text-center text-sm text-tertiary pt-4 px-6',
  footerDescription: 'footer-description flex items-center justify-center gap-1',
  footerDescriptionNetwork: 'footer-description-network capitalize',
  footerHeartIcon: 'footer-heart-icon text-red-500'
} satisfies Record<string, string>;

export const Footer = () => {
  const { network } = useGetNetworkConfig();
  const navigate = useNavigate();
  const currentYear = moment().year();

  const handleDisclaimerClick = (event: MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    navigate(RouteNamesEnum.disclaimer);
  };

  const handleAboutClick = (event: MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    navigate(RouteNamesEnum.about);
  };

  const handleSocialClick = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <footer className={styles.footer}>
      <div className={styles.footerContainer}>
        {/* Section gauche: Logo + Réseaux sociaux + Copyright */}
        <div className={styles.footerLeft}>
          <Logo />

          <div className={styles.footerSocials}>
            <FontAwesomeIcon
              icon={faXTwitter}
              className={styles.footerSocialIcon}
              onClick={() => handleSocialClick('https://twitter.com/xcirclex')}
            />
            <FontAwesomeIcon
              icon={faTelegram}
              className={styles.footerSocialIcon}
              onClick={() => handleSocialClick('https://t.me/xcirclex')}
            />
            <FontAwesomeIcon
              icon={faFacebook}
              className={styles.footerSocialIcon}
              onClick={() => handleSocialClick('https://facebook.com/xcirclex')}
            />
            <FontAwesomeIcon
              icon={faLinkedin}
              className={styles.footerSocialIcon}
              onClick={() => handleSocialClick('https://linkedin.com/company/xcirclex')}
            />
          </div>

          <div className={styles.footerCopyright}>
            © {currentYear} X-CIRCLE-X. All rights reserved.
          </div>
        </div>

        {/* Section droite: Resources */}
        <div className={styles.footerRight}>
          <h3 className={styles.footerResourcesTitle}>Resources</h3>
          <div className={styles.footerResourcesList}>
            <span
              className={styles.footerLink}
              onClick={() => navigate(RouteNamesEnum.home)}
            >
              Home
            </span>
            <span
              className={styles.footerLink}
              onClick={() => navigate(RouteNamesEnum.circles)}
            >
              Circles
            </span>
            <span
              className={styles.footerLink}
              onClick={() => navigate(RouteNamesEnum.createCircle)}
            >
              Create Circle
            </span>
            <span
              className={styles.footerLink}
              onClick={() => navigate(RouteNamesEnum.dashboard)}
            >
              Dashboard
            </span>
            <span
              className={styles.footerLink}
              onClick={() => navigate(RouteNamesEnum.about)}
            >
              About
            </span>
          </div>
        </div>
      </div>

      {/* Bottom section */}
      <div className={styles.footerBottom}>
        <div className={styles.footerDescription}>
          <span className={styles.footerDescriptionNetwork}>
            {network.id} Build
          </span>
          <span>•</span>
          <span>{version}</span>
        </div>

        <div className={styles.footerDescription}>
          <span>Made with</span>
          <FontAwesomeIcon icon={faHeart} className={styles.footerHeartIcon} />
          <span>for the X-CIRCLE-X community, {currentYear}</span>
        </div>
      </div>
    </footer>
  );
};
