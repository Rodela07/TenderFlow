import React, { useState } from 'react';
import {
  FileCheck2,
  Download,
  X,
  Sparkles,
  CheckCircle2,
  Stamp,
  BookOpen,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import type {
  TenderConfig,
  UploadedFile,
  DocumentMatch,
  Language,
  GenerationOptions,
} from '../types';
import { translations } from '../locales/i18n';
import { generateTenderPackage, downloadBlob, type GeneratedPackageResult } from '../utils/pdfGenerator';

interface GenerateModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
  config: TenderConfig;
  matches: Record<string, DocumentMatch>;
  files: Record<string, UploadedFile>;
}

export const GenerateModal: React.FC<GenerateModalProps> = ({
  isOpen,
  onClose,
  lang,
  config,
  matches,
  files,
}) => {
  const t = translations[lang];
  const [includeIndex, setIncludeIndex] = useState(true);
  const [stampFile, setStampFile] = useState<File | null>(null);
  const [stampPages, setStampPages] = useState<'cover' | 'all' | 'last'>('cover');
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<GeneratedPackageResult | null>(null);

  if (!isOpen) return null;

  // Calculate included documents list in sorted order
  const includedDocs = [...config.requirements]
    .sort((a, b) => a.order - b.order)
    .filter((req) => matches[req.id]?.fileId && files[matches[req.id].fileId!])
    .map((req) => ({
      req,
      file: files[matches[req.id].fileId!],
    }));

  const handleStampUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setStampFile(e.target.files[0]);
    }
  };

  const handleBuildPackage = async () => {
    setIsGenerating(true);
    try {
      let stampOption: GenerationOptions['stampSignature'] = undefined;
      if (stampFile) {
        const bytes = new Uint8Array(await stampFile.arrayBuffer());
        const isPng = stampFile.type.includes('png') || stampFile.name.toLowerCase().endsWith('.png');
        stampOption = {
          imageBytes: bytes,
          imageType: isPng ? 'png' : 'jpg',
          targetPages: stampPages,
        };
      }

      const packageResult = await generateTenderPackage(config, matches, files, {
        includeIndexPage: includeIndex,
        stampSignature: stampOption,
      });

      setResult(packageResult);

      // Trigger automatic download
      downloadBlob(packageResult.blob, packageResult.filename);

      // Trigger celebration confetti
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch {
        // Ignore confetti if not available
      }
    } catch (err) {
      console.error(err);
      alert('Failed to generate PDF package: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(5, 8, 15, 0.8)',
        backdropFilter: 'blur(8px)',
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: 680,
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '28px 32px',
          position: 'relative',
          border: '1px solid rgba(99, 102, 241, 0.3)',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6)',
        }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 20,
            right: 20,
            background: 'transparent',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
          }}
        >
          <X size={20} />
        </button>

        {result ? (
          /* Success Screen */
          <div style={{ textAlign: 'center', padding: '16px 8px' }}>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                background: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid rgba(16, 185, 129, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px auto',
              }}
            >
              <CheckCircle2 size={36} color="#34d399" />
            </div>

            <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ffffff', marginBottom: 8 }}>
              {t.modalSuccessTitle}
            </h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: 20 }}>
              {t.modalSuccessDesc}
            </p>

            <div
              style={{
                background: 'rgba(255, 255, 255, 0.04)',
                borderRadius: 'var(--radius-md)',
                padding: '16px 20px',
                textAlign: 'left',
                marginBottom: 24,
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: '0.875rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>File Name:</span>
                <strong style={{ color: '#ffffff' }}>{result.filename}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: '0.875rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Total Pages (Y):</span>
                <strong style={{ color: '#34d399' }}>{result.totalPages} pages</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Included Documents:</span>
                <strong style={{ color: '#ffffff' }}>{result.includedDocumentsCount} documents</strong>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button
                onClick={() => downloadBlob(result.blob, result.filename)}
                className="btn btn-primary"
                style={{ padding: '10px 24px', fontSize: '0.9rem' }}
              >
                <Download size={16} />
                <span>{t.downloadAgain}</span>
              </button>
              <button
                onClick={onClose}
                className="btn btn-secondary"
                style={{ padding: '10px 20px', fontSize: '0.9rem' }}
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          /* Package Configuration & Confirmation */
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--accent-gradient)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <FileCheck2 size={24} color="#ffffff" />
              </div>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff' }}>
                  {t.previewSummary}
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  {config.tender.tender_id} • {config.tender.bidder}
                </p>
              </div>
            </div>

            {/* Included Documents List */}
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                borderRadius: 'var(--radius-md)',
                padding: '14px 16px',
                border: '1px solid var(--border-subtle)',
                marginBottom: 18,
                maxHeight: 180,
                overflowY: 'auto',
              }}
            >
              <h4 style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 10, letterSpacing: '0.05em' }}>
                Included Documents ({includedDocs.length})
              </h4>
              {includedDocs.map((item, idx) => (
                <div
                  key={item.req.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '6px 0',
                    borderBottom: idx < includedDocs.length - 1 ? '1px solid rgba(255, 255, 255, 0.04)' : undefined,
                    fontSize: '0.825rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ color: 'var(--text-muted)', fontWeight: 700 }}>#{item.req.order}</span>
                    <span style={{ color: '#ffffff', fontWeight: 600 }}>{item.req.title_en}</span>
                  </div>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                    {item.file.name} ({item.file.pageCount} pgs)
                  </span>
                </div>
              ))}
            </div>

            {/* Options */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 20 }}>
              {/* Dynamic Index Option */}
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  color: '#ffffff',
                }}
              >
                <input
                  type="checkbox"
                  checked={includeIndex}
                  onChange={(e) => setIncludeIndex(e.target.checked)}
                  style={{ width: 18, height: 18, accentColor: '#6366f1', cursor: 'pointer' }}
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <BookOpen size={16} color="#818cf8" />
                  <span>{t.includeIndexOption}</span>
                </div>
              </label>

              {/* PNG Signature/Seal Stamp Option (Bonus) */}
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px 14px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, fontSize: '0.875rem', color: '#ffffff' }}>
                  <Stamp size={16} color="#34d399" />
                  <span>{t.addSealOption}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <input
                    type="file"
                    accept="image/png,image/jpeg"
                    onChange={handleStampUpload}
                    style={{ fontSize: '0.775rem' }}
                  />
                  {stampFile && (
                    <select
                      value={stampPages}
                      onChange={(e) => setStampPages(e.target.value as any)}
                      style={{ width: 140, padding: '4px 8px', fontSize: '0.75rem' }}
                    >
                      <option value="cover">Cover Page Only</option>
                      <option value="all">All Pages</option>
                      <option value="last">Last Page</option>
                    </select>
                  )}
                </div>
              </div>
            </div>

            {/* Official Specifications Notice */}
            <div
              style={{
                background: 'rgba(99, 102, 241, 0.08)',
                border: '1px solid rgba(99, 102, 241, 0.25)',
                borderRadius: 'var(--radius-md)',
                padding: '10px 14px',
                fontSize: '0.775rem',
                color: '#c7d2fe',
                marginBottom: 20,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                <ShieldCheck size={14} color="#818cf8" />
                <strong>Official Formatting Standards:</strong>
              </div>
              <ul style={{ paddingLeft: 18, margin: 0 }}>
                <li>{t.coverPageNotice}</li>
                <li>
                  {t.footerNotice} <code>{config.tender.tender_id} | Page X of Y</code>
                </li>
              </ul>
            </div>

            {/* Build Action */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                onClick={onClose}
                disabled={isGenerating}
                className="btn btn-secondary"
                style={{ padding: '10px 18px', fontSize: '0.875rem' }}
              >
                Cancel
              </button>
              <button
                onClick={handleBuildPackage}
                disabled={isGenerating}
                className="btn btn-primary"
                style={{ padding: '10px 24px', fontSize: '0.9rem', fontWeight: 700 }}
              >
                {isGenerating ? (
                  <>
                    <Sparkles size={16} />
                    <span>{t.generatingPdf}</span>
                  </>
                ) : (
                  <>
                    <FileCheck2 size={16} />
                    <span>Build & Download Dossier</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
