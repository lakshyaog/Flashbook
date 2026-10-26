import { Router } from 'express';
import { db } from '../db/store.js';

export const analyticsRouter = Router();

analyticsRouter.get('/candles', (req, res) => {
  const timeframe = (req.query.timeframe as string) || '1h';
  const market = db.getMarket('FWETH-FUSDT');
  const basePrice = market?.lastPrice || 3000.0;

  // Generate realistic candles based on recent trades and base price
  const now = Date.now();
  const intervalMs = timeframe === '1m' ? 60000 : timeframe === '5m' ? 300000 : 3600000;
  const count = 30;

  const candles = [];
  let currentOpen = basePrice * 0.98;

  for (let i = count; i >= 0; i--) {
    const time = new Date(now - i * intervalMs).toISOString();
    const volatility = 0.008;
    const delta = (Math.random() - 0.48) * currentOpen * volatility;
    const close = parseFloat((currentOpen + delta).toFixed(2));
    const high = parseFloat((Math.max(currentOpen, close) + Math.random() * currentOpen * 0.004).toFixed(2));
    const low = parseFloat((Math.min(currentOpen, close) - Math.random() * currentOpen * 0.004).toFixed(2));
    const volume = parseFloat((5 + Math.random() * 25).toFixed(2));

    candles.push({
      time,
      open: currentOpen,
      high,
      low,
      close,
      volume
    });

    currentOpen = close;
  }

  // Ensure last candle matches current market lastPrice
  if (candles.length > 0 && market) {
    candles[candles.length - 1].close = market.lastPrice;
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
  const market = db.getMarket('FWETH-FUSDT');
  const midPrice = market?.lastPrice || 3000;

  res.json({
    success: true,
    data: {
      midPrice,
      totalBidDepth: activeBids.reduce((sum, o) => sum + (o.amount - o.filledAmount), 0),
      totalAskDepth: activeAsks.reduce((sum, o) => sum + (o.amount - o.filledAmount), 0)
    }
  });
});
