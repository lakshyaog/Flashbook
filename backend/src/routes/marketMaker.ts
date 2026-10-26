import { Router } from 'express';
import { marketMakerService } from '../market-maker/service.js';
import { db } from '../db/store.js';

export const marketMakerRouter = Router();

marketMakerRouter.get('/status', (req, res) => {
  const status = marketMakerService.getStatus();
  const recentDecisions = db.getRecentMMDecisions(15);
  res.json({
    success: true,
    data: {
      ...status,
      recentDecisions
    }
  });
});

marketMakerRouter.post('/config', (req, res) => {
  const { dryRun, enabled, baseSpreadBps, targetInventoryWeth, maxOrderSizeWeth } = req.body;
  const updatedStatus = marketMakerService.updateConfig({
    dryRun,
    enabled,
    baseSpreadBps,
    targetInventoryWeth,
    maxOrderSizeWeth
  });
  res.json({
    success: true,
    message: 'Market maker configuration updated',
    data: updatedStatus
  });
});

marketMakerRouter.post('/step', async (req, res) => {
  try {
    const recommendation = await marketMakerService.step();
    res.json({
      success: true,
      data: recommendation
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});
