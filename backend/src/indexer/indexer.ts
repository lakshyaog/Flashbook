import { createPublicClient, http, parseAbiItem, formatUnits } from 'viem';
import { foundry, sepolia } from 'viem/chains';
import { CONFIG } from '../config.js';
import { db, OrderRecord, TradeRecord } from '../db/store.js';

const orderPlacedEvent = parseAbiItem(
  'event OrderPlaced(uint256 indexed orderId, address indexed maker, uint8 side, uint256 price, uint256 amount, uint256 timestamp)'
);

const orderMatchedEvent = parseAbiItem(
  'event OrderMatched(uint256 indexed buyOrderId, uint256 indexed sellOrderId, address indexed buyer, address seller, uint256 matchPrice, uint256 matchedBaseAmount, uint256 matchedQuoteAmount, uint256 feeQuote, uint256 timestamp)'
);

const orderCancelledEvent = parseAbiItem(
  'event OrderCancelled(uint256 indexed orderId, address indexed maker, uint256 refundedAmount, uint256 timestamp)'
);

export class BlockchainIndexer {
  private client: ReturnType<typeof createPublicClient>;
  private isIndexing = false;
  private pollInterval: NodeJS.Timeout | null = null;

  constructor() {
    const chain = CONFIG.chainId === 11155111 ? sepolia : foundry;
    this.client = createPublicClient({
      chain,
      transport: http(CONFIG.rpcUrl)
    });
  }

  public async start(): Promise<void> {
    if (this.isIndexing) return;
    this.isIndexing = true;
    console.log(`[Indexer] Starting blockchain event indexer on ${CONFIG.rpcUrl} for Exchange: ${CONFIG.contracts.exchange}`);

    // Poll every 2 seconds for new blocks
    this.pollInterval = setInterval(() => {
      this.pollEvents().catch((err) => {
        // Silently handle RPC connectivity delays during startup
      });
    }, 2000);

    // Initial poll
    await this.pollEvents().catch(() => {});
  }

  public stop(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    this.isIndexing = false;
    console.log('[Indexer] Stopped.');
  }

  private async pollEvents(): Promise<void> {
    try {
      const currentBlock = await this.client.getBlockNumber();
      const lastBlock = BigInt(db.getLastIndexedBlock() || 0);

      // Start from last indexed block or recent 100 blocks
      const fromBlock = lastBlock > 0n ? lastBlock + 1n : (currentBlock > 100n ? currentBlock - 100n : 0n);

      if (fromBlock > currentBlock) {
        return;
      }

      // Fetch logs
      const [placedLogs, matchedLogs, cancelledLogs] = await Promise.all([
        this.client.getLogs({
          address: CONFIG.contracts.exchange,
          event: orderPlacedEvent,
          fromBlock,
          toBlock: currentBlock
        }),
        this.client.getLogs({
          address: CONFIG.contracts.exchange,
          event: orderMatchedEvent,
          fromBlock,
          toBlock: currentBlock
        }),
        this.client.getLogs({
          address: CONFIG.contracts.exchange,
          event: orderCancelledEvent,
          fromBlock,
          toBlock: currentBlock
        })
      ]);

      // Process OrderPlaced
      for (const log of placedLogs) {
        const key = `${log.transactionHash}-${log.logIndex}`;
        if (db.isEventIndexed(key)) continue;

        const { orderId, maker, side, price, amount, timestamp } = log.args;
        if (!orderId || !maker || price === undefined || amount === undefined) continue;

        const formattedPrice = parseFloat(formatUnits(price, 6)); // Quote is 6 decimals
        const formattedAmount = parseFloat(formatUnits(amount, 18)); // Base is 18 decimals

        const orderRecord: OrderRecord = {
          id: Number(orderId),
          maker,
          side: side === 0 ? 'BUY' : 'SELL',
          price: formattedPrice,
          priceRaw: price.toString(),
          amount: formattedAmount,
          amountRaw: amount.toString(),
          filledAmount: 0,
          filledAmountRaw: '0',
          status: 'ACTIVE',
          timestamp: Number(timestamp) * 1000,
          txHash: log.transactionHash
        };

        db.upsertOrder(orderRecord);
        db.markEventIndexed(key);
        console.log(`[Indexer] Indexed OrderPlaced #${orderId} (${orderRecord.side} ${formattedAmount} @ $${formattedPrice})`);
      }

      // Process OrderMatched
      for (const log of matchedLogs) {
        const key = `${log.transactionHash}-${log.logIndex}`;
        if (db.isEventIndexed(key)) continue;

        const { buyOrderId, sellOrderId, buyer, seller, matchPrice, matchedBaseAmount, matchedQuoteAmount, feeQuote, timestamp } = log.args;
        if (!buyOrderId || !sellOrderId || !matchPrice || !matchedBaseAmount) continue;

        const formattedPrice = parseFloat(formatUnits(matchPrice, 6));
        const formattedBase = parseFloat(formatUnits(matchedBaseAmount, 18));
        const formattedQuote = matchedQuoteAmount ? parseFloat(formatUnits(matchedQuoteAmount, 6)) : (formattedPrice * formattedBase);
        const formattedFee = feeQuote ? parseFloat(formatUnits(feeQuote, 6)) : 0;

        const tradeRecord: TradeRecord = {
          id: `trade-${log.transactionHash}-${log.logIndex}`,
          buyOrderId: Number(buyOrderId),
          sellOrderId: Number(sellOrderId),
          buyer: buyer || '',
          seller: seller || '',
          price: formattedPrice,
          amount: formattedBase,
          quoteAmount: formattedQuote,
          feeQuote: formattedFee,
          timestamp: Number(timestamp) * 1000,
          txHash: log.transactionHash
        };

        // Update orders
        const buyOrder = db.getOrder(Number(buyOrderId));
        if (buyOrder) {
          buyOrder.filledAmount += formattedBase;
          if (buyOrder.filledAmount >= buyOrder.amount) {
            buyOrder.status = 'FILLED';
          } else {
            buyOrder.status = 'PARTIALLY_FILLED';
          }
          db.upsertOrder(buyOrder);
        }

        const sellOrder = db.getOrder(Number(sellOrderId));
        if (sellOrder) {
          sellOrder.filledAmount += formattedBase;
          if (sellOrder.filledAmount >= sellOrder.amount) {
            sellOrder.status = 'FILLED';
          } else {
            sellOrder.status = 'PARTIALLY_FILLED';
          }
          db.upsertOrder(sellOrder);
        }

        db.addTrade(tradeRecord);
        db.markEventIndexed(key);
        console.log(`[Indexer] Indexed Trade: ${formattedBase} WETH @ $${formattedPrice} (Tx: ${log.transactionHash.slice(0, 10)}...)`);
      }

      // Process OrderCancelled
      for (const log of cancelledLogs) {
        const key = `${log.transactionHash}-${log.logIndex}`;
        if (db.isEventIndexed(key)) continue;

        const { orderId } = log.args;
        if (!orderId) continue;

        const order = db.getOrder(Number(orderId));
        if (order) {
          order.status = 'CANCELLED';
          db.upsertOrder(order);
          console.log(`[Indexer] Indexed OrderCancelled #${orderId}`);
        }
        db.markEventIndexed(key);
      }

      db.setLastIndexedBlock(Number(currentBlock));
    } catch (err: any) {
      // RPC transient network errors
    }
  }
}

export const indexer = new BlockchainIndexer();
