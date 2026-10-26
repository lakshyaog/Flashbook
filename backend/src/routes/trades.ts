import { Router } from 'express';
import { db } from '../db/store.js';

export const tradesRouter = Router();

tradesRouter.get('/', (req, res) => {
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
  const trades = db.getRecentTrades(limit);
  res.json({
    success: true,
    data: trades
  });
});
