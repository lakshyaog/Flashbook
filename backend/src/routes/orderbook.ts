import { Router } from 'express';
import { db } from '../db/store.js';

export const orderbookRouter = Router();

interface OrderBookLevel {
  price: number;
  amount: number;
  total: number;
  orderCount: number;
}

orderbookRouter.get('/', (req, res) => {
  const activeBids = db.getActiveOrders('BUY');
  const activeAsks = db.getActiveOrders('SELL');

  // Aggregate by price level
  const bidMap = new Map<number, { amount: number; count: number }>();
  for (const b of activeBids) {
    const remaining = b.amount - b.filledAmount;
    if (remaining <= 0) continue;
    const current = bidMap.get(b.price) || { amount: 0, count: 0 };
    current.amount += remaining;
    current.count += 1;
    bidMap.set(b.price, current);
  }

  const askMap = new Map<number, { amount: number; count: number }>();
  for (const a of activeAsks) {
    const remaining = a.amount - a.filledAmount;
    if (remaining <= 0) continue;
    const current = askMap.get(a.price) || { amount: 0, count: 0 };
    current.amount += remaining;
    current.count += 1;
    askMap.set(a.price, current);
  }

  // Sort bids descending
  const sortedBidPrices = Array.from(bidMap.keys()).sort((a, b) => b - a);
  let cumulativeBidTotal = 0;
  const bids: OrderBookLevel[] = sortedBidPrices.map(price => {
    const data = bidMap.get(price)!;
    cumulativeBidTotal += data.amount;
    return {
      price,
      amount: parseFloat(data.amount.toFixed(4)),
      total: parseFloat(cumulativeBidTotal.toFixed(4)),
      orderCount: data.count
    };
  });

  // Sort asks ascending
  const sortedAskPrices = Array.from(askMap.keys()).sort((a, b) => a - b);
  let cumulativeAskTotal = 0;
  const asks: OrderBookLevel[] = sortedAskPrices.map(price => {
    const data = askMap.get(price)!;
    cumulativeAskTotal += data.amount;
    return {
      price,
      amount: parseFloat(data.amount.toFixed(4)),
      total: parseFloat(cumulativeAskTotal.toFixed(4)),
      orderCount: data.count
    };
  });

  const bestBid = bids.length > 0 ? bids[0].price : 0;
  const bestAsk = asks.length > 0 ? asks[0].price : 0;
  const spread = bestAsk > 0 && bestBid > 0 ? parseFloat((bestAsk - bestBid).toFixed(2)) : 0;
  const spreadBps = bestAsk > 0 && bestBid > 0 ? parseFloat(((spread / bestAsk) * 10000).toFixed(1)) : 0;

  res.json({
    success: true,
    data: {
      bids,
      asks,
      bestBid,
      bestAsk,
      spread,
      spreadBps,
      timestamp: Date.now()
    }
  });
});
