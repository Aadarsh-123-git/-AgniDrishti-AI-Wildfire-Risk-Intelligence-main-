import React from 'react';
import { HelpCircle, AlertCircle, CheckCircle2 } from 'lucide-react';
import { GeographicZone } from '../types';

interface Props {
  zone: GeographicZone;
}

export const ExplainableRiskPanel: React.FC<Props> = ({ zone }) => {
  return (
    <div id="explainable-risk-panel" className="border-t border-white/5 pt-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 font-bold text-gray-300 text-xs">
          <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
          <span>WHY IS THIS AREA {zone.riskLevel} RISK?</span>
        </div>
        <span className="text-[10px] text-gray-500 font-mono">XAI Attribution</span>
      </div>

      <div className="space-y-2">
        {zone.contributingFactors.map((factor, idx) => {
          const isHighWeight = factor.weight >= 60;
          const isProtective = factor.direction === 'decreases_risk';

          return (
            <div key={idx} className="bg-[#111111] p-2.5 rounded border border-white/5">
              <div className="flex justify-between items-center text-[11px] mb-1">
                <span className="font-semibold text-gray-200 flex items-center gap-1.5">
                  {isProtective ? (
                    <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertCircle className="w-3 h-3 text-red-500 shrink-0" />
                  )}
                  {factor.factor}
                </span>
                <span
                  className={`font-mono text-[10px] font-bold ${
                    isProtective
                      ? 'text-emerald-400'
                      : isHighWeight
                      ? 'text-red-500'
                      : 'text-amber-400'
                  }`}
                >
                  {isProtective ? 'Protective' : `+${factor.weight}% Impact`}
                </span>
              </div>

              {/* Sleek Slim Progress bar */}
              <div className="w-full bg-white/5 rounded-full h-1 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    isProtective
                      ? 'bg-emerald-500'
                      : factor.weight >= 70
                      ? 'bg-red-500'
                      : factor.weight >= 40
                      ? 'bg-orange-500'
                      : 'bg-yellow-500'
                  }`}
                  style={{ width: `${Math.max(5, factor.weight)}%` }}
                />
              </div>

              <div className="text-[10px] text-gray-500 mt-1 flex justify-between">
                <span>{factor.description}</span>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-[10px] text-gray-500 italic mt-2 text-center">
        * Feature contributions reflect relative parameter influence within the Random Forest model and do not represent direct physical causality.
      </p>
    </div>
  );
};
