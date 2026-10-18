import { Alert, Button, Group, Modal, Stack, Text } from "@mantine/core";
import { useEffect, useRef, useState } from "react";
import { ApiError } from "../lib/api-client";
import { workspaceCatalogApi } from "../lib/workspace-catalog-api";

type Action = "delete" | "deactivate" | "reactivate";

export function CatalogResourceActions({
  businessId,
  id,
  name,
  isActive,
  kind,
  disabled,
  onChanged,
}: {
  businessId: string;
  id: string;
  name: string;
  isActive: boolean;
  kind: "service" | "category";
  disabled: boolean;
  onChanged: () => void;
}) {
  const [action, setAction] = useState<Action | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const [needsRefresh, setNeedsRefresh] = useState(false);
  const busy = useRef(false);
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const verb =
    action === "delete"
      ? "Eliminar"
      : action === "reactivate"
        ? "Reactivar"
        : "Desactivar";
  function open(nextAction: Action) {
    setError(null);
    setConflict(false);
    setNeedsRefresh(false);
    setAction(nextAction);
  }

  async function confirm() {
    if (!action || busy.current || needsRefresh || conflict) return;
    busy.current = true;
    setSaving(true);
    setError(null);
    try {
      if (action === "delete") {
        if (kind === "service")
          await workspaceCatalogApi.deleteService(businessId, id);
        else await workspaceCatalogApi.deleteCategory(businessId, id);
      } else {
        const input = { isActive: action === "reactivate" };
        if (kind === "service")
          await workspaceCatalogApi.updateService(businessId, id, input);
        else await workspaceCatalogApi.updateCategory(businessId, id, input);
      }
      if (!mounted.current) return;
      setAction(null);
      onChanged();
    } catch (requestError) {
      if (!mounted.current) return;
      if (
        requestError instanceof ApiError &&
        requestError.status === 409 &&
        action === "delete"
      ) {
        setConflict(true);
        setError(
          kind === "service"
            ? "No se puede eliminar: tiene empleados asignados o citas asociadas. Sus datos se conservarán."
            : "No se puede eliminar: tiene servicios asociados, incluidos los inactivos. Sus datos se conservarán.",
        );
      } else {
        setError(
          requestError instanceof ApiError
            ? requestError.message
            : "No se pudo confirmar el resultado. Actualiza el catálogo antes de volver a intentarlo.",
        );
        setNeedsRefresh(
          !(requestError instanceof ApiError) ||
            requestError.status === 404 ||
            requestError.status >= 500,
        );
      }
    } finally {
      busy.current = false;
      if (mounted.current) setSaving(false);
    }
  }

  return (
    <>
      <Button
        color="red"
        disabled={disabled || saving}
        onClick={() => open("delete")}
        size="xs"
        variant="subtle"
        aria-label={`Eliminar ${name}`}
      >
        Eliminar
      </Button>
      {!isActive && (
        <Button
          disabled={disabled || saving}
          onClick={() => open("reactivate")}
          size="xs"
          variant="subtle"
          aria-label={`Reactivar ${name}`}
        >
          Reactivar
        </Button>
      )}
      <Modal
        centered
        opened={action !== null}
        onClose={() => {
          if (!busy.current) setAction(null);
        }}
        closeOnClickOutside={!saving}
        closeOnEscape={!saving}
        withCloseButton={!saving}
        title={`${verb} ${name}`}
      >
        <Stack gap="md">
          <Text>
            {action === "delete"
              ? `Se eliminará definitivamente ${kind === "service" ? "el servicio" : "la categoría"} "${name}". Esta acción no se puede deshacer.`
              : action === "reactivate"
                ? `Se reactivará "${name}" conservando sus datos.`
                : `Se desactivará "${name}" conservando sus datos y referencias.`}
          </Text>
          {action === "deactivate" && (
            <Text size="sm" c="dimmed">
              {kind === "category"
                ? "Sus servicios no se desactivan automáticamente y pueden seguir disponibles para reservar."
                : "El servicio dejará de estar disponible para nuevas reservas. Las citas existentes se conservan."}
            </Text>
          )}
          {error && (
            <Alert color="red" role="alert">
              {error}
            </Alert>
          )}
          <Group justify="flex-end">
            <Button
              disabled={saving}
              variant="default"
              onClick={() => setAction(null)}
            >
              Cancelar
            </Button>
            {needsRefresh ? (
              <Button
                onClick={() => {
                  setAction(null);
                  onChanged();
                }}
              >
                Actualizar catálogo
              </Button>
            ) : conflict ? (
              isActive && (
                <Button onClick={() => open("deactivate")}>Desactivar…</Button>
              )
            ) : (
              <Button
                color={action === "delete" ? "red" : undefined}
                loading={saving}
                onClick={() => void confirm()}
              >
                {verb}
              </Button>
            )}
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
