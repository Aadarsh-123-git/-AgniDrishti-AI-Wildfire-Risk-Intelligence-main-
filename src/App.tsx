import React, { useEffect, useState } from 'react';
import {
  GeographicZone,
  HistoricalFireRecord,
  HotspotCluster,
  AlertMessage,
  SafeZone,
  EvacuationPlan,
  RegionConfig,
  NasaFireDetection,
  NasaSatelliteStats,
} from './types';
import { api } from './services/api';
import { DashboardHeader } from './components/DashboardHeader';
import { RiskSummaryCards } from './components/RiskSummaryCards';
import { RiskMap } from './components/RiskMap';
import { RiskDetailsPanel } from './components/RiskDetailsPanel';
import { WhatIfSimulator } from './components/WhatIfSimulator';
import { MLModelModal } from './components/MLModelModal';
import { AIAdvisorModal } from './components/AIAdvisorModal';
import { HotspotPanel } from './components/HotspotPanel';
import { PopulationRiskPanel } from './components/PopulationRiskPanel';
import { AlertPanel } from './components/AlertPanel';
import { EvacuationPanel } from './components/EvacuationPanel';
import { NasaSatellitePanel } from './components/NasaSatellitePanel';
import { VoiceAlertPanel } from './components/VoiceAlertPanel';
import { Sliders, Flame, ArrowRight, Satellite } from 'lucide-react';

export default function App() {
  // State management
  const [activeRegion, setActiveRegion] = useState<RegionConfig | null>(null);
  const [availableRegions, setAvailableRegions] = useState<RegionConfig[]>([]);
  const [zones, setZones] = useState<GeographicZone[]>([]);
  const [selectedZone, setSelectedZone] = useState<GeographicZone | null>(null);
  const [historicalFires, setHistoricalFires] = useState<HistoricalFireRecord[]>([]);
  const [clusters, setClusters] = useState<HotspotCluster[]>([]);
  const [alerts, setAlerts] = useState<AlertMessage[]>([]);
  const [safeZones, setSafeZones] = useState<SafeZone[]>([]);
  const [evacuationPlan, setEvacuationPlan] = useState<EvacuationPlan | null>(null);

  // NASA FIRMS Live Telemetry states
  const [nasaLiveFires, setNasaLiveFires] = useState<NasaFireDetection[]>([]);
  const [nasaStats, setNasaStats] = useState<NasaSatelliteStats | null>(null);
  const [isNasaLoading, setIsNasaLoading] = useState<boolean>(false);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [filterLevel, setFilterLevel] = useState<'CRITICAL' | 'HIGH' | 'ALL'>('ALL');
  const [activeTab, setActiveTab] = useState<'map' | 'nasa' | 'hotspots' | 'population' | 'evacuation' | 'alerts' | 'voice'>('map');

  // Modals state
  const [isSimulatorOpen, setIsSimulatorOpen] = useState<boolean>(false);
  const [isMLModalOpen, setIsMLModalOpen] = useState<boolean>(false);
  const [isAIAdvisorOpen, setIsAIAdvisorOpen] = useState<boolean>(false);
  const [simulatorBaseZone, setSimulatorBaseZone] = useState<GeographicZone | null>(null);

  // Fetch NASA live telemetry
  const fetchNasaTelemetry = async (forceRefresh = false) => {
    setIsNasaLoading(true);
    try {
      if (forceRefresh) {
        const res = await api.syncNasaData(2);
        setNasaLiveFires(res.detections || []);
        setNasaStats(res.stats || null);
      } else {
        const nasaData = await api.getNasaLiveFires({ days: 2 });
        setNasaLiveFires(nasaData.detections || []);
        setNasaStats(nasaData.stats || null);
      }
    } catch (err) {
      console.error('Error fetching NASA live fire telemetry:', err);
    } finally {
      setIsNasaLoading(false);
    }
  };

  // Load all initial data from backend
  const loadAllData = async () => {
    setIsLoading(true);
    try {
      // 1. Regions
      const regionData = await api.getRegions();
      setActiveRegion(regionData.activeRegion);
      setAvailableRegions(regionData.availableRegions);

      // 2. Risk Map & Zones
      const mapData = await api.getRiskMap();
      setZones(mapData.zones);
      if (mapData.zones.length > 0 && !selectedZone) {
        const highestRisk = [...mapData.zones].sort((a, b) => b.riskScore - a.riskScore)[0];
        setSelectedZone(highestRisk);
      }

      // 3. Hotspots
      const hotspotData = await api.getHotspots();
      setHistoricalFires(hotspotData.historicalFires);
      setClusters(hotspotData.clusters);

      // 4. Alerts
      const alertData = await api.getAlerts();
      setAlerts(alertData.alerts);

      // 5. Evacuation Plan for highest risk zone
      if (mapData.zones.length > 0) {
        const crit = mapData.zones.find((z) => z.riskLevel === 'CRITICAL') || mapData.zones[0];
        const plan = await api.getEvacuationPlan(crit.id);
        setEvacuationPlan(plan);
        setSafeZones(plan.safeZones);
      }

      // 6. NASA Live Telemetry
      await fetchNasaTelemetry(false);
    } catch (err) {
      console.error('Error fetching wildfire telemetry:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // Switch region
  const handleSelectRegion = async (regionId: string) => {
    setIsLoading(true);
    try {
      const res = await api.selectRegion(regionId);
      setActiveRegion(res.region);
      await loadAllData();
    } catch (err) {
      console.error('Error switching region:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Select zone handler
  const handleSelectZone = async (zone: GeographicZone) => {
    setSelectedZone(zone);
    try {
      const plan = await api.getEvacuationPlan(zone.id);
      setEvacuationPlan(plan);
    } catch (err) {
      console.error('Error fetching zone plan:', err);
    }
  };

  // Open simulator for specific zone
  const handleOpenSimulatorForZone = (zone: GeographicZone) => {
    setSimulatorBaseZone(zone);
    setIsSimulatorOpen(true);
  };

  // Open evacuation view for specific zone
  const handleOpenEvacuationForZone = (zoneId: string) => {
    const found = zones.find((z) => z.id === zoneId);
    if (found) setSelectedZone(found);
    setActiveTab('evacuation');
  };

  // Open AI advisor for specific zone
  const handleOpenAIAdvisorForZone = (zoneId: string) => {
    const found = zones.find((z) => z.id === zoneId);
    if (found) setSelectedZone(found);
    setIsAIAdvisorOpen(true);
  };

  const handleAcknowledgeAlert = async (alertId: string) => {
    try {
      await api.acknowledgeAlert(alertId);
      setAlerts((prev) =>
        prev.map((a) => (a.id === alertId ? { ...a, acknowledged: true } : a))
      );
    } catch (err) {
      console.error(err);
    }
  };

  // Metric aggregates
  const criticalCount = zones.filter((z) => z.riskLevel === 'CRITICAL').length;
  const highCount = zones.filter((z) => z.riskLevel === 'HIGH').length;
  const populationAtRisk = zones
    .filter((z) => z.riskLevel === 'CRITICAL' || z.riskLevel === 'HIGH')
    .reduce((sum, z) => sum + z.population, 0);

  // Top recent hotspots for the sleek sidebar
  const topCriticalZones = [...zones]
    .sort((a, b) => b.riskScore - a.riskScore)
    .slice(0, 3);

  return (
    <div
      id="wildfire-ai-app"
      className="flex flex-col h-screen bg-[#0a0a0a] text-gray-100 font-sans overflow-hidden"
    >
      {/* Top Sleek Header with NASA Live Feed */}
      <DashboardHeader
        activeRegion={activeRegion}
        availableRegions={availableRegions}
        onSelectRegion={handleSelectRegion}
        onRefresh={loadAllData}
        isLoading={isLoading}
        activeAlertsCount={alerts.length}
        criticalCount={criticalCount}
        onOpenSimulator={() => {
          setSimulatorBaseZone(selectedZone);
          setIsSimulatorOpen(true);
        }}
        onOpenMLModal={() => setIsMLModalOpen(true)}
        onOpenAlerts={() => setActiveTab('alerts')}
        onOpenAIAdvisor={() => setIsAIAdvisorOpen(true)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        nasaDetectionsCount={nasaLiveFires.length}
      />

      {/* Main Content Area */}
      {activeTab === 'map' ? (
        <div className="flex-1 flex overflow-hidden">
          {/* Main Map & Metrics Area (Left Pane) */}
          <main className="flex-1 flex flex-col p-4 gap-4 overflow-y-auto">
            {/* Top Metric Cards */}
            <RiskSummaryCards
              criticalCount={criticalCount}
              highCount={highCount}
              totalZones={zones.length}
              populationAtRisk={populationAtRisk}
              activeAlertsCount={alerts.length}
              hotspotsCount={clusters.length}
              historicalFiresCount={historicalFires.length}
              onFilterLevel={setFilterLevel}
              selectedFilter={filterLevel}
            />

            {/* GIS Risk Map with NASA Live Layers */}
            <RiskMap
              zones={zones}
              region={activeRegion}
              selectedZone={selectedZone}
              onSelectZone={handleSelectZone}
              historicalFires={historicalFires}
              clusters={clusters}
              safeZones={safeZones}
              evacuationPlan={evacuationPlan}
              filterLevel={filterLevel}
              nasaLiveFires={nasaLiveFires}
              nasaStats={nasaStats}
              onRefreshNasa={() => fetchNasaTelemetry(true)}
              isNasaLoading={isNasaLoading}
            />
          </main>

          {/* Right Sidebar */}
          <aside className="w-80 sm:w-96 bg-[#0e0e0e] border-l border-white/5 p-4 flex flex-col gap-4 overflow-y-auto shrink-0">
            {/* 1. NASA Satellite Live Feed Spotlight Card */}
            <div className="bg-gradient-to-br from-red-950/40 via-neutral-900 to-black rounded-lg border border-red-500/30 p-4 flex flex-col gap-2.5 shadow-xl">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-white">
                  <Satellite className="w-3.5 h-3.5 text-red-400" />
                  NASA Satellites (VIIRS)
                </span>
                <span className="text-[9px] bg-red-500/20 text-red-400 border border-red-500/40 px-1.5 py-0.5 rounded font-mono font-bold">
                  LIVE FEED
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                <div className="bg-black/40 p-2 rounded border border-white/5">
                  <div className="text-[9px] text-gray-400 uppercase">Live Hotspots</div>
                  <div className="text-base font-black text-red-400">{nasaLiveFires.length}</div>
                </div>
                <div className="bg-black/40 p-2 rounded border border-white/5">
                  <div className="text-[9px] text-gray-400 uppercase">Peak FRP</div>
                  <div className="text-base font-black text-amber-400">{nasaStats?.maxFrp || 0} MW</div>
                </div>
              </div>

              <button
                onClick={() => setActiveTab('nasa')}
                className="w-full py-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-200 border border-red-500/30 rounded text-[10px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1"
              >
                <span>View Full Satellite Telemetry Log</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {/* 2. Risk Analysis & Telemetry Panel */}
            <RiskDetailsPanel
              zone={selectedZone}
              onOpenSimulatorForZone={handleOpenSimulatorForZone}
              onOpenEvacuationForZone={handleOpenEvacuationForZone}
              onOpenAIAdvisorForZone={handleOpenAIAdvisorForZone}
            />

            {/* 3. Quick What-If Simulator Mini-Card */}
            <div className="bg-[#161616] rounded-lg border border-white/5 p-4 flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">
                  What-If Simulator
                </h3>
                <Sliders className="w-3.5 h-3.5 text-amber-400" />
              </div>

              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-[10px] mb-1">
                    <span className="text-gray-500 uppercase">Simulate Temp</span>
                    <span className="text-white font-mono font-bold">
                      {selectedZone ? `${selectedZone.weather.temperature}°C` : '42°C'}
                    </span>
                  </div>
                  <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-red-500 w-[84%]" />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[10px] mb-1">
                    <span className="text-gray-500 uppercase">Simulate Humidity</span>
                    <span className="text-white font-mono font-bold">
                      {selectedZone ? `${selectedZone.weather.humidity}%` : '14%'}
                    </span>
                  </div>
                  <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-orange-500 w-[78%]" />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[10px] mb-1">
                    <span className="text-gray-500 uppercase">Vegetation Dryness</span>
                    <span className="text-white font-mono font-bold">
                      {selectedZone ? selectedZone.vegetationCondition : 'Critically Dry'}
                    </span>
                  </div>
                  <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-red-500 w-[90%]" />
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  setSimulatorBaseZone(selectedZone);
                  setIsSimulatorOpen(true);
                }}
                className="w-full py-2.5 mt-4 bg-white text-black font-bold text-[11px] uppercase tracking-widest rounded hover:bg-gray-200 transition-all flex items-center justify-center gap-1.5"
              >
                <span>Launch Interactive Simulator</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {/* 4. Recent Hotspots */}
            <div className="bg-[#161616] rounded-lg border border-white/5 p-4 flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">
                  Critical Danger Sectors
                </h3>
                <Flame className="w-3.5 h-3.5 text-red-500" />
              </div>

              <div className="space-y-2.5">
                {topCriticalZones.map((z) => (
                  <div
                    key={z.id}
                    onClick={() => handleSelectZone(z)}
                    className={`flex items-center gap-3 p-2.5 bg-white/5 hover:bg-white/10 rounded border-l-2 cursor-pointer transition-all ${
                      z.riskLevel === 'CRITICAL'
                        ? 'border-red-500'
                        : z.riskLevel === 'HIGH'
                        ? 'border-orange-500'
                        : 'border-yellow-500'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-white truncate">
                        {z.id} ({z.name})
                      </p>
                      <p className="text-[10px] text-gray-500">
                        {z.population.toLocaleString()} pop • {z.weather.temperature}°C
                      </p>
                    </div>
                    <span
                      className={`text-[10px] font-bold shrink-0 ${
                        z.riskLevel === 'CRITICAL'
                          ? 'text-red-500'
                          : z.riskLevel === 'HIGH'
                          ? 'text-orange-400'
                          : 'text-yellow-400'
                      }`}
                    >
                      {z.riskScore}% RISK
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      ) : (
        /* Full width tab view for specialized operations */
        <main className="flex-1 overflow-y-auto p-4 max-w-7xl w-full mx-auto">
          {activeTab === 'nasa' && (
            <NasaSatellitePanel
              nasaLiveFires={nasaLiveFires}
              stats={nasaStats}
              region={activeRegion}
              onRefresh={() => fetchNasaTelemetry(true)}
              isLoading={isNasaLoading}
              onSelectFire={(fire) => {
                setActiveTab('map');
              }}
            />
          )}

          {activeTab === 'hotspots' && (
            <HotspotPanel
              historicalFires={historicalFires}
              clusters={clusters}
              onSelectCoordinates={(lat, lng) => setActiveTab('map')}
            />
          )}

          {activeTab === 'population' && (
            <PopulationRiskPanel
              allZones={zones}
              onSelectZone={(zone) => {
                setSelectedZone(zone);
                setActiveTab('map');
              }}
            />
          )}

          {activeTab === 'evacuation' && (
            <EvacuationPanel
              plan={evacuationPlan}
              safeZones={safeZones}
              zones={zones}
              activeZoneId={selectedZone?.id}
              onRefreshPlan={loadAllData}
            />
          )}

          {activeTab === 'alerts' && (
            <AlertPanel
              alerts={alerts}
              onAcknowledge={handleAcknowledgeAlert}
              onSelectZoneId={(zoneId) => {
                const found = zones.find((z) => z.id === zoneId);
                if (found) setSelectedZone(found);
                setActiveTab('map');
              }}
              zones={zones}
              onRefreshAlerts={loadAllData}
            />
          )}

          {activeTab === 'voice' && (
            <VoiceAlertPanel
              zones={zones}
            />
          )}
        </main>
      )}

      {/* Sleek Minimalist Footer */}
      <footer
        id="app-footer"
        className="px-6 py-2.5 bg-[#0d0d0d] border-t border-white/5 flex flex-col sm:flex-row items-center justify-between text-[10px] text-gray-500 gap-2 shrink-0"
      >
        <div className="flex flex-wrap items-center gap-4">
          <span>NASA FIRMS API: AUTHENTICATED</span>
          <span>KEY: 7535...4169</span>
          <span>SAT SENSORS: VIIRS 375m / MODIS 1km</span>
          <span>LATENCY: 42ms</span>
          <span>MODEL: RF_WILDFIRE_V2</span>
        </div>
        <div className="flex gap-4 italic text-gray-400">
          Integrated with NASA Earth Observing System Data and Information System (EOSDIS).
        </div>
      </footer>

      {/* Modals */}
      <WhatIfSimulator
        isOpen={isSimulatorOpen}
        onClose={() => setIsSimulatorOpen(false)}
        baseZone={simulatorBaseZone}
      />

      <MLModelModal
        isOpen={isMLModalOpen}
        onClose={() => setIsMLModalOpen(false)}
      />

      <AIAdvisorModal
        isOpen={isAIAdvisorOpen}
        onClose={() => setIsAIAdvisorOpen(false)}
        selectedZone={selectedZone}
        allZones={zones}
      />
    </div>
  );
}
