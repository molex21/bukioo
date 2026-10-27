import { CalendarDays, Store } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { BrowserRouter, Navigate, Route, Routes, useParams } from "react-router";
import "./App.css";
import { useAuth } from "./auth/useAuth";
import { staffAuth } from "./lib/staff-auth";
import { getStaffLoginOrganizationSlug } from "./lib/workspace-context";
import { CustomerAccessPage } from "./pages/CustomerAccessPage";
import { DesignSystemPage } from "./pages/DesignSystemPage";
import { LoginPage, OrganizationStaffLoginPage } from "./pages/LoginPage";
import { PlatformPage } from "./pages/PlatformPage";
import { WorkspacePage } from "./pages/WorkspacePage";

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
        <span className="status-chip">Próximamente</span>
        {action}
      </section>
    </main>
  );
}

function ProtectedRoute({ children, requiresSuperadmin = false, redirectTo = "/" }: { children: ReactNode; requiresSuperadmin?: boolean; redirectTo?: string }) {
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
  if (!session || (requiresSuperadmin && !isSuperadmin)) {
    const staffLoginSlug = !requiresSuperadmin ? getStaffLoginOrganizationSlug() : null;
    return <Navigate replace to={staffLoginSlug ? `/${staffLoginSlug}/staff/login` : redirectTo} />;
  }

  return <>{children}</>;
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

function StaffEntryRoute() {
  const { session, isInitializing } = useAuth();
  const { organizationSlug } = useParams();

  if (isInitializing) return <main className="placeholder-page"><p className="placeholder-description">Comprobando sesion...</p></main>;
  return <Navigate replace to={session ? "/app" : `/${organizationSlug ?? ""}/staff/login`} />;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<PlaceholderPage icon={Store} eyebrow="BUKIOO" title="Gestión de citas para empresas" description="Elige la dirección de acceso que te haya proporcionado tu organización." />} />
        <Route path="/design-system" element={<DesignSystemPage />} />
        <Route path="/platform/access" element={<LoginPage area="platform" />} />
        <Route path="/:organizationSlug/login" element={<CustomerAccessPage />} />
        <Route path="/:organizationSlug/staff" element={<StaffEntryRoute />} />
        <Route path="/:organizationSlug/staff/login" element={<OrganizationStaffLoginPage />} />
        <Route path="/app/*" element={<ProtectedRoute><WorkspacePage /></ProtectedRoute>} />
        <Route path="/book/:organizationSlug/:businessSlug" element={<PlaceholderPage icon={CalendarDays} eyebrow="Reserva publica" title="Reserva tu cita" description="Este sera el flujo publico de reserva para la empresa seleccionada." />} />
        <Route path="/book/:organizationSlug" element={<PlaceholderPage icon={CalendarDays} eyebrow="Reserva publica" title="Reserva tu cita" description="Elige una empresa para continuar con tu reserva." />} />
        <Route path="/customer/:organizationSlug/*" element={<PlaceholderPage icon={CalendarDays} eyebrow="Area cliente" title="Tus citas" description="Aqui se gestionara la sesion y las reservas de cada cliente." />} />
        <Route path="/platform/*" element={<ProtectedRoute requiresSuperadmin redirectTo="/platform/access"><PlatformPage /></ProtectedRoute>} />
        <Route path="/appointments/reschedule" element={<PlaceholderPage icon={CalendarDays} eyebrow="Cambio de cita" title="Reprogramacion de cita" description="Aqui se mostrara la propuesta enviada por la empresa." />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
