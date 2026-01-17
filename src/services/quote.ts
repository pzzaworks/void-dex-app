import { api } from './api';
import type { QuoteParams, QuoteResponse } from '@/types';

export async function getQuote(params: QuoteParams): Promise<QuoteResponse> {
  const query = new URLSearchParams({
    chainId: params.chainId.toString(),
    fromToken: params.fromToken,
    toToken: params.toToken,
    amount: params.amount,
    ...(params.fromTokenSymbol && { fromTokenSymbol: params.fromTokenSymbol }),
    ...(params.toTokenSymbol && { toTokenSymbol: params.toTokenSymbol }),
    ...(params.slippage && { slippage: params.slippage.toString() }),
    ...(params.type && { type: params.type }),
  });

  return api.get<QuoteResponse>(`/quote?${query}`, { auth: true });
}
