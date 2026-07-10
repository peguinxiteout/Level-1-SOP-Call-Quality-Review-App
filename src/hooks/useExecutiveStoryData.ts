import { useEffect, useState } from 'react';
import { loadExecutiveStoryData, type ExecutiveStoryData } from '../lib/data/executiveStoryData';

interface UseExecutiveStoryDataResult {
  data: ExecutiveStoryData | null;
  loading: boolean;
  error: string | null;
}

export function useExecutiveStoryData(): UseExecutiveStoryDataResult {
  const [data, setData] = useState<ExecutiveStoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError(null);
    loadExecutiveStoryData()
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
