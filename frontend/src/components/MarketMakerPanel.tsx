import React, { useState } from 'react';
import { Bot, Cpu, ShieldCheck, AlertTriangle, RefreshCw, Sliders, Play, Pause } from 'lucide-react';

export interface MMStatusData {
  isRunning: boolean;
  dryRun: boolean;
  enabled: boolean;
  params: {
    riskAversionGamma: number;
    baseSpreadBps: number;
    targetInventoryWeth: number;
    maxOrderSizeWeth: number;
    minOrderSizeWeth: number;
    maxPriceDeviationBps: number;
  };
  latestDecision?: {
    referencePrice: number;
    reservationPrice: number;
    inventoryWeth: number;
    targetInventoryWeth: number;
    inventorySkew: number;
    volatility: number;
    halfSpreadBps: number;
    recommendedBid: number;
    recommendedAsk: number;
    recommendedBidSize: number;
    recommendedAskSize: number;
    riskStatus: 'NORMAL' | 'CIRCUIT_BREAKER' | 'EXPOSURE_LIMIT';
    dryRun: boolean;
    actionTaken: string;
  };
}

interface MarketMakerPanelProps {
  mmStatus: MMStatusData | null;
  onRefresh: () => void;
  onStep: () => Promise<void>;
  onToggleDryRun: (newDryRun: boolean) => Promise<void>;
}

export const MarketMakerPanel: React.FC<MarketMakerPanelProps> = ({
  mmStatus,
  onRefresh,
  onStep,
  onToggleDryRun
}) => {
  const [isStepping, setIsStepping] = useState(false);
  const decision = mmStatus?.latestDecision;

  const handleStep = async () => {
    setIsStepping(true);
    try {
      await onStep();
    } finally {
      setIsStepping(false);
    }
  };

  const isCircuitBreaker = decision?.riskStatus === 'CIRCUIT_BREAKER';
  const isExposureLimit = decision?.riskStatus === 'EXPOSURE_LIMIT';

  return (
    <div className="terminal-card rounded-xl p-3.5 flex flex-col h-full border border-brand/20 shadow-lg shadow-brand/5">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-border/60">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded bg-brand/10 border border-brand/30 text-brand">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-textPrimary block">
              AI Market Maker
            </span>
            <span className="text-[10px] text-textMuted font-mono block -mt-0.5">
              Avellaneda-Stoikov Adaptive Engine
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Status Badge */}
          <span
            className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${
              isCircuitBreaker
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                : isExposureLimit
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                : 'bg-buySubtle text-buy border border-buy/30'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-current animate-ping"></span>
            {decision?.riskStatus || 'NORMAL'}
          </span>

          {/* Dry Run Toggle */}
          <button
            onClick={() => onToggleDryRun(!mmStatus?.dryRun)}
            className={`text-[10px] font-mono px-2 py-0.5 rounded border transition-colors ${
              mmStatus?.dryRun
                ? 'bg-surfaceHover text-brand border-brand/30'
                : 'bg-amber-500/10 text-amber-300 border-amber-500/30 font-bold'
            }`}
          >
            {mmStatus?.dryRun ? 'DRY-RUN' : 'LIVE'}
          </button>
        </div>
      </div>

      {/* Decision Metrics Grid */}
      <div className="grid grid-cols-2 gap-2 text-xs font-mono mb-3">
        <div className="p-2 rounded-lg bg-surface/80 border border-border/80">
          <span className="text-[10px] text-textMuted uppercase block">Reference Mid</span>
          <span className="font-bold text-white text-sm font-mono-numbers">
            ${(decision?.referencePrice || 3000.0).toFixed(2)}
          </span>
        </div>

        <div className="p-2 rounded-lg bg-surface/80 border border-border/80">
          <span className="text-[10px] text-textMuted uppercase block">Reservation Price</span>
          <span className="font-bold text-brand text-sm font-mono-numbers">
            ${(decision?.reservationPrice || 3000.0).toFixed(2)}
          </span>
        </div>

        <div className="p-2 rounded-lg bg-surface/80 border border-border/80">
          <span className="text-[10px] text-textMuted uppercase block">Inventory Skew</span>
          <span
            className={`font-semibold font-mono-numbers ${
              (decision?.inventorySkew || 0) > 0 ? 'text-amber-400' : 'text-textPrimary'
            }`}
          >
            {(decision?.inventorySkew || 0) > 0 ? '+' : ''}
            {(decision?.inventorySkew || 0).toFixed(2)} WETH
          </span>
        </div>

        <div className="p-2 rounded-lg bg-surface/80 border border-border/80">
          <span className="text-[10px] text-textMuted uppercase block">Vol / Half-Spread</span>
          <span className="font-semibold text-textSecondary font-mono-numbers">
            {((decision?.volatility || 0.015) * 100).toFixed(1)}% / {(decision?.halfSpreadBps || 15).toFixed(1)} bps
          </span>
        </div>
      </div>

      {/* Recommended Quotes Box */}
      <div className="p-2.5 rounded-lg bg-surface border border-brand/20 mb-3 space-y-2">
        <div className="flex items-center justify-between text-xs font-mono pb-1 border-b border-border/50">
          <span className="text-textMuted text-[10px] uppercase font-bold">AI Quoting Recommendation</span>
          <span className="text-brand text-[10px]">Optimal Depth</span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs font-mono">
          <div className="p-1.5 rounded bg-buySubtle/30 border border-buy/20">
            <span className="text-[10px] text-buy block font-semibold">BUY QUOTE (BID)</span>
            <div className="font-bold text-white text-sm font-mono-numbers">
              ${(decision?.recommendedBid || 2995.5).toFixed(2)}
            </div>
            <div className="text-[10px] text-textSecondary font-mono-numbers">
              Size: {(decision?.recommendedBidSize || 0.5).toFixed(4)} WETH
            </div>
          </div>

          <div className="p-1.5 rounded bg-sellSubtle/30 border border-sell/20">
            <span className="text-[10px] text-sell block font-semibold">SELL QUOTE (ASK)</span>
            <div className="font-bold text-white text-sm font-mono-numbers">
              ${(decision?.recommendedAsk || 3004.5).toFixed(2)}
            </div>
            <div className="text-[10px] text-textSecondary font-mono-numbers">
              Size: {(decision?.recommendedAskSize || 0.5).toFixed(4)} WETH
            </div>
          </div>
        </div>
      </div>

      {/* Action Taken & Telemetry Note */}
      <div className="text-[11px] font-mono text-textMuted bg-surface/50 p-2 rounded-lg border border-border/60 mb-3 flex-1 flex flex-col justify-between">
        <div className="line-clamp-2 text-textSecondary">
          <span className="text-brand font-semibold">Model Reasoning: </span>
          {decision?.actionTaken || 'Calculating baseline quotes from order book state.'}
        </div>
        <div className="flex items-center justify-between pt-1 border-t border-border/40 text-[10px] text-textMuted mt-1">
          <span>Target: {mmStatus?.params.targetInventoryWeth || 10} WETH</span>
          <span>Max Dev: {mmStatus?.params.maxPriceDeviationBps || 500} bps</span>
        </div>
      </div>

      {/* Manual Trigger Button */}
      <button
        onClick={handleStep}
        disabled={isStepping}
        className="w-full py-2 rounded-lg bg-surfaceHover hover:bg-card border border-brand/30 hover:border-brand/60 text-brand text-xs font-mono font-medium transition-all flex items-center justify-center gap-2"
      >
        <RefreshCw className={`w-3.5 h-3.5 ${isStepping ? 'animate-spin' : ''}`} />
        <span>{isStepping ? 'Recalculating...' : 'Recalculate AI Quote'}</span>
      </button>
    </div>
  );
};
