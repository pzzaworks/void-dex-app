import { NextRequest, NextResponse } from 'next/server';
import { createSequentialProvider } from '@/lib/rpc';

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
      return NextResponse.json({ error: 'Failed to get gas price from network' }, { status: 502 });
    }

    // Return all available gas data
    return NextResponse.json({
      chainId,
      gasPrice: feeData.gasPrice.toString(),
      maxFeePerGas: feeData.maxFeePerGas?.toString() || null,
      maxPriorityFeePerGas: feeData.maxPriorityFeePerGas?.toString() || null,
      // Human readable values in gwei
      gasPriceGwei: (Number(feeData.gasPrice) / 1e9).toFixed(4),
      maxFeePerGasGwei: feeData.maxFeePerGas ? (Number(feeData.maxFeePerGas) / 1e9).toFixed(4) : null,
      timestamp: Date.now(),
    });
  } catch (err) {
    console.error('[API] Gas price error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch gas price' },
      { status: 502 }
    );
  }
}
