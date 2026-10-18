import {
  Alert,
  Button,
  Checkbox,
  Group,
  Modal,
  Skeleton,
  Stack,
  Text,
} from "@mantine/core";
import { useEffect, useRef, useState } from "react";
import { ApiError } from "../lib/api-client";
import { workspaceCatalogApi } from "../lib/workspace-catalog-api";
import {
  workspaceEmployeesApi,
  type WorkspaceEmployee,
} from "../lib/workspace-employees-api";

export function ServiceEmployeesAction({
  businessId,
  serviceId,
  serviceName,
  disabled,
}: {
  businessId: string;
  serviceId: string;
  serviceName: string;
  disabled: boolean;
}) {
  const [opened, setOpened] = useState(false);
  const [employees, setEmployees] = useState<WorkspaceEmployee[] | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [refreshRequired, setRefreshRequired] = useState(false);
  const [version, setVersion] = useState(0);
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
    void Promise.all([
      workspaceEmployeesApi.list(businessId),
      workspaceCatalogApi.listEmployees(businessId, serviceId),
    ])
      .then(([available, assigned]) => {
        if (!active) return;
        const current = available.filter((employee) => employee.is_active);
        setEmployees(current);
        setSelected(assigned.map((employee) => employee.id));
        if (
          assigned.some(
            (employee) => !current.some((item) => item.id === employee.id),
          )
        ) {
          setRefreshRequired(true);
          setError(
            "El equipo cambió durante la carga. Actualiza antes de guardar.",
          );
        }
      })
      .catch((requestError: unknown) => {
        if (!active) return;
        setRefreshRequired(true);
        setError(
          requestError instanceof ApiError
            ? requestError.message
            : "No se pudieron cargar las asignaciones.",
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [businessId, serviceId, opened, version]);

  function prepareLoad() {
    setLoading(true);
    setEmployees(null);
    setError(null);
    setRefreshRequired(false);
  }

  async function save() {
    if (busy.current || loading || !employees || refreshRequired) return;
    busy.current = true;
    setSaving(true);
    setError(null);
    try {
      await workspaceCatalogApi.replaceEmployees(
        businessId,
        serviceId,
        selected,
      );
      if (!mounted.current) return;
      setOpened(false);
    } catch (requestError) {
      if (!mounted.current) return;
      setError(
        requestError instanceof ApiError
          ? requestError.message
          : "No se pudo confirmar el resultado. Actualiza para comprobar las asignaciones guardadas.",
      );
      setRefreshRequired(true);
    } finally {
      busy.current = false;
      if (mounted.current) setSaving(false);
    }
  }

  return (
    <>
      <Button
        disabled={disabled || saving}
        size="xs"
        variant="subtle"
        aria-label={`Asignar empleados a ${serviceName}`}
        onClick={() => {
          setOpened(true);
          prepareLoad();
        }}
      >
        Empleados
      </Button>
      <Modal
        centered
        opened={opened}
        title={`Empleados de ${serviceName}`}
        closeOnEscape={!saving}
        closeOnClickOutside={!saving}
        withCloseButton={!saving}
        onClose={() => {
          if (!busy.current) setOpened(false);
        }}
      >
        <Stack gap="md">
          <Text size="sm">
            Selecciona quién puede prestar este servicio en esta empresa. Se
            reemplazarán las asignaciones al guardar; las citas existentes se
            conservan.
          </Text>
          {loading ? (
            <Skeleton height={90} />
          ) : (
            employees && (
              <>
                {employees.length === 0 && (
                  <Text c="dimmed">
                    No hay empleados activos. Añádelos desde Equipo.
                  </Text>
                )}
                <Checkbox.Group
                  label="Empleados asignados"
                  value={selected}
                  onChange={setSelected}
                >
                  <Stack gap="sm" mt="xs">
                    {employees.map((employee) => (
                      <Checkbox
                        key={employee.id}
                        value={employee.id}
                        disabled={saving || refreshRequired}
                        label={`${employee.first_name} ${employee.last_name}${employee.email ? ` (${employee.email})` : ""}`}
                      />
                    ))}
                  </Stack>
                </Checkbox.Group>
                {selected.length === 0 && (
                  <Alert color="yellow">
                    El servicio quedará sin empleados asignados y sin franjas
                    reservables hasta completar la asignación y los horarios.
                  </Alert>
                )}
              </>
            )
          )}
          {error && (
            <Alert color="red" role="alert">
              {error}
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
            {refreshRequired ? (
              <Button
                disabled={loading}
                onClick={() => {
                  prepareLoad();
                  setVersion((value) => value + 1);
                }}
              >
                Actualizar asignaciones
              </Button>
            ) : (
              <Button
                loading={saving}
                disabled={loading || !employees}
                onClick={() => void save()}
              >
                Guardar asignaciones
              </Button>
            )}
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
