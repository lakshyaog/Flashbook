import React from 'react';
import { ResponsiveContainer, AreaChart, Area } from 'recharts';
import { fmtUsd, fmtPct, EMPTY } from '../utils/format';
import { TrendingUp, TrendingDown, BarChart3, ArrowLeftRight, Bot, ShieldAlert } from 'lucide-react';

interface StatsRowProps {
  marketStats: {
    lastPrice: number;
    change24h: number;
    high24h: number;
    low24h: number;
    volume24h: number;
  };
  spread: number;
  spreadBps: number;
  candles: Array<{ close: number; volume: number }>;
  mmRiskStatus?: 'NORMAL' | 'CIRCUIT_BREAKER' | 'EXPOSURE_LIMIT';
  mmDryRun?: boolean;
}

const Tile: React.FC<{ label: string; icon: React.ReactNode; children: React.ReactNode; className?: string }> = ({
  label,
  icon,
  children,
  className = '',
}) => (
  <div className={`terminal-card rounded-2xl p-4 flex flex-col justify-between min-h-[112px] relative overflow-hidden ${className}`}>
    <div className="flex items-center justify-between text-textMuted">
      <span className="text-xs font-medium text-textSecondary">{label}</span>
      <span className="w-7 h-7 rounded-lg bg-surfaceHover border border-border flex items-center justify-center">
        {icon}
      </span>
    </div>
    {children}
  </div>
);

export const StatsRow: React.FC<StatsRowProps> = ({
  marketStats,
  spread,
  spreadBps,
  candles,
  mmRiskStatus = 'NORMAL',
  mmDryRun = true,
}) => {
  const hasData = marketStats.lastPrice > 0;
  const isUp = marketStats.change24h >= 0;
  const trendColor = isUp ? '#0E9F6E' : '#E11D48';
  const sparkData = candles.length > 1 ? candles.map((c) => ({ v: c.close })) : [{ v: 0 }, { v: 0 }];
  const volumeData = candles.length > 1 ? candles.map((c) => ({ v: c.volume })) : [{ v: 0 }, { v: 0 }];

  // Position of last price inside the 24h range, 0–100
  const range = marketStats.high24h - marketStats.low24h;
  const rangePct = range > 0 ? Math.min(100, Math.max(0, ((marketStats.lastPrice - marketStats.low24h) / range) * 100)) : 50;

  const riskOk = mmRiskStatus === 'NORMAL';

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
      {/* Hero: last price with sparkline */}
      <div className="terminal-card-glow rounded-2xl p-4 col-span-2 lg:col-span-1 flex flex-col justify-between min-h-[112px] relative overflow-hidden">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-textSecondary">FWETH Last Price</span>
          {hasData ? (
            <span
              className={`inline-flex items-center gap-1 text-[11px] font-mono-numbers font-semibold px-1.5 py-0.5 rounded-md ${
                isUp ? 'bg-buySubtle text-buy' : 'bg-sellSubtle text-sell'
              }`}
            >
              {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {fmtPct(marketStats.change24h, true)}
            </span>
          ) : (
            <span className="text-[11px] text-textMuted">No trades yet</span>
          )}
        </div>
        <div className="text-[28px] leading-none font-semibold font-mono-numbers text-textPrimary tracking-tight relative z-10">
          {fmtUsd(marketStats.lastPrice)}
        </div>
        <div className="absolute inset-x-0 bottom-0 h-12 opacity-80 pointer-events-none">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sparkData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="sparkGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={trendColor} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={trendColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="v" stroke={trendColor} strokeWidth={2} fill="url(#sparkGradient)" isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 24h range */}
      <Tile label="24h Range" icon={<ArrowLeftRight className="w-3.5 h-3.5" />}>
        <div>
          <div className="relative h-1.5 rounded-full bg-gradient-to-r from-sell/50 via-borderMuted to-buy/50 mb-2">
            {hasData && (
              <span
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-textPrimary ring-2 ring-surface"
                style={{ left: `${rangePct}%` }}
              />
            )}
          </div>
          <div className="flex justify-between text-xs font-mono-numbers">
            <span className="text-textSecondary">{fmtUsd(marketStats.low24h)}</span>
            <span className="text-textSecondary">{fmtUsd(marketStats.high24h)}</span>
          </div>
        </div>
      </Tile>

      {/* Volume */}
      <Tile label="24h Volume" icon={<BarChart3 className="w-3.5 h-3.5" />}>
        <div className="flex items-end justify-between gap-3">
          <div className="text-xl font-semibold font-mono-numbers text-textPrimary">
            {hasData ? marketStats.volume24h.toFixed(2) : EMPTY} <span className="text-xs text-textMuted font-sans">FWETH</span>
          </div>
          <div className="w-20 h-8 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={volumeData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <Area type="monotone" dataKey="v" stroke="#4B5563" strokeWidth={1.5} fill="#4B5563" fillOpacity={0.12} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </Tile>

      {/* Spread */}
      <Tile label="Bid / Ask Spread" icon={<ArrowLeftRight className="w-3.5 h-3.5 rotate-90" />}>
        <div className="flex items-baseline gap-2">
          <span className="text-xl font-semibold font-mono-numbers text-textPrimary">{fmtUsd(spread)}</span>
          <span className="text-xs font-mono-numbers text-textMuted">{spread ? `${spreadBps.toFixed(1)} bps` : 'Book is one-sided'}</span>
        </div>
      </Tile>

      {/* AI MM status */}
      <Tile
        label="AI Market Maker"
        icon={riskOk ? <Bot className="w-3.5 h-3.5 text-brand" /> : <ShieldAlert className="w-3.5 h-3.5 text-sell" />}
      >
        <div className="flex items-center justify-between">
          <span className={`inline-flex items-center gap-2 text-sm font-semibold ${riskOk ? 'text-textPrimary' : 'text-sell'}`}>
            <span className="relative flex w-2 h-2">
              <span className={`absolute inset-0 rounded-full animate-ping opacity-60 ${riskOk ? 'bg-buy' : 'bg-sell'}`} />
              <span className={`relative w-2 h-2 rounded-full ${riskOk ? 'bg-buy' : 'bg-sell'}`} />
            </span>
            {mmRiskStatus.replace('_', ' ')}
          </span>
          <span
            className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md border ${
              mmDryRun ? 'text-textSecondary border-border bg-surfaceHover' : 'text-brand border-brand/30 bg-brand/10'
            }`}
          >
            {mmDryRun ? 'DRY-RUN' : 'LIVE'}
          </span>
        </div>
      </Tile>
    </div>
  );
};
