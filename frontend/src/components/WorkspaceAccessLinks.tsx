import { Button, Group, Paper, SimpleGrid, Stack, Text, TextInput } from "@mantine/core";
import { Copy, ExternalLink } from "lucide-react";
import { useState } from "react";

type AccessLinkProps = {
  description: string;
  label: string;
  url: string;
};

function AccessLink({ description, label, url }: AccessLinkProps) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2_000);
    } catch {
      setCopied(false);
    }
  }

  return <Paper p="lg" radius="lg" withBorder><Stack gap="sm"><div><Text fw={700}>{label}</Text><Text c="dimmed" size="xs">{description}</Text></div><TextInput readOnly value={url} /><Group><Button component="a" href={url} leftSection={<ExternalLink size={15} />} rel="noreferrer" size="compact-sm" target="_blank" variant="light">Abrir</Button><Button leftSection={<Copy size={15} />} onClick={() => void copy()} size="compact-sm" variant="default">{copied ? "Copiado" : "Copiar"}</Button></Group></Stack></Paper>;
}

export function WorkspaceAccessLinks({ businessSlug, organizationSlug }: { businessSlug: string; organizationSlug: string }) {
  const origin = window.location.origin;
  const encodedBusinessSlug = encodeURIComponent(businessSlug);
  const encodedSlug = encodeURIComponent(organizationSlug);

  return <Stack gap="sm"><div><Text fw={700}>Enlaces de acceso</Text><Text c="dimmed" size="sm">Consulta los enlaces de esta empresa sin modificar su configuracion.</Text></div><SimpleGrid cols={{ base: 1, md: 2 }} spacing="md"><AccessLink description="Enlace directo de reservas de esta empresa" label="Reservas de esta empresa" url={`${origin}/book/${encodedSlug}/${encodedBusinessSlug}`} /><AccessLink description="Enlace comun del equipo de la organizacion" label="Acceso del equipo" url={`${origin}/${encodedSlug}/staff/login`} /></SimpleGrid></Stack>;
}
