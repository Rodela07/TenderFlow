import React from 'react';
import {
  Building2,
  UserCheck,
  Calendar,
  Hash,
  RefreshCw,
  Clock,
} from 'lucide-react';
import type { TenderMetadata, Language } from '../types';
import { translations } from '../locales/i18n';

interface TenderMetaCardProps {
  tender: TenderMetadata;
  lang: Language;
  onResetJson: () => void;
}

export const TenderMetaCard: React.FC<TenderMetaCardProps> = ({
  tender,
  lang,
  onResetJson,
}) => {
  const t = translations[lang];

  // Calculate days remaining until deadline
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const deadline = new Date(tender.submission_deadline);
  deadline.setHours(0, 0, 0, 0);
  const diffTime = deadline.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return (
    <div className="glass-panel" style={{ padding: '20px 24px', marginBottom: 24 }}>
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 16,
        marginBottom: 16,
        paddingBottom: 16,
        borderBottom: '1px solid var(--border-color)'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <span className="badge badge-ok" style={{ fontSize: '0.75rem' }}>
              <Hash size={12} /> {tender.tender_id}
            </span>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#ffffff' }}>
              {tender.title}
            </h2>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            {t.tenderInfo} • {tender.procuring_entity}
          </p>
        </div>

        <button
          onClick={onResetJson}
          className="btn btn-secondary"
          style={{ fontSize: '0.8rem', padding: '6px 12px' }}
        >
          <RefreshCw size={14} />
          <span>{t.replaceJson}</span>
        </button>
      </div>

      {/* Grid of metadata fields */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: 16
      }}>
        {/* Procuring Entity */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.03)',
          padding: '12px 14px',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)', fontSize: '0.75rem', marginBottom: 4, fontWeight: 600 }}>
            <Building2 size={14} color="#60a5fa" />
            <span>{t.procuringEntity}</span>
          </div>
          <div style={{ fontSize: '0.925rem', fontWeight: 700, color: '#ffffff' }}>
            {tender.procuring_entity}
          </div>
        </div>

        {/* Bidder */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.03)',
          padding: '12px 14px',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)', fontSize: '0.75rem', marginBottom: 4, fontWeight: 600 }}>
            <UserCheck size={14} color="#34d399" />
            <span>{t.bidderName}</span>
          </div>
          <div style={{ fontSize: '0.925rem', fontWeight: 700, color: '#ffffff' }}>
            {tender.bidder}
          </div>
        </div>

        {/* Submission Deadline */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.03)',
          padding: '12px 14px',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)', fontSize: '0.75rem', marginBottom: 4, fontWeight: 600 }}>
            <Calendar size={14} color="#fbbf24" />
            <span>{t.submissionDeadline}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: '0.925rem', fontWeight: 700, color: '#ffffff' }}>
              {tender.submission_deadline}
            </span>
            <span
              className={`badge ${diffDays < 0 ? 'badge-expired' : 'badge-ok'}`}
              style={{ fontSize: '0.675rem', textTransform: 'none' }}
            >
              <Clock size={10} />
              {diffDays < 0 ? `Expired ${Math.abs(diffDays)}d ago` : `${diffDays} days left`}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
