import { useTranslation } from 'react-i18next';
import './LanguageSwitcher.css';

export const LanguageSwitcher = () => {
  const { i18n } = useTranslation();

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  return (
    <div className="language-switcher">
      <button
        onClick={() => changeLanguage('en')}
        className={`lang-btn ${i18n.language === 'en' ? 'active' : ''}`}
      >
        EN
      </button>
      <button
        onClick={() => changeLanguage('fr')}
        className={`lang-btn ${i18n.language === 'fr' ? 'active' : ''}`}
      >
        FR
      </button>
    </div>
  );
};
