import React from 'react';
import { useAccount, useConnect, useDisconnect, useChainId, useSwitchChain } from 'wagmi';
import { Droplet, Wallet, ChevronDown, LogOut, Zap } from 'lucide-react';

interface HeaderProps {
  title: string;
  onOpenFaucet: () => void;
}

export const Header: React.FC<HeaderProps> = ({ title, onOpenFaucet }) => {
  const { address, isConnected, chainId: walletChainId } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const appChainId = useChainId();
  const { switchChain, isPending: isSwitching } = useSwitchChain();

  // Prefer the wallet's actual network; useChainId() silently falls back to the app default
  const chainId = isConnected ? walletChainId : appChainId;
  const isSepolia = chainId === 11155111;
  const isAnvil = chainId === 31337;
  const isSupportedChain = isSepolia || isAnvil;

  const formatAddress = (addr: string) => `${addr.slice(0, 6)}…${addr.slice(-4)}`;

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-white">
      <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-3.5">
        {/* Page title & pair */}
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-2 md:hidden">
            <div className="w-8 h-8 rounded-lg bg-brand flex items-center justify-center">
              <Zap className="w-4 h-4 text-white fill-white" />
            </div>
          </div>
          <div>
            <div className="text-[11px] text-textMuted">
              FlashBook AI <span className="mx-1 text-borderMuted">/</span> {title}
            </div>
            <h1 className="text-xl font-semibold tracking-tight text-textPrimary leading-tight">{title}</h1>
          </div>

          <button className="btn-secondary !gap-2.5 pl-2 pr-3 py-1.5">
            <div className="flex -space-x-1.5">
              <div className="w-6 h-6 rounded-full bg-[#627EEA] flex items-center justify-center text-[10px] font-bold text-white ring-2 ring-surface">Ξ</div>
              <div className="w-6 h-6 rounded-full bg-[#26A17B] flex items-center justify-center text-[10px] font-bold text-white ring-2 ring-surface">₮</div>
            </div>
            <span className="font-semibold text-sm text-textPrimary">FWETH<span className="text-textMuted"> / FUSDT</span></span>
            <ChevronDown className="w-3.5 h-3.5 text-textMuted" />
          </button>
        </div>

        {/* Right Action Bar */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={onOpenFaucet}
            className="btn-secondary px-3 py-2 text-xs"
          >
            <Droplet className="w-3.5 h-3.5 text-brand" />
            <span>Faucet</span>
          </button>

          {/* Network Badge */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-surface border border-border text-xs">
            <span className={`w-2 h-2 rounded-full ${isSupportedChain ? 'bg-buy shadow-[0_0_8px_rgba(14,159,110,0.5)]' : 'bg-amber-600'}`}></span>
            <span className="text-textSecondary font-medium">
              {isSepolia ? 'Sepolia' : isAnvil ? 'Local Anvil' : 'Wrong Network'}
            </span>
            {!isSupportedChain && isConnected && (
              // wagmi asks the wallet to add Local Anvil first if it doesn't know the network yet
              <button
                onClick={() => switchChain({ chainId: 31337 })}
                disabled={isSwitching}
                className="px-2 py-0.5 rounded-md bg-amber-500 text-white text-[11px] font-semibold hover:bg-amber-600 transition-colors disabled:opacity-60"
              >
                {isSwitching ? 'Check MetaMask…' : 'Switch to Local Anvil'}
              </button>
            )}
          </div>

          {isConnected && address ? (
            <div className="flex items-center gap-1 pl-1 pr-1 py-1 rounded-xl bg-surface border border-border">
              <div className="flex items-center gap-2 px-2 py-1">
                <span className="w-6 h-6 rounded-full bg-gradient-to-br from-brand to-sky-400" />
                <span className="text-xs font-mono text-textPrimary">{formatAddress(address)}</span>
              </div>
              <button
                onClick={() => disconnect()}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-textMuted hover:text-sell hover:bg-sellSubtle transition-colors"
                title="Disconnect"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                const injectedConnector = connectors.find(c => c.type === 'injected') || connectors[0];
                if (injectedConnector) connect({ connector: injectedConnector });
              }}
              className="btn-primary px-4 py-2 text-xs"
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
