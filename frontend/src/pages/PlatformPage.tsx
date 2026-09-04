import { Alert, Avatar, Burger, Button, Divider, Drawer, Group, Menu, Modal, Paper, SimpleGrid, Skeleton, Stack, Text, ThemeIcon, Title } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { BriefcaseBusinessIcon, LayoutGridIcon, SettingsIcon } from "lucide-animated";
import { Building2, CalendarDays, CircleAlert, CreditCard, LogOut, PanelLeftClose, PanelLeftOpen, RefreshCw, UserRound, Users } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router";
import headerLogo from "../assets/IMAGOTIPO-COLOR.svg";
import { useAuth } from "../auth/useAuth";
import { ApiError } from "../lib/api-client";
import { staffAuth, type StaffProfile } from "../lib/staff-auth";
import { superadminApi, type SuperadminDashboard } from "../lib/superadmin-api";
import "./PlatformPage.css";

type NavigationItem = {
  icon: ReactNode;
  label: string;
  path: string;
};

const navigationItems: NavigationItem[] = [
  { icon: <LayoutGridIcon size={18} />, label: "Dashboard", path: "/platform" },
  { icon: <BriefcaseBusinessIcon size={18} />, label: "Organizaciones", path: "/platform/organizations" },
  { icon: <SettingsIcon size={18} />, label: "Planes", path: "/platform/plans" },
];

function getErrorMessage(error: unknown) {
  if (error instanceof ApiError && error.status === 403) return "No tienes permiso para consultar estas métricas.";
  return "No se han podido cargar las métricas de la plataforma.";
}

function DashboardMetrics({ dashboard }: { dashboard: SuperadminDashboard }) {
  const metrics = [
    { icon: <Building2 size={20} />, label: "Organizaciones activas", value: dashboard.organizations.active, detail: `${dashboard.organizations.suspended} suspendidas`, tone: "violet" },
    { icon: <CreditCard size={20} />, label: "Suscripciones activas", value: dashboard.subscriptions.active, detail: `${dashboard.subscriptions.trial} en prueba`, tone: "blue" },
    { icon: <BriefcaseBusinessIcon size={20} />, label: "Negocios", value: dashboard.businesses, detail: "Ubicaciones registradas", tone: "teal" },
    { icon: <Users size={20} />, label: "Empleados", value: dashboard.employees, detail: "Cuentas de equipo", tone: "violet" },
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

function PendingPage({ title, description }: { title: string; description: string }) {
  return <Stack gap="sm"><Title order={1}>{title}</Title><Text c="dimmed">{description}</Text><Paper className="platform-pending" mt="md" p="xl" radius="lg" withBorder><Text fw={700}>Siguiente bloque</Text><Text c="dimmed" mt={4} size="sm">Esta sección usará el diseño y controles que ya definimos antes de conectar sus operaciones.</Text></Paper></Stack>;
}

export function PlatformPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { clearSession } = useAuth();
  const [drawerOpened, { close: closeDrawer, toggle: toggleDrawer }] = useDisclosure(false);
  const [profileOpened, { close: closeProfile, open: openProfile }] = useDisclosure(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [profile, setProfile] = useState<StaffProfile | null>(null);
  const activePath = location.pathname === "/platform" ? "/platform" : location.pathname;
  const fullName = [profile?.firstName, profile?.lastName].filter(Boolean).join(" ");

  useEffect(() => {
    let active = true;
    void staffAuth.me().then((response) => {
      if (active) setProfile(response);
    }).catch(() => undefined);
    return () => { active = false; };
  }, []);

  async function logout() {
    setIsLoggingOut(true);
    try {
      await staffAuth.logout();
    } finally {
      clearSession();
      navigate("/", { replace: true });
    }
  }

  function navigateTo(path: string) {
    navigate(path);
    closeDrawer();
  }

  const navigation = <nav aria-label="Navegación de plataforma" className="platform-nav">{navigationItems.map((item) => <button className={activePath === item.path ? "platform-nav__link platform-nav__link--active" : "platform-nav__link"} key={item.path} onClick={() => navigateTo(item.path)} title={sidebarCollapsed ? item.label : undefined} type="button">{item.icon}<span>{item.label}</span></button>)}</nav>;
  const content = activePath === "/platform" ? <DashboardPage /> : activePath === "/platform/organizations" ? <PendingPage description="Consulta y administra los tenants de BUKIOO." title="Organizaciones" /> : <PendingPage description="Define los límites y prestaciones de cada plan." title="Planes" />;

  return <div className={sidebarCollapsed ? "platform-layout platform-layout--collapsed" : "platform-layout"}><aside className="platform-sidebar"><Group className="platform-sidebar__top" justify={sidebarCollapsed ? "center" : "flex-end"} wrap="nowrap"><button aria-label={sidebarCollapsed ? "Expandir menú" : "Colapsar menú"} className="platform-collapse-control" onClick={() => setSidebarCollapsed((collapsed) => !collapsed)} title={sidebarCollapsed ? "Expandir menú" : undefined} type="button">{!sidebarCollapsed && <span>Colapsar menú</span>}{sidebarCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}</button></Group>{navigation}<Text className="platform-version" mt="auto" size="xs">v0.1.0</Text></aside><div className="platform-main"><header className="platform-header"><Group gap="sm"><Burger aria-label="Abrir navegación" className="platform-menu-toggle" onClick={toggleDrawer} opened={drawerOpened} size="sm" /><img alt="BUKIOO" className="platform-header-brand" src={headerLogo} /></Group><Menu position="bottom-end" shadow="md" width={220} withinPortal><Menu.Target><button aria-label="Abrir menú de cuenta" className="platform-account" type="button"><Avatar color="bukioo" radius="xl" size="sm"><UserRound size={16} /></Avatar>{fullName && <span>{fullName}</span>}</button></Menu.Target><Menu.Dropdown>{fullName && <Menu.Label>{fullName}</Menu.Label>}<Menu.Item className="platform-account-menu-item" leftSection={<UserRound size={16} />} onClick={openProfile}>Ver mis datos</Menu.Item><Menu.Divider /><Menu.Item className="platform-account-menu-item" color="red" disabled={isLoggingOut} leftSection={<LogOut size={16} />} onClick={() => void logout()}>{isLoggingOut ? "Cerrando sesión…" : "Cerrar sesión"}</Menu.Item></Menu.Dropdown></Menu></header><main className="platform-content">{content}</main></div><Drawer classNames={{ body: "platform-mobile-drawer__body", close: "platform-mobile-drawer__close", content: "platform-mobile-drawer", header: "platform-mobile-drawer__header" }} onClose={closeDrawer} opened={drawerOpened} padding="md" title="BUKIOO" withCloseButton>{navigation}</Drawer><Modal centered onClose={closeProfile} opened={profileOpened} title="Mis datos"><Stack gap="md"><Group wrap="nowrap"><Avatar color="bukioo" radius="xl" size="lg"><UserRound size={20} /></Avatar><div><Text fw={700}>{fullName || "Sin nombre configurado"}</Text><Text c="dimmed" size="sm">Superadmin</Text></div></Group><Divider /><div><Text c="dimmed" size="xs">Correo electrónico</Text><Text>{profile?.email ?? "No disponible"}</Text></div><div><Text c="dimmed" size="xs">Identificador</Text><Text size="sm">{profile?.id ?? "No disponible"}</Text></div></Stack></Modal></div>;
}
