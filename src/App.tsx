import { useState, useMemo, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { FileDown, Sparkles, Upload, FileText, CheckCircle2, ShieldCheck, Layers, FileCheck, RefreshCw, Zap, Check, AlertTriangle, FileCode2 } from 'lucide-react';
import type { Tender, Requirement, UploadedFile, Match, ExpiryDate } from './types';
import { useLang } from './i18n/LanguageContext';
import { getPdfPageCount } from './lib/pdfCount';
import { computeFileHash, findDuplicateGroups } from './lib/duplicates';
import { computeAllStatuses } from './lib/status';
import { buildPackage, downloadPdf } from './lib/buildPackage';
import { autoMatch } from './lib/autoMatch';
import { exportChecklistCsv } from './lib/csv';
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
  const hiddenJsonInputRef = useRef<HTMLInputElement>(null);

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

    if (files.length + newFiles.length > MAX_FILES) {
      addToast(t('errorTooManyFiles'), 'error');
      return;
    }

    const currentSize = files.reduce((sum, f) => sum + f.size, 0);
    const newSize = newFiles.reduce((sum, f) => sum + f.size, 0);
    if (currentSize + newSize > MAX_SIZE) {
      addToast(t('errorTotalSize'), 'error');
      return;
    }

    const processed: UploadedFile[] = [];
    for (const file of newFiles) {
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
          // Ignore
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

  // Unmatched files
  const unmatchedFiles = useMemo(() => {
    return files.filter((f) => !matches.some((m) => m.fileId === f.id));
  }, [files, matches]);

  return (
    <div className="w-full min-h-screen flex flex-col selection:bg-[#FF385C]/30 selection:text-white">
      <Header />

      <Toast toasts={toasts} onDismiss={dismissToast} />

      {/* Hidden file input triggered by header or hero button */}
      <input
        ref={hiddenJsonInputRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={(e) => {
          const selected = Array.from(e.target.files ?? []);
          if (selected.length > 0) handleJsonFiles(selected);
          if (hiddenJsonInputRef.current) hiddenJsonInputRef.current.value = '';
        }}
      />

      <main className="flex-1 w-full py-8 sm:py-14">
        {/* Landing View (When No Tender Loaded) */}
        {!tender ? (
          <div className="app-container space-y-16">
            {/* 1. TWO-COLUMN HERO GRID (Desktop >= 1024px) */}
            <div className="hero-grid">
              {/* Left Column: Hero Copy & Actions */}
              <div className="space-y-6">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-[#FF385C]/30 shadow-[0_0_20px_rgba(255,56,92,0.15)]">
                  <Sparkles size={14} className="text-[#FF385C] animate-pulse" />
                  <span className="text-xs font-semibold tracking-wider text-slate-200 uppercase">
                    AI DevFest 2026 &bull; {t('tagline')}
                  </span>
                </div>

                <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-[1.12]">
                  Package Tender PDFs with{' '}
                  <span className="bg-gradient-to-r from-[#FF385C] via-[#FF5E7E] to-[#FFA07A] bg-clip-text text-transparent">
                    Zero Friction
                  </span>
                </h1>

                <p className="text-slate-400 text-base sm:text-lg leading-relaxed max-w-xl">
                  {t('appDescription')}
                </p>

                {/* Primary Hero Actions */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 pt-2">
                  <motion.button
                    className="pill-btn pill-btn-accent !py-3.5 !px-7 text-sm font-bold justify-center shadow-[0_0_25px_rgba(255,56,92,0.35)]"
                    onClick={() => hiddenJsonInputRef.current?.click()}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    aria-label={t('loadJson')}
                  >
                    <Upload size={16} />
                    <span>{t('loadJson')}</span>
                  </motion.button>

                  <motion.button
                    className="pill-btn !py-3.5 !px-6 text-sm font-semibold justify-center border-white/20 hover:border-white/50"
                    onClick={loadSamplePack}
                    disabled={isLoadingSample}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    aria-label={t('loadSample')}
                  >
                    <Sparkles size={16} className="text-[#FF385C]" />
                    <span>
                      {isLoadingSample
                        ? (lang === 'bn' ? 'লোড হচ্ছে...' : 'Loading...')
                        : t('loadSample')
                      }
                    </span>
                  </motion.button>
                </div>
              </div>

              {/* Right Column: Workflow Product Panel */}
              <div className="card !p-6 sm:!p-8 relative overflow-hidden border-[#FF385C]/25 shadow-[0_0_50px_rgba(255,56,92,0.12)]">
                <div className="absolute -top-16 -right-16 w-48 h-48 bg-[#FF385C]/15 rounded-full blur-3xl pointer-events-none" />

                <div className="flex items-center justify-between border-b border-white/[0.08] pb-4 mb-5">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#FF385C] shadow-[0_0_10px_#FF385C]" />
                    <span className="section-label">{t('workflowPreviewTitle')}</span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400">T-2026-0417</span>
                </div>

                <div className="space-y-3.5">
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                    <div className="w-7 h-7 rounded-lg bg-[#10B981]/20 text-[#34D399] flex items-center justify-center shrink-0">
                      <Check size={15} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-white">Trade License (2026)</p>
                      <p className="text-[10px] text-slate-400">Order 01 &bull; Verified Valid</p>
                    </div>
                    <span className="status-badge status-ok text-[10px] !py-0.5 !px-2">OK</span>
                  </div>

                  <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                    <div className="w-7 h-7 rounded-lg bg-[#10B981]/20 text-[#34D399] flex items-center justify-center shrink-0">
                      <Check size={15} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-white">TIN Certificate</p>
                      <p className="text-[10px] text-slate-400">Order 02 &bull; Matched</p>
                    </div>
                    <span className="status-badge status-ok text-[10px] !py-0.5 !px-2">OK</span>
                  </div>

                  <div className="flex items-center gap-3 p-3 rounded-xl bg-[#FF385C]/[0.03] border border-[#FF385C]/20">
                    <div className="w-7 h-7 rounded-lg bg-[#FF385C]/20 text-[#FF85A1] flex items-center justify-center shrink-0">
                      <AlertTriangle size={15} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-white">Experience Certificate</p>
                      <p className="text-[10px] text-slate-400">Order 06 &bull; Duplicate twin detected</p>
                    </div>
                    <span className="status-badge status-missing text-[10px] !py-0.5 !px-2">LOCKED</span>
                  </div>

                  <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                    <div className="w-7 h-7 rounded-lg bg-[#10B981]/20 text-[#34D399] flex items-center justify-center shrink-0">
                      <Check size={15} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-white">Bank Solvency</p>
                      <p className="text-[10px] text-slate-400">Order 05 &bull; Matched</p>
                    </div>
                    <span className="status-badge status-ok text-[10px] !py-0.5 !px-2">OK</span>
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-white/[0.08] flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3 font-mono text-slate-300">
                    <span>8 Documents</span>
                    <span>&bull;</span>
                    <span>14 Pages Total</span>
                  </div>
                  <span className="text-[#34D399] font-semibold flex items-center gap-1">
                    <CheckCircle2 size={13} />
                    Auto-Ordered PDF
                  </span>
                </div>
              </div>
            </div>

            {/* 2. FULL-WIDTH FEATURE STRIP (Spanning all desktop columns) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
              <div className="card !p-5 border-white/[0.06] bg-white/[0.015] hover:border-[#10B981]/40 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-[#10B981]/15 flex items-center justify-center text-[#10B981] mb-3">
                  <ShieldCheck size={20} />
                </div>
                <h4 className="text-sm font-bold text-white">{t('privateTitle')}</h4>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  {t('privateDesc')}
                </p>
              </div>

              <div className="card !p-5 border-white/[0.06] bg-white/[0.015] hover:border-[#FF385C]/40 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-[#FF385C]/15 flex items-center justify-center text-[#FF385C] mb-3">
                  <Zap size={20} />
                </div>
                <h4 className="text-sm font-bold text-white">{t('sha256Title')}</h4>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  {t('sha256Desc')}
                </p>
              </div>

              <div className="card !p-5 border-white/[0.06] bg-white/[0.015] hover:border-amber-500/40 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center text-amber-400 mb-3">
                  <FileCheck size={20} />
                </div>
                <h4 className="text-sm font-bold text-white">{t('expiryTitle')}</h4>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  {t('expiryDesc')}
                </p>
              </div>

              <div className="card !p-5 border-white/[0.06] bg-white/[0.015] hover:border-sky-500/40 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-sky-500/15 flex items-center justify-center text-sky-400 mb-3">
                  <Layers size={20} />
                </div>
                <h4 className="text-sm font-bold text-white">{t('coverTitle')}</h4>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  {t('coverDesc')}
                </p>
              </div>
            </div>

            {/* 3. LARGE FULL-WIDTH UPLOAD REQUIREMENTS SECTION */}
            <div className="card !p-8 sm:!p-12 text-center space-y-6 w-full">
              <div className="space-y-2">
                <span className="section-label text-xs">{t('dropJsonTitle')}</span>
                <h3 className="text-2xl sm:text-3xl font-extrabold text-white">
                  {t('loadJson')}
                </h3>
                <p className="text-sm text-slate-400 max-w-xl mx-auto">
                  {t('loadJsonDesc')}
                </p>
              </div>

              <DropZone
                onFiles={handleJsonFiles}
                accept=".json"
                multiple={false}
                id="json-dropzone-large"
                label={t('loadJson')}
                description={t('dropJsonHint')}
              >
                <div className="flex flex-col items-center gap-3 py-6">
                  <div className="w-16 h-16 rounded-2xl bg-[#FF385C]/15 border border-[#FF385C]/30 flex items-center justify-center text-[#FF385C] shadow-[0_0_20px_rgba(255,56,92,0.2)]">
                    <FileCode2 size={32} />
                  </div>
                  <div>
                    <p className="text-base font-bold text-white">{t('dropJsonHint')}</p>
                    <p className="text-xs text-slate-400 mt-1">{t('jsonPrivateLocal')}</p>
                  </div>
                </div>
              </DropZone>

              <div className="pt-2">
                <motion.button
                  className="pill-btn pill-btn-accent !py-3 !px-8 text-sm font-bold shadow-[0_0_25px_rgba(255,56,92,0.35)]"
                  onClick={loadSamplePack}
                  disabled={isLoadingSample}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  aria-label={t('loadSample')}
                >
                  <Sparkles size={16} />
                  <span>
                    {isLoadingSample
                      ? (lang === 'bn' ? 'ডেমো ডেটা লোড হচ্ছে...' : 'Loading Sample Pack...')
                      : t('loadSample')
                    }
                  </span>
                </motion.button>
              </div>
            </div>

            {/* 4. HOW TENDERFLOW WORKS */}
            <div className="space-y-8 pt-4 w-full">
              <div className="text-center space-y-2">
                <span className="section-label">{t('howItWorks')}</span>
                <h3 className="text-2xl sm:text-3xl font-bold text-white">
                  {lang === 'bn' ? 'সহজ চার ধাপের প্যাকেজিং প্রক্রিয়া' : 'Simple 4-Step Packaging Pipeline'}
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
                <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-3">
                  <span className="text-2xl font-black text-[#FF385C] font-mono">01</span>
                  <h4 className="text-sm font-bold text-white">{t('step1Title')}</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">{t('step1Desc')}</p>
                </div>

                <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-3">
                  <span className="text-2xl font-black text-[#FF385C] font-mono">02</span>
                  <h4 className="text-sm font-bold text-white">{t('step2Title')}</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">{t('step2Desc')}</p>
                </div>

                <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-3">
                  <span className="text-2xl font-black text-[#FF385C] font-mono">03</span>
                  <h4 className="text-sm font-bold text-white">{t('step3Title')}</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">{t('step3Desc')}</p>
                </div>

                <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-3">
                  <span className="text-2xl font-black text-[#FF385C] font-mono">04</span>
                  <h4 className="text-sm font-bold text-white">{t('step4Title')}</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">{t('step4Desc')}</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* ACTIVE TENDER WORKSPACE (Uses Full 1400px Content Width) */
          <div className="app-container space-y-10">
            {/* Step 1: Tender Details & Readiness Gauge */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full">
              <div className="lg:col-span-2">
                <TenderCard tender={tender} />
              </div>

              <div className="card flex flex-col items-center justify-center p-6 relative overflow-hidden">
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-[#FF385C]/15 rounded-full blur-3xl pointer-events-none" />
                <StatBlock
                  value={readyCount}
                  total={requirements.length}
                  label={t('documentsReady')}
                />
                <div className="mt-2 text-center">
                  <p className={`text-xs font-semibold ${hasBlocking ? 'text-[#FF85A1]' : 'text-[#34D399]'}`}>
                    {hasBlocking ? t('hasBlocking') : t('allClear')}
                  </p>
                  <div className="flex items-center justify-center gap-2 mt-4">
                    <button
                      onClick={handleReset}
                      className="pill-btn !px-4 !py-1 text-xs hover:border-white/30"
                      title="Load another tender"
                    >
                      <RefreshCw size={13} />
                      <span>{t('changeTender')}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 2: Upload Files */}
            <div className="card space-y-5 w-full">
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-3.5">
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#FF385C] shadow-[0_0_10px_#FF385C]" />
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
                <div className="flex flex-col items-center gap-2 py-4">
                  <Upload size={28} className="text-[#FF385C]" />
                  <p className="text-sm font-semibold text-white">{t('selectPdfs')}</p>
                  <p className="text-xs text-slate-400">{t('uploadDesc')}</p>
                </div>
              </DropZone>

              {files.length > 0 && (
                <div className="pt-2">
                  <FileList
                    files={files}
                    matches={matches}
                    duplicateGroups={duplicateGroups}
                    onRemove={removeFile}
                  />
                </div>
              )}
            </div>

            {/* Step 3: Requirements + Matching */}
            <div className="card space-y-5 w-full">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.06] pb-4">
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#FF385C] shadow-[0_0_10px_#FF385C]" />
                  <span className="section-label">{t('matching')}</span>
                </div>

                <div className="flex items-center gap-2.5 flex-wrap">
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

              <div className="space-y-3">
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

            {/* Unmatched files */}
            {unmatchedFiles.length > 0 && (
              <div className="card !p-5 bg-white/[0.015] w-full">
                <div className="flex items-center gap-2 mb-3">
                  <FileText size={16} className="text-slate-400" />
                  <span className="section-label">{t('unmatchedFiles')}</span>
                  <span className="text-xs font-mono text-slate-400">({unmatchedFiles.length})</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {unmatchedFiles.map((f) => (
                    <div key={f.id} className="flex items-center gap-2.5 p-2.5 rounded-xl bg-black/25 border border-white/[0.05] text-xs text-slate-300">
                      <FileText size={14} className="text-slate-500 shrink-0" />
                      <span className="truncate font-medium flex-1">{f.name}</span>
                      <span className="text-[11px] text-slate-500 shrink-0 font-mono">({f.pageCount}p)</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Generate Final Package Section */}
            <div className="max-w-xl mx-auto w-full pt-4">
              <div className="card !p-8 border-[#FF385C]/25 shadow-[0_0_50px_rgba(255,56,92,0.12)]">
                <div className="text-center mb-6">
                  <span className="section-label block text-xs">
                    {lang === 'bn' ? 'চূড়ান্ত প্যাকেজ তৈরি ও ডাউনলোড' : 'FINAL PACKAGE COMPILATION'}
                  </span>
                  <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                    {lang === 'bn'
                      ? 'কভার পেজ, সূচিপত্র ও সঠিক ক্রমে পৃষ্ঠা নম্বর সহ সম্পূর্ণ PDF তৈরি করুন'
                      : 'Compiles official cover, dynamic index, sorted documents & verified running footers'}
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
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
