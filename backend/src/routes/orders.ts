import { Router } from 'express';
import { db } from '../db/store.js';

export const ordersRouter = Router();

ordersRouter.get('/', (req, res) => {
  const maker = req.query.maker as string;
  if (!maker) {
    return res.status(400).json({ success: false, error: 'maker query parameter required' });
  }

  const userOrders = db.getOrdersByMaker(maker);
  // Sort with newest orders first
  userOrders.sort((a, b) => b.timestamp - a.timestamp);

  res.json({
    success: true,
    data: userOrders
  });
});
