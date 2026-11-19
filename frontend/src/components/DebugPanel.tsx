import React, { useState, useEffect } from 'react';
import { useAccount, useChainId, useBlockNumber, useBalance } from 'wagmi';
import { CONTRACTS } from '../config/contracts';
import { Bug, X, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

export const DebugPanel: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { address, isConnected, connector } = useAccount();
  const chainId = useChainId();
  const { data: blockNumber } = useBlockNumber({ watch: true });
  const { data: ethBalance } = useBalance({ address });
  
  const activeContractConfig = chainId === 11155111 ? CONTRACTS.sepolia : CONTRACTS.anvil;
  
  const [anvilStatus, setAnvilStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  
  useEffect(() => {
    const checkAnvil = async () => {
      try {
        const response = await fetch('http://127.0.0.1:8545', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'eth_blockNumber',
            params: [],
            id: 1
          })
        });
        const data = await response.json();
        setAnvilStatus(data.result ? 'online' : 'offline');
      } catch (err) {
        setAnvilStatus('offline');
      }
    };
    
    checkAnvil();
    const interval = setInterval(checkAnvil, 5000);
    return () => clearInterval(interval);
  }, []);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 p-3 bg-purple-600 hover:bg-purple-700 text-white rounded-full shadow-lg z-50 transition-all"
        title="Open Debug Panel"
      >
        <Bug className="w-5 h-5" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 w-96 bg-slate-900 border border-purple-500/50 rounded-xl shadow-2xl z-50 text-white font-mono text-xs">
      <div className="flex items-center justify-between p-3 border-b border-purple-500/50 bg-purple-900/20">
        <div className="flex items-center gap-2">
          <Bug className="w-4 h-4 text-purple-400" />
          <span className="font-bold text-sm">Debug Panel</span>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="p-1 hover:bg-slate-800 rounded transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-3 space-y-3 max-h-[600px] overflow-y-auto">
        {/* Anvil Status */}
        <div className="p-2 bg-slate-800 rounded border border-slate-700">
          <div className="font-semibold text-purple-400 mb-2 flex items-center gap-2">
            {anvilStatus === 'online' ? (
              <CheckCircle className="w-3.5 h-3.5 text-green-500" />
            ) : anvilStatus === 'offline' ? (
              <XCircle className="w-3.5 h-3.5 text-red-500" />
            ) : (
              <AlertCircle className="w-3.5 h-3.5 text-yellow-500" />
            )}
            Anvil Node
          </div>
          <div className="space-y-1 text-slate-300">
            <div>Status: <span className={anvilStatus === 'online' ? 'text-green-400' : 'text-red-400'}>{anvilStatus}</span></div>
            <div>URL: http://127.0.0.1:8545</div>
          </div>
        </div>

        {/* Wallet Connection */}
        <div className="p-2 bg-slate-800 rounded border border-slate-700">
          <div className="font-semibold text-purple-400 mb-2 flex items-center gap-2">
            {isConnected ? (
              <CheckCircle className="w-3.5 h-3.5 text-green-500" />
            ) : (
              <XCircle className="w-3.5 h-3.5 text-red-500" />
            )}
            Wallet
          </div>
          <div className="space-y-1 text-slate-300">
            <div>Connected: <span className={isConnected ? 'text-green-400' : 'text-red-400'}>{isConnected ? 'Yes' : 'No'}</span></div>
            {isConnected && (
              <>
                <div>Address: {address?.slice(0, 6)}...{address?.slice(-4)}</div>
                <div>Connector: {connector?.name}</div>
                <div>ETH Balance: {ethBalance ? parseFloat(ethBalance.formatted).toFixed(4) : '0'} ETH</div>
              </>
            )}
          </div>
        </div>

        {/* Network Info */}
        <div className="p-2 bg-slate-800 rounded border border-slate-700">
          <div className="font-semibold text-purple-400 mb-2">Network</div>
          <div className="space-y-1 text-slate-300">
            <div>Chain ID: <span className="text-yellow-400">{chainId || 'Not connected'}</span></div>
            <div>Network: {chainId === 31337 ? 'Anvil (Local)' : chainId === 11155111 ? 'Sepolia' : 'Unknown'}</div>
            <div>Block: {blockNumber ? blockNumber.toString() : 'N/A'}</div>
          </div>
        </div>

        {/* Contract Addresses */}
        <div className="p-2 bg-slate-800 rounded border border-slate-700">
          <div className="font-semibold text-purple-400 mb-2">Contracts</div>
          <div className="space-y-1 text-slate-300">
            <div className="truncate">
              <div className="text-slate-400">Exchange:</div>
              <div className="text-blue-400">{activeContractConfig.exchange}</div>
            </div>
            <div className="truncate">
              <div className="text-slate-400">WETH:</div>
              <div className="text-blue-400">{activeContractConfig.weth}</div>
            </div>
            <div className="truncate">
              <div className="text-slate-400">USDT:</div>
              <div className="text-blue-400">{activeContractConfig.usdt}</div>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="p-2 bg-blue-900/20 rounded border border-blue-500/30">
          <div className="font-semibold text-blue-400 mb-2">Troubleshooting</div>
          <div className="space-y-2 text-slate-300 text-[11px]">
            {anvilStatus === 'offline' && (
              <div className="text-red-400">
                ⚠️ Anvil is not running. Start it with: <code className="bg-slate-800 px-1 py-0.5 rounded">anvil</code>
              </div>
            )}
            {!isConnected && (
              <div className="text-yellow-400">
                ⚠️ Wallet not connected. Click "Connect Wallet" above.
              </div>
            )}
            {isConnected && chainId !== 31337 && chainId !== 11155111 && (
              <div className="text-yellow-400">
                ⚠️ Wrong network. Switch to Anvil (31337) or Sepolia (11155111).
              </div>
            )}
            <div className="text-slate-400">
              💡 Open browser console (F12) to see detailed transaction logs.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
