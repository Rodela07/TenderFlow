import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, FileDown, Sparkles, Upload, FileText, CheckCircle2, ShieldCheck, Layers, FileCheck, RefreshCw, Zap } from 'lucide-react';
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
      addToast(lang === 'bn' ? `${processed.length}টি ফাইল যুক্ত করা হয়েছে` : `${processed.length} file(s) added`, 'info');
    }
  }, [files, addToast, t, lang]);

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
    if (newSuggestions.size > 0) {
      addToast(lang === 'bn' ? `${newSuggestions.size}টি নথির প্রস্তাবনা পাওয়া গেছে` : `${newSuggestions.size} auto-match suggestions found`, 'info');
    } else {
      addToast(lang === 'bn' ? 'কোনো নতুন ম্যাচ পাওয়া যায়নি' : 'No new match suggestions found', 'info');
    }
  }, [files, requirements, matches, duplicateGroups, addToast, lang]);

  const applyAllSuggestions = useCallback(() => {
    setMatches((prev) => {
      let next = [...prev];
      for (const [reqId, fileId] of suggestions) {
        next = next.filter((m) => m.requirementId !== reqId && m.fileId !== fileId);
        next.push({ requirementId: reqId, fileId });
      }
      return next;
    });
    setSuggestions(new Map());
    addToast(lang === 'bn' ? 'প্রস্তাবিত ম্যাচগুলি প্রয়োগ করা হয়েছে' : 'Applied all suggestions', 'success');
  }, [suggestions, addToast, lang]);

  // Reset / Clear
  const handleReset = useCallback(() => {
    setTender(null);
    setRequirements([]);
    setFiles([]);
    setMatches([]);
    setExpiryDates([]);
    setSuggestions(new Map());
  }, []);

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
    } catch {
      addToast(t('errorGeneric'), 'error');
    } finally {
      setIsGenerating(false);
    }
  }, [tender, requirements, matches, files, hasBlocking, addToast, t, lang]);

  // CSV export
  const handleExportCsv = useCallback(() => {
    if (!tender) return;
    exportChecklistCsv(requirements, matches, files, expiryDates, statuses, lang);
    addToast(lang === 'bn' ? 'CSV চেকলিস্ট ডাউনলোড করা হয়েছে' : 'Exported checklist CSV', 'success');
  }, [requirements, matches, files, expiryDates, statuses, lang, tender, addToast]);

  // Load sample pack
  const loadSamplePack = useCallback(async () => {
    setIsLoadingSample(true);
    try {
      const reqRes = await fetch('/sample/requirements.json');
      if (!reqRes.ok) throw new Error('404');
      const reqText = await reqRes.text();
      parseAndLoadJson(reqText);

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
          // Ignore individual fetch fails
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
    <div className="min-h-screen flex flex-col selection:bg-[#FF385C]/30 selection:text-white">
      <Header
        voiceEnabled={speech.enabled}
        onVoiceToggle={speech.toggle}
        voiceSupported={speech.isSupported}
      />

      <Toast toasts={toasts} onDismiss={dismissToast} />

      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-8">
        {/* Hero section */}
        {!tender && (
          <motion.section
            className="text-center py-8 sm:py-14 relative"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {/* Glowing Pill Tag */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.03] border border-[#FF385C]/30 shadow-[0_0_20px_rgba(255,56,92,0.15)] mb-5">
              <Sparkles size={14} className="text-[#FF385C] animate-pulse" />
              <span className="text-xs font-semibold tracking-wide text-slate-200">
                AI DevFest 2026 &bull; {t('tagline')}
              </span>
            </div>

            <h1 className="text-3xl sm:text-6xl font-extrabold tracking-tight text-white max-w-3xl mx-auto leading-tight sm:leading-[1.15]">
              Package Tender PDFs with <span className="bg-gradient-to-r from-[#FF385C] via-[#FF5E7E] to-[#FFA07A] bg-clip-text text-transparent">Zero Friction</span>
            </h1>

            <p className="text-slate-400 text-sm sm:text-lg mt-4 max-w-2xl mx-auto font-normal">
              {t('appDescription')}
            </p>

            {/* Feature Highlights Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-4xl mx-auto mt-8 text-left">
              <div className="p-3.5 rounded-xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm">
                <ShieldCheck size={18} className="text-[#10B981] mb-1.5" />
                <p className="text-xs font-semibold text-white">100% Private</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Local browser engine</p>
              </div>
              <div className="p-3.5 rounded-xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm">
                <Zap size={18} className="text-[#FF385C] mb-1.5" />
                <p className="text-xs font-semibold text-white">SHA-256 Duplicate Lock</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Exact byte twin detection</p>
              </div>
              <div className="p-3.5 rounded-xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm">
                <FileCheck size={18} className="text-amber-400 mb-1.5" />
                <p className="text-xs font-semibold text-white">Expiry Defense</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Strict deadline checks</p>
              </div>
              <div className="p-3.5 rounded-xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm">
                <Layers size={18} className="text-sky-400 mb-1.5" />
                <p className="text-xs font-semibold text-white">Cover & Index</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Dynamic running pages</p>
              </div>
            </div>
          </motion.section>
        )}

        {/* Step 1: Load JSON */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          {!tender ? (
            <div className="space-y-4 max-w-2xl mx-auto">
              <DropZone
                onFiles={handleJsonFiles}
                accept=".json"
                multiple={false}
                id="json-dropzone"
                label={t('loadJson')}
                description={t('loadJsonDesc')}
              />
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <motion.button
                  className="pill-btn pill-btn-accent !py-2.5 !px-5 w-full sm:w-auto justify-center"
                  onClick={loadSamplePack}
                  disabled={isLoadingSample}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  aria-label={t('loadSample')}
                >
                  <Sparkles size={15} />
                  <span>
                    {isLoadingSample
                      ? (lang === 'bn' ? 'ডেমো ডেটা লোড হচ্ছে...' : 'Loading Sample Pack...')
                      : (lang === 'bn' ? 'ডেমো টেন্ডার প্যাক লোড করুন' : 'Load Complete Sample Pack')
                    }
                  </span>
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
              <div className="card flex flex-col items-center justify-center p-6 relative overflow-hidden">
                <div className="absolute -top-10 -right-10 w-36 h-36 bg-[#FF385C]/10 rounded-full blur-2xl pointer-events-none" />
                <StatBlock
                  value={readyCount}
                  total={requirements.length}
                  label={t('documentsReady')}
                />
                <div className="mt-2 text-center">
                  <p className={`text-xs font-semibold ${hasBlocking ? 'text-[#FF85A1]' : 'text-[#34D399]'}`}>
                    {hasBlocking ? t('hasBlocking') : t('allClear')}
                  </p>
                  <div className="flex items-center justify-center gap-2 mt-3">
                    {speech.enabled && (
                      <button
                        onClick={speakSummary}
                        className="pill-btn !px-3 !py-1 text-xs"
                        aria-label={t('speakSummary')}
                      >
                        <Volume2 size={13} className="text-[#FF385C]" />
                        <span>Listen</span>
                      </button>
                    )}
                    <button
                      onClick={handleReset}
                      className="pill-btn !px-3 !py-1 text-xs hover:border-white/30"
                      title="Reset Tender"
                    >
                      <RefreshCw size={13} />
                      <span>{lang === 'bn' ? 'রিসেট' : 'Change Tender'}</span>
                    </button>
                  </div>
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
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.35 }}
              >
                <div className="card">
                  <div className="flex items-center justify-between mb-4 border-b border-white/[0.06] pb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#FF385C] shadow-[0_0_8px_#FF385C]" />
                      <span className="section-label">{t('uploadedFiles')}</span>
                    </div>
                    <span className="text-xs font-mono text-slate-400">
                      {files.length} / 30 files &bull; {(files.reduce((acc, f) => acc + f.size, 0) / (1024 * 1024)).toFixed(1)} / 50 MB
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
                      <Upload size={24} className="text-[#FF385C]" />
                      <p className="text-sm font-semibold text-white">{t('selectPdfs')}</p>
                      <p className="text-xs text-slate-400">{t('uploadDesc')}</p>
                    </div>
                  </DropZone>

                  {files.length > 0 && (
                    <div className="mt-5">
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
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.35 }}
              >
                <div className="card">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 border-b border-white/[0.06] pb-3.5">
                    <div className="flex items-center gap-2.5">
                      <span className="w-2 h-2 rounded-full bg-[#FF385C] shadow-[0_0_8px_#FF385C]" />
                      <span className="section-label">{t('matching')}</span>
                      {speech.enabled && (
                        <button
                          onClick={speakRequirements}
                          className="p-1 rounded-lg hover:bg-white/[0.08] text-slate-400 hover:text-white"
                          aria-label={t('speakRequirements')}
                        >
                          <Volume2 size={14} className="text-[#FF385C]" />
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <motion.button
                        className="pill-btn text-xs hover:border-[#FF385C]"
                        onClick={handleAutoMatch}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        aria-label={t('autoMatch')}
                      >
                        <Sparkles size={13} className="text-[#FF385C]" />
                        <span>{t('autoMatch')}</span>
                      </motion.button>

                      {suggestions.size > 0 && (
                        <motion.button
                          className="pill-btn pill-btn-accent text-xs !py-1.5"
                          onClick={applyAllSuggestions}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          aria-label={t('applySuggestions')}
                        >
                          <CheckCircle2 size={13} />
                          <span>{t('applySuggestions')} ({suggestions.size})</span>
                        </motion.button>
                      )}

                      <motion.button
                        className="pill-btn text-xs hover:border-white/30"
                        onClick={handleExportCsv}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        aria-label={t('exportCsv')}
                      >
                        <FileDown size={13} />
                        <span>{t('exportCsv')}</span>
                      </motion.button>
                    </div>
                  </div>

                  <div className="space-y-2.5">
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
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="card !p-4 bg-white/[0.015]">
                    <div className="flex items-center gap-2 mb-2.5">
                      <FileText size={15} className="text-slate-400" />
                      <span className="section-label">{t('unmatchedFiles')}</span>
                      <span className="text-xs font-mono text-slate-400">({unmatchedFiles.length})</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                      {unmatchedFiles.map((f) => (
                        <div key={f.id} className="flex items-center gap-2 p-2 rounded-lg bg-black/20 border border-white/[0.04] text-xs text-slate-300">
                          <FileText size={13} className="text-slate-500 shrink-0" />
                          <span className="truncate font-medium flex-1">{f.name}</span>
                          <span className="text-[10px] text-slate-500 shrink-0">({f.pageCount}p)</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.section>
              )}

              {/* Generate Section */}
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35 }}
              >
                <div className="card max-w-lg mx-auto !p-6 border-[#FF385C]/20 shadow-[0_0_40px_rgba(255,56,92,0.1)]">
                  <div className="text-center mb-4">
                    <span className="section-label block">
                      {lang === 'bn' ? 'প্যাকেজ তৈরি ও ডাউনলোড' : 'FINAL PACKAGE COMPILATION'}
                    </span>
                    <p className="text-xs text-slate-400 mt-1">
                      {lang === 'bn'
                        ? 'কভার পেজ, সূচিপত্র ও সঠিক ক্রমে পৃষ্ঠা নম্বর সহ সম্পূর্ণ PDF তৈরি করুন'
                        : 'Compiles cover, dynamic index, sorted documents & verified running footers'}
                    </p>
                  </div>

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
