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
export type WorkingHourInput = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
};
export type EmployeeWorkingHour = {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  valid_from: string | null;
  valid_to: string | null;
};

export const workspaceEmployeesApi = {
  listWorkingHours: (businessId: string, employeeId: string) =>
    authenticatedApiRequest<EmployeeWorkingHour[]>(
      `/businesses/${businessId}/employees/${employeeId}/working-hours`,
    ),
  replaceWorkingHours: (
    businessId: string,
    employeeId: string,
    hours: WorkingHourInput[],
  ) =>
    authenticatedApiRequest<void>(
      `/businesses/${businessId}/employees/${employeeId}/working-hours`,
      { method: "PUT", body: JSON.stringify({ hours }) },
    ),
  invite: (businessId: string, employeeId: string) =>
    authenticatedApiRequest<WorkspaceEmployee>(
      `/businesses/${businessId}/employees/${employeeId}/invite`,
      { method: "POST" },
    ),
  requestPasswordReset: (businessId: string, employeeId: string) =>
    authenticatedApiRequest<void>(
      `/businesses/${businessId}/employees/${employeeId}/password-reset`,
      { method: "POST" },
    ),
  resetTwoFactor: (businessId: string, employeeId: string) =>
    authenticatedApiRequest<void>(
      `/businesses/${businessId}/employees/${employeeId}/2fa/reset`,
      { method: "POST" },
    ),
  archive: (businessId: string, employeeId: string) =>
    authenticatedApiRequest<void>(
      `/businesses/${businessId}/employees/${employeeId}`,
      { method: "DELETE" },
    ),
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
