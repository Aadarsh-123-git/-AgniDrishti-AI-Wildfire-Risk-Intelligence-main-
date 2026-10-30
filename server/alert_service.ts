/**
 * server/alert_service.ts
 * ──────────────────────────────────────────────────────────────────────
 * Generates fixed, pre-approved alert text in 5 Indian languages + English fallback.
 * Does NOT use any LLM or generative AI — templates only.
 * ──────────────────────────────────────────────────────────────────────
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

// ESM-compatible __dirname equivalent
const __filename_esm = fileURLToPath(import.meta.url);
const __dirname_esm = path.dirname(__filename_esm);

// ── Types ──────────────────────────────────────────────────────────────
export type AlertRiskLevel = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
export type AlertLanguage = 'hi' | 'bn' | 'mr' | 'te' | 'ta' | 'en';

export interface AlertParams {
  villageName: string;
  riskLevel: AlertRiskLevel;
  safeZoneName: string;
  timeToReach: number; // minutes
}

export interface AlertAuditEntry {
  id: string;
  timestamp: string;
  sector: string;
  language: AlertLanguage;
  riskLevel: AlertRiskLevel;
  text: string;
  triggerSource: 'tab' | 'evacuation_button' | 'auto';
  triggeredBy: string; // user identifier or 'system'
  isTest: boolean;
}

// ── Language metadata ──────────────────────────────────────────────────
export const SUPPORTED_VOICE_LANGUAGES = [
  { code: 'hi' as const, bcp47: 'hi-IN', label: 'हिन्दी (Hindi)' },
  { code: 'bn' as const, bcp47: 'bn-IN', label: 'বাংলা (Bengali)' },
  { code: 'mr' as const, bcp47: 'mr-IN', label: 'मराठी (Marathi)' },
  { code: 'te' as const, bcp47: 'te-IN', label: 'తెలుగు (Telugu)' },
  { code: 'ta' as const, bcp47: 'ta-IN', label: 'தமிழ் (Tamil)' },
] as const;

export const FALLBACK_LANGUAGE: AlertLanguage = 'en';

// ── Template cache ─────────────────────────────────────────────────────
const templateCache: Record<string, Record<string, string>> = {};

function loadTemplates(lang: AlertLanguage): Record<string, string> {
  if (templateCache[lang]) return templateCache[lang];

  // Try to load from the JSON file
  const possiblePaths = [
    path.resolve(process.cwd(), 'src', 'i18n', 'alerts', `${lang}.json`),
    path.resolve(__dirname_esm, '..', 'src', 'i18n', 'alerts', `${lang}.json`),
  ];

  for (const templatePath of possiblePaths) {
    if (fs.existsSync(templatePath)) {
      const raw = fs.readFileSync(templatePath, 'utf-8');
      templateCache[lang] = JSON.parse(raw);
      return templateCache[lang];
    }
  }

  // Inline English fallback
  templateCache[lang] = {
    LOW: 'Low fire risk in {villageName}. Stay alert, know the route to {safeZoneName}.',
    MODERATE: 'Moderate fire risk in {villageName}. Be ready to move to {safeZoneName}, {timeToReach} minutes away.',
    HIGH: 'Leave {villageName} now! Head to {safeZoneName} immediately, {timeToReach} minutes away.',
    CRITICAL: 'Danger! Evacuate {villageName} now! Reach {safeZoneName} in {timeToReach} minutes.',
    test_prefix: 'This is a test. ',
  };
  return templateCache[lang];
}

// ── Core function ──────────────────────────────────────────────────────
export function generateAlertText(
  sector: string,
  riskLevel: AlertRiskLevel,
  language: AlertLanguage,
  params: {
    safeZoneName?: string;
    timeToReach?: number;
    isTest?: boolean;
  } = {}
): string {
  const lang = SUPPORTED_VOICE_LANGUAGES.some((l) => l.code === language)
    ? language
    : FALLBACK_LANGUAGE;

  const templates = loadTemplates(lang);
  const template = templates[riskLevel] || templates['LOW'] || '';

  let text = template
    .replace(/\{villageName\}/g, sector)
    .replace(/\{riskLevel\}/g, riskLevel)
    .replace(/\{safeZoneName\}/g, params.safeZoneName || 'Relief Camp')
    .replace(/\{timeToReach\}/g, String(params.timeToReach || 15));

  if (params.isTest) {
    const testPrefix = templates['test_prefix'] || 'This is a test. ';
    text = testPrefix + text;
  }

  return text;
}

// ── Audio cache key ────────────────────────────────────────────────────
export function getAudioCacheKey(language: string, text: string): string {
  return crypto.createHash('sha256').update(`${language}:${text}`).digest('hex');
}

// ── Audit log (in-memory, for prototype) ───────────────────────────────
const auditLog: AlertAuditEntry[] = [];

export function logAlert(entry: Omit<AlertAuditEntry, 'id' | 'timestamp'>): AlertAuditEntry {
  const fullEntry: AlertAuditEntry = {
    id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
    timestamp: new Date().toISOString(),
    ...entry,
  };
  auditLog.push(fullEntry);

  // Keep audit log bounded (last 500 entries)
  if (auditLog.length > 500) {
    auditLog.splice(0, auditLog.length - 500);
  }

  console.log(
    `[VOICE ALERT AUDIT] ${fullEntry.timestamp} | ${fullEntry.triggerSource} | ` +
    `${fullEntry.language} | ${fullEntry.riskLevel} | ${fullEntry.sector} | ` +
    `test=${fullEntry.isTest} | by=${fullEntry.triggeredBy}`
  );

  return fullEntry;
}

export function getAuditLog(): AlertAuditEntry[] {
  return [...auditLog].reverse(); // newest first
}

// ── IVR / Voice call stub ──────────────────────────────────────────────
/**
 * Sends a voice call (IVR) to the given phone number with a pre-generated audio file.
 * TODO: Integrate with Twilio or Exotel. Read credentials from env:
 *   - TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER
 *   - or EXOTEL_SID, EXOTEL_TOKEN, EXOTEL_PHONE_NUMBER
 */
export async function sendVoiceCall(
  phoneNumber: string,
  audioUrl: string
): Promise<{ success: boolean; callId?: string; error?: string }> {
  const provider = process.env.IVR_PROVIDER || 'twilio'; // 'twilio' | 'exotel'

  console.log(
    `[IVR STUB] Would call ${phoneNumber} with audio ${audioUrl} via ${provider}. ` +
    `Configure ${provider.toUpperCase()}_* env vars to enable.`
  );

  // TODO: Implement actual Twilio/Exotel integration
  // Example for Twilio:
  // const accountSid = process.env.TWILIO_ACCOUNT_SID;
  // const authToken = process.env.TWILIO_AUTH_TOKEN;
  // const fromNumber = process.env.TWILIO_PHONE_NUMBER;
  // const client = require('twilio')(accountSid, authToken);
  // const call = await client.calls.create({
  //   twiml: `<Response><Play>${audioUrl}</Play></Response>`,
  //   to: phoneNumber,
  //   from: fromNumber,
  // });
  // return { success: true, callId: call.sid };

  return { success: true, callId: `stub-${Date.now()}` };
}
