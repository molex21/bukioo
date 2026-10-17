import { authenticatedApiRequest } from "./api-client";

export type WorkspaceEmployee = {
  archived_at: string | null;
  business_id: string;
  color: string | null;
  created_at: string;
  email: string | null;
  first_name: string;
  id: string;
  is_active: boolean;
  last_name: string;
  notes: string | null;
  phone: string | null;
  updated_at: string;
  user_id: string | null;
};

export type EmployeeInput = {
  color?: string;
  email?: string;
  firstName?: string;
  inviteUser?: boolean;
  lastName?: string;
  notes?: string;
  phone?: string;
};

export const workspaceEmployeesApi = {
  create: (
    businessId: string,
    input: Required<Pick<EmployeeInput, "firstName" | "lastName">> &
      EmployeeInput,
  ) =>
    authenticatedApiRequest<WorkspaceEmployee>(
      `/businesses/${businessId}/employees`,
      {
        body: JSON.stringify(input),
        method: "POST",
      },
    ),
  list: (businessId: string) =>
    authenticatedApiRequest<WorkspaceEmployee[]>(
      `/businesses/${businessId}/employees`,
    ),
  update: (businessId: string, employeeId: string, input: EmployeeInput) =>
    authenticatedApiRequest<WorkspaceEmployee>(
      `/businesses/${businessId}/employees/${employeeId}`,
      {
        body: JSON.stringify(input),
        method: "PATCH",
      },
    ),
};
