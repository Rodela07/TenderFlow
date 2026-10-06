import React, { useState, useMemo, useEffect } from 'react';
import type {
  TenderConfig,
  UploadedFile,
  DocumentMatch,
  Language,
  DocumentStatus,
} from './types';
import { Header } from './components/Header';
import { TenderMetaCard } from './components/TenderMetaCard';
import { JsonLoader } from './components/JsonLoader';
import { FileUploadSection } from './components/FileUploadSection';
import { MatchingMatrix } from './components/MatchingMatrix';
import { ValidationSummaryBanner } from './components/ValidationSummaryBanner';
import { GenerateModal } from './components/GenerateModal';
import { TestVerificationModal } from './components/TestVerificationModal';
import {
  calculateStatusSummary,
  evaluateRequirementStatus,
  calculateMatchSuggestions,
  updateDuplicateFlags,
} from './utils/tenderEngine';
import { SAMPLE_REQUIREMENTS_JSON } from './utils/sampleData';

export function App() {
  const [lang, setLang] = useState<Language>('en');
  const [config, setConfig] = useState<TenderConfig | null>(SAMPLE_REQUIREMENTS_JSON);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [matches, setMatches] = useState<Record<string, DocumentMatch>>({});
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [isTestsModalOpen, setIsTestsModalOpen] = useState(false);

  // Initialize matches when config loads
  useEffect(() => {
    if (config) {
      setMatches((prev) => {
        const next: Record<string, DocumentMatch> = {};
        for (const req of config.requirements) {
          next[req.id] = prev[req.id] || {
            requirementId: req.id,
            fileId: null,
            expiryDate: null,
          };
        }
        return next;
      });
    }
  }, [config]);

  // Handle language switch
  const handleToggleLang = () => {
    setLang((prev) => (prev === 'en' ? 'bn' : 'en'));
  };

  // Convert files array to dictionary for constant-time lookup
  const filesDict = useMemo(() => {
    const dict: Record<string, UploadedFile> = {};
    for (const f of files) {
      dict[f.id] = f;
    }
    return dict;
  }, [files]);

  // Centralized Status Summary calculation (Strict Single Source of Truth)
  const summary = useMemo(() => {
    if (!config) {
      return {
        totalRequirements: 0,
        totalRequired: 0,
        ready: 0,
        missing: 0,
        expired: 0,
        expiryNeeded: 0,
        optionalNotProvided: 0,
        blockingCount: 0,
        isPackageReady: false,
      };
    }
    return calculateStatusSummary(
      config.requirements,
      matches,
      filesDict,
      config.tender.submission_deadline
    );
  }, [config, matches, filesDict]);

  // Centralized individual requirement statuses dictionary
  const statuses = useMemo(() => {
    if (!config) return {};
    const res: Record<string, DocumentStatus> = {};
    for (const req of config.requirements) {
      const match = matches[req.id];
      const matchedFile = match?.fileId ? filesDict[match.fileId] : undefined;
      res[req.id] = evaluateRequirementStatus(
        req,
        match,
        matchedFile,
        config.tender.submission_deadline
      );
    }
    return res;
  }, [config, matches, filesDict]);

  // Strict 1-to-1 matching handler
  const handleMatchChange = (requirementId: string, newFileId: string | null) => {
    setMatches((prev) => {
      const updated = { ...prev };

      // 1. If this file was already matched to another requirement, unmatch that other requirement
      if (newFileId) {
        for (const [reqId, m] of Object.entries(updated)) {
          if (m.fileId === newFileId && reqId !== requirementId) {
            updated[reqId] = {
              ...m,
              fileId: null,
            };
          }
        }
      }

      // 2. Set the match on the target requirement
      updated[requirementId] = {
        ...(updated[requirementId] || { requirementId, expiryDate: null }),
        fileId: newFileId,
      };

      return updated;
    });
  };

  // Expiry date input handler
  const handleExpiryDateChange = (requirementId: string, expiryDate: string) => {
    setMatches((prev) => ({
      ...prev,
      [requirementId]: {
        ...(prev[requirementId] || { requirementId, fileId: null }),
        expiryDate: expiryDate.trim() || null,
      },
    }));
  };

  // Auto-match suggestions handler (Section 26 / Bonus)
  const handleApplyAutoMatch = () => {
    if (!config || files.length === 0) return;
    const suggestions = calculateMatchSuggestions(config.requirements, files);

    setMatches((prev) => {
      const next = { ...prev };
      for (const [reqId, fileId] of Object.entries(suggestions)) {
        if (!next[reqId]?.fileId) {
          next[reqId] = {
            ...(next[reqId] || { requirementId: reqId, expiryDate: null }),
            fileId,
          };
        }
      }
      return next;
    });
  };

  // Files updated handler (syncs duplicate flags and cleans orphaned matches)
  const handleFilesUpdated = (updatedFiles: UploadedFile[]) => {
    const withDuplicates = updateDuplicateFlags(updatedFiles);
    setFiles(withDuplicates);

    // Clean up matches pointing to removed files
    const validIds = new Set(withDuplicates.map((f) => f.id));
    setMatches((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const [reqId, m] of Object.entries(next)) {
        if (m.fileId && !validIds.has(m.fileId)) {
          next[reqId] = { ...m, fileId: null };
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  };

  // Saved Project Load Handler (Bonus #4 / Section 30)
  const handleLoadSavedProject = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      try {
        const text = await e.target.files[0].text();
        const parsed = JSON.parse(text);
        if (parsed.config && parsed.config.tender && parsed.config.requirements) {
          setConfig(parsed.config);
          if (parsed.matches) {
            setMatches(parsed.matches);
          }
        }
      } catch {
        alert('Invalid project file.');
      }
      e.target.value = '';
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Header
        lang={lang}
        onToggleLang={handleToggleLang}
        config={config}
        matches={matches}
        files={filesDict}
        statuses={statuses}
        onOpenTestsModal={() => setIsTestsModalOpen(true)}
        onLoadSavedProject={handleLoadSavedProject}
      />

      {/* Main Workspace Container */}
      <main style={{ flex: 1, maxWidth: 1400, width: '100%', margin: '0 auto', padding: '24px 20px' }}>
        {!config ? (
          /* Step 1: Load requirements.json */
          <JsonLoader lang={lang} onConfigLoaded={(loaded) => setConfig(loaded)} />
        ) : (
          /* Step 2, 3, 4: Active Tender Workspace */
          <div>
            {/* Tender Metadata Card */}
            <TenderMetaCard
              tender={config.tender}
              lang={lang}
              onResetJson={() => setConfig(null)}
            />

            {/* Validation Summary & Generate Package Action Banner */}
            <ValidationSummaryBanner
              summary={summary}
              lang={lang}
              onOpenGenerateModal={() => setIsGenerateModalOpen(true)}
            />

            {/* PDF Upload & Limit Enforcement Zone */}
            <FileUploadSection
              lang={lang}
              files={files}
              onFilesUpdated={handleFilesUpdated}
              requirements={config.requirements}
              matches={matches}
            />

            {/* Requirements & Documents Matching Matrix */}
            <MatchingMatrix
              lang={lang}
              requirements={config.requirements}
              files={files}
              matches={matches}
              submissionDeadline={config.tender.submission_deadline}
              onMatchChange={handleMatchChange}
              onExpiryDateChange={handleExpiryDateChange}
              onApplyAutoMatch={handleApplyAutoMatch}
            />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer style={{
        textAlign: 'center',
        padding: '20px',
        fontSize: '0.8rem',
        color: 'var(--text-muted)',
        borderTop: '1px solid var(--border-subtle)',
      }}>
        Tender Document Package Builder • 100% Client-Side Local Processing • AI DevFest 2026
      </footer>

      {/* Generate Package Modal */}
      {config && (
        <GenerateModal
          isOpen={isGenerateModalOpen}
          onClose={() => setIsGenerateModalOpen(false)}
          lang={lang}
          config={config}
          matches={matches}
          files={filesDict}
        />
      )}

      {/* Automated 28-Rules Test Verification Modal */}
      <TestVerificationModal
        isOpen={isTestsModalOpen}
        onClose={() => setIsTestsModalOpen(false)}
        lang={lang}
      />
    </div>
  );
}

export default App;
