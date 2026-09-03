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

export const superadminApi = {
  dashboard: () => authenticatedApiRequest<SuperadminDashboard>("/superadmin/dashboard"),
};
