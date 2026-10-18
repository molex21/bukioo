import { Alert, Button, Group, Menu, Modal, Stack, Text } from "@mantine/core";
import { useEffect, useRef, useState } from "react";
import { ApiError } from "../lib/api-client";
import {
  workspaceEmployeesApi,
  type WorkspaceEmployee,
} from "../lib/workspace-employees-api";

type Action = "invite" | "password" | "twoFactor" | "archive";
const labels: Record<Action, string> = {
  invite: "Invitar al panel",
  password: "Solicitar recuperación",
  twoFactor: "Restablecer 2FA",
  archive: "Archivar empleado",
};
const descriptions: Record<Action, string> = {
  invite:
    "Se creará una cuenta para esta ficha y se solicitará el envío de credenciales al correo de contacto. Comprueba el destinatario antes de confirmar.",
  password:
    "Se solicitará la recuperación de contraseña de la cuenta vinculada. El correo de acceso puede ser distinto del correo de contacto de esta ficha.",
  twoFactor:
    "Se eliminará la configuración 2FA de la cuenta vinculada. Esta acción afecta a la cuenta del usuario, no solo a su ficha en esta empresa. Úsala únicamente para recuperar un acceso autorizado.",
  archive:
    "La ficha dejará de estar activa para atender nuevas citas y conservará su historial. Esta acción no cancela las citas existentes ni elimina la cuenta de usuario o sus permisos de acceso al panel.",
};

export function WorkspaceEmployeeActions({
  businessId,
  employee,
  disabled,
  onChanged,
}: {
  businessId: string;
  employee: WorkspaceEmployee;
  disabled: boolean;
  onChanged: (message?: string) => void;
}) {
  const [action, setAction] = useState<Action | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshRequired, setRefreshRequired] = useState(false);
  const busy = useRef(false);
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const name = `${employee.first_name} ${employee.last_name}`;
  function open(nextAction: Action) {
    setError(null);
    setAction(nextAction);
  }
  async function confirm() {
    if (!action || busy.current || refreshRequired) return;
    busy.current = true;
    setSaving(true);
    setError(null);
    try {
      switch (action) {
        case "invite":
          await workspaceEmployeesApi.invite(businessId, employee.id);
          break;
        case "password":
          await workspaceEmployeesApi.requestPasswordReset(
            businessId,
            employee.id,
          );
          break;
        case "twoFactor":
          await workspaceEmployeesApi.resetTwoFactor(businessId, employee.id);
          break;
        case "archive":
          await workspaceEmployeesApi.archive(businessId, employee.id);
          break;
      }
      if (!mounted.current) return;
      const message =
        action === "invite"
          ? "Invitación procesada. La entrega del correo depende del servicio de envío configurado."
          : action === "password"
            ? "Solicitud de recuperación aceptada. Esto no confirma la recepción del correo."
            : action === "twoFactor"
              ? "Configuración 2FA restablecida."
              : "Ficha archivada. La cuenta de usuario conserva sus permisos de acceso.";
      setAction(null);
      onChanged(message);
    } catch (requestError) {
      if (!mounted.current) return;
      const uncertain =
        !(requestError instanceof ApiError) || requestError.status >= 500;
      setError(
        uncertain
          ? "No se pudo confirmar el resultado. Actualiza el equipo antes de repetir una acción; la invitación puede haber creado la cuenta."
          : requestError.message,
      );
      // Incluso un error de entrega puede producirse después de crear la cuenta.
      setRefreshRequired(
        uncertain ||
          action === "invite" ||
          (requestError instanceof ApiError && requestError.status === 404),
      );
    } finally {
      busy.current = false;
      if (mounted.current) setSaving(false);
    }
  }

  return (
    <>
      <Menu position="bottom-end" withinPortal>
        <Menu.Target>
          <Button
            size="xs"
            variant="subtle"
            disabled={disabled || saving}
            aria-label={`Acciones de ${name}`}
          >
            Acciones
          </Button>
        </Menu.Target>
        <Menu.Dropdown>
          {!employee.user_id && (
            <Menu.Item
              disabled={!employee.email}
              onClick={() => open("invite")}
            >
              Invitar al panel
            </Menu.Item>
          )}
          {employee.user_id && (
            <>
              <Menu.Item onClick={() => open("password")}>
                Solicitar recuperación
              </Menu.Item>
              <Menu.Item onClick={() => open("twoFactor")}>
                Restablecer 2FA
              </Menu.Item>
            </>
          )}
          <Menu.Item color="red" onClick={() => open("archive")}>
            Archivar empleado
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>
      <Modal
        centered
        opened={action !== null}
        title={action ? `${labels[action]}: ${name}` : "Acciones de empleado"}
        onClose={() => {
          if (!busy.current) setAction(null);
        }}
        withCloseButton={!saving}
        closeOnEscape={!saving}
        closeOnClickOutside={!saving}
      >
        <Stack gap="md">
          {action && <Text>{descriptions[action]}</Text>}
          {action === "invite" && (
            <Text fw={600}>
              {employee.email ??
                "Sin correo de contacto. Edita la ficha antes de invitar."}
            </Text>
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
              onClick={() => setAction(null)}
            >
              Cancelar
            </Button>
            {refreshRequired ? (
              <Button
                onClick={() => {
                  setAction(null);
                  onChanged();
                }}
              >
                Actualizar equipo
              </Button>
            ) : (
              <Button
                color={
                  action === "archive" || action === "twoFactor"
                    ? "red"
                    : undefined
                }
                loading={saving}
                disabled={
                  action === "invite" &&
                  (!employee.email || Boolean(employee.user_id))
                }
                onClick={() => void confirm()}
              >
                {action ? labels[action] : "Confirmar"}
              </Button>
            )}
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
