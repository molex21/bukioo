import type { ScheduleSpan } from "./scheduling-api";
export type DayDraft = { id: string; label: string; spans: ScheduleSpan[] };
export function nominalMinutes(spans: ScheduleSpan[]): number | null {
  const ordered = [...spans].sort((a, b) => a.start - b.start);
  let total = 0;
  for (let i = 0; i < ordered.length; i++) {
    const s = ordered[i];
    if (
      !Number.isInteger(s.start) ||
      !Number.isInteger(s.end) ||
      s.start < 0 ||
      s.start > 1439 ||
      s.end <= s.start ||
      s.end > 2879 ||
      s.end - s.start > 1440 ||
      (i > 0 && ordered[i - 1].end > s.start)
    )
      return null;
    let last = s.start;
    total += s.end - s.start;
    for (const p of [...s.pauses].sort((a, b) => a.start - b.start)) {
      if (
        !Number.isInteger(p.start) ||
        !Number.isInteger(p.end) ||
        p.start < last ||
        p.end <= p.start ||
        p.end > s.end ||
        (p.countsAsWork !== undefined && typeof p.countsAsWork !== "boolean")
      )
        return null;
      if (!p.countsAsWork) total -= p.end - p.start;
      last = p.end;
    }
  }
  return total;
}
export const formatWorkMinutes = (minutes: number | null) =>
  minutes === null || !Number.isFinite(minutes) || minutes < 0
    ? "Revisa los turnos"
    : `${Math.floor(Math.round(minutes) / 60)} h ${String(Math.round(minutes) % 60).padStart(2, "0")} min`;
export function totalNominalMinutes(days: ScheduleSpan[][]): number | null {
  const values = days.map(nominalMinutes);
  return values.some((n) => n === null)
    ? null
    : values.reduce<number>((sum, n) => sum + (n ?? 0), 0);
}
export const spanLabel = (s: Pick<ScheduleSpan, "start" | "end">) => {
  const time = (n: number) =>
    `${String(Math.floor(n / 60) % 24).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}${n >= 1440 ? " (+1 día)" : ""}`;
  return `${time(s.start)}–${time(s.end)}`;
};
export function replaceSelectedDays(
  days: DayDraft[],
  ids: string[],
  spans: ScheduleSpan[],
): DayDraft[] {
  return days.map((d) =>
    ids.includes(d.id) ? { ...d, spans: structuredClone(spans) } : d,
  );
}
export function commonDaySpans(
  days: DayDraft[],
  ids: string[],
): ScheduleSpan[] | null {
  const chosen = days.filter((d) => ids.includes(d.id));
  if (!chosen.length) return null;
  const normalized = (spans: ScheduleSpan[]) =>
    JSON.stringify(
      spans.map((s) => ({
        ...s,
        pauses: s.pauses.map((p) => ({
          ...p,
          countsAsWork: p.countsAsWork ?? false,
        })),
      })),
    );
  return chosen.every(
    (d) => normalized(d.spans) === normalized(chosen[0].spans),
  )
    ? structuredClone(chosen[0].spans)
    : null;
}
export function rotationRangePreview(
  pattern: ScheduleSpan[][][],
  from: string,
  to: string,
  phase = 0,
) {
  const parse = (date: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return NaN;
    const n = Date.parse(`${date}T00:00Z`);
    return Number.isFinite(n) && new Date(n).toISOString().slice(0, 10) === date
      ? n
      : NaN;
  };
  const start = parse(from),
    end = parse(to),
    totalCycle = totalNominalMinutes(pattern.flat());
  if (
    !Number.isFinite(start) ||
    !Number.isFinite(end) ||
    end < start ||
    !pattern.length ||
    totalCycle === null ||
    !Number.isInteger(phase) ||
    phase < 0 ||
    phase >= pattern.length
  )
    return null;
  const count = Math.round((end - start) / 86400000) + 1,
    offset = (new Date(start).getUTCDay() + 6) % 7,
    period = pattern.length * 7;
  const dayAt = (i: number) => {
    const week = (Math.floor((offset + i) / 7) + phase) % pattern.length,
      day = new Date(start + i * 86400000).getUTCDay();
    return { week, spans: pattern[week][day] };
  };
  let total = Math.floor(count / period) * totalCycle;
  for (let i = 0; i < count % period; i++)
    total += nominalMinutes(dayAt(i).spans) ?? 0;
  const last = dayAt(count - 1).spans;
  const clipped = last.map((s) => ({
    ...s,
    end: Math.min(s.end, 1440),
    pauses: s.pauses
      .filter((p) => p.start < 1440)
      .map((p) => ({ ...p, end: Math.min(p.end, 1440) })),
  }));
  total -= (nominalMinutes(last) ?? 0) - (nominalMinutes(clipped) ?? 0);
  const days = Array.from({ length: Math.min(count, 42) }, (_, i) => ({
    date: new Date(start + i * 86400000).toISOString().slice(0, 10),
    ...dayAt(i),
    ...(i === count - 1 ? { spans: clipped } : {}),
  }));
  return { totalMinutes: total, days, truncated: count > 42, count };
}
