import {
  Alert,
  Badge,
  Button,
  Divider,
  Group,
  Modal,
  Paper,
  Select,
  Skeleton,
  Stack,
  Switch,
  Table,
  Text,
  TextInput,
  ThemeIcon,
  Title,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  BookOpen,
  CircleAlert,
  FolderPlus,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { ApiError } from "../lib/api-client";
import {
  workspaceCatalogApi,
  type BusinessService,
  type ServiceCategory,
  type ServiceCustomField,
  type ServiceCustomFieldDurationMode,
  type ServiceCustomFieldPricingMode,
  type ServiceCustomFieldType,
  type ServicePriceType,
} from "../lib/workspace-catalog-api";

type ServiceForm = {
  autoConfirmAppointments: boolean;
  bufferAfterMinutes: string;
  bufferBeforeMinutes: string;
  categoryId: string | null;
  customFields: ServiceCustomField[];
  description: string;
  durationMinutes: string;
  isActive: boolean;
  name: string;
  price: string;
  priceType: ServicePriceType;
};
type FieldOptionForm = {
  durationModifierMinutes: string;
  id: string;
  label: string;
  priceModifier: string;
  value: string;
};
type FieldForm = {
  durationMode: ServiceCustomFieldDurationMode;
  fieldType: ServiceCustomFieldType;
  id: string;
  label: string;
  maxValue: string;
  minValue: string;
  options: FieldOptionForm[];
  pricingMode: ServiceCustomFieldPricingMode;
  required: boolean;
  unitDurationMinutes: string;
  unitLabel: string;
  unitPrice: string;
};

const fieldTypeLabels: Record<ServiceCustomFieldType, string> = {
  BOOLEAN: "Sí / no",
  NUMBER: "Número",
  SELECT: "Lista de opciones",
  TEXT: "Texto",
};
const pricingLabels: Record<ServiceCustomFieldPricingMode, string> = {
  NONE: "Sin cambio de precio",
  OPTION: "Precio según opción",
  PER_UNIT: "Precio por unidad",
};
const emptyService = (): ServiceForm => ({
  autoConfirmAppointments: false,
  bufferAfterMinutes: "0",
  bufferBeforeMinutes: "0",
  categoryId: null,
  customFields: [],
  description: "",
  durationMinutes: "30",
  isActive: true,
  name: "",
  price: "",
  priceType: "FIXED",
});
const serviceForm = (service: BusinessService): ServiceForm => ({
  autoConfirmAppointments: service.auto_confirm_appointments ?? false,
  bufferAfterMinutes: String(service.buffer_after_minutes),
  bufferBeforeMinutes: String(service.buffer_before_minutes),
  categoryId: service.category_id,
  customFields: service.custom_fields ?? [],
  description: service.description ?? "",
  durationMinutes: String(service.duration_minutes),
  isActive: service.is_active,
  name: service.name,
  price: service.price ?? "",
  priceType: service.price_type ?? "FIXED",
});
const newFieldId = () => crypto.randomUUID();
const emptyFieldOption = (): FieldOptionForm => ({
  durationModifierMinutes: "",
  id: newFieldId(),
  label: "",
  priceModifier: "",
  value: "",
});
const emptyField = (): FieldForm => ({
  durationMode: "NONE",
  fieldType: "NUMBER",
  id: newFieldId(),
  label: "",
  maxValue: "",
  minValue: "",
  options: [],
  pricingMode: "NONE",
  required: false,
  unitDurationMinutes: "",
  unitLabel: "",
  unitPrice: "",
});
const toFieldForm = (field: ServiceCustomField): FieldForm => ({
  durationMode: field.durationMode ?? "NONE",
  fieldType: field.fieldType,
  id: field.id,
  label: field.label,
  maxValue: field.maxValue === undefined ? "" : String(field.maxValue),
  minValue: field.minValue === undefined ? "" : String(field.minValue),
  options: (field.options ?? []).map((option) => ({
    durationModifierMinutes:
      option.durationModifierMinutes === undefined
        ? ""
        : String(option.durationModifierMinutes),
    id: newFieldId(),
    label: option.label,
    priceModifier:
      option.priceModifier === undefined ? "" : String(option.priceModifier),
    value: option.value,
  })),
  pricingMode: field.pricingMode,
  required: field.required,
  unitDurationMinutes:
    field.unitDurationMinutes === undefined
      ? ""
      : String(field.unitDurationMinutes),
  unitLabel: field.unitLabel ?? "",
  unitPrice: field.unitPrice === undefined ? "" : String(field.unitPrice),
});
const requestMessage = (error: unknown) =>
  error instanceof ApiError
    ? error.message
    : "No se ha podido completar la operación.";

export function WorkspaceCatalogPage({
  businessId,
  businessName,
  onBack,
}: {
  businessId: string;
  businessName: string;
  onBack: () => void;
}) {
  const [categories, setCategories] = useState<ServiceCategory[] | null>(null);
  const [services, setServices] = useState<BusinessService[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const [categoryOpened, categoryModal] = useDisclosure(false);
  const [serviceOpened, serviceModal] = useDisclosure(false);
  const [fieldOpened, fieldModal] = useDisclosure(false);
  const [categoryName, setCategoryName] = useState("");
  const [editingCategory, setEditingCategory] =
    useState<ServiceCategory | null>(null);
  const [editing, setEditing] = useState<BusinessService | null>(null);
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [fieldForm, setFieldForm] = useState<FieldForm>(emptyField);
  const [form, setForm] = useState<ServiceForm>(emptyService);
  const [saving, setSaving] = useState(false);
  const categoryNameById = useMemo(
    () => new Map(categories?.map((category) => [category.id, category.name])),
    [categories],
  );
  const categoryOptions = (categories ?? [])
    .filter((category) => category.is_active)
    .map((category) => ({ label: category.name, value: category.id }));

  useEffect(() => {
    let active = true;
    void Promise.all([
      workspaceCatalogApi.listCategories(businessId),
      workspaceCatalogApi.listServices(businessId),
    ])
      .then(([nextCategories, nextServices]) => {
        if (active) {
          setCategories(nextCategories);
          setServices(nextServices);
          setError(null);
        }
      })
      .catch((requestError: unknown) => {
        if (active) setError(requestMessage(requestError));
      });
    return () => {
      active = false;
    };
  }, [businessId, version]);

  function updateForm<Key extends keyof ServiceForm>(
    key: Key,
    value: ServiceForm[Key],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }
  function updateField<Key extends keyof FieldForm>(
    key: Key,
    value: FieldForm[Key],
  ) {
    setFieldForm((current) => ({ ...current, [key]: value }));
  }
  function addFieldOption() {
    setFieldForm((current) => ({
      ...current,
      options: [...current.options, emptyFieldOption()],
    }));
  }
  function updateFieldOption<Key extends keyof FieldOptionForm>(
    id: string,
    key: Key,
    value: FieldOptionForm[Key],
  ) {
    setFieldForm((current) => ({
      ...current,
      options: current.options.map((option) =>
        option.id === id ? { ...option, [key]: value } : option,
      ),
    }));
  }
  function removeFieldOption(id: string) {
    setFieldForm((current) => ({
      ...current,
      options: current.options.filter((option) => option.id !== id),
    }));
  }
  function openService(service?: BusinessService) {
    setEditing(service ?? null);
    setForm(service ? serviceForm(service) : emptyService());
    setError(null);
    serviceModal.open();
  }
  function openCategory(category?: ServiceCategory) {
    setEditingCategory(category ?? null);
    setCategoryName(category?.name ?? "");
    setError(null);
    categoryModal.open();
  }
  function openField(field?: ServiceCustomField) {
    setEditingFieldId(field?.id ?? null);
    setFieldForm(field ? toFieldForm(field) : emptyField());
    setFieldError(null);
    fieldModal.open();
  }

  async function saveCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const category = editingCategory
        ? await workspaceCatalogApi.updateCategory(
            businessId,
            editingCategory.id,
            { name: categoryName.trim() },
          )
        : await workspaceCatalogApi.createCategory(businessId, {
            name: categoryName.trim(),
          });
      setCategories((current) =>
        editingCategory
          ? (current?.map((item) =>
              item.id === category.id ? category : item,
            ) ?? null)
          : [...(current ?? []), category].sort((left, right) =>
              left.name.localeCompare(right.name),
            ),
      );
      categoryModal.close();
    } catch (requestError: unknown) {
      setError(requestMessage(requestError));
    } finally {
      setSaving(false);
    }
  }

  function saveField(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const label = fieldForm.label.trim();
    if (!label) {
      setFieldError("Indica el nombre del dato que quieres pedir.");
      return;
    }
    if (fieldForm.fieldType === "SELECT" && fieldForm.options.length === 0) {
      setFieldError("Añade al menos una opción para el selector.");
      return;
    }
    if (fieldForm.pricingMode === "PER_UNIT" && !fieldForm.unitPrice) {
      setFieldError("Indica el importe adicional por unidad.");
      return;
    }
    if (
      fieldForm.durationMode === "PER_UNIT" &&
      !fieldForm.unitDurationMinutes
    ) {
      setFieldError("Indica los minutos adicionales por unidad.");
      return;
    }
    const options =
      fieldForm.fieldType === "SELECT"
        ? fieldForm.options.map((option, index) => {
            const optionLabel = option.label.trim();
            return {
              label: optionLabel,
              value:
                option.value ||
                `${
                  optionLabel
                    .toLocaleLowerCase("es")
                    .replace(/[^a-z0-9]+/g, "-")
                    .replace(/(^-|-$)/g, "") || "option"
                }-${index + 1}`,
              ...(fieldForm.pricingMode === "OPTION" && option.priceModifier
                ? { priceModifier: Number(option.priceModifier) }
                : {}),
              ...(fieldForm.durationMode === "OPTION" &&
              option.durationModifierMinutes
                ? {
                    durationModifierMinutes: Number(
                      option.durationModifierMinutes,
                    ),
                  }
                : {}),
            };
          })
        : undefined;
    if (
      options?.some(
        (option) =>
          !option.label ||
          Number.isNaN(option.priceModifier) ||
          Number.isNaN(option.durationModifierMinutes),
      )
    ) {
      setFieldError(
        "Cada opción debe tener nombre e importes o minutos numéricos si los indicas.",
      );
      return;
    }
    const nextField: ServiceCustomField = {
      id: fieldForm.id,
      label,
      fieldType: fieldForm.fieldType,
      required: fieldForm.required,
      pricingMode: fieldForm.pricingMode,
      durationMode: fieldForm.durationMode,
      ...(fieldForm.fieldType === "NUMBER" && fieldForm.unitLabel.trim()
        ? { unitLabel: fieldForm.unitLabel.trim() }
        : {}),
      ...(fieldForm.fieldType === "NUMBER" && fieldForm.minValue
        ? { minValue: Number(fieldForm.minValue) }
        : {}),
      ...(fieldForm.fieldType === "NUMBER" && fieldForm.maxValue
        ? { maxValue: Number(fieldForm.maxValue) }
        : {}),
      ...(fieldForm.pricingMode === "PER_UNIT"
        ? { unitPrice: Number(fieldForm.unitPrice) }
        : {}),
      ...(fieldForm.durationMode === "PER_UNIT"
        ? { unitDurationMinutes: Number(fieldForm.unitDurationMinutes) }
        : {}),
      ...(options ? { options } : {}),
    };
    setForm((current) => ({
      ...current,
      customFields: editingFieldId
        ? current.customFields.map((field) =>
            field.id === editingFieldId ? nextField : field,
          )
        : [...current.customFields, nextField],
    }));
    fieldModal.close();
  }

  async function saveService(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const input = {
      name: form.name.trim(),
      categoryId: form.categoryId ?? undefined,
      customFields: form.customFields,
      description: form.description.trim() || undefined,
      durationMinutes: Number(form.durationMinutes),
      price: form.price ? Number(form.price) : undefined,
      priceType: form.priceType,
      bufferBeforeMinutes: Number(form.bufferBeforeMinutes),
      bufferAfterMinutes: Number(form.bufferAfterMinutes),
      autoConfirmAppointments: form.autoConfirmAppointments,
    };
    try {
      const result = editing
        ? await workspaceCatalogApi.updateService(businessId, editing.id, {
            ...input,
            isActive: form.isActive,
          })
        : await workspaceCatalogApi.createService(businessId, input);
      setServices((current) =>
        editing
          ? (current?.map((service) =>
              service.id === result.id ? result : service,
            ) ?? null)
          : [...(current ?? []), result].sort((left, right) =>
              left.name.localeCompare(right.name),
            ),
      );
      serviceModal.close();
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
            Configuración · {businessName}
          </Text>
          <Title order={1}>Servicios y categorías</Title>
          <Text c="dimmed" mt={4}>
            Define lo que ofrece esta empresa antes de asignarlo al equipo.
          </Text>
        </div>
        <Group>
          <Button onClick={onBack} variant="default">
            Volver
          </Button>
          <Button
            leftSection={<FolderPlus size={16} />}
            onClick={() => openCategory()}
            variant="default"
          >
            Nueva categoría
          </Button>
          <Button
            leftSection={<Plus size={16} />}
            onClick={() => openService()}
          >
            Nuevo servicio
          </Button>
        </Group>
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
        <Stack gap="md">
          <div>
            <Text fw={700}>Categorías</Text>
            <Text c="dimmed" size="sm">
              Organiza los servicios con una categoría que puedes renombrar
              cuando quieras.
            </Text>
          </div>
          {!categories ? (
            <Skeleton height={90} />
          ) : categories.length ? (
            <Table.ScrollContainer minWidth={480}>
              <Table verticalSpacing="sm">
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Categoría</Table.Th>
                    <Table.Th>Estado</Table.Th>
                    <Table.Th>Acciones</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {categories.map((category) => (
                    <Table.Tr key={category.id}>
                      <Table.Td>
                        <Text fw={600}>{category.name}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Badge
                          color={category.is_active ? "teal" : "gray"}
                          variant="light"
                        >
                          {category.is_active ? "Activa" : "Inactiva"}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <Button
                          leftSection={<Pencil size={14} />}
                          onClick={() => openCategory(category)}
                          size="xs"
                          variant="default"
                        >
                          Editar
                        </Button>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Table.ScrollContainer>
          ) : (
            <Text c="dimmed" size="sm">
              Aún no hay categorías. Puedes crear servicios sin categoría.
            </Text>
          )}
        </Stack>
      </Paper>
      <Paper p="lg" radius="lg" withBorder>
        {!services ? (
          <Stack gap="sm">
            {Array.from({ length: 3 }, (_, index) => (
              <Skeleton height={58} key={index} />
            ))}
          </Stack>
        ) : services.length ? (
          <Table.ScrollContainer minWidth={760}>
            <Table highlightOnHover striped verticalSpacing="sm">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Servicio</Table.Th>
                  <Table.Th>Categoría</Table.Th>
                  <Table.Th>Duración</Table.Th>
                  <Table.Th>Precio</Table.Th>
                  <Table.Th>Estado</Table.Th>
                  <Table.Th>Opciones</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {services.map((service) => (
                  <Table.Tr key={service.id}>
                    <Table.Td>
                      <Text fw={700} size="sm">
                        {service.name}
                      </Text>
                      <Text c="dimmed" lineClamp={1} size="xs">
                        {service.description ?? "Sin descripción"}
                      </Text>
                      {service.custom_fields.length > 0 && (
                        <Text c="dimmed" size="xs">
                          {service.custom_fields.length} dato
                          {service.custom_fields.length === 1 ? "" : "s"}{" "}
                          adicional
                          {service.custom_fields.length === 1 ? "" : "es"}
                        </Text>
                      )}
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">
                        {service.category_id
                          ? (categoryNameById.get(service.category_id) ??
                            "No disponible")
                          : "Sin categoría"}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{service.duration_minutes} min</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">
                        {service.price === null
                          ? "Sin precio"
                          : `${service.price_type === "FROM" ? "Desde " : ""}${Number(service.price).toFixed(2)} €`}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Badge
                        color={service.is_active ? "teal" : "gray"}
                        variant="light"
                      >
                        {service.is_active ? "Activo" : "Suspendido"}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Button
                        leftSection={<Pencil size={14} />}
                        onClick={() => openService(service)}
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
              <BookOpen size={24} />
            </ThemeIcon>
            <Text fw={700}>Aún no hay servicios</Text>
            <Text c="dimmed" size="sm">
              Crea el primero para después asignarlo a tu equipo.
            </Text>
          </Stack>
        )}
      </Paper>
      <Modal
        centered
        closeOnClickOutside={!saving}
        closeOnEscape={!saving}
        onClose={categoryModal.close}
        opened={categoryOpened}
        title={
          editingCategory ? `Editar ${editingCategory.name}` : "Nueva categoría"
        }
      >
        <form onSubmit={(event) => void saveCategory(event)}>
          <Stack gap="md">
            <TextInput
              label="Nombre"
              onChange={(event) => setCategoryName(event.currentTarget.value)}
              required
              value={categoryName}
            />
            <Group justify="flex-end">
              <Button
                disabled={saving}
                onClick={categoryModal.close}
                type="button"
                variant="default"
              >
                Cancelar
              </Button>
              <Button loading={saving} type="submit">
                {editingCategory ? "Guardar categoría" : "Crear categoría"}
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
      <Modal
        centered
        closeOnClickOutside={!saving}
        closeOnEscape={!saving}
        onClose={serviceModal.close}
        opened={serviceOpened}
        size="lg"
        title={editing ? `Gestionar ${editing.name}` : "Nuevo servicio"}
      >
        <form onSubmit={(event) => void saveService(event)}>
          <Stack gap="md">
            <TextInput
              label="Nombre"
              onChange={(event) =>
                updateForm("name", event.currentTarget.value)
              }
              required
              value={form.name}
            />
            <Select
              clearable
              data={categoryOptions}
              label="Categoría"
              onChange={(value) => updateForm("categoryId", value)}
              placeholder="Sin categoría"
              value={form.categoryId}
            />
            <TextInput
              label="Descripción"
              onChange={(event) =>
                updateForm("description", event.currentTarget.value)
              }
              value={form.description}
            />
            <Group grow>
              <TextInput
                label="Duración (minutos)"
                min={1}
                onChange={(event) =>
                  updateForm("durationMinutes", event.currentTarget.value)
                }
                required
                type="number"
                value={form.durationMinutes}
              />
              <Select
                data={[
                  { label: "Precio cerrado", value: "FIXED" },
                  { label: "Precio desde", value: "FROM" },
                ]}
                label="Tipo de precio"
                onChange={(value) =>
                  updateForm(
                    "priceType",
                    (value ?? "FIXED") as ServicePriceType,
                  )
                }
                value={form.priceType}
              />
              <TextInput
                label={
                  form.priceType === "FROM" ? "Precio mínimo (€)" : "Precio (€)"
                }
                min={0}
                onChange={(event) =>
                  updateForm("price", event.currentTarget.value)
                }
                required={form.priceType === "FROM"}
                step="0.01"
                type="number"
                value={form.price}
              />
            </Group>
            <Group grow>
              <TextInput
                label="Tiempo de preparación antes (minutos)"
                min={0}
                onChange={(event) =>
                  updateForm("bufferBeforeMinutes", event.currentTarget.value)
                }
                type="number"
                value={form.bufferBeforeMinutes}
              />
              <TextInput
                label="Tiempo de margen después (minutos)"
                min={0}
                onChange={(event) =>
                  updateForm("bufferAfterMinutes", event.currentTarget.value)
                }
                type="number"
                value={form.bufferAfterMinutes}
              />
            </Group>
            <Paper
              bg="var(--mantine-color-gray-0)"
              p="md"
              radius="md"
              withBorder
            >
              <Stack gap="sm">
                <Group justify="space-between">
                  <div>
                    <Text fw={700}>Datos que se pedirán al reservar</Text>
                    <Text c="dimmed" size="xs">
                      Añade cantidades, opciones o respuestas propias de este
                      servicio.
                    </Text>
                  </div>
                  <Button
                    leftSection={<Plus size={14} />}
                    onClick={() => openField()}
                    size="xs"
                    type="button"
                    variant="light"
                  >
                    Añadir dato
                  </Button>
                </Group>
                {form.customFields.length ? (
                  form.customFields.map((field) => (
                    <Paper key={field.id} p="sm" withBorder>
                      <Group justify="space-between" wrap="nowrap">
                        <div>
                          <Text fw={600} size="sm">
                            {field.label}
                            {field.required ? " · Obligatorio" : ""}
                          </Text>
                          <Group gap="xs">
                            <Badge size="sm" variant="light">
                              {fieldTypeLabels[field.fieldType]}
                            </Badge>
                            <Badge
                              color={
                                field.pricingMode === "NONE" ? "gray" : "violet"
                              }
                              size="sm"
                              variant="light"
                            >
                              {pricingLabels[field.pricingMode]}
                            </Badge>
                          </Group>
                        </div>
                        <Group gap="xs" wrap="nowrap">
                          <Button
                            onClick={() => openField(field)}
                            size="compact-xs"
                            type="button"
                            variant="subtle"
                          >
                            Editar
                          </Button>
                          <Button
                            aria-label={`Eliminar ${field.label}`}
                            color="red"
                            onClick={() =>
                              setForm((current) => ({
                                ...current,
                                customFields: current.customFields.filter(
                                  (item) => item.id !== field.id,
                                ),
                              }))
                            }
                            size="compact-xs"
                            type="button"
                            variant="subtle"
                          >
                            <Trash2 size={14} />
                          </Button>
                        </Group>
                      </Group>
                    </Paper>
                  ))
                ) : (
                  <Text c="dimmed" size="sm">
                    No se pedirá información adicional para este servicio.
                  </Text>
                )}
              </Stack>
            </Paper>
            <Switch
              checked={form.autoConfirmAppointments}
              label="Confirmar citas automáticamente"
              onChange={(event) =>
                updateForm(
                  "autoConfirmAppointments",
                  event.currentTarget.checked,
                )
              }
            />
            {editing && (
              <Switch
                checked={form.isActive}
                label="Servicio activo"
                onChange={(event) =>
                  updateForm("isActive", event.currentTarget.checked)
                }
              />
            )}
            {error && <Alert color="red">{error}</Alert>}
            <Divider />
            <Group justify="flex-end">
              <Button
                disabled={saving}
                onClick={serviceModal.close}
                type="button"
                variant="default"
              >
                Cancelar
              </Button>
              <Button loading={saving} type="submit">
                {editing ? "Guardar cambios" : "Crear servicio"}
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
      <Modal
        centered
        onClose={fieldModal.close}
        opened={fieldOpened}
        size="lg"
        title={
          editingFieldId
            ? "Editar dato del servicio"
            : "Añadir dato al servicio"
        }
      >
        <form onSubmit={saveField}>
          <Stack gap="md">
            <TextInput
              description="Ej.: número de ruedas, tipo de pelo o número de acusados."
              label="Qué dato necesitas"
              onChange={(event) =>
                updateField("label", event.currentTarget.value)
              }
              required
              value={fieldForm.label}
            />
            <Select
              data={Object.entries(fieldTypeLabels).map(([value, label]) => ({
                label,
                value,
              }))}
              label="Tipo de respuesta"
              onChange={(value) => {
                const fieldType = value as ServiceCustomFieldType;
                setFieldForm((current) => ({
                  ...current,
                  fieldType,
                  pricingMode:
                    fieldType === "NUMBER" && current.pricingMode === "PER_UNIT"
                      ? "PER_UNIT"
                      : fieldType === "SELECT" &&
                          current.pricingMode === "OPTION"
                        ? "OPTION"
                        : "NONE",
                  durationMode:
                    fieldType === "NUMBER" &&
                    current.durationMode === "PER_UNIT"
                      ? "PER_UNIT"
                      : fieldType === "SELECT" &&
                          current.durationMode === "OPTION"
                        ? "OPTION"
                        : "NONE",
                }));
              }}
              value={fieldForm.fieldType}
            />
            {fieldForm.fieldType === "NUMBER" && (
              <Group grow>
                <TextInput
                  label="Unidad"
                  onChange={(event) =>
                    updateField("unitLabel", event.currentTarget.value)
                  }
                  placeholder="ruedas, litros, horas…"
                  value={fieldForm.unitLabel}
                />
                <TextInput
                  label="Mínimo"
                  min={0}
                  onChange={(event) =>
                    updateField("minValue", event.currentTarget.value)
                  }
                  type="number"
                  value={fieldForm.minValue}
                />
                <TextInput
                  label="Máximo"
                  min={0}
                  onChange={(event) =>
                    updateField("maxValue", event.currentTarget.value)
                  }
                  type="number"
                  value={fieldForm.maxValue}
                />
              </Group>
            )}
            {(fieldForm.fieldType === "NUMBER" ||
              fieldForm.fieldType === "SELECT") && (
              <Group grow>
                <Switch
                  checked={fieldForm.pricingMode !== "NONE"}
                  label={
                    fieldForm.fieldType === "NUMBER"
                      ? "Añade precio por unidad"
                      : "Añade suplemento de precio"
                  }
                  onChange={(event) => {
                    const enabled = event.currentTarget.checked;
                    setFieldForm((current) => ({
                      ...current,
                      pricingMode: enabled
                        ? current.fieldType === "NUMBER"
                          ? "PER_UNIT"
                          : "OPTION"
                        : "NONE",
                    }));
                  }}
                />
                <Switch
                  checked={fieldForm.durationMode !== "NONE"}
                  label={
                    fieldForm.fieldType === "NUMBER"
                      ? "Añade tiempo por unidad"
                      : "Añade tiempo a la cita"
                  }
                  onChange={(event) => {
                    const enabled = event.currentTarget.checked;
                    setFieldForm((current) => ({
                      ...current,
                      durationMode: enabled
                        ? current.fieldType === "NUMBER"
                          ? "PER_UNIT"
                          : "OPTION"
                        : "NONE",
                    }));
                  }}
                />
              </Group>
            )}
            {fieldForm.fieldType === "NUMBER" && (
              <Group grow>
                {fieldForm.pricingMode === "PER_UNIT" && (
                  <TextInput
                    label="Importe adicional por unidad (€)"
                    min={0}
                    onChange={(event) =>
                      updateField("unitPrice", event.currentTarget.value)
                    }
                    required
                    step="0.01"
                    type="number"
                    value={fieldForm.unitPrice}
                  />
                )}
                {fieldForm.durationMode === "PER_UNIT" && (
                  <TextInput
                    label="Minutos adicionales por unidad"
                    min={0}
                    onChange={(event) =>
                      updateField(
                        "unitDurationMinutes",
                        event.currentTarget.value,
                      )
                    }
                    required
                    type="number"
                    value={fieldForm.unitDurationMinutes}
                  />
                )}
              </Group>
            )}
            {fieldForm.fieldType === "SELECT" && (
              <Paper p="sm" withBorder>
                <Stack gap="xs">
                  <Group justify="space-between">
                    <div>
                      <Text fw={600} size="sm">
                        Opciones
                      </Text>
                      <Text c="dimmed" size="xs">
                        Añade cada alternativa por separado.
                      </Text>
                    </div>
                    <Button
                      leftSection={<Plus size={14} />}
                      onClick={addFieldOption}
                      size="xs"
                      type="button"
                      variant="light"
                    >
                      Añadir opción
                    </Button>
                  </Group>
                  {fieldForm.options.length ? (
                    fieldForm.options.map((option, index) => (
                      <Group align="end" key={option.id} wrap="nowrap">
                        <TextInput
                          label={`Opción ${index + 1}`}
                          onChange={(event) =>
                            updateFieldOption(
                              option.id,
                              "label",
                              event.currentTarget.value,
                            )
                          }
                          required
                          value={option.label}
                          style={{ flex: 1 }}
                        />
                        {fieldForm.pricingMode === "OPTION" && (
                          <TextInput
                            label="Suplemento (€)"
                            min={0}
                            onChange={(event) =>
                              updateFieldOption(
                                option.id,
                                "priceModifier",
                                event.currentTarget.value,
                              )
                            }
                            step="0.01"
                            type="number"
                            value={option.priceModifier}
                            w={130}
                          />
                        )}
                        {fieldForm.durationMode === "OPTION" && (
                          <TextInput
                            label="Tiempo extra (min)"
                            min={0}
                            onChange={(event) =>
                              updateFieldOption(
                                option.id,
                                "durationModifierMinutes",
                                event.currentTarget.value,
                              )
                            }
                            type="number"
                            value={option.durationModifierMinutes}
                            w={145}
                          />
                        )}
                        <Button
                          aria-label={`Eliminar opción ${index + 1}`}
                          color="red"
                          onClick={() => removeFieldOption(option.id)}
                          size="compact-sm"
                          type="button"
                          variant="subtle"
                        >
                          <Trash2 size={14} />
                        </Button>
                      </Group>
                    ))
                  ) : (
                    <Text c="dimmed" size="sm">
                      Todavía no hay opciones.
                    </Text>
                  )}
                </Stack>
              </Paper>
            )}
            <Switch
              checked={fieldForm.required}
              label="Obligatorio para reservar"
              onChange={(event) =>
                updateField("required", event.currentTarget.checked)
              }
            />
            {fieldError && <Alert color="red">{fieldError}</Alert>}
            <Group justify="flex-end">
              <Button
                onClick={fieldModal.close}
                type="button"
                variant="default"
              >
                Cancelar
              </Button>
              <Button type="submit">Guardar dato</Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </Stack>
  );
}
