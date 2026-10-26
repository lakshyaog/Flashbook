import React, { useState } from 'react';
import { useAccount, useWriteContract, useChainId } from 'wagmi';
import { CONTRACTS, ERC20_ABI } from '../config/contracts';
import { X, Droplets, Check, Loader2, AlertCircle, Sparkles } from 'lucide-react';

interface FaucetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onClaimSuccess: () => void;
  onNotify: (type: 'success' | 'error' | 'info', title: string, message: string) => void;
}

export const FaucetModal: React.FC<FaucetModalProps> = ({
  isOpen,
  onClose,
  onClaimSuccess,
  onNotify
}) => {
  const { isConnected, address } = useAccount();
  const chainId = useChainId();
  const [isClaimingWeth, setIsClaimingWeth] = useState(false);
  const [isClaimingUsdt, setIsClaimingUsdt] = useState(false);

  const activeContractConfig = chainId === 11155111 ? CONTRACTS.sepolia : CONTRACTS.anvil;
  const { writeContractAsync } = useWriteContract();

  if (!isOpen) return null;

  const handleClaimWeth = async () => {
    if (!isConnected) {
      onNotify('error', 'Wallet Not Connected', 'Please connect your wallet first.');
      return;
    }
    setIsClaimingWeth(true);
    try {
      const hash = await writeContractAsync({
        address: activeContractConfig.weth,
        abi: ERC20_ABI,
        functionName: 'faucet',
        args: []
      });
      onNotify('info', 'Claim Submitted', `Tx: ${hash.slice(0, 10)}...`);
      setTimeout(() => {
        setIsClaimingWeth(false);
        onClaimSuccess();
        onNotify('success', '1 FWETH Claimed', '1 FakeWETH has been minted to your wallet.');
      }, 2500);
    } catch (err: any) {
      setIsClaimingWeth(false);
      onNotify('error', 'Faucet Error', err.shortMessage || err.message);
    }
  };

  const handleClaimUsdt = async () => {
    if (!isConnected) {
      onNotify('error', 'Wallet Not Connected', 'Please connect your wallet first.');
      return;
    }
    setIsClaimingUsdt(true);
    try {
      const hash = await writeContractAsync({
        address: activeContractConfig.usdt,
        abi: ERC20_ABI,
        functionName: 'faucet',
        args: []
      });
      onNotify('info', 'Claim Submitted', `Tx: ${hash.slice(0, 10)}...`);
      setTimeout(() => {
        setIsClaimingUsdt(false);
        onClaimSuccess();
        onNotify('success', '1,000 FUSDT Claimed', '1,000 FakeUSDT has been minted to your wallet.');
      }, 2500);
    } catch (err: any) {
      setIsClaimingUsdt(false);
      onNotify('error', 'Faucet Error', err.shortMessage || err.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="terminal-card-glow rounded-2xl w-full max-w-md p-6 relative border border-brand/30">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg bg-surface hover:bg-surfaceHover text-textMuted hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-xl bg-brand/10 text-brand border border-brand/20">
            <Droplets className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-white text-base">Testnet Demonstration Faucet</h3>
            <p className="text-xs text-textMuted font-mono">Sepolia & Local Testnet Demo Assets</p>
          </div>
        </div>

        <div className="p-3 rounded-lg bg-surface/80 border border-border/80 text-xs text-textSecondary mb-5 font-mono">
          <div className="flex items-center gap-2 text-brand font-semibold mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Controlled Test Rules</span>
          </div>
          Claim free test tokens to test non-custodial trading, limit orders, and on-chain atomic settlement. Faucet cooldown is 1 minute per token.
        </div>

        <div className="space-y-3">
          {/* Claim FWETH */}
          <div className="p-3.5 rounded-xl bg-surface border border-border flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 font-bold flex items-center justify-center text-xs ring-1 ring-blue-500/30">
                W
              </div>
              <div>
                <span className="font-semibold text-white text-sm block">1.0 FakeWETH</span>
                <span className="text-[11px] text-textMuted font-mono block">Base Asset (18 decimals)</span>
              </div>
            </div>

            <button
              onClick={handleClaimWeth}
              disabled={isClaimingWeth || !isConnected}
              className="px-3.5 py-1.5 rounded-lg bg-brand hover:bg-brandHover text-black font-semibold text-xs transition-all flex items-center gap-1.5 shadow-md shadow-brand/10 disabled:opacity-50"
            >
              {isClaimingWeth ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              <span>Claim WETH</span>
            </button>
          </div>

          {/* Claim FUSDT */}
          <div className="p-3.5 rounded-xl bg-surface border border-border flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-xs ring-1 ring-emerald-500/30">
                U
              </div>
              <div>
                <span className="font-semibold text-white text-sm block">1,000 FakeUSDT</span>
                <span className="text-[11px] text-textMuted font-mono block">Quote Asset (6 decimals)</span>
              </div>
            </div>

            <button
              onClick={handleClaimUsdt}
              disabled={isClaimingUsdt || !isConnected}
              className="px-3.5 py-1.5 rounded-lg bg-buy hover:bg-buyHover text-black font-semibold text-xs transition-all flex items-center gap-1.5 shadow-md shadow-buy/10 disabled:opacity-50"
            >
              {isClaimingUsdt ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              <span>Claim USDT</span>
            </button>
          </div>
        </div>

        <div className="mt-5 text-center">
          <p className="text-[11px] text-textMuted font-mono">
            * Demonstration assets hold NO real-world financial value.
          </p>
        </div>
      </div>
    </div>
  );
};
