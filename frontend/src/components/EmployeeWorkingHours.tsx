import {
  Alert,
  Button,
  Group,
  Modal,
  Paper,
  Skeleton,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { useEffect, useRef, useState } from "react";
import { ApiError } from "../lib/api-client";
import {
  workspaceEmployeesApi,
  type WorkingHourInput,
} from "../lib/workspace-employees-api";

const days = [
  { value: 1, label: "Lunes" },
  { value: 2, label: "Martes" },
  { value: 3, label: "Miércoles" },
  { value: 4, label: "Jueves" },
  { value: 5, label: "Viernes" },
  { value: 6, label: "Sábado" },
  { value: 0, label: "Domingo" },
];
type Shift = WorkingHourInput & { key: string };
const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

function validate(hours: WorkingHourInput[]) {
  if (hours.length > 28) return "Se permiten como máximo 28 turnos por semana.";
  const ordered = [...hours].sort(
    (a, b) =>
      a.dayOfWeek - b.dayOfWeek || a.startTime.localeCompare(b.startTime),
  );
  for (let index = 0; index < ordered.length; index++) {
    const hour = ordered[index];
    const day = days.find((item) => item.value === hour.dayOfWeek)?.label;
    if (!timePattern.test(hour.startTime) || !timePattern.test(hour.endTime))
      return `${day}: completa las horas de inicio y fin.`;
    if (hour.startTime >= hour.endTime)
      return `${day}: el inicio debe ser anterior al fin. Divide los turnos que cruzan medianoche.`;
    const previous = ordered[index - 1];
    if (
      previous?.dayOfWeek === hour.dayOfWeek &&
      previous.endTime > hour.startTime
    )
      return `${day}: los turnos no pueden solaparse.`;
  }
  return null;
}

export function EmployeeWorkingHours({
  businessId,
  employeeId,
  employeeName,
  disabled,
}: {
  businessId: string;
  employeeId: string;
  employeeName: string;
  disabled: boolean;
}) {
  const [opened, setOpened] = useState(false);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [version, setVersion] = useState(0);
  const [confirmEmpty, setConfirmEmpty] = useState(false);
  const busy = useRef(false);
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    if (!opened) return;
    let active = true;
    void workspaceEmployeesApi
      .listWorkingHours(businessId, employeeId)
      .then((hours) => {
        if (!active) return;
        if (
          hours.some(
            (hour) =>
              hour.valid_from ||
              hour.valid_to ||
              !/^([01]\d|2[0-3]):[0-5]\d(:00(\.0+)?)?$/.test(hour.start_time) ||
              !/^([01]\d|2[0-3]):[0-5]\d(:00(\.0+)?)?$/.test(hour.end_time),
          )
        ) {
          setError(
            "Este horario contiene vigencias o precisión no compatible con el editor semanal. No se modificará.",
          );
          return;
        }
        setShifts(
          hours.map((hour) => ({
            key: hour.id,
            dayOfWeek: hour.day_of_week,
            startTime: hour.start_time.slice(0, 5),
            endTime: hour.end_time.slice(0, 5),
          })),
        );
        setLoaded(true);
      })
      .catch((requestError: unknown) => {
        if (active)
          setError(
            requestError instanceof ApiError
              ? requestError.message
              : "No se pudo cargar el horario.",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [businessId, employeeId, opened, version]);

  function prepareLoad() {
    setLoading(true);
    setLoaded(false);
    setError(null);
    setShifts([]);
    setConfirmEmpty(false);
  }
  function update(key: string, field: "startTime" | "endTime", value: string) {
    setShifts((current) =>
      current.map((shift) =>
        shift.key === key ? { ...shift, [field]: value } : shift,
      ),
    );
    setConfirmEmpty(false);
  }
  async function save() {
    if (busy.current || !loaded || loading) return;
    const hours = shifts.map(({ dayOfWeek, startTime, endTime }) => ({
      dayOfWeek,
      startTime,
      endTime,
    }));
    const validation = validate(hours);
    if (validation) {
      setError(validation);
      return;
    }
    if (!hours.length && !confirmEmpty) {
      setConfirmEmpty(true);
      return;
    }
    busy.current = true;
    setSaving(true);
    setError(null);
    try {
      await workspaceEmployeesApi.replaceWorkingHours(
        businessId,
        employeeId,
        hours,
      );
      if (mounted.current) setOpened(false);
    } catch (requestError) {
      if (!mounted.current) return;
      setError(
        requestError instanceof ApiError
          ? requestError.message
          : "No se pudo confirmar el resultado. Recarga el horario antes de repetir el guardado.",
      );
      setLoaded(false);
    } finally {
      busy.current = false;
      if (mounted.current) setSaving(false);
    }
  }

  return (
    <>
      <Button
        size="xs"
        variant="subtle"
        disabled={disabled || saving}
        aria-label={`Horarios de ${employeeName}`}
        onClick={() => {
          prepareLoad();
          setOpened(true);
        }}
      >
        Horarios
      </Button>
      <Modal
        centered
        size="lg"
        opened={opened}
        title={`Horarios de ${employeeName}`}
        withCloseButton={!saving}
        closeOnClickOutside={!saving}
        closeOnEscape={!saving}
        onClose={() => {
          if (!busy.current) setOpened(false);
        }}
      >
        <Stack gap="md">
          <Text size="sm">
            Horas locales de la empresa. Guardar reemplaza la semana completa;
            no cambia las citas existentes. Domingo corresponde a 0 y sábado a
            6.
          </Text>
          {loading ? (
            <Skeleton height={180} />
          ) : (
            loaded &&
            days.map((day) => (
              <Paper key={day.value} withBorder p="sm">
                <Stack gap="sm">
                  <Group justify="space-between">
                    <Text fw={600}>{day.label}</Text>
                    <Button
                      size="compact-xs"
                      variant="light"
                      disabled={saving || shifts.length >= 28}
                      onClick={() => {
                        setShifts((current) => [
                          ...current,
                          {
                            key: crypto.randomUUID(),
                            dayOfWeek: day.value,
                            startTime: "09:00",
                            endTime: "13:00",
                          },
                        ]);
                        setConfirmEmpty(false);
                      }}
                      aria-label={`Añadir turno en ${day.label}`}
                    >
                      Añadir turno
                    </Button>
                  </Group>
                  {!shifts.some((shift) => shift.dayOfWeek === day.value) && (
                    <Text size="sm" c="dimmed">
                      Sin turnos
                    </Text>
                  )}
                  {shifts
                    .filter((shift) => shift.dayOfWeek === day.value)
                    .map((shift, index) => (
                      <Group key={shift.key} align="flex-end" grow>
                        <TextInput
                          type="time"
                          label={`Inicio ${day.label}, turno ${index + 1}`}
                          value={shift.startTime}
                          disabled={saving}
                          onChange={(event) =>
                            update(
                              shift.key,
                              "startTime",
                              event.currentTarget.value,
                            )
                          }
                        />
                        <TextInput
                          type="time"
                          label={`Fin ${day.label}, turno ${index + 1}`}
                          value={shift.endTime}
                          disabled={saving}
                          onChange={(event) =>
                            update(
                              shift.key,
                              "endTime",
                              event.currentTarget.value,
                            )
                          }
                        />
                        <Button
                          size="xs"
                          variant="subtle"
                          color="red"
                          disabled={saving}
                          aria-label={`Quitar turno ${index + 1} de ${day.label}`}
                          onClick={() => {
                            setShifts((current) =>
                              current.filter((item) => item.key !== shift.key),
                            );
                            setConfirmEmpty(false);
                          }}
                        >
                          Quitar
                        </Button>
                      </Group>
                    ))}
                </Stack>
              </Paper>
            ))
          )}
          {error && (
            <Alert color="red" role="alert">
              {error}
            </Alert>
          )}
          {confirmEmpty && (
            <Alert color="yellow">
              Se eliminarán todos los turnos semanales. El empleado quedará sin
              disponibilidad laboral configurada. Confirma para continuar.
            </Alert>
          )}
          <Group justify="flex-end">
            <Button
              variant="default"
              disabled={saving}
              onClick={() => setOpened(false)}
            >
              Cancelar
            </Button>
            {!loading && !loaded ? (
              <Button
                onClick={() => {
                  prepareLoad();
                  setVersion((current) => current + 1);
                }}
              >
                Recargar horario
              </Button>
            ) : (
              <Button
                loading={saving}
                disabled={loading || !loaded}
                color={confirmEmpty ? "red" : undefined}
                onClick={() => void save()}
              >
                {confirmEmpty ? "Confirmar semana vacía" : "Guardar semana"}
              </Button>
            )}
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
