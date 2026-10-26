import { Router } from 'express';
import { db } from '../db/store.js';

export const marketsRouter = Router();

marketsRouter.get('/', (req, res) => {
  const markets = db.getAllMarkets();
  res.json({
    success: true,
    data: markets
  });
});

marketsRouter.get('/:pair', (req, res) => {
  const market = db.getMarket(req.params.pair);
  if (!market) {
    return res.status(404).json({ success: false, error: 'Market not found' });
  }
  res.json({
    success: true,
    data: market
  });
});
