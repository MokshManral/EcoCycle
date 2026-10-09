import { useCallback, useEffect, useRef, useState } from 'react';

// Runs an async loader on mount/deps change. API responses stay the source of truth: call `reload` after mutations.
export function useAsync(loader, deps = []) {
  const [state, setState] = useState({ data: null, error: null, loading: true });
  const run = useRef(0);

  const load = useCallback(() => {
    const id = ++run.current;
    setState((s) => ({ ...s, loading: true, error: null }));
    loader()
      .then((data) => id === run.current && setState({ data, error: null, loading: false }))
      .catch((error) => id === run.current && setState({ data: null, error, loading: false }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => { load(); return () => { run.current++; }; }, [load]);
  return { ...state, reload: load };
}
