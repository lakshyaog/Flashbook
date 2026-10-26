import React from 'react';
import { ExternalLink } from 'lucide-react';
import { useChainId } from 'wagmi';
import { CONTRACTS } from '../config/contracts';

export interface TradeItem {
  id: string;
  price: number;
  amount: number;
  timestamp: number;
  txHash: string;
  isBuy?: boolean;
}

interface RecentTradesProps {
  trades: TradeItem[];
}

export const RecentTrades: React.FC<RecentTradesProps> = ({ trades }) => {
  const chainId = useChainId();
  const explorerUrl = chainId === 11155111 ? CONTRACTS.sepolia.explorer : CONTRACTS.anvil.explorer;

  return (
    <div className="terminal-card rounded-xl p-3 flex flex-col h-full select-none">
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-border/60">
        <span className="text-xs font-bold uppercase tracking-wider text-textPrimary">Recent Trades</span>
        <span className="text-[10px] text-textMuted font-mono">Live On-Chain Fills</span>
      </div>

      <div className="grid grid-cols-4 text-[10px] uppercase font-mono text-textMuted pb-1 px-1">
        <span>Price (USDT)</span>
        <span className="text-right">Size (WETH)</span>
        <span className="text-right">Time</span>
        <span className="text-right">Tx</span>
      </div>

      <div className="flex-1 overflow-y-auto space-y-1 min-h-[140px] pr-1">
        {trades.length === 0 ? (
          <div className="text-center py-6 text-xs text-textMuted italic">No recent trades yet</div>
        ) : (
          trades.slice(0, 15).map((t, idx) => {
            const isBuy = t.isBuy ?? (idx % 2 === 0);
            const timeStr = new Date(t.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            return (
              <div
                key={t.id || idx}
                className="grid grid-cols-4 text-xs font-mono py-1 px-1 hover:bg-surfaceHover rounded transition-colors items-center"
              >
                <span className={`font-medium font-mono-numbers ${isBuy ? 'text-buy' : 'text-sell'}`}>
                  {t.price.toFixed(2)}
                </span>
                <span className="text-right text-textSecondary font-mono-numbers">
                  {t.amount.toFixed(4)}
                </span>
                <span className="text-right text-textMuted text-[11px]">
                  {timeStr}
                </span>
                <span className="text-right flex justify-end">
                  {t.txHash ? (
                    <a
                      href={`${explorerUrl}/tx/${t.txHash}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-brand hover:underline flex items-center gap-0.5 text-[11px]"
                    >
                      <span>{t.txHash.slice(0, 4)}...</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  ) : (
                    <span className="text-textMuted text-[10px]">Settled</span>
                  )}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
