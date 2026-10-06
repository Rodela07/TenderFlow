import { motion } from 'framer-motion';
import type { Requirement, UploadedFile, Match, ExpiryDate, Status } from '../types';
import StatusBadge from './StatusBadge';
import { useLang } from '../i18n/LanguageContext';
import { isDuplicateLocked } from '../lib/duplicates';

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

  return (
    <motion.div
      className="py-3"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.07 }}
    >
      <div className="flex flex-col sm:flex-row sm:items-start gap-3">
        {/* Order number + title */}
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <span className="text-accent font-semibold text-sm tabular-nums shrink-0 mt-0.5">
            {String(requirement.order).padStart(2, '0')}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium break-words">{title}</p>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                requirement.mandatory
                  ? 'bg-[rgba(212,96,90,0.1)] text-status-missing'
                  : 'bg-[rgba(138,138,143,0.1)] text-muted'
              }`}>
                {requirement.mandatory ? t('mandatory') : t('optional')}
              </span>
              <StatusBadge type={status.type} />
            </div>
          </div>
        </div>

        {/* Controls: file select + expiry */}
        <div className="flex flex-col gap-2 sm:items-end shrink-0">
          <div className="relative">
            <select
              value={currentMatch?.fileId ?? ''}
              onChange={handleSelectChange}
              className="w-full sm:w-auto"
              aria-label={`${t('selectFile')} - ${title}`}
            >
              <option value="">{t('selectFile')}</option>
              {availableFiles.map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
            {suggestedFile && !currentMatch && (
              <button
                onClick={() => onMatch(requirement.id, suggestedFile.id)}
                className="mt-1 text-xs text-accent hover:underline"
              >
                {t('suggestedMatch')}: {suggestedFile.name}
              </button>
            )}
          </div>

          {requirement.has_expiry && currentMatch && (
            <input
              type="date"
              value={currentExpiry?.date ?? ''}
              onChange={(e) => onExpiryChange(requirement.id, e.target.value)}
              className="w-full sm:w-auto"
              aria-label={`${t('expiryDate')} - ${title}`}
            />
          )}
        </div>
      </div>
    </motion.div>
  );
}
