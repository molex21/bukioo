import { Alert, Button, Group, Stack, Text } from "@mantine/core";
import { useEffect, useRef, useState } from "react";
import { ApiError } from "../lib/api-client";
import {
  schedulingApi,
  type SchedulePreview,
  type Reassignment,
} from "../lib/scheduling-api";
import { ScheduleReassignment } from "./ScheduleReassignment";
import { submitScheduleChange } from "../lib/schedule-submission";
import { formatWorkMinutes } from "../lib/schedule-editor";

export function ScheduleChangeConfirm({
  businessId,
  timezone,
  command,
  onSaved,
  onBusy,
  reviewBeforeSave = false,
}: {
  businessId: string;
  timezone: string;
  command: Record<string, unknown>;
  onSaved: () => void;
  onBusy: (busy: boolean) => void;
  reviewBeforeSave?: boolean;
}) {
  const [checked, setChecked] = useState<{
    key: string;
    result: SchedulePreview;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const lock = useRef(false);
  const key = JSON.stringify(command);
  const [selection, setSelection] = useState<{
    key: string;
    items: Reassignment[];
  }>({ key: "", items: [] });
  const reassignments = selection.key === key ? selection.items : [];
  const preview = checked?.key === key ? checked.result : null;
  const restoring = command.type === "resetDay";
  useEffect(() => {
    if (!restoring && !reviewBeforeSave) return;
    let active = true;
    void schedulingApi.change(businessId, JSON.parse(key), true).then(
      (result) => {
        if (active) setChecked({ key, result });
      },
      () => {
        if (active)
          setError(
            "No se pudo consultar el horario previsto. Vuelve a abrir el día para intentarlo de nuevo.",
          );
      },
    );
    return () => {
      active = false;
    };
  }, [businessId, key, restoring, reviewBeforeSave]);
  async function run() {
    if (
      lock.current ||
      uncertain ||
      (restoring && !preview?.restoredDay) ||
      (reviewBeforeSave && !preview)
    )
      return;
    lock.current = true;
    setSaving(true);
    onBusy(true);
    setError(null);
    let applying = false;
    try {
      const proposed = { ...command, reassignments };
      const outcome = await submitScheduleChange({
        preview: () => schedulingApi.change(businessId, proposed, true),
        save: () => schedulingApi.change(businessId, proposed, false),
        reviewedRestoredDay: preview?.restoredDay,
        restoring,
        onChecked: (result) => setChecked({ key, result }),
        onWriting: () => {
          applying = true;
        },
      });
      if (outcome === "review") {
        setError(
          "El horario previsto ha cambiado. Revisa el nuevo resumen antes de confirmar.",
        );
        return;
      }
      if (outcome === "saved") onSaved();
    } catch (requestError) {
      setChecked(null);
      setError(
        requestError instanceof ApiError
          ? requestError.message
          : "No se pudo confirmar el resultado. Cierra y actualiza el cuadrante antes de intentarlo de nuevo.",
      );
      setUncertain(applying);
    } finally {
      lock.current = false;
      setSaving(false);
      onBusy(false);
    }
  }
  return (
    <Stack gap="sm">
      {reviewBeforeSave && preview && (
        <Alert color="blue" title="Resumen real por fechas">
          <Text size="sm">
            {preview.estimatedFrom} – {preview.estimatedTo}:{" "}
            {formatWorkMinutes(preview.estimatedTotalMinutes ?? null)}
            {preview.estimatedTruncated
              ? " · Detalle limitado a los primeros 42 días."
              : ""}
          </Text>
          <Text size="xs">
            Suma del horario efectivo de los empleados elegidos en ese periodo,
            incluidas sus excepciones. Las ausencias se muestran por separado.
          </Text>
        </Alert>
      )}
      {restoring && preview?.restoredDay && (
        <Alert
          color="yellow"
          title={`Horario previsto para ${new Date(`${String(command.date)}T12:00:00Z`).toLocaleDateString("es", { timeZone: "UTC", dateStyle: "long" })}`}
        >
          <Text size="sm">
            Se recuperará{" "}
            {preview.restoredDay.origin === "cycle"
              ? "la rotación asignada"
              : "el horario semanal"}
            . Las ausencias se mantienen.
          </Text>
          {!preview.restoredDay.spans.length && (
            <Text size="sm">Día libre</Text>
          )}
          {preview.restoredDay.spans.map((span, index) => {
            const time = (n: number) =>
              `${String(Math.floor(n / 60) % 24).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}${n >= 1440 ? " (día siguiente)" : ""}`;
            return (
              <Text size="sm" key={index}>
                {time(span.start)}–{time(span.end)}
                {span.pauses
                  .map(
                    (pause) =>
                      ` · Pausa: ${time(pause.start)}–${time(pause.end)} (${pause.countsAsWork ? "cuenta como trabajo" : "no cuenta como trabajo"})`,
                  )
                  .join("")}
              </Text>
            );
          })}
          <Text size="sm">
            Atención disponible tras aplicar pausas y ausencias:{" "}
            {preview.restoredDay.attention.length
              ? preview.restoredDay.attention
                  .map(
                    (range) =>
                      `${new Date(range.startAt).toLocaleTimeString("es", { timeZone: timezone, hour: "2-digit", minute: "2-digit" })}–${new Date(range.endAt).toLocaleTimeString("es", { timeZone: timezone, hour: "2-digit", minute: "2-digit" })}`,
                  )
                  .join(", ")
              : "Sin atención disponible"}
            .
          </Text>
        </Alert>
      )}
      {error && (
        <Alert color="red" role="alert">
          {error}
          {uncertain && (
            <Text size="sm">
              Cierra esta ventana y actualiza el cuadrante para revisar el
              estado guardado.
            </Text>
          )}
        </Alert>
      )}
      {preview &&
        (preview.ok ? (
          <Alert color="teal">
            No hay citas afectadas. Revisa las fechas y empleados antes de
            confirmar.
          </Alert>
        ) : (
          <Alert color="red" title="Hay citas afectadas">
            <Text>
              Resuelve estas citas o cambia el horario propuesto antes de
              guardar.
            </Text>
            {preview.conflicts.map((item) => (
              <Stack key={item.id} gap="xs" mt="sm">
                <Text size="sm">
                  {new Date(item.startAt).toLocaleString("es", {
                    timeZone: timezone,
                  })}
                </Text>
                <ScheduleReassignment
                  key={`${key}:${item.id}`}
                  businessId={businessId}
                  appointmentId={item.id}
                  disabled={saving || uncertain}
                  value={reassignments.find((r) => r.appointmentId === item.id)}
                  onChange={(value) =>
                    setSelection({
                      key,
                      items: [
                        ...reassignments.filter(
                          (r) => r.appointmentId !== item.id,
                        ),
                        ...(value ? [value] : []),
                      ],
                    })
                  }
                />
              </Stack>
            ))}
          </Alert>
        ))}
      {!!reassignments.length && (
        <Alert color="blue" title="Reasignaciones al guardar">
          {reassignments.map((item) => (
            <Group justify="space-between" key={item.appointmentId}>
              <Text size="sm">
                {item.startAt
                  ? new Date(item.startAt).toLocaleString("es", {
                      timeZone: timezone,
                    })
                  : "Cita seleccionada"}{" "}
                → {item.employeeName}
              </Text>
              <Button
                variant="subtle"
                size="xs"
                disabled={saving || uncertain}
                onClick={() =>
                  setSelection({
                    key,
                    items: reassignments.filter(
                      (r) => r.appointmentId !== item.appointmentId,
                    ),
                  })
                }
              >
                Quitar reasignación
              </Button>
            </Group>
          ))}
          <Text size="sm">
            Las citas y el horario se guardarán juntos. Si alguna comprobación
            falla, no se guardará ningún cambio.
          </Text>
        </Alert>
      )}
      <Group justify="flex-end">
        <Button
          loading={saving}
          disabled={
            uncertain ||
            (restoring && !preview?.restoredDay) ||
            (reviewBeforeSave && !preview)
          }
          onClick={() => void run()}
        >
          Confirmar y guardar
        </Button>
      </Group>
    </Stack>
  );
}
