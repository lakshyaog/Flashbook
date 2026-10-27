import React, { useState, useEffect, useCallback } from 'react';
import { WagmiProvider, useAccount, useReadContracts, useChainId } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { config } from './config/wagmi';
import { CONTRACTS, ERC20_ABI } from './config/contracts';
import { Header } from './components/Header';
import { Sidebar, Page } from './components/Sidebar';
import { StatsRow } from './components/StatsRow';
import { MarketsPage, MarketSummary } from './pages/MarketsPage';
import { MarketMakerPage } from './pages/MarketMakerPage';
import { HistoryPage } from './pages/HistoryPage';

const PAGE_TITLES: Record<Page, string> = {
  dashboard: 'Market Overview',
  markets: 'Markets',
  'market-maker': 'AI Market Maker',
  history: 'History',
};
import { OrderBook } from './components/OrderBook';
import { OrderForm } from './components/OrderForm';
import { PriceChart, Timeframe } from './components/PriceChart';
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

  // State data — starts empty; 0 means "no data yet" and renders as an em dash
  const [marketStats, setMarketStats] = useState({
    lastPrice: 0,
    change24h: 0,
    high24h: 0,
    low24h: 0,
    volume24h: 0,
  });

  const [orderbook, setOrderbook] = useState({
    bids: [] as Array<{ price: number; amount: number; total: number; orderCount: number }>,
    asks: [] as Array<{ price: number; amount: number; total: number; orderCount: number }>,
    bestBid: 0,
    bestAsk: 0,
    spread: 0,
    spreadBps: 0,
  });

  const [apiStatus, setApiStatus] = useState<'connecting' | 'online' | 'offline'>('connecting');
  const [page, setPage] = useState<Page>('dashboard');
  const [markets, setMarkets] = useState<MarketSummary[]>([]);
  const [recentTrades, setRecentTrades] = useState<TradeItem[]>([]);
  const [userOrders, setUserOrders] = useState<UserOrderItem[]>([]);
  const [mmStatus, setMmStatus] = useState<MMStatusData | null>(null);
  const [candles, setCandles] = useState<any[]>([]);
  const [chartTimeframe, setChartTimeframe] = useState<Timeframe>('1m');

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
      const [marketRes, obRes, tradesRes, mmRes, candlesRes, marketsRes] = await Promise.allSettled([
        fetch('/api/markets/FWETH-FUSDT').then((r) => (r.ok ? r.json() : null)),
        fetch('/api/orderbook').then((r) => (r.ok ? r.json() : null)),
        fetch('/api/trades').then((r) => (r.ok ? r.json() : null)),
        fetch('/api/market-maker/status').then((r) => (r.ok ? r.json() : null)),
        fetch(`/api/analytics/candles?timeframe=${chartTimeframe}`).then((r) => (r.ok ? r.json() : null)),
        fetch('/api/markets').then((r) => (r.ok ? r.json() : null)),
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
      if (marketsRes.status === 'fulfilled' && marketsRes.value?.success) {
        setMarkets(marketsRes.value.data);
      }

      const anySuccess = [marketRes, obRes, tradesRes, mmRes, candlesRes, marketsRes].some(
        (r) => r.status === 'fulfilled' && r.value?.success
      );
      setApiStatus(anySuccess ? 'online' : 'offline');

      if (address) {
        const userOrdersRes = await fetch(`/api/orders?maker=${address}`).then((r) =>
          r.ok ? r.json() : null
        );
        if (userOrdersRes?.success) {
          setUserOrders(userOrdersRes.data);
        }
      }
    } catch (err) {
      setApiStatus('offline');
    }
  }, [address, chartTimeframe]);

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
    <div className="min-h-screen bg-background app-backdrop text-textPrimary flex font-sans">
      <Sidebar activePage={page} onNavigate={setPage} onOpenFaucet={() => setIsFaucetOpen(true)} />

      <div className="flex-1 min-w-0 flex flex-col">
      <Header title={PAGE_TITLES[page]} onOpenFaucet={() => setIsFaucetOpen(true)} />

      {apiStatus === 'offline' && (
        <div className="mx-4 mt-4 flex items-center gap-3 rounded-xl border border-sell/25 bg-sellSubtle px-4 py-3 text-sm">
          <span className="w-2 h-2 rounded-full bg-sell animate-pulse" />
          <span className="font-semibold text-sell">Backend offline</span>
          <span className="text-textSecondary">
            Can't reach the API on port 3001. Start it with <code className="font-mono text-textPrimary">cd backend &amp;&amp; npm run dev</code>. Data below is not live.
          </span>
        </div>
      )}

      {page === 'markets' && (
        <MarketsPage
          markets={markets}
          marketStats={marketStats}
          orderbook={orderbook}
          candles={candles}
          timeframe={chartTimeframe}
          onTimeframeChange={setChartTimeframe}
          trades={recentTrades}
          onTrade={() => setPage('dashboard')}
        />
      )}

      {page === 'market-maker' && (
        <MarketMakerPage
          mmStatus={mmStatus}
          onStep={handleManualMMStep}
          onToggleDryRun={handleToggleDryRun}
        />
      )}

      {page === 'history' && (
        <HistoryPage
          orders={userOrders}
          trades={recentTrades}
          onOrderCancelled={handleOrderSuccess}
          onNotify={addToast}
        />
      )}

      {page === 'dashboard' && (<>
      {/* KPI Row */}
      <section className="px-4 pt-4 max-w-[1720px] w-full mx-auto">
        <StatsRow
          marketStats={marketStats}
          spread={orderbook.spread}
          spreadBps={orderbook.spreadBps}
          candles={candles}
          mmRiskStatus={mmStatus?.latestDecision?.riskStatus}
          mmDryRun={mmStatus?.dryRun}
        />
      </section>

      {/* Main Terminal Grid */}
      <main className="flex-1 p-4 grid grid-cols-1 lg:grid-cols-12 gap-3.5 max-w-[1720px] w-full mx-auto">
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
              timeframe={chartTimeframe}
              onTimeframeChange={setChartTimeframe}
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
          <div className="min-h-[330px]">
            <MarketMakerPanel
              mmStatus={mmStatus}
              onRefresh={fetchMarketData}
              onStep={handleManualMMStep}
              onToggleDryRun={handleToggleDryRun}
            />
          </div>
        </div>
      </main>
      </>)}
      </div>

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
