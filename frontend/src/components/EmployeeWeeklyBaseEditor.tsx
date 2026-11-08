import { Alert, Skeleton, Stack, Text, TextInput } from "@mantine/core";
import { useEffect, useState } from "react";
import { ApiError } from "../lib/api-client";
import {
  schedulingApi,
  type ShiftTemplate,
  type WeeklyBase,
  type ScheduleSpan,
} from "../lib/scheduling-api";
import { totalNominalMinutes } from "../lib/schedule-editor";
import { isScheduleDate } from "../lib/scheduling-view";
import { useUnsavedChanges } from "../hooks/useUnsavedChanges";
import { ScheduleWeekEditor } from "./ScheduleWeekEditor";
import { ScheduleChangeConfirm } from "./ScheduleChangeConfirm";
const names = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];
const order = [1, 2, 3, 4, 5, 6, 0];
export function EmployeeWeeklyBaseEditor({
  businessId,
  employeeId,
  onSaved,
  onBusy,
  onDirtyChange,
}: {
  businessId: string;
  employeeId: string;
  onSaved: () => void;
  onBusy: (busy: boolean) => void;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const [from, setFrom] = useState<string | null>(null);
  const [data, setData] = useState<{
    key: string;
    base: WeeklyBase;
    templates: ShiftTemplate[];
    week: ScheduleSpan[][];
  } | null>(null);
  const [error, setError] = useState<{ key: string; text: string } | null>(
    null,
  );
  const [busy, setBusy] = useState(false);
  const key = JSON.stringify([businessId, employeeId]);
  const current = data?.key === key ? data : null;
  const effectiveFrom = from ?? current?.base.from ?? "";
  const dirty =
    !!current &&
    (effectiveFrom !== current.base.from ||
      JSON.stringify(current.week) !== JSON.stringify(current.base.week));
  useUnsavedChanges(dirty, onDirtyChange);
  useEffect(() => {
    let active = true;
    void Promise.all([
      schedulingApi.weeklyBase(businessId, employeeId, ""),
      schedulingApi.templates(businessId),
    ]).then(
      ([base, templates]) => {
        if (active)
          setData({ key, base, templates, week: structuredClone(base.week) });
      },
      (error: unknown) => {
        if (active)
          setError({
            key,
            text:
              error instanceof ApiError
                ? error.message
                : "No se pudo cargar el horario. Cierra y vuelve a intentarlo.",
          });
      },
    );
    return () => {
      active = false;
    };
  }, [businessId, employeeId, key]);
  if (error?.key === key) return <Alert color="red">{error.text}</Alert>;
  if (!current) return <Skeleton height={240} />;
  const invalid =
    totalNominalMinutes(current.week) === null ||
    !isScheduleDate(effectiveFrom) ||
    effectiveFrom < current.base.today;
  return (
    <Stack>
      <Text size="sm">
        Este horario se repite cada semana desde la fecha elegida. Las
        rotaciones y los cambios de fechas concretas tienen prioridad. Las
        ausencias se mantienen.
      </Text>
      <TextInput
        type="date"
        label="Aplicar este horario al empleado desde"
        description="Puedes cambiar la fecha sin perder los turnos que estás preparando."
        value={effectiveFrom}
        min={current.base.today}
        disabled={busy}
        onChange={(event) => setFrom(event.currentTarget.value)}
      />
      {current.base.nextDate && current.base.nextDate > effectiveFrom && (
        <Alert color="yellow">
          Se conservará el siguiente horario programado desde{" "}
          {new Date(`${current.base.nextDate}T12:00Z`).toLocaleDateString(
            "es",
            { timeZone: "UTC" },
          )}
          .
        </Alert>
      )}
      <ScheduleWeekEditor
        days={order.map((d) => ({
          id: String(d),
          label: names[d],
          spans: current.week[d],
        }))}
        templates={current.templates}
        disabled={busy}
        onChange={(days) =>
          setData((d) =>
            d?.key === key
              ? {
                  ...d,
                  week: d.week.map(
                    (spans, i) =>
                      days.find((day) => day.id === String(i))?.spans ?? spans,
                  ),
                }
              : d,
          )
        }
      />
      {invalid && (
        <Alert color="red">
          Revisa la fecha y completa las horas de los turnos y sus pausas antes
          de guardar.
        </Alert>
      )}
      <ScheduleChangeConfirm
        disabled={invalid}
        businessId={businessId}
        timezone={current.base.timezone}
        command={{
          type: "weekly",
          from: effectiveFrom,
          week: current.week,
          employeeIds: [employeeId],
          expectedVersions: { [employeeId]: current.base.version },
        }}
        onSaved={onSaved}
        onBusy={(value) => {
          setBusy(value);
          onBusy(value);
        }}
      />
    </Stack>
  );
}
