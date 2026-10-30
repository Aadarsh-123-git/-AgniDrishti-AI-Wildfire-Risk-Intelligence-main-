import React from 'react';
import {
  Activity,
  Flame,
  MapPin,
  RefreshCw,
  Sliders,
  ShieldAlert,
  BrainCircuit,
  Sparkles,
  Users,
  Route,
  Satellite,
  Volume2,
} from 'lucide-react';
import { RegionConfig } from '../types';

interface Props {
  activeRegion: RegionConfig | null;
  availableRegions: RegionConfig[];
  onSelectRegion: (regionId: string) => void;
  onRefresh: () => void;
  isLoading: boolean;
  activeAlertsCount: number;
  criticalCount: number;
  onOpenSimulator: () => void;
  onOpenMLModal: () => void;
  onOpenAlerts: () => void;
  onOpenAIAdvisor?: () => void;
  activeTab: 'map' | 'nasa' | 'hotspots' | 'population' | 'evacuation' | 'alerts' | 'voice';
  setActiveTab: (tab: 'map' | 'nasa' | 'hotspots' | 'population' | 'evacuation' | 'alerts' | 'voice') => void;
  nasaDetectionsCount?: number;
}

export const DashboardHeader: React.FC<Props> = ({
  activeRegion,
  availableRegions,
  onSelectRegion,
  onRefresh,
  isLoading,
  activeAlertsCount,
  criticalCount,
  onOpenSimulator,
  onOpenMLModal,
  onOpenAlerts,
  onOpenAIAdvisor,
  activeTab,
  setActiveTab,
  nasaDetectionsCount = 0,
}) => {
  return (
    <header
      id="dashboard-header"
      className="bg-[#111111] border-b border-white/10 sticky top-0 z-30 flex flex-col shrink-0"
    >
      {/* Tier 1: Main Brand, Telemetry Status & Action Buttons */}
      <div className="flex flex-wrap items-center justify-between px-6 py-2.5 gap-3 border-b border-white/5">
        {/* Left: Brand Identity */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-red-600 rounded-lg flex items-center justify-center text-lg shadow-lg shadow-red-600/30 text-white font-bold shrink-0">
            🔥
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-black tracking-tight text-white">
                WildfireAI
              </h1>
              <span className="text-[10px] font-mono px-1.5 py-0.2 bg-white/10 rounded text-gray-400">
                v2.1
              </span>
            </div>
            <p className="text-[10px] text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
              <span>NASA FIRMS Telemetry</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            </p>
          </div>
        </div>

        {/* Center: System Mode Badges */}
        <div className="flex items-center gap-2 text-xs">
          <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 bg-white/5 border border-white/10 rounded-md">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[11px] font-semibold text-gray-300">STATIC SPARK MODE</span>
          </div>

          <div
            id="demo-mode-badge"
            className="group relative cursor-pointer flex items-center gap-1 px-2.5 py-1 bg-amber-500/10 border border-amber-500/30 hover:border-amber-400 rounded-md text-[11px] font-bold text-amber-400 uppercase tracking-wider transition-all"
          >
            <span>⚡ Demo Mode (Free Tier)</span>
            <div className="hidden group-hover:block group-focus:block absolute top-full left-0 mt-2 w-72 p-3 bg-[#181818] border border-amber-500/40 rounded-lg shadow-2xl text-left z-50 normal-case">
              <div className="text-xs font-bold text-amber-300 mb-1 flex items-center gap-1.5">
                <span>Free Spark Hosting Limits</span>
              </div>
              <ul className="text-[11px] text-gray-300 space-y-1.5">
                <li>• <strong className="text-emerald-400">Random Forest ML:</strong> Running 100% in-browser</li>
                <li>• <strong className="text-emerald-400">Live Weather:</strong> Direct Open-Meteo API</li>
                <li>• <strong className="text-emerald-400">Voice Alerts:</strong> Browser Web Speech API active</li>
                <li>• <strong className="text-amber-400">Gemini AI Advisor:</strong> Pre-computed rule matrix</li>
                <li>• <strong className="text-amber-400">NASA FIRMS:</strong> Simulated satellite telemetry</li>
                <li>• <strong className="text-red-400">Server MP3 IVR:</strong> Disabled on static host</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Right: Region Selector & Command Actions */}
        <div className="flex items-center gap-2.5">
          {/* Location Dropdown */}
          <div className="flex items-center gap-1.5 bg-[#161616] border border-white/10 rounded-lg px-3 py-1.5 text-xs">
            <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0" />
            <select
              id="region-select"
              aria-label="Select Monitored Region"
              value={activeRegion?.id || 'nagpur-maharashtra'}
              onChange={(e) => onSelectRegion(e.target.value)}
              className="bg-transparent text-gray-200 border-none outline-none cursor-pointer text-xs font-semibold uppercase pr-1"
            >
              {availableRegions.map((reg) => (
                <option key={reg.id} value={reg.id} className="bg-[#111111] text-gray-100">
                  {reg.name}, {reg.state}
                </option>
              ))}
            </select>
          </div>

          {/* Action Buttons */}
          <button
            id="btn-open-simulator"
            onClick={onOpenSimulator}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-gray-200 border border-white/10 rounded-lg text-xs font-medium transition-all"
            title="Interactive What-If Scenario Sandbox"
          >
            <Sliders className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Simulator</span>
          </button>

          <button
            id="btn-open-ml-modal"
            onClick={onOpenMLModal}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-gray-200 border border-white/10 rounded-lg text-xs font-medium transition-all"
            title="Inspect ML Architecture"
          >
            <BrainCircuit className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden sm:inline">ML Model</span>
          </button>

          {onOpenAIAdvisor && (
            <button
              id="btn-open-ai-advisor"
              onClick={onOpenAIAdvisor}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-black hover:bg-gray-200 rounded-lg text-xs font-bold uppercase tracking-wider transition-all shadow-md"
              title="Tactical AI Incident Advisor"
            >
              <Sparkles className="w-3.5 h-3.5 text-black" />
              <span>AI Advisor</span>
            </button>
          )}

          <button
            id="btn-refresh-data"
            onClick={onRefresh}
            disabled={isLoading}
            className="p-2 bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 rounded-lg transition-all disabled:opacity-50"
            title="Refresh GIS & ML Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-red-500' : ''}`} />
          </button>
        </div>
      </div>

      {/* Tier 2: Dedicated, Full-Width High-Visibility Navigation Tabs */}
      <div className="px-6 py-2 bg-[#0e0e0e] flex items-center justify-start gap-2 overflow-x-auto scrollbar-none">
        {/* Tab 1: GIS Risk Map */}
        <button
          id="tab-btn-map"
          onClick={() => setActiveTab('map')}
          className={`px-4 py-2 rounded-lg transition-all whitespace-nowrap flex items-center gap-2 text-xs font-bold tracking-wide cursor-pointer ${
            activeTab === 'map'
              ? 'bg-white text-black shadow-lg shadow-white/10'
              : 'bg-[#181818] text-gray-300 hover:text-white hover:bg-[#222222] border border-white/5'
          }`}
        >
          <Activity className={`w-4 h-4 ${activeTab === 'map' ? 'text-black' : 'text-emerald-400'}`} />
          <span>GIS Risk Map</span>
        </button>

        {/* Tab 2: NASA Satellites */}
        <button
          id="tab-btn-nasa"
          onClick={() => setActiveTab('nasa')}
          className={`px-4 py-2 rounded-lg transition-all whitespace-nowrap flex items-center gap-2 text-xs font-bold tracking-wide cursor-pointer ${
            activeTab === 'nasa'
              ? 'bg-red-600 text-white shadow-lg shadow-red-600/30'
              : 'bg-[#181818] text-gray-300 hover:text-white hover:bg-[#222222] border border-white/5'
          }`}
        >
          <Satellite className={`w-4 h-4 ${activeTab === 'nasa' ? 'text-white' : 'text-red-400'}`} />
          <span>NASA Satellites</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-black ${
              activeTab === 'nasa'
                ? 'bg-black/40 text-white'
                : 'bg-red-500/20 text-red-400 border border-red-500/40'
            }`}
          >
            {nasaDetectionsCount}
          </span>
        </button>

        {/* Tab 3: Hotspots */}
        <button
          id="tab-btn-hotspots"
          onClick={() => setActiveTab('hotspots')}
          className={`px-4 py-2 rounded-lg transition-all whitespace-nowrap flex items-center gap-2 text-xs font-bold tracking-wide cursor-pointer ${
            activeTab === 'hotspots'
              ? 'bg-white text-black shadow-lg shadow-white/10'
              : 'bg-[#181818] text-gray-300 hover:text-white hover:bg-[#222222] border border-white/5'
          }`}
        >
          <Flame className={`w-4 h-4 ${activeTab === 'hotspots' ? 'text-black' : 'text-orange-400'}`} />
          <span>Hotspots (DBSCAN)</span>
        </button>

        {/* Tab 4: Population & Facilities */}
        <button
          id="tab-btn-population"
          onClick={() => setActiveTab('population')}
          className={`px-4 py-2 rounded-lg transition-all whitespace-nowrap flex items-center gap-2 text-xs font-bold tracking-wide cursor-pointer ${
            activeTab === 'population'
              ? 'bg-white text-black shadow-lg shadow-white/10'
              : 'bg-[#181818] text-gray-300 hover:text-white hover:bg-[#222222] border border-white/5'
          }`}
        >
          <Users className={`w-4 h-4 ${activeTab === 'population' ? 'text-black' : 'text-blue-400'}`} />
          <span>Population & Facilities</span>
        </button>

        {/* Tab 5: Evacuation Plan */}
        <button
          id="tab-btn-evacuation"
          onClick={() => setActiveTab('evacuation')}
          className={`px-4 py-2 rounded-lg transition-all whitespace-nowrap flex items-center gap-2 text-xs font-bold tracking-wide cursor-pointer ${
            activeTab === 'evacuation'
              ? 'bg-white text-black shadow-lg shadow-white/10'
              : 'bg-[#181818] text-gray-300 hover:text-white hover:bg-[#222222] border border-white/5'
          }`}
        >
          <Route className={`w-4 h-4 ${activeTab === 'evacuation' ? 'text-black' : 'text-emerald-400'}`} />
          <span>Evacuation Plan</span>
        </button>

        {/* Tab 6: Alerts */}
        <button
          id="tab-btn-alerts"
          onClick={() => setActiveTab('alerts')}
          className={`px-4 py-2 rounded-lg transition-all whitespace-nowrap flex items-center gap-2 text-xs font-bold tracking-wide cursor-pointer relative ${
            activeTab === 'alerts'
              ? 'bg-white text-black shadow-lg shadow-white/10'
              : 'bg-[#181818] text-gray-300 hover:text-white hover:bg-[#222222] border border-white/5'
          }`}
        >
          <ShieldAlert className={`w-4 h-4 ${activeTab === 'alerts' ? 'text-black' : 'text-red-400'}`} />
          <span>Alerts</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
              activeTab === 'alerts'
                ? 'bg-red-500 text-white'
                : 'bg-white/10 text-gray-300'
            }`}
          >
            {activeAlertsCount}
          </span>
          {criticalCount > 0 && (
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping absolute top-1.5 right-1.5" />
          )}
        </button>

        {/* Tab 7: Voice Alerts */}
        <button
          id="tab-btn-voice"
          onClick={() => setActiveTab('voice')}
          className={`px-4 py-2 rounded-lg transition-all whitespace-nowrap flex items-center gap-2 text-xs font-bold tracking-wide cursor-pointer ${
            activeTab === 'voice'
              ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/30'
              : 'bg-[#181818] text-gray-300 hover:text-white hover:bg-[#222222] border border-white/5'
          }`}
        >
          <Volume2 className={`w-4 h-4 ${activeTab === 'voice' ? 'text-white' : 'text-violet-400'}`} />
          <span>Voice Alerts</span>
        </button>
      </div>
    </header>
  );
};
