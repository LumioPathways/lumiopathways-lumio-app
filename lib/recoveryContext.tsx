/**
 * Lumio Pathways — Recovery Context
 *
 * Provides the password-reset access token as React state so that
 * reset-password.tsx re-renders correctly when the token arrives
 * asynchronously via a deep link (Linking.addEventListener).
 */
import React, { createContext, useContext, useState, useCallback } from 'react';

type RecoveryToken = { access_token: string; refresh_token?: string } | null;

type RecoveryContextType = {
  recovery: RecoveryToken;
  setRecovery: (token: RecoveryToken) => void;
  clearRecovery: () => void;
};

const RecoveryContext = createContext<RecoveryContextType>({
  recovery: null,
  setRecovery: () => {},
  clearRecovery: () => {},
});

export function RecoveryProvider({ children }: { children: React.ReactNode }) {
  const [recovery, setRecoveryState] = useState<RecoveryToken>(null);

  const setRecovery = useCallback((token: RecoveryToken) => {
    setRecoveryState(token);
  }, []);

  const clearRecovery = useCallback(() => {
    setRecoveryState(null);
  }, []);

  return (
    <RecoveryContext.Provider value={{ recovery, setRecovery, clearRecovery }}>
      {children}
    </RecoveryContext.Provider>
  );
}

export function useRecovery() {
  return useContext(RecoveryContext);
}
