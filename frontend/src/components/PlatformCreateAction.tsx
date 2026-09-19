import { Alert, Button, ColorInput, Group, Modal, Select, SimpleGrid, Stack, Text, TextInput } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { CircleAlert, CircleCheck, Plus } from "lucide-react";
import { useRef, useState, type FormEvent } from "react";
import { ApiError } from "../lib/api-client";
import { superadminApi } from "../lib/superadmin-api";
import "./PlatformCreateAction.css";

type Props = { onCreated: (id: string) => void; onReconcile?: (status: number) => void; disabled?: boolean } & (
  | { kind: "organization" }
  | { kind: "business"; organizationId: string; contextName: string }
  | { kind: "employee"; organizationId: string; businessId: string; contextName: string }
);

const labels = {
  organization: { title: "Nueva organización", submit: "Crear organización", success: "Organización creada" },
  business: { title: "Nueva empresa", submit: "Crear empresa", success: "Empresa creada" },
  employee: { title: "Invitar usuario", submit: "Crear e invitar", success: "Usuario invitado" },
};

const timezoneOptions = [...new Set(["UTC", ...Intl.supportedValuesOf("timeZone")])].sort();
const slugPattern = "[a-z0-9]+(?:-[a-z0-9]+)*";

function TimezoneField({ disabled }: { disabled: boolean }) {
  return <Select data={timezoneOptions} defaultValue="UTC" description="Zona horaria que utilizarán los horarios de la empresa." disabled={disabled} label="Zona horaria" name="timezone" searchable allowDeselect={false} nothingFoundMessage="No se encontraron zonas horarias" required />;
}

export function PlatformCreateAction(props: Props) {
  const [opened, setOpened] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uncertain, setUncertain] = useState(false);
  const submitting = useRef(false);
  const label = labels[props.kind];

  function close() {
    if (!submitting.current) setOpened(false);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current || uncertain) return;
    const data = new FormData(event.currentTarget);
    const field = (name: string) => String(data.get(name) ?? "").trim();
    const requiredFields = props.kind === "organization"
      ? ["organizationName", "organizationSlug", "firstName", "lastName", "email", "timezone"]
      : props.kind === "business" ? ["name", "slug", "timezone"] : ["firstName", "lastName", "email", "role"];
    if (requiredFields.some((name) => !field(name))) {
      setError("Completa los campos obligatorios; no pueden contener solo espacios.");
      return;
    }
    const timezone = field("timezone");
    if (props.kind !== "employee" && !timezoneOptions.includes(timezone)) {
      setError("Selecciona una zona horaria de la lista.");
      return;
    }
    submitting.current = true;
    setSaving(true);
    setError(null);
    let createdId: string;
    try {
      if (props.kind === "organization") {
        const result = await superadminApi.createOrganization({
          organizationName: field("organizationName"), organizationSlug: field("organizationSlug"),
          firstName: field("firstName"), lastName: field("lastName"), email: field("email").toLowerCase(), timezone,
        });
        createdId = result.organization.id;
      } else if (props.kind === "business") {
        const result = await superadminApi.createBusiness(props.organizationId, {
          name: field("name"), slug: field("slug"), email: field("email").toLowerCase() || undefined,
          phone: field("phone") || undefined, logoUrl: field("logoUrl") || undefined, timezone,
        });
        createdId = result.id;
      } else {
        const role = field("role");
        if (role !== "EMPLOYEE" && role !== "MANAGER") throw new Error("Selecciona un rol válido.");
        const result = await superadminApi.createEmployee(props.organizationId, props.businessId, {
          firstName: field("firstName"), lastName: field("lastName"), email: field("email").toLowerCase(),
          phone: field("phone") || undefined, color: field("color") || undefined, role,
        });
        createdId = result.id;
      }
    } catch (requestError) {
      const status = requestError instanceof ApiError ? requestError.status : 0;
      if (status === 0 || status >= 500) setUncertain(true);
      if ([403, 404, 409].includes(status) || status === 0 || status >= 500) props.onReconcile?.(status);
      setError(requestError instanceof ApiError && requestError.status < 500
        ? requestError.message
        : status === 503 ? "El correo no se ha podido confirmar, pero el alta puede haberse guardado. Cierra este formulario y comprueba el equipo antes de volver a invitar."
          : "No se pudo confirmar la creación. Cierra este formulario y comprueba la lista antes de volver a enviarlo.");
      return;
    } finally {
      submitting.current = false;
      setSaving(false);
    }
    setOpened(false);
    notifications.show({
      title: label.success, message: props.kind === "employee" ? "Ya puedes consultar al usuario en «Usuarios y permisos» y su registro en «Empleados»." : "Ya puedes consultar los datos creados.",
      color: "green", icon: <CircleCheck size={18} />, autoClose: 15000, withBorder: true,
      classNames: { root: "platform-create-notification" },
    });
    props.onCreated(createdId);
  }

  return <>
    <Button disabled={props.disabled} leftSection={<Plus size={16} />} onClick={() => { setError(null); setUncertain(false); setOpened(true); }}>{label.title}</Button>
    <Modal centered opened={opened} onClose={close} title={label.title} size="lg" closeOnClickOutside={!saving} closeOnEscape={!saving} withCloseButton={!saving}>
      {opened && <form onSubmit={(event) => void submit(event)}>
        <Stack gap="md">
          {props.kind === "organization" ? <Text c="dimmed" size="sm">Se creará la organización con una empresa inicial del mismo nombre y el plan gratuito. El propietario recibirá las instrucciones de activación por correo.</Text>
            : <Text c="dimmed" size="sm">{props.contextName}{props.kind === "employee" ? " · Crea un usuario con acceso al panel y lo añade como empleado de esta empresa para atender citas. Recibirá las instrucciones de activación por correo. Si ya tiene un usuario en esta organización, utiliza «Añadir usuario como empleado»." : " · La empresa pertenecerá a esta organización."}</Text>}
          {error && <Alert role="alert" color="red" icon={<CircleAlert size={18} />} title="No se pudo completar">{error}</Alert>}
          {props.kind !== "employee" && <>
            <TextInput label={props.kind === "organization" ? "Nombre de la organización" : "Nombre de la empresa"} name={props.kind === "organization" ? "organizationName" : "name"} minLength={2} maxLength={150} required disabled={saving} />
            <TextInput label="Identificador público" description="Minúsculas, números y guiones. Por ejemplo: peluqueria-ana." name={props.kind === "organization" ? "organizationSlug" : "slug"} pattern={slugPattern} minLength={3} maxLength={80} required disabled={saving} />
            <TimezoneField disabled={saving} />
          </>}
          {props.kind !== "business" && <>
            {props.kind === "organization" && <Text fw={600}>Propietario inicial</Text>}
            <SimpleGrid cols={{ base: 1, sm: 2 }}><TextInput label="Nombre" name="firstName" minLength={1} maxLength={100} required disabled={saving} /><TextInput label="Apellidos" name="lastName" minLength={1} maxLength={150} required disabled={saving} /></SimpleGrid>
          </>}
          <TextInput label={props.kind === "organization" ? "Correo del propietario" : "Correo electrónico"} name="email" type="email" maxLength={320} required={props.kind !== "business"} disabled={saving} />
          {props.kind !== "organization" && <TextInput label="Teléfono" name="phone" type="tel" maxLength={32} disabled={saving} />}
          {props.kind === "business" && <TextInput label="URL del logo" description="Enlace completo a la imagen de la empresa (http o https)." name="logoUrl" type="url" pattern="https?://.+" maxLength={2048} disabled={saving} />}
          {props.kind === "employee" && <SimpleGrid cols={{ base: 1, sm: 2 }}>
            <Select label="Rol en la organización" name="role" defaultValue="EMPLOYEE" data={[{ value: "EMPLOYEE", label: "Empleado" }, { value: "MANAGER", label: "Responsable" }]} allowDeselect={false} required disabled={saving} />
            <ColorInput label="Color en la agenda" name="color" defaultValue="#6C5CE7" format="hex" disallowInput withPreview withEyeDropper={false} swatches={["#6C5CE7", "#3B82F6", "#2DD4BF", "#16A34A", "#F59E0B", "#EF4444", "#EC4899", "#64748B"]} disabled={saving} />
          </SimpleGrid>}
          <Group justify="flex-end" mt="sm"><Button type="button" variant="default" disabled={saving} onClick={close}>{uncertain ? "Cerrar y comprobar" : "Cancelar"}</Button><Button type="submit" disabled={uncertain || props.disabled} loading={saving}>{label.submit}</Button></Group>
        </Stack>
      </form>}
    </Modal>
  </>;
}
