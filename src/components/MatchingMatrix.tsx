import React, { useState } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  Clock,
  XCircle,
  Sparkles,
  HelpCircle,
} from 'lucide-react';
import type {
  TenderRequirement,
  UploadedFile,
  DocumentMatch,
  DocumentStatus,
  Language,
} from '../types';
import { translations } from '../locales/i18n';
import { evaluateRequirementStatus } from '../utils/tenderEngine';

interface MatchingMatrixProps {
  lang: Language;
  requirements: TenderRequirement[];
  files: UploadedFile[];
  matches: Record<string, DocumentMatch>;
  submissionDeadline: string;
  onMatchChange: (requirementId: string, fileId: string | null) => void;
  onExpiryDateChange: (requirementId: string, expiryDate: string) => void;
  onApplyAutoMatch: () => void;
}

type FilterTab = 'all' | 'blocking' | 'ready' | 'optional';

export const MatchingMatrix: React.FC<MatchingMatrixProps> = ({
  lang,
  requirements,
  files,
  matches,
  submissionDeadline,
  onMatchChange,
  onExpiryDateChange,
  onApplyAutoMatch,
}) => {
  const t = translations[lang];
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');

  // Compute status for all requirements
  const statuses: Record<string, DocumentStatus> = {};
  for (const req of requirements) {
    const match = matches[req.id];
    const file = match?.fileId ? files.find((f) => f.id === match.fileId) : undefined;
    statuses[req.id] = evaluateRequirementStatus(req, match, file, submissionDeadline);
  }

  // Filter requirements based on selected tab
  const filteredRequirements = requirements.filter((req) => {
    const status = statuses[req.id];
    if (activeFilter === 'blocking') {
      return (
        status === 'Missing' ||
        status === 'Expiry date needed' ||
        status === 'Expired'
      );
    }
    if (activeFilter === 'ready') {
      return status === 'OK';
    }
    if (activeFilter === 'optional') {
      return !req.mandatory;
    }
    return true;
  });

  // Calculate set of file IDs already matched to ANY requirement
  const matchedFileIds = new Set<string>();
  Object.values(matches).forEach((m) => {
    if (m.fileId) matchedFileIds.add(m.fileId);
  });

  const renderStatusBadge = (status: DocumentStatus) => {
    switch (status) {
      case 'OK':
        return (
          <span className="badge badge-ok">
            <CheckCircle2 size={12} /> {t.statusOk}
          </span>
        );
      case 'Missing':
        return (
          <span className="badge badge-missing">
            <XCircle size={12} /> {t.statusMissing}
          </span>
        );
      case 'Expiry date needed':
        return (
          <span className="badge badge-expiry-needed">
            <Clock size={12} /> {t.statusExpiryNeeded}
          </span>
        );
      case 'Expired':
        return (
          <span className="badge badge-expired">
            <AlertCircle size={12} /> {t.statusExpired}
          </span>
        );
      case 'Not provided':
        return (
          <span className="badge badge-not-provided">
            <HelpCircle size={12} /> {t.statusNotProvided}
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="glass-panel" style={{ padding: '24px 28px', marginBottom: 24 }}>
      {/* Title Bar with Auto-Match button */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 16,
        marginBottom: 20
      }}>
        <div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff', marginBottom: 4 }}>
            {t.matchingSectionTitle}
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            {t.matchingSectionDesc}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <button
            onClick={onApplyAutoMatch}
            disabled={files.length === 0}
            className="btn btn-secondary"
            style={{
              fontSize: '0.825rem',
              borderColor: 'rgba(99, 102, 241, 0.4)',
              background: 'rgba(99, 102, 241, 0.12)',
              color: '#c7d2fe',
            }}
          >
            <Sparkles size={14} color="#818cf8" />
            <span>{t.autoMatchBtn}</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginBottom: 18,
        borderBottom: '1px solid var(--border-subtle)',
        paddingBottom: 12,
        overflowX: 'auto'
      }}>
        <button
          onClick={() => setActiveFilter('all')}
          className={`btn ${activeFilter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ fontSize: '0.8rem', padding: '5px 12px' }}
        >
          {t.allFilter} ({requirements.length})
        </button>

        <button
          onClick={() => setActiveFilter('blocking')}
          className={`btn ${activeFilter === 'blocking' ? 'btn-danger' : 'btn-secondary'}`}
          style={{ fontSize: '0.8rem', padding: '5px 12px' }}
        >
          {t.blockingFilter} (
          {
            requirements.filter((r) =>
              ['Missing', 'Expiry date needed', 'Expired'].includes(statuses[r.id])
            ).length
          }
          )
        </button>

        <button
          onClick={() => setActiveFilter('ready')}
          className={`btn ${activeFilter === 'ready' ? 'btn-success' : 'btn-secondary'}`}
          style={{ fontSize: '0.8rem', padding: '5px 12px' }}
        >
          {t.readyFilter} ({requirements.filter((r) => statuses[r.id] === 'OK').length})
        </button>

        <button
          onClick={() => setActiveFilter('optional')}
          className={`btn ${activeFilter === 'optional' ? 'btn-secondary' : 'btn-secondary'}`}
          style={{
            fontSize: '0.8rem',
            padding: '5px 12px',
            opacity: activeFilter === 'optional' ? 1 : 0.75,
            border: activeFilter === 'optional' ? '1px solid #94a3b8' : undefined,
          }}
        >
          {t.optionalFilter} ({requirements.filter((r) => !r.mandatory).length})
        </button>
      </div>

      {/* Matching Matrix Table / Cards */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: 780 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <th style={{ padding: '10px 12px', width: 60 }}>#</th>
              <th style={{ padding: '10px 12px' }}>{t.requirementCol}</th>
              <th style={{ padding: '10px 12px', width: 280 }}>{t.matchedFileCol}</th>
              <th style={{ padding: '10px 12px', width: 170 }}>{t.expiryDateCol}</th>
              <th style={{ padding: '10px 12px', width: 140 }}>{t.statusCol}</th>
            </tr>
          </thead>
          <tbody>
            {filteredRequirements.map((req) => {
              const match = matches[req.id];
              const matchedFile = match?.fileId ? files.find((f) => f.id === match.fileId) : undefined;
              const status = statuses[req.id];
              const title = lang === 'bn' ? req.title_bn : req.title_en;

              return (
                <tr
                  key={req.id}
                  style={{
                    borderBottom: '1px solid var(--border-subtle)',
                    background:
                      status === 'Missing' || status === 'Expired' || status === 'Expiry date needed'
                        ? 'rgba(239, 68, 68, 0.03)'
                        : 'transparent',
                    transition: 'background 0.15s ease'
                  }}
                >
                  {/* Numeric Order # */}
                  <td style={{ padding: '14px 12px', fontWeight: 700, color: 'var(--text-muted)' }}>
                    <span style={{
                      display: 'inline-block',
                      width: 28,
                      height: 28,
                      lineHeight: '28px',
                      textAlign: 'center',
                      borderRadius: '50%',
                      background: 'rgba(255, 255, 255, 0.06)',
                      color: '#ffffff',
                      fontSize: '0.8rem'
                    }}>
                      {req.order}
                    </span>
                  </td>

                  {/* Requirement Name & Badges */}
                  <td style={{ padding: '14px 12px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <span style={{ fontSize: '0.925rem', fontWeight: 700, color: '#ffffff' }}>
                        {title}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <span className={`badge ${req.mandatory ? 'badge-mandatory' : 'badge-optional'}`}>
                          {req.mandatory ? t.mandatoryBadge : t.optionalBadge}
                        </span>
                        {req.has_expiry ? (
                          <span className="badge badge-expiry-needed">
                            {t.expiryNeededBadge}
                          </span>
                        ) : (
                          <span className="badge badge-not-provided" style={{ opacity: 0.65 }}>
                            {t.noExpiryBadge}
                          </span>
                        )}
                        <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>
                          ID: {req.id}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* Matched File Dropdown */}
                  <td style={{ padding: '14px 12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <select
                        value={match?.fileId || ''}
                        onChange={(e) => onMatchChange(req.id, e.target.value || null)}
                        style={{
                          fontSize: '0.825rem',
                          padding: '7px 10px',
                          color: matchedFile ? '#ffffff' : 'var(--text-muted)',
                        }}
                      >
                        <option value="">{t.selectFilePlaceholder}</option>
                        {files.map((f) => {
                          const isAssignedToOther =
                            f.id !== match?.fileId && matchedFileIds.has(f.id);

                          return (
                            <option
                              key={f.id}
                              value={f.id}
                              disabled={f.error ? true : false}
                            >
                              {f.name} ({f.pageCount ?? 0} pgs)
                              {isAssignedToOther ? ' (Already matched)' : ''}
                              {f.isDuplicate ? ' [Duplicate]' : ''}
                              {f.error ? ' [Damaged/Locked]' : ''}
                            </option>
                          );
                        })}
                      </select>

                      {match?.fileId && (
                        <button
                          onClick={() => onMatchChange(req.id, null)}
                          className="btn btn-secondary"
                          style={{ padding: '6px 8px', fontSize: '0.75rem', height: 34 }}
                          title={t.unmatchBtn}
                        >
                          <XCircle size={14} color="#94a3b8" />
                        </button>
                      )}
                    </div>
                  </td>

                  {/* Expiry Date Input (if has_expiry: true) */}
                  <td style={{ padding: '14px 12px' }}>
                    {req.has_expiry ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <input
                          type="date"
                          value={match?.expiryDate || ''}
                          onChange={(e) => onExpiryDateChange(req.id, e.target.value)}
                          disabled={!match?.fileId}
                          style={{
                            fontSize: '0.825rem',
                            padding: '6px 8px',
                            opacity: match?.fileId ? 1 : 0.45,
                          }}
                        />
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                          Deadline: {submissionDeadline}
                        </span>
                      </div>
                    ) : (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        —
                      </span>
                    )}
                  </td>

                  {/* Status Badge */}
                  <td style={{ padding: '14px 12px' }}>
                    {renderStatusBadge(status)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
