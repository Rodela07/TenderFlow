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
    <header className="sticky top-0 z-50 w-full border-b border-white/[0.08] bg-[#08080C]/80 backdrop-blur-xl">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
        {/* Brand */}
        <motion.a
          href="/"
          className="flex items-center gap-3 no-underline group"
          whileHover={{ scale: 1.02 }}
          aria-label={t('appTitle')}
        >
          <div className="relative">
            <img
              src="/favicon.png"
              alt="TenderFlow Logo"
              className="w-9 h-9 rounded-xl shadow-[0_0_15px_rgba(255,56,92,0.3)] object-cover border border-[#FF385C]/30"
            />
            <div className="absolute -inset-0.5 rounded-xl bg-gradient-to-r from-[#FF385C] to-[#FF6B8B] opacity-0 group-hover:opacity-40 transition-opacity -z-10 blur-sm" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold tracking-tight flex items-center gap-1 text-white">
              Tender<span className="bg-gradient-to-r from-[#FF385C] to-[#FF6B8B] bg-clip-text text-transparent">Flow</span>
            </span>
            <span className="text-[10px] uppercase font-semibold tracking-wider text-slate-400 -mt-1 hidden sm:block">
              AI DevFest 2026 Edition
            </span>
          </div>
        </motion.a>

        {/* Security badge & Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.03] border border-white/[0.06] text-[11px] text-slate-400">
            <ShieldCheck size={13} className="text-[#10B981]" />
            <span>100% In-Browser &bull; Private</span>
          </div>

          {voiceSupported && (
            <motion.button
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.96 }}
              onClick={onVoiceToggle}
              className={`pill-btn text-xs !py-1.5 !px-3 ${voiceEnabled ? '!border-[#FF385C] !text-white !bg-[#FF385C]/10 shadow-[0_0_12px_rgba(255,56,92,0.2)]' : ''}`}
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
            className="pill-btn text-xs !py-1.5 !px-3 border-[#FF385C]/30 hover:border-[#FF385C]"
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
