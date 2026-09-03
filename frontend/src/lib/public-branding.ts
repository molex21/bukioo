import { apiRequest } from "./api-client";

export type OrganizationBranding = {
  name: string;
  slug: string;
  logoUrl: string | null;
};

export async function getOrganizationBranding(organizationSlug: string) {
  const response = await apiRequest<{ organization: OrganizationBranding }>(
    `/public/${encodeURIComponent(organizationSlug)}/branding`,
  );

  return response.organization;
}
