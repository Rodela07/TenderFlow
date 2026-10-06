import { useLang } from '../i18n/LanguageContext';

export default function Footer() {
  const { t } = useLang();
  const year = new Date().getFullYear();

  return (
    <footer className="w-full border-t border-[rgba(229,229,229,0.12)] mt-auto">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted">
        <p>&copy; {year} {t('copyright')}</p>
        <a
          href="mailto:support@tenderpackage.app"
          className="text-muted hover:text-accent transition-colors"
        >
          {t('support')}: {t('supportEmail')}
        </a>
      </div>
    </footer>
  );
}
