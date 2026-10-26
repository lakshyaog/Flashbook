import express from 'express';
import cors from 'cors';
import { CONFIG } from './config.js';
import { marketsRouter } from './routes/markets.js';
import { orderbookRouter } from './routes/orderbook.js';
import { tradesRouter } from './routes/trades.js';
import { ordersRouter } from './routes/orders.js';
import { marketMakerRouter } from './routes/marketMaker.js';
import { analyticsRouter } from './routes/analytics.js';
import { indexer } from './indexer/indexer.js';
import { marketMakerService } from './market-maker/service.js';

const app = express();

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'FlashBook AI Core Engine',
    network: CONFIG.chainId === 11155111 ? 'Sepolia' : 'Local Anvil',
    contracts: CONFIG.contracts
  });
});

// Mount Routes
app.use('/api/markets', marketsRouter);
app.use('/api/orderbook', orderbookRouter);
app.use('/api/trades', tradesRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/market-maker', marketMakerRouter);
app.use('/api/analytics', analyticsRouter);

// Start Server
const server = app.listen(CONFIG.port, () => {
  console.log(`===============================================`);
  console.log(` FlashBook AI Backend API running on port ${CONFIG.port}`);
  console.log(` Network: ${CONFIG.chainId === 11155111 ? 'Ethereum Sepolia' : 'Local Anvil (31337)'}`);
  console.log(` Exchange: ${CONFIG.contracts.exchange}`);
  console.log(`===============================================`);

  // Start background indexer and market maker
  indexer.start().catch((err) => {
    console.warn('[Indexer] Initial start error (will retry):', err.message);
  });

  marketMakerService.start();
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  indexer.stop();
  marketMakerService.stop();
  server.close(() => {
    process.exit(0);
  });
});
