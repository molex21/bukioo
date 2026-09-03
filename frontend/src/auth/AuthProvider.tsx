import { useEffect, useMemo, useState, type ReactNode } from "react";
import { AuthContext, type AuthSession } from "./auth-context";
import { getStoredSession, setStoredSession, subscribeToSession } from "./session-store";
import { refreshStaffSession } from "../lib/api-client";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(getStoredSession());
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    let active = true;
    const unsubscribe = subscribeToSession((nextSession) => {
      if (active) setSession(nextSession);
    });

    void refreshStaffSession()
      .catch(() => undefined)
      .finally(() => {
        if (active) setIsInitializing(false);
      });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const value = useMemo(() => ({
    clearSession: () => setStoredSession(null),
    isInitializing,
    session,
    setSession: setStoredSession,
  }), [isInitializing, session]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
