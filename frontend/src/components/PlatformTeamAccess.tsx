import { ActionIcon, Alert, Badge, Button, ColorInput, Group, Menu, Modal, MultiSelect, Pagination, Paper, Popover, Select, Skeleton, Stack, Table, Tabs, Text, TextInput, Title } from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { ChevronDown, CircleAlert, CircleCheck, Crown, Eye, Search, SlidersHorizontal, UserCog, UserPlus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ApiError } from "../lib/api-client";
import { staffAuth, type StaffProfile } from "../lib/staff-auth";
import { superadminApi, type OrganizationMember, type OrganizationMemberFilters, type SuperadminBusiness, type SuperadminEmployee, type SuperadminPaginatedResponse, type UpdateMemberRoleInput } from "../lib/superadmin-api";
import { canChangeMemberStatus, canManageMemberBusinesses, editableMemberRoles, linkableBusinesses, memberRoleLabels, memberStatusLabel, roleChangeInput } from "../lib/team-access";
import { PlatformCreateAction } from "./PlatformCreateAction";
import { PlatformEmployeeModal } from "./PlatformEmployeeModal";
import { MemberAccessActions } from "./MemberAccessActions";
import "./PlatformTeamAccess.css";

type Props = {
  organizationId: string;
  organizationName: string;
  organizationActive: boolean;
  business: SuperadminBusiness;
  onChanged: () => void;
};

function memberName(member: OrganizationMember) {
  return [member.firstName, member.lastName].filter(Boolean).join(" ") || "Nombre pendiente";
}

function errorMessage(error: unknown) {
  if (error instanceof ApiError) return error.status === 403 ? "No tienes permiso para esta operación. Se actualizarán tus accesos." : error.message;
  return "No se ha podido confirmar la operación. Actualiza la lista antes de reintentarlo.";
}

function Pager({ total, page, limit, onPage, onLimit }: { total: number; page: number; limit: number; onPage: (page: number) => void; onLimit: (limit: number) => void }) {
  return <Group justify="space-between" mt="md">
    <Group gap="xs"><Text size="xs">Elementos por página</Text><Select aria-label="Elementos por página" checkIconPosition="right" miw={88} w={88} size="xs" allowDeselect={false} data={["10", "25", "50", "100"]} value={String(limit)} onChange={(value) => onLimit(Number(value ?? 25))} /></Group>
    <Group><Text size="sm" c="dimmed">Mostrando {total ? (page - 1) * limit + 1 : 0}–{Math.min(page * limit, total)} de {total}</Text><Pagination withEdges size="sm" value={page} total={Math.max(1, Math.ceil(total / limit))} onChange={onPage} /></Group>
  </Group>;
}

// Query through every page: an administrator can have more than 100 businesses.
async function loadBusinessOptions(organizationId: string) {
  const items: SuperadminBusiness[] = [];
  let offset = 0;
  while (true) {
    const response = await superadminApi.listOrganizationBusinesses(organizationId, { limit: 100, offset });
    items.push(...response.items);
    offset += response.items.length;
    if (!response.items.length || offset >= response.pagination.total) return items;
  }
}

export function PlatformTeamAccess({ organizationId, organizationName, organizationActive, business, onChanged }: Props) {
  const [profile, setProfile] = useState<StaffProfile | null>(null);
  const [businesses, setBusinesses] = useState<SuperadminBusiness[]>([]);
  const [contextError, setContextError] = useState<string | null>(null);
  const [contextVersion, setContextVersion] = useState(0);
  const [revision, setRevision] = useState(0);
  const [tab, setTab] = useState<string | null>("members");
  const [data, setData] = useState<SuperadminPaginatedResponse<OrganizationMember> | null>(null);
  const [membersLoading, setMembersLoading] = useState(true);
  const [membersError, setMembersError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [query] = useDebouncedValue(search, 350);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [filters, setFilters] = useState<OrganizationMemberFilters>({});
  const [draftFilters, setDraftFilters] = useState<OrganizationMemberFilters>({});
  const [filtersOpened, setFiltersOpened] = useState(false);
  const [employees, setEmployees] = useState<SuperadminPaginatedResponse<SuperadminEmployee> | null>(null);
  const [agendaLoading, setAgendaLoading] = useState(true);
  const [agendaError, setAgendaError] = useState<string | null>(null);
  const [agendaSearch, setAgendaSearch] = useState("");
  const [agendaQuery] = useDebouncedValue(agendaSearch, 350);
  const [agendaStatus, setAgendaStatus] = useState<"ACTIVE" | "ARCHIVED" | undefined>();
  const [agendaPage, setAgendaPage] = useState(1);
  const [agendaLimit, setAgendaLimit] = useState(25);
  const [roleMember, setRoleMember] = useState<OrganizationMember | null>(null);
  const [nextRole, setNextRole] = useState<UpdateMemberRoleInput["role"]>("EMPLOYEE");
  const [assignedBusinessIds, setAssignedBusinessIds] = useState<string[]>([]);
  const [linkOpened, setLinkOpened] = useState(false);
  const [linkMember, setLinkMember] = useState<OrganizationMember | null>(null);
  const [linkBusinessId, setLinkBusinessId] = useState<string | null>(null);
  const [color, setColor] = useState("#6C5CE7");
  const [lookupSearch, setLookupSearch] = useState("");
  const [lookupQuery] = useDebouncedValue(lookupSearch, 350);
  const [lookupPage, setLookupPage] = useState(1);
  const [lookup, setLookup] = useState<SuperadminPaginatedResponse<OrganizationMember> | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const submitting = useRef(false);
  const [selectedEmployee, setSelectedEmployee] = useState<{ id: string; name: string; active: boolean; businessName: string; businessId: string } | null>(null);
  const [transferOwnerMember, setTransferOwnerMember] = useState<OrganizationMember | null>(null);
  const [ownerCandidates, setOwnerCandidates] = useState<OrganizationMember[]>([]);
  const [selectedNewOwnerId, setSelectedNewOwnerId] = useState<string | null>(null);
  const [ownerCandidatesLoading, setOwnerCandidatesLoading] = useState(false);
  const [ownerTransferError, setOwnerTransferError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void Promise.all([staffAuth.me(), loadBusinessOptions(organizationId)]).then(([actor, options]) => {
      if (active) { setProfile(actor); setBusinesses(options); setContextError(null); }
    }).catch((error: unknown) => { if (active) { setProfile(null); setContextError(errorMessage(error)); } });
    return () => { active = false; };
  }, [organizationId, contextVersion]);

  useEffect(() => {
    let active = true;
    if (search !== query) return;
    void superadminApi.listMembers(organizationId, { ...filters, search: query.trim() || undefined, limit, offset: (page - 1) * limit }).then((response) => {
      if (!active) return;
      const lastPage = Math.max(1, Math.ceil(response.pagination.total / limit));
      if (page > lastPage) { setPage(lastPage); return; }
      setData(response); setMembersError(null);
    }).catch((error: unknown) => { if (active) { setData(null); setMembersError(errorMessage(error)); if (error instanceof ApiError && error.status === 403) { setProfile(null); setContextVersion((v) => v + 1); } } })
      .finally(() => { if (active) setMembersLoading(false); });
    return () => { active = false; };
  }, [organizationId, filters, search, query, page, limit, revision]);

  useEffect(() => {
    let active = true;
    if (agendaSearch !== agendaQuery) return;
    void superadminApi.listBusinessEmployees(organizationId, business.id, { search: agendaQuery.trim() || undefined, status: agendaStatus, limit: agendaLimit, offset: (agendaPage - 1) * agendaLimit }).then((response) => {
      if (!active) return;
      const lastPage = Math.max(1, Math.ceil(response.pagination.total / agendaLimit));
      if (agendaPage > lastPage) { setAgendaPage(lastPage); return; }
      setEmployees(response); setAgendaError(null);
    }).catch((error: unknown) => { if (active) { setEmployees(null); setAgendaError(errorMessage(error)); } })
      .finally(() => { if (active) setAgendaLoading(false); });
    return () => { active = false; };
  }, [organizationId, business.id, agendaSearch, agendaQuery, agendaStatus, agendaLimit, agendaPage, revision]);

  useEffect(() => {
    if (!linkOpened || linkMember || lookupSearch !== lookupQuery) return;
    let active = true;
    void superadminApi.listMembers(organizationId, { search: lookupQuery.trim() || undefined, status: "ACTIVE", limit: 25, offset: (lookupPage - 1) * 25 }).then((response) => { if (active) setLookup(response); })
      .catch((error: unknown) => { if (active) { setLookup(null); setDialogError(errorMessage(error)); } })
      .finally(() => { if (active) setLookupLoading(false); });
    return () => { active = false; };
  }, [organizationId, linkOpened, linkMember, lookupSearch, lookupQuery, lookupPage]);

  const canManage = Boolean(profile?.isSuperadmin && organizationActive && !contextError && !membersError);
  const actor = { id: profile?.id ?? "", isSuperadmin: Boolean(profile?.isSuperadmin) };

  function reload() {
    setMembersLoading(true); setAgendaLoading(true); setRevision((value) => value + 1);
  }

  function reconcile(status: number) {
    reload(); onChanged();
    if (status === 403) { setProfile(null); setContextVersion((v) => v + 1); }
  }

  function chooseMember(member: OrganizationMember) {
    setLinkMember(member);
    const options = linkableBusinesses(member);
    setLinkBusinessId(options.find((option) => option.id === business.id)?.id ?? options[0]?.id ?? null);
  }

  function openRoleEditor(member: OrganizationMember) {
    setRoleMember(member);
    setNextRole(member.role as UpdateMemberRoleInput["role"]);
    setAssignedBusinessIds(member.businesses.filter((item) => item.explicitlyAssigned && item.status === "ACTIVE").map((item) => item.id));
    setDialogError(null);
  }

  function openLink(member?: OrganizationMember) {
    setDialogError(null); setLookupSearch(""); setLookupPage(1); setLookup(null); setLookupLoading(true);
    setColor("#6C5CE7"); setLinkOpened(true);
    if (member) chooseMember(member); else { setLinkMember(null); setLinkBusinessId(null); }
  }

  async function openOwnerTransfer(owner: OrganizationMember) {
    setTransferOwnerMember(owner);
    setOwnerCandidates([]);
    setSelectedNewOwnerId(null);
    setOwnerTransferError(null);
    setOwnerCandidatesLoading(true);
    try {
      const allMembers: OrganizationMember[] = [];
      let offset = 0;
      let total = 0;
      do {
        const response = await superadminApi.listMembers(organizationId, { status: "ACTIVE", limit: 100, offset });
        allMembers.push(...response.items);
        total = response.pagination.total;
        if (!response.items.length) break;
        offset += response.items.length;
      } while (offset < total);
      setOwnerCandidates(allMembers.filter((member) => member.membershipId !== owner.membershipId && member.userStatus === "ACTIVE" && ["ADMIN", "MANAGER", "EMPLOYEE"].includes(member.role)));
    } catch (error) {
      setOwnerTransferError(errorMessage(error));
    } finally {
      setOwnerCandidatesLoading(false);
    }
  }

  async function transferOwnership() {
    if (!canManage || !transferOwnerMember || !selectedNewOwnerId || submitting.current) return;
    submitting.current = true;
    setSaving(true);
    setOwnerTransferError(null);
    try {
      await superadminApi.transferOwnership(organizationId, {
        currentOwnerMembershipId: transferOwnerMember.membershipId,
        newOwnerMembershipId: selectedNewOwnerId,
      });
      const newOwner = ownerCandidates.find((member) => member.membershipId === selectedNewOwnerId);
      setTransferOwnerMember(null);
      notifications.show({ title: "Propiedad transferida", message: `${newOwner ? memberName(newOwner) : "El nuevo propietario"} ahora es propietario. ${memberName(transferOwnerMember)} conserva acceso como administrador.`, color: "green", icon: <CircleCheck size={18} />, autoClose: 15000, classNames: { root: "platform-create-notification" } });
      reconcile(200);
    } catch (error) {
      const status = error instanceof ApiError ? error.status : 0;
      const message = errorMessage(error);
      if ([403, 404, 409].includes(status) || status === 0 || status >= 500) {
        setTransferOwnerMember(null);
        reconcile(status);
        notifications.show({ title: "No se pudo transferir la propiedad", message, color: "red", autoClose: 15000 });
      } else setOwnerTransferError(message);
    } finally {
      submitting.current = false;
      setSaving(false);
    }
  }

  async function mutate(kind: "role" | "link") {
    if (submitting.current || !canManage) return;
    if (kind === "role" && (!roleMember || !editableMemberRoles(roleMember, actor).includes(nextRole))) return;
    if (kind === "link" && (!linkMember || !linkableBusinesses(linkMember).some((item) => item.id === linkBusinessId))) return;
    submitting.current = true; setSaving(true); setDialogError(null);
    let affectedUserId: string | undefined;
    try {
      if (kind === "role" && roleMember) {
        await superadminApi.updateMemberRole(organizationId, roleMember.membershipId, roleChangeInput(roleMember, nextRole, assignedBusinessIds));
        affectedUserId = roleMember.userId;
      } else if (kind === "link" && linkMember && linkBusinessId) {
        await superadminApi.linkMemberToAgenda(organizationId, linkBusinessId, { userId: linkMember.userId, color });
        affectedUserId = linkMember.userId;
      }
      setRoleMember(null); setLinkOpened(false);
      notifications.show({ title: "Cambios guardados", message: kind === "role" ? "El rol se ha actualizado en toda la organización." : "Usuario añadido como empleado. Conserva su cuenta y su rol.", color: "green", icon: <CircleCheck size={18} />, autoClose: 15000, classNames: { root: "platform-create-notification" } });
      reconcile(200);
      if (affectedUserId === profile?.id) { setProfile(null); setContextVersion((v) => v + 1); }
    } catch (error) {
      const status = error instanceof ApiError ? error.status : 0;
      const message = errorMessage(error);
      if ([403, 404, 409].includes(status) || status === 0 || status >= 500) {
        setRoleMember(null); setLinkOpened(false); reconcile(status);
        notifications.show({ title: "No se pudo confirmar el cambio", message, color: "red", autoClose: 15000 });
      } else setDialogError(message);
    } finally { submitting.current = false; setSaving(false); }
  }

  function showEmployee(member: OrganizationMember, item: OrganizationMember["businesses"][number]) {
    if (item.employeeId) setSelectedEmployee({ id: item.employeeId, name: memberName(member), active: Boolean(item.employeeIsActive), businessName: item.name, businessId: item.id });
  }

  const lookupOptions = lookup?.items.filter((member) => linkableBusinesses(member).length > 0) ?? [];

  return <Paper p="lg" radius="lg" withBorder><Stack gap="lg">
    <Group justify="space-between"><div><Title order={2}>Equipo y accesos</Title><Text size="sm" c="dimmed">Gestiona los usuarios de {organizationName}, sus permisos y los empleados que atienden citas en cada empresa.</Text></div>
      <Group><Button variant="default" leftSection={<UserPlus size={16} />} disabled={!canManage || saving} onClick={() => openLink()}>Añadir usuario como empleado</Button><PlatformCreateAction kind="employee" organizationId={organizationId} businessId={business.id} contextName={business.name} disabled={!canManage || business.status !== "ACTIVE" || saving} onCreated={() => reconcile(200)} onReconcile={reconcile} /></Group>
    </Group>
    {contextError && <Alert color="red" title="No se pudieron comprobar los permisos">{contextError}<Button variant="subtle" onClick={() => setContextVersion((v) => v + 1)}>Reintentar</Button></Alert>}
    {!organizationActive && <Alert color="yellow">La organización está suspendida. Puedes consultar el equipo, pero no modificarlo.</Alert>}
    <Tabs value={tab} onChange={setTab}><Tabs.List><Tabs.Tab value="members">Usuarios y permisos</Tabs.Tab><Tabs.Tab value="agenda">Empleados</Tabs.Tab></Tabs.List>
      <Tabs.Panel value="members" pt="lg"><Stack>
        <Text size="sm" c="dimmed">Gestiona quién puede entrar y qué puede hacer en la organización, incluidos propietarios y administradores que no atienden citas.</Text>
        <Group justify="space-between"><TextInput aria-label="Buscar usuarios" placeholder="Escribe aquí" leftSection={<Search size={16} />} value={search} onChange={(event) => { setSearch(event.currentTarget.value); setPage(1); setMembersLoading(true); }} />
          <Popover opened={filtersOpened} onChange={setFiltersOpened} position="bottom-end" width={290} shadow="md"><Popover.Target><Button variant="default" leftSection={<SlidersHorizontal size={16} />} onClick={() => { setDraftFilters(filters); setFiltersOpened(!filtersOpened); }}>Filtros</Button></Popover.Target><Popover.Dropdown><Stack>
            <Select label="Rol" clearable data={Object.entries(memberRoleLabels).map(([value, label]) => ({ value, label }))} value={draftFilters.role ?? null} onChange={(value) => setDraftFilters((current) => ({ ...current, role: value as OrganizationMember["role"] | undefined || undefined }))} />
            <Select label="Vinculación con la organización" clearable data={[{ value: "ACTIVE", label: "Activa" }, { value: "INVITED", label: "Invitada" }, { value: "SUSPENDED", label: "Suspendida" }]} value={draftFilters.status ?? null} onChange={(value) => setDraftFilters((current) => ({ ...current, status: value as OrganizationMember["status"] | undefined || undefined }))} />
            <Select label="Con acceso a la empresa" searchable clearable data={businesses.map((item) => ({ value: item.id, label: item.name }))} value={draftFilters.businessId ?? null} onChange={(value) => setDraftFilters((current) => ({ ...current, businessId: value ?? undefined }))} />
            <Group justify="space-between"><Button variant="subtle" onClick={() => { setFilters({}); setDraftFilters({}); setPage(1); setMembersLoading(true); setFiltersOpened(false); }}>Restablecer</Button><Button onClick={() => { setFilters(draftFilters); setPage(1); setMembersLoading(true); setFiltersOpened(false); }}>Aplicar</Button></Group>
          </Stack></Popover.Dropdown></Popover>
        </Group>
        {membersError && <Alert color="red" icon={<CircleAlert size={18} />}>{membersError}<Button variant="subtle" onClick={reload}>Reintentar</Button></Alert>}
        {membersLoading ? <Skeleton height={160} /> : data && <>
          <Table.ScrollContainer minWidth={960}><Table verticalSpacing="sm" highlightOnHover><Table.Thead><Table.Tr><Table.Th>Nombre y correo</Table.Th><Table.Th>Rol</Table.Th><Table.Th>Estados</Table.Th><Table.Th>Empresas accesibles</Table.Th><Table.Th>Atiende citas</Table.Th><Table.Th>Opciones</Table.Th></Table.Tr></Table.Thead><Table.Tbody>
            {data.items.map((member) => { const employeeProfiles = member.businesses.filter((item) => item.employeeId); const canUpdateRole = canManage && editableMemberRoles(member, actor).length > 0; const canAddEmployee = canManage && linkableBusinesses(member).length > 0; const canTransferOwnership = canManage && member.role === "OWNER"; const canSuspendMember = canManage && canChangeMemberStatus(member, actor); const canManageBusinesses = canManage && canManageMemberBusinesses(member, actor); const canChangeEmail = canManage && actor.isSuperadmin && member.userStatus === "ACTIVE"; const canManageAccess = canUpdateRole || canAddEmployee || canSuspendMember || canManageBusinesses || canChangeEmail; const accessActionCount = Number(canSuspendMember) + Number(canManageBusinesses) + Number(canChangeEmail); const secondaryOptionCount = (employeeProfiles.length > 1 ? employeeProfiles.length : 0) + Number(canUpdateRole) + Number(canAddEmployee) + Number(canTransferOwnership) + accessActionCount; const totalOptionCount = (employeeProfiles.length === 1 ? 1 : 0) + secondaryOptionCount; const showMenu = totalOptionCount > 1; const splitView = employeeProfiles.length === 1 && showMenu; return <Table.Tr key={member.membershipId}>
              <Table.Td><Text size="sm" fw={600}>{memberName(member)}</Text><Text size="xs" c="dimmed">{member.email}</Text></Table.Td>
              <Table.Td><Badge variant="light">{memberRoleLabels[member.role]}</Badge></Table.Td>
              <Table.Td><Text size="sm">Vinculación: {memberStatusLabel(member.status)}</Text><Text size="xs" c="dimmed">Cuenta: {memberStatusLabel(member.userStatus)}</Text></Table.Td>
              <Table.Td>{member.businesses.some((item) => item.hasAccess) ? member.businesses.filter((item) => item.hasAccess).map((item) => <Text key={item.id} size="sm">{item.name}</Text>) : <Text size="sm" c="dimmed">Sin empresas accesibles</Text>}</Table.Td>
              <Table.Td>{member.businesses.length ? member.businesses.map((item) => <Text key={item.id} size="xs">{item.name}: {item.attendsAppointments ? "Sí" : item.employeeId ? "Permiso de agenda revocado" : "No"}</Text>) : <Text size="sm" c="dimmed">No figura como empleado</Text>}</Table.Td>
              <Table.Td><Group className={splitView ? "platform-options-group platform-options-group--split" : "platform-options-group"} gap={0} wrap="nowrap">{employeeProfiles.length === 1 && <Button size="xs" variant="default" leftSection={<Eye size={14} />} onClick={() => showEmployee(member, employeeProfiles[0])}>Ver</Button>}{showMenu && <Menu keepMounted position="bottom-end" shadow="md" width={250} withinPortal><Menu.Target>{splitView ? <ActionIcon size="sm" variant="default" aria-label="Más opciones" title="Más opciones"><ChevronDown size={16} /></ActionIcon> : <Button size="xs" variant="default" rightSection={<ChevronDown size={14} />}>{employeeProfiles.length > 1 ? "Ver" : "Gestionar"}</Button>}</Menu.Target><Menu.Dropdown>{employeeProfiles.length > 1 && employeeProfiles.map((item) => <Menu.Item key={item.employeeId} leftSection={<Eye size={15} />} onClick={() => showEmployee(member, item)}>Ver empleado · {item.name}</Menu.Item>)}{employeeProfiles.length > 1 && (canManageAccess || canTransferOwnership) && <Menu.Divider />}{canUpdateRole && <Menu.Item disabled={saving} leftSection={<UserCog size={15} />} onClick={() => openRoleEditor(member)}>Cambiar rol</Menu.Item>}{canAddEmployee && <Menu.Item disabled={saving} leftSection={<UserPlus size={15} />} onClick={() => openLink(member)}>Añadir como empleado</Menu.Item>}{canTransferOwnership && <Menu.Item disabled={saving} leftSection={<Crown size={15} />} onClick={() => void openOwnerTransfer(member)}>Transferir propiedad</Menu.Item>}{canManageAccess && <MemberAccessActions organizationId={organizationId} organizationName={organizationName} member={member} businesses={businesses} actor={actor} onChanged={(status) => { reconcile(status); if (member.userId === profile?.id) { setProfile(null); setContextVersion((value) => value + 1); } }} />}</Menu.Dropdown></Menu>}{!showMenu && totalOptionCount === 1 && employeeProfiles.length === 0 && canUpdateRole && <Button size="xs" variant="default" leftSection={<UserCog size={14} />} onClick={() => openRoleEditor(member)}>Cambiar rol</Button>}{!showMenu && totalOptionCount === 1 && employeeProfiles.length === 0 && !canUpdateRole && canAddEmployee && <Button size="xs" variant="default" leftSection={<UserPlus size={14} />} onClick={() => openLink(member)}>Añadir como empleado</Button>}{!showMenu && totalOptionCount === 1 && employeeProfiles.length === 0 && !canUpdateRole && !canAddEmployee && canTransferOwnership && <Button size="xs" variant="default" leftSection={<Crown size={14} />} onClick={() => void openOwnerTransfer(member)}>Transferir propiedad</Button>}{!showMenu && totalOptionCount === 1 && employeeProfiles.length === 0 && accessActionCount === 1 && !canUpdateRole && !canAddEmployee && !canTransferOwnership && <MemberAccessActions standalone organizationId={organizationId} organizationName={organizationName} member={member} businesses={businesses} actor={actor} onChanged={(status) => { reconcile(status); if (member.userId === profile?.id) { setProfile(null); setContextVersion((value) => value + 1); } }} />}{totalOptionCount === 0 && <Text c="dimmed" size="xs">Sin opciones</Text>}</Group></Table.Td>
            </Table.Tr>; })}
          </Table.Tbody></Table></Table.ScrollContainer>
          {!data.items.length && <Text ta="center" c="dimmed" py="lg">No hay usuarios que coincidan con estos filtros.</Text>}
          <Pager total={data.pagination.total} page={page} limit={limit} onPage={(value) => { setPage(value); setMembersLoading(true); }} onLimit={(value) => { setLimit(value); setPage(1); setMembersLoading(true); }} />
        </>}
      </Stack></Tabs.Panel>
      <Tabs.Panel className="platform-agenda-panel" value="agenda" pt="lg"><Stack>
        <Text size="sm">Gestiona quién puede atender citas en {business.name}, tenga o no acceso al panel. Revocar el permiso de agenda no modifica sus permisos de usuario.</Text>
        <Group justify="space-between"><TextInput aria-label="Buscar empleados" placeholder="Escribe aquí" leftSection={<Search size={16} />} value={agendaSearch} onChange={(event) => { setAgendaSearch(event.currentTarget.value); setAgendaPage(1); setAgendaLoading(true); }} />
          <Popover position="bottom-end" width={250} shadow="md"><Popover.Target><Button variant="default" leftSection={<SlidersHorizontal size={16} />}>Filtros</Button></Popover.Target><Popover.Dropdown><Select label="Permiso para atender citas" clearable data={[{ value: "ACTIVE", label: "Puede atender citas" }, { value: "ARCHIVED", label: "Permiso de agenda revocado" }]} value={agendaStatus ?? null} onChange={(value) => { setAgendaStatus(value as typeof agendaStatus || undefined); setAgendaPage(1); setAgendaLoading(true); }} /></Popover.Dropdown></Popover>
        </Group>
        {agendaError && <Alert color="red">{agendaError}<Button variant="subtle" onClick={reload}>Reintentar</Button></Alert>}
        {agendaLoading ? <Skeleton height={160} /> : employees && <>
          <Table.ScrollContainer minWidth={630}><Table verticalSpacing="sm"><Table.Thead><Table.Tr><Table.Th>Empleado</Table.Th><Table.Th>Contacto</Table.Th><Table.Th>Permiso de agenda</Table.Th><Table.Th>Opciones</Table.Th></Table.Tr></Table.Thead><Table.Tbody>{employees.items.map((employee) => <Table.Tr key={employee.id}><Table.Td><Group gap="xs"><span aria-label="Color en la agenda" style={{ display: "inline-block", width: 14, height: 14, borderRadius: "50%", backgroundColor: employee.color ?? "#64748B" }} /><Text size="sm">{employee.firstName} {employee.lastName}</Text></Group></Table.Td><Table.Td><Text size="sm">{employee.email ?? "Sin correo"}</Text><Text size="xs" c="dimmed">{employee.phone ?? "Sin teléfono"}</Text>{employee.userId === null && <Badge color="gray" variant="light" size="xs">Sin acceso al panel</Badge>}</Table.Td><Table.Td><Badge color={employee.isActive ? "teal" : "gray"} variant="light">{employee.isActive ? "Puede atender citas" : "Permiso revocado"}</Badge></Table.Td><Table.Td><Button size="xs" variant="subtle" leftSection={<Eye size={14} />} onClick={() => setSelectedEmployee({ id: employee.id, name: `${employee.firstName} ${employee.lastName}`, active: employee.isActive, businessName: business.name, businessId: business.id })}>Ver</Button></Table.Td></Table.Tr>)}</Table.Tbody></Table></Table.ScrollContainer>
          {!employees.items.length && <Text ta="center" c="dimmed" py="lg">No hay empleados que coincidan con estos filtros.</Text>}
          <Text size="xs" c="dimmed">Los empleados sin usuario vinculado se muestran como «Sin acceso al panel». Consulta los permisos de los demás en «Usuarios y permisos».</Text>
          <Pager total={employees.pagination.total} page={agendaPage} limit={agendaLimit} onPage={(value) => { setAgendaPage(value); setAgendaLoading(true); }} onLimit={(value) => { setAgendaLimit(value); setAgendaPage(1); setAgendaLoading(true); }} />
        </>}
      </Stack></Tabs.Panel>
    </Tabs>
    <Modal centered opened={Boolean(roleMember)} onClose={() => { if (!submitting.current) setRoleMember(null); }} title="Cambiar rol" closeOnClickOutside={!saving} closeOnEscape={!saving} withCloseButton={!saving}>
      {roleMember && <Stack><Text fw={600}>{memberName(roleMember)}</Text><Alert color="yellow">Este cambio afecta a toda la organización {organizationName}, no solo a {business.name}. No modifica su registro como empleado.</Alert>
        {dialogError && <Alert color="red">{dialogError}</Alert>}
        <Select label="Nuevo rol" allowDeselect={false} disabled={saving} value={nextRole} data={editableMemberRoles(roleMember, actor).map((value) => ({ value, label: memberRoleLabels[value] }))} onChange={(value) => { if (value) setNextRole(value as typeof nextRole); }} />
        {nextRole === "ADMIN" && <Text size="sm">Tendrá acceso a todas las empresas activas de la organización.</Text>}
        {roleMember.role === "ADMIN" && nextRole !== "ADMIN" && <><MultiSelect label="Empresas que conservará" description="Si no seleccionas ninguna, quedará sin empresas asignadas." searchable disabled={saving} data={businesses.filter((item) => item.status === "ACTIVE").map((item) => ({ value: item.id, label: item.name }))} value={assignedBusinessIds} onChange={setAssignedBusinessIds} />{assignedBusinessIds.length === 0 && <Alert color="yellow">La persona dejará de tener acceso a todas las empresas.</Alert>}</>}
        <Group justify="flex-end"><Button variant="default" disabled={saving} onClick={() => setRoleMember(null)}>Cancelar</Button><Button loading={saving} disabled={!canManage || nextRole === roleMember.role} onClick={() => void mutate("role")}>Confirmar cambio</Button></Group>
      </Stack>}
    </Modal>
    <Modal centered size="lg" opened={linkOpened} onClose={() => { if (!submitting.current) setLinkOpened(false); }} title="Añadir usuario como empleado" closeOnClickOutside={!saving} closeOnEscape={!saving} withCloseButton={!saving}>
      <Stack><Text size="sm" c="dimmed">Selecciona un usuario de la organización y una empresa a la que tenga acceso para añadirlo como empleado. Conservará su cuenta, contraseña y rol.</Text>{dialogError && <Alert color="red">{dialogError}</Alert>}
        {!linkMember ? <><TextInput label="Buscar usuario" placeholder="Escribe aquí" value={lookupSearch} onChange={(event) => { setLookupSearch(event.currentTarget.value); setLookupPage(1); setLookupLoading(true); }} />{lookupLoading ? <Skeleton height={90} /> : <><Stack gap="xs">{lookupOptions.map((member) => <Button key={member.membershipId} variant="light" onClick={() => chooseMember(member)}>{memberName(member)} · {member.email}</Button>)}</Stack>{!lookupOptions.length && <Text size="sm" c="dimmed">No hay usuarios disponibles para añadir como empleados en esta página. Prueba otra búsqueda o página. Si ya figuran como empleados, puedes consultarlos desde «Usuarios y permisos».</Text>}<Pagination size="sm" withEdges total={Math.max(1, Math.ceil((lookup?.pagination.total ?? 0) / 25))} value={lookupPage} onChange={(value) => { setLookupPage(value); setLookupLoading(true); }} /></>}</>
          : <><Group justify="space-between"><div><Text fw={600}>{memberName(linkMember)}</Text><Text size="sm" c="dimmed">{linkMember.email} · {memberRoleLabels[linkMember.role]}</Text></div></Group>
            <Select label="Empresa" searchable allowDeselect={false} disabled={saving} value={linkBusinessId} onChange={setLinkBusinessId} data={linkableBusinesses(linkMember).map((item) => ({ value: item.id, label: item.name }))} />
            <ColorInput label="Color en la agenda" format="hex" value={color} onChange={setColor} disallowInput withPreview withEyeDropper={false} disabled={saving} swatches={["#6C5CE7", "#3B82F6", "#2DD4BF", "#16A34A", "#F59E0B", "#EF4444", "#EC4899"]} />
            <Group justify="flex-end"><Button variant="default" disabled={saving} onClick={() => setLinkOpened(false)}>Cancelar</Button><Button loading={saving} disabled={!canManage || !linkBusinessId} onClick={() => void mutate("link")}>Añadir como empleado</Button></Group>
          </>}
      </Stack>
    </Modal>
    <Modal centered opened={Boolean(transferOwnerMember)} onClose={() => { if (!submitting.current) setTransferOwnerMember(null); }} title="Transferir propiedad" closeOnClickOutside={!saving} closeOnEscape={!saving} withCloseButton={!saving}>
      {transferOwnerMember && <Stack><Text fw={600}>Propietario actual: {memberName(transferOwnerMember)}</Text><Text size="sm" c="dimmed">Elige a un miembro activo de {organizationName}. Solo puede haber un propietario: al confirmar, la persona elegida pasará a OWNER y el propietario actual conservará su cuenta como ADMIN.</Text>
        {ownerTransferError && <Alert color="red">{ownerTransferError}</Alert>}
        {ownerCandidatesLoading ? <Skeleton height={58} /> : ownerCandidates.length ? <Select searchable label="Nuevo propietario" placeholder="Selecciona una persona" data={ownerCandidates.map((member) => ({ value: member.membershipId, label: `${memberName(member)} · ${member.email} · ${memberRoleLabels[member.role]}` }))} value={selectedNewOwnerId} onChange={setSelectedNewOwnerId} disabled={saving} /> : !ownerTransferError && <Alert color="yellow">No hay otros miembros activos y aptos para recibir la propiedad. Añade primero una persona a la organización.</Alert>}
        <Alert color="yellow" title="Confirma antes de continuar">La transferencia afecta a toda la organización y no crea un segundo propietario. El cambio quedará registrado en auditoría.</Alert>
        <Group justify="flex-end"><Button variant="default" disabled={saving} onClick={() => setTransferOwnerMember(null)}>Cancelar</Button><Button color="violet" leftSection={<Crown size={16} />} loading={saving} disabled={!canManage || ownerCandidatesLoading || !selectedNewOwnerId} onClick={() => void transferOwnership()}>Confirmar transferencia</Button></Group>
      </Stack>}
    </Modal>
    {selectedEmployee && <PlatformEmployeeModal key={selectedEmployee.id} organizationId={organizationId} businessId={selectedEmployee.businessId} businessName={selectedEmployee.businessName} employeeId={selectedEmployee.id} canEdit={canManage && businesses.some((item) => item.id === selectedEmployee.businessId && item.status === "ACTIVE")} onClose={() => setSelectedEmployee(null)} onChanged={reconcile} />}
  </Stack></Paper>;
}
