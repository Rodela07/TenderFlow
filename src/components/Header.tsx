import { useLang } from '../i18n/LanguageContext';
import { Languages, Volume2, VolumeX, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';

interface HeaderProps {
  voiceEnabled: boolean;
  onVoiceToggle: () => void;
  voiceSupported: boolean;
}

export default function Header({ voiceEnabled, onVoiceToggle, voiceSupported }: HeaderProps) {
  const { lang, setLang, t } = useLang();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/[0.08] bg-[#08080C]/85 backdrop-blur-xl flex justify-center">
      <div className="w-full max-w-7xl px-4 sm:px-8 py-4 flex items-center justify-between">
        {/* Brand */}
        <motion.a
          href="/"
          className="flex items-center gap-3.5 no-underline group"
          whileHover={{ scale: 1.01 }}
          aria-label={t('appTitle')}
        >
          <div className="relative">
            <img
              src="/favicon.png"
              alt="TenderFlow Logo"
              className="w-10 h-10 rounded-xl shadow-[0_0_20px_rgba(255,56,92,0.3)] object-cover border border-[#FF385C]/40"
            />
            <div className="absolute -inset-0.5 rounded-xl bg-gradient-to-r from-[#FF385C] to-[#FF6B8B] opacity-0 group-hover:opacity-40 transition-opacity -z-10 blur-sm" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold tracking-tight text-white">
                Tender<span className="bg-gradient-to-r from-[#FF385C] to-[#FF6B8B] bg-clip-text text-transparent">Flow</span>
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-[#FF385C]/15 text-[#FF85A1] border border-[#FF385C]/30 hidden sm:inline-block">
                AI DevFest 2026
              </span>
            </div>
            <span className="text-xs text-slate-400 -mt-0.5 hidden sm:block">
              {t('tagline')}
            </span>
          </div>
        </motion.a>

        {/* Security badge & Actions */}
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.08] text-xs text-slate-300">
            <ShieldCheck size={14} className="text-[#10B981]" />
            <span>100% In-Browser &bull; Private</span>
          </div>

          {voiceSupported && (
            <motion.button
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.96 }}
              onClick={onVoiceToggle}
              className={`pill-btn text-xs !py-1.5 !px-3.5 ${
                voiceEnabled
                  ? '!border-[#FF385C] !text-white !bg-[#FF385C]/15 shadow-[0_0_15px_rgba(255,56,92,0.3)]'
                  : ''
              }`}
              aria-label={voiceEnabled ? t('voiceOff') : t('voiceOn')}
              title={voiceEnabled ? t('voiceOff') : t('voiceOn')}
            >
              {voiceEnabled ? (
                <Volume2 size={15} className="text-[#FF385C] animate-pulse" />
              ) : (
                <VolumeX size={15} className="text-slate-400" />
              )}
              <span className="hidden sm:inline">{t('voice')}</span>
            </motion.button>
          )}

          <motion.button
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => setLang(lang === 'en' ? 'bn' : 'en')}
            className="pill-btn text-xs !py-1.5 !px-3.5 border-[#FF385C]/30 hover:border-[#FF385C]"
            aria-label={t('switchLang')}
          >
            <Languages size={15} className="text-[#FF385C]" />
            <span className="font-semibold text-white">
              {lang === 'en' ? 'বাংলা' : 'English'}
            </span>
          </motion.button>
        </div>
      </div>
    </header>
  );
}
