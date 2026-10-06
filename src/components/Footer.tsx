import { useLang } from '../i18n/LanguageContext';

export default function Footer() {
  const { t } = useLang();
  const year = new Date().getFullYear();

  return (
    <footer className="w-full border-t border-white/[0.08] bg-[#08080C]/80 mt-auto flex justify-center">
      <div className="w-full max-w-5xl px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
        <p>&copy; {year} TenderFlow &bull; {t('copyright')}</p>
        <span className="text-slate-400">
          Client-side PDF packaging engine &bull; No documents leave your device
        </span>
      </div>
    </footer>
  );
}
