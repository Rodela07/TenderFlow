import React, { useState, useRef } from 'react';
import {
  Upload,
  FileText,
  Trash2,
  AlertTriangle,
  Copy,
  CheckCircle2,
  Sparkles,
  Lock,
  Layers,
  HardDrive,
} from 'lucide-react';
import type { UploadedFile, Language, TenderRequirement } from '../types';
import { translations } from '../locales/i18n';
import {
  computeSha256,
  parsePdfInfo,
  updateDuplicateFlags,
  formatBytes,
} from '../utils/tenderEngine';
import { createTestPdfFile } from '../utils/sampleData';

interface FileUploadSectionProps {
  lang: Language;
  files: UploadedFile[];
  onFilesUpdated: (files: UploadedFile[]) => void;
  requirements: TenderRequirement[];
  matches: Record<string, { requirementId: string; fileId: string | null }>;
}

const MAX_FILES = 30;
const MAX_TOTAL_BYTES = 50 * 1024 * 1024; // 50 MB

export const FileUploadSection: React.FC<FileUploadSectionProps> = ({
  lang,
  files,
  onFilesUpdated,
  requirements,
  matches,
}) => {
  const t = translations[lang];
  const [isDragging, setIsDragging] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentTotalSize = files.reduce((sum, f) => sum + f.size, 0);

  const handleProcessFiles = async (newFileList: File[]) => {
    setErrorMessage(null);

    // 1. Filter out non-PDF files
    const validPdfFiles: File[] = [];
    const nonPdfNames: string[] = [];

    for (const f of newFileList) {
      if (f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')) {
        validPdfFiles.push(f);
      } else {
        nonPdfNames.push(f.name);
      }
    }

    if (nonPdfNames.length > 0) {
      setErrorMessage(
        `${t.rejectNonPdf} (${nonPdfNames.slice(0, 3).join(', ')}${nonPdfNames.length > 3 ? '...' : ''})`
      );
    }

    if (validPdfFiles.length === 0) return;

    // 2. Check 30-file count limit
    if (files.length + validPdfFiles.length > MAX_FILES) {
      setErrorMessage(
        `${t.rejectLimitFiles} Current: ${files.length}, attempting to add: ${validPdfFiles.length}. Total cannot exceed ${MAX_FILES}.`
      );
      return;
    }

    // 3. Check 50 MB total size limit
    const incomingSize = validPdfFiles.reduce((sum, f) => sum + f.size, 0);
    if (currentTotalSize + incomingSize > MAX_TOTAL_BYTES) {
      setErrorMessage(
        `${t.rejectLimitSize} Current: ${formatBytes(currentTotalSize)}, incoming: ${formatBytes(incomingSize)}. Max allowed: 50 MB.`
      );
      return;
    }

    setIsProcessing(true);

    try {
      const processedList: UploadedFile[] = [];

      for (const file of validPdfFiles) {
        const id = `file_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        const sha256 = await computeSha256(file);
        const pdfInfo = await parsePdfInfo(file);

        processedList.push({
          id,
          file,
          name: file.name,
          size: file.size,
          pageCount: pdfInfo.pageCount,
          sha256,
          error: pdfInfo.error,
          isDamagedOrEncrypted: pdfInfo.isDamagedOrEncrypted,
        });
      }

      const combined = [...files, ...processedList];
      const withDuplicates = updateDuplicateFlags(combined);
      onFilesUpdated(withDuplicates);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Error processing uploaded PDF files.'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleProcessFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFilePickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleProcessFiles(Array.from(e.target.files));
      e.target.value = '';
    }
  };

  const handleRemoveFile = (idToRemove: string) => {
    const updated = files.filter((f) => f.id !== idToRemove);
    const withDuplicates = updateDuplicateFlags(updated);
    onFilesUpdated(withDuplicates);
  };

  const handleClearAll = () => {
    onFilesUpdated([]);
  };

  const handleGenerateTestPdfs = async () => {
    setIsProcessing(true);
    setErrorMessage(null);
    try {
      const generated: File[] = [];

      // Create synthetic test PDFs matching the requirements list
      const samplesToCreate = requirements.slice(0, 8);
      for (let i = 0; i < samplesToCreate.length; i++) {
        const req = samplesToCreate[i];
        const pages = i === 0 ? 2 : i === 1 ? 1 : i === 3 ? 3 : 2;
        const fname = `${req.title_en.toLowerCase().replace(/[^a-z0-9]/g, '_')}_signed.pdf`;
        const testFile = await createTestPdfFile(req.title_en, pages, fname);
        generated.push(testFile);
      }

      await handleProcessFiles(generated);
    } catch {
      setErrorMessage('Failed to generate test PDFs.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="glass-panel" style={{ padding: '24px 28px', marginBottom: 24 }}>
      {/* Title and stats bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 16,
        marginBottom: 20
      }}>
        <div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#ffffff', marginBottom: 4 }}>
            {t.fileUploadTitle}
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            {t.fileUploadDesc}
          </p>
        </div>

        {/* Capacity Metrics */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{
            background: 'rgba(255, 255, 255, 0.04)',
            padding: '6px 12px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
            fontSize: '0.8rem',
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}>
            <Layers size={14} color="#60a5fa" />
            <span style={{ color: 'var(--text-secondary)' }}>{t.uploadStats}:</span>
            <strong style={{ color: files.length >= MAX_FILES ? '#f87171' : '#ffffff' }}>
              {files.length} / {MAX_FILES}
            </strong>
          </div>

          <div style={{
            background: 'rgba(255, 255, 255, 0.04)',
            padding: '6px 12px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
            fontSize: '0.8rem',
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}>
            <HardDrive size={14} color="#34d399" />
            <span style={{ color: 'var(--text-secondary)' }}>{t.totalSize}:</span>
            <strong style={{ color: currentTotalSize > MAX_TOTAL_BYTES ? '#f87171' : '#ffffff' }}>
              {formatBytes(currentTotalSize)} / 50 MB
            </strong>
          </div>
        </div>
      </div>

      {/* Drag and Drop Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        style={{
          border: isDragging ? '2px dashed #3b82f6' : '2px dashed rgba(255, 255, 255, 0.12)',
          background: isDragging ? 'rgba(59, 130, 246, 0.08)' : 'rgba(15, 23, 42, 0.4)',
          borderRadius: 'var(--radius-lg)',
          padding: '30px 20px',
          textAlign: 'center',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          marginBottom: 16
        }}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFilePickerChange}
          multiple
          accept=".pdf,application/pdf"
          style={{ display: 'none' }}
        />
        <Upload size={36} color={isDragging ? '#60a5fa' : '#94a3b8'} style={{ margin: '0 auto 10px auto' }} />
        <p style={{ fontSize: '0.95rem', fontWeight: 600, color: '#ffffff', marginBottom: 4 }}>
          {isProcessing ? 'Processing PDF files...' : t.dropHere}
        </p>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          Click or drop multiple PDF files. Automatic page counting & duplicate detection.
        </p>
      </div>

      {/* Action Buttons: 1-Click Test PDFs Generator & Clear */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
        <button
          onClick={handleGenerateTestPdfs}
          disabled={isProcessing}
          className="btn btn-secondary"
          style={{ fontSize: '0.8rem', borderColor: 'rgba(52, 211, 153, 0.3)', background: 'rgba(52, 211, 153, 0.08)' }}
        >
          <Sparkles size={14} color="#34d399" />
          <span style={{ color: '#a7f3d0' }}>{t.generateTestPdfs}</span>
        </button>

        {files.length > 0 && (
          <button
            onClick={handleClearAll}
            className="btn btn-danger"
            style={{ fontSize: '0.78rem', padding: '5px 12px' }}
          >
            <Trash2 size={13} />
            <span>{t.clearAllFiles}</span>
          </button>
        )}
      </div>

      {/* Error / Alert notice */}
      {errorMessage && (
        <div style={{
          background: 'var(--danger-bg)',
          border: '1px solid var(--danger-border)',
          borderRadius: 'var(--radius-md)',
          padding: '12px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginBottom: 16
        }}>
          <AlertTriangle size={18} color="#f87171" style={{ flexShrink: 0 }} />
          <span style={{ fontSize: '0.825rem', color: '#fecaca' }}>{errorMessage}</span>
        </div>
      )}

      {/* Uploaded File List / Cards */}
      {files.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: 12,
          marginTop: 12
        }}>
          {files.map((file) => {
            // Check which requirement matches this file
            const matchedReqId = Object.keys(matches).find((rId) => matches[rId]?.fileId === file.id);
            const matchedReq = matchedReqId ? requirements.find((r) => r.id === matchedReqId) : undefined;

            return (
              <div
                key={file.id}
                style={{
                  background: file.error
                    ? 'rgba(239, 68, 68, 0.08)'
                    : file.isDuplicate
                    ? 'rgba(245, 158, 11, 0.08)'
                    : 'rgba(15, 23, 42, 0.65)',
                  border: file.error
                    ? '1px solid var(--danger-border)'
                    : file.isDuplicate
                    ? '1px solid var(--warning-border)'
                    : '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                    {file.error ? (
                      <Lock size={16} color="#f87171" style={{ flexShrink: 0 }} />
                    ) : (
                      <FileText size={16} color="#60a5fa" style={{ flexShrink: 0 }} />
                    )}
                    <span
                      title={file.name}
                      style={{
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        color: '#ffffff',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {file.name}
                    </span>
                  </div>

                  <button
                    onClick={() => handleRemoveFile(file.id)}
                    className="btn btn-secondary"
                    style={{ padding: '4px 8px', fontSize: '0.75rem', height: 26 }}
                    title={t.removeFile}
                  >
                    <Trash2 size={13} color="#94a3b8" />
                  </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  <span>{formatBytes(file.size)}</span>
                  <span>•</span>
                  {file.error ? (
                    <span style={{ color: '#f87171', fontWeight: 600 }}>{t.damagedWarning}</span>
                  ) : (
                    <span>
                      <strong style={{ color: '#ffffff' }}>{file.pageCount}</strong> {t.pagesCount}
                    </span>
                  )}
                </div>

                {/* Duplicate alert if exact duplicate binary hash */}
                {file.isDuplicate && (
                  <div style={{
                    background: 'rgba(245, 158, 11, 0.15)',
                    padding: '4px 8px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.725rem',
                    color: '#fbbf24',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}>
                    <Copy size={12} />
                    <span>
                      {t.duplicateWarning} (Hash match: {file.duplicateNames?.join(', ')})
                    </span>
                  </div>
                )}

                {/* Matched Requirement Badge */}
                <div style={{ fontSize: '0.75rem', marginTop: 2 }}>
                  {matchedReq ? (
                    <span className="badge badge-ok" style={{ fontSize: '0.7rem' }}>
                      <CheckCircle2 size={11} /> Matched: #{matchedReq.order} {matchedReq.title_en}
                    </span>
                  ) : (
                    <span style={{ color: 'var(--text-muted)' }}>Unmatched</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
