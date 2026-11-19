import React, { useState } from 'react';
import { useAccount, useChainId } from 'wagmi';
import { Download, ExternalLink, Loader2, XCircle, Wallet } from 'lucide-react';
import { CONTRACTS } from '../config/contracts';
import { TradeItem } from '../components/RecentTrades';
import { UserOrderItem } from '../components/UserOrders';
import { useCancelOrder } from '../hooks/useCancelOrder';

interface HistoryPageProps {
  orders: UserOrderItem[];
  trades: TradeItem[];
  onOrderCancelled: () => void;
  onNotify: (type: 'success' | 'error' | 'info', title: string, message: string) => void;
}

type OrderFilter = 'all' | 'open' | 'filled' | 'cancelled';

const usd = (n: number) => `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const dateTime = (ts: number) =>
  new Date(ts).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
const shortAddr = (a?: string) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : '—');

const STATUS_STYLE: Record<UserOrderItem['status'], string> = {
  ACTIVE: 'bg-brand/10 text-brand',
  PARTIALLY_FILLED: 'bg-amber-500/10 text-amber-600',
  FILLED: 'bg-buySubtle text-buy',
  CANCELLED: 'bg-surfaceHover text-textMuted',
};

const isOpen = (o: UserOrderItem) => o.status === 'ACTIVE' || o.status === 'PARTIALLY_FILLED';

function downloadCsv(filename: string, rows: Array<Array<string | number>>) {
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const SummaryTile: React.FC<{ label: string; value: React.ReactNode; tone?: string }> = ({ label, value, tone = 'text-textPrimary' }) => (
  <div className="terminal-card rounded-2xl p-4">
    <div className="text-xs text-textSecondary mb-2">{label}</div>
    <div className={`text-2xl font-semibold font-mono-numbers ${tone}`}>{value}</div>
  </div>
);

export const HistoryPage: React.FC<HistoryPageProps> = ({ orders, trades, onOrderCancelled, onNotify }) => {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const explorerUrl = chainId === 11155111 ? CONTRACTS.sepolia.explorer : CONTRACTS.anvil.explorer;
  const { cancelOrder, cancellingId } = useCancelOrder(onOrderCancelled, onNotify);

  const [tab, setTab] = useState<'orders' | 'trades'>('orders');
  const [filter, setFilter] = useState<OrderFilter>('all');

  const openCount = orders.filter(isOpen).length;
  const filledCount = orders.filter((o) => o.status === 'FILLED').length;
  const cancelledCount = orders.filter((o) => o.status === 'CANCELLED').length;
  const tradeVolume = trades.reduce((s, t) => s + t.amount, 0);

  const filteredOrders = orders.filter((o) =>
    filter === 'all' ? true
      : filter === 'open' ? isOpen(o)
      : filter === 'filled' ? o.status === 'FILLED'
      : o.status === 'CANCELLED'
  );

  const exportCurrent = () => {
    if (tab === 'orders') {
      downloadCsv('flashbook-orders.csv', [
        ['id', 'time', 'side', 'price', 'amount', 'filled', 'status', 'txHash'],
        ...filteredOrders.map((o) => [o.id, new Date(o.timestamp).toISOString(), o.side, o.price, o.amount, o.filledAmount, o.status, o.txHash || '']),
      ]);
    } else {
      downloadCsv('flashbook-trades.csv', [
        ['id', 'time', 'price', 'amount', 'value', 'fee', 'buyer', 'seller', 'txHash'],
        ...trades.map((t) => [t.id, new Date(t.timestamp).toISOString(), t.price, t.amount, t.quoteAmount ?? t.price * t.amount, t.feeQuote ?? '', t.buyer || '', t.seller || '', t.txHash]),
      ]);
    }
  };

  return (
    <main className="flex-1 p-4 max-w-[1720px] w-full mx-auto space-y-4">
      {/* Summary */}
      <section className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <SummaryTile label="Total orders" value={orders.length} />
        <SummaryTile label="Open" value={openCount} tone="text-brand" />
        <SummaryTile label="Filled" value={filledCount} tone="text-buy" />
        <SummaryTile label="Cancelled" value={cancelledCount} tone="text-textMuted" />
        <SummaryTile label="Market volume (recent)" value={<>{tradeVolume.toFixed(2)} <span className="text-sm text-textMuted font-sans">FWETH</span></>} />
      </section>

      <section className="terminal-card rounded-2xl p-5">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="segmented">
              <button onClick={() => setTab('orders')} className={`segmented-item ${tab === 'orders' ? 'segmented-item-active' : ''}`}>
                My orders
              </button>
              <button onClick={() => setTab('trades')} className={`segmented-item ${tab === 'trades' ? 'segmented-item-active' : ''}`}>
                Market trades
              </button>
            </div>
            {tab === 'orders' && (
              <div className="flex items-center gap-1.5">
                {(['all', 'open', 'filled', 'cancelled'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-colors ${
                      filter === f ? 'bg-textPrimary text-white' : 'text-textSecondary hover:bg-surfaceHover'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button onClick={exportCurrent} className="btn-secondary px-3 py-2 text-xs">
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
        </div>

        <div className="overflow-x-auto">
          {tab === 'orders' ? (
            !isConnected ? (
              <div className="py-16 flex flex-col items-center gap-3 text-textMuted">
                <Wallet className="w-8 h-8" />
                <span className="text-sm">Connect your wallet to see your order history.</span>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-textMuted border-b border-border">
                    <th className="font-medium py-2.5 pr-4">Time</th>
                    <th className="font-medium py-2.5 pr-4">Order</th>
                    <th className="font-medium py-2.5 pr-4">Side</th>
                    <th className="font-medium py-2.5 pr-4 text-right">Price</th>
                    <th className="font-medium py-2.5 pr-4 text-right">Amount</th>
                    <th className="font-medium py-2.5 pr-4">Filled</th>
                    <th className="font-medium py-2.5 pr-4">Status</th>
                    <th className="font-medium py-2.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-textMuted">No orders match this filter.</td>
                    </tr>
                  ) : (
                    filteredOrders.map((o) => {
                      const fillPct = o.amount > 0 ? (o.filledAmount / o.amount) * 100 : 0;
                      return (
                        <tr key={o.id} className="border-b border-border last:border-0 hover:bg-surfaceHover transition-colors">
                          <td className="py-3 pr-4 text-textSecondary whitespace-nowrap">{dateTime(o.timestamp)}</td>
                          <td className="py-3 pr-4 font-mono-numbers text-textMuted">#{o.id}</td>
                          <td className="py-3 pr-4">
                            <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${o.side === 'BUY' ? 'bg-buySubtle text-buy' : 'bg-sellSubtle text-sell'}`}>
                              {o.side}
                            </span>
                          </td>
                          <td className="py-3 pr-4 text-right font-mono-numbers font-medium">{usd(o.price)}</td>
                          <td className="py-3 pr-4 text-right font-mono-numbers">{o.amount.toFixed(4)}</td>
                          <td className="py-3 pr-4">
                            <div className="flex items-center gap-2 min-w-[120px]">
                              <div className="flex-1 h-1.5 rounded-full bg-surfaceHover overflow-hidden">
                                <div className="h-full rounded-full bg-buy" style={{ width: `${fillPct}%` }} />
                              </div>
                              <span className="text-xs text-textSecondary font-mono-numbers w-9 text-right">{fillPct.toFixed(0)}%</span>
                            </div>
                          </td>
                          <td className="py-3 pr-4">
                            <span className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-semibold whitespace-nowrap ${STATUS_STYLE[o.status]}`}>
                              {o.status.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="py-3 text-right">
                            {isOpen(o) ? (
                              <button
                                onClick={() => cancelOrder(o.id)}
                                disabled={cancellingId === o.id}
                                className="px-2.5 py-1 rounded-lg bg-white border border-sell/30 hover:bg-sellSubtle text-sell text-xs font-medium inline-flex items-center gap-1 transition-colors"
                              >
                                {cancellingId === o.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3 h-3" />}
                                Cancel
                              </button>
                            ) : o.txHash ? (
                              <a href={`${explorerUrl}/tx/${o.txHash}`} target="_blank" rel="noreferrer" className="text-brand text-xs inline-flex items-center gap-1 hover:underline">
                                View tx <ExternalLink className="w-3 h-3" />
                              </a>
                            ) : (
                              <span className="text-xs text-textMuted">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            )
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-textMuted border-b border-border">
                  <th className="font-medium py-2.5 pr-4">Time</th>
                  <th className="font-medium py-2.5 pr-4 text-right">Price</th>
                  <th className="font-medium py-2.5 pr-4 text-right">Amount</th>
                  <th className="font-medium py-2.5 pr-4 text-right">Value</th>
                  <th className="font-medium py-2.5 pr-4 text-right">Fee</th>
                  <th className="font-medium py-2.5 pr-4">Buyer</th>
                  <th className="font-medium py-2.5 pr-4">Seller</th>
                  <th className="font-medium py-2.5 text-right">Tx</th>
                </tr>
              </thead>
              <tbody>
                {trades.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-textMuted">No trades yet.</td>
                  </tr>
                ) : (
                  trades.map((t, i) => (
                    <tr key={t.id || i} className="border-b border-border last:border-0 hover:bg-surfaceHover transition-colors">
                      <td className="py-3 pr-4 text-textSecondary whitespace-nowrap">{dateTime(t.timestamp)}</td>
                      <td className="py-3 pr-4 text-right font-mono-numbers font-medium">{usd(t.price)}</td>
                      <td className="py-3 pr-4 text-right font-mono-numbers">{t.amount.toFixed(4)}</td>
                      <td className="py-3 pr-4 text-right font-mono-numbers">{usd(t.quoteAmount ?? t.price * t.amount)}</td>
                      <td className="py-3 pr-4 text-right font-mono-numbers text-textSecondary">{t.feeQuote !== undefined ? usd(t.feeQuote) : '—'}</td>
                      <td className="py-3 pr-4 font-mono-numbers text-textSecondary">{shortAddr(t.buyer)}</td>
                      <td className="py-3 pr-4 font-mono-numbers text-textSecondary">{shortAddr(t.seller)}</td>
                      <td className="py-3 text-right">
                        {t.txHash ? (
                          <a href={`${explorerUrl}/tx/${t.txHash}`} target="_blank" rel="noreferrer" className="text-brand text-xs inline-flex items-center gap-1 hover:underline">
                            {t.txHash.slice(0, 8)}… <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <span className="text-xs text-textMuted">Settled</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </main>
  );
};
