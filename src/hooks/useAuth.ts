'use client';

import { useState, useCallback } from 'react';
import { useAccount, useSignMessage } from 'wagmi';
import { SiweMessage } from 'siwe';
import { authService } from '@/services/auth';

interface User {
  id: string;
  walletAddress: string;
  termsAccepted: boolean;
}

const TOKEN_KEY = 'voiddex_token';

export function useAuth() {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();

  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isChecked, setIsChecked] = useState(false);

  // Check if user is authenticated by validating token with API
  const checkAuth = useCallback(async (): Promise<boolean> => {
    if (!isConnected || !address) {
      setUser(null);
      setIsChecked(true);
      return false;
    }

    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      setUser(null);
      setIsChecked(true);
      return false;
    }

    try {
      const userData = await authService.getMe();

      // Verify wallet matches
      if (userData.walletAddress.toLowerCase() !== address.toLowerCase()) {
        localStorage.removeItem(TOKEN_KEY);
        setUser(null);
        setIsChecked(true);
        return false;
      }

      setUser(userData);
      setIsChecked(true);
      return userData.termsAccepted;
    } catch {
      localStorage.removeItem(TOKEN_KEY);
      setUser(null);
      setIsChecked(true);
      return false;
    }
  }, [isConnected, address]);

  // Sign in with SIWE (includes terms acceptance)
  const signIn = useCallback(async (): Promise<boolean> => {
    if (!address || !isConnected) return false;

    setIsLoading(true);
    try {
      const { nonce } = await authService.getNonce(address);

      const message = new SiweMessage({
        domain: window.location.host,
        address,
        statement: 'I accept the VoidDex Terms of Service and Privacy Policy.',
        uri: window.location.origin,
        version: '1',
        chainId: 1,
        nonce,
      });

      const messageToSign = message.prepareMessage();
      const signature = await signMessageAsync({ message: messageToSign });
      const response = await authService.verify(messageToSign, signature);

      localStorage.setItem(TOKEN_KEY, response.accessToken);
      setUser(response.user);

      return true;
    } catch (error) {
      console.error('Sign in error:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [address, isConnected, signMessageAsync]);

  // Sign out
  const signOut = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
  }, []);

  return {
    user,
    isAuthenticated: !!user && user.termsAccepted,
    isLoading,
    isChecked,
    checkAuth,
    signIn,
    signOut,
  };
}
