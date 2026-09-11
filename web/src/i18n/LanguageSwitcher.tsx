import { LOCALES, type Locale } from './locales.ts';
import { useI18n } from './I18nProvider.tsx';

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useI18n();

  return (
    <div className="lang-switcher" role="group" aria-label={t('language.switcher')}>
      {LOCALES.map((code: Locale) => (
        <button
          key={code}
          type="button"
          className={locale === code ? 'active' : ''}
          aria-pressed={locale === code}
          onClick={() => setLocale(code)}
        >
          {t(`language.${code}`)}
        </button>
      ))}
    </div>
  );
}
