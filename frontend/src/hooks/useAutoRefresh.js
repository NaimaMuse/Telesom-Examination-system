import { useEffect, useRef } from 'react';
import { createRefreshLoop } from './refreshLoop';

export default function useAutoRefresh(load, { enabled = true, interval = 10000, immediate = true, deps = [], onError } = {}) {
  const latest = useRef({ load, onError, enabled });
  latest.current = { load, onError, enabled };
  useEffect(() => {
    if (!enabled) return;
    return createRefreshLoop(context => latest.current.load({ ...context, isCurrent: () => context.isCurrent() && latest.current.enabled }), {
      interval, immediate, onError: error => latest.current.onError?.(error),
    });
  }, [enabled, interval, immediate, ...deps]);
}
