import React, { useState } from 'react';
import {
  NasaFireDetection,
  NasaSatelliteStats,
  RegionConfig,
} from '../types';
import {
  Satellite,
  Flame,
  Radio,
  RefreshCw,
  Sun,
  Moon,
  Zap,
  ExternalLink,
  ShieldCheck,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Compass,
} from 'lucide-react';

interface Props {
  nasaLiveFires: NasaFireDetection[];
  stats: NasaSatelliteStats | null;
  region: RegionConfig | null;
  onRefresh: () => void;
  isLoading: boolean;
  onSelectFire?: (detection: NasaFireDetection) => void;
}

export const NasaSatellitePanel: React.FC<Props> = ({
  nasaLiveFires,
  stats,
  region,
  onRefresh,
  isLoading,
  onSelectFire,
}) => {
  const [filterSatellite, setFilterSatellite] = useState<string>('ALL');
  const [filterDayNight, setFilterDayNight] = useState<'ALL' | 'D' | 'N'>('ALL');
  const [filterSeverity, setFilterSeverity] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'frp' | 'brightness' | 'time'>('frp');

  // Filter logic
  const filteredDetections = nasaLiveFires.filter((fire) => {
    if (filterSatellite !== 'ALL' && !fire.satellite.includes(filterSatellite)) return false;
    if (filterDayNight !== 'ALL' && fire.dayNight !== filterDayNight) return false;
    if (filterSeverity !== 'ALL' && fire.severity !== filterSeverity) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchId = fire.id.toLowerCase().includes(q);
      const matchSat = fire.satellite.toLowerCase().includes(q);
      const matchCoord = `${fire.latitude},${fire.longitude}`.includes(q);
      if (!matchId && !matchSat && !matchCoord) return false;
    }
    return true;
  });

  // Sort logic
  const sortedDetections = [...filteredDetections].sort((a, b) => {
    if (sortBy === 'frp') return b.frp - a.frp;
    if (sortBy === 'brightness') return b.brightness - a.brightness;
    return b.acqTime.localeCompare(a.acqTime);
  });

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-red-500/20 text-red-400 border-red-500/40';
      case 'HIGH':
        return 'bg-orange-500/20 text-orange-400 border-orange-500/40';
      case 'MODERATE':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40';
      default:
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40';
    }
  };

  return (
    <div className="w-full h-full bg-[#0e0e0e] border border-white/10 rounded-xl p-6 overflow-y-auto space-y-6 shadow-2xl">
      {/* Top Banner: NASA Satellite Telemetry System */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between bg-gradient-to-r from-red-950/40 via-neutral-900/60 to-black p-5 rounded-xl border border-red-500/30 gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-500 satellite-live-dot" />
            <h2 className="text-lg font-black text-white uppercase tracking-wider flex items-center gap-2">
              <Satellite className="w-5 h-5 text-red-400" />
              NASA FIRMS Live Satellite Fire Telemetry
            </h2>
            <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] font-bold rounded-full uppercase">
              Key Authenticated
            </span>
          </div>
          <p className="text-xs text-gray-300">
            Real-time optical & thermal telemetry ingest via NASA EOSDIS (Earth Observing System Data and Information System).
            Active monitoring bounding box for <span className="text-white font-bold">{region?.name || 'Active Region'}</span>.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full lg:w-auto justify-end">
          <div className="text-right font-mono text-[11px] hidden sm:block">
            <div className="text-gray-400 text-[10px]">ACTIVE MAP_KEY</div>
            <div className="text-emerald-400 font-bold">7535...4169</div>
          </div>

          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg text-xs shadow-lg shadow-red-600/30 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Poll Satellites</span>
          </button>
        </div>
      </div>

      {/* Real-time KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Card 1 */}
        <div className="bg-[#141414] border border-white/10 p-3.5 rounded-lg space-y-1 shadow-lg">
          <div className="text-[10px] uppercase font-bold text-gray-400 flex items-center justify-between">
            <span>Live Hotspots</span>
            <Flame className="w-3.5 h-3.5 text-red-400" />
          </div>
          <div className="text-2xl font-black text-white">{nasaLiveFires.length}</div>
          <div className="text-[10px] text-gray-400">Near real-time 375m pixels</div>
        </div>

        {/* Card 2 */}
        <div className="bg-[#141414] border border-white/10 p-3.5 rounded-lg space-y-1 shadow-lg">
          <div className="text-[10px] uppercase font-bold text-gray-400 flex items-center justify-between">
            <span>Peak FRP</span>
            <Zap className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400">
            {stats?.maxFrp || 0} <span className="text-xs text-gray-400 font-normal">MW</span>
          </div>
          <div className="text-[10px] text-gray-400">Fire Radiative Power</div>
        </div>

        {/* Card 3 */}
        <div className="bg-[#141414] border border-white/10 p-3.5 rounded-lg space-y-1 shadow-lg">
          <div className="text-[10px] uppercase font-bold text-gray-400 flex items-center justify-between">
            <span>Avg Brightness</span>
            <Sun className="w-3.5 h-3.5 text-orange-400" />
          </div>
          <div className="text-2xl font-black text-white">
            {stats?.avgBrightnessKelvin || 0} <span className="text-xs text-gray-400 font-normal">K</span>
          </div>
          <div className="text-[10px] text-gray-400">
            ≈ {stats?.avgBrightnessKelvin ? Math.round(stats.avgBrightnessKelvin - 273.15) : 0}°C thermal I-4
          </div>
        </div>

        {/* Card 4 */}
        <div className="bg-[#141414] border border-white/10 p-3.5 rounded-lg space-y-1 shadow-lg">
          <div className="text-[10px] uppercase font-bold text-gray-400 flex items-center justify-between">
            <span>High Confidence</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400">
            {stats?.highConfidenceCount || 0}
          </div>
          <div className="text-[10px] text-gray-400">Verified thermal anomalies</div>
        </div>

        {/* Card 5 */}
        <div className="bg-[#141414] border border-white/10 p-3.5 rounded-lg space-y-1 shadow-lg">
          <div className="text-[10px] uppercase font-bold text-gray-400 flex items-center justify-between">
            <span>Day / Night</span>
            <Moon className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <div className="text-xl font-black text-white">
            <span className="text-amber-400">{stats?.dayPasses || 0}D</span> /{' '}
            <span className="text-blue-400">{stats?.nightPasses || 0}N</span>
          </div>
          <div className="text-[10px] text-gray-400">Orbital overpass ratio</div>
        </div>

        {/* Card 6 */}
        <div className="bg-[#141414] border border-white/10 p-3.5 rounded-lg space-y-1 shadow-lg">
          <div className="text-[10px] uppercase font-bold text-gray-400 flex items-center justify-between">
            <span>Constellation</span>
            <Radio className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <div className="text-sm font-bold text-white leading-tight">VIIRS + MODIS</div>
          <div className="text-[10px] text-gray-400">SNPP, NOAA-20, Aqua, Terra</div>
        </div>
      </div>

      {/* Filter and Control Bar */}
      <div className="bg-[#141414] p-4 rounded-xl border border-white/10 flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
        {/* Search */}
        <div className="relative w-full md:w-64">
          <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search ID, Satellite, Coord..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-black/50 border border-white/10 rounded-lg pl-9 pr-3 py-1.5 text-gray-200 placeholder-gray-500 focus:outline-none focus:border-red-500/50"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Satellite Filter */}
          <select
            value={filterSatellite}
            onChange={(e) => setFilterSatellite(e.target.value)}
            className="bg-black/50 border border-white/10 rounded-lg px-2.5 py-1.5 text-gray-200 outline-none cursor-pointer"
          >
            <option value="ALL">All Constellations</option>
            <option value="Suomi NPP">Suomi NPP (VIIRS)</option>
            <option value="NOAA-20">NOAA-20 (VIIRS)</option>
            <option value="NOAA-21">NOAA-21 (VIIRS)</option>
            <option value="Terra">Terra (MODIS)</option>
            <option value="Aqua">Aqua (MODIS)</option>
          </select>

          {/* Day / Night Filter */}
          <select
            value={filterDayNight}
            onChange={(e) => setFilterDayNight(e.target.value as any)}
            className="bg-black/50 border border-white/10 rounded-lg px-2.5 py-1.5 text-gray-200 outline-none cursor-pointer"
          >
            <option value="ALL">All Passes (Day/Night)</option>
            <option value="D">☀️ Day Passes Only</option>
            <option value="N">🌙 Night Passes Only</option>
          </select>

          {/* Severity Filter */}
          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
            className="bg-black/50 border border-white/10 rounded-lg px-2.5 py-1.5 text-gray-200 outline-none cursor-pointer"
          >
            <option value="ALL">All Severity Tiers</option>
            <option value="CRITICAL">Critical Severity</option>
            <option value="HIGH">High Severity</option>
            <option value="MODERATE">Moderate Severity</option>
            <option value="LOW">Low Severity</option>
          </select>

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-black/50 border border-white/10 rounded-lg px-2.5 py-1.5 text-gray-200 outline-none cursor-pointer"
          >
            <option value="frp">Sort by Radiative Power (MW)</option>
            <option value="brightness">Sort by Thermal Brightness (K)</option>
            <option value="time">Sort by Acquisition Time</option>
          </select>
        </div>
      </div>

      {/* Detection Table */}
      <div className="bg-[#141414] border border-white/10 rounded-xl overflow-hidden shadow-xl">
        <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-red-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-white">
              NASA Real-Time Detection Telemetry Log ({sortedDetections.length} records)
            </h3>
          </div>
          <div className="text-[10px] text-gray-400 font-mono">
            {stats?.lastSync ? `Last Ingest: ${new Date(stats.lastSync).toLocaleTimeString()}` : ''}
          </div>
        </div>

        <div className="overflow-x-auto max-h-[420px]">
          <table className="w-full text-left text-xs">
            <thead className="bg-black/60 text-gray-400 text-[10px] uppercase font-bold sticky top-0 z-10">
              <tr>
                <th className="px-4 py-2.5">Detection ID</th>
                <th className="px-4 py-2.5">Satellite / Sensor</th>
                <th className="px-4 py-2.5">Coordinates</th>
                <th className="px-4 py-2.5">FRP (MW)</th>
                <th className="px-4 py-2.5">Brightness Temp</th>
                <th className="px-4 py-2.5">Pass / Time</th>
                <th className="px-4 py-2.5">Confidence</th>
                <th className="px-4 py-2.5">Severity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-mono text-[11px]">
              {sortedDetections.length > 0 ? (
                sortedDetections.map((fire) => (
                  <tr
                    key={fire.id}
                    className="hover:bg-white/5 transition-all text-gray-300"
                  >
                    <td className="px-4 py-2.5 font-bold text-white">
                      {fire.id.substring(fire.id.lastIndexOf('-') - 10)}
                    </td>
                    <td className="px-4 py-2.5 text-blue-300">
                      <div className="font-sans font-semibold text-white">{fire.satellite}</div>
                      <div className="text-[10px] text-gray-400">{fire.instrument} (375m)</div>
                    </td>
                    <td className="px-4 py-2.5 text-gray-400">
                      {fire.latitude.toFixed(4)}°, {fire.longitude.toFixed(4)}°
                    </td>
                    <td className="px-4 py-2.5 font-bold text-amber-400">
                      {fire.frp} MW
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="text-white font-bold">{Math.round(fire.brightness)} K</span>
                      <span className="text-[10px] text-gray-500 ml-1">
                        ({Math.round(fire.brightness - 273.15)}°C)
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-gray-300 font-sans">
                      <div className="flex items-center gap-1 font-mono text-[10px]">
                        {fire.dayNight === 'D' ? (
                          <span className="text-amber-400 flex items-center gap-0.5">☀️ Day</span>
                        ) : (
                          <span className="text-blue-400 flex items-center gap-0.5">🌙 Night</span>
                        )}
                        <span>•</span>
                        <span>{fire.timestampFormatted}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="text-emerald-400 font-bold">
                        {fire.confidenceScore}% ({fire.confidence})
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`px-2 py-0.5 text-[9px] font-extrabold uppercase rounded border ${getSeverityBadge(
                          fire.severity
                        )}`}
                      >
                        {fire.severity}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-gray-500 font-sans">
                    <Satellite className="w-8 h-8 mx-auto text-gray-600 mb-2" />
                    <p className="font-medium text-gray-400">No active fire detections matching the current filter parameters.</p>
                    <p className="text-xs text-gray-600 mt-1">Satellite swath scanning is active across the region.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sensor Architecture & Reference Callout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-gray-300">
        <div className="bg-[#141414] p-4 rounded-xl border border-white/10 space-y-2">
          <h4 className="font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Radio className="w-4 h-4 text-red-400" />
            VIIRS 375m & MODIS Thermal Band Analysis
          </h4>
          <p className="text-gray-400 leading-relaxed text-[11px]">
            The Visible Infrared Imaging Radiometer Suite (VIIRS) aboard the Suomi NPP and NOAA-20/21 polar satellites utilizes the 375m I-4 (3.9 μm) thermal band and I-5 (11.45 μm) band to detect small surface fires, dry vegetation flare-ups, and active crown fires hours before standard optical satellites.
          </p>
        </div>

        <div className="bg-[#141414] p-4 rounded-xl border border-white/10 space-y-2">
          <h4 className="font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" />
            Fire Radiative Power (FRP) Metric
          </h4>
          <p className="text-gray-400 leading-relaxed text-[11px]">
            FRP measures the radiant energy emitted per unit time (in Megawatts, MW). In WildfireAI, FRP is fed into the Random Forest ML pipeline to calibrate combustible biomass consumption rates and propagate immediate evacuation triggers downwind.
          </p>
        </div>
      </div>
    </div>
  );
};
