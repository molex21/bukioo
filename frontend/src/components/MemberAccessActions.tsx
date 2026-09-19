import {
  Alert,
  Button,
  Group,
  Menu,
  Modal,
  MultiSelect,
  PinInput,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { Building2, Mail, ShieldCheck, ShieldOff } from "lucide-react";
import { useRef, useState, type ReactNode } from "react";
import { setStoredSession } from "../auth/session-store";
import { ApiError } from "../lib/api-client";
import {
  superadminApi,
  type OrganizationMember,
  type SuperadminBusiness,
  type UpdateMemberBusinessesInput,
  type UpdateMemberStatusInput,
} from "../lib/superadmin-api";
import { canChangeMemberStatus, canManageMemberBusinesses } from "../lib/team-access";

type Mode = "businesses" | "status" | "email";

type Props = {
  organizationId: string;
  organizationName: string;
  member: OrganizationMember;
  businesses: SuperadminBusiness[];
  actor: { id: string; isSuperadmin: boolean };
  onChanged: (status: number) => void;
  standalone?: boolean;
};

export function MemberAccessActions({ organizationId, organizationName, member, businesses, actor, onChanged, standalone = false }: Props) {
  const [mode, setMode] = useState<Mode | null>(null);
  const [businessIds, setBusinessIds] = useState<string[]>([]);
  const [newEmail, setNewEmail] = useState("");
  const [emailToken, setEmailToken] = useState("");
  const [emailStep, setEmailStep] = useState<"request" | "confirm">("request");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submitting = useRef(false);
  const assignedIds = member.businesses.filter((item) => item.explicitlyAssigned).map((item) => item.id);
  const fullName = [member.firstName, member.lastName].filter(Boolean).join(" ") || member.email;
  const restoring = member.status === "SUSPENDED";
  const sameCompanies = [...assignedIds].sort().join() === [...businessIds].sort().join();
  const statusAllowed = canChangeMemberStatus(member, actor);
  const businessesAllowed = canManageMemberBusinesses(member, actor);
  const emailAllowed = actor.isSuperadmin && member.userStatus === "ACTIVE";

  function open(next: Mode) {
    setBusinessIds(assignedIds);
    setNewEmail("");
    setEmailToken("");
    setEmailStep("request");
    setError(null);
    setMode(next);
  }

  function close() {
    setMode(null);
  }

  function showFailure(cause: unknown) {
    const status = cause instanceof ApiError ? cause.status : 0;
    const message = cause instanceof ApiError ? cause.message : "No se pudo confirmar el cambio. Comprueba el listado antes de volver a intentarlo.";
    if ([403, 404, 409].includes(status) || status === 0 || status >= 500) {
      setMode(null);
      onChanged(status);
      notifications.show({ title: "No se pudo confirmar el cambio", message, color: "red", autoClose: 15000 });
    } else {
      setError(message);
    }
  }

  async function saveAccess() {
    if (submitting.current || !mode || mode === "email" || (mode === "status" ? !statusAllowed : !businessesAllowed)) return;
    submitting.current = true;
    setSaving(true);
    setError(null);
    try {
      if (mode === "status") {
        await superadminApi.updateMemberStatus(organizationId, member.membershipId, {
          status: restoring ? "ACTIVE" : "SUSPENDED",
          expectedStatus: member.status as UpdateMemberStatusInput["expectedStatus"],
          expectedRole: member.role as UpdateMemberStatusInput["expectedRole"],
        });
      } else {
        await superadminApi.updateMemberBusinesses(organizationId, member.membershipId, {
          businessIds,
          expectedBusinessIds: assignedIds,
          expectedRole: member.role as UpdateMemberBusinessesInput["expectedRole"],
        });
      }
      notifications.show({ title: "Accesos actualizados", message: mode === "businesses" ? "Se han guardado las empresas asignadas. Su rol y su estado como empleado no han cambiado." : restoring ? "Se ha restablecido el acceso a esta organización con sus asignaciones anteriores." : "Se ha suspendido el acceso a esta organización. Las otras organizaciones y su estado como empleado no han cambiado.", color: "green", autoClose: 15000, classNames: { root: "platform-create-notification" } });
      setMode(null);
      onChanged(200);
    } catch (cause) {
      showFailure(cause);
    } finally {
      submitting.current = false;
      setSaving(false);
    }
  }

  async function requestEmailChange() {
    if (submitting.current || !emailAllowed || !newEmail.trim()) return;
    submitting.current = true;
    setSaving(true);
    setError(null);
    try {
      await superadminApi.requestMemberEmailChange(organizationId, member.membershipId, { newEmail });
      setEmailStep("confirm");
      setEmailToken("");
    } catch (cause) {
      showFailure(cause);
    } finally {
      submitting.current = false;
      setSaving(false);
    }
  }

  async function confirmEmailChange() {
    if (submitting.current || !emailAllowed || emailToken.length !== 6) return;
    submitting.current = true;
    setSaving(true);
    setError(null);
    try {
      const result = await superadminApi.confirmMemberEmailChange(organizationId, member.membershipId, { token: emailToken });
      notifications.show({ title: "Correo de acceso actualizado", message: `${fullName} deberá iniciar sesión de nuevo con ${result.email}.`, color: "green", autoClose: 15000, classNames: { root: "platform-create-notification" } });
      if (member.userId === actor.id) {
        setStoredSession(null);
        window.location.replace("/platform/access");
        return;
      }
      setMode(null);
      onChanged(200);
    } catch (cause) {
      showFailure(cause);
    } finally {
      submitting.current = false;
      setSaving(false);
    }
  }

  function action(label: string, icon: ReactNode, onClick: () => void, color?: "red" | "violet") {
    return standalone
      ? <Button size="xs" variant="default" color={color} leftSection={icon} disabled={saving} onClick={onClick}>{label}</Button>
      : <Menu.Item color={color} disabled={saving} leftSection={icon} onClick={onClick}>{label}</Menu.Item>;
  }

  return <>
    {businessesAllowed && action("Gestionar empresas", <Building2 size={standalone ? 14 : 15} />, () => open("businesses"))}
    {statusAllowed && action(restoring ? "Restablecer acceso" : "Suspender acceso", restoring ? <ShieldCheck size={standalone ? 14 : 15} /> : <ShieldOff size={standalone ? 14 : 15} />, () => open("status"), restoring ? "violet" : "red")}
    {emailAllowed && action("Cambiar correo de acceso", <Mail size={standalone ? 14 : 15} />, () => open("email"))}
    <Modal centered size="lg" opened={mode !== null} title={mode === "businesses" ? "Gestionar empresas" : mode === "email" ? "Cambiar correo de acceso" : restoring ? "Restablecer acceso a la organización" : "Suspender acceso a la organización"} onClose={close} closeOnClickOutside={!saving} closeOnEscape={!saving} withCloseButton={!saving}>
      <Stack>
        <div><Text fw={600}>{fullName}</Text><Text size="sm" c="dimmed">{member.email} · {organizationName}</Text></div>
        {error && <Alert color="red">{error}</Alert>}
        {mode === "businesses" && <>
          <MultiSelect label="Empresas a las que puede acceder" description="Selecciona las empresas de esta organización. El rol se mantiene." searchable disabled={saving} value={businessIds} onChange={setBusinessIds} data={businesses.map((item) => ({ value: item.id, label: item.name + (item.status === "SUSPENDED" ? " (suspendida)" : ""), disabled: item.status !== "ACTIVE" && !assignedIds.includes(item.id) }))} />
          {!businessIds.length && <Alert color="yellow">Quedará sin acceso a ninguna empresa de esta organización. Podrá seguir iniciando sesión y acceder a sus otras organizaciones.</Alert>}
          {restoring && <Alert color="yellow">Su acceso a esta organización seguirá suspendido hasta que lo restablezcas.</Alert>}
          <Text size="sm">Quitar una empresa no archiva al empleado ni cancela sus citas.</Text>
        </>}
        {mode === "status" && <>
          <Alert color={restoring ? "violet" : "red"}>{restoring ? "Volverá a tener acceso según su rol y las empresas que conserve asignadas. Las empresas suspendidas seguirán sin estar disponibles." : "No podrá consultar ni gestionar datos de esta organización, aunque ya tenga una sesión iniciada. Sus accesos a otras organizaciones no cambiarán."}</Alert>
          <Text size="sm">Se conservarán el rol, las empresas asignadas y el historial. Esta acción no archiva ni reactiva al empleado: eso se gestiona en «Empleados → Ver empleado».</Text>
        </>}
        {mode === "email" && <>
          {emailStep === "request" ? <>
            <Alert color="yellow">Se enviará un código de seis dígitos al correo nuevo. La cuenta conservará el correo actual hasta que confirmes ese código.</Alert>
            <TextInput autoComplete="email" label="Nuevo correo de acceso" maxLength={320} onChange={(event) => setNewEmail(event.currentTarget.value)} required type="email" value={newEmail} />
          </> : <>
            <Alert color="blue">El código se ha enviado a {newEmail.trim().toLowerCase()}. Al confirmarlo, se cerrarán las sesiones activas de esta persona.</Alert>
            <PinInput aria-label="Código de verificación" length={6} oneTimeCode onChange={setEmailToken} type="number" value={emailToken} />
          </>}
        </>}
        <Group justify="flex-end">
          <Button variant="default" disabled={saving} onClick={close}>Cancelar</Button>
          {mode === "email" ? emailStep === "request"
            ? <Button disabled={!newEmail.trim()} loading={saving} onClick={() => void requestEmailChange()}>Enviar código</Button>
            : <><Button disabled={saving} variant="light" onClick={() => void requestEmailChange()}>Reenviar código</Button><Button disabled={emailToken.length !== 6} loading={saving} onClick={() => void confirmEmailChange()}>Confirmar correo</Button></>
            : <Button color={mode === "status" && !restoring ? "red" : "violet"} disabled={mode === "businesses" && sameCompanies} loading={saving} onClick={() => void saveAccess()}>{mode === "businesses" ? "Guardar empresas" : restoring ? "Restablecer acceso" : "Suspender acceso"}</Button>}
        </Group>
      </Stack>
    </Modal>
  </>;
}
