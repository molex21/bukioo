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

export type SuperadminEmployeeFilters = {
  limit?: number;
  offset?: number;
  search?: string;
  status?: "ACTIVE" | "ARCHIVED";
};

export type SetOrganizationSubscriptionInput = {
  planCode: string;
  status: "TRIAL" | "ACTIVE" | "SUSPENDED";
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

export const superadminApi = {
  dashboard: () => authenticatedApiRequest<SuperadminDashboard>("/superadmin/dashboard"),
  listOrganizations: (filters: SuperadminOrganizationFilters) => authenticatedApiRequest<SuperadminOrganizationsResponse>(`/superadmin/organizations${toSearchParams(filters)}`),
  listPlans: () => authenticatedApiRequest<SuperadminPlan[]>("/superadmin/plans"),
  listOrganizationBusinesses: (organizationId: string, filters: SuperadminBusinessFilters) => authenticatedApiRequest<SuperadminPaginatedResponse<SuperadminBusiness>>(`/superadmin/organizations/${organizationId}/businesses${toSearchParams(filters)}`),
  getOrganizationBusiness: (organizationId: string, businessId: string) => authenticatedApiRequest<SuperadminBusiness>(`/superadmin/organizations/${organizationId}/businesses/${businessId}`),
  listBusinessEmployees: (organizationId: string, businessId: string, filters: SuperadminEmployeeFilters) => authenticatedApiRequest<SuperadminPaginatedResponse<SuperadminEmployee>>(`/superadmin/organizations/${organizationId}/businesses/${businessId}/employees${toSearchParams(filters)}`),
  getOrganization: (organizationId: string) => authenticatedApiRequest<SuperadminOrganization>(`/superadmin/organizations/${organizationId}`),
  setOrganizationSubscription: (organizationId: string, input: SetOrganizationSubscriptionInput) => authenticatedApiRequest<void>(`/superadmin/organizations/${organizationId}/subscription`, { body: JSON.stringify(input), method: "PUT" }),
  updateOrganizationStatus: (organizationId: string, status: SuperadminOrganization["status"]) => authenticatedApiRequest<SuperadminOrganization>(`/superadmin/organizations/${organizationId}/status`, { body: JSON.stringify({ status }), method: "PATCH" }),
};
