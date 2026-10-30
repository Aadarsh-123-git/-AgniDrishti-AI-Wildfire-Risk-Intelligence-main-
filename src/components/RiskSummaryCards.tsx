import React from 'react';
import {
  Flame,
  AlertTriangle,
  Users,
  ShieldAlert,
  MapPin,
} from 'lucide-react';

interface Props {
  criticalCount: number;
  highCount: number;
  totalZones: number;
  populationAtRisk: number;
  activeAlertsCount: number;
  hotspotsCount: number;
  historicalFiresCount: number;
  onFilterLevel?: (level: 'CRITICAL' | 'HIGH' | 'ALL') => void;
  selectedFilter?: 'CRITICAL' | 'HIGH' | 'ALL';
}

export const RiskSummaryCards: React.FC<Props> = ({
  criticalCount,
  highCount,
  totalZones,
  populationAtRisk,
  activeAlertsCount,
  hotspotsCount,
  historicalFiresCount,
  onFilterLevel,
  selectedFilter = 'ALL',
}) => {
  // Format numbers (e.g. 15.4K)
  const formattedPop =
    populationAtRisk >= 1000
      ? `${(populationAtRisk / 1000).toFixed(1)}K`
      : populationAtRisk.toString();

  const criticalPadded = criticalCount < 10 ? `0${criticalCount}` : `${criticalCount}`;
  const alertsPadded = activeAlertsCount < 10 ? `0${activeAlertsCount}` : `${activeAlertsCount}`;

  return (
    <div id="risk-summary-cards" className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {/* 1. Critical Zones */}
      <div
        id="card-critical-zones"
        onClick={() => onFilterLevel?.(selectedFilter === 'CRITICAL' ? 'ALL' : 'CRITICAL')}
        className={`bg-[#161616] p-3 rounded-lg border transition-all cursor-pointer ${
          selectedFilter === 'CRITICAL'
            ? 'border-red-500 ring-1 ring-red-500/50 bg-red-950/20'
            : 'border-white/5 hover:border-white/10 hover:bg-[#1a1a1a]'
        }`}
      >
        <div className="flex items-center justify-between">
          <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Critical Zones</p>
          <Flame className="w-3.5 h-3.5 text-red-500" />
        </div>
        <p className="text-2xl font-light text-red-500 mt-1">{criticalPadded}</p>
        <p className="text-[10px] text-gray-500 mt-1">
          {criticalCount} of {totalZones} zones (≥75% Risk)
        </p>
      </div>

      {/* 2. Active Alerts */}
      <div
        id="card-active-alerts"
        className="bg-[#161616] p-3 rounded-lg border border-white/5 hover:border-white/10 transition-all"
      >
        <div className="flex items-center justify-between">
          <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Active Alerts</p>
          <ShieldAlert className="w-3.5 h-3.5 text-orange-400" />
        </div>
        <p className="text-2xl font-light text-orange-400 mt-1">{alertsPadded}</p>
        <p className="text-[10px] text-gray-500 mt-1">
          {criticalCount} Emergency Warnings
        </p>
      </div>

      {/* 3. At Risk Population */}
      <div
        id="card-population-risk"
        className="bg-[#161616] p-3 rounded-lg border border-white/5 hover:border-white/10 transition-all"
      >
        <div className="flex items-center justify-between">
          <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">At Risk Pop.</p>
          <Users className="w-3.5 h-3.5 text-gray-400" />
        </div>
        <p className="text-2xl font-light text-gray-100 mt-1">{formattedPop}</p>
        <p className="text-[10px] text-gray-500 mt-1">
          In active danger perimeters
        </p>
      </div>

      {/* 4. High Risk Zones */}
      <div
        id="card-high-risk-zones"
        onClick={() => onFilterLevel?.(selectedFilter === 'HIGH' ? 'ALL' : 'HIGH')}
        className={`bg-[#161616] p-3 rounded-lg border transition-all cursor-pointer ${
          selectedFilter === 'HIGH'
            ? 'border-yellow-500 ring-1 ring-yellow-500/50 bg-yellow-950/20'
            : 'border-white/5 hover:border-white/10 hover:bg-[#1a1a1a]'
        }`}
      >
        <div className="flex items-center justify-between">
          <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">High Risk Zones</p>
          <AlertTriangle className="w-3.5 h-3.5 text-yellow-500" />
        </div>
        <p className="text-2xl font-light text-yellow-500 mt-1">{highCount < 10 ? `0${highCount}` : highCount}</p>
        <p className="text-[10px] text-gray-500 mt-1">
          50% – 74% Risk Range
        </p>
      </div>

      {/* 5. Historical Hotspots */}
      <div
        id="card-historical-hotspots"
        className="bg-[#161616] p-3 rounded-lg border border-white/5 hover:border-white/10 transition-all col-span-2 sm:col-span-1"
      >
        <div className="flex items-center justify-between">
          <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Hotspot Corridors</p>
          <MapPin className="w-3.5 h-3.5 text-red-400" />
        </div>
        <p className="text-2xl font-light text-orange-400 mt-1">{hotspotsCount < 10 ? `0${hotspotsCount}` : hotspotsCount}</p>
        <p className="text-[10px] text-gray-500 mt-1">
          {historicalFiresCount} historical fire records
        </p>
      </div>
    </div>
  );
};
