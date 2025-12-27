import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import translationFR from './locales/fr/translation.json';
import translationEN from './locales/en/translation.json';
import translationES from './locales/es/translation.json';

// Récupérer la langue sauvegardée ou utiliser 'fr' par défaut
const savedLanguage = localStorage.getItem('language') || 'fr';

const resources = {
  fr: {
    translation: translationFR
  },
  en: {
    translation: translationEN
  },
  es: {
    translation: translationES
  }
};

i18n
  .use(initReactI18next) // Passer i18n à react-i18next
  .init({
    resources,
    lng: savedLanguage, // Langue par défaut
    fallbackLng: 'fr', // Langue de secours si une traduction manque
    interpolation: {
      escapeValue: false // React échappe déjà les valeurs
    },
    react: {
      useSuspense: false // Désactiver suspense pour éviter les problèmes de chargement
    }
  });

export default i18n;
