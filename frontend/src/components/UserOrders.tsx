import React, { useState } from 'react';
import { useAccount, useWriteContract, useChainId } from 'wagmi';
import { CONTRACTS, EXCHANGE_ABI } from '../config/contracts';
import { XCircle, Loader2, CheckCircle2, Clock } from 'lucide-react';

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
  const chainId = useChainId();
  const [tab, setTab] = useState<'open' | 'history'>('open');
  const [cancellingId, setCancellingId] = useState<number | null>(null);

  const activeContractConfig = chainId === 11155111 ? CONTRACTS.sepolia : CONTRACTS.anvil;
  const { writeContractAsync: writeExchange } = useWriteContract();

  const openOrders = orders.filter(o => o.status === 'ACTIVE' || o.status === 'PARTIALLY_FILLED');
  const historyOrders = orders.filter(o => o.status === 'FILLED' || o.status === 'CANCELLED');
  const displayOrders = tab === 'open' ? openOrders : historyOrders;

  const handleCancelOrder = async (orderId: number) => {
    setCancellingId(orderId);
    try {
      const hash = await writeExchange({
        address: activeContractConfig.exchange,
        abi: EXCHANGE_ABI,
        functionName: 'cancelOrder',
        args: [BigInt(orderId)]
      });

      onNotify('info', 'Cancellation Broadcasted', `Transaction: ${hash.slice(0, 10)}...`);
      setTimeout(() => {
        setCancellingId(null);
        onOrderCancelled();
        onNotify('success', 'Order Cancelled', 'Remaining escrow refunded to your wallet.');
      }, 2500);
    } catch (err: any) {
      setCancellingId(null);
      onNotify('error', 'Cancellation Failed', err.shortMessage || err.message);
    }
  };

  return (
    <div className="terminal-card rounded-xl p-3.5 flex flex-col h-full select-none">
      {/* Header Tabs */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-border/60">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setTab('open')}
            className={`text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded transition-colors ${
              tab === 'open'
                ? 'bg-surfaceHover text-brand border border-brand/20'
                : 'text-textMuted hover:text-white'
            }`}
          >
            Open Orders ({openOrders.length})
          </button>
          <button
            onClick={() => setTab('history')}
            className={`text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded transition-colors ${
              tab === 'history'
                ? 'bg-surfaceHover text-brand border border-brand/20'
                : 'text-textMuted hover:text-white'
            }`}
          >
            Order History
          </button>
        </div>
        <span className="text-[10px] text-textMuted font-mono">Non-Custodial Escrow</span>
      </div>

      {/* Table Headers */}
      <div className="grid grid-cols-6 text-[10px] uppercase font-mono text-textMuted pb-1.5 px-2">
        <span>Side</span>
        <span>Price (USDT)</span>
        <span>Amount (WETH)</span>
        <span>Filled</span>
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
                className="grid grid-cols-6 text-xs font-mono py-1.5 px-2 hover:bg-surfaceHover rounded-lg transition-colors items-center"
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
                <span className="font-mono-numbers text-textPrimary font-medium">
                  ${order.price.toFixed(2)}
                </span>
                <span className="font-mono-numbers text-textSecondary">
                  {order.amount.toFixed(4)}
                </span>
                <span className="font-mono-numbers text-textMuted text-[11px]">
                  {order.filledAmount.toFixed(4)} ({fillPct}%)
                </span>
                <div>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded ${
                      order.status === 'FILLED'
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : order.status === 'CANCELLED'
                        ? 'bg-zinc-500/10 text-zinc-400'
                        : 'bg-brand/10 text-brand'
                    }`}
                  >
                    {order.status}
                  </span>
                </div>
                <div className="text-right">
                  {order.status === 'ACTIVE' || order.status === 'PARTIALLY_FILLED' ? (
                    <button
                      onClick={() => handleCancelOrder(order.id)}
                      disabled={cancellingId === order.id}
                      className="px-2 py-0.5 rounded bg-surface border border-sell/30 hover:bg-sellSubtle text-sell text-[11px] font-medium transition-all inline-flex items-center gap-1"
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
