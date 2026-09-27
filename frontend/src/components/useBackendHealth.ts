import { useEffect, useState } from 'react';
import { checkBackendHealth } from '../utils/apiClient';

export type BackendHealth = 'checking' | 'online' | 'offline';

const POLL_MS = 15000;

/** Sonda periódica de GET /api/health, usada só para exibir o indicador do modo Python API. */
export function useBackendHealth(): BackendHealth {
  const [health, setHealth] = useState<BackendHealth>('checking');

  useEffect(() => {
    let cancelled = false;

    const poll = async () => {
      const online = await checkBackendHealth();
      if (!cancelled) setHealth(online ? 'online' : 'offline');
    };

    void poll();
    const id = window.setInterval(() => void poll(), POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  return health;
}
