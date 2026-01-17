'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { checkApiHealth } from '@/services/api';

const INITIAL_CHECK_DELAY = 1000; // Initial delay before first check

export function useApiHealth() {
  const [isHealthy, setIsHealthy] = useState<boolean | null>(null); // null = checking
  const [isChecking, setIsChecking] = useState(true);
  const mountedRef = useRef(false);

  const performHealthCheck = useCallback(async () => {
    setIsChecking(true);
    const healthy = await checkApiHealth();
    if (mountedRef.current) {
      setIsHealthy(healthy);
      setIsChecking(false);
    }
    return healthy;
  }, []);

  // Initial health check only (no periodic checks)
  useEffect(() => {
    mountedRef.current = true;

    const timer = setTimeout(() => {
      performHealthCheck();
    }, INITIAL_CHECK_DELAY);

    return () => {
      mountedRef.current = false;
      clearTimeout(timer);
    };
  }, [performHealthCheck]);

  return {
    isHealthy,
    isChecking,
    retry: performHealthCheck,
  };
}
