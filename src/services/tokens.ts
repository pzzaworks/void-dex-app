import { api } from './api';

export interface Token {
  symbol: string;
  name: string;
  decimals: number;
  logo: string;
  address: string;
  isNative?: boolean;
  isPopular?: boolean;
}

export interface TokensResponse {
  tokens: Token[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface GetTokensParams {
  chainId: number;
  page?: number;
  limit?: number;
  search?: string;
}

export async function getTokens(
  params: GetTokensParams,
  signal?: AbortSignal,
): Promise<TokensResponse> {
  const query = new URLSearchParams({
    chainId: params.chainId.toString(),
    ...(params.page && { page: params.page.toString() }),
    ...(params.limit && { limit: params.limit.toString() }),
    ...(params.search && { search: params.search }),
  });

  return api.get<TokensResponse>(`/tokens?${query}`, signal ? { signal } : undefined);
}

export async function getNativeToken(chainId: number): Promise<Token> {
  return api.get<Token>(`/tokens/native?chainId=${chainId}`);
}

export async function getToken(chainId: number, symbolOrAddress: string): Promise<Token> {
  return api.get<Token>(`/tokens/${symbolOrAddress}?chainId=${chainId}`);
}

export async function getSupportedChains(): Promise<{ chains: number[] }> {
  return api.get<{ chains: number[] }>('/tokens/chains');
}
