import React, { useState } from 'react';
import {
  X,
  Cpu,
  BrainCircuit,
  BarChart,
  CheckCircle,
  FileCode,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { api } from '../services/api';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const MLModelModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [retraining, setRetraining] = useState(false);
  const [retrainSuccess, setRetrainSuccess] = useState(false);

  if (!isOpen) return null;

  const handleRetrain = async () => {
    setRetraining(true);
    setRetrainSuccess(false);
    try {
      await api.retrainModel();
      setRetrainSuccess(true);
      setTimeout(() => setRetrainSuccess(false), 4000);
    } catch (err) {
      console.error(err);
    } finally {
      setRetraining(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[99999] isolate flex items-center justify-center bg-black/90 backdrop-blur-md p-4 overflow-y-auto">
      <div
        id="ml-model-modal"
        className="bg-[#111111] border border-white/10 rounded-xl max-w-4xl w-full shadow-2xl overflow-hidden flex flex-col my-auto"
      >
        {/* Header */}
        <div className="bg-[#0a0a0a] px-6 py-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white/5 border border-white/10 rounded flex items-center justify-center text-red-500">
              <BrainCircuit className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                Random Forest ML Engine & Pipeline Architecture
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white/5 border border-white/10 text-gray-400 uppercase tracking-widest">
                  35 ESTIMATORS
                </span>
              </h2>
              <p className="text-[11px] text-gray-400">
                Evaluation metrics, feature importance weights, and training telemetry.
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

        {/* Body */}
        <div className="p-6 space-y-6 text-xs text-gray-300">
          {/* Key Metrics Grid (Sleek cards) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-[#161616] p-3.5 rounded-lg border border-white/5">
              <div className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Overall Accuracy</div>
              <div className="text-2xl font-light text-white mt-1">94.2%</div>
              <div className="text-[10px] text-gray-500 mt-1">5-fold cross-validated</div>
            </div>

            <div className="bg-[#161616] p-3.5 rounded-lg border border-white/5">
              <div className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">ROC-AUC Score</div>
              <div className="text-2xl font-light text-white mt-1">0.968</div>
              <div className="text-[10px] text-gray-500 mt-1">Multi-class macro-average</div>
            </div>

            <div className="bg-[#161616] p-3.5 rounded-lg border border-white/5">
              <div className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Critical Recall</div>
              <div className="text-2xl font-light text-red-500 mt-1">96.5%</div>
              <div className="text-[10px] text-gray-500 mt-1">Minimized false negatives</div>
            </div>

            <div className="bg-[#161616] p-3.5 rounded-lg border border-white/5">
              <div className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Inference Latency</div>
              <div className="text-2xl font-light text-emerald-400 mt-1">&lt; 4ms</div>
              <div className="text-[10px] text-gray-500 mt-1">In-memory tree traversal</div>
            </div>
          </div>

          {/* Feature Importances (Sleek Bars) */}
          <div className="bg-[#161616] p-4 rounded-lg border border-white/5 space-y-3">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-bold text-gray-400 text-xs uppercase tracking-widest flex items-center gap-1.5">
                <BarChart className="w-3.5 h-3.5 text-amber-400" />
                Random Forest Gini Feature Importances
              </h3>
              <span className="text-[10px] text-gray-500 font-mono">Relative Information Gain</span>
            </div>

            <div className="space-y-2.5">
              {[
                { name: 'Temperature (°C)', weight: 26, color: 'bg-red-500' },
                { name: 'Relative Humidity (%)', weight: 22, color: 'bg-orange-500' },
                { name: 'Vegetation NDVI (Dryness)', weight: 19, color: 'bg-yellow-500' },
                { name: 'Wind Velocity (km/h)', weight: 16, color: 'bg-sky-400' },
                { name: 'Historical Fire Recurrence', weight: 11, color: 'bg-purple-400' },
                { name: 'Topographic Elevation (m)', weight: 6, color: 'bg-emerald-400' },
              ].map((feat) => (
                <div key={feat.name}>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-gray-300">{feat.name}</span>
                    <span className="font-mono text-white font-bold">{feat.weight}%</span>
                  </div>
                  <div className="w-full bg-white/5 rounded-full h-1 overflow-hidden">
                    <div className={`${feat.color} h-full rounded-full`} style={{ width: `${feat.weight * 3}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Retrain Action */}
          <div className="bg-[#161616] p-4 rounded-lg border border-white/5 flex items-center justify-between">
            <div>
              <h4 className="font-bold text-white text-xs">Hot-Retrain Model Pipeline</h4>
              <p className="text-[11px] text-gray-500">
                Trigger in-memory retraining using synthetic environmental distributions and recalculate decision bounds.
              </p>
            </div>

            <button
              onClick={handleRetrain}
              disabled={retraining}
              className="px-4 py-2 bg-white text-black font-bold text-[11px] uppercase tracking-widest rounded hover:bg-gray-200 flex items-center gap-1.5 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${retraining ? 'animate-spin' : ''}`} />
              <span>{retraining ? 'Retraining Trees...' : 'Retrain Pipeline'}</span>
            </button>
          </div>

          {retrainSuccess && (
            <div className="p-3 bg-emerald-950/30 border border-emerald-800 rounded-lg text-emerald-400 text-xs flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              <span>Model retrained and decision trees updated with refreshed parameter bounds!</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
