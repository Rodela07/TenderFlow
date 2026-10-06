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
    { icon: Hash, label: t('tenderId'), value: tender.tender_id, highlight: true },
    { icon: FileText, label: t('tenderTitle'), value: tender.title },
    { icon: Building2, label: t('procuringEntity'), value: tender.procuring_entity },
    { icon: User, label: t('bidder'), value: tender.bidder },
    { icon: Calendar, label: t('submissionDeadline'), value: tender.submission_deadline, dateHighlight: true },
  ];

  return (
    <motion.div
      className="card relative overflow-hidden group"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Ambient gradient spotlight */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-[#FF385C]/10 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16" />

      <div className="flex items-center justify-between mb-5 relative z-10 border-b border-white/[0.06] pb-3.5">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#FF385C] shadow-[0_0_8px_#FF385C]" />
          <span className="section-label">{t('tenderDetails')}</span>
        </div>
        {voiceEnabled && onSpeak && (
          <button
            onClick={onSpeak}
            className="pill-btn !px-2.5 !py-1 text-xs hover:border-[#FF385C]"
            aria-label={t('speakTender')}
            title={t('speakTender')}
          >
            <Volume2 size={13} className="text-[#FF385C]" />
            <span className="hidden sm:inline">Listen</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 relative z-10">
        {fields.map((field, i) => (
          <motion.div
            key={field.label}
            className={`flex items-start gap-3 p-3 rounded-xl border border-white/[0.04] bg-white/[0.02] ${
              field.highlight ? 'sm:col-span-2 border-[#FF385C]/20 bg-[#FF385C]/[0.03]' : ''
            }`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.05 }}
          >
            <div className={`p-2 rounded-lg ${field.highlight ? 'bg-[#FF385C]/15 text-[#FF385C]' : 'bg-white/[0.05] text-slate-400'}`}>
              <field.icon size={16} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">{field.label}</p>
              <p className={`text-sm font-medium mt-0.5 break-words ${field.highlight ? 'text-white font-semibold' : 'text-slate-200'}`}>
                {field.value}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
