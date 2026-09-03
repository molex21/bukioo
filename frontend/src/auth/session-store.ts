export type AuthSession = {
  accessToken: string;
  expiresIn: number;
  tokenType: "Bearer";
};

type SessionListener = (session: AuthSession | null) => void;

let currentSession: AuthSession | null = null;
const listeners = new Set<SessionListener>();

export function getStoredSession() {
  return currentSession;
}

export function setStoredSession(session: AuthSession | null) {
  currentSession = session;
  listeners.forEach((listener) => listener(session));
}

export function subscribeToSession(listener: SessionListener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
