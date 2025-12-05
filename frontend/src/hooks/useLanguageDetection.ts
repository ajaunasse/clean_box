import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * Hook to automatically detect and set user's preferred language
 * Simple rule: If browser language starts with "fr" → French, otherwise → English
 * Detection order:
 * 1. localStorage (user's previous choice)
 * 2. Browser language (navigator.language)
 * 3. Fallback to English
 */
export const useLanguageDetection = () => {
  const { i18n } = useTranslation();

  useEffect(() => {
    const detectLanguage = () => {
      // Check if user already selected a language
      const savedLanguage = localStorage.getItem('i18nextLng');

      if (savedLanguage && ['en', 'fr'].includes(savedLanguage)) {
        // User already has a preference, i18next will handle it
        return;
      }

      // Get browser language
      const browserLang = navigator.language || (navigator as { userLanguage?: string }).userLanguage || 'en';

      // Simple rule: fr* -> French, everything else -> English
      const detectedLanguage = browserLang.toLowerCase().startsWith('fr') ? 'fr' : 'en';

      // Set language if different from current
      if (i18n.language !== detectedLanguage) {
        i18n.changeLanguage(detectedLanguage);
        console.log(`🌍 Language auto-detected: ${detectedLanguage} (from browser: ${browserLang})`);
      }
    };

    detectLanguage();
  }, [i18n]);
};
