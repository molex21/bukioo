import { createContext } from "react";
import type { AuthSession } from "./session-store";

export type { AuthSession } from "./session-store";

export type AuthContextValue = {
  clearSession: () => void;
  isInitializing: boolean;
  session: AuthSession | null;
  setSession: (session: AuthSession) => void;
};

export const AuthContext = createContext<AuthContextValue | null>(null);
