import {
  Alert,
  Button,
  Group,
  Modal,
  Pagination,
  Paper,
  Select,
  Skeleton,
  Stack,
  Table,
  Text,
  Title,
} from "@mantine/core";
import { useEffect, useState } from "react";
import { ApiError } from "../lib/api-client";
import { workspaceBusinessesApi } from "../lib/workspace-businesses-api";
import type { WorkspaceEmployee } from "../lib/workspace-employees-api";
import {
  schedulingApi,
  type ScheduleDay,
  type ScheduleQuadrant,
  type ShiftTemplate,
} from "../lib/scheduling-api";
import { dateInZone, weekDates } from "../lib/team-quadrant";
import { EmployeeAvatar } from "./EmployeeAvatar";
import { ScheduleDayEditor } from "./ScheduleDayEditor";
import { absenceTypes } from "../lib/scheduling-api";
import { ScheduleAssignmentEditor } from "./ScheduleAssignmentEditor";
import { ScheduleTemplateManager } from "./ScheduleTemplateManager";

type Data = {
  key: string;
  quadrant: ScheduleQuadrant;
  templates: ShiftTemplate[];
  dates: string[];
};
type Editor =
  | {
      type: "day";
      day: ScheduleDay;
      employee: ScheduleQuadrant["employees"][number];
    }
  | { type: "templates" | "assign" };
export function SchedulingQuadrant({
  businessId,
  organizationId,
  employees,
}: {
  businessId: string;
  organizationId: string;
  employees: WorkspaceEmployee[];
}) {
  const [week, setWeek] = useState(0),
    [page, setPage] = useState(1),
    [filter, setFilter] = useState<string | null>(null),
    [version, setVersion] = useState(0);
  const [data, setData] = useState<Data | null>(null),
    [error, setError] = useState<{ key: string; text: string } | null>(null);
  const [editor, setEditor] = useState<Editor | null>(null),
    [busy, setBusy] = useState(false);
  const employeeKey = employees
    .map((item) => `${item.id}:${item.updated_at}`)
    .join();
  const key = JSON.stringify([
    businessId,
    organizationId,
    week,
    page,
    filter,
    version,
    employeeKey,
  ]);
  const current = data?.key === key ? data : null;
  const currentError = error?.key === key ? error.text : null;
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const businesses = await workspaceBusinessesApi.list(organizationId);
        if (!active) return;
        const business = businesses.find((item) => item.id === businessId);
        if (!business) throw new Error("La empresa ya no está disponible.");
        const dates = weekDates(
          dateInZone(new Date(), business.timezone),
          week,
        );
        const [quadrant, templates] = await Promise.all([
          schedulingApi.quadrant(businessId, dates[0], dates[6], filter, page),
          schedulingApi.templates(businessId),
        ]);
        if (active) {
          setData({ key, quadrant, templates, dates });
          setError(null);
        }
      } catch (requestError) {
        if (active)
          setError({
            key,
            text:
              requestError instanceof ApiError && requestError.status < 500
                ? requestError.message
                : "No se pudo cargar la planificación. Inténtalo de nuevo o consulta con quien administra la aplicación.",
          });
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [businessId, organizationId, week, page, filter, key]);
  function refresh() {
    setEditor(null);
    setVersion((value) => value + 1);
  }
  const dateLabel = (day: string) =>
    new Intl.DateTimeFormat("es", {
      timeZone: "UTC",
      weekday: "short",
      day: "numeric",
      month: "short",
    }).format(new Date(`${day}T12:00Z`));
  function cell(employee: ScheduleQuadrant["employees"][number], day: string) {
    if (!current) return null;
    const entry = current.quadrant.days.find(
      (item) => item.employeeId === employee.id && item.date === day,
    );
    if (!entry) return <Text size="sm">No disponible</Text>;
    const timezone = current.quadrant.timezone;
    const time = (instant: string) =>
      new Intl.DateTimeFormat("es", {
        timeZone: timezone,
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      }).format(new Date(instant));
    return (
      <Stack gap={5}>
        {entry.presence.length ? (
          entry.presence.map((span, index) => (
            <Text size="sm" fw={600} key={index}>
              {time(span.startAt)}–
              {dateInZone(new Date(span.endAt), timezone) > day
                ? "24:00"
                : time(span.endAt)}
            </Text>
          ))
        ) : (
          <Text size="sm" c="dimmed">
            Día libre
          </Text>
        )}
        {entry.attention.length > 0 &&
          Number(entry.attentionMinutes) !== Number(entry.presenceMinutes) && (
            <Stack gap={0}>
              <Text size="xs" c="dimmed">
                Atención prevista
              </Text>
              {entry.attention.map((span, index) => (
                <Text size="xs" key={index}>
                  {time(span.startAt)}–
                  {dateInZone(new Date(span.endAt), timezone) > day
                    ? "24:00"
                    : time(span.endAt)}
                </Text>
              ))}
            </Stack>
          )}
        {entry.blocks.map((block) => (
          <Text key={block.id} size="xs" c="orange">
            {absenceTypes.find((item) => item.value === block.type)?.label ??
              "No disponible"}
          </Text>
        ))}
        {entry.ambiguous && (
          <Text c="red" size="xs">
            Revisa este día: el cambio de hora afecta a los turnos.
          </Text>
        )}
        <Text c="dimmed" size="xs">
          {entry.origin === "exception"
            ? "Horario de este día"
            : entry.origin === "cycle"
              ? "Ciclo asignado"
              : "Horario habitual"}
        </Text>
        <Text c="dimmed" size="xs">
          Presencia: {(Number(entry.presenceMinutes) / 60).toFixed(1)} h ·
          Atención: {(Number(entry.attentionMinutes) / 60).toFixed(1)} h
        </Text>
        <Button
          size="compact-xs"
          variant="subtle"
          disabled={day < dateInZone(new Date(), timezone)}
          aria-label={`Editar ${employee.first_name} ${employee.last_name}, ${dateLabel(day)}`}
          onClick={() => setEditor({ type: "day", day: entry, employee })}
        >
          Editar día
        </Button>
      </Stack>
    );
  }
  const name = (employee: ScheduleQuadrant["employees"][number]) => (
    <Group gap="xs" wrap="nowrap">
      <EmployeeAvatar
        firstName={employee.first_name}
        lastName={employee.last_name}
        color={employee.color}
      />
      <Text fw={600} size="sm">
        {employee.first_name} {employee.last_name}
      </Text>
    </Group>
  );
  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Title order={2}>Cuadrante semanal</Title>
        <Group gap="xs">
          <Button
            variant="default"
            onClick={() => setWeek((value) => value - 1)}
          >
            Semana anterior
          </Button>
          <Button
            variant="light"
            onClick={() => {
              setWeek(0);
              setVersion((value) => value + 1);
            }}
          >
            Esta semana
          </Button>
          <Button
            variant="default"
            onClick={() => setWeek((value) => value + 1)}
          >
            Semana siguiente
          </Button>
        </Group>
      </Group>
      <Text c="dimmed" size="sm">
        Organiza turnos, pausas y ausencias. Las horas de atención indican el
        tiempo previsto para atender, no las citas libres ni las horas fichadas.
      </Text>
      <Group justify="space-between" align="flex-end">
        <Select
          label="Empleado"
          clearable
          searchable
          placeholder="Todos los empleados"
          value={filter}
          onChange={(value) => {
            setFilter(value);
            setPage(1);
          }}
          data={employees.map((item) => ({
            value: item.id,
            label: `${item.first_name} ${item.last_name}`,
          }))}
        />
        <Group>
          <Button
            variant="default"
            disabled={!current}
            onClick={() => setEditor({ type: "templates" })}
          >
            Plantillas
          </Button>
          <Button
            disabled={!current || !current.quadrant.employees.length}
            onClick={() => setEditor({ type: "assign" })}
          >
            Asignar ciclo
          </Button>
          <Button variant="subtle" onClick={refresh}>
            Actualizar
          </Button>
        </Group>
      </Group>
      {currentError ? (
        <Alert color="red" title="No se pudo cargar el cuadrante">
          {currentError}
        </Alert>
      ) : !current ? (
        <Skeleton height={240} />
      ) : (
        <>
          <Text fw={600}>
            {dateLabel(current.dates[0])} – {dateLabel(current.dates[6])} ·{" "}
            {current.quadrant.timezone}
          </Text>
          {!current.quadrant.employees.length && (
            <Text c="dimmed">No hay empleados para mostrar.</Text>
          )}
          <Table.ScrollContainer minWidth={1100} visibleFrom="md">
            <Table withTableBorder withColumnBorders verticalSpacing="sm">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Empleado</Table.Th>
                  {current.dates.map((day) => (
                    <Table.Th key={day}>{dateLabel(day)}</Table.Th>
                  ))}
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {current.quadrant.employees.map((employee) => (
                  <Table.Tr key={employee.id}>
                    <Table.Th scope="row">{name(employee)}</Table.Th>
                    {current.dates.map((day) => (
                      <Table.Td key={day}>{cell(employee, day)}</Table.Td>
                    ))}
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
          <Stack hiddenFrom="md">
            {current.dates.map((day) => (
              <Paper key={day} withBorder p="md">
                <Stack gap="md">
                  <Title order={3} size="h5">
                    {dateLabel(day)}
                  </Title>
                  {current.quadrant.employees.map((employee) => (
                    <Stack key={employee.id} gap="xs">
                      {name(employee)}
                      {cell(employee, day)}
                    </Stack>
                  ))}
                </Stack>
              </Paper>
            ))}
          </Stack>
          {current.quadrant.total > 10 && (
            <Pagination
              value={page}
              onChange={setPage}
              total={Math.ceil(current.quadrant.total / 10)}
              aria-label="Páginas de empleados"
            />
          )}
        </>
      )}
      <Modal
        centered
        size="xl"
        opened={editor !== null}
        title={
          editor?.type === "day"
            ? `Planificación del ${dateLabel(editor.day.date)} · ${editor.employee.first_name}`
            : editor?.type === "templates"
              ? "Plantillas de turnos"
              : "Asignar un ciclo"
        }
        onClose={() => {
          if (!busy) setEditor(null);
        }}
        closeOnEscape={!busy}
        closeOnClickOutside={!busy}
        withCloseButton={!busy}
      >
        {current && editor?.type === "day" && (
          <ScheduleDayEditor
            key={`${editor.employee.id}:${editor.day.date}:${editor.employee.version}`}
            businessId={businessId}
            employee={editor.employee}
            day={editor.day}
            timezone={current.quadrant.timezone}
            templates={current.templates}
            onSaved={refresh}
            onBusy={setBusy}
          />
        )}
        {current && editor?.type === "templates" && (
          <ScheduleTemplateManager
            businessId={businessId}
            templates={current.templates}
            onSaved={refresh}
            onBusy={setBusy}
          />
        )}
        {current && editor?.type === "assign" && (
          <ScheduleAssignmentEditor
            businessId={businessId}
            employees={current.quadrant.employees}
            templates={current.templates}
            timezone={current.quadrant.timezone}
            onSaved={refresh}
            onBusy={setBusy}
          />
        )}
      </Modal>
    </Stack>
  );
}
