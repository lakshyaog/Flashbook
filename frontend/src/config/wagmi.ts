import { http, createConfig } from 'wagmi';
import { sepolia, foundry } from 'wagmi/chains';
import { injected } from 'wagmi/connectors';

export const config = createConfig({
  chains: [foundry, sepolia],
  connectors: [
    injected(),
  ],
  transports: {
    [foundry.id]: http('http://127.0.0.1:8545'),
    [sepolia.id]: http(import.meta.env.VITE_SEPOLIA_RPC_URL || 'https://rpc.sepolia.org'),
  },
});

declare module 'wagmi' {
  interface Register {
    config: typeof config;
  }
}
