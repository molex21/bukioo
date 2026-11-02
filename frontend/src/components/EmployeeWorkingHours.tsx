import { Button, Modal } from "@mantine/core";
import { useState } from "react";
import { EmployeeWeeklyBaseEditor } from "./EmployeeWeeklyBaseEditor";

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
  return (
    <>
      <Button
        size="xs"
        variant="subtle"
        disabled={disabled || busy}
        aria-label={`Horario semanal de ${employeeName}`}
        onClick={() => setOpened(true)}
      >
        Horario semanal
      </Button>
      <Modal
        opened={opened}
        size="xl"
        centered
        title={`Horario semanal de ${employeeName}`}
        onClose={() => {
          if (!busy) setOpened(false);
        }}
        withCloseButton={!busy}
        closeOnClickOutside={!busy}
        closeOnEscape={!busy}
      >
        {opened && (
          <EmployeeWeeklyBaseEditor
            key={`${businessId}:${employeeId}`}
            businessId={businessId}
            employeeId={employeeId}
            onBusy={setBusy}
            onSaved={() => {
              setOpened(false);
            }}
          />
        )}
      </Modal>
    </>
  );
}
