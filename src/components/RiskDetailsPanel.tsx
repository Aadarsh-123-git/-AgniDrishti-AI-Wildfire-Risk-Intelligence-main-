import React from 'react';
import {
  Thermometer,
  Droplets,
  Wind,
  CloudRain,
  Leaf,
  Mountain,
  Users,
  Building2,
  GraduationCap,
  Flame,
  ShieldAlert,
  Sliders,
  Sparkles,
  MapPin,
} from 'lucide-react';
import { GeographicZone } from '../types';
import { ExplainableRiskPanel } from './ExplainableRiskPanel';

interface Props {
  zone: GeographicZone | null;
  onOpenSimulatorForZone: (zone: GeographicZone) => void;
  onOpenEvacuationForZone: (zoneId: string) => void;
  onOpenAIAdvisorForZone?: (zoneId: string) => void;
}

export const RiskDetailsPanel: React.FC<Props> = ({
  zone,
  onOpenSimulatorForZone,
  onOpenEvacuationForZone,
  onOpenAIAdvisorForZone,
}) => {
  if (!zone) {
    return (
      <div
        id="risk-details-panel"
        className="bg-[#161616] rounded-lg border border-white/5 p-6 flex flex-col items-center justify-center text-center h-full min-h-[420px]"
      >
        <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-gray-500 mb-3 border border-white/10">
          <MapPin className="w-5 h-5" />
        </div>
        <h3 className="text-xs font-bold uppercase tracking-widest text-gray-300">No Sector Selected</h3>
        <p className="text-[11px] text-gray-500 max-w-[220px] mt-1">
          Click any grid polygon on the GIS map to inspect live ML predictions and meteorological telemetry.
        </p>
      </div>
    );
  }

  const isCritical = zone.riskLevel === 'CRITICAL';
  const isHigh = zone.riskLevel === 'HIGH';

  return (
    <div
      id="risk-details-panel"
      className="bg-[#161616] rounded-lg border border-white/5 p-4 flex flex-col gap-4 text-xs text-gray-200"
    >
      {/* Header with Zone ID & Actions */}
      <div className="flex items-center justify-between border-b border-white/5 pb-3">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">
            Sector Telemetry
          </h3>
          <p className="text-sm font-bold text-white mt-0.5">
            {zone.id} <span className="text-xs font-normal text-gray-500">({zone.name})</span>
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
              isCritical
                ? 'bg-red-500/20 text-red-500 border border-red-500/30'
                : isHigh
                ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                : 'bg-green-500/20 text-green-400 border border-green-500/30'
            }`}
          >
            {zone.riskLevel}
          </span>

          <button
            onClick={() => onOpenSimulatorForZone(zone)}
            className="p-1.5 bg-white/5 hover:bg-white/10 text-amber-400 border border-white/10 rounded transition-all"
            title="Simulate weather change"
          >
            <Sliders className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onOpenEvacuationForZone(zone.id)}
            className="p-1.5 bg-white/5 hover:bg-white/10 text-sky-400 border border-white/10 rounded transition-all"
            title="Open Evacuation Plan"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
          </button>
          {onOpenAIAdvisorForZone && (
            <button
              onClick={() => onOpenAIAdvisorForZone(zone.id)}
              className="p-1.5 bg-white text-black hover:bg-gray-200 rounded transition-all"
              title="AI Commander Advisory"
            >
              <Sparkles className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Sleek Hero Risk Score (from Sleek design) */}
      <div className="flex flex-col items-center py-2 bg-[#111111] rounded-lg border border-white/5">
        <div className="text-5xl font-light mb-0.5 text-white tracking-tight">
          {zone.riskScore}
          <span className="text-xl text-gray-500">%</span>
        </div>
        <p className="text-[10px] text-gray-500 uppercase tracking-widest">
          Prediction Probability (Random Forest)
        </p>
      </div>

      {/* Atmospheric & Meteorological Telemetry with Slim Bars */}
      <div className="space-y-2.5 bg-[#111111] p-3 rounded-lg border border-white/5">
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">
          Atmospheric Telemetry
        </p>

        {/* Temperature */}
        <div>
          <div className="flex items-center justify-between text-[11px] mb-1">
            <span className="text-gray-400 flex items-center gap-1.5">
              <Thermometer className="w-3.5 h-3.5 text-red-500" /> Temperature
            </span>
            <span className="font-bold text-white">{zone.weather.temperature}°C</span>
          </div>
          <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full bg-red-500"
              style={{ width: `${Math.min(100, (zone.weather.temperature / 50) * 100)}%` }}
            />
          </div>
        </div>

        {/* Humidity */}
        <div>
          <div className="flex items-center justify-between text-[11px] mb-1">
            <span className="text-gray-400 flex items-center gap-1.5">
              <Droplets className="w-3.5 h-3.5 text-blue-400" /> Relative Humidity
            </span>
            <span className="font-bold text-white">{zone.weather.humidity}%</span>
          </div>
          <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full bg-orange-500"
              style={{ width: `${Math.max(5, 100 - zone.weather.humidity)}%` }}
            />
          </div>
        </div>

        {/* Wind Speed */}
        <div>
          <div className="flex items-center justify-between text-[11px] mb-1">
            <span className="text-gray-400 flex items-center gap-1.5">
              <Wind className="w-3.5 h-3.5 text-sky-400" /> Wind Velocity
            </span>
            <span className="font-bold text-white">{zone.weather.windSpeed} km/h ({zone.weather.windDirection})</span>
          </div>
          <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full bg-yellow-500"
              style={{ width: `${Math.min(100, (zone.weather.windSpeed / 60) * 100)}%` }}
            />
          </div>
        </div>

        {/* Precipitation */}
        <div>
          <div className="flex items-center justify-between text-[11px] mb-1">
            <span className="text-gray-400 flex items-center gap-1.5">
              <CloudRain className="w-3.5 h-3.5 text-indigo-400" /> Rainfall (24h)
            </span>
            <span className="font-bold text-white">{zone.weather.rainfall} mm</span>
          </div>
          <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500"
              style={{ width: `${Math.min(100, (zone.weather.rainfall / 30) * 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Fuel, Vegetation & Human Exposure Summary */}
      <div className="grid grid-cols-2 gap-2 text-[11px]">
        <div className="bg-[#111111] p-2.5 rounded-lg border border-white/5">
          <div className="flex items-center gap-1.5 text-gray-500 mb-1">
            <Leaf className="w-3 h-3 text-emerald-400" />
            <span className="uppercase text-[9px] font-bold tracking-wider">NDVI Moisture</span>
          </div>
          <div className="font-bold text-white text-sm">{zone.ndvi}</div>
          <div className="text-[10px] text-amber-400 mt-0.5">{zone.vegetationCondition}</div>
        </div>

        <div className="bg-[#111111] p-2.5 rounded-lg border border-white/5">
          <div className="flex items-center gap-1.5 text-gray-500 mb-1">
            <Users className="w-3 h-3 text-blue-400" />
            <span className="uppercase text-[9px] font-bold tracking-wider">Exposed Pop.</span>
          </div>
          <div className="font-bold text-white text-sm">{zone.population.toLocaleString()}</div>
          <div className="text-[10px] text-gray-400 mt-0.5">{zone.settlements} settlements</div>
        </div>
      </div>

      {/* Priority Recommendation Callout */}
      {isCritical ? (
        <div className="p-3 bg-red-950/20 border border-red-900/40 rounded-lg">
          <p className="text-[10px] font-bold text-red-500 uppercase mb-1">🚨 Priority Recommendation</p>
          <p className="text-[11px] leading-relaxed text-gray-300">
            Initiate primary assessment of {zone.id}. Vegetation NDVI at {zone.ndvi} (Severe Dryness). Wind gusts at {zone.weather.windSpeed} km/h toward {zone.weather.windDirection}.
          </p>
        </div>
      ) : isHigh ? (
        <div className="p-3 bg-amber-950/20 border border-amber-900/40 rounded-lg">
          <p className="text-[10px] font-bold text-amber-500 uppercase mb-1">⚠️ Active Watch Advisory</p>
          <p className="text-[11px] leading-relaxed text-gray-300">
            Maintain thermal patrol over {zone.id}. Prepare secondary firebreaks along perimeter boundaries.
          </p>
        </div>
      ) : null}

      {/* Explainable AI Attribution Panel */}
      <ExplainableRiskPanel zone={zone} />
    </div>
  );
};
