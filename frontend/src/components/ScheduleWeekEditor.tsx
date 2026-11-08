import {
  Alert,
  Button,
  Checkbox,
  Group,
  Paper,
  Select,
  Stack,
  Text,
} from "@mantine/core";
import { useState } from "react";
import type { ScheduleSpan, ShiftTemplate } from "../lib/scheduling-api";
import {
  commonDaySpans,
  formatWorkMinutes,
  nominalMinutes,
  replaceSelectedDays,
  spanLabel,
  totalNominalMinutes,
  type DayDraft,
} from "../lib/schedule-editor";
import { ScheduleSpansEditor } from "./ScheduleSpansEditor";
import "./Scheduling.css";

export function ScheduleWeekEditor({
  days,
  templates,
  disabled = false,
  onChange,
  initialSelected = [],
}: {
  days: DayDraft[];
  templates: ShiftTemplate[];
  disabled?: boolean;
  onChange: (days: DayDraft[]) => void;
  initialSelected?: string[];
}) {
  const [selected, setSelected] = useState<string[]>(initialSelected);
  const chosen = selected.filter((id) => days.some((d) => d.id === id));
  const common = commonDaySpans(days, chosen);
  function change(spans: ScheduleSpan[]) {
    onChange(replaceSelectedDays(days, chosen, spans));
  }
  return (
    <Stack gap="sm">
      <Group justify="space-between">
        <Text fw={600}>Días de trabajo</Text>
        <Group gap="xs">
          <Button
            variant="subtle"
            disabled={disabled}
            onClick={() => setSelected(days.map((d) => d.id))}
          >
            Seleccionar todos
          </Button>
          <Button
            variant="subtle"
            disabled={disabled || !chosen.length}
            onClick={() => setSelected([])}
          >
            Quitar selección
          </Button>
        </Group>
      </Group>
      <div className="schedule-week-layout" data-editing={!!chosen.length}>
        <div className="schedule-week-days">
          {days.map((day) => (
            <Paper
              withBorder
              p="sm"
              key={day.id}
              className="schedule-day-card"
              data-selected={chosen.includes(day.id)}
            >
              <Checkbox
                label={day.label}
                checked={chosen.includes(day.id)}
                disabled={disabled}
                onChange={(event) =>
                  setSelected(
                    event.currentTarget.checked
                      ? [...chosen, day.id]
                      : chosen.filter((id) => id !== day.id),
                  )
                }
              />
              <Stack gap={3} mt="xs">
                {!day.spans.length ? (
                  <Text size="sm" c="dimmed">
                    Día libre
                  </Text>
                ) : (
                  day.spans.map((span, i) => (
                    <Text size="sm" key={i}>
                      {spanLabel(span)}
                    </Text>
                  ))
                )}
                <Text size="xs" fw={600}>
                  {formatWorkMinutes(nominalMinutes(day.spans))}
                </Text>
              </Stack>
            </Paper>
          ))}
        </div>
        {!!chosen.length && (
          <Paper withBorder p="md" className="schedule-turn-editor">
            <Stack gap="sm">
              <Text fw={600}>
                Turnos de{" "}
                {chosen.length === 1
                  ? days.find((d) => d.id === chosen[0])?.label
                  : `${chosen.length} días seleccionados`}
              </Text>
              <Text size="sm" c="dimmed">
                Los cambios se incluyen directamente en el borrador. Pulsa
                "Confirmar y guardar" al terminar.
              </Text>
              {common === null && (
                <Alert color="blue" role="status">
                  Los días tienen horarios distintos. Añadir un turno, elegir
                  una plantilla o dejarlos libres sustituirá los turnos de los
                  días seleccionados.
                </Alert>
              )}
              <Group align="flex-end">
                <Select
                  label="Plantilla de turno"
                  placeholder="Elige una plantilla…"
                  value={null}
                  disabled={disabled}
                  data={templates
                    .filter((t) => t.kind === "DAY")
                    .map((t) => ({ value: t.id, label: t.name }))}
                  onChange={(id) => {
                    const t = templates.find(
                      (t) => t.id === id && t.kind === "DAY",
                    );
                    if (t) change(t.pattern[0][0]);
                  }}
                />
                <Button
                  variant="subtle"
                  disabled={disabled}
                  onClick={() => change([])}
                >
                  Dejar libres
                </Button>
              </Group>
              <ScheduleSpansEditor
                value={common ?? []}
                onChange={change}
                disabled={disabled}
              />
            </Stack>
          </Paper>
        )}
      </div>
      <Text size="sm" fw={600} role="status">
        Horas programadas estimadas:{" "}
        {formatWorkMinutes(totalNominalMinutes(days.map((d) => d.spans)))}
      </Text>
    </Stack>
  );
}
