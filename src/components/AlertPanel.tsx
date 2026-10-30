import React, { useState } from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  Send,
  Volume2,
  VolumeX,
  Radio,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { AlertMessage, GeographicZone } from '../types';
import { api } from '../services/api';

interface Props {
  alerts: AlertMessage[];
  onAcknowledge: (alertId: string) => void;
  onSelectZoneId?: (zoneId: string) => void;
  zones: GeographicZone[];
  onRefreshAlerts?: () => void;
}

export const AlertPanel: React.FC<Props> = ({
  alerts,
  onAcknowledge,
  onSelectZoneId,
  zones,
  onRefreshAlerts,
}) => {
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [filterSeverity, setFilterSeverity] = useState<string>('ALL');
  const [customTargetZone, setCustomTargetZone] = useState<string>(zones[0]?.id || 'ZN-001');
  const [customLevel, setCustomLevel] = useState<'EMERGENCY' | 'WARNING' | 'WATCH'>('WARNING');
  const [customTitle, setCustomTitle] = useState<string>('');
  const [customMsg, setCustomMsg] = useState<string>('');
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [broadcastSuccess, setBroadcastSuccess] = useState(false);

  const filteredAlerts = alerts.filter((a) => {
    if (filterSeverity === 'ALL') return true;
    return a.severity === filterSeverity;
  });

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTitle || !customMsg) return;

    setIsBroadcasting(true);
    setBroadcastSuccess(false);
    try {
      await api.createAlert({
        targetZoneId: customTargetZone,
        severity: customLevel,
        title: customTitle,
        message: customMsg,
        recommendedAction: 'Execute immediate evacuation procedure according to local command protocols.',
      });
      setCustomTitle('');
      setCustomMsg('');
      setBroadcastSuccess(true);
      setTimeout(() => setBroadcastSuccess(false), 4000);
      onRefreshAlerts?.();
    } catch (err) {
      console.error('Failed to broadcast alert:', err);
    } finally {
      setIsBroadcasting(false);
    }
  };

  return (
    <div id="alert-panel" className="bg-[#161616] border border-white/5 rounded-lg p-5 flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 border-b border-white/5 pb-4">
        <div>
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-red-500" />
            Automated Early Warning & Emergency Broadcast Dispatcher
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white/5 border border-white/10 text-gray-400 uppercase tracking-widest">
              CAP COMPLIANT
            </span>
          </h2>
          <p className="text-[11px] text-gray-500 mt-0.5">
            Real-time threshold alerting engine that synthesizes automated hazard bulletins based on Random Forest risk predictions.
          </p>
        </div>

        {/* Audio Siren Toggle & Filter */}
        <div className="flex items-center gap-2 text-xs">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`px-2.5 py-1 rounded border flex items-center gap-1.5 transition-all text-xs ${
              soundEnabled
                ? 'bg-red-500/20 text-red-400 border-red-500/40'
                : 'bg-white/5 text-gray-400 border-white/10 hover:text-gray-200'
            }`}
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-red-400" /> : <VolumeX className="w-3.5 h-3.5" />}
            <span>{soundEnabled ? 'Siren Audio ON' : 'Siren Muted'}</span>
          </button>

          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
            className="bg-[#111111] border border-white/10 rounded px-2.5 py-1 text-gray-200 text-xs"
          >
            <option value="ALL">All Alerts</option>
            <option value="EMERGENCY">Emergency (Critical)</option>
            <option value="WARNING">Warning (High)</option>
            <option value="WATCH">Watch (Moderate)</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Active Emergency Feed */}
        <div className="lg:col-span-7 flex flex-col gap-3">
          <div className="flex justify-between items-center text-xs">
            <span className="font-bold text-gray-400 uppercase tracking-widest text-[10px]">
              Active Bulletins ({filteredAlerts.length})
            </span>
            <span className="text-[10px] text-gray-500 font-mono">
              Auto-dispatched via Threshold Engine
            </span>
          </div>

          <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
            {filteredAlerts.length === 0 ? (
              <div className="bg-[#111111] border border-white/5 rounded-lg p-8 text-center text-gray-500 text-xs">
                No active emergency bulletins matching filter.
              </div>
            ) : (
              filteredAlerts.map((alert) => {
                const isEmergency = alert.severity === 'EMERGENCY';
                const isWarning = alert.severity === 'WARNING';

                return (
                  <div
                    key={alert.id}
                    className={`p-3.5 rounded-lg border border-l-2 transition-all ${
                      isEmergency
                        ? 'bg-[#111111] border-white/5 border-l-red-500'
                        : isWarning
                        ? 'bg-[#111111] border-white/5 border-l-orange-500'
                        : 'bg-[#111111] border-white/5 border-l-yellow-500'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                            isEmergency
                              ? 'bg-red-500/20 text-red-500'
                              : isWarning
                              ? 'bg-orange-500/20 text-orange-400'
                              : 'bg-yellow-500/20 text-yellow-400'
                          }`}
                        >
                          {alert.severity}
                        </span>
                        <h4 className="font-bold text-xs text-white">{alert.title}</h4>
                      </div>

                      <span className="text-[10px] text-gray-500 flex items-center gap-1 font-mono">
                        <Clock className="w-3 h-3" />
                        {new Date(alert.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    <p className="text-[11px] text-gray-300 mt-2 leading-relaxed">{alert.message}</p>

                    <div className="mt-2.5 p-2 bg-[#0a0a0a] rounded border border-white/5 text-[10px] text-gray-400 flex items-start gap-1.5">
                      <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0 mt-0.5" />
                      <span><b>Mandate:</b> {alert.recommendedAction}</span>
                    </div>

                    <div className="mt-3 flex items-center justify-between pt-2 border-t border-white/5 text-xs">
                      <button
                        onClick={() => onSelectZoneId?.(alert.targetZoneId || alert.zoneId)}
                        className="text-[10px] text-gray-300 hover:text-white flex items-center gap-1 font-medium"
                      >
                        <span>Focus Zone {alert.targetZoneId || alert.zoneId}</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>

                      <div className="flex items-center gap-2">
                        {alert.acknowledged ? (
                          <span className="text-[10px] text-emerald-400 font-semibold">
                            ✓ Command Acknowledged
                          </span>
                        ) : (
                          <button
                            onClick={() => onAcknowledge(alert.id)}
                            className="px-2.5 py-1 bg-white/5 hover:bg-white/10 text-gray-200 border border-white/10 rounded text-[10px] font-medium transition-all"
                          >
                            Acknowledge
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Manual Incident Broadcast Form */}
        <div className="lg:col-span-5 bg-[#111111] p-4 rounded-lg border border-white/5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3 border-b border-white/5 pb-2">
              <Radio className="w-3.5 h-3.5 text-red-500" />
              <h3 className="font-bold text-xs uppercase tracking-widest text-gray-300">
                Manual Commander Broadcast
              </h3>
            </div>

            <form onSubmit={handleBroadcast} className="space-y-3 text-xs">
              <div>
                <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block mb-1">
                  Target Sector
                </label>
                <select
                  value={customTargetZone}
                  onChange={(e) => setCustomTargetZone(e.target.value)}
                  className="w-full bg-[#0a0a0a] border border-white/10 rounded px-2.5 py-1.5 text-gray-200 text-xs"
                >
                  {zones.map((z) => (
                    <option key={z.id} value={z.id}>
                      {z.id} — {z.name} ({z.riskLevel})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block mb-1">
                  Alert Severity Tier
                </label>
                <select
                  value={customLevel}
                  onChange={(e) => setCustomLevel(e.target.value as any)}
                  className="w-full bg-[#0a0a0a] border border-white/10 rounded px-2.5 py-1.5 text-gray-200 text-xs"
                >
                  <option value="EMERGENCY">Emergency (Red)</option>
                  <option value="WARNING">Warning (Orange)</option>
                  <option value="WATCH">Watch (Yellow)</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block mb-1">
                  Bulletin Headline
                </label>
                <input
                  type="text"
                  placeholder="e.g., Mandatory Evacuation Order Sector ZN-102"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  className="w-full bg-[#0a0a0a] border border-white/10 rounded px-2.5 py-1.5 text-gray-200 placeholder-gray-600 text-xs"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block mb-1">
                  Emergency Advisory Body
                </label>
                <textarea
                  rows={3}
                  placeholder="Provide precise evacuation guidance, assembly locations, and road closure directives..."
                  value={customMsg}
                  onChange={(e) => setCustomMsg(e.target.value)}
                  className="w-full bg-[#0a0a0a] border border-white/10 rounded px-2.5 py-1.5 text-gray-200 placeholder-gray-600 text-xs leading-relaxed"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isBroadcasting}
                className="w-full py-2.5 bg-white text-black font-bold text-[11px] uppercase tracking-widest rounded hover:bg-gray-200 flex items-center justify-center gap-2 transition-all disabled:opacity-50 mt-2"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Transmit Emergency Broadcast</span>
              </button>
            </form>
          </div>

          <div className="text-[10px] text-gray-500 text-center mt-3 pt-2 border-t border-white/5">
            CAP v1.2 Protocol Simulation • Transmits to emergency operations centers
          </div>
        </div>
      </div>
    </div>
  );
};
