import { authenticatedApiRequest } from "./api-client";

export type ServiceCategory = { id: string; is_active: boolean; name: string; sort_order: number };
export type ServiceCustomFieldType = "NUMBER" | "SELECT" | "TEXT" | "BOOLEAN";
export type ServiceCustomFieldPricingMode = "NONE" | "PER_UNIT" | "OPTION";
export type ServiceCustomFieldDurationMode = "NONE" | "PER_UNIT" | "OPTION";
export type ServiceCustomFieldOption = { durationModifierMinutes?: number; label: string; priceModifier?: number; value: string };
export type ServiceCustomField = { durationMode: ServiceCustomFieldDurationMode; fieldType: ServiceCustomFieldType; id: string; label: string; maxValue?: number; minValue?: number; options?: ServiceCustomFieldOption[]; pricingMode: ServiceCustomFieldPricingMode; required: boolean; unitDurationMinutes?: number; unitLabel?: string; unitPrice?: number };
export type BusinessService = { auto_confirm_appointments: boolean | null; buffer_after_minutes: number; buffer_before_minutes: number; category_id: string | null; custom_fields: ServiceCustomField[]; description: string | null; duration_minutes: number; id: string; is_active: boolean; name: string; price: string | null };
export type ServiceInput = { autoConfirmAppointments?: boolean; bufferAfterMinutes?: number; bufferBeforeMinutes?: number; categoryId?: string; customFields?: ServiceCustomField[]; description?: string; durationMinutes?: number; isActive?: boolean; name?: string; price?: number };

export const workspaceCatalogApi = {
  createCategory: (businessId: string, input: { name: string }) => authenticatedApiRequest<ServiceCategory>(`/businesses/${businessId}/service-categories`, { body: JSON.stringify(input), method: "POST" }),
  createService: (businessId: string, input: Required<Pick<ServiceInput, "durationMinutes" | "name">> & ServiceInput) => authenticatedApiRequest<BusinessService>(`/businesses/${businessId}/services`, { body: JSON.stringify(input), method: "POST" }),
  listCategories: (businessId: string) => authenticatedApiRequest<ServiceCategory[]>(`/businesses/${businessId}/service-categories`),
  listServices: (businessId: string) => authenticatedApiRequest<BusinessService[]>(`/businesses/${businessId}/services`),
  updateCategory: (businessId: string, categoryId: string, input: { name: string }) => authenticatedApiRequest<ServiceCategory>(`/businesses/${businessId}/service-categories/${categoryId}`, { body: JSON.stringify(input), method: "PATCH" }),
  updateService: (businessId: string, serviceId: string, input: ServiceInput) => authenticatedApiRequest<BusinessService>(`/businesses/${businessId}/services/${serviceId}`, { body: JSON.stringify(input), method: "PATCH" }),
};
