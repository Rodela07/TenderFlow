import React, { useState, useRef } from 'react';
import {
  FileCode2,
  UploadCloud,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';
import type { TenderConfig, Language } from '../types';
import { translations } from '../locales/i18n';
import { validateRequirementsJson } from '../utils/tenderEngine';
import { SAMPLE_REQUIREMENTS_JSON } from '../utils/sampleData';

interface JsonLoaderProps {
  lang: Language;
  onConfigLoaded: (config: TenderConfig) => void;
}

export const JsonLoader: React.FC<JsonLoaderProps> = ({ lang, onConfigLoaded }) => {
  const t = translations[lang];
  const [isDragging, setIsDragging] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processJsonFile = async (file: File) => {
    setErrorMessage(null);
    try {
      const text = await file.text();
      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch {
        setErrorMessage('Failed to parse JSON file. Please ensure it is a valid JSON document.');
        return;
      }

      const validation = validateRequirementsJson(parsed);
      if (!validation.valid || !validation.data) {
        setErrorMessage(validation.error || 'Invalid requirements schema.');
        return;
      }

      onConfigLoaded(validation.data);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'An error occurred while reading the file.'
      );
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processJsonFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processJsonFile(e.target.files[0]);
    }
  };

  const handleLoadSample = () => {
    onConfigLoaded(SAMPLE_REQUIREMENTS_JSON);
  };

  return (
    <div className="glass-panel" style={{ padding: '36px 30px', maxWidth: 800, margin: '40px auto' }}>
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <div style={{
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: 'rgba(99, 102, 241, 0.15)',
          border: '1px solid rgba(99, 102, 241, 0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 16px auto',
          boxShadow: 'var(--shadow-glow)'
        }}>
          <FileCode2 size={28} color="#818cf8" />
        </div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#ffffff', marginBottom: 8 }}>
          {t.loadJsonFile}
        </h2>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', maxWidth: 500, margin: '0 auto' }}>
          {t.loadJsonDesc}
        </p>
      </div>

      {/* Drag & Drop Area */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        style={{
          border: isDragging ? '2px dashed #6366f1' : '2px dashed rgba(255, 255, 255, 0.15)',
          background: isDragging ? 'rgba(99, 102, 241, 0.08)' : 'rgba(15, 23, 42, 0.4)',
          borderRadius: 'var(--radius-lg)',
          padding: '40px 24px',
          textAlign: 'center',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          marginBottom: 20
        }}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".json,application/json"
          style={{ display: 'none' }}
        />
        <UploadCloud size={40} color={isDragging ? '#818cf8' : '#94a3b8'} style={{ margin: '0 auto 12px auto' }} />
        <p style={{ fontSize: '0.95rem', fontWeight: 600, color: '#ffffff', marginBottom: 4 }}>
          {t.dropHere}
        </p>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          Accepts valid requirements.json structure
        </p>
      </div>

      {/* Error alert if validation failed */}
      {errorMessage && (
        <div style={{
          background: 'var(--danger-bg)',
          border: '1px solid var(--danger-border)',
          borderRadius: 'var(--radius-md)',
          padding: '14px 16px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: 12,
          marginBottom: 20
        }}>
          <AlertTriangle size={20} color="#f87171" style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: '#fca5a5', marginBottom: 2 }}>
              {t.invalidJson}
            </h4>
            <p style={{ fontSize: '0.825rem', color: '#fecaca' }}>{errorMessage}</p>
          </div>
        </div>
      )}

      {/* 1-Click Sample Button */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        paddingTop: 16,
        borderTop: '1px solid var(--border-subtle)'
      }}>
        <button
          onClick={handleLoadSample}
          className="btn btn-primary"
          style={{ padding: '10px 22px', fontSize: '0.9rem' }}
        >
          <Sparkles size={16} />
          <span>{t.loadSampleJson}</span>
        </button>
      </div>
    </div>
  );
};
