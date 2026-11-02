import {
  Alert,
  Button,
  Checkbox,
  Group,
  Paper,
  Select,
  SimpleGrid,
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
  const [draft, setDraft] = useState<ScheduleSpan[] | null>(null);
  const chosen = selected.filter((id) => days.some((d) => d.id === id));
  const common = commonDaySpans(days, chosen);
  const visibleDraft = draft ?? common ?? [];
  function select(ids: string[]) {
    setSelected(ids);
    setDraft(null);
  }
  function apply(spans: ScheduleSpan[]) {
    onChange(replaceSelectedDays(days, chosen, spans));
    setDraft(null);
  }
  return (
    <Stack gap="sm">
      <Group justify="space-between">
        <Text fw={600}>Selecciona los días que quieres cambiar</Text>
        <Group gap="xs">
          <Button
            variant="subtle"
            disabled={disabled}
            onClick={() => select(days.map((d) => d.id))}
          >
            Seleccionar todos
          </Button>
          <Button
            variant="subtle"
            disabled={disabled || !chosen.length}
            onClick={() => select([])}
          >
            Quitar selección
          </Button>
        </Group>
      </Group>
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 7 }} spacing="xs">
        {days.map((day) => (
          <Paper
            key={day.id}
            withBorder
            p="sm"
            style={{
              borderColor: chosen.includes(day.id)
                ? "var(--mantine-primary-color-filled)"
                : undefined,
            }}
          >
            <Stack gap="xs">
              <Checkbox
                label={day.label}
                checked={chosen.includes(day.id)}
                disabled={disabled}
                onChange={(event) =>
                  select(
                    event.currentTarget.checked
                      ? [...chosen, day.id]
                      : chosen.filter((id) => id !== day.id),
                  )
                }
              />
              {!day.spans.length && (
                <Text size="sm" c="dimmed">
                  Día libre
                </Text>
              )}
              {day.spans.map((span, i) => (
                <Stack key={i} gap={2}>
                  <Text size="sm">{spanLabel(span)}</Text>
                  {span.pauses.map((p, j) => (
                    <Text size="xs" c="dimmed" key={j}>
                      Pausa {spanLabel(p)} ·{" "}
                      {p.countsAsWork ? "computa" : "no computa"}
                    </Text>
                  ))}
                </Stack>
              ))}
              <Text size="xs" fw={600}>
                {formatWorkMinutes(nominalMinutes(day.spans))}
              </Text>
            </Stack>
          </Paper>
        ))}
      </SimpleGrid>
      <Text size="sm" fw={600}>
        Horas programadas estimadas:{" "}
        {formatWorkMinutes(totalNominalMinutes(days.map((d) => d.spans)))}
      </Text>
      {!!chosen.length && (
        <Paper withBorder p="md">
          <Stack gap="sm">
            <Alert color="blue">
              Se sustituirán los turnos de:{" "}
              {days
                .filter((d) => chosen.includes(d.id))
                .map((d) => d.label)
                .join(", ")}
              . Los demás días se mantienen. Todavía no se guardará.
            </Alert>
            {common === null && (
              <Text size="sm">
                Horarios distintos. Elige una plantilla o define los turnos que
                tendrán estos días.
              </Text>
            )}
            <Group align="flex-end">
              <Select
                label="Aplicar plantilla de turno"
                placeholder="Selecciona una plantilla"
                value={null}
                disabled={disabled}
                data={templates
                  .filter((t) => t.kind === "DAY")
                  .map((t) => ({ value: t.id, label: t.name }))}
                onChange={(id) => {
                  const t = templates.find(
                    (t) => t.id === id && t.kind === "DAY",
                  );
                  if (t) apply(t.pattern[0][0]);
                }}
              />
              <Button
                variant="subtle"
                disabled={disabled}
                onClick={() => apply([])}
              >
                Dejar días libres
              </Button>
            </Group>
            <>
              <ScheduleSpansEditor
                value={visibleDraft}
                onChange={setDraft}
                disabled={disabled}
              />
              <Group>
                <Button
                  disabled={
                    disabled ||
                    nominalMinutes(visibleDraft) === null ||
                    (common === null && draft === null)
                  }
                  onClick={() => apply(visibleDraft)}
                >
                  Aplicar a los días seleccionados
                </Button>
                <Button
                  variant="default"
                  disabled={disabled || draft === null}
                  onClick={() => setDraft(null)}
                >
                  Cancelar edición
                </Button>
              </Group>
            </>
          </Stack>
        </Paper>
      )}
    </Stack>
  );
}
