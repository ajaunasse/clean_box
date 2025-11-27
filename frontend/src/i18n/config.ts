import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import English translations
import commonEN from './locales/en/common.json';
import authEN from './locales/en/auth.json';
import dashboardEN from './locales/en/dashboard.json';
import promosEN from './locales/en/promos.json';
import trackingEN from './locales/en/tracking.json';
import vaultEN from './locales/en/vault.json';
import trashEN from './locales/en/trash.json';
import navigationEN from './locales/en/navigation.json';

// Import French translations
import commonFR from './locales/fr/common.json';
import authFR from './locales/fr/auth.json';
import dashboardFR from './locales/fr/dashboard.json';
import promosFR from './locales/fr/promos.json';
import trackingFR from './locales/fr/tracking.json';
import vaultFR from './locales/fr/vault.json';
import trashFR from './locales/fr/trash.json';
import navigationFR from './locales/fr/navigation.json';

const resources = {
  en: {
    common: commonEN,
    auth: authEN,
    dashboard: dashboardEN,
    promos: promosEN,
    tracking: trackingEN,
    vault: vaultEN,
    trash: trashEN,
    navigation: navigationEN,
  },
  fr: {
    common: commonFR,
    auth: authFR,
    dashboard: dashboardFR,
    promos: promosFR,
    tracking: trackingFR,
    vault: vaultFR,
    trash: trashFR,
    navigation: navigationFR,
  },
};

i18n
  .use(LanguageDetector) // Detect user language
  .use(initReactI18next) // Pass i18n instance to react-i18next
  .init({
    resources,
    fallbackLng: 'en',
    supportedLngs: ['en', 'fr'],
    defaultNS: 'common',
    ns: ['common', 'auth', 'dashboard', 'promos', 'tracking', 'vault', 'trash', 'navigation'],
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    detection: {
      // Order of detection methods
      order: ['localStorage', 'navigator', 'htmlTag'],
      // Look for language codes like 'fr-FR', 'en-US' and extract 'fr', 'en'
      lookupLocalStorage: 'i18nextLng',
      // Cache the detected language in localStorage
      caches: ['localStorage'],
      // Exclude certain keys from detection
      excludeCacheFor: ['cimode'],
    },
    // Handle language variations (fr-FR -> fr, en-US -> en)
    load: 'languageOnly',
    // Clean code to avoid issues with regional variants
    cleanCode: true,
  });

export default i18n;
