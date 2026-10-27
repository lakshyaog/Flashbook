import { useState } from 'react';
import { useWriteContract, useChainId } from 'wagmi';
import { CONTRACTS, EXCHANGE_ABI } from '../config/contracts';

type Notify = (type: 'success' | 'error' | 'info', title: string, message: string) => void;

/** Cancels an on-chain order and reports progress through toasts. */
export function useCancelOrder(onOrderCancelled: () => void, onNotify: Notify) {
  const chainId = useChainId();
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const { writeContractAsync: writeExchange } = useWriteContract();

  const activeContractConfig = chainId === 11155111 ? CONTRACTS.sepolia : CONTRACTS.anvil;

  const cancelOrder = async (orderId: number) => {
    setCancellingId(orderId);
    try {
      const hash = await writeExchange({
        address: activeContractConfig.exchange,
        abi: EXCHANGE_ABI,
        functionName: 'cancelOrder',
        args: [BigInt(orderId)]
      });

      onNotify('info', 'Cancellation Broadcasted', `Transaction: ${hash.slice(0, 10)}...`);
      setTimeout(() => {
        setCancellingId(null);
        onOrderCancelled();
        onNotify('success', 'Order Cancelled', 'Remaining escrow refunded to your wallet.');
      }, 2500);
    } catch (err: any) {
      setCancellingId(null);
      onNotify('error', 'Cancellation Failed', err.shortMessage || err.message);
    }
  };

  return { cancelOrder, cancellingId };
}
