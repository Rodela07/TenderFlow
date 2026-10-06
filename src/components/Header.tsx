import React from 'react';
import {
  FileCheck2,
  Languages,
  FileSpreadsheet,
  FolderOpen,
  Save,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import type { Language, TenderConfig, DocumentMatch, UploadedFile } from '../types';
import { translations } from '../locales/i18n';
import { exportChecklistCsv, exportProjectState } from '../utils/sampleData';

interface HeaderProps {
  lang: Language;
  onToggleLang: () => void;
  config: TenderConfig | null;
  matches: Record<string, DocumentMatch>;
  files: Record<string, UploadedFile>;
  statuses: Record<string, string>;
  onOpenTestsModal: () => void;
  onLoadSavedProject: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

export const Header: React.FC<HeaderProps> = ({
  lang,
  onToggleLang,
  config,
  matches,
  files,
  statuses,
  onOpenTestsModal,
  onLoadSavedProject,
}) => {
  const t = translations[lang];
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleExportCsv = () => {
    if (!config) return;
    exportChecklistCsv(config, matches, files, statuses);
  };

  const handleSaveProject = () => {
    if (!config) return;
    exportProjectState(config, matches);
  };

  return (
    <header style={{
      borderBottom: '1px solid var(--border-color)',
      background: 'rgba(11, 15, 25, 0.85)',
      backdropFilter: 'blur(12px)',
      position: 'sticky',
      top: 0,
      zIndex: 40,
      padding: '12px 24px'
    }}>
      <div style={{
        maxWidth: 1400,
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 16
      }}>
        {/* Brand & Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 44,
            height: 44,
            borderRadius: 'var(--radius-md)',
            background: 'var(--accent-gradient)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 16px rgba(99, 102, 241, 0.4)'
          }}>
            <FileCheck2 size={24} color="#ffffff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h1 style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#ffffff' }}>
                {t.appTitle}
              </h1>
              <span className="badge badge-ok" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <Sparkles size={11} /> {t.badgeOfficial}
              </span>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              {t.appSubtitle}
            </p>
          </div>
        </div>

        {/* Global Action Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {/* Automated Verification Suite Trigger */}
          <button
            onClick={onOpenTestsModal}
            className="btn btn-secondary"
            style={{ fontSize: '0.8rem', padding: '6px 12px' }}
            title="Run 28 automated test cases"
          >
            <CheckCircle2 size={15} color="#34d399" />
            <span>{t.testSuitTitle}</span>
          </button>

          {/* Export CSV Checklist */}
          {config && (
            <button
              onClick={handleExportCsv}
              className="btn btn-secondary"
              style={{ fontSize: '0.8rem', padding: '6px 12px' }}
              title="Export CSV document checklist"
            >
              <FileSpreadsheet size={15} color="#60a5fa" />
              <span>{t.exportCsvBtn}</span>
            </button>
          )}

          {/* Save / Open Project State */}
          {config && (
            <button
              onClick={handleSaveProject}
              className="btn btn-secondary"
              style={{ fontSize: '0.8rem', padding: '6px 12px' }}
              title="Save project state to local file"
            >
              <Save size={15} color="#cbd5e1" />
              <span>{t.saveProjectBtn}</span>
            </button>
          )}

          <input
            type="file"
            ref={fileInputRef}
            onChange={onLoadSavedProject}
            accept=".tendercase,.json"
            style={{ display: 'none' }}
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            className="btn btn-secondary"
            style={{ fontSize: '0.8rem', padding: '6px 12px' }}
            title="Open a saved project file"
          >
            <FolderOpen size={15} color="#cbd5e1" />
            <span>{t.loadProjectBtn}</span>
          </button>

          {/* Language Switcher */}
          <button
            onClick={onToggleLang}
            className="btn btn-secondary"
            style={{
              fontSize: '0.825rem',
              padding: '6px 14px',
              borderColor: 'rgba(99, 102, 241, 0.4)',
              background: 'rgba(99, 102, 241, 0.1)',
            }}
            title="Switch Language (English / বাংলা)"
          >
            <Languages size={15} color="#a5b4fc" />
            <span style={{ fontWeight: 700, color: '#e0e7ff' }}>
              {lang === 'en' ? 'বাংলা' : 'English'}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
};
