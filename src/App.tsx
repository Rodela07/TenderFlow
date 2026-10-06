import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, FileDown, Sparkles, Upload, FileText } from 'lucide-react';
import type { Tender, Requirement, UploadedFile, Match, ExpiryDate } from './types';
import { useLang } from './i18n/LanguageContext';
import { getPdfPageCount } from './lib/pdfCount';
import { computeFileHash, findDuplicateGroups } from './lib/duplicates';
import { computeAllStatuses } from './lib/status';
import { buildPackage, downloadPdf } from './lib/buildPackage';
import { autoMatch } from './lib/autoMatch';
import { exportChecklistCsv } from './lib/csv';
import { useSpeech } from './hooks/useSpeech';
import Header from './components/Header';
import Footer from './components/Footer';
import TenderCard from './components/TenderCard';
import DropZone from './components/DropZone';
import FileList from './components/FileList';
import RequirementRow from './components/RequirementRow';
import StatBlock from './components/StatBlock';
import GenerateBar from './components/GenerateBar';
import Toast, { type ToastItem } from './components/Toast';

let toastCounter = 0;
function makeToastId() {
  return `toast-${++toastCounter}-${Date.now()}`;
}

function generateFileId() {
  return `file-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export default function App() {
  const { lang, t } = useLang();
  const speech = useSpeech();

  // Core state
  const [tender, setTender] = useState<Tender | null>(null);
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [expiryDates, setExpiryDates] = useState<ExpiryDate[]>([]);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [suggestions, setSuggestions] = useState<Map<string, string>>(new Map());
  const [isLoadingSample, setIsLoadingSample] = useState(false);



  // Derived state
  const duplicateGroups = useMemo(() =>
    findDuplicateGroups(files.map((f) => ({ id: f.id, hash: f.hash }))),
    [files]
  );

  const statuses = useMemo(() => {
    if (!tender || requirements.length === 0) return new Map();
    return computeAllStatuses(requirements, matches, expiryDates, tender.submission_deadline);
  }, [requirements, matches, expiryDates, tender]);

  const readyCount = useMemo(() => {
    let count = 0;
    for (const [, status] of statuses) {
      if (status.type === 'ok') count++;
    }
    return count;
  }, [statuses]);

  const hasBlocking = useMemo(() => {
    for (const [, status] of statuses) {
      if (status.blocks) return true;
    }
    return false;
  }, [statuses]);

  // Toast helpers
  const addToast = useCallback((message: string, type: 'error' | 'success' | 'info' = 'info') => {
    const id = makeToastId();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // JSON loading
  const parseAndLoadJson = useCallback((text: string) => {
    try {
      const data = JSON.parse(text);
      if (!data || typeof data !== 'object') {
        addToast(t('errorInvalidShape'), 'error');
        return;
      }

      const tenderObj = data.tender;
      const reqsArray = data.requirements;

      if (!tenderObj || typeof tenderObj !== 'object' || !Array.isArray(reqsArray)) {
        addToast(t('errorInvalidShape'), 'error');
        return;
      }

      const parsedTender: Tender = {
        tender_id: String(tenderObj.tender_id ?? ''),
        title: String(tenderObj.title ?? ''),
        procuring_entity: String(tenderObj.procuring_entity ?? ''),
        bidder: String(tenderObj.bidder ?? ''),
        submission_deadline: String(tenderObj.submission_deadline ?? ''),
      };

      const parsedReqs: Requirement[] = reqsArray.map((r: Record<string, unknown>) => ({
        id: String(r.id ?? ''),
        order: Number(r.order ?? 0),
        title_en: String(r.title_en ?? ''),
        title_bn: String(r.title_bn ?? r.title_en ?? ''),
        mandatory: Boolean(r.mandatory),
        has_expiry: Boolean(r.has_expiry),
      }));

      // Sort by order (stable), tie-break by id
      parsedReqs.sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));

      setTender(parsedTender);
      setRequirements(parsedReqs);
      setMatches([]);
      setExpiryDates([]);
      setSuggestions(new Map());
      addToast(lang === 'bn' ? 'প্রয়োজনীয়তা সফলভাবে লোড হয়েছে' : 'Requirements loaded successfully', 'success');
    } catch {
      addToast(t('errorInvalidJson'), 'error');
    }
  }, [addToast, t, lang]);

  const handleJsonFiles = useCallback((fileList: File[]) => {
    const file = fileList[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result;
      if (typeof text === 'string') {
        parseAndLoadJson(text);
      }
    };
    reader.onerror = () => {
      addToast(t('errorInvalidJson'), 'error');
    };
    reader.readAsText(file);
  }, [parseAndLoadJson, addToast, t]);

  // File upload pipeline
  const processFiles = useCallback(async (newFiles: File[]) => {
    const MAX_FILES = 30;
    const MAX_SIZE = 50 * 1024 * 1024;

    // Check total count
    if (files.length + newFiles.length > MAX_FILES) {
      addToast(t('errorTooManyFiles'), 'error');
      return;
    }

    // Check total size
    const currentSize = files.reduce((sum, f) => sum + f.size, 0);
    const newSize = newFiles.reduce((sum, f) => sum + f.size, 0);
    if (currentSize + newSize > MAX_SIZE) {
      addToast(t('errorTotalSize'), 'error');
      return;
    }

    const processed: UploadedFile[] = [];
    for (const file of newFiles) {
      // Check MIME + extension
      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
      if (!isPdf) {
        addToast(`"${file.name}" ${t('errorNonPdf')}`, 'error');
        continue;
      }

      try {
        const [pageCount, hash] = await Promise.all([
          getPdfPageCount(file),
          computeFileHash(file),
        ]);

        processed.push({
          id: generateFileId(),
          file,
          name: file.name,
          pageCount,
          hash,
          size: file.size,
        });
      } catch {
        addToast(`"${file.name}" ${t('errorCorruptPdf')}`, 'error');
      }
    }

    if (processed.length > 0) {
      setFiles((prev) => [...prev, ...processed]);
    }
  }, [files, addToast, t]);

  const handlePdfFiles = useCallback((fileList: File[]) => {
    processFiles(fileList);
  }, [processFiles]);

  const removeFile = useCallback((fileId: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== fileId));
    setMatches((prev) => prev.filter((m) => m.fileId !== fileId));
    setSuggestions((prev) => {
      const next = new Map(prev);
      for (const [reqId, fId] of next) {
        if (fId === fileId) next.delete(reqId);
      }
      return next;
    });
  }, []);

  // Matching
  const handleMatch = useCallback((requirementId: string, fileId: string | null) => {
    setMatches((prev) => {
      let next = prev.filter((m) => m.requirementId !== requirementId);
      if (fileId) {
        // Also remove any existing match for this file to other requirements
        next = next.filter((m) => m.fileId !== fileId);
        next.push({ requirementId, fileId });
      }
      return next;
    });
  }, []);

  // Expiry dates
  const handleExpiryChange = useCallback((requirementId: string, date: string) => {
    setExpiryDates((prev) => {
      const next = prev.filter((e) => e.requirementId !== requirementId);
      if (date) {
        next.push({ requirementId, date });
      }
      return next;
    });
  }, []);

  // Auto-match
  const handleAutoMatch = useCallback(() => {
    const lockedFileIds = new Set<string>();
    for (const [, ids] of duplicateGroups) {
      const matchedId = ids.find((id) => matches.some((m) => m.fileId === id));
      if (matchedId) {
        for (const id of ids) {
          if (id !== matchedId) lockedFileIds.add(id);
        }
      }
    }
    const newSuggestions = autoMatch(files, requirements, matches, lockedFileIds);
    setSuggestions(newSuggestions);
  }, [files, requirements, matches, duplicateGroups]);

  const applyAllSuggestions = useCallback(() => {
    setMatches((prev) => {
      let next = [...prev];
      for (const [reqId, fileId] of suggestions) {
        // Remove any existing match for this requirement or file
        next = next.filter((m) => m.requirementId !== reqId && m.fileId !== fileId);
        next.push({ requirementId: reqId, fileId });
      }
      return next;
    });
    setSuggestions(new Map());
  }, [suggestions]);

  // Generate
  const handleGenerate = useCallback(async () => {
    if (!tender || hasBlocking) return;
    setIsGenerating(true);
    try {
      const pdfBytes = await buildPackage(
        tender,
        requirements,
        matches,
        files,
        (errMsg) => addToast(errMsg, 'error')
      );
      if (pdfBytes) {
        downloadPdf(pdfBytes, `${tender.tender_id}_Package.pdf`);
        addToast(lang === 'bn' ? 'প্যাকেজ সফলভাবে তৈরি হয়েছে' : 'Package generated successfully', 'success');
      }
    } catch (err) {
      addToast(t('errorGeneric'), 'error');
    } finally {
      setIsGenerating(false);
    }
  }, [tender, requirements, matches, files, hasBlocking, addToast, t, lang]);

  // CSV export
  const handleExportCsv = useCallback(() => {
    if (!tender) return;
    exportChecklistCsv(requirements, matches, files, expiryDates, statuses, lang);
  }, [requirements, matches, files, expiryDates, statuses, lang, tender]);

  // Load sample pack
  const loadSamplePack = useCallback(async () => {
    setIsLoadingSample(true);
    try {
      // Fetch requirements.json
      const reqRes = await fetch('/sample/requirements.json');
      if (!reqRes.ok) throw new Error('404');
      const reqText = await reqRes.text();
      parseAndLoadJson(reqText);

      // Fetch document files
      const sampleFiles = [
        'financial_proposal.pdf',
        'technical_proposal.pdf',
        'tin_certificate.pdf',
        'vat_certificate.pdf',
        'bank_solvency.pdf',
        'company_logo.png',
        'experience_cert.pdf',
        'experience_cert (1).pdf',
        'scan_0042.pdf',
        'trade_license_2025.pdf',
        'trade_license_2026.pdf',
      ];

      const fileObjects: File[] = [];
      for (const name of sampleFiles) {
        try {
          const res = await fetch(`/sample/documents/${encodeURIComponent(name)}`);
          if (!res.ok) continue;
          const blob = await res.blob();
          const file = new File([blob], name, { type: blob.type });
          fileObjects.push(file);
        } catch {
          // Skip individual file failures
        }
      }

      if (fileObjects.length > 0) {
        await processFiles(fileObjects);
      }
    } catch {
      addToast(t('errorSampleFetch'), 'error');
    } finally {
      setIsLoadingSample(false);
    }
  }, [parseAndLoadJson, processFiles, addToast, t]);

  // Speech helpers
  const speakTender = useCallback(() => {
    if (!tender) return;
    speech.speak(
      `Tender ${tender.tender_id}. ${tender.title}. Procuring entity: ${tender.procuring_entity}. Bidder: ${tender.bidder}. Submission deadline: ${tender.submission_deadline}.`
    );
  }, [tender, speech]);

  const speakRequirements = useCallback(() => {
    const text = requirements.map((r) =>
      `Number ${r.order}, ${r.title_en}, ${r.mandatory ? 'mandatory' : 'optional'}`
    ).join('. ');
    speech.speak(`Requirements: ${text}`);
  }, [requirements, speech]);

  const speakSummary = useCallback(() => {
    const totalReqs = requirements.length;
    const blocking = Array.from(statuses.values()).filter((s) => s.blocks).length;
    speech.speak(
      `${readyCount} of ${totalReqs} documents ready. ${blocking} issues blocking.`
    );
  }, [requirements, statuses, readyCount, speech]);

  // Unmatched files
  const unmatchedFiles = useMemo(() => {
    return files.filter((f) => !matches.some((m) => m.fileId === f.id));
  }, [files, matches]);

  return (
    <div className="min-h-screen flex flex-col">
      <Header
        voiceEnabled={speech.enabled}
        onVoiceToggle={speech.toggle}
        voiceSupported={speech.isSupported}
      />

      <Toast toasts={toasts} onDismiss={dismissToast} />

      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Hero section */}
        {!tender && (
          <motion.section
            className="text-center py-12"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span className="section-label">[ {t('tagline')} ]</span>
            <h1 className="text-3xl sm:text-5xl font-bold mt-3 leading-tight">
              {t('appTitle')}
            </h1>
            <p className="text-muted text-sm sm:text-base mt-3 max-w-lg mx-auto">
              {t('appDescription')}
            </p>
          </motion.section>
        )}

        {/* Step 1: Load JSON */}
        <motion.section
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          {!tender ? (
            <div className="space-y-3">
              <DropZone
                onFiles={handleJsonFiles}
                accept=".json"
                multiple={false}
                id="json-dropzone"
                label={t('loadJson')}
                description={t('loadJsonDesc')}
              />
              <div className="flex justify-center">
                <motion.button
                  className="pill-btn"
                  onClick={loadSamplePack}
                  disabled={isLoadingSample}
                  whileHover={{ y: -2 }}
                  aria-label={t('loadSample')}
                >
                  <Sparkles size={14} />
                  {isLoadingSample
                    ? (lang === 'bn' ? 'লোড হচ্ছে...' : 'Loading...')
                    : t('loadSample')
                  }
                </motion.button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <TenderCard
                  tender={tender}
                  onSpeak={speakTender}
                  voiceEnabled={speech.enabled}
                />
              </div>
              <div className="space-y-4">
                <div className="card flex flex-col items-center justify-center gap-2 h-full">
                  <StatBlock
                    value={readyCount}
                    total={requirements.length}
                    label={t('documentsReady')}
                  />
                  <p className="text-xs text-muted mt-2 text-center">
                    {hasBlocking ? t('hasBlocking') : t('allClear')}
                  </p>
                  {speech.enabled && (
                    <button
                      onClick={speakSummary}
                      className="pill-btn !px-2 !py-1 mt-1"
                      aria-label={t('speakSummary')}
                    >
                      <Volume2 size={14} className="text-accent" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </motion.section>

        {/* After tender is loaded */}
        <AnimatePresence>
          {tender && (
            <>
              {/* Step 2: Upload Files */}
              <motion.section
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4, delay: 0.2 }}
              >
                <div className="card">
                  <div className="flex items-center justify-between mb-4">
                    <span className="section-label">[ {t('uploadedFiles')} ]</span>
                    <span className="text-xs text-muted">
                      {files.length} / 30 {t('documents').toLowerCase()}
                    </span>
                  </div>

                  <DropZone
                    onFiles={handlePdfFiles}
                    accept=".pdf"
                    multiple={true}
                    id="pdf-dropzone"
                    label={t('selectPdfs')}
                    description={t('uploadDesc')}
                  >
                    <div className="flex flex-col items-center gap-2 py-3">
                      <Upload size={24} className="text-muted" />
                      <p className="text-sm font-medium">{t('selectPdfs')}</p>
                      <p className="text-xs text-muted">{t('uploadDesc')}</p>
                    </div>
                  </DropZone>

                  {files.length > 0 && (
                    <div className="mt-4">
                      <FileList
                        files={files}
                        matches={matches}
                        duplicateGroups={duplicateGroups}
                        onRemove={removeFile}
                      />
                    </div>
                  )}
                </div>
              </motion.section>

              {/* Step 3: Requirements + Matching */}
              <motion.section
                className="light-band -mx-4 sm:-mx-6 px-4 sm:px-6 py-8 rounded-none"
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4, delay: 0.3 }}
              >
                <div className="max-w-6xl mx-auto">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                      <span className="section-label text-text-on-light">[ {t('requirements')} ]</span>
                      {speech.enabled && (
                        <button
                          onClick={speakRequirements}
                          className="p-1 rounded-lg hover:bg-[rgba(20,20,20,0.05)] text-muted"
                          aria-label={t('speakRequirements')}
                        >
                          <Volume2 size={14} />
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <motion.button
                        className="pill-btn !bg-white !text-text-on-light !border-[rgba(20,20,20,0.12)]"
                        onClick={handleAutoMatch}
                        whileHover={{ y: -1 }}
                        aria-label={t('autoMatch')}
                      >
                        <Sparkles size={14} />
                        {t('autoMatch')}
                      </motion.button>
                      {suggestions.size > 0 && (
                        <motion.button
                          className="pill-btn !bg-[#C9AEB4] !text-[#141414] !border-[#C9AEB4]"
                          onClick={applyAllSuggestions}
                          whileHover={{ y: -1 }}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          aria-label={t('applySuggestions')}
                        >
                          {t('applySuggestions')} ({suggestions.size})
                        </motion.button>
                      )}
                      <motion.button
                        className="pill-btn !bg-white !text-text-on-light !border-[rgba(20,20,20,0.12)]"
                        onClick={handleExportCsv}
                        whileHover={{ y: -1 }}
                        aria-label={t('exportCsv')}
                      >
                        <FileDown size={14} />
                        {t('exportCsv')}
                      </motion.button>
                    </div>
                  </div>

                  <div className="divide-y divide-[rgba(20,20,20,0.08)]">
                    {requirements.map((req, i) => {
                      const status = statuses.get(req.id) ?? { type: 'missing' as const, blocks: true };
                      return (
                        <RequirementRow
                          key={req.id}
                          requirement={req}
                          index={i}
                          files={files}
                          matches={matches}
                          expiryDates={expiryDates}
                          status={status}
                          duplicateGroups={duplicateGroups}
                          onMatch={handleMatch}
                          onExpiryChange={handleExpiryChange}
                          suggestion={suggestions.get(req.id)}
                        />
                      );
                    })}
                  </div>
                </div>
              </motion.section>

              {/* Unmatched files */}
              {unmatchedFiles.length > 0 && (
                <motion.section
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.35 }}
                >
                  <div className="card">
                    <div className="flex items-center gap-2 mb-3">
                      <FileText size={16} className="text-muted" />
                      <span className="section-label">[ {t('unmatchedFiles')} ]</span>
                      <span className="text-xs text-muted">({unmatchedFiles.length})</span>
                    </div>
                    <div className="space-y-1.5">
                      {unmatchedFiles.map((f) => (
                        <div key={f.id} className="flex items-center gap-2 text-xs text-muted">
                          <FileText size={12} />
                          <span className="truncate">{f.name}</span>
                          <span>({f.pageCount} {f.pageCount === 1 ? t('page') : t('pages')})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.section>
              )}

              {/* Generate */}
              <motion.section
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.4 }}
              >
                <div className="card max-w-md mx-auto">
                  <span className="section-label block text-center mb-4">
                    [ {lang === 'bn' ? 'প্যাকেজ তৈরি' : 'GENERATE PACKAGE'} ]
                  </span>
                  <GenerateBar
                    requirements={requirements}
                    statuses={statuses}
                    onGenerate={handleGenerate}
                    isGenerating={isGenerating}
                    lang={lang}
                  />
                </div>
              </motion.section>
            </>
          )}
        </AnimatePresence>
      </main>

      <Footer />
    </div>
  );
}
