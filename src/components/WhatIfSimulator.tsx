import React, { useState, useEffect } from 'react';
import {
  Sliders,
  Play,
  RotateCcw,
  X,
  TrendingUp,
  TrendingDown,
  Minus,
  Sparkles,
  Thermometer,
  Droplets,
  Wind,
  CloudRain,
  Leaf,
  Flame,
} from 'lucide-react';
import { GeographicZone, MLPredictionResult } from '../types';
import { api } from '../services/api';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  baseZone?: GeographicZone | null;
}

export const WhatIfSimulator: React.FC<Props> = ({
  isOpen,
  onClose,
  baseZone,
}) => {
  const [temperature, setTemperature] = useState<number>(38);
  const [humidity, setHumidity] = useState<number>(22);
  const [windSpeed, setWindSpeed] = useState<number>(25);
  const [rainfall, setRainfall] = useState<number>(0);
  const [ndvi, setNdvi] = useState<number>(0.22);
  const [historicalFires, setHistoricalFires] = useState<number>(6);
  const [elevation, setElevation] = useState<number>(450);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [simulationResult, setSimulationResult] = useState<{
    baseline: any;
    simulated: MLPredictionResult;
    delta: {
      scoreDelta: number;
      direction: 'INCREASED_RISK' | 'DECREASED_RISK' | 'NO_CHANGE';
      isLevelShift: boolean;
    };
  } | null>(null);

  // Sync with baseZone when opened
  useEffect(() => {
    if (baseZone) {
      setTemperature(baseZone.weather.temperature);
      setHumidity(baseZone.weather.humidity);
      setWindSpeed(baseZone.weather.windSpeed);
      setRainfall(baseZone.weather.rainfall);
      setNdvi(baseZone.ndvi);
      setHistoricalFires(baseZone.historicalFireCount);
      setElevation(baseZone.elevation);
    }
  }, [baseZone]);

  // Initial simulation run when opened
  useEffect(() => {
    if (isOpen) {
      handleRunSimulation();
    }
  }, [isOpen]);

  const handleRunSimulation = async () => {
    setIsLoading(true);
    try {
      const res = await api.runSimulation({
        temperature,
        humidity,
        wind_speed: windSpeed,
        rainfall,
        ndvi,
        historical_fire_count: historicalFires,
        elevation,
        baseZoneId: baseZone?.id,
      });
      setSimulationResult(res);
    } catch (err) {
      console.error('Simulation error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const applyPreset = (preset: {
    temp: number;
    humidity: number;
    wind: number;
    rain: number;
    ndvi: number;
  }) => {
    setTemperature(preset.temp);
    setHumidity(preset.humidity);
    setWindSpeed(preset.wind);
    setRainfall(preset.rain);
    setNdvi(preset.ndvi);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[99999] isolate flex items-center justify-center bg-black/90 backdrop-blur-md p-4 overflow-y-auto">
      <div
        id="what-if-simulator-modal"
        className="bg-[#111111] border border-white/10 rounded-xl max-w-4xl w-full shadow-2xl overflow-hidden flex flex-col my-auto"
      >
        {/* Modal Header */}
        <div className="bg-[#0a0a0a] px-6 py-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white/5 border border-white/10 rounded flex items-center justify-center text-amber-400">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                What-If Wildfire Risk Simulator
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white/5 border border-white/10 text-gray-400 uppercase tracking-widest">
                  Random Forest ML
                </span>
              </h2>
              <p className="text-[11px] text-gray-400">
                Adjust atmospheric and fuel parameters to test sensitivity and simulate risk escalation.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Controls Column */}
          <div className="lg:col-span-7 space-y-4">
            {/* Quick Presets */}
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-2">
                Scenario Presets
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() =>
                    applyPreset({ temp: 44.5, humidity: 12, wind: 42, rain: 0, ndvi: 0.12 })
                  }
                  className="p-2 rounded bg-red-950/20 hover:bg-red-950/40 border border-red-900/40 text-red-400 text-left font-semibold text-[11px] transition-all"
                >
                  🔥 Extreme Heatwave
                </button>
                <button
                  type="button"
                  onClick={() =>
                    applyPreset({ temp: 39, humidity: 20, wind: 32, rain: 0, ndvi: 0.2 })
                  }
                  className="p-2 rounded bg-amber-950/20 hover:bg-amber-950/40 border border-amber-900/40 text-amber-400 text-left font-semibold text-[11px] transition-all"
                >
                  💨 Dry Gusts
                </button>
                <button
                  type="button"
                  onClick={() =>
                    applyPreset({ temp: 29, humidity: 45, wind: 14, rain: 2, ndvi: 0.35 })
                  }
                  className="p-2 rounded bg-white/5 hover:bg-white/10 border border-white/5 text-gray-300 text-left font-semibold text-[11px] transition-all"
                >
                  ⛅ Moderate Day
                </button>
                <button
                  type="button"
                  onClick={() =>
                    applyPreset({ temp: 22, humidity: 75, wind: 8, rain: 30, ndvi: 0.52 })
                  }
                  className="p-2 rounded bg-emerald-950/20 hover:bg-emerald-950/40 border border-emerald-900/40 text-emerald-400 text-left font-semibold text-[11px] transition-all"
                >
                  🌧️ Post-Rain Recovery
                </button>
              </div>
            </div>

            {/* Sliders Grid (Sleek Interface slider styling) */}
            <div className="space-y-4 bg-[#161616] p-4 rounded-lg border border-white/5 text-xs">
              {/* Temperature */}
              <div>
                <div className="flex justify-between text-[10px] mb-1.5">
                  <label className="text-gray-500 uppercase font-bold tracking-wider flex items-center gap-1">
                    <Thermometer className="w-3 h-3 text-red-500" /> Simulate Temp (°C)
                  </label>
                  <span className="text-white font-mono font-bold">{temperature}°C</span>
                </div>
                <input
                  type="range"
                  min="15"
                  max="50"
                  step="0.5"
                  value={temperature}
                  onChange={(e) => setTemperature(parseFloat(e.target.value))}
                  className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-white"
                />
              </div>

              {/* Relative Humidity */}
              <div>
                <div className="flex justify-between text-[10px] mb-1.5">
                  <label className="text-gray-500 uppercase font-bold tracking-wider flex items-center gap-1">
                    <Droplets className="w-3 h-3 text-blue-400" /> Simulate Humidity (%)
                  </label>
                  <span className="text-white font-mono font-bold">{humidity}%</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="95"
                  step="1"
                  value={humidity}
                  onChange={(e) => setHumidity(parseInt(e.target.value))}
                  className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-white"
                />
              </div>

              {/* Wind Speed */}
              <div>
                <div className="flex justify-between text-[10px] mb-1.5">
                  <label className="text-gray-500 uppercase font-bold tracking-wider flex items-center gap-1">
                    <Wind className="w-3 h-3 text-sky-400" /> Wind Velocity (km/h)
                  </label>
                  <span className="text-white font-mono font-bold">{windSpeed} km/h</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="65"
                  step="1"
                  value={windSpeed}
                  onChange={(e) => setWindSpeed(parseInt(e.target.value))}
                  className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-white"
                />
              </div>

              {/* Precipitation */}
              <div>
                <div className="flex justify-between text-[10px] mb-1.5">
                  <label className="text-gray-500 uppercase font-bold tracking-wider flex items-center gap-1">
                    <CloudRain className="w-3 h-3 text-indigo-400" /> Rainfall 24h (mm)
                  </label>
                  <span className="text-white font-mono font-bold">{rainfall} mm</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="50"
                  step="1"
                  value={rainfall}
                  onChange={(e) => setRainfall(parseInt(e.target.value))}
                  className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-white"
                />
              </div>

              {/* NDVI */}
              <div>
                <div className="flex justify-between text-[10px] mb-1.5">
                  <label className="text-gray-500 uppercase font-bold tracking-wider flex items-center gap-1">
                    <Leaf className="w-3 h-3 text-emerald-400" /> Vegetation Dryness (NDVI)
                  </label>
                  <span className="text-white font-mono font-bold">{ndvi}</span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="0.8"
                  step="0.02"
                  value={ndvi}
                  onChange={(e) => setNdvi(parseFloat(e.target.value))}
                  className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-white"
                />
              </div>

              {/* Historical Fire Count */}
              <div>
                <div className="flex justify-between text-[10px] mb-1.5">
                  <label className="text-gray-500 uppercase font-bold tracking-wider flex items-center gap-1">
                    <Flame className="w-3 h-3 text-orange-400" /> Past Ignitions in Area
                  </label>
                  <span className="text-white font-mono font-bold">{historicalFires}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="25"
                  step="1"
                  value={historicalFires}
                  onChange={(e) => setHistoricalFires(parseInt(e.target.value))}
                  className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-white"
                />
              </div>
            </div>

            {/* Run Button (Sleek theme white button) */}
            <div className="flex gap-2">
              <button
                id="btn-run-simulation"
                type="button"
                onClick={handleRunSimulation}
                disabled={isLoading}
                className="flex-1 py-3 bg-white text-black font-bold text-[11px] uppercase tracking-widest rounded hover:bg-gray-200 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {isLoading ? (
                  <Sparkles className="w-4 h-4 animate-spin" />
                ) : (
                  <Play className="w-4 h-4 fill-current" />
                )}
                <span>Run Risk Simulation</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (baseZone) {
                    setTemperature(baseZone.weather.temperature);
                    setHumidity(baseZone.weather.humidity);
                    setWindSpeed(baseZone.weather.windSpeed);
                    setRainfall(baseZone.weather.rainfall);
                    setNdvi(baseZone.ndvi);
                    setHistoricalFires(baseZone.historicalFireCount);
                  }
                }}
                className="p-3 rounded bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10"
                title="Reset to baseline"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Results Comparison Column */}
          <div className="lg:col-span-5 flex flex-col justify-between bg-[#161616] rounded-lg p-5 border border-white/5">
            <div>
              <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-4">
                <span className="text-xs font-bold uppercase tracking-widest text-gray-400">
                  Simulation Outcome
                </span>
                {simulationResult && (
                  <span className="text-[10px] text-gray-500 font-mono">
                    Live Random Forest Output
                  </span>
                )}
              </div>

              {simulationResult ? (
                <div className="space-y-4">
                  {/* Simulated Score Card */}
                  <div className="bg-[#111111] p-4 rounded-lg border border-white/5 text-center">
                    <div className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Predicted Wildfire Risk</div>
                    <div className="text-5xl font-light text-white my-1 tracking-tight">
                      {simulationResult.simulated.riskScore}
                      <span className="text-xl text-gray-500">%</span>
                    </div>
                    <div className="mt-2 inline-block">
                      <span
                        className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase border ${
                          simulationResult.simulated.riskLevel === 'CRITICAL'
                            ? 'bg-red-500/20 text-red-500 border-red-500/30'
                            : simulationResult.simulated.riskLevel === 'HIGH'
                            ? 'bg-orange-500/20 text-orange-400 border-orange-500/30'
                            : simulationResult.simulated.riskLevel === 'MODERATE'
                            ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                            : 'bg-green-500/20 text-green-400 border-green-500/30'
                        }`}
                      >
                        {simulationResult.simulated.riskLevel} RISK
                      </span>
                    </div>

                    {/* Delta indicator */}
                    {simulationResult.baseline && (
                      <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-center gap-2 text-xs font-bold">
                        <span className="text-gray-400">Baseline: {simulationResult.baseline.riskScore}%</span>
                        <span className="text-gray-600">→</span>
                        <span
                          className={`flex items-center gap-1 ${
                            simulationResult.delta.scoreDelta > 0
                              ? 'text-red-500'
                              : simulationResult.delta.scoreDelta < 0
                              ? 'text-emerald-400'
                              : 'text-gray-400'
                          }`}
                        >
                          {simulationResult.delta.scoreDelta > 0 ? (
                            <TrendingUp className="w-3.5 h-3.5" />
                          ) : simulationResult.delta.scoreDelta < 0 ? (
                            <TrendingDown className="w-3.5 h-3.5" />
                          ) : (
                            <Minus className="w-3.5 h-3.5" />
                          )}
                          {simulationResult.delta.scoreDelta > 0 ? '+' : ''}
                          {simulationResult.delta.scoreDelta}% Shift
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Factor Sensitivity Highlights */}
                  <div>
                    <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">
                      Top Risk Contributors
                    </h4>
                    <div className="space-y-1.5">
                      {simulationResult.simulated.contributingFactors.slice(0, 4).map((f, i) => (
                        <div
                          key={i}
                          className="flex justify-between items-center text-xs bg-[#111111] px-2.5 py-1.5 rounded border border-white/5"
                        >
                          <span className="text-gray-300">{f.displayName}</span>
                          <span className="font-mono font-bold text-white">
                            {f.value} {f.unit}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500 text-xs">
                  Adjust sliders and run simulation to evaluate risk response.
                </div>
              )}
            </div>

            <div className="text-[10px] text-gray-500 mt-4 text-center">
              Simulation requests evaluate against the live trained Random Forest model backend.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
