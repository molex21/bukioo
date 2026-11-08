import {
  Alert,
  Button,
  Group,
  NumberInput,
  Paper,
  SegmentedControl,
  Select,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { useRef, useState } from "react";
import {
  schedulingApi,
  type SchedulePattern,
  type ShiftTemplate,
} from "../lib/scheduling-api";
import { ApiError } from "../lib/api-client";
import {
  formatWorkMinutes,
  spanLabel,
  totalNominalMinutes,
} from "../lib/schedule-editor";
import { ScheduleSpansEditor } from "./ScheduleSpansEditor";
import { ScheduleWeekEditor } from "./ScheduleWeekEditor";
import { useUnsavedChanges } from "../hooks/useUnsavedChanges";
const dayNames = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];
const order = [1, 2, 3, 4, 5, 6, 0];
const emptyWeek = () => Array.from({ length: 7 }, () => []);
type Props = {
  businessId: string;
  templates: ShiftTemplate[];
  onSaved: () => void;
  onBusy: (busy: boolean) => void;
  onDirtyChange?: (dirty: boolean) => void;
};
export function ScheduleTemplateLibrary(props: Props) {
  const [editing, setEditing] = useState<ShiftTemplate | "new" | null>(null);
  const [archiveRequest, setArchiveRequest] = useState(false);
  if (editing)
    return (
      <TemplateForm
        {...props}
        key={editing === "new" ? "new" : editing.id}
        editing={editing === "new" ? undefined : editing}
        initialArchive={archiveRequest}
        onBack={() => setEditing(null)}
      />
    );
  return (
    <Stack>
      <Group justify="space-between">
        <Title order={3} size="h4">
          Plantillas y rotaciones
        </Title>
        <Button
          onClick={() => {
            setArchiveRequest(false);
            setEditing("new");
          }}
        >
          Nueva
        </Button>
      </Group>
      {!props.templates.length && (
        <Text c="dimmed">
          Todavía no hay plantillas. Crea un turno reutilizable o una rotación
          de semanas.
        </Text>
      )}
      {props.templates.map((t) => (
        <Paper withBorder p="md" key={t.id}>
          <Stack gap="xs">
            <Group justify="space-between">
              <div>
                <Text fw={600}>{t.name}</Text>
                <Text size="sm" c="dimmed">
                  {t.kind === "DAY"
                    ? "Plantilla de turno"
                    : `Rotación de ${t.pattern.length} semanas`}
                </Text>
              </div>
              <Group gap="xs">
                <Button
                  variant="light"
                  onClick={() => {
                    setArchiveRequest(false);
                    setEditing(t);
                  }}
                >
                  Editar
                </Button>
                <Button
                  variant="subtle"
                  color="red"
                  onClick={() => {
                    setArchiveRequest(true);
                    setEditing(t);
                  }}
                >
                  Archivar
                </Button>
              </Group>
            </Group>
            {t.pattern.map((week, index) => (
              <div key={index}>
                <Text size="sm" fw={600}>
                  {t.kind === "CYCLE" ? `Semana ${index + 1} · ` : ""}
                  {formatWorkMinutes(totalNominalMinutes(week))}
                </Text>
                {t.kind === "DAY" ? (
                  <Text size="sm">
                    {week[0].map(spanLabel).join(" · ") || "Día libre"}
                  </Text>
                ) : (
                  order.map((d) => (
                    <Text size="xs" key={d}>
                      {dayNames[d]}:{" "}
                      {week[d].map(spanLabel).join(" · ") || "Día libre"}
                      {" · "}
                      {formatWorkMinutes(totalNominalMinutes([week[d]]))}
                    </Text>
                  ))
                )}
              </div>
            ))}
            {t.kind === "CYCLE" && (
              <Text size="sm">
                Total del ciclo:{" "}
                {formatWorkMinutes(totalNominalMinutes(t.pattern.flat()))}
              </Text>
            )}
          </Stack>
        </Paper>
      ))}
      <Text size="xs" c="dimmed">
        Horas estimadas de las plantillas, sin fechas. Las pausas siempre
        bloquean citas, aunque cuenten como trabajo.
      </Text>
    </Stack>
  );
}
export function InlineRotationForm({
  businessId,
  templates,
  onBusy,
  onCreated,
  onBack,
  onDirtyChange,
}: {
  businessId: string;
  templates: ShiftTemplate[];
  onBusy: (busy: boolean) => void;
  onCreated: (template: ShiftTemplate) => void;
  onBack: () => void;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  return (
    <TemplateForm
      businessId={businessId}
      templates={templates}
      onBusy={onBusy}
      onSaved={() => {}}
      onBack={onBack}
      initialArchive={false}
      initialKind="CYCLE"
      onCreated={onCreated}
      onDirtyChange={onDirtyChange}
    />
  );
}
function TemplateForm({
  businessId,
  templates,
  onSaved,
  onBusy,
  editing,
  onBack,
  onDirtyChange,
  initialArchive,
  initialKind,
  onCreated,
}: Props & {
  editing?: ShiftTemplate;
  onBack: () => void;
  initialArchive: boolean;
  initialKind?: "CYCLE";
  onCreated?: (template: ShiftTemplate) => void;
}) {
  const [kind, setKind] = useState<"DAY" | "CYCLE">(
    editing?.kind ?? initialKind ?? "DAY",
  );
  const [name, setName] = useState(editing?.name ?? "");
  const [pattern, setPattern] = useState<SchedulePattern>(() =>
    editing ? structuredClone(editing.pattern) : [emptyWeek()],
  );
  const [week, setWeek] = useState("0");
  const [saving, setSaving] = useState(false),
    [error, setError] = useState<string | null>(null),
    [archive, setArchive] = useState(initialArchive),
    [leaving, setLeaving] = useState(false);
  const lock = useRef(false);
  const [initial] = useState(() =>
    JSON.stringify({
      name: editing?.name ?? "",
      kind: editing?.kind ?? initialKind ?? "DAY",
      pattern: editing?.pattern ?? [emptyWeek()],
    }),
  );
  const dirty = JSON.stringify({ name, kind, pattern }) !== initial;
  const [pendingKind, setPendingKind] = useState<"DAY" | "CYCLE" | null>(null);
  useUnsavedChanges(dirty, onDirtyChange);
  async function save() {
    if (lock.current) return;
    lock.current = true;
    setSaving(true);
    onBusy(true);
    setError(null);
    try {
      if (archive && editing)
        await schedulingApi.archiveTemplate(businessId, editing);
      else {
        const saved = await schedulingApi.saveTemplate(
          businessId,
          name,
          pattern,
          editing,
          kind,
        );
        onCreated?.(saved);
      }
      onBack();
      onSaved();
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.message
          : "No se pudo confirmar el guardado. Actualiza las plantillas antes de repetirlo.",
      );
    } finally {
      lock.current = false;
      setSaving(false);
      onBusy(false);
    }
  }
  const w = Math.min(Number(week), pattern.length - 1);
  return (
    <Stack>
      <Group justify="space-between">
        <Text fw={600}>
          {editing
            ? `Editar ${editing.name}`
            : initialKind
              ? "Nueva rotación"
              : "Nueva plantilla"}
        </Text>
        <Button
          variant="subtle"
          disabled={saving}
          onClick={() => {
            if (dirty) setLeaving(true);
            else onBack();
          }}
        >
          {initialKind ? "Volver a la asignación" : "Volver al listado"}
        </Button>
      </Group>
      {leaving && (
        <Alert color="yellow" title="Hay cambios sin guardar">
          <Group>
            <Button color="red" onClick={onBack}>
              Descartar cambios
            </Button>
            <Button variant="default" onClick={() => setLeaving(false)}>
              Seguir editando
            </Button>
          </Group>
        </Alert>
      )}
      {!editing && !initialKind && (
        <SegmentedControl
          disabled={saving}
          value={kind}
          onChange={(value) => {
            const next = value as "DAY" | "CYCLE";
            if (pattern.flat(2).length || pattern.length > 1)
              setPendingKind(next);
            else {
              setKind(next);
              setPattern([emptyWeek()]);
              setWeek("0");
            }
          }}
          data={[
            { value: "DAY", label: "Turno" },
            { value: "CYCLE", label: "Rotación semanal" },
          ]}
        />
      )}
      {pendingKind && (
        <Alert
          color="yellow"
          title="Cambiar el tipo descartará los turnos del borrador"
        >
          <Group>
            <Button
              disabled={saving}
              onClick={() => {
                setKind(pendingKind);
                setPattern([emptyWeek()]);
                setWeek("0");
                setPendingKind(null);
              }}
            >
              Cambiar tipo
            </Button>
            <Button
              variant="default"
              disabled={saving}
              onClick={() => setPendingKind(null)}
            >
              Conservar turnos
            </Button>
          </Group>
        </Alert>
      )}
      <Text size="sm" c="dimmed">
        {kind === "DAY"
          ? "Guarda solo las horas y las pausas. Esta plantilla sirve para cualquier día; elegirás los días al aplicarla."
          : "Organiza las semanas de la rotación. Elegirás los empleados y las fechas de inicio y fin al asignarla."}
      </Text>
      <TextInput
        label="Nombre"
        required
        maxLength={100}
        disabled={saving}
        value={name}
        onChange={(e) => setName(e.currentTarget.value)}
      />
      {kind === "DAY" ? (
        <ScheduleSpansEditor
          value={pattern[0][0]}
          disabled={saving}
          onChange={(spans) =>
            setPattern([[spans, ...Array.from({ length: 6 }, () => [])]])
          }
        />
      ) : (
        <>
          <NumberInput
            label="Semanas de la rotación"
            min={1}
            max={12}
            allowDecimal={false}
            value={pattern.length}
            disabled={saving}
            description="Al reducir semanas se retirarán sus turnos del borrador."
            onChange={(value) => {
              if (
                typeof value === "number" &&
                Number.isInteger(value) &&
                value >= 1 &&
                value <= 12
              ) {
                setPattern((p) =>
                  Array.from({ length: value }, (_, i) => p[i] ?? emptyWeek()),
                );
                setWeek("0");
              }
            }}
          />
          <Select
            label="Semana a editar"
            allowDeselect={false}
            value={String(w)}
            disabled={saving}
            data={pattern.map((_, i) => ({
              value: String(i),
              label: `Semana ${i + 1}`,
            }))}
            onChange={(value) => setWeek(value ?? "0")}
          />
          <ScheduleWeekEditor
            key={w}
            days={order.map((d) => ({
              id: String(d),
              label: dayNames[d],
              spans: pattern[w][d],
            }))}
            templates={templates}
            disabled={saving}
            onChange={(days) =>
              setPattern((p) =>
                p.map((old, i) =>
                  i === w
                    ? old.map(
                        (spans, d) =>
                          days.find((v) => v.id === String(d))?.spans ?? spans,
                      )
                    : old,
                ),
              )
            }
          />
        </>
      )}
      <Text fw={600}>
        Total {kind === "DAY" ? "del turno" : "del ciclo"}:{" "}
        {formatWorkMinutes(totalNominalMinutes(pattern.flat()))}
      </Text>
      <Text size="sm" c="dimmed">
        Los cambios no modifican los turnos ya asignados. Para archivarla,
        confirma abajo.
      </Text>
      {error && (
        <Alert color="red" role="alert">
          {error}
        </Alert>
      )}
      {archive && (
        <Alert color="yellow">
          Dejará de estar disponible para nuevas asignaciones. Los turnos
          existentes se mantienen.
        </Alert>
      )}
      <Group justify="space-between">
        {editing && (
          <Button
            variant="subtle"
            color="red"
            disabled={saving}
            onClick={() => setArchive((v) => !v)}
          >
            {archive ? "Volver a editar" : "Archivar"}
          </Button>
        )}
        <Button
          loading={saving}
          disabled={
            !archive &&
            (!name.trim() || totalNominalMinutes(pattern.flat()) === null)
          }
          color={archive ? "red" : undefined}
          onClick={() => void save()}
        >
          {archive
            ? "Confirmar archivo"
            : initialKind
              ? "Guardar rotación y volver"
              : "Guardar plantilla"}
        </Button>
      </Group>
    </Stack>
  );
}
