import { useState, useCallback, useRef } from 'react';

export function useSpeech() {
  const [enabled, setEnabled] = useState(false);
  const synthRef = useRef<SpeechSynthesis | null>(null);

  const isSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  if (isSupported && !synthRef.current) {
    synthRef.current = window.speechSynthesis;
  }

  const toggle = useCallback(() => {
    setEnabled((prev) => {
      const next = !prev;
      if (!next && synthRef.current) {
        try { synthRef.current.cancel(); } catch { /* ignore */ }
      }
      return next;
    });
  }, []);

  const speak = useCallback((text: string) => {
    if (!enabled || !synthRef.current) return;
    try {
      synthRef.current.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = 0.95;
      utterance.pitch = 1;
      synthRef.current.speak(utterance);
    } catch {
      // Silently no-op if unsupported
    }
  }, [enabled]);

  const stop = useCallback(() => {
    if (synthRef.current) {
      try { synthRef.current.cancel(); } catch { /* ignore */ }
    }
  }, []);

  return { enabled, toggle, speak, stop, isSupported };
}
