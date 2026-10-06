import React from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  FileCheck2,
  Lock,
  ArrowRight,
} from 'lucide-react';
import type { StatusSummary, Language } from '../types';
import { translations } from '../locales/i18n';

interface ValidationSummaryBannerProps {
  summary: StatusSummary;
  lang: Language;
  onOpenGenerateModal: () => void;
}

export const ValidationSummaryBanner: React.FC<ValidationSummaryBannerProps> = ({
  summary,
  lang,
  onOpenGenerateModal,
}) => {
  const t = translations[lang];

  return (
    <div
      className="glass-panel"
      style={{
        padding: '20px 24px',
        marginBottom: 24,
        background: summary.isPackageReady
          ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(15, 23, 42, 0.8) 100%)'
          : 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(15, 23, 42, 0.8) 100%)',
        border: summary.isPackageReady
          ? '1px solid rgba(16, 185, 129, 0.4)'
          : '1px solid rgba(239, 68, 68, 0.35)',
      }}
    >
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 16
      }}>
        {/* Left Side: Status Alert & Headline */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 280 }}>
          <div style={{
            width: 46,
            height: 46,
            borderRadius: '50%',
            background: summary.isPackageReady ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            {summary.isPackageReady ? (
              <CheckCircle2 size={26} color="#34d399" />
            ) : (
              <AlertTriangle size={26} color="#f87171" />
            )}
          </div>

          <div>
            <h3 style={{
              fontSize: '1.15rem',
              fontWeight: 800,
              color: summary.isPackageReady ? '#34d399' : '#f87171',
              marginBottom: 2
            }}>
              {summary.isPackageReady
                ? t.packageReadyBanner
                : `${t.blockingIssuesBanner} (${summary.blockingCount})`}
            </h3>
            <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
              {summary.isPackageReady
                ? t.packageReadyDesc
                : `Fix ${summary.blockingCount} blocking issue${summary.blockingCount > 1 ? 's' : ''} before generating the package.`}
            </p>
          </div>
        </div>

        {/* Right Side: Generate Button */}
        <div>
          <button
            onClick={onOpenGenerateModal}
            disabled={!summary.isPackageReady}
            className={`btn ${summary.isPackageReady ? 'btn-primary' : 'btn-secondary'}`}
            style={{
              padding: '12px 24px',
              fontSize: '0.95rem',
              fontWeight: 700,
              boxShadow: summary.isPackageReady ? '0 0 20px rgba(99, 102, 241, 0.4)' : undefined,
            }}
            title={!summary.isPackageReady ? t.generateDisabledTooltip : ''}
          >
            {summary.isPackageReady ? (
              <>
                <FileCheck2 size={18} />
                <span>{t.generateButton}</span>
                <ArrowRight size={16} />
              </>
            ) : (
              <>
                <Lock size={16} color="#94a3b8" />
                <span>{t.generateButton}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Summary Badges Ribbon */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: 10,
        marginTop: 18,
        paddingTop: 16,
        borderTop: '1px solid rgba(255, 255, 255, 0.08)'
      }}>
        <div style={{
          background: 'rgba(255, 255, 255, 0.04)',
          padding: '8px 12px',
          borderRadius: 'var(--radius-md)',
          display: 'flex',
          flexDirection: 'column',
          gap: 2
        }}>
          <span style={{ fontSize: '0.725rem', color: 'var(--text-secondary)' }}>
            {t.requiredDocsSummary}
          </span>
          <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#ffffff' }}>
            {summary.totalRequired}
          </span>
        </div>

        <div style={{
          background: 'rgba(16, 185, 129, 0.08)',
          border: '1px solid rgba(16, 185, 129, 0.2)',
          padding: '8px 12px',
          borderRadius: 'var(--radius-md)',
          display: 'flex',
          flexDirection: 'column',
          gap: 2
        }}>
          <span style={{ fontSize: '0.725rem', color: '#a7f3d0' }}>
            {t.readyDocsSummary}
          </span>
          <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#34d399' }}>
            {summary.ready}
          </span>
        </div>

        <div style={{
          background: summary.missing > 0 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(255, 255, 255, 0.04)',
          border: summary.missing > 0 ? '1px solid rgba(239, 68, 68, 0.3)' : undefined,
          padding: '8px 12px',
          borderRadius: 'var(--radius-md)',
          display: 'flex',
          flexDirection: 'column',
          gap: 2
        }}>
          <span style={{ fontSize: '0.725rem', color: summary.missing > 0 ? '#fca5a5' : 'var(--text-secondary)' }}>
            {t.missingDocsSummary}
          </span>
          <span style={{ fontSize: '1.1rem', fontWeight: 800, color: summary.missing > 0 ? '#f87171' : '#ffffff' }}>
            {summary.missing}
          </span>
        </div>

        <div style={{
          background: summary.expired > 0 ? 'rgba(225, 29, 72, 0.12)' : 'rgba(255, 255, 255, 0.04)',
          border: summary.expired > 0 ? '1px solid rgba(225, 29, 72, 0.3)' : undefined,
          padding: '8px 12px',
          borderRadius: 'var(--radius-md)',
          display: 'flex',
          flexDirection: 'column',
          gap: 2
        }}>
          <span style={{ fontSize: '0.725rem', color: summary.expired > 0 ? '#fda4af' : 'var(--text-secondary)' }}>
            {t.expiredDocsSummary}
          </span>
          <span style={{ fontSize: '1.1rem', fontWeight: 800, color: summary.expired > 0 ? '#fb7185' : '#ffffff' }}>
            {summary.expired}
          </span>
        </div>

        <div style={{
          background: summary.expiryNeeded > 0 ? 'rgba(245, 158, 11, 0.12)' : 'rgba(255, 255, 255, 0.04)',
          border: summary.expiryNeeded > 0 ? '1px solid rgba(245, 158, 11, 0.3)' : undefined,
          padding: '8px 12px',
          borderRadius: 'var(--radius-md)',
          display: 'flex',
          flexDirection: 'column',
          gap: 2
        }}>
          <span style={{ fontSize: '0.725rem', color: summary.expiryNeeded > 0 ? '#fde68a' : 'var(--text-secondary)' }}>
            Expiry Needed
          </span>
          <span style={{ fontSize: '1.1rem', fontWeight: 800, color: summary.expiryNeeded > 0 ? '#fbbf24' : '#ffffff' }}>
            {summary.expiryNeeded}
          </span>
        </div>

        <div style={{
          background: 'rgba(255, 255, 255, 0.04)',
          padding: '8px 12px',
          borderRadius: 'var(--radius-md)',
          display: 'flex',
          flexDirection: 'column',
          gap: 2
        }}>
          <span style={{ fontSize: '0.725rem', color: 'var(--text-secondary)' }}>
            {t.optionalNotProvidedSummary}
          </span>
          <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#94a3b8' }}>
            {summary.optionalNotProvided}
          </span>
        </div>
      </div>
    </div>
  );
};
