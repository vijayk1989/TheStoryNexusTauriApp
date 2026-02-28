import { useCallback, useEffect, useRef, useState } from "react";

// ── Types ──────────────────────────────────────────────────────

export interface UseSpeechToTextOptions {
  /** Called with every transcript result (interim and final). */
  onTranscript?: (text: string, isFinal: boolean) => void;
  /** Keep listening after each utterance. Default: true */
  continuous?: boolean;
  /** Show interim (partial) results. Default: true */
  interimResults?: boolean;
  /** BCP-47 language tag, e.g. "en-US". Default: browser default */
  lang?: string;
}

export interface UseSpeechToTextReturn {
  /** Whether the microphone is actively listening */
  isListening: boolean;
  /** Whether the browser supports the Web Speech API */
  isSupported: boolean;
  /** Start listening */
  start: () => void;
  /** Stop listening */
  stop: () => void;
  /** Toggle listening on/off */
  toggle: () => void;
  /** The latest interim (partial) transcript, cleared on final */
  interimTranscript: string;
}

// ── Feature detection ──────────────────────────────────────────

const SpeechRecognitionCtor: any =
  typeof window !== "undefined"
    ? (window as any).SpeechRecognition ??
      (window as any).webkitSpeechRecognition
    : undefined;

export const SPEECH_RECOGNITION_SUPPORTED = !!SpeechRecognitionCtor;

// ── Hook ───────────────────────────────────────────────────────

export function useSpeechToText(
  options: UseSpeechToTextOptions = {}
): UseSpeechToTextReturn {
  const {
    onTranscript,
    continuous = true,
    interimResults = true,
    lang,
  } = options;

  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState("");

  // Keep latest callback in a ref so we don't re-create recognition on
  // every render when the parent's callback identity changes.
  const onTranscriptRef = useRef(onTranscript);
  useEffect(() => {
    onTranscriptRef.current = onTranscript;
  }, [onTranscript]);

  const recognitionRef = useRef<any>(null);

  // ── Create / destroy the recognition instance ────────────────

  const createRecognition = useCallback(() => {
    if (!SpeechRecognitionCtor) return null;

    const rec = new SpeechRecognitionCtor();
    rec.continuous = continuous;
    rec.interimResults = interimResults;
    if (lang) rec.lang = lang;

    rec.onresult = (event: any) => {
      const result = event.results[event.resultIndex];
      const transcript = result[0].transcript;

      if (result.isFinal) {
        setInterimTranscript("");
        onTranscriptRef.current?.(transcript, true);
      } else {
        setInterimTranscript(transcript);
        onTranscriptRef.current?.(transcript, false);
      }
    };

    rec.onerror = (event: any) => {
      // "aborted" fires when we call stop() — not a real error
      if (event.error === "aborted") return;
      console.warn("[useSpeechToText] error:", event.error, event.message);
      setIsListening(false);
    };

    rec.onend = () => {
      // If continuous mode and we haven't explicitly stopped, restart
      // (browsers sometimes stop after silence)
      if (recognitionRef.current === rec && isListeningRef.current) {
        try {
          rec.start();
        } catch {
          // Already started or context destroyed
          setIsListening(false);
        }
      } else {
        setIsListening(false);
      }
    };

    return rec;
  }, [continuous, interimResults, lang]);

  // Track isListening in a ref for the onend handler
  const isListeningRef = useRef(false);
  useEffect(() => {
    isListeningRef.current = isListening;
  }, [isListening]);

  // ── Public controls ──────────────────────────────────────────

  const start = useCallback(() => {
    if (!SpeechRecognitionCtor) return;

    // Stop any existing instance
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onend = null;
        recognitionRef.current.abort();
      } catch {
        /* noop */
      }
    }

    const rec = createRecognition();
    if (!rec) return;
    recognitionRef.current = rec;

    try {
      rec.start();
      setIsListening(true);
      setInterimTranscript("");
    } catch (err) {
      console.warn("[useSpeechToText] failed to start:", err);
    }
  }, [createRecognition]);

  const stop = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
      } catch {
        /* noop */
      }
      recognitionRef.current = null;
    }
    setIsListening(false);
    setInterimTranscript("");
  }, []);

  const toggle = useCallback(() => {
    if (isListeningRef.current) {
      stop();
    } else {
      start();
    }
  }, [start, stop]);

  // ── Cleanup on unmount ───────────────────────────────────────

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.onend = null;
          recognitionRef.current.abort();
        } catch {
          /* noop */
        }
        recognitionRef.current = null;
      }
    };
  }, []);

  return {
    isListening,
    isSupported: SPEECH_RECOGNITION_SUPPORTED,
    start,
    stop,
    toggle,
    interimTranscript,
  };
}
