import React from 'react';
import { useAccount, useConnect, useDisconnect, useChainId, useSwitchChain } from 'wagmi';
import { Activity, Droplet, Wallet, ChevronDown, CheckCircle2, AlertTriangle, ExternalLink } from 'lucide-react';

interface HeaderProps {
  marketStats: {
    lastPrice: number;
    change24h: number;
    high24h: number;
    low24h: number;
    volume24h: number;
  };
  onOpenFaucet: () => void;
}

export const Header: React.FC<HeaderProps> = ({ marketStats, onOpenFaucet }) => {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();

  const isSepolia = chainId === 11155111;
  const isAnvil = chainId === 31337;
  const isSupportedChain = isSepolia || isAnvil;

  const formatAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  return (
    <header className="border-b border-border bg-surface/90 backdrop-blur-md sticky top-0 z-40 px-4 py-2.5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Brand & Market Selector */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-brand to-buy flex items-center justify-center shadow-lg shadow-brand/20">
              <Activity className="w-5 h-5 text-black stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold tracking-tight text-white text-base">FlashBook</span>
                <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-brand/10 text-brand border border-brand/20">AI</span>
              </div>
              <span className="text-[10px] text-textMuted tracking-wider font-mono uppercase block -mt-0.5">On-Chain DEX</span>
            </div>
          </div>

          {/* Pair selector */}
          <div className="flex items-center gap-3 pl-4 border-l border-border/80">
            <div className="flex items-center gap-2 cursor-pointer hover:bg-surfaceHover px-2.5 py-1.5 rounded-lg border border-border/60 transition-all">
              <div className="flex -space-x-1.5">
                <div className="w-5 h-5 rounded-full bg-blue-500/80 flex items-center justify-center text-[10px] font-bold text-white ring-2 ring-surface">W</div>
                <div className="w-5 h-5 rounded-full bg-emerald-500/80 flex items-center justify-center text-[10px] font-bold text-white ring-2 ring-surface">U</div>
              </div>
              <span className="font-semibold text-sm text-white">FWETH / FUSDT</span>
              <ChevronDown className="w-3.5 h-3.5 text-textSecondary" />
            </div>
          </div>

          {/* 24h Ticker Stats */}
          <div className="hidden lg:flex items-center gap-6 text-xs pl-2">
            <div>
              <span className="text-textMuted block text-[10px] uppercase font-mono">Last Price</span>
              <span className={`font-mono-numbers font-semibold text-sm ${marketStats.change24h >= 0 ? 'text-buy' : 'text-sell'}`}>
                ${marketStats.lastPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div>
              <span className="text-textMuted block text-[10px] uppercase font-mono">24h Change</span>
              <span className={`font-mono-numbers font-medium ${marketStats.change24h >= 0 ? 'text-buy' : 'text-sell'}`}>
                {marketStats.change24h >= 0 ? '+' : ''}{marketStats.change24h.toFixed(2)}%
              </span>
            </div>
            <div>
              <span className="text-textMuted block text-[10px] uppercase font-mono">24h High</span>
              <span className="font-mono-numbers font-medium text-textPrimary">${marketStats.high24h.toFixed(2)}</span>
            </div>
            <div>
              <span className="text-textMuted block text-[10px] uppercase font-mono">24h Low</span>
              <span className="font-mono-numbers font-medium text-textPrimary">${marketStats.low24h.toFixed(2)}</span>
            </div>
            <div>
              <span className="text-textMuted block text-[10px] uppercase font-mono">24h Volume</span>
              <span className="font-mono-numbers font-medium text-textPrimary">{marketStats.volume24h.toFixed(2)} FWETH</span>
            </div>
          </div>
        </div>

        {/* Right Action Bar */}
        <div className="flex items-center gap-3">
          {/* Faucet Button */}
          <button
            onClick={onOpenFaucet}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-card hover:bg-surfaceHover border border-brand/30 hover:border-brand/60 text-brand text-xs font-medium transition-all shadow-sm group"
          >
            <Droplet className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
            <span>Testnet Faucet</span>
          </button>

          {/* Network Badge */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-card border border-border text-xs">
            <span className={`w-2 h-2 rounded-full ${isSupportedChain ? 'bg-buy animate-pulse' : 'bg-amber-400'}`}></span>
            <span className="text-textSecondary font-mono text-[11px]">
              {isSepolia ? 'Sepolia' : isAnvil ? 'Local Anvil' : 'Wrong Network'}
            </span>
            {!isSupportedChain && isConnected && (
              <button
                onClick={() => switchChain?.({ chainId: 11155111 })}
                className="text-[10px] text-amber-400 underline ml-1"
              >
                Switch
              </button>
            )}
          </div>

          {/* Connect / Wallet Button */}
          {isConnected && address ? (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surfaceHover border border-border text-xs font-mono">
                <CheckCircle2 className="w-3.5 h-3.5 text-buy" />
                <span className="text-textPrimary">{formatAddress(address)}</span>
              </div>
              <button
                onClick={() => disconnect()}
                className="px-2.5 py-1.5 rounded-lg bg-card hover:bg-surfaceHover border border-border text-textMuted hover:text-sell text-xs transition-colors"
                title="Disconnect"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                const injectedConnector = connectors.find(c => c.type === 'injected') || connectors[0];
                if (injectedConnector) connect({ connector: injectedConnector });
              }}
              className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-gradient-to-r from-brand to-buy hover:opacity-90 text-black font-semibold text-xs transition-all shadow-md shadow-brand/10"
            >
              <Wallet className="w-3.5 h-3.5" />
              <span>Connect Wallet</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
