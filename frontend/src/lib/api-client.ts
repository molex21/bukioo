const configuredApiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:3000";
const apiBaseUrl = configuredApiUrl.replace(/\/$/, "").endsWith("/api/v1")
  ? configuredApiUrl.replace(/\/$/, "")
  : `${configuredApiUrl.replace(/\/$/, "")}/api/v1`;

export class ApiError extends Error {
  public readonly requestId?: string | null;
  public readonly status: number;

  constructor(
    status: number,
    message: string,
    requestId?: string | null,
  ) {
    super(message);
    this.status = status;
    this.requestId = requestId;
  }
}

type ApiErrorBody = {
  error?: string;
  message?: string | string[];
};

function getErrorMessage(body: ApiErrorBody | null) {
  if (Array.isArray(body?.message)) return body.message.join(" ");
  if (typeof body?.message === "string") return body.message;
  return body?.error ?? "No se ha podido completar la solicitud.";
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");

  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    cache: init.cache ?? "no-store",
    credentials: "include",
    headers,
  });
  const isJson = response.headers.get("content-type")?.includes("application/json");
  const body = isJson ? await response.json() as T | ApiErrorBody : null;

  if (!response.ok) {
    throw new ApiError(response.status, getErrorMessage(body as ApiErrorBody | null), response.headers.get("x-request-id"));
  }

  return body as T;
}

let refreshPromise: Promise<AuthSession> | null = null;

export async function refreshStaffSession() {
  if (!refreshPromise) {
    refreshPromise = apiRequest<AuthSession>("/auth/refresh", { method: "POST" })
      .then((session) => {
        setStoredSession(session);
        return session;
      })
      .catch((error: unknown) => {
        setStoredSession(null);
        throw error;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

export async function authenticatedApiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  async function requestWithSession(session: AuthSession) {
    const headers = new Headers(init.headers);
    headers.set("Authorization", `Bearer ${session.accessToken}`);
    return apiRequest<T>(path, { ...init, headers });
  }

  const session = getStoredSession();
  if (!session) throw new ApiError(401, "La sesión ha caducado.");

  try {
    return await requestWithSession(session);
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 401) throw error;
    return requestWithSession(await refreshStaffSession());
  }
}
import { getStoredSession, setStoredSession, type AuthSession } from "../auth/session-store";
