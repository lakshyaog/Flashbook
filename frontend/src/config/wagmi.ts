import { http, createConfig } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import { injected } from 'wagmi/connectors';
import { defineChain } from 'viem';

// Define custom Anvil chain with correct native token
const anvil = defineChain({
  id: 31337,
  name: 'Anvil',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: { http: ['http://127.0.0.1:8545'] },
  },
  testnet: true,
});

export const config = createConfig({
  chains: [anvil, sepolia],
  connectors: [
    injected(),
  ],
  transports: {
    [anvil.id]: http('http://127.0.0.1:8545', {
      // Reduce polling frequency to avoid overwhelming local Anvil node
      batch: {
        wait: 100, // Batch requests within 100ms window
      },
      retryCount: 3,
      retryDelay: 1000,
      timeout: 10_000,
    }),
    [sepolia.id]: http(import.meta.env.VITE_SEPOLIA_RPC_URL || 'https://rpc.sepolia.org', {
      batch: {
        wait: 50,
      },
      retryCount: 5,
      retryDelay: 500,
    }),
  },
  // Reduce polling intervals to avoid RPC rate limiting
  pollingInterval: 4_000, // Poll every 4 seconds instead of default
});

declare module 'wagmi' {
  interface Register {
    config: typeof config;
  }
}
