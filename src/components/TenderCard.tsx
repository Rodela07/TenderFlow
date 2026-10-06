import { motion } from 'framer-motion';
import { FileText, Calendar, Building2, User, Hash, Volume2 } from 'lucide-react';
import type { Tender } from '../types';
import { useLang } from '../i18n/LanguageContext';

interface TenderCardProps {
  tender: Tender;
  onSpeak?: () => void;
  voiceEnabled?: boolean;
}

export default function TenderCard({ tender, onSpeak, voiceEnabled }: TenderCardProps) {
  const { t } = useLang();

  const fields = [
    { icon: Hash, label: t('tenderId'), value: tender.tender_id },
    { icon: FileText, label: t('tenderTitle'), value: tender.title },
    { icon: Building2, label: t('procuringEntity'), value: tender.procuring_entity },
    { icon: User, label: t('bidder'), value: tender.bidder },
    { icon: Calendar, label: t('submissionDeadline'), value: tender.submission_deadline },
  ];

  return (
    <motion.div
      className="card"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      whileHover={{ y: -2 }}
    >
      <div className="flex items-center justify-between mb-4">
        <span className="section-label">[ {t('tenderDetails')} ]</span>
        {voiceEnabled && onSpeak && (
          <button
            onClick={onSpeak}
            className="pill-btn !px-2 !py-1"
            aria-label={t('speakTender')}
            title={t('speakTender')}
          >
            <Volume2 size={14} className="text-accent" />
          </button>
        )}
      </div>
      <div className="space-y-3">
        {fields.map((field, i) => (
          <motion.div
            key={field.label}
            className="flex items-start gap-3"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.07 }}
          >
            <field.icon size={16} className="text-muted mt-0.5 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-muted">{field.label}</p>
              <p className="text-sm font-medium break-words">{field.value}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
