import { useTranslation } from 'react-i18next';

export const SkipLink = () => {
  const { t } = useTranslation();

  return (
    <a
      href="#main-content"
      className="skip-link"
      aria-label={t('accessibility.skipToMainContent') || 'Skip to main content'}
    >
      {t('accessibility.skipToMainContent') || 'Skip to main content'}
    </a>
  );
};
