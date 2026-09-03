import { Alert, Button, Card, Stack, Text, Title } from "@mantine/core";
import { CalendarDays } from "lucide-react";
import { useParams } from "react-router";
import { LoginBrand } from "../components/LoginBrand";
import { LoginFooter } from "../components/LoginFooter";
import { useOrganizationBranding } from "../hooks/useOrganizationBranding";
import "./LoginPage.css";

export function CustomerAccessPage() {
  const { organizationSlug } = useParams();
  const { branding, error, loading } = useOrganizationBranding(organizationSlug);

  return (
    <main className="login-page">
      <div className="login-shell">
        <Card className="login-card" padding="xl" radius="xl" shadow="lg" withBorder>
          <Stack gap="lg">
          <LoginBrand branding={branding} />
          <div className="login-heading">
            <Title order={1}>Área de clientes</Title>
            <Text c="dimmed" mt="xs" size="sm">{loading ? "Cargando la información de la organización..." : `Gestiona tus citas en ${branding?.name ?? "esta organización"}.`}</Text>
          </div>
          {error && <Alert color="red" title="Enlace no disponible">{error}</Alert>}
          <Alert color="blue" icon={<CalendarDays size={18} />} title="Acceso de clientes">
            La pantalla está preparada. Conectaremos aquí el registro, acceso y gestión de citas del cliente en el siguiente bloque.
          </Alert>
          <Button disabled fullWidth>Iniciar sesión como cliente</Button>
          </Stack>
        </Card>
        <LoginFooter />
      </div>
    </main>
  );
}
