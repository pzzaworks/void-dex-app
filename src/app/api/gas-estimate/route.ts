import { NextRequest, NextResponse } from 'next/server';
import { createSequentialProvider } from '@/lib/rpc';
import { encodeFunctionData, encodeAbiParameters, keccak256, toHex } from 'viem';

// Relay Adapt Contract addresses per chain - these are protocol constants
const RELAY_ADAPT_CONTRACTS: Record<number, string> = {
  1: '0xc3f2C8F9d5F0705De706b1302B7a039e1e11aC88', // Ethereum Mainnet
  137: '0xc3f2C8F9d5F0705De706b1302B7a039e1e11aC88', // Polygon
  42161: '0xc3f2C8F9d5F0705De706b1302B7a039e1e11aC88', // Arbitrum
  56: '0xc3f2C8F9d5F0705De706b1302B7a039e1e11aC88', // BSC
  11155111: '0x0355B7B8cb128fA5692729Ab3AAa199C1753f726', // Sepolia
};

// VoidDexRouter ABI for swapMultiRoute
const VOID_DEX_ROUTER_ABI = [
  {
    name: 'swapMultiRoute',
    type: 'function',
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
    stateMutability: 'payable',
  },
] as const;

// ERC20 Approve ABI
const ERC20_APPROVE_ABI = [
  {
    name: 'approve',
    type: 'function',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
  },
] as const;

// Relay Adapt ABI for estimating relay overhead
const RELAY_ADAPT_ABI = [
  {
    name: 'relay',
    type: 'function',
    inputs: [
      { name: 'transactions', type: 'tuple[]', components: [
        { name: 'to', type: 'address' },
        { name: 'data', type: 'bytes' },
        { name: 'value', type: 'uint256' },
      ]},
      { name: 'random', type: 'bytes32' },
      { name: 'requireSuccess', type: 'bool' },
      { name: 'minGas', type: 'uint256' },
    ],
    outputs: [],
    stateMutability: 'payable',
  },
] as const;

interface GasEstimateRequest {
  chainId: number;
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
  minAmountOut: string;
  routerAddress: string;
  routes: Array<{
    dexId: string;
    percentage: number;
    minAmountOut: string;
    dexData: string;
  }>;
}

export async function POST(request: NextRequest) {
  try {
    const body: GasEstimateRequest = await request.json();
    const { chainId, tokenIn, tokenOut, amountIn, minAmountOut, routerAddress, routes } = body;

    if (!chainId || !tokenIn || !tokenOut || !amountIn || !routerAddress) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const provider = await createSequentialProvider(chainId);
    const relayAdaptAddress = RELAY_ADAPT_CONTRACTS[chainId];

    if (!relayAdaptAddress) {
      return NextResponse.json({ error: `Unsupported chain: ${chainId}` }, { status: 400 });
    }

    // Encode approve calldata
    const approveCalldata = encodeFunctionData({
      abi: ERC20_APPROVE_ABI,
      functionName: 'approve',
      args: [routerAddress as `0x${string}`, BigInt(amountIn)],
    });

    // Encode swap calldata
    const routeSteps = (routes || []).map((route) => {
      // Convert dexId string to bytes32 (keccak256 hash) - same as page.tsx
      const dexIdBytes32 = route.dexId.startsWith('0x') && route.dexId.length === 66
        ? route.dexId as `0x${string}`
        : keccak256(toHex(route.dexId));

      // Generate dexData if not provided
      let dexData = route.dexData;
      if (!dexData || dexData === '0x' || dexData === '') {
        // Default to UniswapV3 single hop with 0.05% fee
        const innerEncoded = encodeAbiParameters(
          [{ type: 'uint24' }],
          [500]
        );
        dexData = encodeAbiParameters(
          [{ type: 'bool' }, { type: 'bytes' }],
          [false, innerEncoded]
        );
      }

      return {
        dexId: dexIdBytes32,
        percentage: BigInt(route.percentage),
        minAmountOut: BigInt(route.minAmountOut || '0'),
        dexData: dexData as `0x${string}`,
      };
    });

    const swapCalldata = encodeFunctionData({
      abi: VOID_DEX_ROUTER_ABI,
      functionName: 'swapMultiRoute',
      args: [
        tokenIn as `0x${string}`,
        tokenOut as `0x${string}`,
        BigInt(amountIn),
        BigInt(minAmountOut || '0'),
        routeSteps,
      ],
    });

    // Estimate gas for individual operations - no fallbacks, real values only
    let approveGas: bigint;
    let swapGas: bigint;
    let relayAdaptGas: bigint;

    try {
      approveGas = await provider.estimateGas({
        to: tokenIn,
        data: approveCalldata,
        from: relayAdaptAddress,
      });
    } catch (err) {
      console.error('[API] Failed to estimate approve gas:', err);
      return NextResponse.json(
        { error: 'Failed to estimate approve gas. Token may not be approved for this address.' },
        { status: 502 }
      );
    }

    try {
      swapGas = await provider.estimateGas({
        to: routerAddress,
        data: swapCalldata,
        from: relayAdaptAddress,
      });
    } catch (err) {
      console.error('[API] Failed to estimate swap gas:', err);
      return NextResponse.json(
        { error: 'Failed to estimate swap gas. Check if the swap parameters are valid.' },
        { status: 502 }
      );
    }

    // Estimate relay adapt overhead by simulating a relay call
    // This captures the actual gas cost of the relay mechanism
    try {
      const relayCalldata = encodeFunctionData({
        abi: RELAY_ADAPT_ABI,
        functionName: 'relay',
        args: [
          [
            { to: tokenIn as `0x${string}`, data: approveCalldata, value: BigInt(0) },
            { to: routerAddress as `0x${string}`, data: swapCalldata, value: BigInt(0) },
          ],
          '0x0000000000000000000000000000000000000000000000000000000000000000' as `0x${string}`,
          true,
          BigInt(0),
        ],
      });

      relayAdaptGas = await provider.estimateGas({
        to: relayAdaptAddress,
        data: relayCalldata,
        from: relayAdaptAddress,
      });
    } catch {
      // If relay estimation fails, calculate overhead from individual calls
      // Relay overhead = (approve + swap calls through relay) - (direct approve + swap)
      // Since we can't estimate this directly, we'll return what we have and note the limitation
      console.warn('[API] Could not estimate relay adapt gas directly, using component estimates only');
      relayAdaptGas = BigInt(0);
    }

    // Calculate total gas
    // If relayAdaptGas was successfully estimated, it includes approve + swap overhead
    // Otherwise, we just have approve + swap (user will see actual fee during swap)
    const totalGasEstimate = relayAdaptGas > BigInt(0)
      ? relayAdaptGas
      : approveGas + swapGas;

    // Get current gas price from RPC
    const feeData = await provider.getFeeData();

    if (!feeData.gasPrice) {
      return NextResponse.json(
        { error: 'Failed to fetch gas price from network' },
        { status: 502 }
      );
    }

    return NextResponse.json({
      chainId,
      gasEstimate: totalGasEstimate.toString(),
      breakdown: {
        approve: approveGas.toString(),
        swap: swapGas.toString(),
        relayAdapt: relayAdaptGas.toString(),
        // Note: ZK proof verification gas cannot be estimated on-chain
        // Actual gas will be determined by Railgun SDK during swap execution
        note: relayAdaptGas === BigInt(0)
          ? 'Relay overhead could not be estimated. Actual gas will be higher during swap.'
          : undefined,
      },
      gasPrice: feeData.gasPrice.toString(),
      maxFeePerGas: feeData.maxFeePerGas?.toString() || null,
      timestamp: Date.now(),
    });
  } catch (err) {
    console.error('[API] Gas estimate error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to estimate gas' },
      { status: 502 }
    );
  }
}

// GET endpoint for simple gas price fetching
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const chainIdParam = searchParams.get('chainId');

  if (!chainIdParam) {
    return NextResponse.json({ error: 'chainId is required' }, { status: 400 });
  }

  const chainId = parseInt(chainIdParam, 10);
  if (isNaN(chainId)) {
    return NextResponse.json({ error: 'Invalid chainId' }, { status: 400 });
  }

  try {
    const provider = await createSequentialProvider(chainId);
    const feeData = await provider.getFeeData();

    if (!feeData.gasPrice) {
      return NextResponse.json(
        { error: 'Failed to fetch gas price from network' },
        { status: 502 }
      );
    }

    return NextResponse.json({
      chainId,
      gasPrice: feeData.gasPrice.toString(),
      maxFeePerGas: feeData.maxFeePerGas?.toString() || null,
      maxPriorityFeePerGas: feeData.maxPriorityFeePerGas?.toString() || null,
      timestamp: Date.now(),
    });
  } catch (err) {
    console.error('[API] Gas price error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch gas data' },
      { status: 502 }
    );
  }
}
