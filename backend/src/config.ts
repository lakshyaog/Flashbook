import dotenv from 'dotenv';
dotenv.config();

export const CONFIG = {
  port: parseInt(process.env.PORT || '3001', 10),
  rpcUrl: process.env.RPC_URL || 'http://127.0.0.1:8545',
  chainId: parseInt(process.env.CHAIN_ID || '31337', 10),
  
  // Contract addresses (defaulting to deterministic local Anvil addresses from Deploy.s.sol)
  contracts: {
    weth: (process.env.WETH_ADDRESS || '0x5FbDB2315678afecb367f032d93F642f64180aa3') as `0x${string}`,
    usdt: (process.env.USDT_ADDRESS || '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512') as `0x${string}`,
    exchange: (process.env.EXCHANGE_ADDRESS || '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0') as `0x${string}`,
  },

  // AI Market Maker defaults
  marketMaker: {
    dryRun: process.env.MM_DRY_RUN !== 'false', // Default true for safety
    enabled: process.env.MM_ENABLED !== 'false',
    pollIntervalMs: parseInt(process.env.MM_POLL_INTERVAL_MS || '4000', 10),
    targetInventoryWeth: parseFloat(process.env.MM_TARGET_INVENTORY_WETH || '10.0'),
    maxOrderSizeWeth: parseFloat(process.env.MM_MAX_ORDER_SIZE_WETH || '0.5'),
    minOrderSizeWeth: parseFloat(process.env.MM_MIN_ORDER_SIZE_WETH || '0.01'),
    baseSpreadBps: parseInt(process.env.MM_BASE_SPREAD_BPS || '30', 10), // 30 bps = 0.30%
    riskAversionGamma: parseFloat(process.env.MM_GAMMA || '0.1'),
    maxPriceDeviationBps: parseInt(process.env.MM_MAX_PRICE_DEV_BPS || '500', 10), // 5% circuit breaker
    referencePrice: parseFloat(process.env.MM_REFERENCE_PRICE || '3000'), // Bootstrap mid before any book/trades exist
    privateKey: (process.env.MM_PRIVATE_KEY || '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d') as `0x${string}`, // Anvil Account #1
  }
};
