import { BadRequestException } from "@nestjs/common";

export type Span = {
  start: number;
  end: number;
  pauses: { start: number; end: number }[];
};
export type Pattern = Span[][][];
const fail = (message: string): never => {
  throw new BadRequestException(message);
};
const record = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : fail("Datos de turno no válidos.");
export function integer(value: unknown, min: number, max: number): number {
  return typeof value === "number" &&
    Number.isInteger(value) &&
    value >= min &&
    value <= max
    ? value
    : fail("Valor numérico fuera de los límites permitidos.");
}
export function spans(value: unknown): Span[] {
  if (!Array.isArray(value) || value.length > 28)
    return fail("Indica como máximo 28 tramos.");
  const result = value
    .map((item) => {
      const input = record(item);
      const start = integer(input.start, 0, 1439),
        end = integer(input.end, 1, 2879);
      if (end <= start || end - start > 1440)
        return fail("Revisa el inicio y el fin del turno.");
      if (
        input.pauses !== undefined &&
        (!Array.isArray(input.pauses) || input.pauses.length > 28)
      )
        return fail("Pausas no válidas.");
      const pauses = ((input.pauses ?? []) as unknown[])
        .map((pause) => {
          const p = record(pause);
          return {
            start: integer(p.start, start, end - 1),
            end: integer(p.end, start + 1, end),
          };
        })
        .sort((a, b) => a.start - b.start);
      if (
        pauses.some(
          (p, i) => p.start >= p.end || (i > 0 && pauses[i - 1].end > p.start),
        )
      )
        return fail("Las pausas deben estar dentro del turno y no solaparse.");
      return { start, end, pauses };
    })
    .sort((a, b) => a.start - b.start);
  if (result.some((s, i) => i > 0 && result[i - 1].end > s.start))
    return fail("Los turnos no pueden solaparse.");
  return result;
}
export function pattern(value: unknown): Pattern {
  if (!Array.isArray(value) || value.length < 1 || value.length > 12)
    return fail("El ciclo debe tener entre 1 y 12 semanas.");
  const result = value.map((week) => {
    if (!Array.isArray(week) || week.length !== 7)
      return fail("Cada semana debe tener siete días.");
    const days = week.map(spans);
    if (days.reduce((sum, day) => sum + day.length, 0) > 28)
      return fail("Se permiten 28 tramos por semana.");
    return days;
  });
  const flattened = result.flatMap((week) => [...week.slice(1), week[0]]);
  flattened.forEach((day, index) => {
    const next = flattened[(index + 1) % flattened.length];
    if (
      day.some((s) => s.end > 1440 && next.some((n) => n.start < s.end - 1440))
    )
      fail("Un turno nocturno se solapa con el día siguiente.");
  });
  return result;
}
export function date(value: unknown): string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return fail("Indica una fecha válida.");
  const parsed = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
    ? value
    : fail("Fecha no válida.");
}
export function uuid(value: unknown): string {
  return typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    )
    ? value
    : fail("Identificador no válido.");
}
