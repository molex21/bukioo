import { apiRequest, authenticatedApiRequest } from "./api-client";

export type AuthSessionResponse = {
  accessToken: string;
  expiresIn: number;
  tokenType: "Bearer";
};

export type LoginResponse =
  | AuthSessionResponse
  | { emailVerificationRequired: true }
  | { passwordChangeRequired: true }
  | { twoFactorRequired: true };

export type StaffProfile = {
  createdAt: string;
  email: string;
  firstName: string | null;
  id: string;
  isSuperadmin: boolean;
  lastName: string | null;
};

export const staffAuth = {
  activatePassword: (password: string) => apiRequest<AuthSessionResponse>("/auth/activate/password", { body: JSON.stringify({ password }), method: "POST" }),
  activateVerify: (token: string) => apiRequest<{ emailVerified: true; passwordChangeRequired: true }>("/auth/activate/verify", { body: JSON.stringify({ token }), method: "POST" }),
  login: (email: string, password: string) => apiRequest<LoginResponse>("/auth/login", { body: JSON.stringify({ email, password }), method: "POST" }),
  logout: () => apiRequest<void>("/auth/logout", { method: "POST" }),
  me: () => authenticatedApiRequest<StaffProfile>("/auth/me"),
  requestPasswordReset: (email: string) => apiRequest<{ status: "accepted" }>("/auth/password/forgot", { body: JSON.stringify({ email }), method: "POST" }),
  resetPassword: (token: string, password: string) => apiRequest<{ passwordReset: true }>("/auth/password/reset", { body: JSON.stringify({ token, password }), method: "POST" }),
  verifyPasswordResetCode: (token: string) => apiRequest<{ codeVerified: true }>("/auth/password/reset/verify", { body: JSON.stringify({ token }), method: "POST" }),
  verifyTwoFactor: (code: string) => apiRequest<AuthSessionResponse>("/auth/2fa/verify", { body: JSON.stringify({ code }), method: "POST" }),
};
