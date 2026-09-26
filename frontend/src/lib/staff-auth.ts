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
  organizations: StaffOrganization[];
  phone: string | null;
};

export type StaffBusiness = {
  id: string;
  logoUrl: string | null;
  name: string;
  slug: string;
  status: "ACTIVE" | "SUSPENDED";
};

export type StaffOrganization = {
  businesses: StaffBusiness[];
  id: string;
  logoUrl: string | null;
  name: string;
  slug: string;
  role: "OWNER" | "ADMIN" | "MANAGER" | "EMPLOYEE" | "CLIENT";
};

export type UpdateMyProfileInput = {
  firstName?: string;
  lastName?: string;
  phone?: string;
};

export type ConfirmEmailChangeResponse = {
  email: string;
  sessionRevoked: true;
};

export const staffAuth = {
  activatePassword: (password: string) => apiRequest<AuthSessionResponse>("/auth/activate/password", { body: JSON.stringify({ password }), method: "POST" }),
  activateVerify: (token: string) => apiRequest<{ emailVerified: true; passwordChangeRequired: boolean }>("/auth/activate/verify", { body: JSON.stringify({ token }), method: "POST" }),
  login: (email: string, password: string) => apiRequest<LoginResponse>("/auth/login", { body: JSON.stringify({ email, password }), method: "POST" }),
  logout: () => apiRequest<void>("/auth/logout", { method: "POST" }),
  me: () => authenticatedApiRequest<StaffProfile>("/auth/me", { cache: "no-store" }),
  updateMyProfile: (input: UpdateMyProfileInput) => authenticatedApiRequest<StaffProfile>("/auth/me", { body: JSON.stringify(input), method: "PATCH" }),
  requestEmailChange: (newEmail: string) => authenticatedApiRequest<{ status: "accepted" }>("/auth/email/change/request", { body: JSON.stringify({ newEmail }), method: "POST" }),
  confirmEmailChange: (token: string) => authenticatedApiRequest<ConfirmEmailChangeResponse>("/auth/email/change/confirm", { body: JSON.stringify({ token }), method: "POST" }),
  requestPasswordReset: (email: string) => apiRequest<{ status: "accepted" }>("/auth/password/forgot", { body: JSON.stringify({ email }), method: "POST" }),
  resetPassword: (token: string, password: string) => apiRequest<{ passwordReset: true }>("/auth/password/reset", { body: JSON.stringify({ token, password }), method: "POST" }),
  verifyPasswordResetCode: (token: string) => apiRequest<{ codeVerified: true }>("/auth/password/reset/verify", { body: JSON.stringify({ token }), method: "POST" }),
  verifyTwoFactor: (code: string) => apiRequest<AuthSessionResponse>("/auth/2fa/verify", { body: JSON.stringify({ code }), method: "POST" }),
};
