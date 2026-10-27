import { ConflictException } from "@nestjs/common";

export function schedulingError(error: unknown): unknown {
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    error.message === "scheduling_conflict"
  ) {
    let conflicts: unknown = [];
    if ("detail" in error && typeof error.detail === "string") {
      try {
        conflicts = JSON.parse(error.detail) as unknown;
      } catch {
        conflicts = [];
      }
    }
    return new ConflictException({
      message:
        "El cambio dejaría citas fuera del horario disponible. Revisa las citas afectadas antes de continuar.",
      code: "SCHEDULE_CONFLICT",
      conflicts,
    });
  }
  return error;
}
