import {
  Button,
  Checkbox,
  Group,
  SegmentedControl,
  Select,
  Stack,
  Text,
  Textarea,
  TextInput,
} from "@mantine/core";
import { useState } from "react";
import { dateInZone } from "../lib/team-quadrant";
import type {
  ScheduleBlock,
  ScheduleDay,
  ShiftTemplate,
} from "../lib/scheduling-api";
import { ScheduleSpansEditor } from "./ScheduleSpansEditor";
import { ScheduleChangeConfirm } from "./ScheduleChangeConfirm";
import { absenceTypes } from "../lib/scheduling-api";

export function ScheduleDayEditor({
  businessId,
  day,
  employee,
  templates,
  timezone,
  onSaved,
  onBusy,
}: {
  businessId: string;
  day: ScheduleDay;
  employee: { id: string; version: number };
  templates: ShiftTemplate[];
  timezone: string;
  onSaved: () => void;
  onBusy: (busy: boolean) => void;
}) {
  const [mode, setMode] = useState("day"),
    [spans, setSpans] = useState(day.draft);
  const [busy, setBusy] = useState(false);
  const [templateId, setTemplateId] = useState<string | null>(null),
    [week, setWeek] = useState("0");
  const [block, setBlock] = useState<ScheduleBlock | null>(null);
  const [blockType, setBlockType] = useState("VACATION"),
    [from, setFrom] = useState(day.date),
    [to, setTo] = useState(day.date);
  const [fullDays, setFullDays] = useState(true),
    [start, setStart] = useState("09:00"),
    [end, setEnd] = useState("10:00"),
    [reason, setReason] = useState("");
  const today = dateInZone(new Date(), timezone);
  const minutes = (time: string) => {
    const [h, m] = time.split(":").map(Number);
    return Number.isFinite(h + m) ? h * 60 + m : -1;
  };
  const common = {
    employeeIds: [employee.id],
    expectedVersions: { [employee.id]: employee.version },
  };
  const command =
    mode === "day"
      ? { ...common, type: "day", date: day.date, spans }
      : mode === "resetDay"
        ? { ...common, type: "resetDay", date: day.date }
        : mode === "deleteBlock"
          ? { ...common, type: "deleteBlock", date: from, blockId: block?.id }
          : {
              ...common,
              type: "absence",
              from,
              to,
              blockType,
              fullDays,
              start: minutes(start),
              end: minutes(end),
              reason,
              ...(block ? { blockId: block.id } : {}),
            };
  function selectBlock(value: ScheduleBlock) {
    setBlock(value);
    setBlockType(value.type);
    setReason(value.reason ?? "");
    setFullDays(false);
    setFrom(dateInZone(new Date(value.startAt), timezone));
    setTo(dateInZone(new Date(value.endAt), timezone));
    const format = (date: string) =>
      new Intl.DateTimeFormat("en-GB", {
        timeZone: timezone,
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      }).format(new Date(date));
    setStart(format(value.startAt));
    setEnd(format(value.endAt));
    setMode("absence");
  }
  const template = templates.find((item) => item.id === templateId);
  return (
    <Stack gap="md">
      <SegmentedControl
        disabled={busy}
        value={mode === "deleteBlock" ? "absence" : mode}
        onChange={(value) => {
          setMode(value);
          setBlock(null);
        }}
        data={[
          { value: "day", label: "Turnos del día" },
          { value: "absence", label: "Ausencia" },
          { value: "resetDay", label: "Horario habitual" },
        ]}
      />
      {mode === "day" && (
        <>
          <Text size="sm">
            Estos turnos sustituyen el horario de este día. Para dejarlo libre,
            quita todos los turnos.
          </Text>
          <Group grow>
            <Select
              label="Usar una plantilla"
              clearable
              value={templateId}
              disabled={busy}
              onChange={(value) => {
                setTemplateId(value);
                setWeek("0");
              }}
              data={templates.map((item) => ({
                value: item.id,
                label: item.name,
              }))}
            />
            {template && (
              <Select
                label="Semana de la plantilla"
                allowDeselect={false}
                value={week}
                disabled={busy}
                onChange={(value) => setWeek(value ?? "0")}
                data={template.pattern.map((_, index) => ({
                  value: String(index),
                  label: `Semana ${index + 1}`,
                }))}
              />
            )}
          </Group>
          {template && (
            <Button
              variant="light"
              disabled={busy}
              onClick={() =>
                setSpans(
                  structuredClone(
                    template.pattern[Number(week)][
                      new Date(`${day.date}T12:00Z`).getUTCDay()
                    ],
                  ),
                )
              }
            >
              Copiar turnos de la plantilla
            </Button>
          )}
          <ScheduleSpansEditor
            disabled={busy}
            value={spans}
            onChange={setSpans}
          />
          <Button
            variant="subtle"
            color="red"
            disabled={busy}
            onClick={() => setSpans([])}
          >
            Dejar el día libre
          </Button>
        </>
      )}
      {mode === "resetDay" && (
        <Text>
          Se quitará el horario particular de este día y se usará el ciclo
          asignado o el horario semanal vigente. Las ausencias no se eliminan.
        </Text>
      )}
      {(mode === "absence" || mode === "deleteBlock") && (
        <>
          {day.blocks
            .filter((item) => item.employeeId === employee.id)
            .map((item) => (
              <Group key={item.id} justify="space-between">
                <Text size="sm">
                  {absenceTypes.find((type) => type.value === item.type)
                    ?.label ?? "No disponible"}
                </Text>
                <Button
                  variant="subtle"
                  disabled={
                    busy || dateInZone(new Date(item.startAt), timezone) < today
                  }
                  onClick={() => selectBlock(item)}
                >
                  Editar ausencia
                </Button>
              </Group>
            ))}
          {mode === "deleteBlock" ? (
            <Text>
              Se retirará esta ausencia. El horario habitual se conserva.
            </Text>
          ) : (
            <>
              <Select
                label="Motivo de la ausencia"
                value={blockType}
                allowDeselect={false}
                disabled={busy}
                data={absenceTypes}
                onChange={(value) => setBlockType(value ?? "VACATION")}
              />
              <Checkbox
                label="Días completos"
                checked={fullDays}
                disabled={busy}
                onChange={(event) => setFullDays(event.currentTarget.checked)}
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
                  label="Hasta, incluido"
                  min={from}
                  value={to}
                  disabled={busy}
                  onChange={(event) => setTo(event.currentTarget.value)}
                />
              </Group>
              {!fullDays && (
                <Group grow>
                  <TextInput
                    type="time"
                    label="Hora de inicio"
                    value={start}
                    disabled={busy}
                    onChange={(event) => setStart(event.currentTarget.value)}
                  />
                  <TextInput
                    type="time"
                    label="Hora de fin"
                    value={end}
                    disabled={busy}
                    onChange={(event) => setEnd(event.currentTarget.value)}
                  />
                </Group>
              )}
              <Textarea
                label="Nota interna"
                description="Solo para quienes gestionan el equipo."
                maxLength={255}
                value={reason}
                disabled={busy}
                onChange={(event) => setReason(event.currentTarget.value)}
              />
              {block && (
                <Group>
                  <Button
                    variant="subtle"
                    disabled={busy}
                    onClick={() => {
                      setBlock(null);
                      setFrom(day.date);
                      setTo(day.date);
                      setReason("");
                    }}
                  >
                    Crear otra ausencia
                  </Button>
                  <Button
                    color="red"
                    variant="subtle"
                    disabled={busy}
                    onClick={() => setMode("deleteBlock")}
                  >
                    Retirar esta ausencia
                  </Button>
                </Group>
              )}
            </>
          )}
        </>
      )}
      <ScheduleChangeConfirm
        businessId={businessId}
        timezone={timezone}
        command={command}
        onSaved={onSaved}
        onBusy={(value) => {
          setBusy(value);
          onBusy(value);
        }}
      />
    </Stack>
  );
}
