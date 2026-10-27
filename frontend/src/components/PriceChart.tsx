import React, { useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import { TrendingUp, BarChart2, Layers } from 'lucide-react';
import { DepthChart } from './DepthChart';
import { fmtUsd, fmtPct } from '../utils/format';

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
  timeframe: Timeframe;
  onTimeframeChange: (tf: Timeframe) => void;
}

export type Timeframe = '1m' | '5m' | '1h' | '1D';

export const PriceChart: React.FC<PriceChartProps> = ({
  candles,
  currentPrice,
  priceChange,
  bids,
  asks,
  timeframe,
  onTimeframeChange: setTimeframe
}) => {
  const [activeTab, setActiveTab] = useState<'price' | 'depth'>('price');

  const formattedChartData = candles.map((c, i) => ({
    time: timeframe === '1D'
      ? new Date(c.time).toLocaleDateString([], { month: 'short', day: 'numeric' })
      : new Date(c.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    price: c.close,
    volume: c.volume
  }));

  const minPrice = Math.min(...candles.map(c => c.low), currentPrice * 0.98);
  const maxPrice = Math.max(...candles.map(c => c.high), currentPrice * 1.02);

  return (
    <div className="terminal-card rounded-2xl p-4 flex flex-col h-full">
      {/* Top Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-2">
        <div className="flex items-center gap-4">
          <div className="segmented">
            <button
              onClick={() => setActiveTab('price')}
              className={`segmented-item ${activeTab === 'price' ? 'segmented-item-active' : ''}`}
            >
              <BarChart2 className="w-3.5 h-3.5" />
              <span>Price</span>
            </button>
            <button
              onClick={() => setActiveTab('depth')}
              className={`segmented-item ${activeTab === 'depth' ? 'segmented-item-active' : ''}`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Market Depth</span>
            </button>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-xl font-semibold font-mono-numbers text-textPrimary">
              {fmtUsd(currentPrice)}
            </span>
            {currentPrice > 0 && (
              <span className={`text-xs font-mono-numbers font-medium ${priceChange >= 0 ? 'text-buy' : 'text-sell'}`}>
                {fmtPct(priceChange, true)}
              </span>
            )}
          </div>
        </div>

        {/* Timeframe Selector */}
        {activeTab === 'price' && (
          <div className="segmented">
            {(['1m', '5m', '1h', '1D'] as const).map(tf => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`segmented-item !px-2.5 !py-1 font-mono ${timeframe === tf ? 'segmented-item-active font-semibold' : ''}`}
              >
                {tf}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Chart Canvas */}
      <div className="flex-1 w-full min-h-[260px] relative">
        {activeTab === 'price' && candles.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-center">
            <span className="text-sm font-medium text-textSecondary">No trades yet</span>
            <span className="text-xs text-textMuted">The chart fills in once orders match on-chain.</span>
          </div>
        ) : activeTab === 'price' ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={formattedChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3D5AFE" stopOpacity={0.28} />
                  <stop offset="100%" stopColor="#3D5AFE" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#EEF0F3" strokeDasharray="0" vertical={false} />
              <XAxis
                dataKey="time"
                stroke="#8A919E"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                minTickGap={24}
              />
              <YAxis
                domain={[minPrice, maxPrice]}
                orientation="right"
                stroke="#8A919E"
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
                      <div className="px-3 py-2 rounded-xl bg-card/95 border border-borderMuted shadow-xl text-xs font-mono backdrop-blur">
                        <div className="text-textMuted text-[10px]">{data.time}</div>
                        <div className="font-semibold text-textPrimary text-sm">${data.price.toFixed(2)}</div>
                        <div className="text-textSecondary text-[10px]">Vol: {data.volume} FWETH</div>
                      </div>
                    );
                  }
                  return null;
                }}
                cursor={{ stroke: '#D5D9E0', strokeWidth: 1 }}
              />
              <ReferenceLine
                y={currentPrice}
                stroke="#3D5AFE"
                strokeOpacity={0.5}
                strokeDasharray="4 4"
                label={{ value: `$${currentPrice.toFixed(2)}`, position: 'insideTopLeft', fill: '#4B5563', fontSize: 10 }}
              />
              <Area
                type="monotone"
                dataKey="price"
                stroke="#3D5AFE"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#priceGradient)"
                activeDot={{ r: 4, fill: '#3D5AFE', stroke: '#FFFFFF', strokeWidth: 2 }}
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
