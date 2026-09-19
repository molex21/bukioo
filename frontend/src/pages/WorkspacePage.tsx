import { Alert, Avatar, Button, Drawer, Group, Menu, Paper, Skeleton, Stack, Text, ThemeIcon, Title } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { LayoutGridIcon } from "lucide-animated";
import { Building2, CalendarDays, ChevronDown, CircleAlert, ClipboardList, LogOut, PanelLeftClose, PanelLeftOpen, RefreshCw, Settings, Store, UserRound, Users } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router";
import fallbackBusinessLogo from "../assets/ISOTIPO-COLOR.svg";
import { useAuth } from "../auth/useAuth";
import { staffAuth, type StaffBusiness, type StaffOrganization, type StaffProfile } from "../lib/staff-auth";
import "./WorkspacePage.css";

type WorkspaceSection = "agenda" | "appointments" | "customers" | "dashboard" | "settings" | "team";

type BusinessContext = {
  business: StaffBusiness;
  organization: StaffOrganization;
};

type NavigationItem = {
  icon: ReactNode;
  label: string;
  path: WorkspaceSection;
};

const navigationItems: NavigationItem[] = [
  { icon: <LayoutGridIcon animateOnHover size={18} />, label: "Resumen", path: "dashboard" },
  { icon: <CalendarDays size={18} />, label: "Agenda", path: "agenda" },
  { icon: <ClipboardList size={18} />, label: "Citas", path: "appointments" },
  { icon: <Users size={18} />, label: "Clientes", path: "customers" },
  { icon: <Building2 size={18} />, label: "Equipo", path: "team" },
  { icon: <Settings size={18} />, label: "Configuración", path: "settings" },
];

const sectionContent: Record<WorkspaceSection, { description: string; title: string }> = {
  agenda: { description: "Consulta la disponibilidad de tu equipo y organiza las citas de la empresa.", title: "Agenda" },
  appointments: { description: "Revisa, confirma y gestiona las reservas de la empresa seleccionada.", title: "Citas" },
  customers: { description: "Consulta las fichas y el historial de los clientes de esta empresa.", title: "Clientes" },
  dashboard: { description: "Una vista general de la actividad de la empresa seleccionada.", title: "Resumen" },
  settings: { description: "Configura servicios, horarios, avisos y las preferencias de la empresa.", title: "Configuración" },
  team: { description: "Gestiona el equipo, sus servicios asignados y sus horarios de trabajo.", title: "Equipo" },
};

function roleLabel(role: StaffOrganization["role"]) {
  return { ADMIN: "Administración", CLIENT: "Cliente", EMPLOYEE: "Empleado", MANAGER: "Responsable", OWNER: "Propietario" }[role];
}

function businessLogo(context: BusinessContext) {
  return context.business.logoUrl ?? context.organization.logoUrl ?? fallbackBusinessLogo;
}

function WorkspaceEmptyState({ onLogout }: { onLogout: () => void }) {
  return <main className="workspace-empty"><Paper p="xl" radius="lg" withBorder><Stack align="center" gap="md"><ThemeIcon color="gray" radius="xl" size={52} variant="light"><Store size={24} /></ThemeIcon><div><Title order={1} ta="center">No tienes empresas disponibles</Title><Text c="dimmed" mt={6} ta="center">Tu cuenta no tiene acceso a ninguna empresa activa. Contacta con un administrador.</Text></div><Button color="red" onClick={onLogout} variant="light">Cerrar sesión</Button></Stack></Paper></main>;
}

function WorkspaceLoading() {
  return <main className="workspace-empty"><Stack w="min(100%, 560px)"><Skeleton height={36} radius="md" /><Skeleton height={260} radius="lg" /></Stack></main>;
}

export function WorkspacePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { clearSession } = useAuth();
  const [drawerOpened, { close: closeDrawer, toggle: toggleDrawer }] = useDisclosure(false);
  const [collapsed, setCollapsed] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<StaffProfile | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [requestVersion, setRequestVersion] = useState(0);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null);

  const businessContexts = useMemo<BusinessContext[]>(() => profile?.organizations.flatMap((organization) => organization.businesses.map((business) => ({ business, organization }))) ?? [], [profile]);
  const selectedBusiness = businessContexts.find((context) => context.business.id === selectedBusinessId) ?? businessContexts[0] ?? null;
  const requestedSection = location.pathname.split("/")[2] as WorkspaceSection | undefined;
  const activeSection = requestedSection && requestedSection in sectionContent ? requestedSection : "dashboard";
  const fullName = [profile?.firstName, profile?.lastName].filter(Boolean).join(" ");

  useEffect(() => {
    let active = true;

    void staffAuth.me()
      .then((response) => {
        if (!active) return;
        setProfile(response);
        setProfileError(null);
        const availableBusinesses = response.organizations.flatMap((organization) => organization.businesses);
        setSelectedBusinessId((current) => availableBusinesses.some((business) => business.id === current) ? current : availableBusinesses[0]?.id ?? null);
      })
      .catch(() => {
        if (active) setProfileError("No se ha podido cargar tu espacio de trabajo.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [requestVersion]);

  async function logout() {
    setIsLoggingOut(true);
    try {
      await staffAuth.logout();
    } finally {
      clearSession();
      navigate("/", { replace: true });
    }
  }

  function navigateTo(section: WorkspaceSection) {
    navigate(section === "dashboard" ? "/app" : `/app/${section}`);
    closeDrawer();
  }

  function selectBusiness(businessId: string) {
    setSelectedBusinessId(businessId);
    closeDrawer();
  }

  function reloadWorkspace() {
    setLoading(true);
    setProfileError(null);
    setRequestVersion((version) => version + 1);
  }

  if (loading) return <WorkspaceLoading />;
  if (profileError) return <main className="workspace-empty"><Paper p="xl" radius="lg" withBorder><Stack gap="md"><Alert color="red" icon={<CircleAlert size={18} />} title="No se pudo abrir el espacio de trabajo">{profileError}</Alert><Group justify="flex-end"><Button color="gray" loading={isLoggingOut} onClick={() => void logout()} variant="default">Cerrar sesión</Button><Button leftSection={<RefreshCw size={16} />} onClick={reloadWorkspace}>Reintentar</Button></Group></Stack></Paper></main>;
  if (!selectedBusiness) return <WorkspaceEmptyState onLogout={() => void logout()} />;

  const currentSection = sectionContent[activeSection];
  const navigation = <nav aria-label="Navegación de la empresa" className="workspace-nav">{navigationItems.map((item) => <button className={activeSection === item.path ? "workspace-nav__link workspace-nav__link--active" : "workspace-nav__link"} key={item.path} onClick={() => navigateTo(item.path)} title={collapsed ? item.label : undefined} type="button">{item.icon}<span>{item.label}</span></button>)}</nav>;

  return <div className={collapsed ? "workspace-layout workspace-layout--collapsed" : "workspace-layout"}><aside className="workspace-sidebar"><Group className="workspace-sidebar__top" justify={collapsed ? "center" : "flex-end"} wrap="nowrap"><button aria-label={collapsed ? "Expandir menú" : "Colapsar menú"} className="workspace-collapse-control" onClick={() => setCollapsed((value) => !value)} title={collapsed ? "Expandir menú" : undefined} type="button">{!collapsed && <span>Colapsar menú</span>}{collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}</button></Group>{navigation}</aside><div className="workspace-main"><header className="workspace-header"><Group gap="sm" wrap="nowrap"><Button aria-label="Abrir navegación" className="workspace-menu-toggle" onClick={toggleDrawer} p={0} variant="subtle"><PanelLeftOpen size={20} /></Button><Menu position="bottom-start" shadow="md" width={280} withinPortal><Menu.Target><button aria-label="Cambiar de empresa" className="workspace-business-switcher" type="button"><Avatar radius="md" size="md" src={businessLogo(selectedBusiness)}><Store size={18} /></Avatar><span><Text fw={700} size="sm">{selectedBusiness.business.name}</Text><Text c="dimmed" size="xs">{selectedBusiness.organization.name} · {roleLabel(selectedBusiness.organization.role)}</Text></span><ChevronDown aria-hidden="true" size={16} /></button></Menu.Target><Menu.Dropdown>{businessContexts.map((context) => <Menu.Item key={context.business.id} leftSection={<Avatar radius="sm" size={24} src={businessLogo(context)}><Store size={13} /></Avatar>} onClick={() => selectBusiness(context.business.id)} rightSection={selectedBusiness.business.id === context.business.id ? <Text c="bukioo" fw={700} size="xs">Actual</Text> : undefined}><Text fw={600} size="sm">{context.business.name}</Text><Text c="dimmed" size="xs">{context.organization.name}</Text></Menu.Item>)}</Menu.Dropdown></Menu></Group><Menu position="bottom-end" shadow="md" width={220} withinPortal><Menu.Target><button aria-label="Abrir menú de cuenta" className="workspace-account" type="button"><Avatar color="bukioo" radius="xl" size="sm"><UserRound size={16} /></Avatar>{fullName && <span>{fullName}</span>}</button></Menu.Target><Menu.Dropdown>{fullName && <Menu.Label>{fullName}</Menu.Label>}<Menu.Item leftSection={<Text c="dimmed" size="xs">{profile?.email ?? "No disponible"}</Text>} disabled>Cuenta</Menu.Item><Menu.Divider /><Menu.Item color="red" disabled={isLoggingOut} leftSection={<LogOut size={16} />} onClick={() => void logout()}>{isLoggingOut ? "Cerrando sesión…" : "Cerrar sesión"}</Menu.Item></Menu.Dropdown></Menu></header><main className="workspace-content"><Stack gap="xl"><div><Text c="dimmed" fw={700} size="xs" tt="uppercase">{selectedBusiness.business.name}</Text><Title order={1}>{currentSection.title}</Title><Text c="dimmed" mt={4}>{currentSection.description}</Text></div><Paper className="workspace-module" p="xl" radius="lg" withBorder><Stack align="center" gap="sm" py="xl"><ThemeIcon color="bukioo" radius="xl" size={52} variant="light">{navigationItems.find((item) => item.path === activeSection)?.icon}</ThemeIcon><Text fw={700}>{currentSection.title} preparada</Text><Text c="dimmed" maw={420} size="sm" ta="center">El siguiente bloque conectará esta sección con los datos reales de {selectedBusiness.business.name}.</Text></Stack></Paper></Stack></main></div><Drawer classNames={{ body: "workspace-mobile-drawer__body", close: "workspace-mobile-drawer__close", content: "workspace-mobile-drawer", header: "workspace-mobile-drawer__header" }} onClose={closeDrawer} opened={drawerOpened} padding="md" title="Administración" withCloseButton>{navigation}</Drawer></div>;
}
