import { api } from './api';

interface NonceResponse {
  nonce: string;
}

interface VerifyResponse {
  accessToken: string;
  user: {
    id: string;
    walletAddress: string;
    termsAccepted: boolean;
  };
}

interface MeResponse {
  id: string;
  walletAddress: string;
  termsAccepted: boolean;
}

export const authService = {
  getNonce: (address: string) => api.get<NonceResponse>(`/auth/nonce?address=${address}`),

  verify: (message: string, signature: string) =>
    api.post<VerifyResponse>('/auth/verify', { message, signature }),

  // Get current user info using JWT token
  getMe: () => api.get<MeResponse>('/auth/me', { auth: true }),
};
