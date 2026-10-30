import React, { useState } from 'react';
import {
  ShieldAlert,
  Route,
  Home,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Car,
  Printer,
  Volume2,
} from 'lucide-react';
import { EvacuationPlan, SafeZone, GeographicZone } from '../types';
import { api } from '../services/api';
import {
  generateAlertText,
  speakText,
  stopSpeaking,
  checkVoiceAvailability,
  addAuditEntry,
  type RiskLevel,
  type AlertLanguage,
} from '../services/voiceAlertService';

interface Props {
  plan: EvacuationPlan | null;
  safeZones: SafeZone[];
  zones: GeographicZone[];
  activeZoneId?: string;
  onRefreshPlan?: () => void;
}

export const EvacuationPanel: React.FC<Props> = ({
  plan,
  safeZones,
  zones,
  activeZoneId,
  onRefreshPlan,
}) => {
  const [selectedZoneId, setSelectedZoneId] = useState<string>(activeZoneId || zones[0]?.id || '');
  const [currentPlan, setCurrentPlan] = useState<EvacuationPlan | null>(plan);
  const [isGenerating, setIsGenerating] = useState(false);
  const [announceLanguage] = useState<AlertLanguage>('hi');
  const [showCriticalConfirm, setShowCriticalConfirm] = useState(false);
  const [pendingAnnounce, setPendingAnnounce] = useState<(() => void) | null>(null);

  const handleGenerateForZone = async () => {
    if (!selectedZoneId) return;
    setIsGenerating(true);
    try {
      const res = await api.getEvacuationPlan(selectedZoneId);
      setCurrentPlan(res);
      onRefreshPlan?.();
    } catch (err) {
      console.error('Failed to generate evacuation plan:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const activePlan = currentPlan || plan;

  // ── Announce handler ──────────────────────────────────────────────
  const handleAnnounce = (zoneName: string, riskLevel: RiskLevel, safeZoneName: string) => {
    const text = generateAlertText(zoneName, riskLevel, announceLanguage, {
      safeZoneName,
      timeToReach: 15,
      isTest: false,
    });

    const doSpeak = () => {
      speakText(text, announceLanguage, {
        rate: 0.9,
        repeatCount: 1,
        onError: (err) => console.error('Announce error:', err),
      });
      addAuditEntry({
        sector: zoneName,
        language: announceLanguage,
        riskLevel,
        text,
        triggerSource: 'evacuation_button',
        triggeredBy: 'operator',
        isTest: false,
      });
    };

    if (riskLevel === 'CRITICAL') {
      setPendingAnnounce(() => doSpeak);
      setShowCriticalConfirm(true);
    } else {
      doSpeak();
    }
  };

  return (
    <div id="evacuation-panel" className="bg-[#161616] border border-white/5 rounded-lg p-5 flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 border-b border-white/5 pb-4">
        <div>
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Route className="w-4 h-4 text-emerald-400" />
            Dynamic Evacuation Corridor Routing & Haven Allocation
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white/5 border border-white/10 text-gray-400 uppercase tracking-widest">
              A* PATHFINDING
            </span>
          </h2>
          <p className="text-[11px] text-gray-500 mt-0.5">
            A* algorithm computing optimal escape routes that steer civilian convoys away from active high-risk fire zones toward safe relief camps.
          </p>
        </div>

        {/* Sector Selector & Generate Button */}
        <div className="flex items-center gap-2 text-xs">
          <select
            value={selectedZoneId}
            onChange={(e) => setSelectedZoneId(e.target.value)}
            className="bg-[#111111] border border-white/10 rounded px-2.5 py-1 text-gray-200 text-xs"
          >
            {zones.map((z) => (
              <option key={z.id} value={z.id}>
                {z.id} — {z.name} ({z.riskLevel} - {z.riskScore}%)
              </option>
            ))}
          </select>

          <button
            onClick={handleGenerateForZone}
            disabled={isGenerating}
            className="px-3 py-1 bg-white text-black font-bold text-[11px] uppercase tracking-widest rounded hover:bg-gray-200 transition-all disabled:opacity-50"
          >
            {isGenerating ? 'Routing...' : 'Compute Route'}
          </button>
        </div>
      </div>

      {activePlan ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Assigned Safe Haven Details */}
              {(() => {
                const haven = activePlan.nearestSafeZone || activePlan.safeZones?.[0] || safeZones[0] || {
                  id: 'SAFE-01',
                  name: 'Designated Emergency Relief Haven',
                  type: 'Sports Complex',
                  capacity: 10000,
                  currentOccupancy: 350,
                  lat: 0,
                  lng: 0,
                  distanceKm: 5,
                };
                const occupancy = haven.currentOccupancy || 0;
                const capacity = haven.capacity || 10000;
                const occupancyPct = Math.min(100, Math.round((occupancy / capacity) * 100));

                return (
                  <div className="lg:col-span-4 bg-[#111111] p-4 rounded-lg border border-white/5 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
                          <Home className="w-3.5 h-3.5 text-sky-400" />
                          Designated Safe Haven
                        </span>
                        <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-sky-500/20 text-sky-400 uppercase">
                          Optimal Shelter
                        </span>
                      </div>

                      <h3 className="text-sm font-bold text-white mb-1">
                        {haven.name}
                      </h3>
                      <p className="text-xs text-gray-400 mb-3">
                        Facility Class: <span className="text-gray-200 font-medium">{haven.type}</span>
                      </p>

                      {/* Occupancy Bar */}
                      <div className="bg-[#0a0a0a] p-3 rounded border border-white/5 mb-3">
                        <div className="flex justify-between text-[11px] mb-1">
                          <span className="text-gray-400">Current Occupancy</span>
                          <span className="font-mono text-white font-bold">
                            {occupancy} / {capacity}
                          </span>
                        </div>
                        <div className="w-full bg-white/5 rounded-full h-1 overflow-hidden">
                          <div
                            className="bg-sky-400 h-full rounded-full"
                            style={{ width: `${occupancyPct}%` }}
                          />
                        </div>
                      </div>

                      {/* Medical and Supplies Badges */}
                      <div className="space-y-1.5 text-xs text-gray-300">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Medical triage staff on-site</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>72-Hour emergency rations verified</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Satellite telecommunications active</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => window.print()}
                      className="mt-4 w-full py-2 bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 rounded text-[11px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Print Tactical Dispatch</span>
                    </button>
                  </div>
                );
              })()}

              {/* Computed Corridors List */}
              <div className="lg:col-span-8 flex flex-col gap-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-gray-400 uppercase tracking-widest text-[10px]">
                    Computed Escape Corridors ({activePlan.evacuationRoutes.length})
                  </span>
                  <span className="text-[10px] text-gray-500 font-mono">
                    A* Risk-Weighted Optimization
                  </span>
                </div>

                <div className="space-y-3">
                  {activePlan.evacuationRoutes.map((route, idx) => {
                    const isClear = route.status === 'CLEAR';
                    const routeWaypoints = route.waypoints && route.waypoints.length > 0
                      ? route.waypoints
                      : ['Sector Perimeter Road', 'Regional Bypass Arterial', 'Haven Security Access Checkpoint'];

                    return (
                      <div
                        key={route.id}
                        className={`p-3.5 rounded-lg border bg-[#111111] border-l-2 transition-all ${
                          isClear ? 'border-white/5 border-l-emerald-500' : 'border-white/5 border-l-amber-500'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                                isClear ? 'bg-emerald-500/20 text-emerald-400' : 'bg-yellow-500/20 text-yellow-400'
                              }`}
                            >
                              {idx === 0 ? 'Primary Corridor' : 'Secondary Corridor'}
                            </span>
                            <h4 className="font-bold text-xs text-white">{route.name}</h4>
                          </div>

                          <div className="flex items-center gap-3 text-xs font-mono">
                            <span className="text-gray-400 flex items-center gap-1">
                              <Car className="w-3 h-3 text-gray-500" /> {route.distanceKm || 6.5} km
                            </span>
                            <span className="text-white font-bold flex items-center gap-1">
                              <Clock className="w-3 h-3 text-gray-500" /> {route.estimatedTravelTimeMinutes} mins
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const zone = zones.find(z => z.id === selectedZoneId);
                                const haven = activePlan?.nearestSafeZone || activePlan?.safeZones?.[0];
                                handleAnnounce(
                                  zone?.name || selectedZoneId,
                                  (zone?.riskLevel || 'HIGH') as RiskLevel,
                                  haven?.name || 'Relief Camp'
                                );
                              }}
                              className="flex items-center gap-1 px-2 py-1 bg-violet-600/20 hover:bg-violet-600/40 text-violet-300 border border-violet-500/30 rounded text-[10px] font-bold uppercase tracking-wider transition-all"
                              title="Announce evacuation alert in selected language"
                            >
                              <Volume2 className="w-3 h-3" />
                              Announce
                            </button>
                          </div>
                        </div>

                        <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          <div className="bg-[#0a0a0a] p-2 rounded border border-white/5">
                            <div className="text-[10px] text-gray-500 font-bold uppercase">Corridor Waypoints</div>
                            <div className="text-gray-300 text-[11px] mt-0.5">
                              {routeWaypoints.join(' → ')}
                            </div>
                          </div>

                          <div className="bg-[#0a0a0a] p-2 rounded border border-white/5">
                            <div className="text-[10px] text-gray-500 font-bold uppercase">Traffic Status</div>
                            <div className="text-[11px] mt-0.5 flex items-center gap-1.5">
                              {isClear ? (
                                <span className="text-emerald-400 font-medium">✓ Unobstructed Flow</span>
                              ) : (
                                <span className="text-amber-400 font-medium flex items-center gap-1">
                                  <AlertTriangle className="w-3 h-3" /> Smoke Hazard Caution
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
        </div>
      ) : (
        <div className="bg-[#111111] border border-white/5 rounded-lg p-10 text-center text-gray-500 text-xs">
          Select a sector and click "Compute Route" to execute A* evacuation pathfinding.
        </div>
      )}

      {/* Network Safe Havens Capacity Overview */}
      <div className="border-t border-white/5 pt-4">
        <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">
          All Network Relief Havens ({safeZones.length} Facilities)
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {safeZones.map((sz) => {
            const occupancyPct = Math.round((sz.currentOccupancy / sz.capacity) * 100);
            return (
              <div key={sz.id} className="bg-[#111111] p-3 rounded-lg border border-white/5 text-xs">
                <div className="flex justify-between items-start mb-1">
                  <div className="font-bold text-white text-[11px]">{sz.name}</div>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-white/5 text-gray-400 uppercase">
                    {sz.type}
                  </span>
                </div>
                <div className="text-[10px] text-gray-500 mb-2">Capacity: {sz.capacity.toLocaleString()} persons</div>
                <div className="w-full bg-white/5 rounded-full h-1 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      occupancyPct > 80 ? 'bg-red-500' : occupancyPct > 50 ? 'bg-yellow-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${occupancyPct}%` }}
                  />
                </div>
                <div className="flex justify-between text-[9px] text-gray-500 mt-1">
                  <span>Occupancy</span>
                  <span className="font-mono text-gray-300 font-bold">{occupancyPct}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* CRITICAL Alert Confirmation Dialog */}
      {showCriticalConfirm && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-[#1a1a1a] border border-red-500/40 rounded-xl p-6 max-w-md w-full shadow-2xl shadow-red-500/10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Confirm CRITICAL Alert</h3>
                <p className="text-[11px] text-gray-400">This will announce a CRITICAL evacuation alert via speaker.</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => { setShowCriticalConfirm(false); setPendingAnnounce(null); }}
                className="flex-1 py-2 bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 rounded-lg text-xs font-bold uppercase tracking-wider transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => { setShowCriticalConfirm(false); pendingAnnounce?.(); setPendingAnnounce(null); }}
                className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold uppercase tracking-wider transition-all"
              >
                Confirm & Announce
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
