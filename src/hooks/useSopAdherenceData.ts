import { useEffect, useState } from 'react';
import { loadSopAdherenceData, type SopAdherenceData } from '../lib/data/sopAdherenceData';

interface UseSopAdherenceDataResult {
  data: SopAdherenceData | null;
  loading: boolean;
  error: string | null;
}

export function useSopAdherenceData(): UseSopAdherenceDataResult {
  const [data, setData] = useState<SopAdherenceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError(null);
    loadSopAdherenceData()
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { data, loading, error };
}
