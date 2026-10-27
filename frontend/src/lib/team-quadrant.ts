export type QuadrantBlock = {
  id: string;
  employee_id: string | null;
  type: string;
  start_at: string;
  end_at: string;
};

export function dateInZone(instant: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(instant);
  const part = (type: string) =>
    parts.find((item) => item.type === type)?.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function addCalendarDays(date: string, count: number): string {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + count);
  return value.toISOString().slice(0, 10);
}

export function weekDates(date: string, offset = 0): string[] {
  const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
  const monday = addCalendarDays(date, -((weekday + 6) % 7) + offset * 7);
  return Array.from({ length: 7 }, (_, index) =>
    addCalendarDays(monday, index),
  );
}

export function blockTouchesDate(
  block: QuadrantBlock,
  date: string,
  timezone: string,
): boolean {
  const start = new Date(block.start_at);
  const end = new Date(block.end_at);
  if (
    !Number.isFinite(start.getTime()) ||
    !Number.isFinite(end.getTime()) ||
    start >= end
  )
    return false;
  return (
    dateInZone(start, timezone) <= date &&
    dateInZone(new Date(end.getTime() - 1), timezone) >= date
  );
}

export function blockTimeLabel(
  block: QuadrantBlock,
  date: string,
  timezone: string,
): string {
  const time = (instant: Date) =>
    new Intl.DateTimeFormat("es", {
      timeZone: timezone,
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).format(instant);
  const start = new Date(block.start_at);
  const end = new Date(block.end_at);
  const startLabel = dateInZone(start, timezone) < date ? "00:00" : time(start);
  const endLabel = dateInZone(end, timezone) > date ? "24:00" : time(end);
  return startLabel === "00:00" && endLabel === "24:00"
    ? "Todo el día"
    : `${startLabel}–${endLabel}`;
}

export function hoursOnDate<
  T extends {
    day_of_week: number;
    start_time: string;
    end_time: string;
    valid_from: string | null;
    valid_to: string | null;
  },
>(hours: T[], date: string): T[] {
  const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
  return hours
    .filter(
      (hour) =>
        hour.day_of_week === weekday &&
        (!hour.valid_from || hour.valid_from.slice(0, 10) <= date) &&
        (!hour.valid_to || hour.valid_to.slice(0, 10) >= date),
    )
    .sort((left, right) => left.start_time.localeCompare(right.start_time));
}
