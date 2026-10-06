import { motion, AnimatePresence } from 'framer-motion';
import { Download, AlertCircle, Loader, ShieldAlert } from 'lucide-react';
import { useLang } from '../i18n/LanguageContext';
import type { Requirement, Status } from '../types';

interface GenerateBarProps {
  requirements: Requirement[];
  statuses: Map<string, Status>;
  onGenerate: () => void;
  isGenerating: boolean;
  lang: 'en' | 'bn';
}

export default function GenerateBar({ requirements, statuses, onGenerate, isGenerating, lang }: GenerateBarProps) {
  const { t } = useLang();

  const blockingItems: Array<{ title: string; reason: string }> = [];
  for (const req of requirements) {
    const status = statuses.get(req.id);
    if (status && status.blocks) {
      const title = lang === 'bn' ? (req.title_bn || req.title_en) : req.title_en;
      let reason = '';
      if (status.type === 'missing') reason = t('statusMissing');
      else if (status.type === 'expiry_needed') reason = t('statusExpiryNeeded');
      else if (status.type === 'expired') reason = t('statusExpired');
      blockingItems.push({ title, reason });
    }
  }

  const isDisabled = blockingItems.length > 0 || isGenerating;

  return (
    <div className="space-y-4">
      <motion.button
        className={`pill-btn w-full justify-center py-3.5 text-sm font-bold tracking-wide rounded-2xl ${
          !isDisabled
            ? 'pill-btn-accent shadow-[0_0_30px_rgba(255,56,92,0.4)]'
            : 'bg-white/[0.04] text-slate-500 border-white/[0.06]'
        }`}
        disabled={isDisabled}
        onClick={onGenerate}
        whileHover={!isDisabled ? { scale: 1.02 } : undefined}
        whileTap={!isDisabled ? { scale: 0.98 } : undefined}
        aria-label={t('generate')}
      >
        {isGenerating ? (
          <>
            <Loader size={18} className="animate-spin text-white" />
            <span>{t('generating')}</span>
          </>
        ) : !isDisabled ? (
          <>
            <Download size={18} className="text-white" />
            <span>{t('generate')}</span>
          </>
        ) : (
          <div className="flex items-center gap-2">
            <ShieldAlert size={16} className="text-[#FF385C]" />
            <span>{lang === 'bn' ? `${blockingItems.length}টি সমস্যা সমাধান করুন` : `Fix ${blockingItems.length} Blocking Issue${blockingItems.length > 1 ? 's' : ''}`}</span>
          </div>
        )}
      </motion.button>

      <AnimatePresence>
        {blockingItems.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="rounded-xl border border-[#FF385C]/20 bg-[#FF385C]/[0.04] p-3.5">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle size={14} className="text-[#FF85A1]" />
                <span className="text-xs font-bold text-[#FF85A1] uppercase tracking-wider">
                  {t('blockingReasons')} ({blockingItems.length})
                </span>
              </div>
              <ul className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {blockingItems.map((item, i) => (
                  <li key={i} className="text-xs flex items-center justify-between gap-2 p-1.5 rounded-lg bg-black/20 border border-white/[0.04]">
                    <span className="font-medium text-slate-200 truncate">{item.title}</span>
                    <span className="text-[11px] font-semibold text-[#FF85A1] shrink-0">{item.reason}</span>
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
