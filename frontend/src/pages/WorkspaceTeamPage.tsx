import {
  Alert,
  Avatar,
  Badge,
  Button,
  Group,
  Modal,
  Paper,
  Skeleton,
  Stack,
  Switch,
  Table,
  Text,
  Textarea,
  TextInput,
  ThemeIcon,
  Title,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { CircleAlert, Pencil, Plus, RefreshCw, UsersRound } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { ApiError } from "../lib/api-client";
import {
  workspaceEmployeesApi,
  type WorkspaceEmployee,
} from "../lib/workspace-employees-api";

type EmployeeForm = {
  color: string;
  email: string;
  firstName: string;
  inviteUser: boolean;
  lastName: string;
  notes: string;
  phone: string;
};

const emptyEmployee = (): EmployeeForm => ({
  color: "#228B22",
  email: "",
  firstName: "",
  inviteUser: false,
  lastName: "",
  notes: "",
  phone: "",
});

const employeeForm = (employee: WorkspaceEmployee): EmployeeForm => ({
  color: employee.color ?? "#228B22",
  email: employee.email ?? "",
  firstName: employee.first_name,
  inviteUser: false,
  lastName: employee.last_name,
  notes: employee.notes ?? "",
  phone: employee.phone ?? "",
});

const requestMessage = (error: unknown) =>
  error instanceof ApiError
    ? error.message
    : "No se ha podido completar la operación.";

export function WorkspaceTeamPage({
  businessId,
  businessName,
}: {
  businessId: string;
  businessName: string;
}) {
  const [employees, setEmployees] = useState<WorkspaceEmployee[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const [opened, modal] = useDisclosure(false);
  const [editing, setEditing] = useState<WorkspaceEmployee | null>(null);
  const [form, setForm] = useState<EmployeeForm>(emptyEmployee);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    void workspaceEmployeesApi
      .list(businessId)
      .then((result) => {
        if (!active) return;
        setEmployees(result);
        setError(null);
      })
      .catch((requestError: unknown) => {
        if (active) setError(requestMessage(requestError));
      });
    return () => {
      active = false;
    };
  }, [businessId, version]);

  function updateForm<Key extends keyof EmployeeForm>(
    key: Key,
    value: EmployeeForm[Key],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function openEmployee(employee?: WorkspaceEmployee) {
    setEditing(employee ?? null);
    setForm(employee ? employeeForm(employee) : emptyEmployee());
    setError(null);
    modal.open();
  }

  async function saveEmployee(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const input = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email.trim() || undefined,
      phone: form.phone.trim() || undefined,
      color: form.color.trim() || undefined,
      notes: form.notes.trim() || undefined,
      ...(editing ? {} : { inviteUser: form.inviteUser }),
    };

    try {
      const result = editing
        ? await workspaceEmployeesApi.update(businessId, editing.id, input)
        : await workspaceEmployeesApi.create(businessId, input);
      setEmployees((current) => {
        const next = editing
          ? (current?.map((employee) =>
              employee.id === result.id ? result : employee,
            ) ?? [])
          : [...(current ?? []), result];
        return next.sort((left, right) =>
          `${left.first_name} ${left.last_name}`.localeCompare(
            `${right.first_name} ${right.last_name}`,
          ),
        );
      });
      modal.close();
    } catch (requestError: unknown) {
      setError(requestMessage(requestError));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Stack gap="xl">
      <Group justify="space-between">
        <div>
          <Text c="dimmed" fw={700} size="xs" tt="uppercase">
            Equipo · {businessName}
          </Text>
          <Title order={1}>Equipo</Title>
          <Text c="dimmed" mt={4}>
            Gestiona las fichas de las personas que prestan servicios en esta
            empresa.
          </Text>
        </div>
        <Button leftSection={<Plus size={16} />} onClick={() => openEmployee()}>
          Añadir empleado
        </Button>
      </Group>

      {error && (
        <Alert
          color="red"
          icon={<CircleAlert size={18} />}
          title="No se pudo completar la operación"
        >
          <Group justify="space-between">
            <Text size="sm">{error}</Text>
            <Button
              leftSection={<RefreshCw size={15} />}
              onClick={() => setVersion((value) => value + 1)}
              size="compact-sm"
              variant="light"
            >
              Reintentar
            </Button>
          </Group>
        </Alert>
      )}

      <Paper p="lg" radius="lg" withBorder>
        {!employees ? (
          <Stack gap="sm">
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton height={64} key={index} />
            ))}
          </Stack>
        ) : employees.length ? (
          <Table.ScrollContainer minWidth={720}>
            <Table highlightOnHover striped verticalSpacing="sm">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Empleado</Table.Th>
                  <Table.Th>Contacto</Table.Th>
                  <Table.Th>Acceso</Table.Th>
                  <Table.Th>Notas</Table.Th>
                  <Table.Th>Acciones</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {employees.map((employee) => (
                  <Table.Tr key={employee.id}>
                    <Table.Td>
                      <Group gap="sm" wrap="nowrap">
                        <Avatar
                          color="bukioo"
                          radius="xl"
                          style={
                            employee.color
                              ? { backgroundColor: employee.color }
                              : undefined
                          }
                        >
                          {employee.first_name.charAt(0)}
                          {employee.last_name.charAt(0)}
                        </Avatar>
                        <div>
                          <Text fw={700} size="sm">
                            {employee.first_name} {employee.last_name}
                          </Text>
                          <Text c="dimmed" size="xs">
                            Ficha de agenda
                          </Text>
                        </div>
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{employee.email ?? "Sin correo"}</Text>
                      <Text c="dimmed" size="xs">
                        {employee.phone ?? "Sin teléfono"}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Badge
                        color={employee.user_id ? "teal" : "gray"}
                        variant="light"
                      >
                        {employee.user_id ? "Con acceso" : "Sin acceso"}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Text c="dimmed" lineClamp={1} size="sm">
                        {employee.notes ?? "Sin notas"}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Button
                        leftSection={<Pencil size={14} />}
                        onClick={() => openEmployee(employee)}
                        size="xs"
                        variant="default"
                      >
                        Gestionar
                      </Button>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        ) : (
          <Stack align="center" gap="sm" py="xl">
            <ThemeIcon color="gray" radius="xl" size={48} variant="light">
              <UsersRound size={24} />
            </ThemeIcon>
            <Text fw={700}>Aún no hay empleados</Text>
            <Text c="dimmed" size="sm">
              Añade al primer miembro del equipo para asignarle servicios y
              horarios después.
            </Text>
          </Stack>
        )}
      </Paper>

      <Modal
        centered
        closeOnClickOutside={!saving}
        closeOnEscape={!saving}
        onClose={modal.close}
        opened={opened}
        title={editing ? `Gestionar ${editing.first_name}` : "Añadir empleado"}
      >
        <form onSubmit={(event) => void saveEmployee(event)}>
          <Stack gap="md">
            <Group grow>
              <TextInput
                label="Nombre"
                onChange={(event) =>
                  updateForm("firstName", event.currentTarget.value)
                }
                required
                value={form.firstName}
              />
              <TextInput
                label="Apellidos"
                onChange={(event) =>
                  updateForm("lastName", event.currentTarget.value)
                }
                required
                value={form.lastName}
              />
            </Group>
            <TextInput
              label="Correo de contacto"
              onChange={(event) =>
                updateForm("email", event.currentTarget.value)
              }
              required={form.inviteUser}
              type="email"
              value={form.email}
            />
            <TextInput
              label="Teléfono"
              onChange={(event) =>
                updateForm("phone", event.currentTarget.value)
              }
              value={form.phone}
            />
            <TextInput
              description="Formato hexadecimal, por ejemplo #228B22."
              label="Color de agenda"
              onChange={(event) =>
                updateForm("color", event.currentTarget.value)
              }
              value={form.color}
            />
            <Textarea
              label="Notas internas"
              minRows={3}
              onChange={(event) =>
                updateForm("notes", event.currentTarget.value)
              }
              value={form.notes}
            />
            {!editing && (
              <Switch
                checked={form.inviteUser}
                description="Se creará una cuenta y se enviarán sus credenciales al correo indicado."
                label="Dar acceso al panel"
                onChange={(event) =>
                  updateForm("inviteUser", event.currentTarget.checked)
                }
              />
            )}
            {error && <Alert color="red">{error}</Alert>}
            <Group justify="flex-end">
              <Button
                disabled={saving}
                onClick={modal.close}
                type="button"
                variant="default"
              >
                Cancelar
              </Button>
              <Button loading={saving} type="submit">
                {editing
                  ? "Guardar cambios"
                  : form.inviteUser
                    ? "Crear e invitar"
                    : "Crear empleado"}
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </Stack>
  );
}
