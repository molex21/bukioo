import { Alert, Skeleton, Stack, Text, TextInput } from "@mantine/core";
import { useEffect, useState } from "react";
import { ApiError } from "../lib/api-client";
import {
  schedulingApi,
  type ShiftTemplate,
  type WeeklyBase,
  type ScheduleSpan,
} from "../lib/scheduling-api";
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
}: {
  businessId: string;
  employeeId: string;
  onSaved: () => void;
  onBusy: (busy: boolean) => void;
}) {
  const [from, setFrom] = useState("");
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
  const key = JSON.stringify([businessId, employeeId, from]);
  const current = data?.key === key ? data : null;
  useEffect(() => {
    let active = true;
    void Promise.all([
      schedulingApi.weeklyBase(businessId, employeeId, from),
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
  }, [businessId, employeeId, from, key]);
  if (error?.key === key) return <Alert color="red">{error.text}</Alert>;
  if (!current) return <Skeleton height={240} />;
  return (
    <Stack>
      <Text size="sm">
        Semana de referencia que se repite desde la fecha elegida. Las
        rotaciones y los cambios de fechas concretas tienen prioridad. Las
        ausencias se mantienen.
      </Text>
      <TextInput
        type="date"
        label="Aplicar este horario al empleado desde"
        description="Cambiar la fecha carga otro horario y descarta el borrador actual."
        value={current.base.from}
        min={current.base.today}
        disabled={busy}
        onChange={(event) => {
          if (event.currentTarget.value) setFrom(event.currentTarget.value);
        }}
      />
      {current.base.nextDate && (
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
      <Alert color="blue">
        Revisa los días seleccionados y el resumen semanal. Las horas son
        estimadas; las pausas siempre bloquean citas, aunque cuenten como
        trabajo.
      </Alert>
      <ScheduleChangeConfirm
        businessId={businessId}
        timezone={current.base.timezone}
        command={{
          type: "weekly",
          from: current.base.from,
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
