import { Alert, Button, Group, Text } from "@mantine/core";
export function DiscardChangesPrompt({
  onDiscard,
  onContinue,
  disabled = false,
}: {
  onDiscard: () => void;
  onContinue: () => void;
  disabled?: boolean;
}) {
  return (
    <Alert color="yellow" title="Hay cambios sin guardar" role="alert" mb="md">
      <Text size="sm" mb="sm">
        Puedes seguir editando o descartar los cambios antes de cerrar.
      </Text>
      <Group>
        <Button color="red" disabled={disabled} onClick={onDiscard}>
          Descartar y cerrar
        </Button>
        <Button variant="default" disabled={disabled} onClick={onContinue}>
          Seguir editando
        </Button>
      </Group>
    </Alert>
  );
}
