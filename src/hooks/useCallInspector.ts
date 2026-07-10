import { useEffect, useState } from 'react';
import { loadCallInspectorData, type CallInspectorData } from '../lib/data/callInspector';

interface UseCallInspectorResult {
  data: CallInspectorData | null;
  loading: boolean;
  error: string | null;
}

/** Fetches per-call inspector files only when `callId` is set - never upfront. */
export function useCallInspector(callId: string | null): UseCallInspectorResult {
  const [data, setData] = useState<CallInspectorData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!callId) {
      setData(null);
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    loadCallInspectorData(callId)
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
  }, [callId]);

  return { data, loading, error };
}
