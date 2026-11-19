import { Router } from 'express';
import { db } from '../db/store.js';

export const analyticsRouter = Router();

analyticsRouter.get('/candles', (req, res) => {
  const timeframe = (req.query.timeframe as string) || '1h';
  const intervalMs =
    timeframe === '1m' ? 60_000 : timeframe === '5m' ? 300_000 : timeframe === '1D' ? 86_400_000 : 3_600_000;
  const count = 30;

  // Build OHLCV buckets from indexed trades (oldest first)
  const trades = [...db.getRecentTrades(500)].reverse();
  const candles: Array<{ time: string; open: number; high: number; low: number; close: number; volume: number }> = [];

  if (trades.length > 0) {
    const lastBucket = Math.floor(Date.now() / intervalMs) * intervalMs;
    const firstBucket = lastBucket - (count - 1) * intervalMs;

    // Seed with the last trade before the window so empty buckets carry a real price
    const prior = trades.filter(t => t.timestamp < firstBucket).pop();
    let prevClose: number | null = prior ? prior.price : null;
    let i = 0;
    while (i < trades.length && trades[i].timestamp < firstBucket) i++;

    for (let bucket = firstBucket; bucket <= lastBucket; bucket += intervalMs) {
      const inBucket = [];
      while (i < trades.length && trades[i].timestamp < bucket + intervalMs) inBucket.push(trades[i++]);

      if (inBucket.length > 0) {
        const prices = inBucket.map(t => t.price);
        candles.push({
          time: new Date(bucket).toISOString(),
          open: prices[0],
          high: Math.max(...prices),
          low: Math.min(...prices),
          close: prices[prices.length - 1],
          volume: parseFloat(inBucket.reduce((s, t) => s + t.amount, 0).toFixed(4)),
        });
        prevClose = prices[prices.length - 1];
      } else if (prevClose !== null) {
        candles.push({ time: new Date(bucket).toISOString(), open: prevClose, high: prevClose, low: prevClose, close: prevClose, volume: 0 });
      }
    }
  }

  res.json({
    success: true,
    data: candles
  });
});

analyticsRouter.get('/depth', (req, res) => {
  const activeBids = db.getActiveOrders('BUY');
  const activeAsks = db.getActiveOrders('SELL');

  // Return cumulative liquidity curve
  const midPrice = db.getReferenceMid();

  res.json({
    success: true,
    data: {
      midPrice,
      totalBidDepth: activeBids.reduce((sum, o) => sum + (o.amount - o.filledAmount), 0),
      totalAskDepth: activeAsks.reduce((sum, o) => sum + (o.amount - o.filledAmount), 0)
    }
  });
});
