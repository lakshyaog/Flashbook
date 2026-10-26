import React, { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useChainId } from 'wagmi';
import { parseEther, parseUnits, formatUnits } from 'viem';
import { CONTRACTS, EXCHANGE_ABI, ERC20_ABI } from '../config/contracts';
import { Wallet, Check, AlertCircle, ArrowRight, Loader2 } from 'lucide-react';

interface OrderFormProps {
  selectedPrice: number | null;
  wethBalance: bigint;
  usdtBalance: bigint;
  wethAllowance: bigint;
  usdtAllowance: bigint;
  onOrderSuccess: () => void;
  onNotify: (type: 'success' | 'error' | 'info', title: string, message: string) => void;
}

export const OrderForm: React.FC<OrderFormProps> = ({
  selectedPrice,
  wethBalance,
  usdtBalance,
  wethAllowance,
  usdtAllowance,
  onOrderSuccess,
  onNotify
}) => {
  const { isConnected, address } = useAccount();
  const chainId = useChainId();
  const [side, setSide] = useState<'BUY' | 'SELL'>('BUY');
  const [price, setPrice] = useState<string>('3000.00');
  const [amount, setAmount] = useState<string>('0.10');
  const [isApproving, setIsApproving] = useState<boolean>(false);

  const activeContractConfig = chainId === 11155111 ? CONTRACTS.sepolia : CONTRACTS.anvil;

  // Sync selected price from orderbook click
  useEffect(() => {
    if (selectedPrice && selectedPrice > 0) {
      setPrice(selectedPrice.toFixed(2));
    }
  }, [selectedPrice]);

  const numPrice = parseFloat(price) || 0;
  const numAmount = parseFloat(amount) || 0;
  const totalUsdt = numPrice * numAmount;

  // Formatted balances
  const formattedWeth = parseFloat(formatUnits(wethBalance, 18));
  const formattedUsdt = parseFloat(formatUnits(usdtBalance, 6));

  // Wagmi Contract write hooks
  const { writeContractAsync: writeExchange, isPending: isPlacingOrder } = useWriteContract();
  const { writeContractAsync: writeToken } = useWriteContract();

  // Check if token approval is needed
  const requiredUsdtAtomic = parseUnits(totalUsdt.toFixed(6), 6);
  const requiredWethAtomic = parseEther(numAmount.toFixed(18));

  const needsUsdtApproval = side === 'BUY' && usdtAllowance < requiredUsdtAtomic;
  const needsWethApproval = side === 'SELL' && wethAllowance < requiredWethAtomic;
  const needsApproval = needsUsdtApproval || needsWethApproval;

  const handlePercentageClick = (percent: number) => {
    if (side === 'BUY') {
      if (numPrice <= 0) return;
      const budget = formattedUsdt * (percent / 100);
      const calculatedAmount = budget / numPrice;
      setAmount(calculatedAmount.toFixed(4));
    } else {
      const calculatedAmount = formattedWeth * (percent / 100);
      setAmount(calculatedAmount.toFixed(4));
    }
  };

  const handleApprove = async () => {
    if (!isConnected) {
      onNotify('error', 'Wallet Not Connected', 'Please connect your wallet first.');
      return;
    }
    setIsApproving(true);
    try {
      const tokenAddress = side === 'BUY' ? activeContractConfig.usdt : activeContractConfig.weth;
      const maxUint256 = 115792089237316195423570985008687907853269984665640564039457584007913129639935n;

      const hash = await writeToken({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [activeContractConfig.exchange, maxUint256]
      });

      onNotify('info', 'Approval Submitted', `Transaction broadcasted: ${hash.slice(0, 10)}...`);
      setTimeout(() => {
        setIsApproving(false);
        onOrderSuccess();
        onNotify('success', 'Token Approved', 'Exchange can now escrow your trading assets.');
      }, 3000);
    } catch (err: any) {
      setIsApproving(false);
      onNotify('error', 'Approval Failed', err.shortMessage || err.message);
    }
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConnected) {
      onNotify('error', 'Wallet Not Connected', 'Please connect your wallet first.');
      return;
    }
    if (numPrice <= 0 || numAmount <= 0) {
      onNotify('error', 'Invalid Input', 'Please enter a valid price and amount.');
      return;
    }
    if (numAmount < 0.0001) {
      onNotify('error', 'Order Too Small', 'Minimum order size is 0.0001 FWETH.');
      return;
    }

    if (side === 'BUY' && totalUsdt > formattedUsdt) {
      onNotify('error', 'Insufficient Balance', `You need $${totalUsdt.toFixed(2)} FUSDT but only have $${formattedUsdt.toFixed(2)}.`);
      return;
    }
    if (side === 'SELL' && numAmount > formattedWeth) {
      onNotify('error', 'Insufficient Balance', `You need ${numAmount.toFixed(4)} FWETH but only have ${formattedWeth.toFixed(4)}.`);
      return;
    }

    try {
      // FlashBookExchange takes price as quote units (scaled 1e6) per 1e18 base units
      const scaledPrice = parseUnits(numPrice.toFixed(6), 6);
      const scaledAmount = parseEther(numAmount.toFixed(18));
      const sideEnum = side === 'BUY' ? 0 : 1;

      const hash = await writeExchange({
        address: activeContractConfig.exchange,
        abi: EXCHANGE_ABI,
        functionName: 'placeOrder',
        args: [sideEnum, scaledPrice, scaledAmount]
      });

      onNotify('success', 'Order Submitted', `Transaction sent: ${hash.slice(0, 10)}...`);
      setTimeout(() => {
        onOrderSuccess();
      }, 2500);
    } catch (err: any) {
      onNotify('error', 'Order Failed', err.shortMessage || err.message);
    }
  };

  return (
    <div className="terminal-card rounded-xl p-4 flex flex-col h-full">
      {/* Side Switcher (Buy / Sell) */}
      <div className="grid grid-cols-2 p-1 rounded-lg bg-surface border border-border/80 mb-4">
        <button
          type="button"
          onClick={() => setSide('BUY')}
          className={`py-2 rounded-md font-semibold text-xs tracking-wider uppercase transition-all ${
            side === 'BUY'
              ? 'bg-buy text-black shadow-lg shadow-buy/20'
              : 'text-textSecondary hover:text-white'
          }`}
        >
          Buy FWETH
        </button>
        <button
          type="button"
          onClick={() => setSide('SELL')}
          className={`py-2 rounded-md font-semibold text-xs tracking-wider uppercase transition-all ${
            side === 'SELL'
              ? 'bg-sell text-white shadow-lg shadow-sell/20'
              : 'text-textSecondary hover:text-white'
          }`}
        >
          Sell FWETH
        </button>
      </div>

      {/* Available Balance Row */}
      <div className="flex items-center justify-between text-xs font-mono text-textMuted mb-3 pb-2 border-b border-border/60">
        <span className="flex items-center gap-1.5">
          <Wallet className="w-3.5 h-3.5 text-textSecondary" />
          <span>Available:</span>
        </span>
        <span className="text-textPrimary font-semibold font-mono-numbers">
          {side === 'BUY'
            ? `$${formattedUsdt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} FUSDT`
            : `${formattedWeth.toFixed(4)} FWETH`}
        </span>
      </div>

      <form onSubmit={handlePlaceOrder} className="space-y-3.5 flex-1 flex flex-col justify-between">
        <div className="space-y-3.5">
          {/* Order Type Badge */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-textMuted">Order Type:</span>
            <span className="px-2 py-0.5 rounded bg-surfaceHover border border-border text-textSecondary font-mono text-[11px]">
              LIMIT
            </span>
          </div>

          {/* Limit Price Input */}
          <div>
            <div className="flex justify-between text-[11px] text-textMuted mb-1 font-mono">
              <span>Limit Price</span>
              <span>Quote: FUSDT</span>
            </div>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full bg-surface border border-border focus:border-brand rounded-lg px-3 py-2 text-sm font-mono font-mono-numbers text-textPrimary outline-none transition-colors"
                placeholder="0.00"
              />
              <span className="absolute right-3 top-2.5 text-xs text-textMuted font-mono">USDT</span>
            </div>
          </div>

          {/* Amount Input */}
          <div>
            <div className="flex justify-between text-[11px] text-textMuted mb-1 font-mono">
              <span>Amount</span>
              <span>Base: FWETH</span>
            </div>
            <div className="relative">
              <input
                type="number"
                step="0.001"
                min="0.0001"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-surface border border-border focus:border-brand rounded-lg px-3 py-2 text-sm font-mono font-mono-numbers text-textPrimary outline-none transition-colors"
                placeholder="0.00"
              />
              <span className="absolute right-3 top-2.5 text-xs text-textMuted font-mono">FWETH</span>
            </div>
          </div>

          {/* Quick Percentage Presets */}
          <div className="grid grid-cols-4 gap-1.5">
            {[25, 50, 75, 100].map((pct) => (
              <button
                key={pct}
                type="button"
                onClick={() => handlePercentageClick(pct)}
                className="py-1 rounded bg-surface hover:bg-surfaceHover border border-border/80 text-[11px] font-mono text-textSecondary hover:text-white transition-colors"
              >
                {pct}%
              </button>
            ))}
          </div>

          {/* Order Summary Box */}
          <div className="p-2.5 rounded-lg bg-surface/80 border border-border/80 space-y-1.5 text-xs font-mono">
            <div className="flex justify-between text-textMuted">
              <span>Order Value:</span>
              <span className="text-textPrimary font-mono-numbers font-medium">
                ${totalUsdt.toFixed(2)} FUSDT
              </span>
            </div>
            <div className="flex justify-between text-textMuted">
              <span>Est. Fee (0.10%):</span>
              <span className="text-textSecondary font-mono-numbers">
                ${(totalUsdt * 0.001).toFixed(3)}
              </span>
            </div>
            <div className="flex justify-between text-textMuted">
              <span>Settlement:</span>
              <span className="text-buy font-medium">Atomic On-Chain</span>
            </div>
          </div>
        </div>

        {/* Action Button: Approve or Place Order */}
        <div>
          {needsApproval ? (
            <button
              type="button"
              disabled={isApproving}
              onClick={handleApprove}
              className="w-full py-2.5 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-semibold text-xs tracking-wider uppercase transition-all shadow-md flex items-center justify-center gap-2"
            >
              {isApproving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Approving {side === 'BUY' ? 'FUSDT' : 'FWETH'}...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>1-Click Approve {side === 'BUY' ? 'FUSDT' : 'FWETH'}</span>
                </>
              )}
            </button>
          ) : (
            <button
              type="submit"
              disabled={isPlacingOrder || !isConnected}
              className={`w-full py-2.5 rounded-lg font-semibold text-xs tracking-wider uppercase transition-all shadow-md flex items-center justify-center gap-2 ${
                !isConnected
                  ? 'bg-surface border border-border text-textMuted cursor-not-allowed'
                  : side === 'BUY'
                  ? 'bg-buy hover:bg-buyHover text-black shadow-buy/20'
                  : 'bg-sell hover:bg-sellHover text-white shadow-sell/20'
              }`}
            >
              {isPlacingOrder ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Submitting to Chain...</span>
                </>
              ) : !isConnected ? (
                <span>Connect Wallet to Trade</span>
              ) : (
                <>
                  <span>Place Limit {side}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          )}
        </div>
      </form>
    </div>
  );
};
