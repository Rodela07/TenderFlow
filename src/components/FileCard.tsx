import { motion } from 'framer-motion';
import { FileText, X, Copy } from 'lucide-react';
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
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-colors ${
        isDuplicate
          ? 'border-[rgba(201,174,180,0.3)] bg-[rgba(201,174,180,0.05)]'
          : isMatched
            ? 'border-[rgba(107,155,122,0.2)] bg-[rgba(107,155,122,0.04)]'
            : 'border-[rgba(229,229,229,0.08)] bg-dark-surface'
      }`}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8, scale: 0.95 }}
      transition={{ duration: 0.3, delay: index * 0.04 }}
      layout
    >
      <FileText size={18} className={`shrink-0 ${isMatched ? 'text-status-ok' : 'text-muted'}`} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate">{file.name}</p>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted">
            {file.pageCount} {file.pageCount === 1 ? t('page') : t('pages')}
          </span>
          <span className="text-xs text-muted">
            {(file.size / 1024).toFixed(0)} KB
          </span>
          {isDuplicate && (
            <span className="status-badge duplicate-badge">
              <Copy size={11} />
              {t('duplicateBadge')}
            </span>
          )}
          {isLocked && lockedByName && (
            <span className="text-xs text-accent italic">
              {t('duplicateOf')} {lockedByName}
            </span>
          )}
        </div>
      </div>
      <button
        onClick={() => onRemove(file.id)}
        className="shrink-0 p-1 rounded-lg hover:bg-[rgba(229,229,229,0.08)] transition-colors text-muted hover:text-light"
        aria-label={`${t('remove')} ${file.name}`}
        title={t('remove')}
      >
        <X size={16} />
      </button>
    </motion.div>
  );
}
