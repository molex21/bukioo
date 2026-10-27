import { Alert, Button, Group, Stack, Text } from "@mantine/core";
import { useRef, useState } from "react";
import { ApiError } from "../lib/api-client";
import { schedulingApi, type SchedulePreview } from "../lib/scheduling-api";

export function ScheduleChangeConfirm({
  businessId,
  timezone,
  command,
  onSaved,
  onBusy,
}: {
  businessId: string;
  timezone: string;
  command: Record<string, unknown>;
  onSaved: () => void;
  onBusy: (busy: boolean) => void;
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
  const preview = checked?.key === key ? checked.result : null;
  async function run(apply: boolean) {
    if (lock.current || uncertain || (apply && !preview?.ok)) return;
    lock.current = true;
    setSaving(true);
    onBusy(true);
    setError(null);
    try {
      const result = await schedulingApi.change(businessId, command, !apply);
      if (apply) onSaved();
      else setChecked({ key, result });
    } catch (requestError) {
      setChecked(null);
      setError(
        requestError instanceof ApiError
          ? requestError.message
          : "No se pudo confirmar el resultado. Cierra y actualiza el cuadrante antes de intentarlo de nuevo.",
      );
      setUncertain(apply);
    } finally {
      lock.current = false;
      setSaving(false);
      onBusy(false);
    }
  }
  return (
    <Stack gap="sm">
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
              <Text key={item.id} size="sm">
                {new Date(item.startAt).toLocaleString("es", {
                  timeZone: timezone,
                })}
              </Text>
            ))}
          </Alert>
        ))}
      <Group justify="flex-end">
        <Button
          variant="default"
          loading={saving}
          disabled={uncertain}
          onClick={() => void run(false)}
        >
          Comprobar cambios
        </Button>
        <Button
          loading={saving}
          disabled={!preview?.ok || uncertain}
          onClick={() => void run(true)}
        >
          Confirmar y guardar
        </Button>
      </Group>
    </Stack>
  );
}
