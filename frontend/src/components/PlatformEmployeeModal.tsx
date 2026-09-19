import { Alert, Badge, Button, ColorInput, Group, Modal, Select, Skeleton, Stack, Text, Textarea, TextInput } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { ApiError } from "../lib/api-client";
import { superadminApi, type PlatformEmployeeDetail, type UpdatePlatformEmployeeInput } from "../lib/superadmin-api";

type Props = {
  organizationId: string;
  businessId: string;
  businessName: string;
  employeeId: string;
  canEdit: boolean;
  onClose: () => void;
  onChanged: (status: number) => void;
};

export function PlatformEmployeeModal({ organizationId, businessId, businessName, employeeId, canEdit, onClose, onChanged }: Props) {
  const [employee, setEmployee] = useState<PlatformEmployeeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [blocked, setBlocked] = useState(false);
  const [revision, setRevision] = useState(0);
  const [pending, setPending] = useState<UpdatePlatformEmployeeInput | null>(null);
  const submitting = useRef(false);

  useEffect(() => {
    let active = true;
    void superadminApi.getEmployee(organizationId, businessId, employeeId).then((response) => {
      if (active) { setEmployee(response); setError(null); setBlocked(false); }
    }).catch((cause: unknown) => {
      if (active) { setEmployee(null); setError(cause instanceof ApiError ? cause.message : "No se pudieron cargar los datos del empleado."); }
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [organizationId, businessId, employeeId, revision]);

  function reload() { setLoading(true); setPending(null); setRevision((value) => value + 1); }

  async function save(input: UpdatePlatformEmployeeInput) {
    if (submitting.current || blocked || !canEdit) return;
    submitting.current = true; setSaving(true); setError(null);
    try {
      await superadminApi.updateEmployee(organizationId, businessId, employeeId, input);
      notifications.show({ title: "Empleado actualizado", message: "Se han guardado sus datos. La cuenta y los permisos de usuario no han cambiado.", color: "green", autoClose: 15000, classNames: { root: "platform-create-notification" } });
      onChanged(200); onClose();
    } catch (cause) {
      const status = cause instanceof ApiError ? cause.status : 0;
      setError(cause instanceof ApiError ? cause.message : "No se pudo confirmar el cambio. Actualiza los datos antes de volver a guardar.");
      setPending(null);
      if ([403, 404, 409].includes(status) || status === 0 || status >= 500) { setBlocked(true); onChanged(status); }
    } finally { submitting.current = false; setSaving(false); }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!employee || saving || blocked || !canEdit) return;
    const data = new FormData(event.currentTarget);
    const field = (name: string) => String(data.get(name) ?? "").trim();
    if (!field("firstName") || !field("lastName")) { setError("Completa el nombre y los apellidos."); return; }
    const input: UpdatePlatformEmployeeInput = {
      expectedUpdatedAt: employee.updatedAt,
      firstName: field("firstName"), lastName: field("lastName"), email: field("email") || null,
      phone: field("phone") || null, color: field("color") || null, notes: field("notes") || null,
      isActive: field("status") === "ACTIVE",
    };
    if (input.isActive !== employee.isActive) setPending(input); else void save(input);
  }

  const disabled = !canEdit || saving || blocked || Boolean(pending);
  return <Modal opened centered size="lg" title="Datos del empleado" onClose={() => { if (!submitting.current) onClose(); }} closeOnClickOutside={!saving} closeOnEscape={!saving} withCloseButton={!saving}>
    <Stack>
      <Text size="sm" c="dimmed">{businessName} · Datos propios de la ficha de agenda de esta empresa. Editarlos aquí no cambia la cuenta de acceso; el correo de contacto tampoco cambia el email de inicio de sesión. Los cambios de nombre y teléfono hechos desde «Mis datos» del usuario sí se reflejan en sus fichas activas.</Text>
      {error && <Alert color="red" title="No se pudo completar">{error}<Button variant="subtle" disabled={saving} onClick={reload}>Actualizar datos</Button></Alert>}
      {loading ? <Skeleton height={300} /> : employee && <form key={`${employee.id}-${revision}`} onSubmit={submit}><Stack>
        <Badge variant="light" color={employee.userId ? "violet" : "gray"}>{employee.userId ? "Usuario vinculado" : "Sin acceso al panel"}</Badge>
        {!canEdit && <Alert color="yellow">Los datos están en modo consulta. Para editarlos necesitas permisos y una organización y empresa activas.</Alert>}
        <TextInput name="firstName" label="Nombre" defaultValue={employee.firstName} required maxLength={100} disabled={disabled} />
        <TextInput name="lastName" label="Apellidos" defaultValue={employee.lastName} required maxLength={150} disabled={disabled} />
        <TextInput name="email" label="Correo de contacto" description="Cambiarlo no modifica el correo utilizado para iniciar sesión." type="email" defaultValue={employee.email ?? ""} maxLength={320} disabled={disabled} />
        <TextInput name="phone" label="Teléfono" type="tel" defaultValue={employee.phone ?? ""} maxLength={32} disabled={disabled} />
        <ColorInput name="color" label="Color en la agenda" format="hex" defaultValue={employee.color ?? ""} disallowInput withPreview withEyeDropper={false} swatches={["#6C5CE7", "#3B82F6", "#2DD4BF", "#16A34A", "#F59E0B", "#EF4444"]} disabled={disabled} />
        <Textarea name="notes" label="Notas internas" description="Observaciones sobre el empleado en esta empresa." defaultValue={employee.notes ?? ""} maxLength={2000} autosize minRows={3} disabled={disabled} />
        <Select name="status" label="Permiso para atender citas" defaultValue={employee.isActive ? "ACTIVE" : "ARCHIVED"} allowDeselect={false} data={[{ value: "ACTIVE", label: "Puede atender citas" }, { value: "ARCHIVED", label: "Permiso de agenda revocado" }]} disabled={disabled} />
        <Text size="xs" c="dimmed">Revocar el permiso de agenda retira al empleado de las nuevas reservas. El historial y las citas existentes se conservan, y sus permisos de usuario no cambian.</Text>
        {pending && <Alert color={pending.isActive ? "violet" : "red"} title={pending.isActive ? "¿Restablecer permiso de agenda?" : "¿Revocar permiso de agenda?"}>
          <Text size="sm">{pending.isActive ? "Volverá a estar disponible para nuevas citas según sus servicios y horarios. Se comprobará el límite de empleados del plan." : "Dejará de estar disponible para nuevas reservas. Sus citas existentes no se cancelarán: revísalas antes de continuar."} También se guardarán los cambios del formulario.</Text>
          <Group justify="flex-end" mt="md"><Button type="button" variant="default" disabled={saving} onClick={() => setPending(null)}>Volver</Button><Button type="button" color={pending.isActive ? "violet" : "red"} loading={saving} onClick={() => void save(pending)}>{pending.isActive ? "Restablecer y guardar" : "Revocar permiso y guardar"}</Button></Group>
        </Alert>}
        <Group justify="flex-end"><Button type="button" variant="default" disabled={saving} onClick={onClose}>Cerrar</Button>{canEdit && !pending && <Button type="submit" disabled={blocked} loading={saving}>Guardar cambios</Button>}</Group>
      </Stack></form>}
    </Stack>
  </Modal>;
}
