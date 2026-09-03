export const appointmentStatus = {
  CANCELLED: { color: "red", label: "Cancelada" },
  COMPLETED: { color: "teal", label: "Completada" },
  CONFIRMED: { color: "green", label: "Confirmada" },
  NO_SHOW: { color: "gray", label: "No asistió" },
  PENDING: { color: "yellow", label: "Pendiente" },
} as const;

export type AppointmentStatus = keyof typeof appointmentStatus;

export function getAppointmentStatusLabel(status: string) {
  return appointmentStatus[status as AppointmentStatus]?.label ?? status;
}
