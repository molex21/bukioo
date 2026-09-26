import { Alert, Button, Card, Group, PasswordInput, PinInput, Stack, Text, TextInput, Title } from "@mantine/core";
import { CircleAlert } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router";
import { useAuth } from "../auth/useAuth";
import { LoginBrand } from "../components/LoginBrand";
import { LoginFooter } from "../components/LoginFooter";
import { useOrganizationBranding } from "../hooks/useOrganizationBranding";
import { ApiError } from "../lib/api-client";
import { staffAuth } from "../lib/staff-auth";
import { saveStaffLoginOrganizationSlug } from "../lib/workspace-context";
import "./LoginPage.css";

type LoginMode = "activate-password" | "activate-verify" | "forgot" | "login" | "reset" | "reset-code" | "two-factor";
type LoginArea = "platform" | "staff";

type LoginPageProps = {
  area?: LoginArea;
  organizationSlug?: string;
};

function getErrorMessage(error: unknown) {
  if (error instanceof ApiError && error.status === 429) return "Has realizado demasiados intentos. Espera unos minutos antes de volver a intentarlo.";
  if (error instanceof Error) return error.message;
  return "No se ha podido completar la solicitud.";
}

export function LoginPage({ area = "staff", organizationSlug }: LoginPageProps) {
  const navigate = useNavigate();
  const { clearSession, setSession } = useAuth();
  const { branding, error: brandingError, loading: brandingLoading } = useOrganizationBranding(organizationSlug);
  const [mode, setMode] = useState<LoginMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function completeLogin(session: { accessToken: string; expiresIn: number; tokenType: "Bearer" }) {
    if (area === "staff" && organizationSlug) saveStaffLoginOrganizationSlug(organizationSlug);
    setSession(session);
    if (area === "platform") {
      const profile = await staffAuth.me();
      if (!profile.isSuperadmin) {
        clearSession();
        throw new ApiError(403, "Esta cuenta no tiene acceso a la plataforma.");
      }
    }
    navigate(area === "platform" ? "/platform" : "/app", { replace: true });
  }

  async function runRequest(request: () => Promise<void>) {
    setError(null);
    setNotice(null);
    setLoading(true);
    try {
      await request();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }

  function resetFields(nextMode: LoginMode) {
    setCode("");
    setError(null);
    setNotice(null);
    setPassword("");
    setPasswordConfirmation("");
    setMode(nextMode);
  }

  function submitForm(event: FormEvent<HTMLFormElement>, request: () => Promise<void>) {
    event.preventDefault();
    void runRequest(request);
  }

  function submitLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const submittedEmail = String(formData.get("email") ?? "").trim();
    const submittedPassword = String(formData.get("password") ?? "");

    setEmail(submittedEmail);
    setPassword(submittedPassword);
    void runRequest(async () => {
      const response = await staffAuth.login(submittedEmail, submittedPassword);
      if ("accessToken" in response) await completeLogin(response);
      else if ("twoFactorRequired" in response) setMode("two-factor");
      else if ("passwordChangeRequired" in response) setMode("activate-password");
      else setMode("activate-verify");
    });
  }

  const title = {
    "activate-password": "Crea tu contraseña",
    "activate-verify": "Verifica tu correo",
    forgot: "Recupera tu contraseña",
    login: area === "platform" ? "Acceso a plataforma" : "Acceso del equipo",
    reset: "Establece una contraseña nueva",
    "reset-code": "Introduce el código",
    "two-factor": "Código de seguridad",
  }[mode];

  return (
    <main className="login-page">
      <div className="login-shell">
        <Card className="login-card" padding="xl" radius="xl" shadow="lg" withBorder>
          <Stack gap="lg">
          <LoginBrand branding={branding} />
          <div className="login-heading"><Title order={1}>{title}</Title>{!(area === "platform" && mode === "login") && <Text c="dimmed" mt="xs" size="sm">{mode === "login" ? brandingLoading ? "Cargando la información de la organización..." : branding ? `Accede al equipo de ${branding.name}.` : "Accede al panel de tu empresa." : "Sigue los pasos para continuar de forma segura."}</Text>}</div>
          {error && <Alert color="red" icon={<CircleAlert size={18} />} title="No se pudo continuar">{error}</Alert>}
          {brandingError && <Alert color="red" icon={<CircleAlert size={18} />} title="Enlace no disponible">{brandingError}</Alert>}
          {notice && <Alert color="green" onClose={() => setNotice(null)} title="Revisa tu correo" withCloseButton>{notice}</Alert>}

          {mode === "login" && <form onSubmit={submitLogin}><Stack gap="md"><TextInput autoComplete="username" label="Correo electrónico" name="email" onChange={(event) => setEmail(event.currentTarget.value)} placeholder="nombre@empresa.com" required type="email" value={email} withAsterisk /><PasswordInput autoComplete="current-password" label="Contraseña" name="password" onChange={(event) => setPassword(event.currentTarget.value)} placeholder="Tu contraseña" required value={password} withAsterisk /><Group justify="space-between"><Button disabled={brandingLoading || Boolean(brandingError)} onClick={() => resetFields("forgot")} size="compact-sm" type="button" variant="subtle">He olvidado mi contraseña</Button><Button disabled={brandingLoading || Boolean(brandingError)} loading={loading} type="submit">Iniciar sesión</Button></Group></Stack></form>}

          {mode === "two-factor" && <form onSubmit={(event) => submitForm(event, async () => completeLogin(await staffAuth.verifyTwoFactor(code)))}><Stack gap="md"><Text c="dimmed" size="sm">Introduce el código de tu aplicación autenticadora.</Text><PinInput aria-label="Código de seguridad" className="login-pin-input" length={6} onChange={setCode} oneTimeCode placeholder="·" type="number" value={code} /><Text c="dimmed" size="xs">¿No puedes acceder? Contacta con un administrador.</Text><Group className="login-pin-actions" justify="space-between"><Button onClick={() => resetFields("login")} type="button" variant="default">Volver</Button><Button disabled={code.length !== 6} loading={loading} type="submit">Verificar</Button></Group></Stack></form>}

          {mode === "activate-verify" && <form onSubmit={(event) => submitForm(event, async () => { const result = await staffAuth.activateVerify(code); setCode(""); setPassword(""); setPasswordConfirmation(""); if (result.passwordChangeRequired) setMode("activate-password"); else { setNotice("Tu correo se ha verificado. Ya puedes iniciar sesión con tu contraseña nueva."); setMode("login"); } })}><Stack gap="md"><Text c="dimmed" size="sm">Introduce el código que hemos enviado a tu correo para verificar la cuenta.</Text><PinInput aria-label="Código de verificación" className="login-pin-input" length={6} onChange={setCode} oneTimeCode placeholder="·" type="number" value={code} /><Group className="login-pin-actions" justify="space-between"><Button onClick={() => resetFields("login")} type="button" variant="default">Volver</Button><Button disabled={code.length !== 6} loading={loading} type="submit">Continuar</Button></Group></Stack></form>}

          {mode === "activate-password" && <form onSubmit={(event) => submitForm(event, async () => completeLogin(await staffAuth.activatePassword(password)))}><Stack gap="md"><PasswordInput label="Nueva contraseña" onChange={(event) => setPassword(event.currentTarget.value)} placeholder="Crea una contraseña segura" value={password} withAsterisk /><PasswordInput error={passwordConfirmation && password !== passwordConfirmation ? "Las contraseñas no coinciden." : undefined} label="Repetir contraseña" onChange={(event) => setPasswordConfirmation(event.currentTarget.value)} placeholder="Repite la contraseña" value={passwordConfirmation} withAsterisk /><Group justify="space-between"><Button onClick={() => resetFields("login")} type="button" variant="default">Volver</Button><Button disabled={!password || password !== passwordConfirmation} loading={loading} type="submit">Guardar y acceder</Button></Group></Stack></form>}

          {mode === "forgot" && <form onSubmit={(event) => submitForm(event, async () => { await staffAuth.requestPasswordReset(email); setNotice("Si existe una cuenta activa con este correo, recibirás las instrucciones."); setMode("reset-code"); })}><Stack gap="md"><Text c="dimmed" size="sm">Te enviaremos un código para establecer una contraseña nueva.</Text><TextInput label="Correo electrónico" onChange={(event) => setEmail(event.currentTarget.value)} placeholder="nombre@empresa.com" type="email" value={email} withAsterisk /><Group justify="space-between"><Button onClick={() => resetFields("login")} type="button" variant="default">Volver</Button><Button loading={loading} type="submit">Enviar código</Button></Group></Stack></form>}

          {mode === "reset-code" && <form onSubmit={(event) => submitForm(event, async () => { await staffAuth.verifyPasswordResetCode(code); setMode("reset"); })}><Stack gap="md"><Text c="dimmed" size="sm">Introduce el código de seis dígitos que hemos enviado a tu correo.</Text><PinInput aria-label="Código recibido por correo" className="login-pin-input" length={6} onChange={setCode} oneTimeCode placeholder="·" type="number" value={code} /><Group className="login-pin-actions" justify="space-between"><Button onClick={() => resetFields("forgot")} type="button" variant="default">Volver</Button><Button disabled={code.length !== 6} loading={loading} type="submit">Continuar</Button></Group></Stack></form>}

          {mode === "reset" && <form onSubmit={(event) => submitForm(event, async () => { await staffAuth.resetPassword(code, password); setNotice("La contraseña se ha actualizado. Ya puedes iniciar sesión."); setPassword(""); setPasswordConfirmation(""); setCode(""); setMode("login"); })}><Stack gap="md"><Text c="dimmed" size="sm">Crea y confirma tu nueva contraseña.</Text><PasswordInput label="Nueva contraseña" onChange={(event) => setPassword(event.currentTarget.value)} placeholder="Crea una contraseña segura" value={password} withAsterisk /><PasswordInput error={passwordConfirmation && password !== passwordConfirmation ? "Las contraseñas no coinciden." : undefined} label="Repetir contraseña" onChange={(event) => setPasswordConfirmation(event.currentTarget.value)} placeholder="Repite la contraseña" value={passwordConfirmation} withAsterisk /><Group className="login-pin-actions" justify="space-between"><Button onClick={() => resetFields("reset-code")} type="button" variant="default">Volver</Button><Button disabled={!password || password !== passwordConfirmation} loading={loading} type="submit">Guardar contraseña</Button></Group></Stack></form>}

          </Stack>
        </Card>
        <LoginFooter />
      </div>
    </main>
  );
}

export function OrganizationStaffLoginPage() {
  const { organizationSlug } = useParams();
  return <LoginPage organizationSlug={organizationSlug} />;
}
