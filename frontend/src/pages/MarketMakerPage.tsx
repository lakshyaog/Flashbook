import React, { useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import { Bot, RefreshCw, ShieldCheck, ShieldAlert, AlertTriangle } from 'lucide-react';
import { MMStatusData, MMDecision } from '../components/MarketMakerPanel';
import { fmtUsd, EMPTY } from '../utils/format';

interface MarketMakerPageProps {
  mmStatus: MMStatusData | null;
  onStep: () => Promise<void>;
  onToggleDryRun: (newDryRun: boolean) => Promise<void>;
}

const timeLabel = (ts?: number) =>
  ts ? new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—';

// Quote series share one price axis; bid/ask keep their semantic buy/sell colors
const QUOTE_SERIES = [
  { key: 'ask', label: 'Ask quote', color: '#E11D48' },
  { key: 'reservation', label: 'Reservation', color: '#3D5AFE' },
  { key: 'mid', label: 'Reference mid', color: '#4B5563' },
  { key: 'bid', label: 'Bid quote', color: '#0E9F6E' },
] as const;

const RISK_META: Record<MMDecision['riskStatus'], { label: string; icon: typeof ShieldCheck; className: string }> = {
  NORMAL: { label: 'Normal', icon: ShieldCheck, className: 'bg-buySubtle text-buy' },
  EXPOSURE_LIMIT: { label: 'Exposure limit', icon: AlertTriangle, className: 'bg-amber-500/10 text-amber-600' },
  CIRCUIT_BREAKER: { label: 'Circuit breaker', icon: ShieldAlert, className: 'bg-sellSubtle text-sell' },
};

const Kpi: React.FC<{ label: string; value: React.ReactNode; sub?: React.ReactNode; accent?: boolean }> = ({ label, value, sub, accent }) => (
  <div className="terminal-card rounded-2xl p-4">
    <div className="text-xs text-textSecondary mb-2">{label}</div>
    <div className={`text-xl font-semibold font-mono-numbers ${accent ? 'text-brand' : 'text-textPrimary'}`}>{value}</div>
    {sub && <div className="text-[11px] text-textMuted mt-1">{sub}</div>}
  </div>
);

export const MarketMakerPage: React.FC<MarketMakerPageProps> = ({ mmStatus, onStep, onToggleDryRun }) => {
  const [isStepping, setIsStepping] = useState(false);
  const decision = mmStatus?.latestDecision;
  const risk = RISK_META[decision?.riskStatus || 'NORMAL'];
  const RiskIcon = risk.icon;

  const history = [...(mmStatus?.recentDecisions || [])].sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
  const chartData = history.map((d) => ({
    time: timeLabel(d.timestamp),
    mid: d.referencePrice,
    reservation: d.reservationPrice,
    bid: d.recommendedBid,
    ask: d.recommendedAsk,
    inventory: d.inventoryWeth,
  }));
  const target = decision?.targetInventoryWeth ?? mmStatus?.params.targetInventoryWeth ?? 0;

  const handleStep = async () => {
    setIsStepping(true);
    try {
      await onStep();
    } finally {
      setIsStepping(false);
    }
  };

  const params = mmStatus?.params;
  const paramRows: Array<[string, string]> = params
    ? [
        ['Risk aversion (γ)', params.riskAversionGamma.toString()],
        ['Base spread', `${params.baseSpreadBps} bps`],
        ['Target inventory', `${params.targetInventoryWeth} WETH`],
        ['Max order size', `${params.maxOrderSizeWeth} WETH`],
        ['Min order size', `${params.minOrderSizeWeth} WETH`],
        ['Circuit breaker', `${params.maxPriceDeviationBps} bps`],
      ]
    : [];

  return (
    <main className="flex-1 p-4 max-w-[1720px] w-full mx-auto space-y-4">
      {/* Engine control strip */}
      <section className="terminal-card-glow rounded-2xl p-5 flex flex-wrap items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-brand text-white flex items-center justify-center shadow-lg shadow-brand/30">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <div className="text-lg font-semibold text-textPrimary">Avellaneda-Stoikov Engine</div>
            <div className="text-sm text-textMuted">
              {mmStatus?.isRunning ? 'Running' : 'Idle'} · last decision {timeLabel(decision?.timestamp)}
            </div>
          </div>
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${risk.className}`}>
            <RiskIcon className="w-3.5 h-3.5" />
            {risk.label}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="segmented">
            <button
              onClick={() => !mmStatus?.dryRun && onToggleDryRun(true)}
              className={`segmented-item ${mmStatus?.dryRun ? 'segmented-item-active' : ''}`}
            >
              Dry run
            </button>
            <button
              onClick={() => mmStatus?.dryRun && onToggleDryRun(false)}
              className={`segmented-item ${mmStatus && !mmStatus.dryRun ? 'segmented-item-active !text-amber-600' : ''}`}
            >
              Live
            </button>
          </div>
          <button onClick={handleStep} disabled={isStepping} className="btn-primary px-4 py-2.5 text-sm">
            <RefreshCw className={`w-4 h-4 ${isStepping ? 'animate-spin' : ''}`} />
            {isStepping ? 'Recalculating…' : 'Recalculate quote'}
          </button>
        </div>
      </section>

      {/* KPIs */}
      <section className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Kpi label="Reference mid" value={fmtUsd(decision?.referencePrice)} />
        <Kpi label="Reservation price" value={fmtUsd(decision?.reservationPrice)} accent />
        <Kpi label="Half-spread" value={decision ? `${decision.halfSpreadBps.toFixed(1)} bps` : EMPTY} />
        <Kpi label="Realized volatility" value={decision ? `${(decision.volatility * 100).toFixed(2)}%` : EMPTY} />
        <Kpi
          label="Inventory"
          value={decision ? `${decision.inventoryWeth.toFixed(2)} WETH` : EMPTY}
          sub={decision ? `Skew ${decision.inventorySkew >= 0 ? '+' : ''}${decision.inventorySkew.toFixed(2)} vs target ${target}` : undefined}
        />
      </section>

      {/* Quote history + current quote */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-8 terminal-card rounded-2xl p-5 flex flex-col">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <span className="panel-title">Quote history</span>
            <div className="flex flex-wrap items-center gap-4">
              {QUOTE_SERIES.map((s) => (
                <span key={s.key} className="inline-flex items-center gap-1.5 text-xs text-textSecondary">
                  <span className="w-3 h-0.5 rounded-full" style={{ background: s.color }} />
                  {s.label}
                </span>
              ))}
            </div>
          </div>
          <div className="h-[300px]">
            {chartData.length < 2 ? (
              <div className="h-full flex items-center justify-center text-sm text-textMuted">
                Not enough decisions yet — run “Recalculate quote” to build history.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="#EEF0F3" vertical={false} />
                  <XAxis dataKey="time" stroke="#8A919E" fontSize={10} tickLine={false} axisLine={false} minTickGap={28} />
                  <YAxis
                    orientation="right"
                    domain={['auto', 'auto']}
                    stroke="#8A919E"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `$${Number(v).toFixed(0)}`}
                  />
                  <Tooltip
                    cursor={{ stroke: '#D3D8E1' }}
                    content={({ active, payload, label }) =>
                      active && payload?.length ? (
                        <div className="px-3 py-2 rounded-xl bg-white border border-borderMuted shadow-lg text-xs">
                          <div className="text-textMuted mb-1">{label}</div>
                          {QUOTE_SERIES.map((s) => {
                            const p = payload.find((x) => x.dataKey === s.key);
                            return p ? (
                              <div key={s.key} className="flex items-center justify-between gap-4">
                                <span className="inline-flex items-center gap-1.5 text-textSecondary">
                                  <span className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                                  {s.label}
                                </span>
                                <span className="font-semibold text-textPrimary font-mono-numbers">{fmtUsd(Number(p.value))}</span>
                              </div>
                            ) : null;
                          })}
                        </div>
                      ) : null
                    }
                  />
                  {QUOTE_SERIES.map((s) => (
                    <Line
                      key={s.key}
                      type="monotone"
                      dataKey={s.key}
                      stroke={s.color}
                      strokeWidth={2}
                      strokeDasharray={s.key === 'mid' ? '4 4' : undefined}
                      dot={false}
                      activeDot={{ r: 4, fill: s.color, stroke: '#FFFFFF', strokeWidth: 2 }}
                      isAnimationActive={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="lg:col-span-4 terminal-card rounded-2xl p-5 flex flex-col gap-4">
          <span className="panel-title">Current recommendation</span>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-buySubtle p-4">
              <div className="text-xs font-semibold text-buy mb-1">Bid</div>
              <div className="text-xl font-bold font-mono-numbers text-textPrimary">{fmtUsd(decision?.recommendedBid)}</div>
              <div className="text-xs text-textSecondary mt-1">{decision ? `${decision.recommendedBidSize.toFixed(4)} WETH` : EMPTY}</div>
            </div>
            <div className="rounded-xl bg-sellSubtle p-4">
              <div className="text-xs font-semibold text-sell mb-1">Ask</div>
              <div className="text-xl font-bold font-mono-numbers text-textPrimary">{fmtUsd(decision?.recommendedAsk)}</div>
              <div className="text-xs text-textSecondary mt-1">{decision ? `${decision.recommendedAskSize.toFixed(4)} WETH` : EMPTY}</div>
            </div>
          </div>
          <div className="rounded-xl bg-surfaceHover p-4 text-sm text-textSecondary leading-relaxed flex-1">
            <div className="text-xs font-semibold text-brand mb-1">Model reasoning</div>
            {decision?.actionTaken || 'No decision recorded yet.'}
          </div>
        </div>
      </section>

      {/* Inventory + parameters */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-8 terminal-card rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <span className="panel-title">Inventory (WETH)</span>
            <span className="inline-flex items-center gap-1.5 text-xs text-textSecondary">
              <span className="w-3 border-t-2 border-dashed border-textMuted" /> Target {target}
            </span>
          </div>
          <div className="h-[200px]">
            {chartData.length < 2 ? (
              <div className="h-full flex items-center justify-center text-sm text-textMuted">No inventory history yet.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="invGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3D5AFE" stopOpacity={0.2} />
                      <stop offset="100%" stopColor="#3D5AFE" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#EEF0F3" vertical={false} />
                  <XAxis dataKey="time" stroke="#8A919E" fontSize={10} tickLine={false} axisLine={false} minTickGap={28} />
                  <YAxis orientation="right" domain={['auto', 'auto']} stroke="#8A919E" fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip
                    cursor={{ stroke: '#D3D8E1' }}
                    content={({ active, payload, label }) =>
                      active && payload?.length ? (
                        <div className="px-3 py-2 rounded-xl bg-white border border-borderMuted shadow-lg text-xs">
                          <div className="text-textMuted">{label}</div>
                          <div className="font-semibold text-textPrimary font-mono-numbers">{Number(payload[0].value).toFixed(4)} WETH</div>
                        </div>
                      ) : null
                    }
                  />
                  <ReferenceLine y={target} stroke="#8A919E" strokeDasharray="4 4" />
                  <Area
                    type="monotone"
                    dataKey="inventory"
                    stroke="#3D5AFE"
                    strokeWidth={2}
                    fill="url(#invGradient)"
                    activeDot={{ r: 4, fill: '#3D5AFE', stroke: '#FFFFFF', strokeWidth: 2 }}
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="lg:col-span-4 terminal-card rounded-2xl p-5">
          <span className="panel-title mb-4">Strategy parameters</span>
          <dl className="divide-y divide-border mt-3">
            {paramRows.length === 0 ? (
              <div className="py-6 text-sm text-textMuted text-center">Waiting for engine status…</div>
            ) : (
              paramRows.map(([k, v]) => (
                <div key={k} className="flex items-center justify-between py-2.5 text-sm">
                  <dt className="text-textSecondary">{k}</dt>
                  <dd className="font-semibold font-mono-numbers text-textPrimary">{v}</dd>
                </div>
              ))
            )}
          </dl>
        </div>
      </section>

      {/* Decision log */}
      <section className="terminal-card rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <span className="panel-title">Decision log</span>
          <span className="text-xs text-textMuted">Last {history.length} decisions</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-textMuted border-b border-border">
                <th className="font-medium py-2.5 pr-4">Time</th>
                <th className="font-medium py-2.5 pr-4 text-right">Mid</th>
                <th className="font-medium py-2.5 pr-4 text-right">Reservation</th>
                <th className="font-medium py-2.5 pr-4 text-right">Bid</th>
                <th className="font-medium py-2.5 pr-4 text-right">Ask</th>
                <th className="font-medium py-2.5 pr-4 text-right">Inventory</th>
                <th className="font-medium py-2.5 pr-4">Risk</th>
                <th className="font-medium py-2.5">Action</th>
              </tr>
            </thead>
            <tbody>
              {history.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-textMuted">No decisions recorded yet.</td>
                </tr>
              ) : (
                [...history].reverse().map((d, i) => {
                  const r = RISK_META[d.riskStatus];
                  return (
                    <tr key={d.id || i} className="border-b border-border last:border-0 hover:bg-surfaceHover transition-colors">
                      <td className="py-3 pr-4 text-textSecondary whitespace-nowrap">{timeLabel(d.timestamp)}</td>
                      <td className="py-3 pr-4 text-right font-mono-numbers">{fmtUsd(d.referencePrice)}</td>
                      <td className="py-3 pr-4 text-right font-mono-numbers text-brand font-medium">{fmtUsd(d.reservationPrice)}</td>
                      <td className="py-3 pr-4 text-right font-mono-numbers text-buy">{fmtUsd(d.recommendedBid)}</td>
                      <td className="py-3 pr-4 text-right font-mono-numbers text-sell">{fmtUsd(d.recommendedAsk)}</td>
                      <td className="py-3 pr-4 text-right font-mono-numbers">{d.inventoryWeth.toFixed(2)}</td>
                      <td className="py-3 pr-4">
                        <span className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-semibold whitespace-nowrap ${r.className}`}>{r.label}</span>
                      </td>
                      <td className="py-3 text-textSecondary max-w-[360px] truncate" title={d.actionTaken}>{d.actionTaken}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
};
