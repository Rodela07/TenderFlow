import { AnimatePresence, motion } from 'framer-motion';
import type { UploadedFile, Match } from '../types';
import { useLang } from '../i18n/LanguageContext';
import FileCard from './FileCard';
import { isInDuplicateGroup, isDuplicateLocked } from '../lib/duplicates';

interface FileListProps {
  files: UploadedFile[];
  matches: Match[];
  duplicateGroups: Map<string, string[]>;
  onRemove: (id: string) => void;
}

export default function FileList({ files, matches, duplicateGroups, onRemove }: FileListProps) {
  const { t } = useLang();

  if (files.length === 0) {
    return (
      <motion.p
        className="text-sm text-muted text-center py-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        {t('noFiles')}
      </motion.p>
    );
  }

  return (
    <div className="space-y-2">
      <AnimatePresence mode="popLayout">
        {files.map((file, index) => {
          const isDup = isInDuplicateGroup(file.id, duplicateGroups);
          const lockInfo = isDuplicateLocked(file.id, duplicateGroups, matches);
          const isMatched = matches.some((m) => m.fileId === file.id);
          const lockedByFile = lockInfo.locked
            ? files.find((f) => f.id === lockInfo.matchedSiblingName)
            : undefined;

          return (
            <FileCard
              key={file.id}
              file={file}
              onRemove={onRemove}
              isDuplicate={isDup}
              isLocked={lockInfo.locked}
              lockedByName={lockedByFile?.name}
              isMatched={isMatched}
              index={index}
            />
          );
        })}
      </AnimatePresence>
    </div>
  );
}
