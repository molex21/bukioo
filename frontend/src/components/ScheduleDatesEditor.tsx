import { Alert, Stack } from "@mantine/core";
import { useState } from "react";
import type { ScheduleDay, ShiftTemplate } from "../lib/scheduling-api";
import { ScheduleWeekEditor } from "./ScheduleWeekEditor";
import { ScheduleChangeConfirm } from "./ScheduleChangeConfirm";
import { useUnsavedChanges } from "../hooks/useUnsavedChanges";
import { totalNominalMinutes } from "../lib/schedule-editor";
export function ScheduleDatesEditor({
  businessId,
  employee,
  days,
  templates,
  timezone,
  onSaved,
  onBusy,
  onDirtyChange,
}: {
  businessId: string;
  employee: { id: string; version: number };
  days: ScheduleDay[];
  templates: ShiftTemplate[];
  timezone: string;
  onSaved: () => void;
  onBusy: (busy: boolean) => void;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const [draft, setDraft] = useState(() =>
    days.map((d) => ({
      id: d.date,
      label: new Date(`${d.date}T12:00Z`).toLocaleDateString("es", {
        timeZone: "UTC",
        weekday: "short",
        day: "numeric",
        month: "short",
      }),
      spans: structuredClone(d.draft),
    })),
  );
  const [busy, setBusy] = useState(false);
  useUnsavedChanges(
    JSON.stringify(draft.map((d) => ({ date: d.id, spans: d.spans }))) !==
      JSON.stringify(days.map((d) => ({ date: d.date, spans: d.draft }))),
    onDirtyChange,
  );
  return (
    <Stack>
      <Alert color="blue">
        Estos cambios afectan solo a las fechas mostradas de este empleado. No
        se repiten cada semana. Las ausencias se mantienen.
      </Alert>
      <ScheduleWeekEditor
        days={draft}
        templates={templates}
        disabled={busy}
        onChange={setDraft}
        initialSelected={draft.map((d) => d.id)}
      />
      <ScheduleChangeConfirm
        disabled={totalNominalMinutes(draft.map((d) => d.spans)) === null}
        businessId={businessId}
        timezone={timezone}
        command={{
          type: "dates",
          date: [...draft].sort((a, b) => a.id.localeCompare(b.id))[0].id,
          entries: draft.map((d) => ({ date: d.id, spans: d.spans })),
          employeeIds: [employee.id],
          expectedVersions: { [employee.id]: employee.version },
        }}
        onSaved={onSaved}
        onBusy={(value) => {
          setBusy(value);
          onBusy(value);
        }}
      />
    </Stack>
  );
}
