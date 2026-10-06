import { useLang } from '../i18n/LanguageContext';
import { Languages, Volume2, VolumeX } from 'lucide-react';
import { motion } from 'framer-motion';

interface HeaderProps {
  voiceEnabled: boolean;
  onVoiceToggle: () => void;
  voiceSupported: boolean;
}

export default function Header({ voiceEnabled, onVoiceToggle, voiceSupported }: HeaderProps) {
  const { lang, setLang, t } = useLang();

  return (
    <header className="w-full border-b border-[rgba(229,229,229,0.12)]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
        <motion.a
          href="/"
          className="flex items-center gap-2.5 no-underline"
          whileHover={{ y: -1 }}
          aria-label={t('appTitle')}
        >
          <img
            src="/favicon.png"
            alt="TenderFlow Logo"
            className="w-8 h-8 rounded-lg shadow-sm object-cover border border-white/10"
          />
          <div className="flex flex-col">
            <span className="text-base font-bold text-light tracking-tight flex items-center gap-1.5">
              Tender<span className="text-[#C9AEB4]">Flow</span>
            </span>
          </div>
        </motion.a>

        <div className="flex items-center gap-2">
          {voiceSupported && (
            <motion.button
              whileHover={{ y: -1 }}
              onClick={onVoiceToggle}
              className="pill-btn"
              aria-label={voiceEnabled ? t('voiceOff') : t('voiceOn')}
              title={voiceEnabled ? t('voiceOff') : t('voiceOn')}
            >
              {voiceEnabled ? (
                <Volume2 size={16} className="text-accent" />
              ) : (
                <VolumeX size={16} />
              )}
              <span className="hidden sm:inline text-xs">{t('voice')}</span>
            </motion.button>
          )}

          <motion.button
            whileHover={{ y: -1 }}
            onClick={() => setLang(lang === 'en' ? 'bn' : 'en')}
            className="pill-btn"
            aria-label={t('switchLang')}
          >
            <Languages size={16} />
            <span className="text-xs font-semibold">
              {lang === 'en' ? 'বাংলা' : 'EN'}
            </span>
          </motion.button>
        </div>
      </div>
    </header>
  );
}
