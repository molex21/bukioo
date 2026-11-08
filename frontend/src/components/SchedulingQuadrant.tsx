import {
  Alert,
  Button,
  Checkbox,
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
  TextInput,
} from "@mantine/core";
import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import {
  isScheduleDate,
  schedulePage,
  updateScheduleSearch,
} from "../lib/scheduling-view";
import { ApiError } from "../lib/api-client";
import { workspaceBusinessesApi } from "../lib/workspace-businesses-api";
import type { WorkspaceEmployee } from "../lib/workspace-employees-api";
import {
  schedulingApi,
  type ScheduleDay,
  type ScheduleQuadrant,
  type ShiftTemplate,
} from "../lib/scheduling-api";
import { addCalendarDays, dateInZone, weekDates } from "../lib/team-quadrant";
import { EmployeeAvatar } from "./EmployeeAvatar";
import { ScheduleDayEditor } from "./ScheduleDayEditor";
import { absenceTypes } from "../lib/scheduling-api";
import { ScheduleAssignmentEditor } from "./ScheduleAssignmentEditor";
import { ScheduleTemplateManager } from "./ScheduleTemplateManager";
import { ScheduleDatesEditor } from "./ScheduleDatesEditor";
import { formatWorkMinutes } from "../lib/schedule-editor";
import "./Scheduling.css";

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
  | {
      type: "dates";
      days: ScheduleDay[];
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
  const [params, setParams] = useSearchParams();
  const requestedWeek = params.get("week");
  const week = isScheduleDate(requestedWeek) ? requestedWeek : null;
  const page = schedulePage(params.get("teamPage"));
  const filter = employees.some((e) => e.id === params.get("employee"))
    ? params.get("employee")
    : null;
  const [version, setVersion] = useState(0);
  const updateView = (updates: Record<string, string | null>) =>
    setParams((current) => updateScheduleSearch(current, updates));
  const [data, setData] = useState<Data | null>(null),
    [error, setError] = useState<{ key: string; text: string } | null>(null);
  const [editor, setEditor] = useState<Editor | null>(null),
    [busy, setBusy] = useState(false);
  const [templateDirty, setTemplateDirty] = useState(false),
    [discardTemplate, setDiscardTemplate] = useState(false);
  const onTemplateDirty = useCallback(
    (dirty: boolean) => {
      setTemplateDirty(dirty);
      if (!dirty) setDiscardTemplate(false);
    },
    [setTemplateDirty, setDiscardTemplate],
  );
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
  const [selection, setSelection] = useState<{
    key: string;
    employeeId: string;
    dates: string[];
  }>({ key: "", employeeId: "", dates: [] });
  const selected =
    selection.key === key ? selection : { key, employeeId: "", dates: [] };
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
          week ?? dateInZone(new Date(), business.timezone),
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
  const mobileDay = current?.dates.includes(params.get("day") ?? "")
    ? params.get("day")!
    : (current?.dates.find(
        (day) => day === dateInZone(new Date(), current.quadrant.timezone),
      ) ?? current?.dates[0]);
  function moveWeek(offset: number) {
    if (current)
      updateView({
        week: addCalendarDays(current.dates[0], offset * 7),
        day: null,
        teamPage: null,
      });
  }
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
      <Stack gap={5} className="schedule-quadrant-summary">
        <Checkbox
          size="xs"
          label="Seleccionar"
          aria-label={`Seleccionar ${dateLabel(day)} de ${employee.first_name} ${employee.last_name}`}
          checked={
            selected.employeeId === employee.id && selected.dates.includes(day)
          }
          disabled={
            day < dateInZone(new Date(), timezone) ||
            (selected.dates.length > 0 && selected.employeeId !== employee.id)
          }
          onChange={(event) =>
            setSelection({
              key,
              employeeId: employee.id,
              dates: event.currentTarget.checked
                ? [...selected.dates, day]
                : selected.dates.filter((d) => d !== day),
            })
          }
        />
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
        {entry.blocks.map((block) => (
          <Text key={block.id} size="xs" fw={600}>
            {absenceTypes.find((item) => item.value === block.type)?.label ??
              "No disponible"}
          </Text>
        ))}
        <details className="schedule-quadrant-detail">
          <summary>Detalle del horario</summary>
          {entry.attention.length > 0 &&
            Number(entry.attentionMinutes) !==
              Number(entry.presenceMinutes) && (
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
            Presencia: {formatWorkMinutes(Number(entry.presenceMinutes))} ·
            Atención: {formatWorkMinutes(Number(entry.attentionMinutes))}
          </Text>
        </details>
        {entry.ambiguous && (
          <Text c="red" size="xs">
            Revisa las horas de este día.
          </Text>
        )}
        <Text size="xs" fw={600}>
          Trabajo estimado:{" "}
          {formatWorkMinutes(
            entry.workMinutes === null ? null : Number(entry.workMinutes),
          )}
        </Text>
        <Button
          size="xs"
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
        <div className="schedule-week-toolbar">
          <Button
            variant="default"
            aria-label="Semana anterior"
            disabled={!current}
            onClick={() => moveWeek(-1)}
          >
            <ChevronLeft size={18} aria-hidden="true" />
          </Button>
          <TextInput
            type="date"
            label="Semana que quieres consultar"
            leftSection={<CalendarDays size={16} aria-hidden="true" />}
            value={current?.dates[0] ?? week ?? ""}
            disabled={!current}
            onChange={(event) => {
              const value = event.currentTarget.value;
              if (isScheduleDate(value))
                updateView({
                  week: weekDates(value)[0],
                  day: null,
                  teamPage: null,
                });
            }}
          />
          <Button
            variant="light"
            onClick={() => {
              updateView({ week: null, day: null, teamPage: null });
              setVersion((value) => value + 1);
            }}
          >
            Hoy
          </Button>
          <Button
            variant="default"
            aria-label="Semana siguiente"
            disabled={!current}
            onClick={() => moveWeek(1)}
          >
            <ChevronRight size={18} aria-hidden="true" />
          </Button>
        </div>
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
            updateView({ employee: value, teamPage: null });
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
          <Group>
            <Text size="sm">
              Selecciona fechas de un empleado para aplicar plantillas o turnos
              juntos.
            </Text>
            {!!selected.dates.length && (
              <>
                <Text size="sm">
                  {selected.dates.length} días seleccionados
                </Text>
                <Button
                  variant="light"
                  onClick={() => {
                    const employee = current.quadrant.employees.find(
                      (e) => e.id === selected.employeeId,
                    );
                    if (employee)
                      setEditor({
                        type: "dates",
                        employee,
                        days: current.quadrant.days.filter(
                          (d) =>
                            d.employeeId === employee.id &&
                            selected.dates.includes(d.date),
                        ),
                      });
                  }}
                >
                  Editar días seleccionados
                </Button>
                <Button
                  variant="subtle"
                  onClick={() =>
                    setSelection({ key, employeeId: "", dates: [] })
                  }
                >
                  Quitar selección
                </Button>
              </>
            )}
          </Group>
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
                    <Table.Th scope="row">
                      {name(employee)}
                      <Text size="xs" mt="xs">
                        Semana:{" "}
                        {formatWorkMinutes(
                          current.quadrant.days
                            .filter((d) => d.employeeId === employee.id)
                            .some((d) => d.workMinutes === null)
                            ? null
                            : current.quadrant.days
                                .filter((d) => d.employeeId === employee.id)
                                .reduce(
                                  (sum, d) => sum + Number(d.workMinutes),
                                  0,
                                ),
                        )}
                      </Text>
                    </Table.Th>
                    {current.dates.map((day) => (
                      <Table.Td key={day}>{cell(employee, day)}</Table.Td>
                    ))}
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
          <Stack hiddenFrom="md">
            <Select
              label="Día del cuadrante"
              allowDeselect={false}
              value={mobileDay ?? null}
              data={current.dates.map((day) => ({
                value: day,
                label: dateLabel(day),
              }))}
              onChange={(value) => updateView({ day: value })}
            />
            {current.dates
              .filter((day) => day === mobileDay)
              .map((day) => (
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
              onChange={(value) =>
                updateView({ teamPage: value === 1 ? null : String(value) })
              }
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
            : editor?.type === "dates"
              ? `${editor.days.length} fechas · ${editor.employee.first_name}`
              : editor?.type === "templates"
                ? "Plantillas de turnos"
                : "Asignar un ciclo"
        }
        onClose={() => {
          if (!busy) {
            if (templateDirty) setDiscardTemplate(true);
            else setEditor(null);
          }
        }}
        closeOnEscape={!busy}
        closeOnClickOutside={!busy}
        withCloseButton={!busy}
      >
        {discardTemplate && editor !== null && (
          <Alert color="yellow" title="Hay cambios sin guardar" mb="md">
            <Group>
              <Button
                disabled={busy}
                color="red"
                onClick={() => {
                  setEditor(null);
                  setDiscardTemplate(false);
                  setTemplateDirty(false);
                }}
              >
                Descartar y cerrar
              </Button>
              <Button
                disabled={busy}
                variant="default"
                onClick={() => setDiscardTemplate(false)}
              >
                Seguir editando
              </Button>
            </Group>
          </Alert>
        )}
        {current && editor?.type === "dates" && (
          <ScheduleDatesEditor
            onDirtyChange={onTemplateDirty}
            key={`${editor.employee.id}:${editor.days.map((d) => d.date).join()}`}
            businessId={businessId}
            employee={editor.employee}
            days={editor.days}
            timezone={current.quadrant.timezone}
            templates={current.templates}
            onSaved={refresh}
            onBusy={setBusy}
          />
        )}
        {current && editor?.type === "day" && (
          <ScheduleDayEditor
            onDirtyChange={onTemplateDirty}
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
            onDirtyChange={onTemplateDirty}
            businessId={businessId}
            templates={current.templates}
            onSaved={() => setVersion((value) => value + 1)}
            onBusy={setBusy}
          />
        )}
        {current && editor?.type === "assign" && (
          <ScheduleAssignmentEditor
            onDirtyChange={onTemplateDirty}
            allEmployees={employees.filter(
              (employee) => employee.is_active && !employee.archived_at,
            )}
            onTemplateCreated={(template) =>
              setData((value) =>
                value?.key === key
                  ? {
                      ...value,
                      templates: [
                        ...value.templates.filter((t) => t.id !== template.id),
                        template,
                      ],
                    }
                  : value,
              )
            }
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
