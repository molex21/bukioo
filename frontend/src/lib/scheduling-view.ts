export function isScheduleDate(
  value: string | null | undefined,
): value is string {
  if (
    !value ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    Number(value.slice(0, 4)) < 1900
  )
    return false;
  const instant = new Date(`${value}T12:00Z`);
  return (
    Number.isFinite(instant.getTime()) &&
    instant.toISOString().slice(0, 10) === value
  );
}
export function schedulePage(value: string | null) {
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 && n <= 10000 ? n : 1;
}
export function updateScheduleSearch(
  current: URLSearchParams,
  updates: Record<string, string | null>,
) {
  const next = new URLSearchParams(current);
  for (const [key, value] of Object.entries(updates)) {
    if (value === null || value === "") next.delete(key);
    else next.set(key, value);
  }
  return next;
}
