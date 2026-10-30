/**
 * src/services/voiceAlertService.ts
 * ──────────────────────────────────────────────────────────────────────
 * Client-side voice alert engine.
 * Layer A: Web Speech API (speechSynthesis) for browser playback.
 * Layer B: Server POST /api/alerts/voice for mp3 audio (phones/IVR).
 * ──────────────────────────────────────────────────────────────────────
 */

// ── Alert templates (loaded from JSON, inline fallback) ──────────────
import hiTemplates from '../i18n/alerts/hi.json';
import bnTemplates from '../i18n/alerts/bn.json';
import mrTemplates from '../i18n/alerts/mr.json';
import teTemplates from '../i18n/alerts/te.json';
import taTemplates from '../i18n/alerts/ta.json';
import enTemplates from '../i18n/alerts/en.json';

export type RiskLevel = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
export type VoiceLanguage = 'hi' | 'bn' | 'mr' | 'te' | 'ta';
export type AlertLanguage = VoiceLanguage | 'en';

export interface VoiceLanguageInfo {
  code: VoiceLanguage;
  bcp47: string;
  label: string;
  nativeLabel: string;
}

export const VOICE_LANGUAGES: VoiceLanguageInfo[] = [
  { code: 'hi', bcp47: 'hi-IN', label: 'Hindi', nativeLabel: 'हिन्दी' },
  { code: 'bn', bcp47: 'bn-IN', label: 'Bengali', nativeLabel: 'বাংলা' },
  { code: 'mr', bcp47: 'mr-IN', label: 'Marathi', nativeLabel: 'मराठी' },
  { code: 'te', bcp47: 'te-IN', label: 'Telugu', nativeLabel: 'తెలుగు' },
  { code: 'ta', bcp47: 'ta-IN', label: 'Tamil', nativeLabel: 'தமிழ்' },
];

const ALL_TEMPLATES: Record<AlertLanguage, Record<string, string>> = {
  hi: hiTemplates,
  bn: bnTemplates,
  mr: mrTemplates,
  te: teTemplates,
  ta: taTemplates,
  en: enTemplates,
};

// ── Template rendering ────────────────────────────────────────────────
export function generateAlertText(
  sector: string,
  riskLevel: RiskLevel,
  language: AlertLanguage,
  opts: {
    safeZoneName?: string;
    timeToReach?: number;
    isTest?: boolean;
  } = {}
): string {
  const templates = ALL_TEMPLATES[language] || ALL_TEMPLATES['en'];
  const template = templates[riskLevel] || templates['LOW'] || '';

  let text = template
    .replace(/\{villageName\}/g, sector)
    .replace(/\{riskLevel\}/g, riskLevel)
    .replace(/\{safeZoneName\}/g, opts.safeZoneName || 'Relief Camp')
    .replace(/\{timeToReach\}/g, String(opts.timeToReach || 15));

  if (opts.isTest) {
    const testPrefix = templates['test_prefix'] || 'This is a test. ';
    text = testPrefix + text;
  }

  return text;
}

// ── BCP47 lookup ──────────────────────────────────────────────────────
function getBcp47(lang: AlertLanguage): string {
  const found = VOICE_LANGUAGES.find((l) => l.code === lang);
  return found ? found.bcp47 : 'en-IN';
}

// ── Web Speech API: check voice availability ──────────────────────────
export function checkVoiceAvailability(lang: AlertLanguage): {
  available: boolean;
  voice: SpeechSynthesisVoice | null;
  message: string;
} {
  if (typeof window === 'undefined' || !window.speechSynthesis) {
    return { available: false, voice: null, message: 'Speech synthesis not supported in this browser.' };
  }

  const bcp47 = getBcp47(lang);
  const voices = window.speechSynthesis.getVoices();

  // Try exact match first
  let voice = voices.find((v) => v.lang === bcp47);
  // Try partial match (just the language part)
  if (!voice) {
    const langPrefix = bcp47.split('-')[0];
    voice = voices.find((v) => v.lang.startsWith(langPrefix));
  }

  if (voice) {
    return { available: true, voice, message: `Voice available: ${voice.name}` };
  }

  const langInfo = VOICE_LANGUAGES.find((l) => l.code === lang);
  return {
    available: false,
    voice: null,
    message: `Voice not installed for ${langInfo?.label || lang}. Text-only mode.`,
  };
}

// ── Web Speech API: speak text ────────────────────────────────────────
let currentUtterance: SpeechSynthesisUtterance | null = null;

export function speakText(
  text: string,
  lang: AlertLanguage,
  opts: {
    rate?: number; // 0.1 to 2.0 (default ~0.9 for clarity)
    repeatCount?: number; // 1-3
    onEnd?: () => void;
    onError?: (error: string) => void;
  } = {}
): boolean {
  if (typeof window === 'undefined' || !window.speechSynthesis) {
    opts.onError?.('Speech synthesis not supported.');
    return false;
  }

  const { available, voice } = checkVoiceAvailability(lang);
  if (!available || !voice) {
    opts.onError?.(`No voice available for ${lang}. Showing text only.`);
    return false;
  }

  // Stop any current speech
  stopSpeaking();

  const rate = opts.rate ?? 0.9;
  const repeatCount = Math.min(3, Math.max(1, opts.repeatCount || 1));
  let currentRepeat = 0;

  const speakOnce = () => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = voice;
    utterance.lang = voice.lang;
    utterance.rate = rate;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    currentUtterance = utterance;

    utterance.onend = () => {
      currentRepeat++;
      if (currentRepeat < repeatCount) {
        // Pause between repeats
        setTimeout(speakOnce, 800);
      } else {
        currentUtterance = null;
        opts.onEnd?.();
      }
    };

    utterance.onerror = (event) => {
      currentUtterance = null;
      opts.onError?.(`Speech error: ${event.error}`);
    };

    window.speechSynthesis.speak(utterance);
  };

  speakOnce();
  return true;
}

export function stopSpeaking(): void {
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
  currentUtterance = null;
}

export function isSpeaking(): boolean {
  if (typeof window === 'undefined' || !window.speechSynthesis) return false;
  return window.speechSynthesis.speaking;
}

// ── Server TTS endpoint (Layer B) ─────────────────────────────────────
export async function fetchVoiceAudio(
  text: string,
  language: AlertLanguage
): Promise<{ audioUrl: string | null; error?: string }> {
  try {
    const res = await fetch('/api/alerts/voice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, language }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Unknown error' }));
      return { audioUrl: null, error: err.error || `Server TTS failed (${res.status})` };
    }

    // Response is an audio blob
    const blob = await res.blob();
    const audioUrl = URL.createObjectURL(blob);
    return { audioUrl };
  } catch (err: any) {
    return { audioUrl: null, error: err.message || 'Network error reaching TTS server' };
  }
}

// ── Audit log types (client-side mirror) ──────────────────────────────
export interface AlertAuditEntry {
  id: string;
  timestamp: string;
  sector: string;
  language: AlertLanguage;
  riskLevel: RiskLevel;
  text: string;
  triggerSource: 'tab' | 'evacuation_button' | 'auto';
  triggeredBy: string;
  isTest: boolean;
}

// Client-side audit log
const clientAuditLog: AlertAuditEntry[] = [];

export function addAuditEntry(
  entry: Omit<AlertAuditEntry, 'id' | 'timestamp'>
): AlertAuditEntry {
  const full: AlertAuditEntry = {
    id: `client-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
    timestamp: new Date().toISOString(),
    ...entry,
  };
  clientAuditLog.unshift(full); // newest first
  if (clientAuditLog.length > 200) clientAuditLog.pop();

  // Also POST to server for persistent audit
  fetch('/api/alerts/audit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(full),
  }).catch(() => {
    // Non-critical: server audit is best-effort
  });

  return full;
}

export function getClientAuditLog(): AlertAuditEntry[] {
  return clientAuditLog;
}
