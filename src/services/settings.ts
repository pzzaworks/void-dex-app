import { api } from './api';

export interface NetworkConfig {
  chainId: number;
  name: string;
  enabled: boolean;
  isTestnet: boolean;
}

export interface AppSettings {
  networks: NetworkConfig[];
  maintenance: {
    enabled: boolean;
    message?: string;
  };
  swapEnabled: boolean;
}

export async function getSettings(): Promise<AppSettings> {
  return api.get<AppSettings>('/settings');
}

export async function getEnabledNetworks(): Promise<NetworkConfig[]> {
  try {
    return await api.get<NetworkConfig[]>('/settings/networks');
  } catch {
    // Fallback to Sepolia only if API is unavailable
    return [{ chainId: 11155111, name: 'Sepolia', enabled: true, isTestnet: true }];
  }
}
