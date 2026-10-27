import {
  Button,
  Checkbox,
  Group,
  Paper,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import type { ScheduleSpan } from "../lib/scheduling-api";
const time = (minutes: number) =>
  minutes < 0
    ? ""
    : `${String(Math.floor((minutes % 1440) / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
const minute = (value: string) => {
  const [h, m] = value.split(":").map(Number);
  return Number.isFinite(h + m) ? h * 60 + m : -1;
};

export function ScheduleSpansEditor({
  value,
  onChange,
  disabled = false,
}: {
  value: ScheduleSpan[];
  onChange: (value: ScheduleSpan[]) => void;
  disabled?: boolean;
}) {
  const update = (index: number, input: Partial<ScheduleSpan>) =>
    onChange(
      value.map((span, i) => (i === index ? { ...span, ...input } : span)),
    );
  return (
    <Stack gap="sm">
      {!value.length && (
        <Text c="dimmed" size="sm">
          Día libre
        </Text>
      )}
      {value.map((span, index) => (
        <Paper key={index} withBorder p="sm">
          <Stack gap="xs">
            <Group grow align="flex-end">
              <TextInput
                type="time"
                label={`Inicio del turno ${index + 1}`}
                value={time(span.start)}
                disabled={disabled}
                onChange={(event) =>
                  update(index, { start: minute(event.currentTarget.value) })
                }
              />
              <TextInput
                type="time"
                label={`Fin del turno ${index + 1}`}
                value={time(span.end)}
                disabled={disabled}
                onChange={(event) =>
                  update(index, {
                    end:
                      minute(event.currentTarget.value) +
                      (span.end >= 1440 ? 1440 : 0),
                  })
                }
              />
              <Button
                variant="subtle"
                color="red"
                disabled={disabled}
                onClick={() => onChange(value.filter((_, i) => i !== index))}
              >
                Quitar turno
              </Button>
            </Group>
            <Checkbox
              label="Termina al día siguiente"
              checked={span.end >= 1440}
              disabled={disabled}
              onChange={(event) =>
                update(index, {
                  end:
                    (span.end % 1440) +
                    (event.currentTarget.checked ? 1440 : 0),
                })
              }
            />
            {span.pauses.map((pause, p) => (
              <Group key={p} grow align="flex-end">
                <TextInput
                  type="time"
                  label={`Inicio de pausa ${p + 1}`}
                  value={time(pause.start)}
                  disabled={disabled}
                  onChange={(event) =>
                    update(index, {
                      pauses: span.pauses.map((item, i) =>
                        i === p
                          ? {
                              ...item,
                              start:
                                minute(event.currentTarget.value) +
                                (item.start >= 1440 ? 1440 : 0),
                            }
                          : item,
                      ),
                    })
                  }
                />
                <TextInput
                  type="time"
                  label={`Fin de pausa ${p + 1}`}
                  value={time(pause.end)}
                  disabled={disabled}
                  onChange={(event) =>
                    update(index, {
                      pauses: span.pauses.map((item, i) =>
                        i === p
                          ? {
                              ...item,
                              end:
                                minute(event.currentTarget.value) +
                                (item.end >= 1440 ? 1440 : 0),
                            }
                          : item,
                      ),
                    })
                  }
                />
                <Checkbox
                  label="La pausa empieza al día siguiente"
                  checked={pause.start >= 1440}
                  disabled={disabled}
                  onChange={(event) => {
                    const next = event.currentTarget.checked ? 1440 : 0;
                    update(index, {
                      pauses: span.pauses.map((item, i) =>
                        i === p
                          ? {
                              start: (item.start % 1440) + next,
                              end: item.end,
                            }
                          : item,
                      ),
                    });
                  }}
                />
                <Checkbox
                  label="La pausa termina al día siguiente"
                  checked={pause.end >= 1440}
                  disabled={disabled}
                  onChange={(event) => {
                    const next = event.currentTarget.checked ? 1440 : 0;
                    update(index, {
                      pauses: span.pauses.map((item, i) =>
                        i === p
                          ? { ...item, end: (item.end % 1440) + next }
                          : item,
                      ),
                    });
                  }}
                />
                <Button
                  variant="subtle"
                  color="red"
                  disabled={disabled}
                  onClick={() =>
                    update(index, {
                      pauses: span.pauses.filter((_, i) => i !== p),
                    })
                  }
                >
                  Quitar pausa
                </Button>
              </Group>
            ))}
            <Button
              variant="light"
              size="xs"
              disabled={disabled || span.pauses.length >= 28}
              onClick={() =>
                update(index, {
                  pauses: [
                    ...span.pauses,
                    { start: span.start + 60, end: span.start + 75 },
                  ],
                })
              }
            >
              Añadir pausa
            </Button>
          </Stack>
        </Paper>
      ))}
      <Button
        variant="light"
        disabled={disabled || value.length >= 28}
        onClick={() =>
          onChange([...value, { start: 540, end: 780, pauses: [] }])
        }
      >
        Añadir turno
      </Button>
    </Stack>
  );
}
