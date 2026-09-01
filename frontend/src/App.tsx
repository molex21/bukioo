import { CalendarDays, LayoutDashboard, ShieldCheck, Store } from "lucide-react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router";
import "./App.css";

type PlaceholderPageProps = {
  icon: typeof CalendarDays;
  eyebrow: string;
  title: string;
  description: string;
};

function PlaceholderPage({ icon: Icon, eyebrow, title, description }: PlaceholderPageProps) {
  return (
    <main className="placeholder-page">
      <section className="placeholder-card" aria-labelledby="page-title">
        <span className="brand-mark" aria-hidden="true">B</span>
        <Icon className="placeholder-icon" aria-hidden="true" size={28} />
        <p className="eyebrow">{eyebrow}</p>
        <h1 id="page-title">{title}</h1>
        <p className="placeholder-description">{description}</p>
        <span className="status-chip">Base de interfaz preparada</span>
      </section>
    </main>
  );
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
        <Route path="/" element={<Navigate replace to="/login" />} />
        <Route path="/login" element={<PlaceholderPage icon={ShieldCheck} eyebrow="Acceso staff" title="Bienvenido a BUKIOO" description="Aqui construiremos el acceso seguro para el equipo del negocio." />} />
        <Route path="/app/*" element={<PlaceholderPage icon={LayoutDashboard} eyebrow="Panel interno" title="Gestiona tu negocio" description="La agenda, los clientes y la configuracion viviran en este espacio." />} />
        <Route path="/book/:organizationSlug" element={<PlaceholderPage icon={CalendarDays} eyebrow="Reserva publica" title="Reserva tu cita" description="Este sera el flujo publico de reserva para cada negocio." />} />
        <Route path="/customer/:organizationSlug/*" element={<PlaceholderPage icon={CalendarDays} eyebrow="Area cliente" title="Tus citas" description="Aqui se gestionara la sesion y las reservas de cada cliente." />} />
        <Route path="/superadmin/*" element={<PlaceholderPage icon={Store} eyebrow="Administracion" title="Panel de plataforma" description="Aqui se administraran organizaciones, planes y suscripciones." />} />
        <Route path="/appointments/reschedule" element={<PlaceholderPage icon={CalendarDays} eyebrow="Cambio de cita" title="Reprogramacion de cita" description="Aqui se mostrara la propuesta enviada por el negocio." />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
