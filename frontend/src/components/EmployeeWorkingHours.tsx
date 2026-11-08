import { Button, Modal } from "@mantine/core";
import { useState } from "react";
import { EmployeeWeeklyBaseEditor } from "./EmployeeWeeklyBaseEditor";
import { DiscardChangesPrompt } from "./DiscardChangesPrompt";

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
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false),
    [discard, setDiscard] = useState(false);
  return (
    <>
      <Button
        size="xs"
        variant="subtle"
        disabled={disabled || busy}
        aria-label={`Horario semanal de ${employeeName}`}
        onClick={() => {
          setDiscard(false);
          setOpened(true);
        }}
      >
        Horario semanal
      </Button>
      <Modal
        opened={opened}
        size="xl"
        centered
        title={`Horario semanal de ${employeeName}`}
        onClose={() => {
          if (!busy) {
            if (dirty) setDiscard(true);
            else setOpened(false);
          }
        }}
        withCloseButton={!busy}
        closeOnClickOutside={!busy}
        closeOnEscape={!busy}
      >
        {discard && (
          <DiscardChangesPrompt
            disabled={busy}
            onDiscard={() => {
              setDiscard(false);
              setOpened(false);
            }}
            onContinue={() => setDiscard(false)}
          />
        )}
        {opened && (
          <EmployeeWeeklyBaseEditor
            key={`${businessId}:${employeeId}`}
            businessId={businessId}
            employeeId={employeeId}
            onBusy={setBusy}
            onDirtyChange={setDirty}
            onSaved={() => {
              setDiscard(false);
              setOpened(false);
            }}
          />
        )}
      </Modal>
    </>
  );
}
