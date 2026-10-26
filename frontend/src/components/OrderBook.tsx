import React from 'react';
import { ArrowDown, ArrowUp } from 'lucide-react';

interface OrderBookLevel {
  price: number;
  amount: number;
  total: number;
  orderCount: number;
}

interface OrderBookProps {
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  bestBid: number;
  bestAsk: number;
  spread: number;
  spreadBps: number;
  onSelectPrice: (price: number) => void;
}

export const OrderBook: React.FC<OrderBookProps> = ({
  bids,
  asks,
  bestBid,
  bestAsk,
  spread,
  spreadBps,
  onSelectPrice,
}) => {
  // Take top 8 asks and top 8 bids for clean terminal view
  const displayAsks = asks.slice(0, 8).reverse(); // Reversed so lowest ask sits at bottom next to spread
  const displayBids = bids.slice(0, 8);

  const maxTotal = Math.max(
    ...displayAsks.map(a => a.total),
    ...displayBids.map(b => b.total),
    1
  );

  return (
    <div className="terminal-card rounded-xl p-3 flex flex-col h-full select-none">
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-border/60">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-textPrimary">Order Book</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-surfaceHover text-textMuted font-mono">FWETH-FUSDT</span>
        </div>
        <div className="text-[10px] text-textMuted font-mono">
          Spread: <span className="text-textSecondary">${spread.toFixed(2)}</span> ({spreadBps.toFixed(1)} bps)
        </div>
      </div>

      {/* Column Headers */}
      <div className="grid grid-cols-3 text-[10px] uppercase font-mono text-textMuted pb-1 px-1">
        <span>Price (USDT)</span>
        <span className="text-right">Size (WETH)</span>
        <span className="text-right">Total (WETH)</span>
      </div>

      {/* Asks (Sell Orders) */}
      <div className="flex-1 flex flex-col justify-end space-y-0.5 min-h-[140px]">
        {displayAsks.length === 0 ? (
          <div className="text-center py-4 text-xs text-textMuted italic">No active sell orders</div>
        ) : (
          displayAsks.map((ask, idx) => {
            const depthPercent = Math.min(100, (ask.total / maxTotal) * 100);
            return (
              <div
                key={`ask-${ask.price}-${idx}`}
                onClick={() => onSelectPrice(ask.price)}
                className="grid grid-cols-3 text-xs font-mono py-0.5 px-1 relative cursor-pointer hover:bg-sellSubtle/40 rounded transition-colors group"
              >
                {/* Visual Depth Bar Fill */}
                <div
                  className="absolute top-0 right-0 bottom-0 bg-sellSubtle pointer-events-none rounded-r transition-all duration-200"
                  style={{ width: `${depthPercent}%` }}
                />
                <span className="text-sell font-medium group-hover:underline z-10 font-mono-numbers">
                  {ask.price.toFixed(2)}
                </span>
                <span className="text-right text-textSecondary z-10 font-mono-numbers">
                  {ask.amount.toFixed(4)}
                </span>
                <span className="text-right text-textMuted z-10 font-mono-numbers">
                  {ask.total.toFixed(4)}
                </span>
              </div>
            );
          })
        )}
      </div>

      {/* Mid Market Spread Bar */}
      <div className="py-2 my-1 px-2 rounded-lg bg-surface/80 border-y border-border/80 flex items-center justify-between text-xs font-mono">
        <div className="flex items-center gap-1.5">
          <span className="text-textMuted text-[10px]">MID PRICE:</span>
          <span className="font-semibold text-white font-mono-numbers">
            ${bestAsk > 0 && bestBid > 0 ? ((bestAsk + bestBid) / 2).toFixed(2) : (bestBid || bestAsk || 3000).toFixed(2)}
          </span>
        </div>
        <div className="flex items-center gap-1 text-[11px]">
          {spread > 0 ? (
            <span className="text-brand font-medium">${spread.toFixed(2)} ({spreadBps.toFixed(1)} bps)</span>
          ) : (
            <span className="text-buy font-medium">Locked / Crossed</span>
          )}
        </div>
      </div>

      {/* Bids (Buy Orders) */}
      <div className="flex-1 flex flex-col space-y-0.5 min-h-[140px]">
        {displayBids.length === 0 ? (
          <div className="text-center py-4 text-xs text-textMuted italic">No active buy orders</div>
        ) : (
          displayBids.map((bid, idx) => {
            const depthPercent = Math.min(100, (bid.total / maxTotal) * 100);
            return (
              <div
                key={`bid-${bid.price}-${idx}`}
                onClick={() => onSelectPrice(bid.price)}
                className="grid grid-cols-3 text-xs font-mono py-0.5 px-1 relative cursor-pointer hover:bg-buySubtle/40 rounded transition-colors group"
              >
                {/* Visual Depth Bar Fill */}
                <div
                  className="absolute top-0 right-0 bottom-0 bg-buySubtle pointer-events-none rounded-r transition-all duration-200"
                  style={{ width: `${depthPercent}%` }}
                />
                <span className="text-buy font-medium group-hover:underline z-10 font-mono-numbers">
                  {bid.price.toFixed(2)}
                </span>
                <span className="text-right text-textSecondary z-10 font-mono-numbers">
                  {bid.amount.toFixed(4)}
                </span>
                <span className="text-right text-textMuted z-10 font-mono-numbers">
                  {bid.total.toFixed(4)}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
