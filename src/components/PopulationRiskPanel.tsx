import React, { useEffect, useState } from 'react';
import {
  Users,
  GraduationCap,
  Building2,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';
import { api } from '../services/api';
import { GeographicZone } from '../types';

interface Props {
  onSelectZone: (zone: GeographicZone) => void;
  allZones: GeographicZone[];
}

export const PopulationRiskPanel: React.FC<Props> = ({ onSelectZone, allZones }) => {
  const [summary, setSummary] = useState<any>(null);
  const [filterLevel, setFilterLevel] = useState<string>('ALL');

  useEffect(() => {
    api.getPopulationRisk().then((data) => setSummary(data));
  }, []);

  if (!summary) {
    return (
      <div className="bg-[#161616] border border-white/5 rounded-lg p-8 text-center text-gray-500 text-xs">
        Loading population risk exposure models...
      </div>
    );
  }

  const filteredZones = allZones.filter((z) => {
    if (filterLevel === 'CRITICAL') return z.riskLevel === 'CRITICAL';
    if (filterLevel === 'HIGH') return z.riskLevel === 'HIGH' || z.riskLevel === 'CRITICAL';
    return true;
  });

  return (
    <div id="population-risk-panel" className="bg-[#161616] border border-white/5 rounded-lg p-5 flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 border-b border-white/5 pb-4">
        <div>
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-400" />
            Population & Critical Infrastructure Exposure Analysis
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white/5 border border-white/10 text-gray-400 uppercase tracking-widest">
              VULNERABILITY INDEX
            </span>
          </h2>
          <p className="text-[11px] text-gray-500 mt-0.5">
            Real-time estimation of human settlements, educational institutions, and healthcare centers situated within active fire danger corridors.
          </p>
        </div>

        {/* Level filter */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-gray-500 text-[10px] uppercase font-bold tracking-wider">Risk Filter:</span>
          <select
            value={filterLevel}
            onChange={(e) => setFilterLevel(e.target.value)}
            className="bg-[#111111] border border-white/10 rounded px-2.5 py-1 text-gray-200 text-xs"
          >
            <option value="ALL">All Monitored Sectors</option>
            <option value="CRITICAL">Critical Danger (≥75%)</option>
            <option value="HIGH">High Danger & Above (≥50%)</option>
          </select>
        </div>
      </div>

      {/* Metric Cards (Sleek Interface Cards) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-[#111111] p-3.5 rounded-lg border border-white/5">
          <div className="flex justify-between items-center text-[10px] text-gray-500 uppercase font-bold tracking-wider">
            <span>Critical Pop.</span>
            <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
          </div>
          <div className="text-2xl font-light text-red-500 mt-1">
            {summary.criticalZonePopulation.toLocaleString()}
          </div>
          <div className="text-[10px] text-gray-500 mt-1">
            In {summary.criticalZonesCount} emergency sectors
          </div>
        </div>

        <div className="bg-[#111111] p-3.5 rounded-lg border border-white/5">
          <div className="flex justify-between items-center text-[10px] text-gray-500 uppercase font-bold tracking-wider">
            <span>High Risk Pop.</span>
            <Users className="w-3.5 h-3.5 text-orange-400" />
          </div>
          <div className="text-2xl font-light text-orange-400 mt-1">
            {summary.highRiskPopulation.toLocaleString()}
          </div>
          <div className="text-[10px] text-gray-500 mt-1">
            In {summary.highRiskZonesCount} warning sectors
          </div>
        </div>

        <div className="bg-[#111111] p-3.5 rounded-lg border border-white/5">
          <div className="flex justify-between items-center text-[10px] text-gray-500 uppercase font-bold tracking-wider">
            <span>Vulnerable Schools</span>
            <GraduationCap className="w-3.5 h-3.5 text-yellow-500" />
          </div>
          <div className="text-2xl font-light text-white mt-1">
            {summary.totalSchoolsAtRisk}
          </div>
          <div className="text-[10px] text-gray-500 mt-1">
            Inside danger perimeters
          </div>
        </div>

        <div className="bg-[#111111] p-3.5 rounded-lg border border-white/5">
          <div className="flex justify-between items-center text-[10px] text-gray-500 uppercase font-bold tracking-wider">
            <span>Hospitals</span>
            <Building2 className="w-3.5 h-3.5 text-rose-400" />
          </div>
          <div className="text-2xl font-light text-white mt-1">
            {summary.totalHospitalsAtRisk}
          </div>
          <div className="text-[10px] text-gray-500 mt-1">
            Priority evacuation status
          </div>
        </div>
      </div>

      {/* High-Risk Zones Triage Table */}
      <div className="bg-[#111111] p-4 rounded-lg border border-white/5 flex flex-col">
        <h3 className="font-bold text-gray-400 text-xs uppercase tracking-widest mb-3">
          Sector Vulnerability Matrix ({filteredZones.length} Sectors)
        </h3>

        <div className="overflow-x-auto max-h-[380px] overflow-y-auto">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-[#0a0a0a] text-gray-500 font-bold border-b border-white/5 text-[10px] uppercase tracking-wider">
              <tr>
                <th className="py-2 px-3">Sector ID</th>
                <th className="py-2 px-3">Name</th>
                <th className="py-2 px-3">Risk Level</th>
                <th className="py-2 px-3">Probability</th>
                <th className="py-2 px-3">Population</th>
                <th className="py-2 px-3">Schools</th>
                <th className="py-2 px-3">Hospitals</th>
                <th className="py-2 px-3">Settlements</th>
                <th className="py-2 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-gray-300 text-[11px]">
              {filteredZones
                .sort((a, b) => b.riskScore - a.riskScore)
                .map((zone) => (
                  <tr key={zone.id} className="hover:bg-white/5 transition-colors">
                    <td className="py-2 px-3 font-mono font-bold text-white">{zone.id}</td>
                    <td className="py-2 px-3 text-gray-300">{zone.name}</td>
                    <td className="py-2 px-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                          zone.riskLevel === 'CRITICAL'
                            ? 'bg-red-500/20 text-red-500'
                            : zone.riskLevel === 'HIGH'
                            ? 'bg-orange-500/20 text-orange-400'
                            : zone.riskLevel === 'MODERATE'
                            ? 'bg-yellow-500/20 text-yellow-400'
                            : 'bg-green-500/20 text-green-400'
                        }`}
                      >
                        {zone.riskLevel}
                      </span>
                    </td>
                    <td className="py-2 px-3 font-mono font-bold">{zone.riskScore}%</td>
                    <td className="py-2 px-3 font-mono">{zone.population.toLocaleString()}</td>
                    <td className="py-2 px-3">{zone.schools}</td>
                    <td className="py-2 px-3">{zone.hospitals}</td>
                    <td className="py-2 px-3">{zone.settlements}</td>
                    <td className="py-2 px-3 text-right">
                      <button
                        onClick={() => onSelectZone(zone)}
                        className="px-2.5 py-1 bg-white/5 hover:bg-white/10 text-gray-200 border border-white/10 rounded text-[10px] font-medium inline-flex items-center gap-1 transition-all"
                      >
                        <span>Inspect</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
