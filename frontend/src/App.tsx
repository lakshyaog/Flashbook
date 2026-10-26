import React, { useState, useEffect, useCallback } from 'react';
import { WagmiProvider, useAccount, useReadContracts, useChainId } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { config } from './config/wagmi';
import { CONTRACTS, ERC20_ABI } from './config/contracts';
import { Header } from './components/Header';
import { OrderBook } from './components/OrderBook';
import { OrderForm } from './components/OrderForm';
import { PriceChart } from './components/PriceChart';
import { RecentTrades, TradeItem } from './components/RecentTrades';
import { UserOrders, UserOrderItem } from './components/UserOrders';
import { MarketMakerPanel, MMStatusData } from './components/MarketMakerPanel';
import { FaucetModal } from './components/FaucetModal';
import { NotificationToast, ToastMessage } from './components/NotificationToast';

const queryClient = new QueryClient();

function TradingTerminal() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const activeContractConfig = chainId === 11155111 ? CONTRACTS.sepolia : CONTRACTS.anvil;

  // Selected price from orderbook click
  const [selectedPrice, setSelectedPrice] = useState<number | null>(null);
  const [isFaucetOpen, setIsFaucetOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // State data
  const [marketStats, setMarketStats] = useState({
    lastPrice: 3000.0,
    change24h: 2.45,
    high24h: 3080.0,
    low24h: 2920.0,
    volume24h: 142.5,
  });

  const [orderbook, setOrderbook] = useState({
    bids: [] as Array<{ price: number; amount: number; total: number; orderCount: number }>,
    asks: [] as Array<{ price: number; amount: number; total: number; orderCount: number }>,
    bestBid: 2995.0,
    bestAsk: 3005.0,
    spread: 10.0,
    spreadBps: 33.3,
  });

  const [recentTrades, setRecentTrades] = useState<TradeItem[]>([]);
  const [userOrders, setUserOrders] = useState<UserOrderItem[]>([]);
  const [mmStatus, setMmStatus] = useState<MMStatusData | null>(null);
  const [candles, setCandles] = useState<any[]>([]);

  const addToast = useCallback((type: 'success' | 'error' | 'info', title: string, message: string) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Fetch balances and allowances from blockchain
  const { data: contractData, refetch: refetchBalances } = useReadContracts({
    contracts: [
      {
        address: activeContractConfig.weth,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [address || '0x0000000000000000000000000000000000000000'],
      },
      {
        address: activeContractConfig.usdt,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [address || '0x0000000000000000000000000000000000000000'],
      },
      {
        address: activeContractConfig.weth,
        abi: ERC20_ABI,
        functionName: 'allowance',
        args: [address || '0x0000000000000000000000000000000000000000', activeContractConfig.exchange],
      },
      {
        address: activeContractConfig.usdt,
        abi: ERC20_ABI,
        functionName: 'allowance',
        args: [address || '0x0000000000000000000000000000000000000000', activeContractConfig.exchange],
      },
    ],
  });

  const wethBalance = (contractData?.[0]?.result as bigint) || 0n;
  const usdtBalance = (contractData?.[1]?.result as bigint) || 0n;
  const wethAllowance = (contractData?.[2]?.result as bigint) || 0n;
  const usdtAllowance = (contractData?.[3]?.result as bigint) || 0n;

  // Poll API for market data, orderbook, trades, user orders, and candles
  const fetchMarketData = useCallback(async () => {
    try {
      const [marketRes, obRes, tradesRes, mmRes, candlesRes] = await Promise.allSettled([
        fetch('/api/markets/FWETH-FUSDT').then((r) => (r.ok ? r.json() : null)),
        fetch('/api/orderbook').then((r) => (r.ok ? r.json() : null)),
        fetch('/api/trades').then((r) => (r.ok ? r.json() : null)),
        fetch('/api/market-maker/status').then((r) => (r.ok ? r.json() : null)),
        fetch('/api/analytics/candles?timeframe=1h').then((r) => (r.ok ? r.json() : null)),
      ]);

      if (marketRes.status === 'fulfilled' && marketRes.value?.success) {
        setMarketStats(marketRes.value.data);
      }
      if (obRes.status === 'fulfilled' && obRes.value?.success) {
        setOrderbook(obRes.value.data);
      }
      if (tradesRes.status === 'fulfilled' && tradesRes.value?.success) {
        setRecentTrades(tradesRes.value.data);
      }
      if (mmRes.status === 'fulfilled' && mmRes.value?.success) {
        setMmStatus(mmRes.value.data);
      }
      if (candlesRes.status === 'fulfilled' && candlesRes.value?.success) {
        setCandles(candlesRes.value.data);
      }

      if (address) {
        const userOrdersRes = await fetch(`/api/orders?maker=${address}`).then((r) =>
          r.ok ? r.json() : null
        );
        if (userOrdersRes?.success) {
          setUserOrders(userOrdersRes.data);
        }
      }
    } catch (err) {
      // Backend not yet reachable during initial start
    }
  }, [address]);

  useEffect(() => {
    fetchMarketData();
    const interval = setInterval(fetchMarketData, 3000);
    return () => clearInterval(interval);
  }, [fetchMarketData]);

  const handleManualMMStep = async () => {
    try {
      const res = await fetch('/api/market-maker/step', { method: 'POST' });
      if (res.ok) {
        addToast('success', 'AI Quoting Updated', 'Computed new reservation price and optimal depth.');
        fetchMarketData();
      }
    } catch (err: any) {
      addToast('error', 'MM Step Failed', err.message);
    }
  };

  const handleToggleDryRun = async (newDryRun: boolean) => {
    try {
      const res = await fetch('/api/market-maker/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dryRun: newDryRun }),
      });
      if (res.ok) {
        addToast('info', 'Market Maker Mode', `AI MM is now in ${newDryRun ? 'DRY-RUN' : 'LIVE'} mode.`);
        fetchMarketData();
      }
    } catch (err: any) {
      addToast('error', 'Mode Toggle Failed', err.message);
    }
  };

  const handleOrderSuccess = () => {
    refetchBalances();
    fetchMarketData();
    addToast('success', 'Order Processed', 'Balances and order book refreshed.');
  };

  return (
    <div className="min-h-screen bg-background text-textPrimary flex flex-col font-sans">
      <Header marketStats={marketStats} onOpenFaucet={() => setIsFaucetOpen(true)} />

      {/* Main Terminal Grid */}
      <main className="flex-1 p-3.5 grid grid-cols-1 lg:grid-cols-12 gap-3.5 max-w-[1720px] w-full mx-auto">
        {/* Left Column: Order Book (3 cols on desktop) */}
        <div className="lg:col-span-3 flex flex-col gap-3 min-h-[500px]">
          <OrderBook
            bids={orderbook.bids}
            asks={orderbook.asks}
            bestBid={orderbook.bestBid}
            bestAsk={orderbook.bestAsk}
            spread={orderbook.spread}
            spreadBps={orderbook.spreadBps}
            onSelectPrice={(p) => setSelectedPrice(p)}
          />
        </div>

        {/* Center Column: Price Chart & Orders/Trades Tabs (6 cols on desktop) */}
        <div className="lg:col-span-6 flex flex-col gap-3.5 min-h-[600px]">
          {/* Top Half: Interactive Price Chart */}
          <div className="h-[380px]">
            <PriceChart
              candles={candles}
              currentPrice={marketStats.lastPrice}
              priceChange={marketStats.change24h}
              bids={orderbook.bids}
              asks={orderbook.asks}
            />
          </div>

          {/* Bottom Half: User Open Orders and Recent Trades Feed */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 flex-1 min-h-[280px]">
            <div className="md:col-span-7">
              <UserOrders
                orders={userOrders}
                onOrderCancelled={handleOrderSuccess}
                onNotify={addToast}
              />
            </div>
            <div className="md:col-span-5">
              <RecentTrades trades={recentTrades} />
            </div>
          </div>
        </div>

        {/* Right Column: Limit Order Form & AI Market Maker Panel (3 cols on desktop) */}
        <div className="lg:col-span-3 flex flex-col gap-3.5 min-h-[600px]">
          {/* Limit Order Form */}
          <div className="flex-1 min-h-[380px]">
            <OrderForm
              selectedPrice={selectedPrice}
              wethBalance={wethBalance}
              usdtBalance={usdtBalance}
              wethAllowance={wethAllowance}
              usdtAllowance={usdtAllowance}
              onOrderSuccess={handleOrderSuccess}
              onNotify={addToast}
            />
          </div>

          {/* AI Market Maker Control & Telemetry */}
          <div className="h-[330px]">
            <MarketMakerPanel
              mmStatus={mmStatus}
              onRefresh={fetchMarketData}
              onStep={handleManualMMStep}
              onToggleDryRun={handleToggleDryRun}
            />
          </div>
        </div>
      </main>

      {/* Faucet Modal */}
      <FaucetModal
        isOpen={isFaucetOpen}
        onClose={() => setIsFaucetOpen(false)}
        onClaimSuccess={() => {
          refetchBalances();
          fetchMarketData();
        }}
        onNotify={addToast}
      />

      {/* Floating Notifications */}
      <NotificationToast toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

export default function App() {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <TradingTerminal />
      </QueryClientProvider>
    </WagmiProvider>
  );
}
