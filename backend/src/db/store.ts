import fs from 'fs';
import path from 'path';

export interface Market {
  pair: string;
  baseSymbol: string;
  quoteSymbol: string;
  baseAddress: string;
  quoteAddress: string;
  baseDecimals: number;
  quoteDecimals: number;
  lastPrice: number;
  change24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
}

export interface OrderRecord {
  id: number;
  maker: string;
  side: 'BUY' | 'SELL';
  price: number;        // Formatted price (e.g. 3000.50)
  priceRaw: string;     // Scaled uint256 string
  amount: number;       // Formatted amount (e.g. 1.5 WETH)
  amountRaw: string;    // Atomic uint256 string
  filledAmount: number;
  filledAmountRaw: string;
  status: 'ACTIVE' | 'FILLED' | 'PARTIALLY_FILLED' | 'CANCELLED';
  timestamp: number;
  txHash: string;
}

export interface TradeRecord {
  id: string;
  buyOrderId: number;
  sellOrderId: number;
  buyer: string;
  seller: string;
  price: number;
  amount: number;
  quoteAmount: number;
  feeQuote: number;
  timestamp: number;
  txHash: string;
}

export interface MarketMakerDecision {
  id: string;
  timestamp: number;
  referencePrice: number;
  reservationPrice: number;
  inventoryWeth: number;
  targetInventoryWeth: number;
  inventorySkew: number;
  volatility: number;
  halfSpreadBps: number;
  recommendedBid: number;
  recommendedAsk: number;
  recommendedBidSize: number;
  recommendedAskSize: number;
  riskStatus: 'NORMAL' | 'CIRCUIT_BREAKER' | 'EXPOSURE_LIMIT';
  dryRun: boolean;
  actionTaken: string;
}

interface DatabaseState {
  markets: Record<string, Market>;
  orders: Record<number, OrderRecord>;
  trades: TradeRecord[];
  mmDecisions: MarketMakerDecision[];
  lastIndexedBlock: number;
  indexedEvents: Record<string, boolean>; // txHash-logIndex deduplication
}

export class DataStore {
  private filePath: string;
  private state: DatabaseState;

  constructor(filePath?: string) {
    this.filePath = filePath || path.join(process.cwd(), 'data', 'flashbook_db.json');
    this.state = this.loadState();
  }

  private loadState(): DatabaseState {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        return JSON.parse(raw);
      }
    } catch (e) {
      console.warn('Could not read existing state file, initializing clean state', e);
    }

    return {
      markets: {
        'FWETH-FUSDT': {
          pair: 'FWETH-FUSDT',
          baseSymbol: 'FWETH',
          quoteSymbol: 'FUSDT',
          baseAddress: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
          quoteAddress: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
          baseDecimals: 18,
          quoteDecimals: 6,
          lastPrice: 3000.0,
          change24h: 2.45,
          high24h: 3080.0,
          low24h: 2920.0,
          volume24h: 142.5,
        }
      },
      orders: {},
      trades: [],
      mmDecisions: [],
      lastIndexedBlock: 0,
      indexedEvents: {}
    };
  }

  public saveState(): void {
    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.filePath, JSON.stringify(this.state, null, 2), 'utf-8');
    } catch (e) {
      console.error('Failed to save state to disk:', e);
    }
  }

  // Markets
  public getMarket(pair: string): Market | undefined {
    return this.state.markets[pair];
  }

  public getAllMarkets(): Market[] {
    return Object.values(this.state.markets);
  }

  public updateMarketPrice(pair: string, price: number, amount: number): void {
    const market = this.state.markets[pair];
    if (!market) return;
    market.lastPrice = price;
    market.volume24h += amount;
    if (price > market.high24h) market.high24h = price;
    if (price < market.low24h) market.low24h = price;
    this.saveState();
  }

  // Orders
  public upsertOrder(order: OrderRecord): void {
    this.state.orders[order.id] = order;
    this.saveState();
  }

  public getOrder(orderId: number): OrderRecord | undefined {
    return this.state.orders[orderId];
  }

  public getOrdersByMaker(maker: string): OrderRecord[] {
    const target = maker.toLowerCase();
    return Object.values(this.state.orders).filter(o => o.maker.toLowerCase() === target);
  }

  public getActiveOrders(side?: 'BUY' | 'SELL'): OrderRecord[] {
    const list = Object.values(this.state.orders).filter(
      o => o.status === 'ACTIVE' || o.status === 'PARTIALLY_FILLED'
    );
    if (!side) return list;
    return list.filter(o => o.side === side);
  }

  // Trades
  public addTrade(trade: TradeRecord): void {
    this.state.trades.unshift(trade); // Prepend so most recent is first
    if (this.state.trades.length > 500) {
      this.state.trades.pop();
    }
    this.updateMarketPrice('FWETH-FUSDT', trade.price, trade.amount);
    this.saveState();
  }

  public getRecentTrades(limit = 50): TradeRecord[] {
    return this.state.trades.slice(0, limit);
  }

  // Market Maker Decisions
  public addMMDecision(decision: MarketMakerDecision): void {
    this.state.mmDecisions.unshift(decision);
    if (this.state.mmDecisions.length > 200) {
      this.state.mmDecisions.pop();
    }
    this.saveState();
  }

  public getLatestMMDecision(): MarketMakerDecision | undefined {
    return this.state.mmDecisions[0];
  }

  public getRecentMMDecisions(limit = 20): MarketMakerDecision[] {
    return this.state.mmDecisions.slice(0, limit);
  }

  // Event Deduplication
  public isEventIndexed(eventKey: string): boolean {
    return !!this.state.indexedEvents[eventKey];
  }

  public markEventIndexed(eventKey: string): void {
    this.state.indexedEvents[eventKey] = true;
  }

  public getLastIndexedBlock(): number {
    return this.state.lastIndexedBlock;
  }

  public setLastIndexedBlock(block: number): void {
    this.state.lastIndexedBlock = block;
    this.saveState();
  }
}

export const db = new DataStore();
