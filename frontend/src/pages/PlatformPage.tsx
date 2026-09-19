import { Alert, Avatar, Badge, Breadcrumbs, Burger, Button, CloseButton, Divider, Drawer, Group, Menu, Modal, Pagination, Paper, Popover, Select, SimpleGrid, Skeleton, Stack, Table, Text, TextInput, ThemeIcon, Title } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { BriefcaseBusinessIcon, LayoutGridIcon, type BriefcaseBusinessIconHandle, type LayoutGridIconHandle } from "lucide-animated";
import { ArrowLeft, Building2, CalendarDays, ChevronRight, CircleAlert, CircleCheck, ClipboardList, CreditCard, LogOut, PanelLeftClose, PanelLeftOpen, RefreshCw, Search, SlidersHorizontal, UserRound, Users } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router";
import headerLogo from "../assets/IMAGOTIPO-COLOR.svg";
import { useAuth } from "../auth/useAuth";
import { ApiError } from "../lib/api-client";
import { staffAuth, type StaffProfile } from "../lib/staff-auth";
import { superadminApi, type OrganizationSubscription, type PlatformAuditLog, type SuperadminBusiness, type SuperadminOrganization, type SuperadminOrganizationsResponse, type SuperadminPaginatedResponse, type SuperadminDashboard, type SuperadminPlan } from "../lib/superadmin-api";
import { PlatformCreateAction } from "../components/PlatformCreateAction";
import { PlatformTeamAccess } from "../components/PlatformTeamAccess";
import "./PlatformPage.css";

type NavigationItem = {
  icon: ReactNode;
  label: string;
  path: string;
};

function getErrorMessage(error: unknown) {
  if (error instanceof ApiError && error.status === 403) return "No tienes permiso para consultar estas métricas.";
  return "No se han podido cargar las métricas de la plataforma.";
}

function DashboardMetrics({ dashboard }: { dashboard: SuperadminDashboard }) {
  const metrics = [
    { icon: <Building2 size={20} />, label: "Organizaciones activas", value: dashboard.organizations.active, detail: `${dashboard.organizations.suspended} suspendidas`, tone: "violet" },
    { icon: <CreditCard size={20} />, label: "Suscripciones activas", value: dashboard.subscriptions.active, detail: `${dashboard.subscriptions.trial} en prueba`, tone: "blue" },
    { icon: <BriefcaseBusinessIcon size={20} />, label: "Empresas", value: dashboard.businesses, detail: "Ubicaciones registradas", tone: "teal" },
    { icon: <Users size={20} />, label: "Empleados", value: dashboard.employees, detail: "Empleados registrados", tone: "violet" },
    { icon: <Users size={20} />, label: "Clientes", value: dashboard.customers, detail: "Cuentas activas", tone: "blue" },
    { icon: <CalendarDays size={20} />, label: "Citas", value: dashboard.appointments, detail: "Citas registradas", tone: "teal" },
  ];

  return <SimpleGrid cols={{ base: 1, sm: 2, xl: 3 }} spacing="md">{metrics.map((metric) => <Paper className="platform-metric" key={metric.label} p="lg" radius="lg" withBorder><Group justify="space-between" wrap="nowrap"><ThemeIcon color={metric.tone} radius="md" size="lg" variant="light">{metric.icon}</ThemeIcon><Text c="dimmed" size="sm">{metric.label}</Text></Group><Text className="platform-metric__value" mt="lg">{metric.value.toLocaleString("es-ES")}</Text><Text c="dimmed" size="xs">{metric.detail}</Text></Paper>)}</SimpleGrid>;
}

function DashboardPage() {
  const [dashboard, setDashboard] = useState<SuperadminDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadDashboard() {
    setLoading(true);
    setError(null);
    try {
      setDashboard(await superadminApi.dashboard());
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    void superadminApi.dashboard()
      .then((response) => {
        if (active) setDashboard(response);
      })
      .catch((requestError: unknown) => {
        if (active) setError(getErrorMessage(requestError));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  return <Stack gap="xl"><div><Title order={1}>Dashboard</Title><Text c="dimmed" mt={4}>Una vista general del estado de la plataforma.</Text></div>{loading && <SimpleGrid cols={{ base: 1, sm: 2, xl: 3 }} spacing="md">{Array.from({ length: 6 }, (_, index) => <Skeleton height={164} key={index} radius="lg" />)}</SimpleGrid>}{error && <Alert color="red" icon={<CircleAlert size={18} />} title="No se pudo cargar el dashboard"><Group justify="space-between"><Text size="sm">{error}</Text><Button leftSection={<RefreshCw size={15} />} onClick={() => void loadDashboard()} size="compact-sm" variant="light">Reintentar</Button></Group></Alert>}{dashboard && !loading && <DashboardMetrics dashboard={dashboard} />}</Stack>;
}

const organizationsPerPage = 25;

function organizationStatus(status: SuperadminOrganization["status"]) {
  return status === "ACTIVE" ? { color: "teal", label: "Activa" } : { color: "red", label: "Suspendida" };
}

function subscriptionStatus(status: NonNullable<SuperadminOrganization["subscription"]>["status"]) {
  return { ACTIVE: "Activa", EXPIRED: "Caducada", SUSPENDED: "Suspendida", TRIAL: "Prueba" }[status];
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-ES", { dateStyle: "medium" }).format(new Date(value));
}

function OrganizationsPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<SuperadminOrganizationsResponse | null>(null);
  const [plans, setPlans] = useState<SuperadminPlan[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [filtersOpened, { close: closeFilters, toggle: toggleFilters }] = useDisclosure(false);
  const [page, setPage] = useState(1);
  const [planCode, setPlanCode] = useState<string | null>(null);
  const [draftPlanCode, setDraftPlanCode] = useState<string | null>(null);
  const [requestVersion, setRequestVersion] = useState(0);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [draftStatus, setDraftStatus] = useState<string | null>(null);

  const totalPages = Math.max(1, Math.ceil((data?.pagination.total ?? 0) / organizationsPerPage));
  const firstItem = data?.pagination.total ? (page - 1) * organizationsPerPage + 1 : 0;
  const lastItem = data?.pagination.total ? Math.min(page * organizationsPerPage, data.pagination.total) : 0;

  useEffect(() => {
    let active = true;
    void superadminApi.listOrganizations({ limit: organizationsPerPage, offset: (page - 1) * organizationsPerPage, planCode: planCode ?? undefined, search: search.trim() || undefined, status: status as "ACTIVE" | "SUSPENDED" | undefined })
      .then((response) => {
        if (active) {
          setData(response);
          setError(null);
        }
      })
      .catch(() => {
        if (active) setError("No se han podido cargar las organizaciones.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [page, planCode, requestVersion, search, status]);

  useEffect(() => {
    let active = true;
    void superadminApi.listPlans().then((response) => {
      if (active) setPlans(response);
    }).catch(() => undefined);
    return () => { active = false; };
  }, []);

  function resetFilters() {
    setPage(1);
    setPlanCode(null);
    setDraftPlanCode(null);
    setSearch("");
    setStatus(null);
    setDraftStatus(null);
  }

  function openFilters() {
    if (!filtersOpened) {
      setDraftPlanCode(planCode);
      setDraftStatus(status);
    }
    toggleFilters();
  }

  function applyFilters() {
    setPage(1);
    setPlanCode(draftPlanCode);
    setStatus(draftStatus);
    closeFilters();
  }

  const hasFilters = Boolean(search || status || planCode);

  return <Stack gap="xl"><Group justify="space-between"><div><Title order={1}>Organizaciones</Title><Text c="dimmed" mt={4}>Consulta los tenants registrados y el estado de sus suscripciones.</Text></div><PlatformCreateAction kind="organization" onCreated={(id) => navigate(`/platform/organizations/${id}`)} /></Group><Paper className="platform-organizations" p="lg" radius="lg" withBorder><Stack gap="md"><Group className="platform-organizations__filters" justify="space-between"><TextInput className="platform-organizations__search" leftSection={<Search size={16} />} onChange={(event) => { setPage(1); setSearch(event.currentTarget.value); }} placeholder="Escribe aquí" rightSection={search ? <CloseButton aria-label="Limpiar búsqueda" onClick={() => { setPage(1); setSearch(""); }} size="sm" /> : undefined} value={search} /><Popover opened={filtersOpened} position="bottom-end" shadow="md" width={280}><Popover.Target><Button leftSection={<SlidersHorizontal size={16} />} onClick={openFilters} variant={hasFilters ? "light" : "default"}>Filtros</Button></Popover.Target><Popover.Dropdown><Stack gap="md"><Text fw={700} size="sm">Filtrar organizaciones</Text><Select clearable data={[{ label: "Activas", value: "ACTIVE" }, { label: "Suspendidas", value: "SUSPENDED" }]} label="Estado" onChange={setDraftStatus} placeholder="Todos" value={draftStatus} /><Select clearable data={plans.map((plan) => ({ label: plan.name, value: plan.code }))} label="Plan" onChange={setDraftPlanCode} placeholder="Todos" value={draftPlanCode} /><Group justify="space-between"><Button onClick={() => { resetFilters(); closeFilters(); }} size="compact-sm" variant="subtle">Restablecer</Button><Button onClick={applyFilters} size="compact-sm">Aplicar</Button></Group></Stack></Popover.Dropdown></Popover></Group>{error && <Alert color="red" icon={<CircleAlert size={18} />} title="No se pudo cargar la lista"><Group justify="space-between"><Text size="sm">{error}</Text><Button leftSection={<RefreshCw size={15} />} onClick={() => setRequestVersion((version) => version + 1)} size="compact-sm" variant="light">Reintentar</Button></Group></Alert>}{loading ? <Stack gap="xs">{Array.from({ length: 5 }, (_, index) => <Skeleton height={54} key={index} radius="sm" />)}</Stack> : data && <>{data.items.length === 0 ? <Stack align="center" gap="xs" py="xl"><ThemeIcon color="gray" radius="xl" size={48} variant="light"><Building2 size={24} /></ThemeIcon><Text fw={600}>No encontramos organizaciones</Text><Text c="dimmed" size="sm">Prueba con otros criterios de búsqueda.</Text></Stack> : <Table.ScrollContainer minWidth={780}><Table highlightOnHover striped verticalSpacing="sm"><Table.Thead><Table.Tr><Table.Th>Organización</Table.Th><Table.Th>Plan</Table.Th><Table.Th>Actividad</Table.Th><Table.Th>Estado</Table.Th><Table.Th>Creada</Table.Th><Table.Th /></Table.Tr></Table.Thead><Table.Tbody>{data.items.map((organization) => { const currentStatus = organizationStatus(organization.status); const openOrganization = () => navigate(`/platform/organizations/${organization.id}`); return <Table.Tr className="platform-organization-row" key={organization.id} onClick={openOrganization} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); openOrganization(); } }} role="link" tabIndex={0}><Table.Td><Text fw={700} size="sm">{organization.name}</Text><Text c="dimmed" size="xs">{organization.slug} · {organization.email}</Text></Table.Td><Table.Td>{organization.subscription ? <><Text fw={600} size="sm">{organization.subscription.planCode.toUpperCase()}</Text><Text c="dimmed" size="xs">{subscriptionStatus(organization.subscription.status)}</Text></> : <Text c="dimmed" size="sm">Sin plan</Text>}</Table.Td><Table.Td><Text size="sm">{organization.businesses} empresas</Text><Text c="dimmed" size="xs">{organization.employees} empleados</Text></Table.Td><Table.Td><Badge color={currentStatus.color} variant="light">{currentStatus.label}</Badge></Table.Td><Table.Td><Text size="sm">{formatDate(organization.createdAt)}</Text></Table.Td><Table.Td className="platform-organization-row__chevron"><ChevronRight aria-hidden="true" size={18} /></Table.Td></Table.Tr>; })}</Table.Tbody></Table></Table.ScrollContainer>}<Group className="platform-organizations__pagination" justify="space-between"><Text c="dimmed" size="sm">Mostrando {firstItem}–{lastItem} de {data.pagination.total} organizaciones</Text><Pagination onChange={setPage} size="sm" total={totalPages} value={Math.min(page, totalPages)} /></Group></>}</Stack></Paper></Stack>;
}

function OrganizationDetailPage({ onBack, onOpenBusinesses, organizationId }: { onBack: () => void; onOpenBusinesses: () => void; organizationId: string }) {
  const [organization, setOrganization] = useState<SuperadminOrganization | null>(null);
  const [plans, setPlans] = useState<SuperadminPlan[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingStatus, setSavingStatus] = useState(false);
  const [savingSubscription, setSavingSubscription] = useState(false);
  const [selectedPlanCode, setSelectedPlanCode] = useState<string | null>(null);
  const [selectedSubscriptionStatus, setSelectedSubscriptionStatus] = useState<"TRIAL" | "ACTIVE" | "SUSPENDED">("ACTIVE");
  const [subscriptions, setSubscriptions] = useState<OrganizationSubscription[]>([]);
  const [trialEndsAt, setTrialEndsAt] = useState("");
  const [expiresAt, setExpiresAt] = useState("");

  useEffect(() => {
    let active = true;
    void Promise.all([superadminApi.getOrganization(organizationId), superadminApi.listPlans(), superadminApi.listOrganizationSubscriptions(organizationId)])
      .then(([response, availablePlans, subscriptionHistory]) => {
        if (!active) return;
        setOrganization(response);
        setPlans(availablePlans);
        setSelectedPlanCode(response.subscription?.planCode ?? null);
        setSelectedSubscriptionStatus(response.subscription?.status === "TRIAL" || response.subscription?.status === "SUSPENDED" ? response.subscription.status : "ACTIVE");
        setSubscriptions(subscriptionHistory);
        setTrialEndsAt(subscriptionHistory[0]?.trialEndsAt?.slice(0, 10) ?? "");
        setExpiresAt(subscriptionHistory[0]?.expiresAt?.slice(0, 10) ?? "");
      })
      .catch((requestError: unknown) => {
        if (active) setError(requestError instanceof ApiError ? requestError.message : "No se ha podido cargar la organización.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [organizationId]);

  async function updateStatus() {
    if (!organization) return;
    const nextStatus = organization.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    setSavingStatus(true);
    setError(null);
    try {
      setOrganization(await superadminApi.updateOrganizationStatus(organization.id, nextStatus));
      setNotice(nextStatus === "ACTIVE" ? "La organización se ha activado." : "La organización se ha suspendido.");
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : "No se ha podido actualizar el estado.");
    } finally {
      setSavingStatus(false);
    }
  }

  async function saveSubscription() {
    if (!organization || !selectedPlanCode) return;
    setSavingSubscription(true);
    setError(null);
    try {
      await superadminApi.setOrganizationSubscription(organization.id, { planCode: selectedPlanCode, status: selectedSubscriptionStatus, trialEndsAt: selectedSubscriptionStatus === "TRIAL" && trialEndsAt ? new Date(`${trialEndsAt}T00:00:00.000Z`).toISOString() : undefined, expiresAt: expiresAt ? new Date(`${expiresAt}T00:00:00.000Z`).toISOString() : undefined });
      const [updatedOrganization, subscriptionHistory] = await Promise.all([superadminApi.getOrganization(organization.id), superadminApi.listOrganizationSubscriptions(organization.id)]);
      setOrganization(updatedOrganization);
      setSubscriptions(subscriptionHistory);
      setSelectedPlanCode(updatedOrganization.subscription?.planCode ?? null);
      setSelectedSubscriptionStatus(updatedOrganization.subscription?.status === "TRIAL" || updatedOrganization.subscription?.status === "SUSPENDED" ? updatedOrganization.subscription.status : "ACTIVE");
      setNotice("La suscripción se ha actualizado.");
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : "No se ha podido actualizar la suscripción.");
    } finally {
      setSavingSubscription(false);
    }
  }

  if (loading) return <Stack gap="md">{Array.from({ length: 3 }, (_, index) => <Skeleton height={index === 0 ? 76 : 240} key={index} radius="lg" />)}</Stack>;
  if (!organization) return <Stack gap="md"><Button leftSection={<ArrowLeft size={16} />} onClick={onBack} variant="subtle">Volver a organizaciones</Button><Alert color="red" icon={<CircleAlert size={18} />} title="No se pudo cargar la organización">{error ?? "La organización no está disponible."}</Alert></Stack>;

  const currentStatus = organizationStatus(organization.status);
  const planOptions = plans.map((plan) => ({ disabled: !plan.isActive, label: plan.isActive ? plan.name : `${plan.name} (inactivo)`, value: plan.code }));

  return <Stack gap="xl"><div><Button leftSection={<ArrowLeft size={16} />} onClick={onBack} size="compact-sm" variant="subtle">Volver a organizaciones</Button><Group justify="space-between" mt="sm"><div><Title order={1}>{organization.name}</Title><Text c="dimmed" mt={4}>{organization.slug} · {organization.email}</Text></div><Badge color={currentStatus.color} size="lg" variant="light">{currentStatus.label}</Badge></Group></div>{notice && <Alert color="green" icon={<CircleCheck size={18} />} onClose={() => setNotice(null)} title="Cambios guardados" withCloseButton>{notice}</Alert>}{error && <Alert color="red" icon={<CircleAlert size={18} />} onClose={() => setError(null)} title="No se pudo guardar" withCloseButton>{error}</Alert>}<SimpleGrid cols={{ base: 1, lg: 2 }} spacing="md"><Paper p="lg" radius="lg" withBorder><Stack gap="md"><div><Text fw={700}>Información</Text><Text c="dimmed" size="sm">Datos generales de la organización.</Text></div><Divider /><div><Text c="dimmed" size="xs">Correo electrónico</Text><Text>{organization.email}</Text></div><div><Text c="dimmed" size="xs">Creada</Text><Text>{formatDate(organization.createdAt)}</Text></div><Group grow><div><Text c="dimmed" size="xs">Empresas</Text><Text fw={700}>{organization.businesses}</Text></div><div><Text c="dimmed" size="xs">Empleados</Text><Text fw={700}>{organization.employees}</Text></div></Group><Button onClick={onOpenBusinesses} rightSection={<ChevronRight size={16} />} variant="light">Ver empresas</Button></Stack></Paper><Paper p="lg" radius="lg" withBorder><Stack gap="md"><div><Text fw={700}>Suscripción actual</Text><Text c="dimmed" size="sm">Ampliar una prueba del mismo plan conserva su inicio e historial. Cambiar de plan o estado caduca la suscripción anterior.</Text></div><Select data={planOptions} label="Plan" onChange={setSelectedPlanCode} placeholder="Selecciona un plan" value={selectedPlanCode} withAsterisk /><Select data={[{ label: "En prueba", value: "TRIAL" }, { label: "Activa", value: "ACTIVE" }, { label: "Suspendida", value: "SUSPENDED" }]} label="Estado de suscripción" onChange={(value) => setSelectedSubscriptionStatus(value as "TRIAL" | "ACTIVE" | "SUSPENDED")} value={selectedSubscriptionStatus} withAsterisk /><TextInput disabled={selectedSubscriptionStatus !== "TRIAL"} label="Fin de prueba" onChange={(event) => setTrialEndsAt(event.currentTarget.value)} type="date" value={trialEndsAt} /><TextInput label="Vencimiento" onChange={(event) => setExpiresAt(event.currentTarget.value)} type="date" value={expiresAt} /><Group justify="flex-end"><Button disabled={!selectedPlanCode} loading={savingSubscription} onClick={() => void saveSubscription()}>Guardar suscripción</Button></Group></Stack></Paper><Paper p="lg" radius="lg" withBorder><Stack gap="sm"><Text fw={700}>Historial de suscripciones</Text>{subscriptions.length ? subscriptions.map((subscription) => <Group justify="space-between" key={subscription.id}><div><Text size="sm" fw={600}>{subscription.planCode.toUpperCase()} · {subscriptionStatus(subscription.status)}</Text><Text c="dimmed" size="xs">Inicio: {formatDate(subscription.startsAt)}{subscription.trialEndsAt ? ` · Prueba: ${formatDate(subscription.trialEndsAt)}` : ""}{subscription.expiresAt ? ` · Vence: ${formatDate(subscription.expiresAt)}` : ""}</Text></div><Badge variant="light">{subscriptionStatus(subscription.status)}</Badge></Group>) : <Text c="dimmed" size="sm">No hay suscripciones asignadas.</Text>}</Stack></Paper><Paper p="lg" radius="lg" withBorder><Stack gap="md"><div><Text fw={700}>Estado de la organización</Text><Text c="dimmed" size="sm">Suspenderla bloquea su operativa hasta que se active de nuevo.</Text></div><Group justify="space-between"><Badge color={currentStatus.color} variant="light">{currentStatus.label}</Badge><Button color={organization.status === "ACTIVE" ? "red" : "teal"} loading={savingStatus} onClick={() => void updateStatus()} variant="light">{organization.status === "ACTIVE" ? "Suspender organización" : "Activar organización"}</Button></Group></Stack></Paper></SimpleGrid></Stack>;
}

function PlatformBreadcrumbs({ items }: { items: Array<{ label: string; onClick?: () => void }> }) {
  return <Breadcrumbs separator="›">{items.map((item, index) => item.onClick ? <Button key={`${item.label}-${index}`} onClick={item.onClick} size="compact-xs" variant="subtle">{item.label}</Button> : <Text key={`${item.label}-${index}`} size="sm">{item.label}</Text>)}</Breadcrumbs>;
}

function OrganizationBusinessesPage({ onBack, onOpenBusiness, organizationId }: { onBack: () => void; onOpenBusiness: (businessId: string) => void; organizationId: string }) {
  const [organization, setOrganization] = useState<SuperadminOrganization | null>(null);
  const [data, setData] = useState<SuperadminPaginatedResponse<SuperadminBusiness> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [requestVersion, setRequestVersion] = useState(0);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void Promise.all([superadminApi.getOrganization(organizationId), superadminApi.listOrganizationBusinesses(organizationId, { limit: organizationsPerPage, offset: (page - 1) * organizationsPerPage, search: search.trim() || undefined, status: status as "ACTIVE" | "SUSPENDED" | undefined })])
      .then(([organizationResponse, businessesResponse]) => {
        if (!active) return;
        setOrganization(organizationResponse);
        setData(businessesResponse);
        setError(null);
      })
      .catch((requestError: unknown) => {
        if (active) setError(requestError instanceof ApiError ? requestError.message : "No se han podido cargar las empresas.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [organizationId, page, requestVersion, search, status]);

  const totalPages = Math.max(1, Math.ceil((data?.pagination.total ?? 0) / organizationsPerPage));
  const firstItem = data?.pagination.total ? (page - 1) * organizationsPerPage + 1 : 0;
  const lastItem = data?.pagination.total ? Math.min(page * organizationsPerPage, data.pagination.total) : 0;

  if (loading) return <Stack gap="md">{Array.from({ length: 4 }, (_, index) => <Skeleton height={index === 0 ? 44 : 58} key={index} radius="lg" />)}</Stack>;
  if (!organization || !data) return <Stack gap="md"><Button leftSection={<ArrowLeft size={16} />} onClick={onBack} variant="subtle">Volver a la organización</Button><Alert color="red" icon={<CircleAlert size={18} />} title="No se pudieron cargar las empresas">{error ?? "La organización no está disponible."}</Alert></Stack>;

  return <Stack gap="xl"><PlatformBreadcrumbs items={[{ label: "Organizaciones", onClick: onBack }, { label: organization.name, onClick: onBack }, { label: "Empresas" }]} /><Group justify="space-between"><div><Title order={1}>Empresas</Title><Text c="dimmed" mt={4}>Empresas registradas en {organization.name}.</Text></div><PlatformCreateAction kind="business" organizationId={organizationId} contextName={organization.name} onCreated={onOpenBusiness} /></Group><Paper className="platform-organizations" p="lg" radius="lg" withBorder><Stack gap="md"><Group className="platform-organizations__filters" justify="space-between"><TextInput className="platform-organizations__search" leftSection={<Search size={16} />} onChange={(event) => { setPage(1); setSearch(event.currentTarget.value); }} placeholder="Escribe aquí" rightSection={search ? <CloseButton aria-label="Limpiar búsqueda" onClick={() => { setPage(1); setSearch(""); }} size="sm" /> : undefined} value={search} /><Select clearable data={[{ label: "Activos", value: "ACTIVE" }, { label: "Suspendidos", value: "SUSPENDED" }]} onChange={(value) => { setPage(1); setStatus(value); }} placeholder="Filtrar estado" value={status} w={170} /></Group>{error && <Alert color="red" icon={<CircleAlert size={18} />} title="No se pudo cargar la lista"><Group justify="space-between"><Text size="sm">{error}</Text><Button leftSection={<RefreshCw size={15} />} onClick={() => setRequestVersion((version) => version + 1)} size="compact-sm" variant="light">Reintentar</Button></Group></Alert>}{data.items.length === 0 ? <Stack align="center" gap="xs" py="xl"><ThemeIcon color="gray" radius="xl" size={48} variant="light"><Building2 size={24} /></ThemeIcon><Text fw={600}>No encontramos empresas</Text><Text c="dimmed" size="sm">Prueba con otra búsqueda o estado.</Text></Stack> : <Table.ScrollContainer minWidth={720}><Table highlightOnHover striped verticalSpacing="sm"><Table.Thead><Table.Tr><Table.Th>Empresa</Table.Th><Table.Th>Zona horaria</Table.Th><Table.Th>Empleados</Table.Th><Table.Th>Estado</Table.Th><Table.Th /></Table.Tr></Table.Thead><Table.Tbody>{data.items.map((business) => { const currentStatus = organizationStatus(business.status); const openBusiness = () => onOpenBusiness(business.id); return <Table.Tr className="platform-organization-row" key={business.id} onClick={openBusiness} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); openBusiness(); } }} role="link" tabIndex={0}><Table.Td><Text fw={700} size="sm">{business.name}</Text><Text c="dimmed" size="xs">{business.slug}{business.email ? ` · ${business.email}` : ""}</Text></Table.Td><Table.Td><Text size="sm">{business.timezone}</Text></Table.Td><Table.Td><Text size="sm">{business.employeeCount}</Text></Table.Td><Table.Td><Badge color={currentStatus.color} variant="light">{currentStatus.label}</Badge></Table.Td><Table.Td className="platform-organization-row__chevron"><ChevronRight aria-hidden="true" size={18} /></Table.Td></Table.Tr>; })}</Table.Tbody></Table></Table.ScrollContainer>}<Group className="platform-organizations__pagination" justify="space-between"><Text c="dimmed" size="sm">Mostrando {firstItem}–{lastItem} de {data.pagination.total} empresas</Text><Pagination onChange={setPage} size="sm" total={totalPages} value={Math.min(page, totalPages)} /></Group></Stack></Paper></Stack>;
}

function BusinessDetailPage({ businessId, onBack, onBackToOrganizations, organizationId }: { businessId: string; onBack: () => void; onBackToOrganizations: () => void; organizationId: string }) {
  const [business, setBusiness] = useState<SuperadminBusiness | null>(null);
  const [organization, setOrganization] = useState<SuperadminOrganization | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [requestVersion, setRequestVersion] = useState(0);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [businessForm, setBusinessForm] = useState({ name: "", slug: "", email: "", phone: "", timezone: "UTC", logoUrl: "", status: "ACTIVE" as "ACTIVE" | "SUSPENDED" });

  useEffect(() => {
    let active = true;
    void Promise.all([superadminApi.getOrganization(organizationId), superadminApi.getOrganizationBusiness(organizationId, businessId)])
      .then(([organizationResponse, businessResponse]) => {
        if (!active) return;
        setOrganization(organizationResponse);
        setBusiness(businessResponse);
        setBusinessForm({ name: businessResponse.name, slug: businessResponse.slug, email: businessResponse.email ?? "", phone: businessResponse.phone ?? "", timezone: businessResponse.timezone, logoUrl: businessResponse.logoUrl ?? "", status: businessResponse.status });
        setError(null);
      })
      .catch((requestError: unknown) => {
        if (active) setError(requestError instanceof ApiError ? requestError.message : "No se ha podido cargar la empresa.");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [businessId, organizationId, requestVersion]);

  if (loading) return <Skeleton height={240} radius="lg" />;
  if (!organization || !business) return <Stack gap="md"><Button leftSection={<ArrowLeft size={16} />} onClick={onBack} variant="subtle">Volver a empresas</Button><Alert color="red" title="No se pudo cargar la empresa">{error ?? "La empresa no está disponible."}</Alert></Stack>;

  const currentStatus = organizationStatus(business.status);
  async function saveBusiness(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true); setError(null);
    try {
      const updated = await superadminApi.updateOrganizationBusiness(organizationId, businessId, {
        name: businessForm.name.trim(), slug: businessForm.slug.trim().toLowerCase(),
        email: businessForm.email.trim() || undefined, phone: businessForm.phone.trim() || undefined,
        timezone: businessForm.timezone.trim(), logoUrl: businessForm.logoUrl.trim() || null, status: businessForm.status,
      });
      setBusiness(updated); setEditing(false);
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : "No se pudo guardar la empresa.");
    } finally { setSaving(false); }
  }
  return <Stack gap="xl">
    <PlatformBreadcrumbs items={[{ label: "Organizaciones", onClick: onBackToOrganizations }, { label: organization.name, onClick: onBackToOrganizations }, { label: "Empresas", onClick: onBack }, { label: business.name }]} />
    <Group justify="space-between"><div><Title order={1}>{business.name}</Title><Text c="dimmed" mt={4}>{business.slug} · {business.timezone}</Text></div><Group><Badge color={currentStatus.color} size="lg" variant="light">{currentStatus.label}</Badge><Button onClick={() => setEditing(true)} variant="light">Editar empresa</Button></Group></Group>
    {error && <Alert color="red">{error}<Button variant="subtle" onClick={() => setRequestVersion((v) => v + 1)}>Actualizar empresa</Button></Alert>}
    <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
      <Paper p="lg" radius="lg" withBorder><Text c="dimmed" size="xs">Correo electrónico</Text><Text mt={4}>{business.email ?? "No configurado"}</Text></Paper>
      <Paper p="lg" radius="lg" withBorder><Text c="dimmed" size="xs">Teléfono</Text><Text mt={4}>{business.phone ?? "No configurado"}</Text></Paper>
      <Paper p="lg" radius="lg" withBorder><Text c="dimmed" size="xs">Empleados activos</Text><Text fw={700} mt={4}>{business.employeeCount}</Text></Paper>
    </SimpleGrid>
    <PlatformTeamAccess key={organizationId + businessId} organizationId={organizationId} organizationName={organization.name} organizationActive={organization.status === "ACTIVE"} business={business} onChanged={() => setRequestVersion((v) => v + 1)} />
    <Modal centered opened={editing} onClose={() => { if (!saving) setEditing(false); }} title="Editar empresa" closeOnClickOutside={!saving} closeOnEscape={!saving} withCloseButton={!saving}>
      <form onSubmit={(event) => void saveBusiness(event)}><Stack gap="md">
        <TextInput label="Nombre" required maxLength={150} value={businessForm.name} onChange={(event) => setBusinessForm((current) => ({ ...current, name: event.currentTarget.value }))} />
        <TextInput label="Slug" required maxLength={80} value={businessForm.slug} onChange={(event) => setBusinessForm((current) => ({ ...current, slug: event.currentTarget.value.toLowerCase() }))} />
        <TextInput label="Correo de contacto" maxLength={320} type="email" value={businessForm.email} onChange={(event) => setBusinessForm((current) => ({ ...current, email: event.currentTarget.value }))} />
        <TextInput label="Teléfono" maxLength={32} value={businessForm.phone} onChange={(event) => setBusinessForm((current) => ({ ...current, phone: event.currentTarget.value }))} />
        <TextInput label="Zona horaria IANA" required maxLength={64} value={businessForm.timezone} onChange={(event) => setBusinessForm((current) => ({ ...current, timezone: event.currentTarget.value }))} />
        <TextInput label="URL del logo" maxLength={2048} type="url" value={businessForm.logoUrl} onChange={(event) => setBusinessForm((current) => ({ ...current, logoUrl: event.currentTarget.value }))} />
        <Select label="Estado" allowDeselect={false} data={[{ value: "ACTIVE", label: "Activa" }, { value: "SUSPENDED", label: "Suspendida" }]} value={businessForm.status} onChange={(value) => { if (value) setBusinessForm((current) => ({ ...current, status: value as "ACTIVE" | "SUSPENDED" })); }} />
        {businessForm.status === "SUSPENDED" && <Alert color="yellow">Suspender la empresa la retira de la operativa hasta que se reactive.</Alert>}
        <Group justify="flex-end"><Button disabled={saving} onClick={() => setEditing(false)} type="button" variant="default">Cancelar</Button><Button loading={saving} type="submit">Guardar empresa</Button></Group>
      </Stack></form>
    </Modal>
  </Stack>;
}

function PendingPage({ title, description }: { title: string; description: string }) {
  return <Stack gap="sm"><Title order={1}>{title}</Title><Text c="dimmed">{description}</Text><Paper className="platform-pending" mt="md" p="xl" radius="lg" withBorder><Text fw={700}>Siguiente bloque</Text><Text c="dimmed" mt={4} size="sm">Esta sección usará el diseño y controles que ya definimos antes de conectar sus operaciones.</Text></Paper></Stack>;
}

function PlatformAuditPage() {
  const [data, setData] = useState<SuperadminPaginatedResponse<PlatformAuditLog> | null>(null);
  const [organizations, setOrganizations] = useState<SuperadminOrganization[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [action, setAction] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const limit = 25;

  useEffect(() => {
    let active = true;
    void Promise.all([
      superadminApi.listAuditLogs({ organizationId: organizationId ?? undefined, action: action.trim() || undefined, from: from ? new Date(`${from}T00:00:00.000Z`).toISOString() : undefined, to: to ? new Date(`${to}T23:59:59.999Z`).toISOString() : undefined, limit, offset: (page - 1) * limit }),
      superadminApi.listOrganizations({ limit: 100, offset: 0 }),
    ]).then(([audit, organizationResponse]) => {
      if (!active) return;
      setData(audit); setOrganizations(organizationResponse.items); setError(null);
    }).catch((requestError: unknown) => {
      if (active) setError(requestError instanceof ApiError ? requestError.message : "No se pudo cargar la auditoría de plataforma.");
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [action, from, organizationId, page, to]);

  const totalPages = Math.max(1, Math.ceil((data?.pagination.total ?? 0) / limit));
  return <Stack gap="xl"><div><Title order={1}>Auditoría de plataforma</Title><Text c="dimmed" mt={4}>Consulta las operaciones administrativas y los eventos de seguridad registrados.</Text></div><Paper p="lg" radius="lg" withBorder><Stack gap="md"><Group align="flex-end"><Select clearable data={organizations.map((organization) => ({ value: organization.id, label: organization.name }))} label="Organización" onChange={(value) => { setOrganizationId(value); setPage(1); }} placeholder="Todas" searchable value={organizationId} w={240} /><TextInput label="Acción" onChange={(event) => { setAction(event.currentTarget.value); setPage(1); }} placeholder="Ej. BUSINESS_UPDATED" value={action} /><TextInput label="Desde" onChange={(event) => { setFrom(event.currentTarget.value); setPage(1); }} type="date" value={from} /><TextInput label="Hasta" onChange={(event) => { setTo(event.currentTarget.value); setPage(1); }} type="date" value={to} /></Group>{error && <Alert color="red" title="No se pudo cargar la auditoría">{error}</Alert>}{loading ? <Skeleton height={220} /> : data && <><Table.ScrollContainer minWidth={820}><Table striped highlightOnHover><Table.Thead><Table.Tr><Table.Th>Fecha</Table.Th><Table.Th>Acción</Table.Th><Table.Th>Actor</Table.Th><Table.Th>Entidad</Table.Th><Table.Th>Cambios</Table.Th></Table.Tr></Table.Thead><Table.Tbody>{data.items.map((entry) => <Table.Tr key={entry.id}><Table.Td><Text size="sm">{new Intl.DateTimeFormat("es-ES", { dateStyle: "short", timeStyle: "short" }).format(new Date(entry.createdAt))}</Text></Table.Td><Table.Td><Badge variant="light">{entry.action}</Badge></Table.Td><Table.Td><Text size="sm">{entry.actorEmail ?? "Sistema"}</Text></Table.Td><Table.Td><Text size="sm">{entry.entityType}{entry.entityId ? ` · ${entry.entityId.slice(0, 8)}` : ""}</Text></Table.Td><Table.Td><Text lineClamp={2} size="xs" c="dimmed">{JSON.stringify(entry.newValues ?? entry.oldValues ?? {})}</Text></Table.Td></Table.Tr>)}</Table.Tbody></Table></Table.ScrollContainer>{!data.items.length && <Text c="dimmed" ta="center" py="lg">No hay eventos que coincidan con los filtros.</Text>}<Group justify="flex-end"><Pagination onChange={setPage} total={totalPages} value={Math.min(page, totalPages)} /></Group></>}</Stack></Paper></Stack>;
}

export function PlatformPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { clearSession } = useAuth();
  const [drawerOpened, { close: closeDrawer, toggle: toggleDrawer }] = useDisclosure(false);
  const [profileOpened, { close: closeProfile, open: openProfile }] = useDisclosure(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profile, setProfile] = useState<StaffProfile | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileNotice, setProfileNotice] = useState<string | null>(null);
  const [profileForm, setProfileForm] = useState({ firstName: "", lastName: "", phone: "" });
  const [emailChangeStep, setEmailChangeStep] = useState<"profile" | "request" | "confirm">("profile");
  const [emailChangeForm, setEmailChangeForm] = useState({ newEmail: "", token: "" });
  const [isChangingEmail, setIsChangingEmail] = useState(false);
  const dashboardIconRef = useRef<LayoutGridIconHandle>(null);
  const organizationsIconRef = useRef<BriefcaseBusinessIconHandle>(null);
  const navigationItems: NavigationItem[] = [
    { icon: <LayoutGridIcon animateOnHover={false} ref={dashboardIconRef} size={18} />, label: "Dashboard", path: "/platform" },
    { icon: <BriefcaseBusinessIcon animateOnHover={false} ref={organizationsIconRef} size={18} />, label: "Organizaciones", path: "/platform/organizations" },
    { icon: <ClipboardList size={18} />, label: "Auditoría", path: "/platform/audit" },
  ];
  const activePath = location.pathname === "/platform" ? "/platform" : location.pathname;
  const fullName = [profile?.firstName, profile?.lastName].filter(Boolean).join(" ");

  function syncProfileForm(nextProfile: StaffProfile) {
    setProfileForm({
      firstName: nextProfile.firstName ?? "",
      lastName: nextProfile.lastName ?? "",
      phone: nextProfile.phone ?? "",
    });
  }

  useEffect(() => {
    let active = true;
    void staffAuth.me().then((response) => {
      if (!active) return;
      setProfile(response);
    }).catch(() => undefined);
    return () => { active = false; };
  }, []);

  async function logout() {
    setIsLoggingOut(true);
    try {
      await staffAuth.logout();
    } finally {
      clearSession();
      navigate("/platform/access", { replace: true });
    }
  }

  function openProfileModal() {
    if (profile) syncProfileForm(profile);
    setProfileError(null);
    setProfileNotice(null);
    setEmailChangeStep("profile");
    setEmailChangeForm({ newEmail: "", token: "" });
    openProfile();
  }

  function navigateTo(path: string) {
    navigate(path);
    closeDrawer();
  }

  function animateNavigationIcon(path: string) {
    if (path === "/platform") dashboardIconRef.current?.startAnimation();
    if (path === "/platform/organizations") organizationsIconRef.current?.startAnimation();
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const firstName = profileForm.firstName.trim();
    const lastName = profileForm.lastName.trim();
    const phone = profileForm.phone.trim();

    if (!firstName || !lastName) {
      setProfileError("Indica tu nombre y tus apellidos.");
      return;
    }

    setIsSavingProfile(true);
    setProfileError(null);
    setProfileNotice(null);

    try {
      const updatedProfile = await staffAuth.updateMyProfile({
        firstName,
        lastName,
        phone: phone || undefined,
      });
      setProfile(updatedProfile);
      syncProfileForm(updatedProfile);
      setProfileNotice("Tus datos se han actualizado.");
    } catch (requestError) {
      setProfileError(requestError instanceof ApiError ? requestError.message : "No se han podido guardar los cambios.");
    } finally {
      setIsSavingProfile(false);
    }
  }

  async function requestEmailChange(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const newEmail = emailChangeForm.newEmail.trim().toLowerCase();
    if (!newEmail) { setProfileError("Indica el nuevo correo electrónico."); return; }
    setIsChangingEmail(true); setProfileError(null); setProfileNotice(null);
    try {
      await staffAuth.requestEmailChange(newEmail);
      setEmailChangeForm((current) => ({ ...current, newEmail, token: "" }));
      setEmailChangeStep("confirm");
      setProfileNotice("Hemos enviado un código de seis dígitos al nuevo correo.");
    } catch (requestError) {
      setProfileError(requestError instanceof ApiError ? requestError.message : "No se pudo solicitar el cambio de correo.");
    } finally { setIsChangingEmail(false); }
  }

  async function confirmEmailChange(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = emailChangeForm.token.trim();
    if (!/^\d{6}$/.test(token)) { setProfileError("Introduce el código de seis dígitos."); return; }
    setIsChangingEmail(true); setProfileError(null);
    try {
      await staffAuth.confirmEmailChange(token);
      clearSession();
      closeProfile();
      navigate("/", { replace: true });
    } catch (requestError) {
      setProfileError(requestError instanceof ApiError ? requestError.message : "No se pudo confirmar el cambio de correo.");
    } finally { setIsChangingEmail(false); }
  }

  const navigation = <nav aria-label="Navegación de plataforma" className="platform-nav">{navigationItems.map((item) => <button className={(item.path === "/platform" ? activePath === item.path : activePath === item.path || activePath.startsWith(`${item.path}/`)) ? "platform-nav__link platform-nav__link--active" : "platform-nav__link"} key={item.path} onClick={() => navigateTo(item.path)} onFocus={() => animateNavigationIcon(item.path)} onMouseEnter={() => animateNavigationIcon(item.path)} title={sidebarCollapsed ? item.label : undefined} type="button">{item.icon}<span>{item.label}</span></button>)}</nav>;
  const organizationId = activePath.match(/^\/platform\/organizations\/([^/]+)$/)?.[1];
  const organizationBusinessesId = activePath.match(/^\/platform\/organizations\/([^/]+)\/businesses$/)?.[1];
  const businessRoute = activePath.match(/^\/platform\/organizations\/([^/]+)\/businesses\/([^/]+)$/);
  const content = activePath === "/platform" ? <DashboardPage /> : activePath === "/platform/audit" ? <PlatformAuditPage /> : businessRoute ? <BusinessDetailPage businessId={businessRoute[2]} onBack={() => navigate(`/platform/organizations/${businessRoute[1]}/businesses`)} onBackToOrganizations={() => navigate("/platform/organizations")} organizationId={businessRoute[1]} /> : organizationBusinessesId ? <OrganizationBusinessesPage onBack={() => navigate(`/platform/organizations/${organizationBusinessesId}`)} onOpenBusiness={(businessId) => navigate(`/platform/organizations/${organizationBusinessesId}/businesses/${businessId}`)} organizationId={organizationBusinessesId} /> : organizationId ? <OrganizationDetailPage onBack={() => navigate("/platform/organizations")} onOpenBusinesses={() => navigate(`/platform/organizations/${organizationId}/businesses`)} organizationId={organizationId} /> : activePath === "/platform/organizations" ? <OrganizationsPage /> : <PendingPage description="Define los límites y prestaciones de cada plan." title="Planes" />;

  return (
    <div className={sidebarCollapsed ? "platform-layout platform-layout--collapsed" : "platform-layout"}>
      <aside className="platform-sidebar">
        <Group className="platform-sidebar__top" justify={sidebarCollapsed ? "center" : "flex-end"} wrap="nowrap">
          <button aria-label={sidebarCollapsed ? "Expandir menú" : "Colapsar menú"} className="platform-collapse-control" onClick={() => setSidebarCollapsed((collapsed) => !collapsed)} title={sidebarCollapsed ? "Expandir menú" : undefined} type="button">
            {!sidebarCollapsed && <span>Colapsar menú</span>}
            {sidebarCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>
        </Group>
        {navigation}
        <Text className="platform-version" mt="auto" size="xs">v0.1.0</Text>
      </aside>
      <div className="platform-main">
        <header className="platform-header">
          <Group gap="sm">
            <Burger aria-label="Abrir navegación" className="platform-menu-toggle" onClick={toggleDrawer} opened={drawerOpened} size="sm" />
            <img alt="BUKIOO" className="platform-header-brand" src={headerLogo} />
          </Group>
          <Menu position="bottom-end" shadow="md" width={220} withinPortal>
            <Menu.Target>
              <button aria-label="Abrir menú de cuenta" className="platform-account" type="button">
                <Avatar color="bukioo" radius="xl" size="sm"><UserRound size={16} /></Avatar>
                {fullName && <span>{fullName}</span>}
              </button>
            </Menu.Target>
            <Menu.Dropdown>
              {fullName && <Menu.Label>{fullName}</Menu.Label>}
              <Menu.Item className="platform-account-menu-item" leftSection={<UserRound size={16} />} onClick={openProfileModal}>Mi perfil</Menu.Item>
              <Menu.Divider />
              <Menu.Item className="platform-account-menu-item" color="red" disabled={isLoggingOut} leftSection={<LogOut size={16} />} onClick={() => void logout()}>{isLoggingOut ? "Cerrando sesión…" : "Cerrar sesión"}</Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </header>
        <main className="platform-content">{content}</main>
      </div>
      <Drawer classNames={{ body: "platform-mobile-drawer__body", close: "platform-mobile-drawer__close", content: "platform-mobile-drawer", header: "platform-mobile-drawer__header" }} onClose={closeDrawer} opened={drawerOpened} padding="md" title="BUKIOO" withCloseButton>
        {navigation}
      </Drawer>
      <Modal centered onClose={() => { if (!isChangingEmail) { setEmailChangeStep("profile"); closeProfile(); } }} opened={profileOpened} title={emailChangeStep === "profile" ? "Mi perfil" : "Cambiar correo electrónico"} closeOnClickOutside={!isChangingEmail} closeOnEscape={!isChangingEmail} withCloseButton={!isChangingEmail}>
        {emailChangeStep === "profile" ? <form onSubmit={(event) => void saveProfile(event)}>
          <Stack gap="md">
            <Group wrap="nowrap">
              <Avatar color="bukioo" radius="xl" size="lg"><UserRound size={20} /></Avatar>
              <Text fw={700}>{fullName || "Completa tus datos"}</Text>
            </Group>
            {profileNotice && <Alert color="green" icon={<CircleCheck size={18} />} onClose={() => setProfileNotice(null)} title="Cambios guardados" withCloseButton>{profileNotice}</Alert>}
            {profileError && <Alert color="red" icon={<CircleAlert size={18} />} onClose={() => setProfileError(null)} title="No se pudo guardar" withCloseButton>{profileError}</Alert>}
            <TextInput autoComplete="given-name" label="Nombre" maxLength={100} onChange={(event) => { const firstName = event.currentTarget.value; setProfileForm((current) => ({ ...current, firstName })); }} required value={profileForm.firstName} />
            <TextInput autoComplete="family-name" label="Apellidos" maxLength={150} onChange={(event) => { const lastName = event.currentTarget.value; setProfileForm((current) => ({ ...current, lastName })); }} required value={profileForm.lastName} />
            <TextInput autoComplete="tel" label="Teléfono" maxLength={32} onChange={(event) => { const phone = event.currentTarget.value; setProfileForm((current) => ({ ...current, phone })); }} type="tel" value={profileForm.phone} />
            <TextInput description="Se verificará el nuevo correo antes de cambiar tu cuenta." label="Correo electrónico" readOnly value={profile?.email ?? ""} />
            <Button onClick={() => { setProfileError(null); setProfileNotice(null); setEmailChangeStep("request"); }} type="button" variant="light">Cambiar correo de acceso</Button>
            <Group justify="flex-end" mt="xs">
              <Button onClick={closeProfile} type="button" variant="default">Cancelar</Button>
              <Button loading={isSavingProfile} type="submit">Guardar cambios</Button>
            </Group>
          </Stack>
        </form> : emailChangeStep === "request" ? <form onSubmit={(event) => void requestEmailChange(event)}><Stack gap="md">
          <Text size="sm" c="dimmed">Tu correo actual es {profile?.email ?? ""}. Enviaremos un código de confirmación a la nueva dirección; hasta entonces la cuenta no cambiará.</Text>
          {profileError && <Alert color="red" title="No se pudo continuar">{profileError}</Alert>}
          <TextInput autoComplete="email" label="Nuevo correo electrónico" maxLength={320} onChange={(event) => setEmailChangeForm((current) => ({ ...current, newEmail: event.currentTarget.value }))} required type="email" value={emailChangeForm.newEmail} />
          <Group justify="flex-end"><Button disabled={isChangingEmail} onClick={() => setEmailChangeStep("profile")} type="button" variant="default">Cancelar</Button><Button loading={isChangingEmail} type="submit">Enviar código</Button></Group>
        </Stack></form> : <form onSubmit={(event) => void confirmEmailChange(event)}><Stack gap="md">
          <Text size="sm" c="dimmed">Introduce el código enviado a {emailChangeForm.newEmail}. Al confirmarlo, se cerrará tu sesión y tendrás que acceder con el correo nuevo.</Text>
          {profileNotice && <Alert color="green" title="Código enviado">{profileNotice}</Alert>}
          {profileError && <Alert color="red" title="No se pudo confirmar">{profileError}</Alert>}
          <TextInput autoComplete="one-time-code" inputMode="numeric" label="Código de seis dígitos" maxLength={6} onChange={(event) => setEmailChangeForm((current) => ({ ...current, token: event.currentTarget.value.replace(/\D/g, "") }))} required value={emailChangeForm.token} />
          <Group justify="space-between"><Button disabled={isChangingEmail} onClick={() => setEmailChangeStep("request")} type="button" variant="subtle">Cambiar correo</Button><Group gap="xs"><Button disabled={isChangingEmail} onClick={() => { setIsChangingEmail(true); setProfileError(null); void staffAuth.requestEmailChange(emailChangeForm.newEmail).then(() => setProfileNotice("Hemos enviado un código nuevo.")).catch((error: unknown) => setProfileError(error instanceof ApiError ? error.message : "No se pudo reenviar el código.")).finally(() => setIsChangingEmail(false)); }} type="button" variant="default">Reenviar</Button><Button loading={isChangingEmail} type="submit">Confirmar cambio</Button></Group></Group>
        </Stack></form>}
      </Modal>
    </div>
  );
}
