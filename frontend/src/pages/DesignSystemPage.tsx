import {
  ActionIcon,
  Alert,
  Avatar,
  Badge,
  Button,
  Card,
  Checkbox,
  CloseButton,
  Divider,
  Drawer,
  Group,
  Menu,
  Modal,
  MultiSelect,
  Loader,
  Pagination,
  Paper,
  PasswordInput,
  PinInput,
  Select,
  SegmentedControl,
  SimpleGrid,
  Stack,
  Stepper,
  Switch,
  Skeleton,
  Tabs,
  Table,
  Text,
  Textarea,
  TextInput,
  ThemeIcon,
  Title,
  Tooltip,
} from "@mantine/core";
import { DatePickerInput, TimeInput } from "@mantine/dates";
import { useDebouncedValue, useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import {
  BriefcaseBusinessIcon,
  type BriefcaseBusinessIconHandle,
  CalendarDaysIcon,
  type CalendarDaysIconHandle,
  ChartNoAxesColumnIncreasingIcon,
  type ChartNoAxesColumnIncreasingIconHandle,
  LayoutGridIcon,
  type LayoutGridIconHandle,
  SettingsIcon,
  type SettingsIconHandle,
  ShieldCheckIcon,
  type ShieldCheckIconHandle,
  UsersIcon,
  type UsersIconHandle,
} from "lucide-animated";
import { useEffect, useRef, useState } from "react";
import { appointmentStatus, getAppointmentStatusLabel } from "../lib/appointment-status";
import {
  Bell,
  Building2,
  ArrowDown,
  ArrowUpDown,
  ArrowUp,
  CalendarDays,
  CalendarX,
  ChevronsLeft,
  ChevronsRight,
  CheckCircle2,
  CircleAlert,
  Clock3,
  Ellipsis,
  Info,
  Inbox,
  LayoutDashboard,
  LockKeyhole,
  Mail,
  Minus,
  PanelLeftClose,
  PanelLeftOpen,
  Palette,
  Pencil,
  Plus,
  Save,
  Search,
  Settings,
  TriangleAlert,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import "./DesignSystemPage.css";

const appointments = Array.from({ length: 48 }, (_, index) => {
  const customers = ["Lucía Pérez", "Mario Díaz", "Clara Suárez", "Andrea Martín", "Sergio López", "Elena Torres"];
  const services = ["Corte y peinado", "Coloración", "Manicura", "Tratamiento facial"];
  const statuses = ["CONFIRMED", "PENDING", "COMPLETED"] as const;

  return {
    customer: customers[index % customers.length],
    id: index + 1,
    service: services[index % services.length],
    status: statuses[index % statuses.length],
    time: `${String(9 + Math.floor((index % 18) / 2)).padStart(2, "0")}:${index % 2 === 0 ? "00" : "30"}`,
  };
});

const agendaAppointments = [
  { customer: "Lucía Pérez", duration: "60 min", employee: "Ana Díaz", id: "confirmed", service: "Corte y peinado", start: "09:00", status: "CONFIRMED" },
  { customer: "Mario Díaz", duration: "45 min", employee: "Ana Díaz", id: "pending", service: "Coloración", start: "10:30", status: "PENDING" },
  { customer: "Clara Suárez", duration: "30 min", employee: "Ana Díaz", id: "completed", service: "Manicura", start: "12:00", status: "COMPLETED" },
  { customer: "Andrea Martín", duration: "60 min", employee: "Ana Díaz", id: "cancelled", service: "Tratamiento facial", start: "15:00", status: "CANCELLED" },
  { customer: "Sergio López", duration: "30 min", employee: "Ana Díaz", id: "no-show", service: "Corte", start: "17:00", status: "NO_SHOW" },
] as const;

const reportSeries = [
  { label: "L", value: 420 }, { label: "M", value: 610 }, { label: "X", value: 490 }, { label: "J", value: 780 }, { label: "V", value: 690 }, { label: "S", value: 840 }, { label: "D", value: 560 },
];

const servicePerformance = [
  { name: "Corte y peinado", percentage: 42, value: "1.260 €" },
  { name: "Coloración", percentage: 31, value: "930 €" },
  { name: "Manicura", percentage: 17, value: "510 €" },
  { name: "Tratamiento facial", percentage: 10, value: "300 €" },
];

const fallbackTimezones = ["UTC", "Atlantic/Canary", "Europe/Madrid", "Europe/London", "America/New_York", "America/Mexico_City", "America/Sao_Paulo", "Asia/Tokyo", "Australia/Sydney", "Pacific/Auckland"];
const ianaTimezones = typeof Intl.supportedValuesOf === "function"
  ? [...new Set(["UTC", ...Intl.supportedValuesOf("timeZone")])].sort((first, second) => first.localeCompare(second))
  : fallbackTimezones;

type WorkingDay = { enabled: boolean; name: string; ranges: { end: string; start: string }[] };

const initialWorkingDays: WorkingDay[] = [
  { enabled: true, name: "Lunes", ranges: [{ end: "18:00", start: "09:00" }] },
  { enabled: true, name: "Martes", ranges: [{ end: "18:00", start: "09:00" }] },
  { enabled: true, name: "Miércoles", ranges: [{ end: "18:00", start: "09:00" }] },
  { enabled: true, name: "Jueves", ranges: [{ end: "18:00", start: "09:00" }] },
  { enabled: true, name: "Viernes", ranges: [{ end: "15:00", start: "09:00" }] },
  { enabled: false, name: "Sábado", ranges: [] },
  { enabled: false, name: "Domingo", ranges: [] },
];

export function DesignSystemPage() {
  const [continueModalOpened, { close: closeContinueModal, open: openContinueModal }] = useDisclosure(false);
  const [cancelModalOpened, { close: closeCancelModal, open: openCancelModal }] = useDisclosure(false);
  const [detailDrawerOpened, { close: closeDetailDrawer, open: openDetailDrawer }] = useDisclosure(false);
  const [discardModalOpened, { close: closeDiscardModal, open: openDiscardModal }] = useDisclosure(false);
  const [activeTab, setActiveTab] = useState("general");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authStep, setAuthStep] = useState<"idle" | "invalid" | "locked" | "two-factor">("idle");
  const [authVerificationCode, setAuthVerificationCode] = useState("");
  const [adminAccessAction, setAdminAccessAction] = useState<"idle" | "password" | "two-factor">("idle");
  const [bookingConflict, setBookingConflict] = useState(false);
  const [bookingEmployee, setBookingEmployee] = useState("Ana Díaz");
  const [bookingOutcome, setBookingOutcome] = useState<"idle" | "conflict" | "success">("idle");
  const [bookingService, setBookingService] = useState("Corte y peinado");
  const [bookingSlot, setBookingSlot] = useState("10:00");
  const [bookingStep, setBookingStep] = useState(0);
  const [detailEntity, setDetailEntity] = useState<"appointment" | "customer">("appointment");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [selectedNavigation, setSelectedNavigation] = useState("Agenda");
  const [selectedAgendaId, setSelectedAgendaId] = useState("confirmed");
  const [appointmentDate, setAppointmentDate] = useState<string | null>("2026-09-08");
  const [appointmentTime, setAppointmentTime] = useState("10:00");
  const [businessName, setBusinessName] = useState("");
  const [businessTimezone, setBusinessTimezone] = useState("Atlantic/Canary");
  const [formDirty, setFormDirty] = useState(false);
  const [formSaveState, setFormSaveState] = useState<"idle" | "saved">("idle");
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>(["Ana Díaz"]);
  const [workingDays, setWorkingDays] = useState(initialWorkingDays);
  const [displayedTab, setDisplayedTab] = useState("general");
  const [tabContentPhase, setTabContentPhase] = useState<"in" | "out">("in");
  const [tabDirection, setTabDirection] = useState<"backward" | "forward">("forward");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [reportRange, setReportRange] = useState<[string | null, string | null]>(["2026-09-01", "2026-09-30"]);
  const [reportPeriod, setReportPeriod] = useState("week");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [sortField, setSortField] = useState<"customer" | "service" | "status" | "time">("customer");
  const [debouncedSearch] = useDebouncedValue(search, 300);
  const homeIconRef = useRef<LayoutGridIconHandle>(null);
  const agendaIconRef = useRef<CalendarDaysIconHandle>(null);
  const customersIconRef = useRef<UsersIconHandle>(null);
  const servicesIconRef = useRef<BriefcaseBusinessIconHandle>(null);
  const reportsIconRef = useRef<ChartNoAxesColumnIncreasingIconHandle>(null);
  const businessIconRef = useRef<BriefcaseBusinessIconHandle>(null);
  const settingsIconRef = useRef<SettingsIconHandle>(null);
  const superadminIconRef = useRef<ShieldCheckIconHandle>(null);
  const tabTimer = useRef<number | undefined>(undefined);
  const tabOrder = ["general", "agenda", "avisos"];
  const tabContent: Record<string, string> = {
    general: "Ajustes generales de la empresa: nombre, contacto y zona horaria.",
    agenda: "Reglas de disponibilidad, confirmación y reprogramación.",
    avisos: "Preferencias de recordatorios y notificaciones.",
  };
  const filteredAppointments = appointments.filter((appointment) => {
    const matchesSearch = [appointment.customer, appointment.service, getAppointmentStatusLabel(appointment.status), appointment.time]
      .some((value) => value.toLocaleLowerCase().includes(debouncedSearch.trim().toLocaleLowerCase()));
    return matchesSearch;
  });
  const sortedAppointments = [...filteredAppointments].sort((first, second) => {
    const comparison = first[sortField].localeCompare(second[sortField], "es");
    return sortDirection === "asc" ? comparison : -comparison;
  });
  const totalPages = Math.max(1, Math.ceil(sortedAppointments.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const firstItem = sortedAppointments.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const lastItem = Math.min(currentPage * pageSize, sortedAppointments.length);
  const visibleAppointments = sortedAppointments.slice(firstItem - 1, lastItem);

  useEffect(() => () => {
    window.clearTimeout(tabTimer.current);
  }, []);

  function handleNavigationChange(nextNavigation: string) {
    const iconAnimations: Record<string, () => void> = {
      Agenda: () => agendaIconRef.current?.startAnimation(),
      Clientes: () => customersIconRef.current?.startAnimation(),
      Configuración: () => settingsIconRef.current?.startAnimation(),
      Informes: () => reportsIconRef.current?.startAnimation(),
      Inicio: () => homeIconRef.current?.startAnimation(),
      Empresa: () => businessIconRef.current?.startAnimation(),
      Servicios: () => servicesIconRef.current?.startAnimation(),
      Superadmin: () => superadminIconRef.current?.startAnimation(),
    };

    iconAnimations[nextNavigation]?.();
    setSelectedNavigation(nextNavigation);
  }

  function openDetail(entity: "appointment" | "customer") {
    setDetailEntity(entity);
    openDetailDrawer();
  }

  function updateWorkingDay(dayIndex: number, updater: (day: WorkingDay) => WorkingDay) {
    setFormDirty(true);
    setWorkingDays((current) => current.map((day, index) => index === dayIndex ? updater(day) : day));
  }

  function handleTabChange(nextTab: string | null) {
    if (!nextTab || nextTab === activeTab) {
      return;
    }

    window.clearTimeout(tabTimer.current);
    const direction = tabOrder.indexOf(nextTab) > tabOrder.indexOf(activeTab) ? "forward" : "backward";
    setActiveTab(nextTab);
    setTabDirection(direction);
    setTabContentPhase("out");
    tabTimer.current = window.setTimeout(() => {
      setDisplayedTab(nextTab);
      setTabContentPhase("in");
    }, 220);
  }

  function handleSort(field: "customer" | "service" | "status" | "time") {
    if (field === sortField) {
      setSortDirection((current) => current === "asc" ? "desc" : "asc");
      setPage(1);
      return;
    }
    setSortField(field);
    setSortDirection("asc");
    setPage(1);
  }

  function clearTableFilters() {
    setSearch("");
    setSortDirection("asc");
    setSortField("customer");
    setPage(1);
  }

  return (
    <main className="design-system-page">
      <header className="design-system-hero">
        <div>
          <Text c="bukioo.6" fw={700} size="xs" tt="uppercase">
            Laboratorio interno
          </Text>
          <Title order={1}>Componentes BUKIOO</Title>
          <Text c="dimmed" mt="sm">
            Revisa aquí las variantes antes de integrarlas en las pantallas de producto.
          </Text>
        </div>
        <ThemeIcon color="teal" radius="md" size={56} variant="light">
          <Palette aria-hidden="true" size={28} />
        </ThemeIcon>
      </header>

      <section>
        <Text c="bukioo.6" fw={700} size="xs" tt="uppercase">
          Acciones
        </Text>
        <Title order={2}>Botones y etiquetas</Title>
        <Card className="design-card" padding="lg" shadow="xs" withBorder>
          <Group gap="sm">
            <Button leftSection={<CalendarDays size={17} />}>Nueva cita</Button>
            <Button variant="light">Secundario</Button>
            <Button variant="default">Outline</Button>
            <Button variant="subtle">Ghost</Button>
            <Button color="red">Eliminar</Button>
            <Button loading>Guardando</Button>
          </Group>
          <Group className="design-divider" gap="sm">
            <Badge color="green" variant="light">Confirmada</Badge>
            <Badge color="yellow" variant="light">Pendiente</Badge>
            <Badge color="blue" variant="light">Nueva</Badge>
            <Badge color="red" variant="light">Cancelada</Badge>
            <Badge color="gray" variant="light">Sin asignar</Badge>
          </Group>
        </Card>
      </section>

      <section>
        <Text c="bukioo.6" fw={700} size="xs" tt="uppercase">
          Detalle lateral
        </Text>
        <Title order={2}>Consultar sin salir del contexto</Title>
        <Card className="design-card" padding="lg" shadow="xs" withBorder>
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
            <Stack gap="xs">
              <Badge color="green" variant="light" w="fit-content">Confirmada</Badge>
              <Text fw={700}>Cita de Lucía Pérez</Text>
              <Text c="dimmed" size="sm">Martes, 8 de septiembre · 09:00 · Corte y peinado</Text>
              <Button mt="sm" onClick={() => openDetail("appointment")} variant="light">Abrir detalle de cita</Button>
            </Stack>
            <Stack gap="xs">
              <Avatar color="bukioo" name="Lucía Pérez" radius="xl" size="lg" />
              <Text fw={700}>Lucía Pérez</Text>
              <Text c="dimmed" size="sm">Cliente desde septiembre de 2026 · 320 puntos</Text>
              <Button mt="sm" onClick={() => openDetail("customer")} variant="light">Abrir ficha de cliente</Button>
            </Stack>
          </SimpleGrid>
        </Card>
      </section>

      <section>
        <Text c="bukioo.6" fw={700} size="xs" tt="uppercase">
          Navegación
        </Text>
        <Title order={2}>Marco de la aplicación</Title>
        <Paper className={`navigation-preview ${isSidebarCollapsed ? "navigation-preview--collapsed" : ""}`} radius="lg" shadow="md" withBorder>
          <aside className="navigation-preview__sidebar">
            <Group className="navigation-preview__brand" justify={isSidebarCollapsed ? "center" : "space-between"} wrap="nowrap">
              <ThemeIcon color="bukioo" radius="md" size="lg">B</ThemeIcon>
              {!isSidebarCollapsed && <Text fw={800}>BUKIOO</Text>}
              <ActionIcon aria-label={isSidebarCollapsed ? "Ampliar menú" : "Contraer menú"} onClick={() => setIsSidebarCollapsed((current) => !current)} size="sm" variant="subtle">
                {isSidebarCollapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
              </ActionIcon>
            </Group>
            <nav aria-label="Navegación principal">
              {[
                ["Inicio", <LayoutGridIcon animateOnHover={false} ref={homeIconRef} size={18} />],
                ["Agenda", <CalendarDaysIcon animateOnHover={false} ref={agendaIconRef} size={18} />],
                ["Clientes", <UsersIcon animateOnHover={false} ref={customersIconRef} size={18} />],
                ["Servicios", <BriefcaseBusinessIcon animateOnHover={false} ref={servicesIconRef} size={18} />],
                ["Informes", <ChartNoAxesColumnIncreasingIcon animateOnHover={false} ref={reportsIconRef} size={18} />],
              ].map(([label, icon]) => <button aria-current={selectedNavigation === label ? "page" : undefined} className={selectedNavigation === label ? "navigation-preview__link--active" : ""} key={String(label)} onClick={() => handleNavigationChange(String(label))} title={isSidebarCollapsed ? String(label) : undefined} type="button">{icon}{!isSidebarCollapsed && <span>{label}</span>}</button>)}
            </nav>
            <div className="navigation-preview__bottom">
              {!isSidebarCollapsed && <Text c="dimmed" fw={700} size="xs" tt="uppercase">Administración</Text>}
              <button className={selectedNavigation === "Empresa" ? "navigation-preview__link--active" : ""} onClick={() => handleNavigationChange("Empresa")} title={isSidebarCollapsed ? "Empresa" : undefined} type="button"><BriefcaseBusinessIcon animateOnHover={false} ref={businessIconRef} size={18} />{!isSidebarCollapsed && <span>Empresa</span>}</button>
              <button className={selectedNavigation === "Configuración" ? "navigation-preview__link--active" : ""} onClick={() => handleNavigationChange("Configuración")} title={isSidebarCollapsed ? "Configuración" : undefined} type="button"><SettingsIcon animateOnHover={false} ref={settingsIconRef} size={18} />{!isSidebarCollapsed && <span>Configuración</span>}</button>
              <button className="navigation-preview__superadmin" onClick={() => handleNavigationChange("Superadmin")} title={isSidebarCollapsed ? "Superadmin" : undefined} type="button"><ShieldCheckIcon animateOnHover={false} ref={superadminIconRef} size={18} />{!isSidebarCollapsed && <span>Superadmin</span>}</button>
            </div>
          </aside>
          <div className="navigation-preview__main">
            <header>
              <Group gap="xs">
                <Menu shadow="md" width={220} withinPortal>
                  <Menu.Target><Button leftSection={<Building2 size={16} />} rightSection={<ArrowDown size={14} />} size="sm" variant="default">Studio Ana</Button></Menu.Target>
                  <Menu.Dropdown><Menu.Label>Empresas disponibles</Menu.Label><Menu.Item>Studio Ana</Menu.Item><Menu.Item>Studio Norte</Menu.Item></Menu.Dropdown>
                </Menu>
              </Group>
              <Group gap="xs"><Tooltip label="Notificaciones"><ActionIcon aria-label="Notificaciones" size="lg" variant="default"><Bell size={18} /></ActionIcon></Tooltip><Menu shadow="md" width={180} withinPortal><Menu.Target><button aria-label="Abrir menú de perfil" className="navigation-preview__profile" type="button"><Avatar color="bukioo" name="Ana Díaz" radius="xl" size="sm" /><span>AD</span></button></Menu.Target><Menu.Dropdown><Menu.Label>Ana Díaz</Menu.Label><Menu.Item>Mi perfil</Menu.Item><Menu.Item>Cerrar sesión</Menu.Item></Menu.Dropdown></Menu></Group>
            </header>
            <main>
              <Text c="bukioo.6" fw={700} size="xs" tt="uppercase">Vista seleccionada</Text>
              <Title order={3}>{selectedNavigation}</Title>
              <Text c="dimmed" mt="xs" size="sm">La navegación conserva el contexto de empresa y muestra únicamente las opciones que permite el rol.</Text>
              <SimpleGrid cols={{ base: 1, sm: 3 }} mt="xl" spacing="sm"><Card padding="md" withBorder><Text c="dimmed" size="xs">Rol empleado</Text><Text fw={600} size="sm">Agenda y clientes asignados</Text></Card><Card padding="md" withBorder><Text c="dimmed" size="xs">Rol manager</Text><Text fw={600} size="sm">Operación e informes</Text></Card><Card padding="md" withBorder><Text c="dimmed" size="xs">Owner / admin</Text><Text fw={600} size="sm">Configuración y empresa</Text></Card></SimpleGrid>
            </main>
            <nav aria-label="Navegación móvil" className="navigation-preview__mobile-nav">
              {[ ["Inicio", <LayoutGridIcon size={18} />], ["Agenda", <CalendarDaysIcon size={18} />], ["Clientes", <UsersIcon size={18} />], ["Más", <BriefcaseBusinessIcon size={18} />] ].map(([label, icon]) => <button className={selectedNavigation === label ? "navigation-preview__mobile-link--active" : ""} key={String(label)} onClick={() => handleNavigationChange(String(label))} type="button">{icon}<span>{label}</span></button>)}
            </nav>
          </div>
        </Paper>
      </section>

      <section>
        <Text c="bukioo.6" fw={700} size="xs" tt="uppercase">
          Métricas e informes
        </Text>
        <Group align="end" justify="space-between" mt="xs">
          <div><Title order={2}>Datos que ayudan a decidir</Title><Text c="dimmed" mt="xs" size="sm">Los indicadores siempre comparan el periodo seleccionado con el anterior equivalente.</Text></div>
          <SegmentedControl data={[{ label: "Día", value: "day" }, { label: "Semana", value: "week" }, { label: "Mes", value: "month" }]} onChange={setReportPeriod} value={reportPeriod} />
        </Group>
        <SimpleGrid className="report-kpis" cols={{ base: 1, xs: 2, lg: 4 }} spacing="sm">
          {[{ label: "Facturación", trend: "+12,4%", value: "3.000 €" }, { label: "Citas completadas", trend: "+8,1%", value: "48" }, { label: "Ocupación", trend: "+5,6%", value: "76%" }, { label: "Clientes nuevos", trend: "+3", value: "14" }].map((metric) => <Card key={metric.label} padding="md" withBorder><Text c="dimmed" size="xs">{metric.label}</Text><Group align="end" gap="xs" mt="xs"><Title order={3}>{metric.value}</Title><Text c="green.7" fw={700} size="xs">{metric.trend}</Text></Group><Text c="dimmed" mt={4} size="xs">respecto al periodo anterior</Text></Card>)}
        </SimpleGrid>
        <SimpleGrid className="report-grid" cols={{ base: 1, md: 2 }} spacing="lg">
          <Card padding="lg" withBorder>
            <Group justify="space-between"><div><Text fw={700}>Facturación diaria</Text><Text c="dimmed" size="sm">{reportPeriod === "day" ? "Hoy" : reportPeriod === "week" ? "Esta semana" : "Este mes"}</Text></div><Text c="bukioo.6" fw={700} size="sm">3.000 €</Text></Group>
            <div className="report-line-chart"><svg aria-label="Evolución de facturación" role="img" viewBox="0 0 320 150"><defs><linearGradient id="report-line-fill" x1="0" x2="0" y1="0" y2="1"><stop stopColor="#6C5CE7" stopOpacity=".24" /><stop offset="1" stopColor="#6C5CE7" stopOpacity="0" /></linearGradient></defs><path d="M10 132 L10 104 L60 78 L110 98 L160 46 L210 68 L260 22 L310 84 L310 132 Z" fill="url(#report-line-fill)" /><path d="M10 104 L60 78 L110 98 L160 46 L210 68 L260 22 L310 84" fill="none" stroke="#6C5CE7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" /></svg><div className="report-line-chart__labels">{reportSeries.map((point) => <Text c="dimmed" key={point.label} size="xs">{point.label}</Text>)}</div></div>
          </Card>
          <Card padding="lg" withBorder>
            <Text fw={700}>Facturación por servicio</Text><Text c="dimmed" size="sm">Distribución del periodo seleccionado</Text>
            <Stack gap="md" mt="lg">{servicePerformance.map((service) => <div key={service.name}><Group justify="space-between"><Text size="sm">{service.name}</Text><Text fw={700} size="sm">{service.value}</Text></Group><div aria-label={`${service.name}: ${service.percentage}%`} className="report-distribution"><span style={{ width: `${service.percentage}%` }} /></div></div>)}</Stack>
          </Card>
          <Card padding="lg" withBorder>
            <Group justify="space-between"><div><Text fw={700}>Rendimiento de empleados</Text><Text c="dimmed" size="sm">Por facturación completada</Text></div><Button size="compact-sm" variant="subtle">Ver informe</Button></Group>
            <Table mt="md" verticalSpacing="sm"><Table.Tbody>{[["Ana Díaz", "1.420 €", "22 citas"], ["Carlos Vega", "980 €", "16 citas"], ["Marta Ruiz", "600 €", "10 citas"]].map(([employee, revenue, appointmentsCount], index) => <Table.Tr key={employee}><Table.Td><Group gap="xs"><Text c="dimmed" fw={700} size="sm">{index + 1}</Text><Avatar color="bukioo" name={employee} radius="xl" size="sm" /><Text fw={600} size="sm">{employee}</Text></Group></Table.Td><Table.Td><Text fw={700} size="sm">{revenue}</Text><Text c="dimmed" size="xs">{appointmentsCount}</Text></Table.Td></Table.Tr>)}</Table.Tbody></Table>
          </Card>
          <Card className="report-state-card" padding="lg" withBorder><ThemeIcon color="gray" radius="xl" size={48} variant="light"><ChartNoAxesColumnIncreasingIcon size={24} /></ThemeIcon><Text fw={700} mt="sm">Sin datos para este periodo</Text><Text c="dimmed" mt={4} size="sm">Este es el estado que mostraremos si los filtros no devuelven resultados.</Text><Button mt="md" size="xs" variant="light">Cambiar periodo</Button></Card>
        </SimpleGrid>
      </section>

      <section>
        <Text c="bukioo.6" fw={700} size="xs" tt="uppercase">
          Agenda
        </Text>
        <Title order={2}>Citas y estados operativos</Title>
        <Text c="dimmed" mt="xs" size="sm">Horario de la empresa · {businessTimezone}</Text>
        <Card className="design-card" padding="lg" shadow="xs" withBorder>
          <Stack gap="md">
            <div>
              <Text fw={600} size="sm">Tarjetas de cita</Text>
              <Text c="dimmed" size="sm">El estado se identifica por texto, color y borde lateral; nunca solo por color.</Text>
            </div>
            <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="sm">
              {agendaAppointments.map((appointment) => (
                <button
                  aria-pressed={selectedAgendaId === appointment.id}
                  className={`agenda-appointment agenda-appointment--${appointment.status.toLowerCase()} ${selectedAgendaId === appointment.id ? "agenda-appointment--selected" : ""}`}
                  key={appointment.id}
                  onClick={() => setSelectedAgendaId(appointment.id)}
                  type="button"
                >
                  <Group justify="space-between" wrap="nowrap">
                    <Text fw={700} size="sm">{appointment.start}</Text>
                    <Badge color={appointmentStatus[appointment.status].color} size="sm" variant="light">{getAppointmentStatusLabel(appointment.status)}</Badge>
                  </Group>
                  <Text fw={600} mt="sm" size="sm">{appointment.customer}</Text>
                  <Text c="dimmed" size="xs">{appointment.service}</Text>
                  <Group c="dimmed" gap="xs" mt="sm"><Clock3 size={14} /><Text size="xs">{appointment.duration}</Text><UserRound size={14} /><Text size="xs">{appointment.employee}</Text></Group>
                </button>
              ))}
            </SimpleGrid>
          </Stack>
        </Card>
        <Card className="design-card" padding="lg" shadow="xs" withBorder>
          <Group align="flex-start" className="agenda-preview" gap="xl">
            <div className="agenda-preview__timeline">
              <Text fw={700}>Martes, 8 de septiembre</Text>
              <Text c="dimmed" size="sm">Ana Díaz · 09:00–18:00</Text>
              <div className="agenda-preview__slots">
                {agendaAppointments.slice(0, 3).map((appointment) => <div className={`agenda-preview__slot agenda-preview__slot--${appointment.status.toLowerCase()}`} key={appointment.id}><Text c="dimmed" size="xs">{appointment.start}</Text><button onClick={() => setSelectedAgendaId(appointment.id)} type="button"><Text fw={600} size="sm">{appointment.customer}</Text><Text size="xs">{appointment.service} · {appointment.duration}</Text></button></div>)}
              </div>
            </div>
            <Stack className="agenda-preview__detail" gap="sm">
              {(() => {
                const appointment = agendaAppointments.find((item) => item.id === selectedAgendaId) ?? agendaAppointments[0];
                return <><Badge color={appointmentStatus[appointment.status].color} variant="light">{getAppointmentStatusLabel(appointment.status)}</Badge><Title order={3}>{appointment.customer}</Title><Text c="dimmed" size="sm">{appointment.service} con {appointment.employee}</Text><Text size="sm"><strong>{appointment.start}</strong> · {appointment.duration}</Text><Divider /><Group gap="xs"><Button size="xs" variant="light">Ver detalle</Button>{appointment.status === "PENDING" && <Button size="xs">Confirmar</Button>}{appointment.status === "CONFIRMED" && <Button color="teal" size="xs">Completar</Button>}{["PENDING", "CONFIRMED"].includes(appointment.status) && <Button color="red" size="xs" variant="subtle">Cancelar</Button>}</Group></>;
              })()}
            </Stack>
          </Group>
        </Card>
      </section>

      <section>
        <Text c="bukioo.6" fw={700} size="xs" tt="uppercase">
          Acceso y seguridad
        </Text>
        <Title order={2}>Autenticación, verificación y recuperación</Title>
        <Tabs defaultValue="staff" mt="lg">
          <Tabs.List><Tabs.Tab value="staff">Equipo</Tabs.Tab><Tabs.Tab value="customer">Cliente</Tabs.Tab></Tabs.List>
          <Tabs.Panel pt="md" value="staff"><Text c="dimmed" size="sm">Acceso para propietarios, administración y personal de la empresa.</Text></Tabs.Panel>
          <Tabs.Panel pt="md" value="customer"><Text c="dimmed" size="sm">El acceso de cliente siempre pertenece a la organización del enlace público.</Text></Tabs.Panel>
        </Tabs>
        <SimpleGrid className="design-form" cols={{ base: 1, md: 2 }} spacing="lg">
          <Card padding="lg" shadow="xs" withBorder>
            <Stack gap="md">
              <div><Text fw={700}>Iniciar sesión</Text><Text c="dimmed" size="sm">La contraseña nunca se guarda en el navegador.</Text></div>
              <TextInput error={authStep === "invalid" ? "Comprueba tu correo y contraseña." : undefined} label="Correo electrónico" onChange={(event) => { setAuthEmail(event.currentTarget.value); setAuthStep("idle"); }} placeholder="nombre@empresa.com" type="email" value={authEmail} withAsterisk />
              <PasswordInput error={authStep === "invalid" ? "Credenciales no válidas." : undefined} label="Contraseña" onChange={(event) => { setAuthPassword(event.currentTarget.value); setAuthStep("idle"); }} placeholder="Tu contraseña" value={authPassword} withAsterisk />
              <Group justify="space-between"><Button size="compact-sm" variant="subtle">He olvidado mi contraseña</Button><Button onClick={() => setAuthStep(authEmail.includes("@") && authPassword.length >= 12 ? "two-factor" : "invalid")}>Iniciar sesión</Button></Group>
              {authStep === "two-factor" && <Alert color="blue" icon={<LockKeyhole size={18} />} title="Verificación requerida">El siguiente paso solicita el código de seguridad.</Alert>}
              {authStep === "locked" && <Alert color="red" icon={<CircleAlert size={18} />} title="Acceso bloqueado">Espera 15 minutos antes de volver a intentarlo.</Alert>}
              <Button onClick={() => setAuthStep("locked")} size="compact-xs" variant="subtle">Ver estado de bloqueo</Button>
            </Stack>
          </Card>
          <Card padding="lg" shadow="xs" withBorder>
            <Stack gap="md">
              <div><Text fw={700}>Código de seguridad</Text><Text c="dimmed" size="sm">Introduce el código de tu aplicación autenticadora o correo.</Text></div>
              <PinInput aria-label="Código de seguridad" length={6} onChange={setAuthVerificationCode} oneTimeCode placeholder="·" type="number" value={authVerificationCode} />
              <Group justify="flex-end"><Button disabled={authVerificationCode.length !== 6}>Verificar</Button></Group>
              <Text c="dimmed" size="xs">¿No puedes acceder? Contacta con un administrador.</Text>
            </Stack>
          </Card>
          <Card padding="lg" shadow="xs" withBorder>
            <Stack gap="md"><div><Text fw={700}>Restablecer contraseña</Text><Text c="dimmed" size="sm">El correo de recuperación no revela si la cuenta existe.</Text></div><TextInput label="Correo electrónico" placeholder="nombre@empresa.com" type="email" withAsterisk /><Button variant="light">Enviar código</Button><Text c="dimmed" size="xs">El código caduca en 10 minutos.</Text></Stack>
          </Card>
          <Card padding="lg" shadow="xs" withBorder>
            <Stack gap="md"><div><Text fw={700}>Nueva contraseña</Text><Text c="dimmed" size="sm">Se solicitará después de validar el código recibido por correo.</Text></div><PasswordInput label="Nueva contraseña" placeholder="Crea una contraseña segura" withAsterisk /><PasswordInput label="Repetir contraseña" placeholder="Repite la contraseña" withAsterisk /><Button>Guardar nueva contraseña</Button></Stack>
          </Card>
          <Card padding="lg" shadow="xs" withBorder>
            <Stack gap="md"><div><Text fw={700}>Recuperar acceso de empleado</Text><Text c="dimmed" size="sm">Acciones disponibles para propietarios y administración de la empresa.</Text></div><Select data={["Ana Díaz", "Carlos Vega", "Marta Ruiz"]} defaultValue="Ana Díaz" label="Empleado" /><Group gap="xs"><Button onClick={() => setAdminAccessAction("password")} size="xs" variant="light">Enviar recuperación de contraseña</Button><Button color="red" onClick={() => setAdminAccessAction("two-factor")} size="xs" variant="subtle">Restablecer 2FA</Button></Group>{adminAccessAction === "password" && <Alert color="green" icon={<CheckCircle2 size={18} />} title="Solicitud enviada">Se ha enviado un correo para establecer una contraseña nueva.</Alert>}{adminAccessAction === "two-factor" && <Alert color="blue" icon={<LockKeyhole size={18} />} title="2FA restablecido">Se han cerrado las sesiones activas. El empleado deberá acceder con su contraseña y configurar un autenticador nuevo.</Alert>}</Stack>
          </Card>
        </SimpleGrid>
      </section>

      <section>
        <Text c="bukioo.6" fw={700} size="xs" tt="uppercase">
          Reserva pública
        </Text>
        <Title order={2}>Reserva una cita paso a paso</Title>
        <Paper className="booking-preview" mt="lg" p="lg" withBorder>
          <Stepper active={bookingStep} allowNextStepsSelect={false} size="sm">
            <Stepper.Step label="Servicio" />
            <Stepper.Step label="Profesional" />
            <Stepper.Step label="Fecha y hora" />
            <Stepper.Step label="Tus datos" />
            <Stepper.Completed>Confirmación</Stepper.Completed>
          </Stepper>
          <SimpleGrid cols={{ base: 1, md: 2 }} mt="xl" spacing="xl">
            <div>
              {bookingStep === 0 && <Stack gap="sm"><Text fw={700}>Elige un servicio</Text>{[["Corte y peinado", "60 min · 25 €"], ["Coloración", "90 min · 48 €"], ["Manicura", "45 min · 22 €"]].map(([name, detail]) => <button className={`booking-choice ${bookingService === name ? "booking-choice--selected" : ""}`} key={name} onClick={() => setBookingService(name)} type="button"><Text fw={600} size="sm">{name}</Text><Text c="dimmed" size="xs">{detail}</Text></button>)}</Stack>}
              {bookingStep === 1 && <Stack gap="sm"><Text fw={700}>Elige un profesional</Text>{[["Ana Díaz", "Especialista en corte y color"], ["Carlos Vega", "Especialista en estilismo"], ["Marta Ruiz", "Especialista en manicura"]].map(([name, detail]) => <button className={`booking-choice ${bookingEmployee === name ? "booking-choice--selected" : ""}`} key={name} onClick={() => setBookingEmployee(name)} type="button"><Group gap="sm"><Avatar color="bukioo" name={name} radius="xl" /><div><Text fw={600} size="sm">{name}</Text><Text c="dimmed" size="xs">{detail}</Text></div></Group></button>)}</Stack>}
              {bookingStep === 2 && <Stack gap="md"><div><Text fw={700}>Martes, 8 de septiembre</Text><Text c="dimmed" size="sm">Horario de la empresa · {businessTimezone}</Text></div><Group gap="xs">{["09:00", "10:00", "11:30", "16:00"].map((slot) => <Button key={slot} onClick={() => setBookingSlot(slot)} variant={bookingSlot === slot ? "filled" : "default"}>{slot}</Button>)}<Button disabled variant="default">12:00 · Ocupada</Button></Group><Checkbox checked={bookingConflict} label="Simular conflicto de agenda al confirmar" onChange={(event) => setBookingConflict(event.currentTarget.checked)} /></Stack>}
              {bookingStep === 3 && <Stack gap="md"><Text fw={700}>Tus datos</Text><TextInput label="Nombre" placeholder="Tu nombre" withAsterisk /><TextInput label="Apellidos" placeholder="Tus apellidos" withAsterisk /><TextInput label="Correo electrónico" placeholder="tu@email.com" type="email" withAsterisk /><TextInput label="Teléfono" placeholder="600 000 000" withAsterisk /><Text c="dimmed" size="xs">También podrás crear una cuenta para consultar tus citas.</Text></Stack>}
              {bookingStep === 4 && <Stack gap="md">{bookingOutcome === "conflict" ? <Alert color="red" icon={<CircleAlert size={18} />} title="Esta franja ya no está disponible">Otra persona ha reservado este horario. Elige otra franja para continuar.</Alert> : bookingOutcome === "success" ? <Alert color="green" icon={<CheckCircle2 size={18} />} title="Reserva confirmada">Te enviaremos los detalles y un enlace para gestionar tu cita.</Alert> : <><Text fw={700}>Confirma tu reserva</Text><Text c="dimmed" size="sm">Al confirmar, comprobaremos la disponibilidad final antes de crear la cita.</Text></>}</Stack>}
              <Group justify="space-between" mt="xl"><Button disabled={bookingStep === 0 || bookingOutcome === "success"} onClick={() => { setBookingOutcome("idle"); setBookingStep((current) => Math.max(0, current - 1)); }} variant="default">Volver</Button>{bookingStep < 4 ? <Button onClick={() => setBookingStep((current) => current + 1)}>Continuar</Button> : bookingOutcome === "conflict" ? <Button onClick={() => { setBookingOutcome("idle"); setBookingStep(2); }}>Elegir otra hora</Button> : bookingOutcome === "success" ? <Button variant="light">Ver mi cita</Button> : <Button onClick={() => setBookingOutcome(bookingConflict ? "conflict" : "success")}>Confirmar reserva</Button>}</Group>
            </div>
            <Card className="booking-summary" padding="lg" withBorder><Text c="bukioo.6" fw={700} size="xs" tt="uppercase">Tu reserva</Text><Stack gap="sm" mt="md"><div><Text c="dimmed" size="xs">Servicio</Text><Text fw={600} size="sm">{bookingService}</Text></div><div><Text c="dimmed" size="xs">Profesional</Text><Text fw={600} size="sm">{bookingEmployee}</Text></div><div><Text c="dimmed" size="xs">Fecha y hora</Text><Text fw={600} size="sm">Martes, 8 de septiembre · {bookingSlot}</Text></div><Divider /><Group justify="space-between"><Text fw={700}>Total</Text><Text fw={700}>25 €</Text></Group></Stack></Card>
          </SimpleGrid>
        </Paper>
      </section>

      <section>
        <Text c="bukioo.6" fw={700} size="xs" tt="uppercase">
          Formularios avanzados
        </Text>
        <Title order={2}>Edición, validación y cambios pendientes</Title>
        <SimpleGrid className="design-form" cols={{ base: 1, md: 2 }} spacing="lg">
          <Card padding="lg" shadow="xs" withBorder>
            <Stack gap="md">
              <TextInput description="Aparece en la agenda y en las comunicaciones." error={businessName.length > 0 && businessName.trim().length < 3 ? "Escribe al menos 3 caracteres." : undefined} label="Nombre de la empresa" onChange={(event) => { setBusinessName(event.currentTarget.value); setFormDirty(true); setFormSaveState("idle"); }} placeholder="Ej. Studio Ana" value={businessName} withAsterisk />
              <MultiSelect data={["Ana Díaz", "Carlos Vega", "Marta Ruiz"]} description="Solo quienes estén asignados podrán prestar este servicio." label="Empleados asignados" onChange={(value) => { setSelectedEmployees(value); setFormDirty(true); setFormSaveState("idle"); }} placeholder="Selecciona empleados" value={selectedEmployees} withAsterisk />
              <Select data={ianaTimezones} description="La agenda, reservas, informes y horarios se mostrarán en esta zona." label="Zona horaria de la empresa" limit={12} nothingFoundMessage="No encontramos esa zona horaria." onChange={(value) => { if (value) { setBusinessTimezone(value); setFormDirty(true); setFormSaveState("idle"); } }} searchable value={businessTimezone} withAsterisk />
              {businessTimezone !== "Atlantic/Canary" && <Alert color="yellow" icon={<TriangleAlert size={18} />} title="Revisa los horarios existentes">Al guardar, las horas de agenda y disponibilidad se interpretarán en la nueva zona horaria.</Alert>}
              <Switch defaultChecked description="Las nuevas reservas pasarán directamente a confirmadas." label="Confirmar citas automáticamente" onChange={() => { setFormDirty(true); setFormSaveState("idle"); }} />
              {formSaveState === "saved" && <Alert color="green" icon={<CheckCircle2 size={18} />} title="Cambios guardados">Los cambios se han guardado correctamente.</Alert>}
              <Group justify="space-between"><Button color="gray" onClick={() => formDirty ? openDiscardModal() : undefined} variant="subtle">Cerrar sin guardar</Button><Button disabled={businessName.trim().length > 0 && businessName.trim().length < 3} leftSection={<Save size={16} />} onClick={() => { setFormDirty(false); setFormSaveState("saved"); }}>Guardar cambios</Button></Group>
            </Stack>
          </Card>
          <Card padding="lg" shadow="xs" withBorder>
            <Stack gap="md">
              <div><Group gap="xs"><Text fw={700}>Horario semanal</Text><Badge color="bukioo" variant="light">{businessTimezone}</Badge></Group><Text c="dimmed" size="sm">Una jornada puede contener varias franjas, por ejemplo mañana y tarde.</Text></div>
              <Stack gap="xs">{workingDays.map((day, dayIndex) => <div className="working-day" key={day.name}><Switch checked={day.enabled} label={day.name} onChange={(event) => updateWorkingDay(dayIndex, (current) => ({ ...current, enabled: event.currentTarget.checked, ranges: event.currentTarget.checked && current.ranges.length === 0 ? [{ start: "09:00", end: "18:00" }] : current.ranges }))} /><div className="working-day__ranges">{day.enabled && <div className="working-day__range-list">{day.ranges.map((range, rangeIndex) => <Group gap="xs" key={`${day.name}-${rangeIndex}`} wrap="nowrap"><TimeInput aria-label={`Inicio ${day.name}`} onChange={(event) => updateWorkingDay(dayIndex, (current) => ({ ...current, ranges: current.ranges.map((item, index) => index === rangeIndex ? { ...item, start: event.currentTarget.value } : item) }))} size="xs" value={range.start} w={96} /><Text c="dimmed" size="xs">a</Text><TimeInput aria-label={`Fin ${day.name}`} onChange={(event) => updateWorkingDay(dayIndex, (current) => ({ ...current, ranges: current.ranges.map((item, index) => index === rangeIndex ? { ...item, end: event.currentTarget.value } : item) }))} size="xs" value={range.end} w={96} /><ActionIcon aria-label={`Eliminar franja de ${day.name}`} color="red" onClick={() => updateWorkingDay(dayIndex, (current) => ({ ...current, ranges: current.ranges.filter((_, index) => index !== rangeIndex) }))} size="sm" variant="subtle"><Minus size={15} /></ActionIcon></Group>)}</div>}{day.enabled && <Button className="working-day__add-range" leftSection={<Plus size={14} />} onClick={() => updateWorkingDay(dayIndex, (current) => ({ ...current, ranges: [...current.ranges, { start: "14:00", end: "18:00" }] }))} size="compact-xs" variant="subtle">Añadir franja</Button>}</div></div>)}</Stack>
            </Stack>
          </Card>
        </SimpleGrid>
      </section>

      <section>
        <Text c="bukioo.6" fw={700} size="xs" tt="uppercase">
          Fecha y hora
        </Text>
        <Title order={2}>Selección para agenda e informes</Title>
        <SimpleGrid className="design-form" cols={{ base: 1, sm: 2 }} spacing="lg">
          <Card padding="lg" shadow="xs" withBorder>
            <Stack gap="md">
              <div>
                <Text fw={600} size="sm">Nueva cita</Text>
                <Text c="dimmed" size="sm">Horario de la empresa · {businessTimezone}</Text>
              </div>
              <DatePickerInput
                clearable
                label="Fecha"
                minDate={new Date()}
                onChange={setAppointmentDate}
                placeholder="Selecciona una fecha"
                value={appointmentDate}
              />
              <TimeInput
                description="La disponibilidad real se validará al consultar la API."
                label="Hora de inicio"
                onChange={(event) => setAppointmentTime(event.currentTarget.value)}
                value={appointmentTime}
              />
              <Alert color="yellow" icon={<TriangleAlert size={18} />} title="Franja no disponible">
                Muestra este estado cuando la API devuelva un conflicto de agenda.
              </Alert>
            </Stack>
          </Card>
          <Card padding="lg" shadow="xs" withBorder>
            <Stack gap="md">
              <div>
                <Text fw={600} size="sm">Rango de informe</Text>
                <Text c="dimmed" size="sm">Un único control para fechas de inicio y fin.</Text>
              </div>
              <DatePickerInput
                clearable
                label="Periodo"
                maxDate={new Date()}
                onChange={setReportRange}
                placeholder="Selecciona un rango"
                type="range"
                value={reportRange}
              />
              <Text c="dimmed" size="xs">En disponibilidad, el frontend limitará el rango a 31 días antes de llamar a la API.</Text>
              <TextInput error="La fecha inicial debe ser anterior a la final." label="Ejemplo de validación" value="10/09/2026 — 08/09/2026" readOnly />
            </Stack>
          </Card>
        </SimpleGrid>
      </section>

      <section>
        <Text c="bukioo.6" fw={700} size="xs" tt="uppercase">
          Campos
        </Text>
        <Title order={2}>Formulario</Title>
        <SimpleGrid className="design-form" cols={{ base: 1, sm: 2 }} spacing="lg">
          <Card padding="lg" shadow="xs" withBorder>
            <Stack gap="md">
              <TextInput description="Como aparecerá en la agenda." label="Nombre del cliente" placeholder="Ej. Lucía Pérez" />
              <TextInput error="Introduce un email válido." label="Correo electrónico" readOnly value="correo-invalido" />
              <Select data={["Corte y peinado", "Coloración"]} description="Solo se muestran servicios activos." label="Servicio" placeholder="Selecciona un servicio" />
              <Textarea label="Notas" minRows={3} placeholder="Información relevante para la cita" />
              <Checkbox defaultChecked description="El cliente recibirá un aviso antes de la cita." label="Enviar recordatorio" />
            </Stack>
          </Card>
          <Stack gap="md">
            <Alert color="green" icon={<CheckCircle2 size={20} />} title="Cita creada">La agenda se ha actualizado correctamente.</Alert>
            <Alert color="yellow" icon={<TriangleAlert size={20} />} title="Conflicto de agenda">Elige otra franja o solicita aprobación.</Alert>
            <Alert color="red" icon={<CircleAlert size={20} />} title="No se pudo guardar">Revisa los campos marcados e inténtalo de nuevo.</Alert>
            <Alert color="blue" icon={<Info size={20} />} title="Información">Los cambios se guardan al confirmar.</Alert>
          </Stack>
        </SimpleGrid>
      </section>

      <section>
        <Text c="bukioo.6" fw={700} size="xs" tt="uppercase">
          Interacción
        </Text>
        <Title order={2}>Overlay, menú y navegación</Title>
        <SimpleGrid className="design-form" cols={{ base: 1, sm: 2 }} spacing="lg">
          <Card padding="lg" shadow="xs" withBorder>
            <Stack gap="lg">
              <div>
                <Text fw={600} size="sm">Variantes de modal</Text>
                <Text c="dimmed" size="sm">La acción principal cambia según el contexto del flujo.</Text>
                <Group mt="sm"><Button onClick={openContinueModal}>Modal de continuidad</Button><Button color="red" onClick={openCancelModal} variant="light">Modal destructivo</Button></Group>
              </div>
              <Divider />
              <div>
                <Text fw={600} size="sm">Menú contextual</Text>
                <Text c="dimmed" size="sm">Acciones secundarias de una cita o cliente.</Text>
                <Menu shadow="md" width={200} withinPortal>
                  <Menu.Target>
                    <ActionIcon aria-label="Abrir acciones de la cita" mt="sm" size="lg" variant="default">
                      <Ellipsis size={18} />
                    </ActionIcon>
                  </Menu.Target>
                  <Menu.Dropdown>
                    <Menu.Label>Acciones de cita</Menu.Label>
                    <Menu.Item leftSection={<Pencil size={15} />}>Editar cita</Menu.Item>
                    <Menu.Item leftSection={<Mail size={15} />}>Enviar recordatorio</Menu.Item>
                    <Menu.Divider />
                    <Menu.Item color="red" leftSection={<Trash2 size={15} />}>Cancelar cita</Menu.Item>
                  </Menu.Dropdown>
                </Menu>
              </div>
            </Stack>
          </Card>
          <Card padding="lg" shadow="xs" withBorder>
            <Stack gap="lg">
              <div>
                <Text fw={600} size="sm">Iconos con contexto</Text>
                <Group mt="sm">
                  <Tooltip label="Configuración"><ActionIcon aria-label="Configuración" size="lg" variant="light"><Settings size={18} /></ActionIcon></Tooltip>
                  <Tooltip label="Notificaciones"><ActionIcon aria-label="Notificaciones" size="lg" variant="light"><Bell size={18} /></ActionIcon></Tooltip>
                </Group>
              </div>
              <Divider />
              <Group>
                <Avatar color="bukioo" name="Ana Díaz" radius="xl" />
                <div><Text fw={600} size="sm">Ana Díaz</Text><Text c="dimmed" size="xs">Administradora</Text></div>
              </Group>
            </Stack>
          </Card>
        </SimpleGrid>
        <Card className="design-card" padding="lg" shadow="xs" withBorder>
          <Tabs className="design-tabs" onChange={handleTabChange} value={activeTab} variant="pills">
            <Tabs.List><Tabs.Tab value="general">General</Tabs.Tab><Tabs.Tab value="agenda">Agenda</Tabs.Tab><Tabs.Tab value="avisos">Avisos</Tabs.Tab></Tabs.List>
          </Tabs>
          <div className={`design-tabs__content design-tabs__content--${tabContentPhase} design-tabs__content--${tabDirection}`} key={`${displayedTab}-${tabContentPhase}`}><Text size="sm">{tabContent[displayedTab]}</Text></div>
        </Card>
      </section>

      <section>
        <Text c="bukioo.6" fw={700} size="xs" tt="uppercase">
          Composición
        </Text>
        <Title order={2}>Vista de panel</Title>
        <Paper className="panel-preview" radius="lg" shadow="md" withBorder>
          <aside>
            <ThemeIcon color="bukioo" radius="sm">B</ThemeIcon>
            <span className="panel-preview__active"><LayoutDashboard size={17} />Inicio</span>
            <span><CalendarDays size={17} />Agenda</span>
          </aside>
          <div>
            <Group justify="space-between">
              <div><Text fw={700}>Buenos días, Ana</Text><Text c="dimmed" size="sm">Martes, 8 de septiembre</Text></div>
              <Button size="sm">Nueva cita</Button>
            </Group>
            <SimpleGrid className="panel-preview__metrics" cols={{ base: 1, xs: 3 }} spacing="sm">
              <Card padding="sm"><Text c="dimmed" size="xs">Citas hoy</Text><Title order={3}>12</Title><Text c="dimmed" size="xs">+3 desde ayer</Text></Card>
              <Card padding="sm"><Text c="dimmed" size="xs">Pendientes</Text><Title order={3}>4</Title><Text c="dimmed" size="xs">Requieren atención</Text></Card>
              <Card padding="sm"><Text c="dimmed" size="xs">Ocupación</Text><Title order={3}>76%</Title><Text c="dimmed" size="xs">Esta semana</Text></Card>
            </SimpleGrid>
          </div>
        </Paper>
      </section>

      <section>
        <Text c="bukioo.6" fw={700} size="xs" tt="uppercase">
          Datos y estados
        </Text>
        <Title order={2}>Listados, carga y mensajes globales</Title>
        <Card className="design-card" padding="lg" shadow="xs" withBorder>
          <Stack gap="md">
            <Group className="design-table-toolbar" justify="space-between">
              <TextInput leftSection={<Search size={16} />} onChange={(event) => { setSearch(event.currentTarget.value); setPage(1); }} placeholder="Escribe aquí" rightSection={search ? <CloseButton aria-label="Limpiar búsqueda" onClick={() => { setSearch(""); setPage(1); }} /> : undefined} value={search} w={{ base: "100%", sm: 320 }} />
              <Group gap="xs"><Button disabled={!search && sortField === "customer" && sortDirection === "asc"} leftSection={<X size={15} />} onClick={clearTableFilters} size="xs" variant="subtle">Restablecer tabla</Button></Group>
            </Group>
          <Table.ScrollContainer minWidth={540}>
            <Table highlightOnHover striped withTableBorder>
              <Table.Thead><Table.Tr>{(["customer", "service", "time", "status"] as const).map((field) => <Table.Th key={field}><Button aria-label={`Ordenar por ${field}`} className="design-table-sort-button" color={sortField === field ? "bukioo" : "gray"} onClick={() => handleSort(field)} rightSection={sortField === field ? sortDirection === "asc" ? <ArrowUp size={14} /> : <ArrowDown size={14} /> : <ArrowUpDown size={14} />} size="compact-xs" variant="subtle">{{ customer: "Cliente", service: "Servicio", time: "Hora", status: "Estado" }[field]}</Button></Table.Th>)}</Table.Tr></Table.Thead>
              <Table.Tbody>{visibleAppointments.map((appointment) => <Table.Tr key={appointment.id}><Table.Td>{appointment.customer}</Table.Td><Table.Td>{appointment.service}</Table.Td><Table.Td>{appointment.time}</Table.Td><Table.Td><Badge color={appointmentStatus[appointment.status].color} variant="light">{getAppointmentStatusLabel(appointment.status)}</Badge></Table.Td></Table.Tr>)}</Table.Tbody>
            </Table>
          </Table.ScrollContainer>
          {visibleAppointments.length === 0 ? <Stack align="center" gap="xs" py="xl"><ThemeIcon color="gray" radius="xl" size={48} variant="light"><Inbox size={24} /></ThemeIcon><Text fw={600}>No encontramos citas con esos criterios</Text><Text c="dimmed" size="sm">Prueba con otra búsqueda o restablece la tabla.</Text><Button onClick={clearTableFilters} size="xs" variant="light">Restablecer tabla</Button></Stack> : <Group className="design-pagination" justify="space-between"><Group gap="xs"><Text c="dimmed" size="xs">Elementos por página</Text><Select aria-label="Elementos por página" checkIconPosition="right" miw={88} data={["10", "25", "50"]} onChange={(value) => { setPageSize(Number(value ?? 10)); setPage(1); }} size="xs" value={String(pageSize)} w={88} /></Group><Text c="dimmed" size="sm">Mostrando {firstItem}–{lastItem} de {sortedAppointments.length} citas</Text><Group gap="xs"><Tooltip label="Primera página"><ActionIcon aria-label="Primera página" disabled={currentPage === 1} onClick={() => setPage(1)} size="sm" variant="default"><ChevronsLeft size={16} /></ActionIcon></Tooltip><Pagination onChange={setPage} size="sm" total={totalPages} value={currentPage} /><Tooltip label="Última página"><ActionIcon aria-label="Última página" disabled={currentPage === totalPages} onClick={() => setPage(totalPages)} size="sm" variant="default"><ChevronsRight size={16} /></ActionIcon></Tooltip></Group></Group>}
          </Stack>
        </Card>
        <SimpleGrid className="design-form" cols={{ base: 1, sm: 2 }} spacing="lg">
          <Card padding="lg" shadow="xs" withBorder><Stack gap="sm"><Group justify="space-between"><Text fw={600} size="sm">Cargando agenda</Text><Loader color="bukioo" size="sm" /></Group><Skeleton height={14} radius="xl" /><Skeleton height={14} radius="xl" width="75%" /><Skeleton height={66} radius="md" /></Stack></Card>
          <Card padding="lg" shadow="xs" withBorder><Stack align="center" gap="xs" py="md"><ThemeIcon color="gray" radius="xl" size={48} variant="light"><Inbox size={24} /></ThemeIcon><Text fw={600}>No hay citas para este día</Text><Text c="dimmed" size="sm" ta="center">Cambia el rango o crea una nueva cita para empezar.</Text><Button mt="xs" variant="light">Nueva cita</Button></Stack></Card>
          <Card padding="lg" shadow="xs" withBorder><Stack align="center" gap="xs" py="md"><ThemeIcon color="red" radius="xl" size={48} variant="light"><CalendarX size={24} /></ThemeIcon><Text fw={600}>No se pudo cargar la agenda</Text><Text c="dimmed" size="sm" ta="center">Comprueba la conexión e inténtalo de nuevo.</Text><Button mt="xs" variant="default">Reintentar</Button></Stack></Card>
          <Card padding="lg" shadow="xs" withBorder><Stack gap="sm"><Text fw={600}>Toasts</Text><Text c="dimmed" size="sm">Mensajes breves que se cierran automáticamente tras 15 segundos.</Text><Group><Button onClick={() => notifications.show({ autoClose: 15000, classNames: { root: "design-notification--success" }, color: "green", message: "Los cambios se han guardado correctamente.", title: "Cambios guardados", withBorder: true })} variant="light">Éxito</Button><Button color="red" onClick={() => notifications.show({ autoClose: 15000, classNames: { root: "design-notification--error" }, color: "red", message: "Revisa la conexión e inténtalo de nuevo.", title: "No se pudo guardar", withBorder: true })} variant="light">Error</Button></Group></Stack></Card>
        </SimpleGrid>
      </section>

      <Modal centered opened={continueModalOpened} onClose={closeContinueModal} title="Continuar con la cita">
        <Stack gap="md"><Text size="sm">Revisa los datos antes de avanzar al siguiente paso de la reserva.</Text><Group justify="flex-end"><Button onClick={closeContinueModal} variant="default">Volver</Button><Button onClick={closeContinueModal}>Continuar</Button></Group></Stack>
      </Modal>
      <Modal centered opened={cancelModalOpened} onClose={closeCancelModal} title="Cancelar cita">
        <Stack gap="md"><Text size="sm">Esta acción cancelará la cita de Lucía Pérez. Podrás indicar el motivo en el flujo final.</Text><Group justify="flex-end"><Button onClick={closeCancelModal} variant="default">Volver</Button><Button color="red" onClick={closeCancelModal}>Cancelar cita</Button></Group></Stack>
      </Modal>
      <Modal centered opened={discardModalOpened} onClose={closeDiscardModal} title="Descartar cambios">
        <Stack gap="md"><Text size="sm">Tienes cambios sin guardar. Si continúas, se perderán y no se enviarán a la API.</Text><Group justify="flex-end"><Button onClick={closeDiscardModal} variant="default">Volver</Button><Button color="red" onClick={() => { setFormDirty(false); closeDiscardModal(); }}>Descartar cambios</Button></Group></Stack>
      </Modal>
      <Drawer classNames={{ body: "design-detail-drawer__body" }} onClose={closeDetailDrawer} opened={detailDrawerOpened} padding="lg" position="right" size="md" title={detailEntity === "appointment" ? "Detalle de cita" : "Ficha de cliente"}>
        <Stack gap="lg">
          <Group justify="space-between" wrap="nowrap">
            <div><Text fw={700}>{detailEntity === "appointment" ? "Lucía Pérez" : "Lucía Pérez"}</Text><Text c="dimmed" size="sm">{detailEntity === "appointment" ? "Corte y peinado · martes, 8 de septiembre" : "lucia.perez@example.com · +34 600 000 001"}</Text></div>
            {detailEntity === "appointment" ? <Badge color="green" variant="light">Confirmada</Badge> : <Avatar color="bukioo" name="Lucía Pérez" radius="xl" />}
          </Group>
          <Tabs defaultValue="overview">
            <Tabs.List><Tabs.Tab value="overview">Resumen</Tabs.Tab><Tabs.Tab value="history">Historial</Tabs.Tab>{detailEntity === "customer" && <Tabs.Tab value="loyalty">Fidelización</Tabs.Tab>}</Tabs.List>
            <Tabs.Panel pt="md" value="overview"><Stack gap="sm">{detailEntity === "appointment" ? <><Text size="sm"><strong>Horario:</strong> 09:00–10:00</Text><Text size="sm"><strong>Empleado:</strong> Ana Díaz</Text><Text size="sm"><strong>Notas:</strong> Prefiere un acabado natural.</Text></> : <><Text size="sm"><strong>Última cita:</strong> 8 de septiembre de 2026</Text><Text size="sm"><strong>Citas realizadas:</strong> 12</Text><Text size="sm"><strong>Notas:</strong> Avisar antes de aplicar cualquier cambio de servicio.</Text></>}</Stack></Tabs.Panel>
            <Tabs.Panel pt="md" value="history"><Stack gap="sm"><Text c="dimmed" size="sm">Los movimientos y citas anteriores aparecerán aquí cuando se conecte a la API.</Text><Card padding="sm" withBorder><Text fw={600} size="sm">3 de septiembre de 2026</Text><Text c="dimmed" size="xs">Corte y peinado · Completada</Text></Card></Stack></Tabs.Panel>
            {detailEntity === "customer" && <Tabs.Panel pt="md" value="loyalty"><Stack gap="sm"><Text fw={700}>320 puntos</Text><Text c="dimmed" size="sm">Nivel actual: Bronce. Los movimientos se mostrarán en esta sección.</Text></Stack></Tabs.Panel>}
          </Tabs>
          <Divider />
          <Group className="design-detail-drawer__actions" justify="flex-end"><Button onClick={closeDetailDrawer} variant="default">Cerrar</Button><Button variant="light">{detailEntity === "appointment" ? "Editar cita" : "Editar cliente"}</Button>{detailEntity === "appointment" && <Button color="red" variant="subtle">Cancelar</Button>}</Group>
        </Stack>
      </Drawer>
    </main>
  );
}
