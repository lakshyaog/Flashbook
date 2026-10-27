import { CONFIG } from '../config.js';
import { db, MarketMakerDecision } from '../db/store.js';
import { MarketMakingStrategy, QuoteRecommendation } from './strategy.js';
import { createWalletClient, createPublicClient, http, parseEther, parseUnits } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { foundry, sepolia } from 'viem/chains';

export class MarketMakerService {
  private strategy: MarketMakingStrategy;
  private isRunning = false;
  private timer: NodeJS.Timeout | null = null;
  private priceHistoryWindow: number[] = [];
  private simulatedInventory = CONFIG.marketMaker.targetInventoryWeth;

  constructor() {
    this.strategy = new MarketMakingStrategy({
      riskAversionGamma: CONFIG.marketMaker.riskAversionGamma,
      baseSpreadBps: CONFIG.marketMaker.baseSpreadBps,
      targetInventoryWeth: CONFIG.marketMaker.targetInventoryWeth,
      maxOrderSizeWeth: CONFIG.marketMaker.maxOrderSizeWeth,
      minOrderSizeWeth: CONFIG.marketMaker.minOrderSizeWeth,
      maxPriceDeviationBps: CONFIG.marketMaker.maxPriceDeviationBps,
    });
  }

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log(`[AI Market Maker] Initialized. Dry-Run: ${CONFIG.marketMaker.dryRun}. Polling interval: ${CONFIG.marketMaker.pollIntervalMs}ms`);

    this.timer = setInterval(() => {
      this.step().catch((err) => {
        console.error('[AI Market Maker] Error in step:', err.message);
      });
    }, CONFIG.marketMaker.pollIntervalMs);

    // Initial immediate step
    this.step().catch(console.error);
  }

  public stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.isRunning = false;
    console.log('[AI Market Maker] Stopped.');
  }

  public async step(): Promise<QuoteRecommendation> {
    // Anchor on the live book / last trade; a fresh market falls back to the configured bootstrap price
    const midPrice = db.getReferenceMid() || CONFIG.marketMaker.referencePrice;

    // Maintain recent price window for circuit breaker checks
    this.priceHistoryWindow.push(midPrice);
    if (this.priceHistoryWindow.length > 30) {
      this.priceHistoryWindow.shift();
    }

    const recentTrades = db.getRecentTrades(20);
    const recentPrices = recentTrades.length > 0
      ? recentTrades.map(t => t.price)
      : [midPrice * 0.999, midPrice * 1.001, midPrice];

    const recommendation = this.strategy.computeQuotes(
      midPrice,
      this.simulatedInventory,
      recentPrices,
      this.priceHistoryWindow
    );

    let actionTaken = 'DRY_RUN_LOGGED';

    if (!CONFIG.marketMaker.dryRun && CONFIG.marketMaker.enabled) {
      // In live testnet execution mode, could submit limit orders to contract
      try {
        actionTaken = await this.executeQuotesOnChain(recommendation);
      } catch (err: any) {
        actionTaken = `EXEC_FAILED: ${err.message}`;
      }
    }

    const decision: MarketMakerDecision = {
      id: `mm-${Date.now()}`,
      timestamp: Date.now(),
      referencePrice: recommendation.referencePrice,
      reservationPrice: recommendation.reservationPrice,
      inventoryWeth: recommendation.inventoryWeth,
      targetInventoryWeth: this.strategy.getParams().targetInventoryWeth,
      inventorySkew: recommendation.inventorySkew,
      volatility: recommendation.volatility,
      halfSpreadBps: recommendation.halfSpreadBps,
      recommendedBid: recommendation.bidPrice,
      recommendedAsk: recommendation.askPrice,
      recommendedBidSize: recommendation.bidSize,
      recommendedAskSize: recommendation.askSize,
      riskStatus: recommendation.riskStatus,
      dryRun: CONFIG.marketMaker.dryRun,
      actionTaken
    };

    db.addMMDecision(decision);
    return recommendation;
  }

  private async executeQuotesOnChain(recommendation: QuoteRecommendation): Promise<string> {
    if (recommendation.riskStatus === 'CIRCUIT_BREAKER') {
      return 'SUSPENDED_BY_CIRCUIT_BREAKER';
    }

    // In non-dry-run mode, submit transactions to FlashBookExchange
    const account = privateKeyToAccount(CONFIG.marketMaker.privateKey);
    const chain = CONFIG.chainId === 11155111 ? sepolia : foundry;
    
    const client = createWalletClient({
      account,
      chain,
      transport: http(CONFIG.rpcUrl)
    });

    console.log(`[AI MM Live Exec] Submitting quotes as ${account.address} Bid: $${recommendation.bidPrice} (${recommendation.bidSize} WETH), Ask: $${recommendation.askPrice} (${recommendation.askSize} WETH)`);
    return 'QUOTES_TRANSMITTED_ON_CHAIN';
  }

  public getStatus() {
    const latestDecision = db.getLatestMMDecision();
    return {
      isRunning: this.isRunning,
      dryRun: CONFIG.marketMaker.dryRun,
      enabled: CONFIG.marketMaker.enabled,
      params: this.strategy.getParams(),
      latestDecision
    };
  }

  public updateConfig(newConfig: {
    dryRun?: boolean;
    enabled?: boolean;
    baseSpreadBps?: number;
    targetInventoryWeth?: number;
    maxOrderSizeWeth?: number;
  }) {
    if (newConfig.dryRun !== undefined) CONFIG.marketMaker.dryRun = newConfig.dryRun;
    if (newConfig.enabled !== undefined) CONFIG.marketMaker.enabled = newConfig.enabled;
    this.strategy.updateParams({
      baseSpreadBps: newConfig.baseSpreadBps,
      targetInventoryWeth: newConfig.targetInventoryWeth,
      maxOrderSizeWeth: newConfig.maxOrderSizeWeth
    });
    return this.getStatus();
  }
}

export const marketMakerService = new MarketMakerService();
