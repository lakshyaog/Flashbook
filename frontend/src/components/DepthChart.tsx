import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

interface DepthChartProps {
  bids: Array<{ price: number; amount: number; total: number }>;
  asks: Array<{ price: number; amount: number; total: number }>;
  currentPrice: number;
}

export const DepthChart: React.FC<DepthChartProps> = ({ bids, asks, currentPrice }) => {
  // Build continuous curve: bids sorted ascending, asks sorted ascending
  const sortedBids = [...bids].sort((a, b) => a.price - b.price);
  const sortedAsks = [...asks].sort((a, b) => a.price - b.price);

  const depthData = [
    ...sortedBids.map(b => ({
      price: b.price,
      bidDepth: b.total,
      askDepth: 0
    })),
    {
      price: currentPrice,
      bidDepth: 0,
      askDepth: 0
    },
    ...sortedAsks.map(a => ({
      price: a.price,
      bidDepth: 0,
      askDepth: a.total
    }))
  ];

  return (
    <div className="w-full h-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={depthData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="bidDepthGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0E9F6E" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#0E9F6E" stopOpacity={0.0} />
            </linearGradient>
            <linearGradient id="askDepthGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#E11D48" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#E11D48" stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#EEF0F3" vertical={false} />
          <XAxis
            dataKey="price"
            stroke="#8A919E"
            fontSize={10}
            tickLine={false}
            axisLine={false}
            tickFormatter={(val) => `$${Number(val).toFixed(0)}`}
          />
          <YAxis
            orientation="right"
            stroke="#8A919E"
            fontSize={10}
            tickLine={false}
            axisLine={false}
            tickFormatter={(val) => `${Number(val).toFixed(1)}`}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload;
                return (
                  <div className="p-2 rounded-lg bg-card/95 border border-borderMuted text-xs font-mono">
                    <div className="text-textPrimary font-bold">${Number(data.price).toFixed(2)}</div>
                    {data.bidDepth > 0 && <div className="text-buy">Buy Depth: {data.bidDepth.toFixed(4)} WETH</div>}
                    {data.askDepth > 0 && <div className="text-sell">Sell Depth: {data.askDepth.toFixed(4)} WETH</div>}
                  </div>
                );
              }
              return null;
            }}
          />
          <Area
            type="stepAfter"
            dataKey="bidDepth"
            stroke="#0E9F6E"
            strokeWidth={1.5}
            fill="url(#bidDepthGradient)"
          />
          <Area
            type="stepAfter"
            dataKey="askDepth"
            stroke="#E11D48"
            strokeWidth={1.5}
            fill="url(#askDepthGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
