import { SetMetadata } from "@nestjs/common";

export const ROLES_KEY = "roles";

export type OrganizationRole =
  | "OWNER"
  | "ADMIN"
  | "MANAGER"
  | "EMPLOYEE"
  | "CLIENT";

export const Roles = (...roles: OrganizationRole[]) =>
  SetMetadata(ROLES_KEY, roles);
