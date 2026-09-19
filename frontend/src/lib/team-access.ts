import type { OrganizationMember, UpdateMemberRoleInput } from "./superadmin-api";

export const memberRoleLabels = { OWNER: "Propietario", ADMIN: "Administrador", MANAGER: "Responsable", EMPLOYEE: "Empleado", CLIENT: "Cliente" };

type AccessActor = { id: string; role?: string; isSuperadmin: boolean };

export function canChangeMemberStatus(member: OrganizationMember, actor: AccessActor) {
  if (member.userId === actor.id || !["ACTIVE", "SUSPENDED"].includes(member.status) || !["ADMIN", "MANAGER", "EMPLOYEE"].includes(member.role)) return false;
  if (member.status === "SUSPENDED" && member.userStatus !== "ACTIVE") return false;
  return actor.isSuperadmin || actor.role === "OWNER" || (actor.role === "ADMIN" && member.role !== "ADMIN");
}

export function canManageMemberBusinesses(member: OrganizationMember, actor: AccessActor) {
  if (!["EMPLOYEE", "MANAGER"].includes(member.role) || !["ACTIVE", "SUSPENDED"].includes(member.status) || member.userStatus !== "ACTIVE") return false;
  return actor.isSuperadmin || actor.role === "OWNER" || (actor.role === "ADMIN" && member.userId !== actor.id);
}

export function memberStatusLabel(status: string) {
  return ({ ACTIVE: "Activa", INVITED: "Invitada", SUSPENDED: "Suspendida", INACTIVE: "Inactiva", PENDING: "Pendiente", DELETED: "Eliminada" } as Record<string, string>)[status] ?? "Estado no reconocido";
}

export function editableMemberRoles(member: OrganizationMember, actor: { id: string; role?: string; isSuperadmin: boolean }): UpdateMemberRoleInput["role"][] {
  if (member.status !== "ACTIVE" || member.userStatus !== "ACTIVE" || !["ADMIN", "MANAGER", "EMPLOYEE"].includes(member.role)) return [];
  if (actor.isSuperadmin || actor.role === "OWNER") return ["ADMIN", "MANAGER", "EMPLOYEE"];
  if (actor.role === "ADMIN" && member.userId !== actor.id && member.role !== "ADMIN") return ["MANAGER", "EMPLOYEE"];
  return [];
}

export function linkableBusinesses(member: OrganizationMember) {
  if (member.status !== "ACTIVE" || member.userStatus !== "ACTIVE" || member.role === "CLIENT") return [];
  return member.businesses.filter((business) => business.hasAccess && business.status === "ACTIVE" && !business.employeeId);
}

export function roleChangeInput(member: OrganizationMember, role: UpdateMemberRoleInput["role"], businessIds: string[]): UpdateMemberRoleInput {
  return member.role === "ADMIN" && role !== "ADMIN" ? { role, businessIds } : { role };
}
