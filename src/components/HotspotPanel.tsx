import React, { useState } from 'react';
import {
  Flame,
  Calendar,
  Layers,
  BarChart2,
} from 'lucide-react';
import { HistoricalFireRecord, HotspotCluster } from '../types';

interface Props {
  historicalFires: HistoricalFireRecord[];
  clusters: HotspotCluster[];
  onSelectCoordinates?: (lat: number, lng: number) => void;
}

export const HotspotPanel: React.FC<Props> = ({
  historicalFires,
  clusters,
  onSelectCoordinates,
}) => {
  const [selectedCluster, setSelectedCluster] = useState<HotspotCluster | null>(null);
  const [filterSeverity, setFilterSeverity] = useState<string>('ALL');

  const filteredFires = historicalFires.filter((f) => {
    if (filterSeverity !== 'ALL' && f.severity !== filterSeverity) return false;
    if (selectedCluster && f.clusterId !== selectedCluster.id) return false;
    return true;
  });

  const causesCount = historicalFires.reduce((acc: Record<string, number>, f) => {
    acc[f.cause] = (acc[f.cause] || 0) + 1;
    return acc;
  }, {});

  return (
    <div id="hotspot-panel" className="bg-[#161616] border border-white/5 rounded-lg p-5 flex flex-col gap-5">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 border-b border-white/5 pb-4">
        <div>
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Flame className="w-4 h-4 text-red-500" />
            Historical Hotspots & DBSCAN Spatial Clustering
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white/5 border border-white/10 text-gray-400 uppercase tracking-widest">
              DBSCAN SPATIAL DENSITY
            </span>
          </h2>
          <p className="text-[11px] text-gray-500 mt-0.5">
            Spatial density clustering of past satellite-detected fire ignitions to identify recurrent wildfire corridors.
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-gray-500 text-[10px] uppercase font-bold tracking-wider">Severity:</span>
          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
            className="bg-[#111111] border border-white/10 rounded px-2.5 py-1 text-gray-200 text-xs"
          >
            <option value="ALL">All Severities</option>
            <option value="EXTREME">Extreme</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
        </div>
      </div>

      {/* DBSCAN Clusters Grid with Sleek border-left accents */}
      <div>
        <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-gray-400" />
          Detected Hotspot Clusters ({clusters.length})
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {clusters.map((cluster) => {
            const isSelected = selectedCluster?.id === cluster.id;
            return (
              <div
                key={cluster.id}
                onClick={() => {
                  if (isSelected) {
                    setSelectedCluster(null);
                  } else {
                    setSelectedCluster(cluster);
                    onSelectCoordinates?.(cluster.centroid.lat, cluster.centroid.lng);
                  }
                }}
                className={`p-3.5 rounded-lg border transition-all cursor-pointer border-l-2 ${
                  isSelected
                    ? 'bg-red-950/20 border-red-500 border-l-red-500 ring-1 ring-red-500/50'
                    : 'bg-[#111111] hover:bg-[#1a1a1a] border-white/5 border-l-red-500'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="font-bold text-xs text-white">{cluster.name}</div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-500 uppercase">
                    {cluster.fireCount} FIRES
                  </span>
                </div>
                <div className="mt-2 text-[11px] text-gray-400 space-y-1">
                  <div>Radius: <span className="text-gray-200 font-semibold">{cluster.radiusKm} km</span></div>
                  <div>Dominant Cause: <span className="text-amber-400 font-medium">{cluster.dominantCause}</span></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Cause Breakdown & Fire Records Table */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Cause Breakdown Chart list */}
        <div className="lg:col-span-4 bg-[#111111] p-4 rounded-lg border border-white/5 text-xs">
          <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
            <BarChart2 className="w-3.5 h-3.5 text-blue-400" />
            Ignition Causes Distribution
          </h4>
          <div className="space-y-3">
            {Object.entries(causesCount).map(([cause, countVal]) => {
              const count = Number(countVal);
              const pct = Math.round((count / (historicalFires.length || 1)) * 100);
              return (
                <div key={cause}>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-gray-300">{cause}</span>
                    <span className="font-mono text-white font-bold">{count} ({pct}%)</span>
                  </div>
                  <div className="w-full bg-white/5 rounded-full h-1 overflow-hidden">
                    <div
                      className="bg-red-500 h-full rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Historical Fire Events Table */}
        <div className="lg:col-span-8 bg-[#111111] p-4 rounded-lg border border-white/5 flex flex-col">
          <div className="flex justify-between items-center mb-3">
            <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-amber-400" />
              Recorded Ignition Logs ({filteredFires.length})
            </h4>
            {selectedCluster && (
              <button
                onClick={() => setSelectedCluster(null)}
                className="text-[10px] text-red-400 hover:underline"
              >
                Clear Cluster Filter
              </button>
            )}
          </div>

          <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-[#0a0a0a] text-gray-500 font-bold border-b border-white/5 text-[10px] uppercase tracking-wider">
                <tr>
                  <th className="py-2 px-2.5">Fire ID</th>
                  <th className="py-2 px-2.5">Date</th>
                  <th className="py-2 px-2.5">Severity</th>
                  <th className="py-2 px-2.5">Area Burned</th>
                  <th className="py-2 px-2.5">Cause</th>
                  <th className="py-2 px-2.5">Confidence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-gray-300 text-[11px]">
                {filteredFires.map((fire) => (
                  <tr key={fire.id} className="hover:bg-white/5 transition-colors">
                    <td className="py-2 px-2.5 font-mono font-bold text-white">{fire.id}</td>
                    <td className="py-2 px-2.5 text-gray-500">{fire.date}</td>
                    <td className="py-2 px-2.5">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                          fire.severity === 'EXTREME'
                            ? 'bg-red-500/20 text-red-500'
                            : fire.severity === 'HIGH'
                            ? 'bg-orange-500/20 text-orange-400'
                            : 'bg-white/5 text-gray-300'
                        }`}
                      >
                        {fire.severity}
                      </span>
                    </td>
                    <td className="py-2 px-2.5 font-mono">{fire.areaHectares} ha</td>
                    <td className="py-2 px-2.5 text-gray-300">{fire.cause}</td>
                    <td className="py-2 px-2.5 font-mono text-emerald-400">{fire.confidence}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
