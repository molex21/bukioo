import {
  Alert,
  Checkbox,
  Group,
  NumberInput,
  Select,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { useState } from "react";
import type { ScheduleQuadrant, ShiftTemplate } from "../lib/scheduling-api";
import { ScheduleChangeConfirm } from "./ScheduleChangeConfirm";
import { dateInZone } from "../lib/team-quadrant";

export function ScheduleAssignmentEditor({
  businessId,
  employees,
  templates,
  timezone,
  onSaved,
  onBusy,
}: {
  businessId: string;
  employees: ScheduleQuadrant["employees"];
  templates: ShiftTemplate[];
  timezone: string;
  onSaved: () => void;
  onBusy: (busy: boolean) => void;
}) {
  const today = dateInZone(new Date(), timezone);
  const [selected, setSelected] = useState<string[]>([]),
    [templateId, setTemplateId] = useState<string | null>(null);
  const [from, setFrom] = useState(today),
    [to, setTo] = useState(""),
    [busy, setBusy] = useState(false);
  const [phases, setPhases] = useState<Record<string, number>>({});
  const template = templates.find((item) => item.id === templateId);
  return (
    <Stack gap="md">
      <Text size="sm">
        Selecciona empleados de esta página y la fecha desde la que se repetirá
        el ciclo. La copia asignada no cambia al editar la plantilla.
      </Text>
      {!templates.length && (
        <Alert color="yellow">
          Crea primero una plantilla con los turnos del ciclo.
        </Alert>
      )}
      <Checkbox.Group label="Empleados" value={selected} onChange={setSelected}>
        <Stack gap="xs">
          {employees.map((employee) => (
            <Checkbox
              key={employee.id}
              value={employee.id}
              disabled={busy}
              label={`${employee.first_name} ${employee.last_name}`}
            />
          ))}
        </Stack>
      </Checkbox.Group>
      <Select
        label="Plantilla"
        searchable
        value={templateId}
        disabled={busy}
        onChange={(value) => {
          setTemplateId(value);
          setPhases({});
        }}
        data={templates.map((item) => ({ value: item.id, label: item.name }))}
      />
      <Group grow>
        <TextInput
          type="date"
          label="Desde"
          min={today}
          value={from}
          disabled={busy}
          onChange={(event) => setFrom(event.currentTarget.value)}
        />
        <TextInput
          type="date"
          label="Hasta, incluido (opcional)"
          min={from}
          value={to}
          disabled={busy}
          onChange={(event) => setTo(event.currentTarget.value)}
        />
      </Group>
      {template &&
        selected.map((id) => (
          <NumberInput
            key={id}
            label={`Semana inicial de ${employees.find((item) => item.id === id)?.first_name}`}
            description="Permite que cada empleado empiece en una semana distinta del ciclo."
            min={1}
            max={template.pattern.length}
            allowDecimal={false}
            value={(phases[id] ?? 0) + 1}
            disabled={busy}
            onChange={(value) => {
              if (typeof value === "number")
                setPhases((current) => ({ ...current, [id]: value - 1 }));
            }}
          />
        ))}
      {template && selected.length > 0 && (
        <ScheduleChangeConfirm
          businessId={businessId}
          timezone={timezone}
          command={{
            type: "assignment",
            employeeIds: selected,
            expectedVersions: Object.fromEntries(
              employees
                .filter((item) => selected.includes(item.id))
                .map((item) => [item.id, item.version]),
            ),
            templateId,
            templateVersion: template.version,
            from,
            ...(to ? { to } : {}),
            phases,
          }}
          onSaved={onSaved}
          onBusy={(value) => {
            setBusy(value);
            onBusy(value);
          }}
        />
      )}
    </Stack>
  );
}
