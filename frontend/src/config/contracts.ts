export const CONTRACTS = {
  // Configured default addresses for Sepolia and Local Anvil
  sepolia: {
    chainId: 11155111,
    name: 'Ethereum Sepolia',
    exchange: (import.meta.env.VITE_SEPOLIA_EXCHANGE || '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0') as `0x${string}`,
    weth: (import.meta.env.VITE_SEPOLIA_WETH || '0x5FbDB2315678afecb367f032d93F642f64180aa3') as `0x${string}`,
    usdt: (import.meta.env.VITE_SEPOLIA_USDT || '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512') as `0x${string}`,
    explorer: 'https://sepolia.etherscan.io'
  },
  anvil: {
    chainId: 31337,
    name: 'Local Anvil',
    exchange: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0' as `0x${string}`,
    weth: '0x5FbDB2315678afecb367f032d93F642f64180aa3' as `0x${string}`,
    usdt: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512' as `0x${string}`,
    explorer: 'http://localhost:8545'
  }
};

export const EXCHANGE_ABI = [
  {
    type: 'function',
    name: 'placeOrder',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'side', type: 'uint8' },
      { name: 'price', type: 'uint256' },
      { name: 'amount', type: 'uint256' }
    ],
    outputs: [{ name: 'orderId', type: 'uint256' }]
  },
  {
    type: 'function',
    name: 'cancelOrder',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'orderId', type: 'uint256' }],
    outputs: []
  },
  {
    type: 'function',
    name: 'getOrder',
    stateMutability: 'view',
    inputs: [{ name: 'orderId', type: 'uint256' }],
    outputs: [
      {
        components: [
          { name: 'id', type: 'uint256' },
          { name: 'maker', type: 'address' },
          { name: 'side', type: 'uint8' },
          { name: 'price', type: 'uint256' },
          { name: 'amount', type: 'uint256' },
          { name: 'filledAmount', type: 'uint256' },
          { name: 'timestamp', type: 'uint256' },
          { name: 'status', type: 'uint8' }
        ],
        type: 'tuple'
      }
    ]
  },
  {
    type: 'function',
    name: 'getUserOrderIds',
    stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ name: '', type: 'uint256[]' }]
  },
  {
    type: 'function',
    name: 'getActiveBuyOrderIds',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256[]' }]
  },
  {
    type: 'function',
    name: 'getActiveSellOrderIds',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256[]' }]
  },
  {
    type: 'function',
    name: 'feeBps',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }]
  },
  {
    type: 'event',
    name: 'OrderPlaced',
    inputs: [
      { name: 'orderId', type: 'uint256', indexed: true },
      { name: 'maker', type: 'address', indexed: true },
      { name: 'side', type: 'uint8', indexed: false },
      { name: 'price', type: 'uint256', indexed: false },
      { name: 'amount', type: 'uint256', indexed: false },
      { name: 'timestamp', type: 'uint256', indexed: false }
    ]
  },
  {
    type: 'event',
    name: 'OrderMatched',
    inputs: [
      { name: 'buyOrderId', type: 'uint256', indexed: true },
      { name: 'sellOrderId', type: 'uint256', indexed: true },
      { name: 'buyer', type: 'address', indexed: true },
      { name: 'seller', type: 'address', indexed: false },
      { name: 'matchPrice', type: 'uint256', indexed: false },
      { name: 'matchedBaseAmount', type: 'uint256', indexed: false },
      { name: 'matchedQuoteAmount', type: 'uint256', indexed: false },
      { name: 'feeQuote', type: 'uint256', indexed: false },
      { name: 'timestamp', type: 'uint256', indexed: false }
    ]
  },
  {
    type: 'event',
    name: 'OrderCancelled',
    inputs: [
      { name: 'orderId', type: 'uint256', indexed: true },
      { name: 'maker', type: 'address', indexed: true },
      { name: 'refundedAmount', type: 'uint256', indexed: false },
      { name: 'timestamp', type: 'uint256', indexed: false }
    ]
  }
] as const;

export const ERC20_ABI = [
  {
    type: 'function',
    name: 'balanceOf',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }]
  },
  {
    type: 'function',
    name: 'allowance',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' }
    ],
    outputs: [{ name: '', type: 'uint256' }]
  },
  {
    type: 'function',
    name: 'approve',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ],
    outputs: [{ name: '', type: 'bool' }]
  },
  {
    type: 'function',
    name: 'decimals',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }]
  },
  {
    type: 'function',
    name: 'faucet',
    stateMutability: 'nonpayable',
    inputs: [],
    outputs: []
  }
] as const;
