import React, { useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  Play,
  X,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { runFullVerificationSuite, type TestResult } from '../utils/verificationSuite';
import type { Language } from '../types';
import { translations } from '../locales/i18n';

interface TestVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
}

export const TestVerificationModal: React.FC<TestVerificationModalProps> = ({
  isOpen,
  onClose,
  lang,
}) => {
  const t = translations[lang];
  const [results, setResults] = useState<TestResult[] | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  if (!isOpen) return null;

  const handleRunTests = async () => {
    setIsRunning(true);
    try {
      const res = await runFullVerificationSuite();
      setResults(res);
    } catch (e) {
      console.error(e);
    } finally {
      setIsRunning(false);
    }
  };

  const passCount = results ? results.filter((r) => r.passed).length : 0;
  const totalCount = results ? results.length : 0;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(5, 8, 15, 0.85)',
        backdropFilter: 'blur(8px)',
        zIndex: 60,
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
          maxWidth: 800,
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '28px 32px',
          position: 'relative',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6)',
        }}
      >
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

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 'var(--radius-md)',
              background: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid rgba(16, 185, 129, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ShieldCheck size={24} color="#34d399" />
          </div>
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff' }}>
              {t.testSuitTitle}
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              {t.testSuiteDesc}
            </p>
          </div>
        </div>

        {/* Action Button */}
        <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={handleRunTests}
            disabled={isRunning}
            className="btn btn-primary"
            style={{ padding: '8px 18px', fontSize: '0.85rem' }}
          >
            {isRunning ? (
              <>
                <Sparkles size={15} />
                <span>Running Verification...</span>
              </>
            ) : (
              <>
                <Play size={15} />
                <span>{results ? 'Re-run Tests' : t.runTestsBtn}</span>
              </>
            )}
          </button>

          {results && (
            <span
              className={`badge ${passCount === totalCount ? 'badge-ok' : 'badge-missing'}`}
              style={{ fontSize: '0.8rem', padding: '6px 12px' }}
            >
              {passCount} / {totalCount} Tests Passed ({passCount === totalCount ? '100%' : 'Failed'})
            </span>
          )}
        </div>

        {/* Test Results List */}
        {results ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {results.map((r) => (
              <div
                key={r.id}
                style={{
                  background: r.passed ? 'rgba(16, 185, 129, 0.05)' : 'rgba(239, 68, 68, 0.08)',
                  border: r.passed ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: 'var(--radius-md)',
                  padding: '10px 14px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 12,
                }}
              >
                {r.passed ? (
                  <CheckCircle2 size={18} color="#34d399" style={{ flexShrink: 0, marginTop: 2 }} />
                ) : (
                  <XCircle size={18} color="#f87171" style={{ flexShrink: 0, marginTop: 2 }} />
                )}

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#ffffff' }}>
                      Test #{r.id}: {r.name}
                    </span>
                    <span
                      className={`badge ${r.passed ? 'badge-ok' : 'badge-missing'}`}
                      style={{ fontSize: '0.675rem' }}
                    >
                      {r.passed ? 'PASSED' : 'FAILED'}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.775rem', color: 'var(--text-secondary)', marginTop: 2, fontFamily: 'var(--font-mono)' }}>
                    {r.message}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div
            style={{
              padding: '30px 20px',
              textAlign: 'center',
              color: 'var(--text-muted)',
              border: '1px dashed var(--border-color)',
              borderRadius: 'var(--radius-md)',
            }}
          >
            Click &quot;Run Verification Tests&quot; to execute all automated test scenarios.
          </div>
        )}
      </div>
    </div>
  );
};
