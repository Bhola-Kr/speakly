import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

type ActiveCall = { params: Record<string, any> };
type CallContext = {
  activeCall: ActiveCall | null;
  visible: boolean;
  startCall: (params: Record<string, any>) => void;
  minimizeCall: () => void;
  showCall: () => void;
  clearCall: () => void;
};
const Context = createContext<CallContext | null>(null);

export function ActiveCallProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null);
  const [visible, setVisible] = useState(false);
  const startCall = useCallback((params: Record<string, any>) => {
    setActiveCall(current => current ?? { params });
    setVisible(true);
  }, []);
  const minimizeCall = useCallback(() => setVisible(false), []);
  const showCall = useCallback(() => setVisible(true), []);
  const clearCall = useCallback(() => {
    setActiveCall(null);
    setVisible(false);
  }, []);
  const value = useMemo(
    () => ({
      activeCall,
      visible,
      startCall,
      minimizeCall,
      showCall,
      clearCall,
    }),
    [activeCall, visible, startCall, minimizeCall, showCall, clearCall],
  );
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useActiveCall() {
  const value = useContext(Context);
  if (!value) throw new Error('ActiveCallProvider is required');
  return value;
}
