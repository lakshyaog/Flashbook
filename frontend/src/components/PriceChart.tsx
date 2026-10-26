import React, { useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import { TrendingUp, BarChart2, Layers } from 'lucide-react';
import { DepthChart } from './DepthChart';

interface CandleData {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface PriceChartProps {
  candles: CandleData[];
  currentPrice: number;
  priceChange: number;
  bids: Array<{ price: number; amount: number; total: number }>;
  asks: Array<{ price: number; amount: number; total: number }>;
}

export const PriceChart: React.FC<PriceChartProps> = ({
  candles,
  currentPrice,
  priceChange,
  bids,
  asks
}) => {
  const [timeframe, setTimeframe] = useState<'1m' | '5m' | '1h' | '1D'>('1h');
  const [activeTab, setActiveTab] = useState<'price' | 'depth'>('price');

  const formattedChartData = candles.map((c, i) => ({
    time: new Date(c.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    price: c.close,
    volume: c.volume
  }));

  const minPrice = Math.min(...candles.map(c => c.low), currentPrice * 0.98);
  const maxPrice = Math.max(...candles.map(c => c.high), currentPrice * 1.02);

  return (
    <div className="terminal-card rounded-xl p-3.5 flex flex-col h-full">
      {/* Top Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2.5 mb-2 border-b border-border/60">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 p-1 rounded-lg bg-surface border border-border/80">
            <button
              onClick={() => setActiveTab('price')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-all ${
                activeTab === 'price'
                  ? 'bg-surfaceHover text-brand border border-brand/20'
                  : 'text-textSecondary hover:text-white'
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5" />
              <span>Price</span>
            </button>
            <button
              onClick={() => setActiveTab('depth')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-all ${
                activeTab === 'depth'
                  ? 'bg-surfaceHover text-brand border border-brand/20'
                  : 'text-textSecondary hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Market Depth</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-lg font-bold font-mono font-mono-numbers text-white">
              ${currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className={`text-xs font-mono font-medium ${priceChange >= 0 ? 'text-buy' : 'text-sell'}`}>
              {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}%
            </span>
          </div>
        </div>

        {/* Timeframe Selector */}
        {activeTab === 'price' && (
          <div className="flex items-center gap-1 p-0.5 rounded-lg bg-surface border border-border/80 text-xs font-mono">
            {(['1m', '5m', '1h', '1D'] as const).map(tf => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-2.5 py-1 rounded transition-colors ${
                  timeframe === tf
                    ? 'bg-surfaceHover text-brand font-semibold'
                    : 'text-textMuted hover:text-white'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Chart Canvas */}
      <div className="flex-1 w-full min-h-[260px] relative">
        {activeTab === 'price' ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={formattedChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00E5FF" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#00E5FF" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="time"
                stroke="#64748B"
                fontSize={10}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                domain={[minPrice, maxPrice]}
                orientation="right"
                stroke="#64748B"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                tickFormatter={(val) => `$${val.toFixed(0)}`}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="p-2 rounded-lg bg-surface/95 border border-border shadow-xl text-xs font-mono">
                        <div className="text-textMuted text-[10px]">{data.time}</div>
                        <div className="font-bold text-white text-sm">${data.price.toFixed(2)}</div>
                        <div className="text-textSecondary text-[10px]">Vol: {data.volume} FWETH</div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area
                type="monotone"
                dataKey="price"
                stroke="#00E5FF"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#priceGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <DepthChart bids={bids} asks={asks} currentPrice={currentPrice} />
        )}
      </div>
    </div>
  );
};
