import { motion } from 'framer-motion';
import type { Requirement, UploadedFile, Match, ExpiryDate, Status } from '../types';
import StatusBadge from './StatusBadge';
import { useLang } from '../i18n/LanguageContext';
import { isDuplicateLocked } from '../lib/duplicates';
import { Calendar, Sparkles } from 'lucide-react';

interface RequirementRowProps {
  requirement: Requirement;
  index: number;
  files: UploadedFile[];
  matches: Match[];
  expiryDates: ExpiryDate[];
  status: Status;
  duplicateGroups: Map<string, string[]>;
  onMatch: (requirementId: string, fileId: string | null) => void;
  onExpiryChange: (requirementId: string, date: string) => void;
  suggestion?: string;
}

export default function RequirementRow({
  requirement,
  index,
  files,
  matches,
  expiryDates,
  status,
  duplicateGroups,
  onMatch,
  onExpiryChange,
  suggestion,
}: RequirementRowProps) {
  const { lang, t } = useLang();

  const currentMatch = matches.find((m) => m.requirementId === requirement.id);
  const currentExpiry = expiryDates.find((e) => e.requirementId === requirement.id);
  const title = lang === 'bn' ? (requirement.title_bn || requirement.title_en) : requirement.title_en;

  // Build available files list: only unmatched files (plus current match) and not locked duplicates
  const availableFiles = files.filter((f) => {
    // Always include the currently matched file
    if (currentMatch && f.id === currentMatch.fileId) return true;
    // Exclude files matched to OTHER requirements
    if (matches.some((m) => m.fileId === f.id && m.requirementId !== requirement.id)) return false;
    // Exclude locked duplicates
    const lockInfo = isDuplicateLocked(f.id, duplicateGroups, matches);
    if (lockInfo.locked) return false;
    return true;
  });

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    onMatch(requirement.id, value === '' ? null : value);
  };

  const suggestedFile = suggestion ? files.find((f) => f.id === suggestion) : undefined;
  const isOk = status.type === 'ok';

  return (
    <motion.div
      className={`p-4 rounded-xl border transition-all ${
        isOk
          ? 'bg-white/[0.015] border-white/[0.06] hover:border-white/[0.12]'
          : status.blocks
            ? 'bg-[#FF385C]/[0.02] border-[#FF385C]/20 hover:border-[#FF385C]/40'
            : 'bg-white/[0.01] border-white/[0.04]'
      }`}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.04 }}
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left: Order badge + Title + Badges */}
        <div className="flex items-start gap-3.5 flex-1 min-w-0">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
            isOk
              ? 'bg-[#10B981]/15 text-[#34D399] border border-[#10B981]/30'
              : 'bg-[#FF385C]/15 text-[#FF385C] border border-[#FF385C]/30'
          }`}>
            {String(requirement.order).padStart(2, '0')}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-sm font-semibold text-white tracking-tight break-words">
                {title}
              </h4>
              {requirement.mandatory ? (
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-[#FF385C]/15 text-[#FF85A1] border border-[#FF385C]/25">
                  {t('mandatory')}
                </span>
              ) : (
                <span className="text-[10px] uppercase font-semibold tracking-wider px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-white/[0.06]">
                  {t('optional')}
                </span>
              )}
            </div>

            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
              <StatusBadge type={status.type} />
              {requirement.has_expiry && (
                <span className="flex items-center gap-1 text-[11px] text-amber-400/90 font-medium">
                  <Calendar size={12} />
                  {t('expiryDate')}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right: Select File & Expiry picker */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
          <div className="flex flex-col gap-1">
            <select
              value={currentMatch?.fileId ?? ''}
              onChange={handleSelectChange}
              className="w-full sm:w-56"
              aria-label={`${t('selectFile')} - ${title}`}
            >
              <option value="">{t('selectFile')}</option>
              {availableFiles.map((f) => (
                <option key={f.id} value={f.id}>{f.name} ({f.pageCount}p)</option>
              ))}
            </select>

            {suggestedFile && !currentMatch && (
              <button
                onClick={() => onMatch(requirement.id, suggestedFile.id)}
                className="flex items-center gap-1 text-[11px] text-[#FF85A1] hover:text-[#FF385C] transition-colors mt-0.5"
              >
                <Sparkles size={11} />
                <span>{t('suggestedMatch')}: {suggestedFile.name}</span>
              </button>
            )}
          </div>

          {requirement.has_expiry && currentMatch && (
            <div className="flex flex-col gap-1">
              <input
                type="date"
                value={currentExpiry?.date ?? ''}
                onChange={(e) => onExpiryChange(requirement.id, e.target.value)}
                className="w-full sm:w-40"
                aria-label={`${t('expiryDate')} - ${title}`}
                title={t('expiryDate')}
              />
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
