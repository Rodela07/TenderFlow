import { motion } from 'framer-motion';
import { FileText, X, Copy, CheckCircle2, Lock } from 'lucide-react';
import type { UploadedFile } from '../types';
import { useLang } from '../i18n/LanguageContext';

interface FileCardProps {
  file: UploadedFile;
  onRemove: (id: string) => void;
  isDuplicate: boolean;
  isLocked: boolean;
  lockedByName?: string;
  isMatched: boolean;
  index: number;
}

export default function FileCard({ file, onRemove, isDuplicate, isLocked, lockedByName, isMatched, index }: FileCardProps) {
  const { t } = useLang();

  return (
    <motion.div
      className={`flex items-center gap-3 px-3.5 py-3 rounded-xl border transition-all ${
        isLocked
          ? 'border-amber-500/30 bg-amber-500/[0.04]'
          : isDuplicate
            ? 'border-[#FF385C]/30 bg-[#FF385C]/[0.05]'
            : isMatched
              ? 'border-[#10B981]/25 bg-[#10B981]/[0.03]'
              : 'border-white/[0.08] bg-white/[0.02]'
      }`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.25, delay: index * 0.03 }}
      layout
    >
      <div className={`p-2 rounded-lg ${
        isMatched
          ? 'bg-[#10B981]/15 text-[#34D399]'
          : isLocked
            ? 'bg-amber-500/15 text-amber-400'
            : 'bg-white/[0.05] text-slate-400'
      }`}>
        {isLocked ? <Lock size={15} /> : <FileText size={15} />}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-xs font-semibold text-white truncate">{file.name}</p>
          {isMatched && (
            <span className="flex items-center gap-0.5 text-[10px] text-[#34D399] font-medium">
              <CheckCircle2 size={11} />
              Matched
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <span className="text-[11px] text-slate-400 font-mono">
            {file.pageCount} {file.pageCount === 1 ? t('page') : t('pages')}
          </span>
          <span className="text-[11px] text-slate-500">&bull;</span>
          <span className="text-[11px] text-slate-400 font-mono">
            {(file.size / 1024).toFixed(0)} KB
          </span>

          {isDuplicate && (
            <span className="status-badge duplicate-badge text-[10px] !py-0.5 !px-2">
              <Copy size={10} />
              {t('duplicateBadge')}
            </span>
          )}

          {isLocked && lockedByName && (
            <span className="text-[11px] text-amber-400/90 font-medium">
              {t('duplicateOf')} {lockedByName} (Locked)
            </span>
          )}
        </div>
      </div>

      <button
        onClick={() => onRemove(file.id)}
        className="p-1.5 rounded-lg hover:bg-white/[0.08] transition-colors text-slate-400 hover:text-white"
        aria-label={`${t('remove')} ${file.name}`}
        title={t('remove')}
      >
        <X size={15} />
      </button>
    </motion.div>
  );
}
