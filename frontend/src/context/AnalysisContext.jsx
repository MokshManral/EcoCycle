import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

const AnalysisContext = createContext(null);
export const useAnalysis = () => useContext(AnalysisContext);

// Holds the latest analysis result and its image preview. The provider owns the object URL and revokes it when replaced.
export function AnalysisProvider({ children }) {
  const [analysis, setState] = useState(null);
  const urlRef = useRef(null);

  const revoke = () => { if (urlRef.current) { URL.revokeObjectURL(urlRef.current); urlRef.current = null; } };
  const setAnalysis = useCallback((result, file) => {
    revoke();
    urlRef.current = file ? URL.createObjectURL(file) : null;
    setState({ result, imageUrl: urlRef.current, fileName: file?.name || '' });
  }, []);
  const clearAnalysis = useCallback(() => { revoke(); setState(null); }, []);
  useEffect(() => revoke, []);

  const value = useMemo(() => ({ analysis, setAnalysis, clearAnalysis }), [analysis, setAnalysis, clearAnalysis]);
  return <AnalysisContext.Provider value={value}>{children}</AnalysisContext.Provider>;
}
