import { Button } from "@mantine/core";
import { CalendarDays, LayoutDashboard, Store } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from "react-router";
import "./App.css";
import { useAuth } from "./auth/useAuth";
import { staffAuth } from "./lib/staff-auth";
import { CustomerAccessPage } from "./pages/CustomerAccessPage";
import { DesignSystemPage } from "./pages/DesignSystemPage";
import { LoginPage, OrganizationStaffLoginPage } from "./pages/LoginPage";
import { PlatformPage } from "./pages/PlatformPage";

type PlaceholderPageProps = {
  icon: typeof CalendarDays;
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
};

function PlaceholderPage({ icon: Icon, eyebrow, title, description, action }: PlaceholderPageProps) {
  return (
    <main className="placeholder-page">
      <section className="placeholder-card" aria-labelledby="page-title">
        <span className="brand-mark" aria-hidden="true">B</span>
        <Icon className="placeholder-icon" aria-hidden="true" size={28} />
        <p className="eyebrow">{eyebrow}</p>
        <h1 id="page-title">{title}</h1>
        <p className="placeholder-description">{description}</p>
        <span className="status-chip">Base de interfaz preparada</span>
        {action}
      </section>
    </main>
  );
}

function ProtectedRoute({ children, requiresSuperadmin = false }: { children: ReactNode; requiresSuperadmin?: boolean }) {
  const { clearSession, isInitializing, session } = useAuth();
  const [isSuperadmin, setIsSuperadmin] = useState<boolean | null>(requiresSuperadmin ? null : true);

  useEffect(() => {
    if (!requiresSuperadmin || !session) return;

    let active = true;
    void staffAuth.me()
      .then((profile) => {
        if (active) setIsSuperadmin(profile.isSuperadmin);
      })
      .catch(() => {
        if (active) {
          clearSession();
          setIsSuperadmin(false);
        }
      });

    return () => { active = false; };
  }, [clearSession, requiresSuperadmin, session]);

  if (isInitializing || (requiresSuperadmin && session && isSuperadmin === null)) {
    return <main className="placeholder-page"><p className="placeholder-description">Comprobando sesión…</p></main>;
  }
  if (!session || (requiresSuperadmin && !isSuperadmin)) return <Navigate replace to="/" />;

  return <>{children}</>;
}

function AuthenticatedPlaceholderPage({ icon, eyebrow, title, description }: Omit<PlaceholderPageProps, "action">) {
  const navigate = useNavigate();
  const { clearSession } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  async function logout() {
    setIsLoggingOut(true);
    try {
      await staffAuth.logout();
    } finally {
      clearSession();
      navigate("/", { replace: true });
    }
  }

  return <PlaceholderPage action={<Button color="gray" loading={isLoggingOut} onClick={() => void logout()} variant="subtle">Cerrar sesión</Button>} description={description} eyebrow={eyebrow} icon={icon} title={title} />;
}

function NotFoundPage() {
  return (
    <main className="placeholder-page">
      <section className="placeholder-card" aria-labelledby="not-found-title">
        <p className="eyebrow">Error 404</p>
        <h1 id="not-found-title">Esta pagina no existe</h1>
        <p className="placeholder-description">Comprueba la direccion o vuelve a iniciar sesion.</p>
      </section>
    </main>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<PlaceholderPage icon={Store} eyebrow="BUKIOO" title="Gestión de citas para negocios" description="Elige la dirección de acceso que te haya proporcionado tu organización." />} />
        <Route path="/design-system" element={<DesignSystemPage />} />
        <Route path="/platform/access" element={<LoginPage area="platform" />} />
        <Route path="/:organizationSlug/login" element={<CustomerAccessPage />} />
        <Route path="/:organizationSlug/staff/login" element={<OrganizationStaffLoginPage />} />
        <Route path="/app/*" element={<ProtectedRoute><AuthenticatedPlaceholderPage icon={LayoutDashboard} eyebrow="Panel interno" title="Gestiona tu negocio" description="La agenda, los clientes y la configuracion viviran en este espacio." /></ProtectedRoute>} />
        <Route path="/book/:organizationSlug" element={<PlaceholderPage icon={CalendarDays} eyebrow="Reserva publica" title="Reserva tu cita" description="Este sera el flujo publico de reserva para cada negocio." />} />
        <Route path="/customer/:organizationSlug/*" element={<PlaceholderPage icon={CalendarDays} eyebrow="Area cliente" title="Tus citas" description="Aqui se gestionara la sesion y las reservas de cada cliente." />} />
        <Route path="/platform/*" element={<ProtectedRoute requiresSuperadmin><PlatformPage /></ProtectedRoute>} />
        <Route path="/appointments/reschedule" element={<PlaceholderPage icon={CalendarDays} eyebrow="Cambio de cita" title="Reprogramacion de cita" description="Aqui se mostrara la propuesta enviada por el negocio." />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
