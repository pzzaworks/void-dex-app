'use client';

import { useState, useEffect, useCallback } from 'react';
import { getSettings, getEnabledNetworks, type NetworkConfig, type AppSettings } from '@/services/settings';

interface UseSettingsResult {
  settings: AppSettings | null;
  enabledNetworks: NetworkConfig[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useSettings(): UseSettingsResult {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [enabledNetworks, setEnabledNetworks] = useState<NetworkConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchSettings = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [settingsData, networksData] = await Promise.all([
        getSettings(),
        getEnabledNetworks(),
      ]);

      setSettings(settingsData);
      setEnabledNetworks(networksData);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch settings'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  return {
    settings,
    enabledNetworks,
    isLoading,
    error,
    refetch: fetchSettings,
  };
}

export function useEnabledNetworks() {
  const [networks, setNetworks] = useState<NetworkConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetch() {
      try {
        setIsLoading(true);
        const data = await getEnabledNetworks();
        if (!cancelled) {
          setNetworks(data);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error('Failed to fetch networks'));
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    fetch();

    return () => {
      cancelled = true;
    };
  }, []);

  return { networks, isLoading, error };
}
