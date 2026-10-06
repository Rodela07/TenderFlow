import { motion, AnimatePresence } from 'framer-motion';
import { Download, AlertCircle, Loader } from 'lucide-react';
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
    <div className="space-y-3">
      <motion.button
        className={`pill-btn w-full justify-center py-3 text-sm font-semibold ${
          !isDisabled ? 'pill-btn-accent' : ''
        }`}
        disabled={isDisabled}
        onClick={onGenerate}
        whileHover={!isDisabled ? { y: -2 } : undefined}
        whileTap={!isDisabled ? { scale: 0.98 } : undefined}
        aria-label={t('generate')}
      >
        {isGenerating ? (
          <>
            <Loader size={16} className="animate-spin" />
            {t('generating')}
          </>
        ) : (
          <>
            <Download size={16} />
            {t('generate')}
          </>
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
            <div className="rounded-xl border border-[rgba(212,96,90,0.2)] bg-[rgba(212,96,90,0.05)] p-3">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle size={14} className="text-status-missing" />
                <span className="text-xs font-semibold text-status-missing">
                  [ {t('blockingReasons')} ]
                </span>
              </div>
              <ul className="space-y-1">
                {blockingItems.map((item, i) => (
                  <li key={i} className="text-xs text-muted flex gap-2">
                    <span className="text-status-missing shrink-0">&bull;</span>
                    <span>
                      <span className="font-medium text-light">{item.title}</span>
                      {' '}
                      <span className="text-status-missing">{item.reason}</span>
                    </span>
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
