import { Alert, Avatar, Badge, Button, Group, Modal, Paper, Select, Skeleton, Stack, Table, Text, TextInput, ThemeIcon, Title } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { Building2, CircleAlert, Pencil, Plus, RefreshCw } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { ApiError } from "../lib/api-client";
import { workspaceBusinessesApi, type CreateWorkspaceBusinessInput, type WorkspaceBusiness } from "../lib/workspace-businesses-api";
import { WorkspaceAccessLinks } from "../components/WorkspaceAccessLinks";

type BusinessForm = {
  email: string;
  logoUrl: string;
  name: string;
  phone: string;
  slug: string;
  status: WorkspaceBusiness["status"];
  timezone: string;
};

function emptyForm(timezone: string): BusinessForm {
  return { email: "", logoUrl: "", name: "", phone: "", slug: "", status: "ACTIVE", timezone };
}

function formFromBusiness(business: WorkspaceBusiness): BusinessForm {
  return { email: business.email ?? "", logoUrl: business.logo_url ?? "", name: business.name, phone: business.phone ?? "", slug: business.slug, status: business.status, timezone: business.timezone };
}

function toSlug(value: string) {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function errorMessage(error: unknown) {
  if (error instanceof ApiError) return error.message;
  return "No se ha podido completar la operación.";
}

export function WorkspaceBusinessesPage({ activeBusinessId, defaultTimezone, onBack, onBusinessCreated, organizationId, organizationName, organizationSlug }: { activeBusinessId: string; defaultTimezone: string; onBack: () => void; onBusinessCreated: (businessId: string) => void; organizationId: string; organizationName: string; organizationSlug: string }) {
  const [businesses, setBusinesses] = useState<WorkspaceBusiness[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [requestVersion, setRequestVersion] = useState(0);
  const [createOpened, createModal] = useDisclosure(false);
  const [editOpened, editModal] = useDisclosure(false);
  const [form, setForm] = useState<BusinessForm>(() => emptyForm(defaultTimezone));
  const [editingBusiness, setEditingBusiness] = useState<WorkspaceBusiness | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    void workspaceBusinessesApi.list(organizationId)
      .then((response) => { if (active) { setBusinesses(response); setError(null); } })
      .catch((requestError) => { if (active) setError(errorMessage(requestError)); });
    return () => { active = false; };
  }, [organizationId, requestVersion]);

  function openCreate() {
    setForm(emptyForm(defaultTimezone));
    setEditingBusiness(null);
    setError(null);
    createModal.open();
  }

  function openEdit(business: WorkspaceBusiness) {
    setEditingBusiness(business);
    setForm(formFromBusiness(business));
    setError(null);
    editModal.open();
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (editingBusiness) {
        const updated = await workspaceBusinessesApi.update(editingBusiness.id, {
          email: form.email.trim() || undefined,
          logoUrl: form.logoUrl.trim() || null,
          name: form.name.trim(), phone: form.phone.trim() || undefined,
          slug: form.slug.trim().toLowerCase(), status: form.status, timezone: form.timezone.trim(),
        });
        setBusinesses((current) => current?.map((business) => business.id === updated.id ? updated : business) ?? null);
        editModal.close();
      } else {
        const created = await workspaceBusinessesApi.create({
          organizationId, name: form.name.trim(), slug: form.slug.trim().toLowerCase(),
          email: form.email.trim() || undefined, phone: form.phone.trim() || undefined,
          timezone: form.timezone.trim() || undefined, logoUrl: form.logoUrl.trim() || undefined,
        } satisfies CreateWorkspaceBusinessInput);
        setBusinesses((current) => current ? [...current, created] : [created]);
        createModal.close();
        onBusinessCreated(created.id);
      }
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setSaving(false);
    }
  }

  const modal = (title: string, opened: boolean, close: () => void) => <Modal centered closeOnClickOutside={!saving} closeOnEscape={!saving} onClose={close} opened={opened} size="xl" title={title}>
    <form onSubmit={(event) => void submit(event)}><Stack gap="md">
      {error && <Alert color="red" icon={<CircleAlert size={18} />}>{error}</Alert>}
      <TextInput label="Nombre" onChange={(event) => { const value = event.currentTarget.value; setForm((current) => ({ ...current, name: value, slug: current.slug || toSlug(value) })); }} required value={form.name} />
      <TextInput description="Minúsculas, números y guiones; será la dirección pública de la empresa. No puede terminar en guion." label="Slug" onChange={(event) => { const value = event.currentTarget.value; setForm((current) => ({ ...current, slug: value })); }} pattern="[a-z0-9]+(?:-[a-z0-9]+)*" required value={form.slug} />
      <TextInput label="Correo de contacto" onChange={(event) => { const value = event.currentTarget.value; setForm((current) => ({ ...current, email: value })); }} type="email" value={form.email} />
      <TextInput label="Teléfono" onChange={(event) => { const value = event.currentTarget.value; setForm((current) => ({ ...current, phone: value })); }} value={form.phone} />
      <TextInput description="Por ejemplo, Atlantic/Canary o Europe/Madrid." label="Zona horaria" onChange={(event) => { const value = event.currentTarget.value; setForm((current) => ({ ...current, timezone: value })); }} required value={form.timezone} />
      <TextInput description="Pega un enlace público directo a una imagen. Déjalo vacío para quitar el logo." label="Logo" onChange={(event) => { const value = event.currentTarget.value; setForm((current) => ({ ...current, logoUrl: value })); }} placeholder="https://ejemplo.com/logo.png" type="url" value={form.logoUrl} />
      {form.logoUrl.trim() && <Group gap="sm"><Avatar radius="sm" size="lg" src={form.logoUrl.trim()}><Building2 size={18} /></Avatar><Text c="dimmed" size="xs">Vista previa del logo.</Text></Group>}
      {editingBusiness && <Select allowDeselect={false} data={[{ label: "Activa", value: "ACTIVE" }, { label: "Suspendida", value: "SUSPENDED" }]} description={form.status === "SUSPENDED" ? "La empresa quedará fuera de la operativa hasta que se reactive." : undefined} label="Estado" onChange={(value) => value && setForm((current) => ({ ...current, status: value as WorkspaceBusiness["status"] }))} value={form.status} />}
      {editingBusiness && <WorkspaceAccessLinks businessSlug={editingBusiness.slug} organizationSlug={organizationSlug} />}
      <Group justify="flex-end"><Button disabled={saving} onClick={close} type="button" variant="default">Cancelar</Button><Button loading={saving} type="submit">{editingBusiness ? "Guardar cambios" : "Crear empresa"}</Button></Group>
    </Stack></form>
  </Modal>;

  return <Stack gap="xl"><Group justify="space-between"><div><Text c="dimmed" fw={700} size="xs" tt="uppercase">Configuración · {organizationName}</Text><Title order={1}>Empresas</Title><Text c="dimmed" mt={4}>Crea y configura las empresas de tu organización.</Text></div><Group><Button onClick={onBack} variant="default">Volver</Button><Button leftSection={<Plus size={16} />} onClick={openCreate}>Nueva empresa</Button></Group></Group>{error && <Alert color="red" icon={<CircleAlert size={18} />} title="No se pudo completar la operación"><Group justify="space-between"><Text size="sm">{error}</Text><Button leftSection={<RefreshCw size={15} />} onClick={() => setRequestVersion((value) => value + 1)} size="compact-sm" variant="light">Reintentar</Button></Group></Alert>}<Paper p="lg" radius="lg" withBorder>{!businesses ? <Stack gap="sm">{Array.from({ length: 3 }, (_, index) => <Skeleton height={60} key={index} />)}</Stack> : businesses.length === 0 ? <Stack align="center" gap="sm" py="xl"><ThemeIcon color="gray" radius="xl" size={48} variant="light"><Building2 size={24} /></ThemeIcon><Text fw={700}>No hay empresas</Text><Text c="dimmed" size="sm">Crea la primera empresa para empezar a configurarla.</Text></Stack> : <Table.ScrollContainer minWidth={720}><Table highlightOnHover striped verticalSpacing="sm"><Table.Thead><Table.Tr><Table.Th>Empresa</Table.Th><Table.Th>Contacto</Table.Th><Table.Th>Zona horaria</Table.Th><Table.Th>Estado</Table.Th><Table.Th>Opciones</Table.Th></Table.Tr></Table.Thead><Table.Tbody>{businesses.map((business) => <Table.Tr key={business.id}><Table.Td><Text fw={700} size="sm">{business.name}{business.id === activeBusinessId ? " · Actual" : ""}</Text><Text c="dimmed" size="xs">{business.slug}</Text></Table.Td><Table.Td><Text size="sm">{business.email ?? business.phone ?? "Sin datos"}</Text></Table.Td><Table.Td><Text size="sm">{business.timezone}</Text></Table.Td><Table.Td><Badge color={business.status === "ACTIVE" ? "teal" : "red"} variant="light">{business.status === "ACTIVE" ? "Activa" : "Suspendida"}</Badge></Table.Td><Table.Td><Button leftSection={<Pencil size={14} />} onClick={() => openEdit(business)} size="xs" variant="default">Gestionar</Button></Table.Td></Table.Tr>)}</Table.Tbody></Table></Table.ScrollContainer>}</Paper>{modal("Nueva empresa", createOpened, createModal.close)}{modal(editingBusiness ? `Gestionar ${editingBusiness.name}` : "Gestionar empresa", editOpened, editModal.close)}</Stack>;
}
