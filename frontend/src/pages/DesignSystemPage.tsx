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
  Group,
  Menu,
  Modal,
  Loader,
  Pagination,
  Paper,
  Select,
  SimpleGrid,
  Stack,
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
  Mail,
  PanelLeftClose,
  PanelLeftOpen,
  Palette,
  Pencil,
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
  const statuses = ["Confirmada", "Pendiente", "Nueva"] as const;

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

const agendaStatusColor = {
  CANCELLED: "red",
  COMPLETED: "teal",
  CONFIRMED: "green",
  NO_SHOW: "gray",
  PENDING: "yellow",
} as const;

export function DesignSystemPage() {
  const [continueModalOpened, { close: closeContinueModal, open: openContinueModal }] = useDisclosure(false);
  const [cancelModalOpened, { close: closeCancelModal, open: openCancelModal }] = useDisclosure(false);
  const [activeTab, setActiveTab] = useState("general");
  const [displayedNavigation, setDisplayedNavigation] = useState("Agenda");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [navigationContentPhase, setNavigationContentPhase] = useState<"in" | "out">("in");
  const [selectedNavigation, setSelectedNavigation] = useState("Agenda");
  const [selectedAgendaId, setSelectedAgendaId] = useState("confirmed");
  const [appointmentDate, setAppointmentDate] = useState<string | null>("2026-09-08");
  const [appointmentTime, setAppointmentTime] = useState("10:00");
  const [displayedTab, setDisplayedTab] = useState("general");
  const [tabContentPhase, setTabContentPhase] = useState<"in" | "out">("in");
  const [tabDirection, setTabDirection] = useState<"backward" | "forward">("forward");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [reportRange, setReportRange] = useState<[string | null, string | null]>(["2026-09-01", "2026-09-30"]);
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
  const navigationTimer = useRef<number | undefined>(undefined);
  const tabTimer = useRef<number | undefined>(undefined);
  const tabOrder = ["general", "agenda", "avisos"];
  const tabContent: Record<string, string> = {
    general: "Ajustes generales del negocio: nombre, contacto y zona horaria.",
    agenda: "Reglas de disponibilidad, confirmación y reprogramación.",
    avisos: "Preferencias de recordatorios y notificaciones.",
  };
  const filteredAppointments = appointments.filter((appointment) => {
    const matchesSearch = [appointment.customer, appointment.service, appointment.status, appointment.time]
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
    window.clearTimeout(navigationTimer.current);
    window.clearTimeout(tabTimer.current);
  }, []);

  function handleNavigationChange(nextNavigation: string) {
    const iconAnimations: Record<string, () => void> = {
      Agenda: () => agendaIconRef.current?.startAnimation(),
      Clientes: () => customersIconRef.current?.startAnimation(),
      Configuración: () => settingsIconRef.current?.startAnimation(),
      Informes: () => reportsIconRef.current?.startAnimation(),
      Inicio: () => homeIconRef.current?.startAnimation(),
      Negocio: () => businessIconRef.current?.startAnimation(),
      Servicios: () => servicesIconRef.current?.startAnimation(),
      Superadmin: () => superadminIconRef.current?.startAnimation(),
    };

    iconAnimations[nextNavigation]?.();
    if (nextNavigation === selectedNavigation) return;

    window.clearTimeout(navigationTimer.current);
    setSelectedNavigation(nextNavigation);
    setNavigationContentPhase("out");
    navigationTimer.current = window.setTimeout(() => {
      setDisplayedNavigation(nextNavigation);
      setNavigationContentPhase("in");
    }, 180);
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
              <button className={selectedNavigation === "Negocio" ? "navigation-preview__link--active" : ""} onClick={() => handleNavigationChange("Negocio")} title={isSidebarCollapsed ? "Negocio" : undefined} type="button"><BriefcaseBusinessIcon animateOnHover={false} ref={businessIconRef} size={18} />{!isSidebarCollapsed && <span>Negocio</span>}</button>
              <button className={selectedNavigation === "Configuración" ? "navigation-preview__link--active" : ""} onClick={() => handleNavigationChange("Configuración")} title={isSidebarCollapsed ? "Configuración" : undefined} type="button"><SettingsIcon animateOnHover={false} ref={settingsIconRef} size={18} />{!isSidebarCollapsed && <span>Configuración</span>}</button>
              <button className="navigation-preview__superadmin" onClick={() => handleNavigationChange("Superadmin")} title={isSidebarCollapsed ? "Superadmin" : undefined} type="button"><ShieldCheckIcon animateOnHover={false} ref={superadminIconRef} size={18} />{!isSidebarCollapsed && <span>Superadmin</span>}</button>
            </div>
          </aside>
          <div className="navigation-preview__main">
            <header>
              <Group gap="xs">
                <Menu shadow="md" width={220} withinPortal>
                  <Menu.Target><Button leftSection={<Building2 size={16} />} rightSection={<ArrowDown size={14} />} size="sm" variant="default">Studio Ana</Button></Menu.Target>
                  <Menu.Dropdown><Menu.Label>Negocios disponibles</Menu.Label><Menu.Item>Studio Ana</Menu.Item><Menu.Item>Studio Norte</Menu.Item></Menu.Dropdown>
                </Menu>
              </Group>
              <Group gap="xs"><Tooltip label="Notificaciones"><ActionIcon aria-label="Notificaciones" size="lg" variant="default"><Bell size={18} /></ActionIcon></Tooltip><Menu shadow="md" width={180} withinPortal><Menu.Target><button aria-label="Abrir menú de perfil" className="navigation-preview__profile" type="button"><Avatar color="bukioo" name="Ana Díaz" radius="xl" size="sm" /><span>AD</span></button></Menu.Target><Menu.Dropdown><Menu.Label>Ana Díaz</Menu.Label><Menu.Item>Mi perfil</Menu.Item><Menu.Item>Cerrar sesión</Menu.Item></Menu.Dropdown></Menu></Group>
            </header>
            <main className={`navigation-preview__content navigation-preview__content--${navigationContentPhase}`} key={`${displayedNavigation}-${navigationContentPhase}`}>
              <Text c="bukioo.6" fw={700} size="xs" tt="uppercase">Vista seleccionada</Text>
              <Title order={3}>{displayedNavigation}</Title>
              <Text c="dimmed" mt="xs" size="sm">La navegación conserva el contexto de negocio y muestra únicamente las opciones que permite el rol.</Text>
              <SimpleGrid cols={{ base: 1, sm: 3 }} mt="xl" spacing="sm"><Card padding="md" withBorder><Text c="dimmed" size="xs">Rol empleado</Text><Text fw={600} size="sm">Agenda y clientes asignados</Text></Card><Card padding="md" withBorder><Text c="dimmed" size="xs">Rol manager</Text><Text fw={600} size="sm">Operación e informes</Text></Card><Card padding="md" withBorder><Text c="dimmed" size="xs">Owner / admin</Text><Text fw={600} size="sm">Configuración y negocio</Text></Card></SimpleGrid>
            </main>
            <nav aria-label="Navegación móvil" className="navigation-preview__mobile-nav">
              {[ ["Inicio", <LayoutGridIcon size={18} />], ["Agenda", <CalendarDaysIcon size={18} />], ["Clientes", <UsersIcon size={18} />], ["Más", <BriefcaseBusinessIcon size={18} />] ].map(([label, icon]) => <button className={selectedNavigation === label ? "navigation-preview__mobile-link--active" : ""} key={String(label)} onClick={() => handleNavigationChange(String(label))} type="button">{icon}<span>{label}</span></button>)}
            </nav>
          </div>
        </Paper>
      </section>

      <section>
        <Text c="bukioo.6" fw={700} size="xs" tt="uppercase">
          Agenda
        </Text>
        <Title order={2}>Citas y estados operativos</Title>
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
                    <Badge color={agendaStatusColor[appointment.status]} size="sm" variant="light">{appointment.status}</Badge>
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
                return <><Badge color={agendaStatusColor[appointment.status]} variant="light">{appointment.status}</Badge><Title order={3}>{appointment.customer}</Title><Text c="dimmed" size="sm">{appointment.service} con {appointment.employee}</Text><Text size="sm"><strong>{appointment.start}</strong> · {appointment.duration}</Text><Divider /><Group gap="xs"><Button size="xs" variant="light">Ver detalle</Button>{appointment.status === "PENDING" && <Button size="xs">Confirmar</Button>}{appointment.status === "CONFIRMED" && <Button color="teal" size="xs">Completar</Button>}{["PENDING", "CONFIRMED"].includes(appointment.status) && <Button color="red" size="xs" variant="subtle">Cancelar</Button>}</Group></>;
              })()}
            </Stack>
          </Group>
        </Card>
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
                <Text c="dimmed" size="sm">Fecha y hora se eligen por separado para mostrar las franjas disponibles.</Text>
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
              <Table.Tbody>{visibleAppointments.map((appointment) => <Table.Tr key={appointment.id}><Table.Td>{appointment.customer}</Table.Td><Table.Td>{appointment.service}</Table.Td><Table.Td>{appointment.time}</Table.Td><Table.Td><Badge color={appointment.status === "Confirmada" ? "green" : appointment.status === "Pendiente" ? "yellow" : "blue"} variant="light">{appointment.status}</Badge></Table.Td></Table.Tr>)}</Table.Tbody>
            </Table>
          </Table.ScrollContainer>
          {visibleAppointments.length === 0 ? <Stack align="center" gap="xs" py="xl"><ThemeIcon color="gray" radius="xl" size={48} variant="light"><Inbox size={24} /></ThemeIcon><Text fw={600}>No encontramos citas con esos criterios</Text><Text c="dimmed" size="sm">Prueba con otra búsqueda o restablece la tabla.</Text><Button onClick={clearTableFilters} size="xs" variant="light">Restablecer tabla</Button></Stack> : <Group className="design-pagination" justify="space-between"><Group gap="xs"><Text c="dimmed" size="xs">Elementos por página</Text><Select aria-label="Elementos por página" data={["10", "25", "50"]} onChange={(value) => { setPageSize(Number(value ?? 10)); setPage(1); }} size="xs" value={String(pageSize)} w={72} /></Group><Text c="dimmed" size="sm">Mostrando {firstItem}–{lastItem} de {sortedAppointments.length} citas</Text><Group gap="xs"><Tooltip label="Primera página"><ActionIcon aria-label="Primera página" disabled={currentPage === 1} onClick={() => setPage(1)} size="sm" variant="default"><ChevronsLeft size={16} /></ActionIcon></Tooltip><Pagination onChange={setPage} size="sm" total={totalPages} value={currentPage} /><Tooltip label="Última página"><ActionIcon aria-label="Última página" disabled={currentPage === totalPages} onClick={() => setPage(totalPages)} size="sm" variant="default"><ChevronsRight size={16} /></ActionIcon></Tooltip></Group></Group>}
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
    </main>
  );
}
