import { useEffect, useState } from "react";
import { getOrganizationBranding, type OrganizationBranding } from "../lib/public-branding";

type OrganizationBrandingState = {
  branding: OrganizationBranding | null;
  error: string | null;
  loading: boolean;
};

export function useOrganizationBranding(organizationSlug?: string): OrganizationBrandingState {
  const [state, setState] = useState<{ branding: OrganizationBranding | null; error: string | null; slug: string | undefined }>({ branding: null, error: null, slug: organizationSlug });

  useEffect(() => {
    let active = true;

    if (!organizationSlug) return () => { active = false; };

    void getOrganizationBranding(organizationSlug)
      .then((branding) => { if (active) setState({ branding, error: null, slug: organizationSlug }); })
      .catch(() => { if (active) setState({ branding: null, error: "No hemos podido cargar la organización de este enlace.", slug: organizationSlug }); });

    return () => { active = false; };
  }, [organizationSlug]);

  const isCurrentOrganization = state.slug === organizationSlug;
  return {
    branding: isCurrentOrganization ? state.branding : null,
    error: isCurrentOrganization ? state.error : null,
    loading: Boolean(organizationSlug) && (!isCurrentOrganization || (!state.branding && !state.error)),
  };
}
