const staffLoginOrganizationSlugKey = "bukioo.staff-login-organization-slug";
const activeBusinessKeyPrefix = "bukioo.workspace-active-business:";

function getSessionStorage() {
  if (typeof window === "undefined") return null;

  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export function getActiveBusinessId(userId: string) {
  return getSessionStorage()?.getItem(`${activeBusinessKeyPrefix}${userId}`) ?? null;
}

export function getStaffLoginOrganizationSlug() {
  return getSessionStorage()?.getItem(staffLoginOrganizationSlugKey) ?? null;
}

export function saveActiveBusinessId(userId: string, businessId: string) {
  getSessionStorage()?.setItem(`${activeBusinessKeyPrefix}${userId}`, businessId);
}

export function saveStaffLoginOrganizationSlug(organizationSlug: string) {
  getSessionStorage()?.setItem(staffLoginOrganizationSlugKey, organizationSlug);
}

export function clearWorkspaceContext(userId?: string | null) {
  const storage = getSessionStorage();
  storage?.removeItem(staffLoginOrganizationSlugKey);
  if (userId) storage?.removeItem(`${activeBusinessKeyPrefix}${userId}`);
}
