import React from 'react';
import { ArrowUpRight, TrendingUp, TrendingDown } from 'lucide-react';
import { PriceChart, Timeframe } from '../components/PriceChart';
import { TradeItem } from '../components/RecentTrades';
import { fmtUsd, fmtPct, EMPTY } from '../utils/format';

export interface MarketSummary {
  pair: string;
  baseSymbol: string;
  quoteSymbol: string;
  lastPrice: number;
  change24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
}

interface OrderBookLevel {
  price: number;
  amount: number;
  total: number;
}

interface MarketsPageProps {
  markets: MarketSummary[];
  marketStats: {
    lastPrice: number;
    change24h: number;
    high24h: number;
    low24h: number;
    volume24h: number;
  };
  orderbook: {
    bids: OrderBookLevel[];
    asks: OrderBookLevel[];
    bestBid: number;
    bestAsk: number;
    spread: number;
    spreadBps: number;
  };
  candles: any[];
  timeframe: Timeframe;
  onTimeframeChange: (tf: Timeframe) => void;
  trades: TradeItem[];
  onTrade: () => void;
}


const Stat: React.FC<{ label: string; value: React.ReactNode; sub?: React.ReactNode }> = ({ label, value, sub }) => (
  <div>
    <div className="text-xs text-textMuted mb-1">{label}</div>
    <div className="text-lg font-semibold font-mono-numbers text-textPrimary">{value}</div>
    {sub && <div className="text-[11px] text-textMuted mt-0.5">{sub}</div>}
  </div>
);

export const MarketsPage: React.FC<MarketsPageProps> = ({ markets, marketStats, orderbook, candles, timeframe, onTimeframeChange, trades, onTrade }) => {
  const hasData = marketStats.lastPrice > 0;
  const isUp = marketStats.change24h >= 0;

  // Liquidity on each side of the book, in base units
  const bidDepth = orderbook.bids.reduce((sum, l) => sum + l.amount, 0);
  const askDepth = orderbook.asks.reduce((sum, l) => sum + l.amount, 0);
  const totalDepth = bidDepth + askDepth;
  const bidShare = totalDepth > 0 ? (bidDepth / totalDepth) * 100 : 50;

  const avgTradeSize = trades.length > 0 ? trades.reduce((s, t) => s + t.amount, 0) / trades.length : 0;

  const marketRows: MarketSummary[] = markets.length > 0
    ? markets
    : [{ pair: 'FWETH-FUSDT', baseSymbol: 'FWETH', quoteSymbol: 'FUSDT', ...marketStats }];

  return (
    <main className="flex-1 p-4 max-w-[1720px] w-full mx-auto space-y-4">
      {/* Pair hero */}
      <section className="terminal-card-glow rounded-2xl p-5 flex flex-wrap items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="flex -space-x-2">
            <div className="w-11 h-11 rounded-full bg-[#627EEA] flex items-center justify-center text-base font-bold text-white ring-4 ring-white">Ξ</div>
            <div className="w-11 h-11 rounded-full bg-[#26A17B] flex items-center justify-center text-base font-bold text-white ring-4 ring-white">₮</div>
          </div>
          <div>
            <div className="text-sm text-textMuted">FakeWETH / FakeUSDT</div>
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-bold font-mono-numbers text-textPrimary tracking-tight">{fmtUsd(marketStats.lastPrice)}</span>
              {hasData ? (
                <span className={`inline-flex items-center gap-1 text-sm font-semibold ${isUp ? 'text-buy' : 'text-sell'}`}>
                  {isUp ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                  {fmtPct(marketStats.change24h, true)}
                </span>
              ) : (
                <span className="text-sm text-textMuted">No trades yet</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-8">
          <Stat label="24h High" value={fmtUsd(marketStats.high24h)} />
          <Stat label="24h Low" value={fmtUsd(marketStats.low24h)} />
          <Stat label="24h Volume" value={hasData ? marketStats.volume24h.toFixed(2) : EMPTY} sub="FWETH" />
          <Stat label="Spread" value={fmtUsd(orderbook.spread)} sub={orderbook.spread ? `${orderbook.spreadBps.toFixed(1)} bps` : undefined} />
          <button onClick={onTrade} className="btn-primary px-5 py-2.5 text-sm">
            Trade <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* Chart + liquidity */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-8 h-[440px]">
          <PriceChart
            candles={candles}
            currentPrice={marketStats.lastPrice}
            priceChange={marketStats.change24h}
            bids={orderbook.bids}
            asks={orderbook.asks}
            timeframe={timeframe}
            onTimeframeChange={onTimeframeChange}
          />
        </div>

        <div className="lg:col-span-4 terminal-card rounded-2xl p-5 flex flex-col gap-5">
          <span className="panel-title">Liquidity</span>

          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl bg-buySubtle p-3">
              <div className="text-xs text-textSecondary">Best Bid</div>
              <div className="text-lg font-semibold font-mono-numbers text-buy">{fmtUsd(orderbook.bestBid)}</div>
            </div>
            <div className="rounded-xl bg-sellSubtle p-3">
              <div className="text-xs text-textSecondary">Best Ask</div>
              <div className="text-lg font-semibold font-mono-numbers text-sell">{fmtUsd(orderbook.bestAsk)}</div>
            </div>
          </div>

          {/* Bid / ask pressure */}
          <div>
            <div className="flex justify-between text-xs mb-2">
              <span className="text-textSecondary">Buy pressure <span className="font-semibold text-textPrimary">{bidShare.toFixed(0)}%</span></span>
              <span className="text-textSecondary"><span className="font-semibold text-textPrimary">{(100 - bidShare).toFixed(0)}%</span> Sell pressure</span>
            </div>
            <div className="flex h-2.5 rounded-full overflow-hidden gap-0.5 bg-white">
              <div className="bg-buy rounded-l-full" style={{ width: `${bidShare}%` }} />
              <div className="bg-sell rounded-r-full flex-1" />
            </div>
            <div className="flex justify-between text-[11px] text-textMuted mt-1.5 font-mono-numbers">
              <span>{bidDepth.toFixed(4)} FWETH</span>
              <span>{askDepth.toFixed(4)} FWETH</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
            <Stat label="Bid levels" value={orderbook.bids.length} />
            <Stat label="Ask levels" value={orderbook.asks.length} />
            <Stat label="Recent trades" value={trades.length} />
            <Stat label="Avg trade size" value={trades.length ? avgTradeSize.toFixed(4) : EMPTY} sub="FWETH" />
          </div>
        </div>
      </section>

      {/* All markets */}
      <section className="terminal-card rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <span className="panel-title">All Markets</span>
          <span className="text-xs text-textMuted">{marketRows.length} pair{marketRows.length === 1 ? '' : 's'}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-textMuted border-b border-border">
                <th className="font-medium py-2.5 pr-4">Pair</th>
                <th className="font-medium py-2.5 pr-4 text-right">Last Price</th>
                <th className="font-medium py-2.5 pr-4 text-right">24h Change</th>
                <th className="font-medium py-2.5 pr-4 text-right">24h High</th>
                <th className="font-medium py-2.5 pr-4 text-right">24h Low</th>
                <th className="font-medium py-2.5 pr-4 text-right">24h Volume</th>
                <th className="py-2.5" />
              </tr>
            </thead>
            <tbody>
              {marketRows.map((m) => {
                const up = m.change24h >= 0;
                return (
                  <tr key={m.pair} className="border-b border-border last:border-0 hover:bg-surfaceHover transition-colors">
                    <td className="py-3.5 pr-4">
                      <div className="font-semibold text-textPrimary">{m.baseSymbol}<span className="text-textMuted font-normal"> / {m.quoteSymbol}</span></div>
                    </td>
                    <td className="py-3.5 pr-4 text-right font-mono-numbers font-medium">{fmtUsd(m.lastPrice)}</td>
                    <td className="py-3.5 pr-4 text-right">
                      {m.lastPrice > 0 ? (
                        <span className={`inline-block px-2 py-0.5 rounded-md text-xs font-semibold font-mono-numbers ${up ? 'bg-buySubtle text-buy' : 'bg-sellSubtle text-sell'}`}>
                          {fmtPct(m.change24h, true)}
                        </span>
                      ) : (
                        <span className="text-textMuted">{EMPTY}</span>
                      )}
                    </td>
                    <td className="py-3.5 pr-4 text-right font-mono-numbers text-textSecondary">{fmtUsd(m.high24h)}</td>
                    <td className="py-3.5 pr-4 text-right font-mono-numbers text-textSecondary">{fmtUsd(m.low24h)}</td>
                    <td className="py-3.5 pr-4 text-right font-mono-numbers text-textSecondary">{m.lastPrice > 0 ? `${m.volume24h.toFixed(2)} ${m.baseSymbol}` : EMPTY}</td>
                    <td className="py-3.5 text-right">
                      <button onClick={onTrade} className="btn-secondary px-3 py-1.5 text-xs">Trade</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
};
