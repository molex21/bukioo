import { Text } from "@mantine/core";
import logo from "../assets/TAGLINE-COLOR.svg";
import type { OrganizationBranding } from "../lib/public-branding";

type LoginBrandProps = {
  branding?: OrganizationBranding | null;
};

export function LoginBrand({ branding }: LoginBrandProps) {
  const logoUrl = branding?.logoUrl ?? logo;
  const hasOrganizationLogo = Boolean(branding?.logoUrl);

  return (
    <div className="login-brand">
      <img alt={branding?.name ?? "BUKIOO"} className={hasOrganizationLogo ? "login-brand__organization-logo" : "login-brand__tagline"} onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = logo; event.currentTarget.className = "login-brand__tagline"; }} src={logoUrl} />
      {branding && <Text fw={800}>{branding.name}</Text>}
    </div>
  );
}
