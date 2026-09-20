import { authenticatedApiRequest } from "./api-client";

export type SuperadminDashboard = {
  appointments: number;
  businesses: number;
  customers: number;
  employees: number;
  organizations: {
    active: number;
    suspended: number;
  };
  subscriptions: {
    active: number;
    trial: number;
  };
};

export type SuperadminOrganization = {
  id: string;
  name: string;
  slug: string;
  email: string;
  status: "ACTIVE" | "SUSPENDED";
  createdAt: string;
  businesses: number;
  employees: number;
  subscription: {
    planCode: string;
    status: "TRIAL" | "ACTIVE" | "SUSPENDED" | "EXPIRED";
  } | null;
};

export type SuperadminOrganizationsResponse = {
  items: SuperadminOrganization[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
  };
};

export type SuperadminPlan = {
  code: string;
  isActive: boolean;
  name: string;
};

export type SuperadminPagination = {
  limit: number;
  offset: number;
  total: number;
};

export type SuperadminPaginatedResponse<T> = {
  items: T[];
  pagination: SuperadminPagination;
};

export type SuperadminBusiness = {
  id: string;
  organizationId: string;
  name: string;
  slug: string;
  email: string | null;
  phone: string | null;
  timezone: string;
  logoUrl: string | null;
  status: "ACTIVE" | "SUSPENDED";
  employeeCount: number;
  createdAt: string;
};

export type SuperadminEmployee = {
  id: string;
  userId: string | null;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  color: string | null;
  isActive: boolean;
  createdAt: string;
};

export type SuperadminBusinessFilters = {
  limit?: number;
  offset?: number;
  search?: string;
  status?: "ACTIVE" | "SUSPENDED";
};

export type PlatformEmployeeDetail = SuperadminEmployee & {
  organizationId: string;
  businessId: string;
  notes: string | null;
  updatedAt: string;
  archivedAt: string | null;
};

export type UpdatePlatformEmployeeInput = {
  expectedUpdatedAt: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  color: string | null;
  notes: string | null;
  isActive: boolean;
};

export type RequestMemberEmailChangeInput = {
  newEmail: string;
};

export type ConfirmMemberEmailChangeInput = {
  token: string;
};

export type SuperadminEmployeeFilters = {
  limit?: number;
  offset?: number;
  search?: string;
  status?: "ACTIVE" | "ARCHIVED";
};

export type SetOrganizationSubscriptionInput = {
  planCode: string;
  status: "TRIAL" | "ACTIVE" | "SUSPENDED";
  trialEndsAt?: string;
  expiresAt?: string;
};

export type OrganizationSubscription = {
  id: string;
  planCode: string;
  status: "TRIAL" | "ACTIVE" | "SUSPENDED" | "EXPIRED";
  trialStartedAt: string | null;
  trialEndsAt: string | null;
  startsAt: string;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type OrganizationSubscriptionFilters = {
  limit?: number;
  offset?: number;
};

export type UpdateSuperadminBusinessInput = {
  name?: string;
  slug?: string;
  email?: string;
  phone?: string;
  timezone?: string;
  logoUrl?: string | null;
  status?: "ACTIVE" | "SUSPENDED";
};

export type PlatformAuditLog = {
  id: string;
  actorUserId: string | null;
  actorEmail: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  oldValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
  createdAt: string;
};

export type PlatformAuditLogFilters = {
  organizationId?: string;
  actorUserId?: string;
  action?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
};

export type SuperadminOrganizationFilters = {
  limit?: number;
  offset?: number;
  planCode?: string;
  search?: string;
  status?: "ACTIVE" | "SUSPENDED";
};

function toSearchParams(filters: Record<string, string | number | null | undefined>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value != null && value !== "") params.set(key, String(value));
  }
  const query = params.toString();
  return query ? `?${query}` : "";
}

export type CreateSuperadminOrganizationInput = {
  email: string;
  firstName: string;
  lastName: string;
  organizationName: string;
  organizationSlug: string;
  timezone: string;
};

export type CreateSuperadminBusinessInput = {
  name: string;
  slug: string;
  email?: string;
  phone?: string;
  timezone: string;
  logoUrl?: string;
};

export type CreateSuperadminEmployeeInput = {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  color?: string;
  role: "EMPLOYEE" | "MANAGER";
};

export type OrganizationMember = {
  membershipId: string;
  userId: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  role: "OWNER" | "ADMIN" | "MANAGER" | "EMPLOYEE" | "CLIENT";
  status: "ACTIVE" | "INVITED" | "SUSPENDED";
  userStatus: string;
  businesses: Array<{
    id: string;
    name: string;
    slug: string;
    status: "ACTIVE" | "SUSPENDED";
    hasAccess: boolean;
    explicitlyAssigned: boolean;
    employeeId: string | null;
    employeeIsActive: boolean | null;
    attendsAppointments: boolean;
  }>;
};

export type OrganizationMemberFilters = {
  search?: string;
  role?: OrganizationMember["role"];
  status?: OrganizationMember["status"];
  businessId?: string;
  limit?: number;
  offset?: number;
};

export type UpdateMemberRoleInput = {
  role: "ADMIN" | "MANAGER" | "EMPLOYEE";
  businessIds?: string[];
};

export type UpdateMemberStatusInput = {
  status: "ACTIVE" | "SUSPENDED";
  expectedStatus: "ACTIVE" | "SUSPENDED";
  expectedRole: "ADMIN" | "MANAGER" | "EMPLOYEE";
};

export type UpdateMemberBusinessesInput = {
  businessIds: string[];
  expectedBusinessIds: string[];
  expectedRole: "MANAGER" | "EMPLOYEE";
};

export type TransferOwnershipInput = {
  currentOwnerMembershipId: string;
  newOwnerMembershipId: string;
};

export const superadminApi = {
  requestMemberEmailChange: (organizationId: string, membershipId: string, input: RequestMemberEmailChangeInput) => authenticatedApiRequest<{ status: "accepted" }>(`/superadmin/organizations/${organizationId}/members/${membershipId}/email-change/request`, { method: "POST", body: JSON.stringify(input) }),
  confirmMemberEmailChange: (organizationId: string, membershipId: string, input: ConfirmMemberEmailChangeInput) => authenticatedApiRequest<{ email: string; sessionRevoked: true }>(`/superadmin/organizations/${organizationId}/members/${membershipId}/email-change/confirm`, { method: "POST", body: JSON.stringify(input) }),
  updateMemberStatus: (organizationId: string, membershipId: string, input: UpdateMemberStatusInput) => authenticatedApiRequest<{ membershipId: string; userId: string; status: "ACTIVE" | "SUSPENDED" }>(`/superadmin/organizations/${organizationId}/members/${membershipId}/status`, { method: "PATCH", body: JSON.stringify(input) }),
  updateMemberBusinesses: (organizationId: string, membershipId: string, input: UpdateMemberBusinessesInput) => authenticatedApiRequest<{ membershipId: string; userId: string; businessIds: string[] }>(`/superadmin/organizations/${organizationId}/members/${membershipId}/businesses`, { method: "PATCH", body: JSON.stringify(input) }),
  transferOwnership: (organizationId: string, input: TransferOwnershipInput) => authenticatedApiRequest<{ organizationId: string; previousOwner: { membershipId: string; userId: string; role: "ADMIN" }; newOwner: { membershipId: string; userId: string; role: "OWNER" } }>(`/superadmin/organizations/${organizationId}/transfer-ownership`, { method: "POST", body: JSON.stringify(input) }),
  getEmployee: (organizationId: string, businessId: string, employeeId: string) => authenticatedApiRequest<PlatformEmployeeDetail>(`/superadmin/organizations/${organizationId}/businesses/${businessId}/employees/${employeeId}`),
  updateEmployee: (organizationId: string, businessId: string, employeeId: string, input: UpdatePlatformEmployeeInput) => authenticatedApiRequest<PlatformEmployeeDetail>(`/superadmin/organizations/${organizationId}/businesses/${businessId}/employees/${employeeId}`, { method: "PATCH", body: JSON.stringify(input) }),
  listMembers: (organizationId: string, filters: OrganizationMemberFilters) => authenticatedApiRequest<SuperadminPaginatedResponse<OrganizationMember>>(`/superadmin/organizations/${organizationId}/members${toSearchParams(filters)}`),
  updateMemberRole: (organizationId: string, membershipId: string, input: UpdateMemberRoleInput) => authenticatedApiRequest<{ membershipId: string; userId: string; role: UpdateMemberRoleInput["role"] }>(`/superadmin/organizations/${organizationId}/members/${membershipId}/role`, { method: "PATCH", body: JSON.stringify(input) }),
  linkMemberToAgenda: (organizationId: string, businessId: string, input: { userId: string; color?: string }) => authenticatedApiRequest<{ id: string }>(`/superadmin/organizations/${organizationId}/businesses/${businessId}/employees`, { method: "POST", body: JSON.stringify(input) }),
  createOrganization: (input: CreateSuperadminOrganizationInput) => authenticatedApiRequest<{ organization: { id: string }; business: { id: string } }>("/superadmin/organizations", { body: JSON.stringify(input), method: "POST" }),
  createBusiness: (organizationId: string, input: CreateSuperadminBusinessInput) => authenticatedApiRequest<{ id: string }>(`/superadmin/organizations/${organizationId}/businesses`, { body: JSON.stringify(input), method: "POST" }),
  createEmployee: (organizationId: string, businessId: string, input: CreateSuperadminEmployeeInput) => authenticatedApiRequest<{ id: string }>(`/superadmin/organizations/${organizationId}/businesses/${businessId}/employees`, { body: JSON.stringify(input), method: "POST" }),
  dashboard: () => authenticatedApiRequest<SuperadminDashboard>("/superadmin/dashboard"),
  listOrganizations: (filters: SuperadminOrganizationFilters) => authenticatedApiRequest<SuperadminOrganizationsResponse>(`/superadmin/organizations${toSearchParams(filters)}`),
  listPlans: () => authenticatedApiRequest<SuperadminPlan[]>("/superadmin/plans"),
  listOrganizationBusinesses: (organizationId: string, filters: SuperadminBusinessFilters) => authenticatedApiRequest<SuperadminPaginatedResponse<SuperadminBusiness>>(`/superadmin/organizations/${organizationId}/businesses${toSearchParams(filters)}`),
  getOrganizationBusiness: (organizationId: string, businessId: string) => authenticatedApiRequest<SuperadminBusiness>(`/superadmin/organizations/${organizationId}/businesses/${businessId}`),
  updateOrganizationBusiness: (organizationId: string, businessId: string, input: UpdateSuperadminBusinessInput) => authenticatedApiRequest<SuperadminBusiness>(`/superadmin/organizations/${organizationId}/businesses/${businessId}`, { body: JSON.stringify(input), method: "PATCH" }),
  listBusinessEmployees: (organizationId: string, businessId: string, filters: SuperadminEmployeeFilters) => authenticatedApiRequest<SuperadminPaginatedResponse<SuperadminEmployee>>(`/superadmin/organizations/${organizationId}/businesses/${businessId}/employees${toSearchParams(filters)}`),
  getOrganization: (organizationId: string) => authenticatedApiRequest<SuperadminOrganization>(`/superadmin/organizations/${organizationId}`),
  setOrganizationSubscription: (organizationId: string, input: SetOrganizationSubscriptionInput) => authenticatedApiRequest<void>(`/superadmin/organizations/${organizationId}/subscription`, { body: JSON.stringify(input), method: "PUT" }),
  listOrganizationSubscriptions: (organizationId: string, filters: OrganizationSubscriptionFilters = {}) => authenticatedApiRequest<SuperadminPaginatedResponse<OrganizationSubscription>>(`/superadmin/organizations/${organizationId}/subscriptions${toSearchParams(filters)}`),
  listAuditLogs: (filters: PlatformAuditLogFilters) => authenticatedApiRequest<SuperadminPaginatedResponse<PlatformAuditLog>>(`/superadmin/audit-logs${toSearchParams(filters)}`),
  updateOrganizationStatus: (organizationId: string, status: SuperadminOrganization["status"]) => authenticatedApiRequest<SuperadminOrganization>(`/superadmin/organizations/${organizationId}/status`, { body: JSON.stringify({ status }), method: "PATCH" }),
};
