import { Alert, Select, Skeleton, Stack, Text } from "@mantine/core";
import { useEffect, useState } from "react";
import {
  schedulingApi,
  type Reassignment,
  type ReassignmentOptions,
} from "../lib/scheduling-api";

export function ScheduleReassignment({
  businessId,
  appointmentId,
  disabled,
  value,
  onChange,
}: {
  businessId: string;
  appointmentId: string;
  disabled: boolean;
  value?: Reassignment;
  onChange: (value: Reassignment | null) => void;
}) {
  const [data, setData] = useState<ReassignmentOptions | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    void schedulingApi.reassignmentOptions(businessId, appointmentId).then(
      (result) => {
        if (active) setData(result);
      },
      () => {
        if (active) setError(true);
      },
    );
    return () => {
      active = false;
    };
  }, [businessId, appointmentId]);
  if (error)
    return (
      <Alert color="red">
        No se pudieron consultar las personas disponibles. Vuelve a abrir el día
        para actualizar la cita.
      </Alert>
    );
  if (!data) return <Skeleton height={60} />;
  return (
    <Stack gap="xs">
      <Text size="sm">{data.serviceName}</Text>
      {data.employees.length ? (
        <Select
          label="Reasignar a"
          placeholder="Selecciona una persona disponible"
          clearable
          disabled={disabled}
          value={value?.employeeId ?? null}
          data={data.employees.map((e) => ({ value: e.id, label: e.name }))}
          onChange={(id) =>
            onChange(
              id
                ? {
                    appointmentId: data.appointmentId,
                    employeeId: id,
                    employeeName: data.employees.find((e) => e.id === id)?.name,
                    startAt: data.startAt,
                    expectedEmployeeId: data.expectedEmployeeId,
                    expectedUpdatedAt: data.expectedUpdatedAt,
                  }
                : null,
            )
          }
        />
      ) : (
        <Text size="sm">
          No hay otra persona disponible para este servicio y horario. Ajusta el
          turno propuesto.
        </Text>
      )}
      <Text size="xs">
        La cita mantendrá su fecha, hora y servicio. Se reasignará al guardar el
        horario.
      </Text>
    </Stack>
  );
}
