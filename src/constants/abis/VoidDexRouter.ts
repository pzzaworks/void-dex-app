export const VOIDDEX_ROUTER_ABI = [
  {
    type: 'constructor',
    inputs: [
      { name: '_weth', type: 'address' },
      { name: '_feeRecipient', type: 'address' },
    ],
  },
  {
    type: 'function',
    name: 'swapMultiRoute',
    stateMutability: 'payable',
    inputs: [
      { name: 'tokenIn', type: 'address' },
      { name: 'tokenOut', type: 'address' },
      { name: 'amountIn', type: 'uint256' },
      { name: 'minTotalAmountOut', type: 'uint256' },
      {
        name: 'routes',
        type: 'tuple[]',
        components: [
          { name: 'dexId', type: 'bytes32' },
          { name: 'percentage', type: 'uint256' },
          { name: 'minAmountOut', type: 'uint256' },
          { name: 'dexData', type: 'bytes' },
        ],
      },
    ],
    outputs: [{ name: 'totalAmountOut', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'swap',
    stateMutability: 'payable',
    inputs: [
      { name: 'tokenIn', type: 'address' },
      { name: 'tokenOut', type: 'address' },
      { name: 'amountIn', type: 'uint256' },
      { name: 'minAmountOut', type: 'uint256' },
      { name: 'dexId', type: 'bytes32' },
      { name: 'dexData', type: 'bytes' },
    ],
    outputs: [{ name: 'amountOut', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'swapExactInput',
    stateMutability: 'payable',
    inputs: [
      { name: 'tokenIn', type: 'address' },
      { name: 'tokenOut', type: 'address' },
      { name: 'amountIn', type: 'uint256' },
      { name: 'minAmountOut', type: 'uint256' },
    ],
    outputs: [{ name: 'amountOut', type: 'uint256' }],
  },
  {
    type: 'event',
    name: 'MultiRouteSwapExecuted',
    inputs: [
      { name: 'operationId', type: 'bytes32', indexed: true },
      { name: 'user', type: 'address', indexed: true },
      { name: 'tokenIn', type: 'address', indexed: false },
      { name: 'tokenOut', type: 'address', indexed: false },
      { name: 'amountIn', type: 'uint256', indexed: false },
      { name: 'totalAmountOut', type: 'uint256', indexed: false },
      { name: 'routeCount', type: 'uint256', indexed: false },
    ],
  },
] as const;
