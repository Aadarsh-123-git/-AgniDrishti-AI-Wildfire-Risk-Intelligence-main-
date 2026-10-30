import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Volume2,
  VolumeX,
  Play,
  Square,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Shield,
  ChevronDown,
  RefreshCw,
  Info,
  FileText,
} from 'lucide-react';
import {
  VOICE_LANGUAGES,
  generateAlertText,
  checkVoiceAvailability,
  speakText,
  stopSpeaking,
  isSpeaking,
  addAuditEntry,
  getClientAuditLog,
  type VoiceLanguage,
  type AlertLanguage,
  type RiskLevel,
  type AlertAuditEntry,
} from '../services/voiceAlertService';
import { GeographicZone } from '../types';

interface Props {
  zones: GeographicZone[];
}

export const VoiceAlertPanel: React.FC<Props> = ({ zones }) => {
  // ── State ──────────────────────────────────────────────────────────
  const [selectedLanguage, setSelectedLanguage] = useState<AlertLanguage>('hi');
  const [selectedRiskLevel, setSelectedRiskLevel] = useState<RiskLevel>('HIGH');
  const [selectedSector, setSelectedSector] = useState<string>(zones[0]?.name || 'Sector Alpha');
  const [messagePreview, setMessagePreview] = useState<string>('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [repeatCount, setRepeatCount] = useState<number>(1);
  const [slowerRate, setSlowerRate] = useState(false);
  const [isTestMode, setIsTestMode] = useState(false);
  const [autoAnnounce, setAutoAnnounce] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState<{ available: boolean; message: string }>({
    available: false,
    message: 'Checking...',
  });
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingCriticalAction, setPendingCriticalAction] = useState<(() => void) | null>(null);
  const [showAuditLog, setShowAuditLog] = useState(false);
  const [auditLog, setAuditLog] = useState<AlertAuditEntry[]>([]);
  const [userHasInteracted, setUserHasInteracted] = useState(false);

  const autoAnnounceRef = useRef(autoAnnounce);
  autoAnnounceRef.current = autoAnnounce;

  // ── Track user interaction for autoplay policy ──────────────────────
  useEffect(() => {
    const handler = () => setUserHasInteracted(true);
    document.addEventListener('click', handler, { once: true });
    return () => document.removeEventListener('click', handler);
  }, []);

  // ── Load voices (async in some browsers) ────────────────────────────
  useEffect(() => {
    const updateVoice = () => {
      const status = checkVoiceAvailability(selectedLanguage);
      setVoiceStatus({ available: status.available, message: status.message });
    };

    updateVoice();

    // Voices may load asynchronously
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = updateVoice;
    }
  }, [selectedLanguage]);

  // ── Update message preview on input changes ─────────────────────────
  useEffect(() => {
    const safeZone = zones[0]?.name
      ? `${zones[0].name} Relief Camp`
      : 'Central Relief Camp';
    const text = generateAlertText(selectedSector, selectedRiskLevel, selectedLanguage, {
      safeZoneName: safeZone,
      timeToReach: 15,
      isTest: isTestMode,
    });
    setMessagePreview(text);
  }, [selectedLanguage, selectedRiskLevel, selectedSector, isTestMode, zones]);

  // ── Auto-announce on CRITICAL zones ─────────────────────────────────
  useEffect(() => {
    if (!autoAnnounceRef.current || !userHasInteracted) return;

    const criticalZones = zones.filter((z) => z.riskLevel === 'CRITICAL');
    if (criticalZones.length > 0 && !isSpeaking()) {
      const zone = criticalZones[0];
      const text = generateAlertText(zone.name, 'CRITICAL', selectedLanguage, {
        safeZoneName: 'Emergency Relief Camp',
        timeToReach: 15,
        isTest: isTestMode,
      });

      // Auto-announce triggers confirmation dialog for CRITICAL
      setShowConfirmDialog(true);
      setPendingCriticalAction(() => () => {
        playAlert(text, 'auto');
      });
    }
  }, [zones, userHasInteracted]);

  // ── Play alert ──────────────────────────────────────────────────────
  const playAlert = useCallback(
    (text: string, source: 'tab' | 'evacuation_button' | 'auto' = 'tab') => {
      setIsPlaying(true);

      const success = speakText(text, selectedLanguage, {
        rate: slowerRate ? 0.7 : 0.9,
        repeatCount,
        onEnd: () => setIsPlaying(false),
        onError: (err) => {
          console.error('Voice alert error:', err);
          setIsPlaying(false);
        },
      });

      if (!success) {
        setIsPlaying(false);
      }

      // Audit
      addAuditEntry({
        sector: selectedSector,
        language: selectedLanguage,
        riskLevel: selectedRiskLevel,
        text,
        triggerSource: source,
        triggeredBy: 'operator',
        isTest: isTestMode,
      });
      setAuditLog(getClientAuditLog());
    },
    [selectedLanguage, slowerRate, repeatCount, selectedSector, selectedRiskLevel, isTestMode]
  );

  // ── Handle play with CRITICAL guard ─────────────────────────────────
  const handlePlay = () => {
    if (selectedRiskLevel === 'CRITICAL') {
      setShowConfirmDialog(true);
      setPendingCriticalAction(() => () => playAlert(messagePreview, 'tab'));
    } else {
      playAlert(messagePreview, 'tab');
    }
  };

  const handleStop = () => {
    stopSpeaking();
    setIsPlaying(false);
  };

  const confirmCritical = () => {
    setShowConfirmDialog(false);
    pendingCriticalAction?.();
    setPendingCriticalAction(null);
  };

  const cancelCritical = () => {
    setShowConfirmDialog(false);
    setPendingCriticalAction(null);
  };

  // ── Risk level color ────────────────────────────────────────────────
  const riskColor = (level: RiskLevel) => {
    switch (level) {
      case 'CRITICAL': return 'text-red-400 bg-red-500/20 border-red-500/40';
      case 'HIGH': return 'text-orange-400 bg-orange-500/20 border-orange-500/40';
      case 'MODERATE': return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/40';
      case 'LOW': return 'text-emerald-400 bg-emerald-500/20 border-emerald-500/40';
    }
  };

  return (
    <div id="voice-alert-panel" className="bg-[#161616] border border-white/5 rounded-lg p-5 flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 border-b border-white/5 pb-4">
        <div>
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-violet-400" />
            Multilingual Voice Alert System
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-violet-500/20 border border-violet-500/30 text-violet-300 uppercase tracking-widest">
              5 Languages
            </span>
          </h2>
          <p className="text-[11px] text-gray-500 mt-0.5">
            Fixed, pre-approved alert templates for wildfire evacuation in Hindi, Bengali, Marathi, Telugu, and Tamil.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => { setShowAuditLog(!showAuditLog); setAuditLog(getClientAuditLog()); }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 rounded-lg text-xs font-medium transition-all"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Audit Log</span>
          </button>
        </div>
      </div>

      {/* Controls Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Language Selector */}
        <div className="bg-[#111111] p-3 rounded-lg border border-white/5">
          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-2">
            Alert Language
          </label>
          <div className="space-y-1.5">
            {VOICE_LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                onClick={() => setSelectedLanguage(lang.code)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded text-xs font-medium transition-all ${
                  selectedLanguage === lang.code
                    ? 'bg-violet-600/30 text-violet-200 border border-violet-500/50'
                    : 'bg-white/5 text-gray-400 border border-transparent hover:bg-white/10 hover:text-gray-200'
                }`}
              >
                <span>{lang.nativeLabel}</span>
                <span className="text-[10px] text-gray-500">{lang.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Risk Level & Sector */}
        <div className="bg-[#111111] p-3 rounded-lg border border-white/5 space-y-3">
          <div>
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-2">
              Risk Level
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {(['LOW', 'MODERATE', 'HIGH', 'CRITICAL'] as RiskLevel[]).map((level) => (
                <button
                  key={level}
                  onClick={() => setSelectedRiskLevel(level)}
                  className={`px-2 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider border transition-all ${
                    selectedRiskLevel === level
                      ? riskColor(level)
                      : 'bg-white/5 text-gray-500 border-transparent hover:bg-white/10'
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-2">
              Sector
            </label>
            <select
              value={selectedSector}
              onChange={(e) => setSelectedSector(e.target.value)}
              className="w-full bg-[#0a0a0a] border border-white/10 rounded px-2.5 py-1.5 text-gray-200 text-xs"
            >
              {zones.map((z) => (
                <option key={z.id} value={z.name}>
                  {z.id} — {z.name} ({z.riskLevel})
                </option>
              ))}
              {zones.length === 0 && <option value="Sector Alpha">Sector Alpha</option>}
            </select>
          </div>
        </div>

        {/* Message Preview */}
        <div className="bg-[#111111] p-3 rounded-lg border border-white/5">
          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-2">
            Message Preview
          </label>
          <div className="bg-[#0a0a0a] p-3 rounded border border-white/5 text-xs text-gray-200 leading-relaxed min-h-[80px]">
            {messagePreview || 'Select options to generate preview...'}
          </div>

          {/* Voice Status */}
          <div className={`flex items-center gap-1.5 mt-2 text-[10px] font-medium ${
            voiceStatus.available ? 'text-emerald-400' : 'text-amber-400'
          }`}>
            {voiceStatus.available ? (
              <CheckCircle2 className="w-3 h-3" />
            ) : (
              <AlertTriangle className="w-3 h-3" />
            )}
            <span>{voiceStatus.available ? 'Voice available' : 'Voice not installed for this language'}</span>
          </div>
        </div>

        {/* Playback Controls */}
        <div className="bg-[#111111] p-3 rounded-lg border border-white/5 space-y-3">
          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1">
            Playback Controls
          </label>

          {/* Play / Stop */}
          <div className="flex gap-2">
            <button
              id="btn-play-voice-alert"
              onClick={isPlaying ? handleStop : handlePlay}
              disabled={!voiceStatus.available && !isPlaying}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                isPlaying
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : voiceStatus.available
                  ? 'bg-violet-600 text-white hover:bg-violet-700 shadow-lg shadow-violet-600/20'
                  : 'bg-white/5 text-gray-600 cursor-not-allowed'
              }`}
            >
              {isPlaying ? (
                <>
                  <Square className="w-3.5 h-3.5" /> Stop
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" /> Play
                </>
              )}
            </button>
          </div>

          {/* Repeat Count */}
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-gray-500 uppercase">Repeat</span>
            <div className="flex gap-1">
              {[1, 2, 3].map((n) => (
                <button
                  key={n}
                  onClick={() => setRepeatCount(n)}
                  className={`w-7 h-7 rounded text-[10px] font-bold transition-all ${
                    repeatCount === n
                      ? 'bg-violet-600/30 text-violet-300 border border-violet-500/50'
                      : 'bg-white/5 text-gray-500 hover:bg-white/10'
                  }`}
                >
                  {n}×
                </button>
              ))}
            </div>
          </div>

          {/* Slower Rate */}
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-[10px] text-gray-500 uppercase">Slower Speech</span>
            <div
              onClick={() => setSlowerRate(!slowerRate)}
              className={`w-9 h-5 rounded-full transition-all relative cursor-pointer ${
                slowerRate ? 'bg-violet-600' : 'bg-white/10'
              }`}
            >
              <div
                className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                  slowerRate ? 'translate-x-4' : ''
                }`}
              />
            </div>
          </label>

          {/* Test Mode */}
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-[10px] text-gray-500 uppercase">Test Mode</span>
            <div
              onClick={() => setIsTestMode(!isTestMode)}
              className={`w-9 h-5 rounded-full transition-all relative cursor-pointer ${
                isTestMode ? 'bg-amber-500' : 'bg-white/10'
              }`}
            >
              <div
                className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                  isTestMode ? 'translate-x-4' : ''
                }`}
              />
            </div>
          </label>

          {/* Auto-announce on CRITICAL */}
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-[10px] text-gray-500 uppercase">Auto on Critical</span>
            <div
              onClick={() => setAutoAnnounce(!autoAnnounce)}
              className={`w-9 h-5 rounded-full transition-all relative cursor-pointer ${
                autoAnnounce ? 'bg-red-600' : 'bg-white/10'
              }`}
            >
              <div
                className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                  autoAnnounce ? 'translate-x-4' : ''
                }`}
              />
            </div>
          </label>
        </div>
      </div>

      {/* ── CRITICAL Confirmation Dialog ────────────────────────────── */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-[#1a1a1a] border border-red-500/40 rounded-xl p-6 max-w-md w-full shadow-2xl shadow-red-500/10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Confirm CRITICAL Alert Broadcast</h3>
                <p className="text-[11px] text-gray-400">This will announce an evacuation alert.</p>
              </div>
            </div>

            <div className="bg-[#111111] p-3 rounded border border-red-500/20 mb-4">
              <p className="text-xs text-gray-200 leading-relaxed">{messagePreview}</p>
              <div className="flex gap-2 mt-2 text-[10px]">
                <span className="px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 font-bold">CRITICAL</span>
                <span className="text-gray-500">{selectedSector}</span>
                <span className="text-gray-500">{VOICE_LANGUAGES.find(l => l.code === selectedLanguage)?.label || selectedLanguage}</span>
              </div>
            </div>

            {isTestMode && (
              <div className="flex items-center gap-2 mb-4 p-2 bg-amber-500/10 border border-amber-500/20 rounded">
                <Info className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="text-[11px] text-amber-300">Test mode is ON — this is a test alert only.</span>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={cancelCritical}
                className="flex-1 py-2 bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 rounded-lg text-xs font-bold uppercase tracking-wider transition-all"
              >
                Cancel
              </button>
              <button
                onClick={confirmCritical}
                className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold uppercase tracking-wider transition-all shadow-lg shadow-red-600/20"
              >
                Confirm & Broadcast
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Audit Log ──────────────────────────────────────────────── */}
      {showAuditLog && (
        <div className="bg-[#111111] border border-white/5 rounded-lg p-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-violet-400" />
              Alert Audit Log ({auditLog.length} entries)
            </h3>
            <button
              onClick={() => setAuditLog(getClientAuditLog())}
              className="p-1 hover:bg-white/10 rounded transition-all"
            >
              <RefreshCw className="w-3 h-3 text-gray-500" />
            </button>
          </div>

          {auditLog.length === 0 ? (
            <p className="text-xs text-gray-600 text-center py-4">No alerts triggered yet.</p>
          ) : (
            <div className="space-y-1.5 max-h-60 overflow-y-auto">
              {auditLog.slice(0, 20).map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center gap-2 p-2 bg-[#0a0a0a] rounded border border-white/5 text-[10px]"
                >
                  <Clock className="w-3 h-3 text-gray-600 shrink-0" />
                  <span className="text-gray-500 font-mono w-16 shrink-0">
                    {new Date(entry.timestamp).toLocaleTimeString()}
                  </span>
                  <span className={`px-1 py-0.5 rounded font-bold uppercase ${riskColor(entry.riskLevel)}`}>
                    {entry.riskLevel}
                  </span>
                  <span className="text-gray-400 truncate flex-1">{entry.sector}</span>
                  <span className="text-gray-500">{entry.language}</span>
                  <span className="text-gray-600">{entry.triggerSource}</span>
                  {entry.isTest && (
                    <span className="px-1 py-0.5 rounded bg-amber-500/20 text-amber-400 font-bold">TEST</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
