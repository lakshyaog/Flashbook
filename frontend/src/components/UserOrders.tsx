import React, { useState } from 'react';
import { useAccount } from 'wagmi';
import { useCancelOrder } from '../hooks/useCancelOrder';
import { XCircle, Loader2, CheckCircle2, Clock } from 'lucide-react';

// Side | Price | Size+filled | Status | Action — sized to fit the narrow dashboard column
const ORDER_COLS = 'grid-cols-[44px_minmax(0,1fr)_minmax(0,1fr)_68px_76px]';

export interface UserOrderItem {
  id: number;
  side: 'BUY' | 'SELL';
  price: number;
  amount: number;
  filledAmount: number;
  status: 'ACTIVE' | 'FILLED' | 'PARTIALLY_FILLED' | 'CANCELLED';
  timestamp: number;
  txHash?: string;
}

interface UserOrdersProps {
  orders: UserOrderItem[];
  onOrderCancelled: () => void;
  onNotify: (type: 'success' | 'error' | 'info', title: string, message: string) => void;
}

export const UserOrders: React.FC<UserOrdersProps> = ({
  orders,
  onOrderCancelled,
  onNotify
}) => {
  const { isConnected } = useAccount();
  const [tab, setTab] = useState<'open' | 'history'>('open');
  const { cancelOrder: handleCancelOrder, cancellingId } = useCancelOrder(onOrderCancelled, onNotify);

  const openOrders = orders.filter(o => o.status === 'ACTIVE' || o.status === 'PARTIALLY_FILLED');
  const historyOrders = orders.filter(o => o.status === 'FILLED' || o.status === 'CANCELLED');
  const displayOrders = tab === 'open' ? openOrders : historyOrders;

  return (
    <div className="terminal-card rounded-2xl p-4 flex flex-col h-full select-none">
      {/* Header Tabs */}
      <div className="flex items-center justify-between pb-3 mb-2 border-b border-border">
        <div className="segmented">
          <button
            onClick={() => setTab('open')}
            className={`segmented-item ${tab === 'open' ? 'segmented-item-active' : ''}`}
          >
            Open Orders
            <span className="ml-1.5 px-1.5 rounded-md bg-brand/15 text-brand font-mono-numbers text-[10px]">{openOrders.length}</span>
          </button>
          <button
            onClick={() => setTab('history')}
            className={`segmented-item ${tab === 'history' ? 'segmented-item-active' : ''}`}
          >
            History
          </button>
        </div>
        <span className="text-[10px] text-textMuted font-mono">Non-Custodial Escrow</span>
      </div>

      {/* Table Headers */}
      <div className={`grid ${ORDER_COLS} gap-2 text-[10px] uppercase font-mono text-textMuted pb-1.5 px-2`}>
        <span>Side</span>
        <span>Price</span>
        <span>Size / Filled</span>
        <span>Status</span>
        <span className="text-right">Action</span>
      </div>

      {/* Orders List */}
      <div className="flex-1 overflow-y-auto space-y-1 min-h-[140px] pr-1">
        {!isConnected ? (
          <div className="text-center py-8 text-xs text-textMuted italic">
            Connect wallet to view your active orders
          </div>
        ) : displayOrders.length === 0 ? (
          <div className="text-center py-8 text-xs text-textMuted italic">
            {tab === 'open' ? 'No active open orders' : 'No order history'}
          </div>
        ) : (
          displayOrders.map((order) => {
            const fillPct = ((order.filledAmount / order.amount) * 100).toFixed(0);
            return (
              <div
                key={order.id}
                className={`grid ${ORDER_COLS} gap-2 text-xs font-mono py-1.5 px-2 hover:bg-surfaceHover rounded-lg transition-colors items-center`}
              >
                <div>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      order.side === 'BUY'
                        ? 'bg-buySubtle text-buy border border-buy/20'
                        : 'bg-sellSubtle text-sell border border-sell/20'
                    }`}
                  >
                    {order.side}
                  </span>
                </div>
                <span className="font-mono-numbers text-textPrimary font-medium truncate">
                  ${order.price.toFixed(2)}
                </span>
                <div className="min-w-0 leading-tight">
                  <div className="font-mono-numbers text-textSecondary truncate">{order.amount.toFixed(4)}</div>
                  <div className="font-mono-numbers text-textMuted text-[10px]">{fillPct}% filled</div>
                </div>
                <div>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap ${
                      order.status === 'FILLED'
                        ? 'bg-emerald-500/10 text-emerald-600'
                        : order.status === 'CANCELLED'
                        ? 'bg-zinc-500/10 text-zinc-500'
                        : 'bg-brand/10 text-brand'
                    }`}
                  >
                    {order.status === 'PARTIALLY_FILLED' ? 'PARTIAL' : order.status}
                  </span>
                </div>
                <div className="text-right">
                  {order.status === 'ACTIVE' || order.status === 'PARTIALLY_FILLED' ? (
                    <button
                      onClick={() => handleCancelOrder(order.id)}
                      disabled={cancellingId === order.id}
                      className="px-2.5 py-1 rounded-lg bg-white border border-sell/30 hover:bg-sellSubtle hover:border-sell/50 text-sell text-[11px] font-medium transition-colors inline-flex items-center gap-1 shadow-[0_1px_2px_rgba(15,23,41,0.06)]"
                    >
                      {cancellingId === order.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <XCircle className="w-3 h-3" />
                      )}
                      <span>Cancel</span>
                    </button>
                  ) : (
                    <span className="text-[10px] text-textMuted font-mono">Archived</span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
