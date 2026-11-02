import { authenticatedApiRequest } from "./api-client";
export const absenceTypes = [
  { value: "BREAK", label: "Pausa" },
  { value: "VACATION", label: "Vacaciones" },
  { value: "PERMISSION", label: "Permiso" },
  { value: "MEETING", label: "Reunión" },
  { value: "ABSENCE", label: "Ausencia" },
  { value: "PERSONAL", label: "Asunto personal" },
  { value: "HOLIDAY", label: "Festivo" },
  { value: "MANUAL_BLOCK", label: "No disponible" },
  { value: "OTHER", label: "Otro motivo" },
];
export type ScheduleSpan = {
  start: number;
  end: number;
  pauses: { start: number; end: number; countsAsWork?: boolean }[];
};
export type SchedulePattern = ScheduleSpan[][][];
export type ShiftTemplate = {
  kind: "DAY" | "CYCLE";
  id: string;
  name: string;
  pattern: SchedulePattern;
  version: number;
};
export type ScheduleBlock = {
  id: string;
  type: string;
  employeeId: string | null;
  startAt: string;
  endAt: string;
  reason: string | null;
  version: number;
};
export type ScheduleDay = {
  employeeId: string;
  date: string;
  origin: string;
  ambiguous: boolean;
  draft: ScheduleSpan[];
  presence: { startAt: string; endAt: string }[];
  attention: { startAt: string; endAt: string }[];
  presenceMinutes: number;
  workMinutes: number | null;
  attentionMinutes: number;
  blocks: ScheduleBlock[];
};
export type ScheduleQuadrant = {
  timezone: string;
  from: string;
  to: string;
  employees: {
    id: string;
    first_name: string;
    last_name: string;
    color: string | null;
    version: number;
  }[];
  days: ScheduleDay[];
  total: number;
  offset: number;
  limit: number;
};
export type SchedulePreview = {
  estimatedFrom?: string;
  estimatedTo?: string;
  estimatedTruncated?: boolean;
  estimatedDays?: {
    employeeId: string;
    date: string;
    minutes: number | null;
  }[];
  estimatedTotalMinutes?: number | null;
  restoredDay?: {
    spans: ScheduleSpan[];
    origin: string;
    ambiguous: boolean;
    attention: { startAt: string; endAt: string }[];
  };
  ok: boolean;
  preview: boolean;
  conflicts: { id: string; employeeId: string; startAt: string }[];
};
export type Reassignment = {
  employeeName?: string;
  startAt?: string;
  appointmentId: string;
  employeeId: string;
  expectedEmployeeId: string;
  expectedUpdatedAt: string;
};
export type ReassignmentOptions = Omit<Reassignment, "employeeId"> & {
  serviceName: string;
  startAt: string;
  employees: { id: string; name: string }[];
};
export type WeeklyBase = {
  week: ScheduleSpan[][];
  version: number;
  timezone: string;
  from: string;
  today: string;
  nextDate: string | null;
};
const base = (biz: string) => `/businesses/${biz}/scheduling`;
export const schedulingApi = {
  weeklyBase: (biz: string, emp: string, from: string) =>
    authenticatedApiRequest<WeeklyBase>(
      `${base(biz)}/weekly-base/${emp}?${new URLSearchParams({ from })}`,
    ),
  reassignmentOptions: (biz: string, appointment: string) =>
    authenticatedApiRequest<ReassignmentOptions>(
      `${base(biz)}/reassignment-options/${appointment}`,
    ),
  quadrant: (
    biz: string,
    from: string,
    to: string,
    employeeId: string | null,
    page: number,
  ) =>
    authenticatedApiRequest<ScheduleQuadrant>(
      `${base(biz)}/quadrant?${new URLSearchParams({ from, to, offset: String((page - 1) * 10), ...(employeeId ? { employeeId } : {}) })}`,
    ),
  templates: (biz: string) =>
    authenticatedApiRequest<ShiftTemplate[]>(`${base(biz)}/templates`),
  saveTemplate: (
    biz: string,
    name: string,
    pattern: SchedulePattern,
    template?: ShiftTemplate,
    kind: "DAY" | "CYCLE" = template?.kind ?? "CYCLE",
  ) =>
    authenticatedApiRequest<ShiftTemplate>(
      `${base(biz)}/templates${template ? `/${template.id}` : ""}`,
      {
        method: template ? "PATCH" : "POST",
        body: JSON.stringify({
          name,
          pattern,
          kind,
          ...(template ? { expectedVersion: template.version } : {}),
        }),
      },
    ),
  archiveTemplate: (biz: string, template: ShiftTemplate) =>
    authenticatedApiRequest(`${base(biz)}/templates/${template.id}`, {
      method: "DELETE",
      body: JSON.stringify({ command: { expectedVersion: template.version } }),
    }),
  change: (biz: string, command: Record<string, unknown>, preview: boolean) =>
    authenticatedApiRequest<SchedulePreview>(
      `${base(biz)}/${preview ? "preview" : "changes"}`,
      { method: preview ? "POST" : "PUT", body: JSON.stringify({ command }) },
    ),
};
