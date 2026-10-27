import {
  Alert,
  Button,
  Group,
  NumberInput,
  Select,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { useRef, useState } from "react";
import {
  schedulingApi,
  type SchedulePattern,
  type ShiftTemplate,
} from "../lib/scheduling-api";
import { ApiError } from "../lib/api-client";
import { ScheduleSpansEditor } from "./ScheduleSpansEditor";
const dayOptions = [1, 2, 3, 4, 5, 6, 0].map((value) => ({
  value: String(value),
  label: [
    "Domingo",
    "Lunes",
    "Martes",
    "Miércoles",
    "Jueves",
    "Viernes",
    "Sábado",
  ][value],
}));
const emptyWeek = () => Array.from({ length: 7 }, () => []);

export function ScheduleTemplateManager({
  businessId,
  templates,
  onSaved,
  onBusy,
}: {
  businessId: string;
  templates: ShiftTemplate[];
  onSaved: () => void;
  onBusy: (busy: boolean) => void;
}) {
  const [editing, setEditing] = useState<ShiftTemplate | undefined>();
  const [name, setName] = useState("");
  const [pattern, setPattern] = useState<SchedulePattern>([emptyWeek()]);
  const [week, setWeek] = useState("0"),
    [day, setDay] = useState("1");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [archive, setArchive] = useState(false);
  const lock = useRef(false);
  async function save(removing: boolean) {
    if (lock.current || (!removing && !name.trim())) return;
    lock.current = true;
    setSaving(true);
    onBusy(true);
    setError(null);
    try {
      if (removing && editing)
        await schedulingApi.archiveTemplate(businessId, editing);
      else await schedulingApi.saveTemplate(businessId, name, pattern, editing);
      onSaved();
    } catch (requestError) {
      setError(
        requestError instanceof ApiError
          ? requestError.message
          : "No se pudo confirmar el guardado. Actualiza las plantillas antes de intentarlo de nuevo.",
      );
    } finally {
      lock.current = false;
      setSaving(false);
      onBusy(false);
    }
  }
  const w = Math.min(Number(week), pattern.length - 1),
    d = Number(day);
  return (
    <Stack gap="md">
      <Select
        label="Plantilla"
        placeholder="Crear nueva"
        clearable
        disabled={saving}
        value={editing?.id ?? null}
        data={templates.map((item) => ({ value: item.id, label: item.name }))}
        onChange={(id) => {
          const item = templates.find((t) => t.id === id);
          setEditing(item);
          setName(item?.name ?? "");
          setPattern(item ? structuredClone(item.pattern) : [emptyWeek()]);
          setWeek("0");
          setArchive(false);
          setError(null);
        }}
      />
      <TextInput
        label="Nombre"
        required
        value={name}
        disabled={saving}
        onChange={(event) => setName(event.currentTarget.value)}
        maxLength={100}
      />
      <NumberInput
        label="Semanas del ciclo"
        description="El ciclo se repetirá al terminar la última semana. Reducir semanas retira esos turnos de esta plantilla al guardar."
        value={pattern.length}
        min={1}
        max={12}
        allowDecimal={false}
        disabled={saving}
        onChange={(value) => {
          if (typeof value === "number" && value >= 1 && value <= 12) {
            setPattern((current) =>
              Array.from(
                { length: value },
                (_, index) => current[index] ?? emptyWeek(),
              ),
            );
            setWeek("0");
          }
        }}
      />
      <Group grow>
        <Select
          label="Semana"
          allowDeselect={false}
          value={String(w)}
          disabled={saving}
          onChange={(value) => setWeek(value ?? "0")}
          data={pattern.map((_, index) => ({
            value: String(index),
            label: `Semana ${index + 1}`,
          }))}
        />
        <Select
          label="Día"
          allowDeselect={false}
          value={day}
          onChange={(value) => setDay(value ?? "1")}
          disabled={saving}
          data={dayOptions}
        />
      </Group>
      <ScheduleSpansEditor
        disabled={saving}
        value={pattern[w][d]}
        onChange={(spans) =>
          setPattern((current) =>
            current.map((entry, index) =>
              index === w
                ? entry.map((value, i) => (i === d ? spans : value))
                : entry,
            ),
          )
        }
      />
      <Text size="sm" c="dimmed">
        Editar o archivar una plantilla no cambia los turnos ya asignados. Para
        actualizarlos, vuelve a asignar el ciclo desde la fecha que elijas.
      </Text>
      {error && (
        <Alert color="red" role="alert">
          {error}
        </Alert>
      )}
      {archive && (
        <Alert color="yellow">
          La plantilla dejará de estar disponible para nuevas asignaciones. Los
          turnos ya asignados se mantienen.
        </Alert>
      )}
      <Group justify="space-between">
        {editing && (
          <Button
            variant="subtle"
            color="red"
            disabled={saving}
            onClick={() => setArchive((value) => !value)}
          >
            {archive ? "Volver a editar" : "Archivar plantilla"}
          </Button>
        )}
        <Button
          color={archive ? "red" : undefined}
          loading={saving}
          disabled={!name.trim()}
          onClick={() => void save(archive)}
        >
          {archive ? "Confirmar archivo" : "Guardar plantilla"}
        </Button>
      </Group>
    </Stack>
  );
}
