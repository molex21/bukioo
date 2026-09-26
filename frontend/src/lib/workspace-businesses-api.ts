import { authenticatedApiRequest } from "./api-client";

export type WorkspaceBusiness = {
  created_at: string;
  email: string | null;
  id: string;
  logo_url: string | null;
  name: string;
  organization_id: string;
  phone: string | null;
  slug: string;
  status: "ACTIVE" | "SUSPENDED";
  timezone: string;
  updated_at: string;
};

export type CreateWorkspaceBusinessInput = {
  email?: string;
  logoUrl?: string;
  name: string;
  organizationId: string;
  phone?: string;
  slug: string;
  timezone?: string;
};

export type UpdateWorkspaceBusinessInput = Omit<
  Partial<CreateWorkspaceBusinessInput>,
  "organizationId" | "logoUrl"
> & {
  logoUrl?: string | null;
  status?: WorkspaceBusiness["status"];
};

export const workspaceBusinessesApi = {
  create: (input: CreateWorkspaceBusinessInput) =>
    authenticatedApiRequest<WorkspaceBusiness>("/businesses", {
      body: JSON.stringify(input),
      method: "POST",
    }),
  list: (organizationId: string) =>
    authenticatedApiRequest<WorkspaceBusiness[]>(
      `/businesses?organizationId=${encodeURIComponent(organizationId)}`,
    ),
  update: (businessId: string, input: UpdateWorkspaceBusinessInput) =>
    authenticatedApiRequest<WorkspaceBusiness>(`/businesses/${businessId}`, {
      body: JSON.stringify(input),
      method: "PATCH",
    }),
};
