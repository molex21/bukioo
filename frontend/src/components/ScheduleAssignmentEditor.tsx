import {
  Alert,
  Button,
  MultiSelect,
  Group,
  NumberInput,
  Select,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { useEffect, useRef, useState } from "react";
import { loadScheduleEmployeeVersions } from "../lib/schedule-selection";
import {
  schedulingApi,
  type ScheduleQuadrant,
  type ShiftTemplate,
} from "../lib/scheduling-api";
import type { WorkspaceEmployee } from "../lib/workspace-employees-api";
import { useUnsavedChanges } from "../hooks/useUnsavedChanges";
import { ScheduleChangeConfirm } from "./ScheduleChangeConfirm";
import { dateInZone } from "../lib/team-quadrant";
import { InlineRotationForm } from "./ScheduleTemplateLibrary";
import {
  rotationRangePreview,
  formatWorkMinutes,
  spanLabel,
} from "../lib/schedule-editor";

export function ScheduleAssignmentEditor({
  businessId,
  employees,
  templates: availableTemplates,
  timezone,
  onSaved,
  onBusy,
  onTemplateCreated,
  allEmployees,
  onDirtyChange,
}: {
  businessId: string;
  employees: ScheduleQuadrant["employees"];
  templates: ShiftTemplate[];
  timezone: string;
  onSaved: () => void;
  onBusy: (busy: boolean) => void;
  onTemplateCreated?: (template: ShiftTemplate) => void;
  allEmployees?: Pick<WorkspaceEmployee, "id" | "first_name" | "last_name">[];
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const today = dateInZone(new Date(), timezone);
  const [selected, setSelected] = useState<string[]>([]),
    [templateId, setTemplateId] = useState<string | null>(null);
  const [from, setFrom] = useState(today),
    [to, setTo] = useState(""),
    [busy, setBusy] = useState(false);
  const [phases, setPhases] = useState<Record<string, number>>({});
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState<ShiftTemplate[]>([]);
  const allTemplates = [
    ...new Map(
      [...availableTemplates, ...created].map((t) => [t.id, t]),
    ).values(),
  ];
  const templates = allTemplates.filter((item) => item.kind === "CYCLE");
  const template = templates.find((item) => item.id === templateId);
  const choices = allEmployees ?? employees;
  const [rotationDirty, setRotationDirty] = useState(false);
  const selectionKey = JSON.stringify([...selected].sort());
  const [versions, setVersions] = useState<{
    key: string;
    values: Record<string, number>;
    error?: string;
  } | null>(null);
  const versionRequests = useRef(
    new Map<string, Promise<{ id: string; version: number } | undefined>>(),
  );
  useEffect(() => {
    let active = true;
    const ids = JSON.parse(selectionKey) as string[];
    if (!ids.length) return;
    void loadScheduleEmployeeVersions(ids, (id) => {
      const key = `${businessId}:${id}`;
      let request = versionRequests.current.get(key);
      if (!request) {
        request = schedulingApi
          .quadrant(businessId, today, today, id, 1)
          .then((result) => result.employees.find((e) => e.id === id))
          .catch((error) => {
            versionRequests.current.delete(key);
            throw error;
          });
        versionRequests.current.set(key, request);
      }
      return request;
    }).then(
      (values) => {
        if (active)
          setVersions({
            key: `${businessId}:${selectionKey}`,
            values,
          });
      },
      () => {
        if (active)
          setVersions({
            key: `${businessId}:${selectionKey}`,
            values: {},
            error:
              "No se pudo comprobar el equipo seleccionado. Cierra y actualiza para intentarlo de nuevo.",
          });
      },
    );
    return () => {
      active = false;
    };
  }, [businessId, today, selectionKey]);
  const versionsReady =
    versions?.key === `${businessId}:${selectionKey}` && !versions.error;
  useUnsavedChanges(
    !!selected.length ||
      !!templateId ||
      from !== today ||
      !!to ||
      rotationDirty,
    onDirtyChange,
  );
  if (creating)
    return (
      <InlineRotationForm
        onDirtyChange={setRotationDirty}
        businessId={businessId}
        templates={allTemplates}
        onBusy={(value) => {
          setBusy(value);
          onBusy(value);
        }}
        onBack={() => setCreating(false)}
        onCreated={(saved) => {
          setCreated((items) => [...items, saved]);
          setTemplateId(saved.id);
          setPhases({});
          onTemplateCreated?.(saved);
        }}
      />
    );
  return (
    <Stack gap="md">
      <Text size="sm">
        Selecciona empleados y el intervalo en el que se repetirá la rotación.
        La copia asignada no cambia al editar la plantilla.
      </Text>
      {!templates.length && (
        <Alert color="yellow">
          Puedes crear la rotación aquí y después elegir los empleados y sus
          fechas.
        </Alert>
      )}
      <MultiSelect
        label="Empleados"
        description={`${selected.length} seleccionados · Puedes elegir hasta 50 personas de esta empresa.`}
        placeholder="Busca por nombre…"
        searchable
        clearable
        maxValues={50}
        limit={50}
        disabled={busy}
        value={selected}
        onChange={setSelected}
        data={choices.map((e) => ({
          value: e.id,
          label: `${e.first_name} ${e.last_name}`,
        }))}
      />
      {selected.length > 0 && !versionsReady && (
        <Text size="sm" role="status">
          {versions?.key === `${businessId}:${selectionKey}` && versions.error
            ? versions.error
            : "Comprobando el equipo seleccionado…"}
        </Text>
      )}
      <Select
        label="Plantilla"
        searchable
        value={templateId}
        disabled={busy}
        onChange={(value) => {
          setTemplateId(value);
          setPhases({});
        }}
        data={templates.map((item) => ({ value: item.id, label: item.name }))}
      />
      <Button variant="light" disabled={busy} onClick={() => setCreating(true)}>
        Crear rotación aquí
      </Button>
      <Group grow>
        <TextInput
          type="date"
          label="Desde"
          min={today}
          value={from}
          disabled={busy}
          onChange={(event) => setFrom(event.currentTarget.value)}
        />
        <TextInput
          type="date"
          label="Hasta, incluido"
          required
          min={from}
          value={to}
          disabled={busy}
          onChange={(event) => setTo(event.currentTarget.value)}
        />
      </Group>
      {template && template.pattern.length > 1 && (
        <details>
          <summary>Opciones de rotación</summary>
          <Stack mt="sm">
            {selected.map((id) => (
              <NumberInput
                key={id}
                label={`Semana inicial de ${choices.find((item) => item.id === id)?.first_name}`}
                description="Permite que cada empleado empiece en una semana distinta del ciclo."
                min={1}
                max={template.pattern.length}
                allowDecimal={false}
                value={(phases[id] ?? 0) + 1}
                disabled={busy}
                onChange={(value) => {
                  if (typeof value === "number")
                    setPhases((current) => ({ ...current, [id]: value - 1 }));
                }}
              />
            ))}
          </Stack>
        </details>
      )}
      {template &&
        selected.map((id) => {
          const estimate = rotationRangePreview(
            template.pattern,
            from,
            to,
            phases[id] ?? 0,
          );
          return estimate ? (
            <Alert
              color="blue"
              key={`summary:${id}`}
              title={choices.find((e) => e.id === id)?.first_name}
            >
              <Text size="sm">
                {estimate.count} días · Estimación nominal del intervalo:{" "}
                {formatWorkMinutes(estimate.totalMinutes)}. Las fechas con
                cambios de hora pueden tener distinta duración real.
              </Text>
              <details>
                <summary>
                  Ver días y semanas
                  {estimate.truncated ? " (primeros 42 días)" : ""}
                </summary>
                {estimate.days.map((d) => (
                  <Text size="xs" key={d.date}>
                    {new Date(`${d.date}T12:00Z`).toLocaleDateString("es", {
                      timeZone: "UTC",
                    })}{" "}
                    · Semana {d.week + 1}:{" "}
                    {d.spans.map(spanLabel).join(" · ") || "Día libre"}
                  </Text>
                ))}
              </details>
              <Text size="xs">
                El turno nocturno del último día termina como máximo a
                medianoche.
              </Text>
            </Alert>
          ) : null;
        })}
      {template &&
        selected.length > 0 &&
        versionsReady &&
        to >= from &&
        from >= today &&
        selected.every(
          (id) =>
            rotationRangePreview(
              template.pattern,
              from,
              to,
              phases[id] ?? 0,
            ) !== null,
        ) && (
          <ScheduleChangeConfirm
            reviewBeforeSave
            businessId={businessId}
            timezone={timezone}
            command={{
              type: "assignment",
              employeeIds: selected,
              expectedVersions: versions.values,
              templateId,
              templateVersion: template.version,
              from,
              to,
              phases,
            }}
            onSaved={onSaved}
            onBusy={(value) => {
              setBusy(value);
              onBusy(value);
            }}
          />
        )}
    </Stack>
  );
}
