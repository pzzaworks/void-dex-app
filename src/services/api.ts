const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3013/api';
const AUTH_STORAGE_KEY = 'voiddex_token';

function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(AUTH_STORAGE_KEY);
}

class ApiService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_URL;
  }

  private getHeaders(withAuth = false): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (withAuth) {
      const token = getAuthToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }
    return headers;
  }

  async get<T>(endpoint: string, options?: { signal?: AbortSignal; auth?: boolean }): Promise<T> {
    try {
      const res = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'GET',
        headers: this.getHeaders(options?.auth),
        signal: options?.signal,
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({ message: 'Request failed' }));
        throw new Error(error.message || `HTTP ${res.status}`);
      }

      return res.json();
    } catch (err) {
      if (err instanceof Error) {
        if (err.name === 'AbortError') throw err;
        if (err.message === 'Failed to fetch' || err.message.includes('fetch')) {
          throw new Error('Unable to connect to API server.');
        }
      }
      throw err;
    }
  }

  async post<T>(endpoint: string, body?: unknown, options?: { auth?: boolean }): Promise<T> {
    try {
      const res = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        headers: this.getHeaders(options?.auth),
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({ message: 'Request failed' }));
        throw new Error(error.message || `HTTP ${res.status}`);
      }

      return res.json();
    } catch (err) {
      if (err instanceof Error) {
        if (err.name === 'AbortError') throw err;
        if (err.message === 'Failed to fetch' || err.message.includes('fetch')) {
          throw new Error('Unable to connect to API server.');
        }
      }
      throw err;
    }
  }
}

export const api = new ApiService();

export async function checkApiHealth(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(`${API_URL}/health`, {
      method: 'GET',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return res.ok;
  } catch {
    return false;
  }
}
