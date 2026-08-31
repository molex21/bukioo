import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { CreatePlanDto } from "./dto/create-plan.dto";
import { ListSuperadminOrganizationsDto } from "./dto/list-superadmin-organizations.dto";
import { SetOrganizationSubscriptionDto } from "./dto/set-organization-subscription.dto";
import { UpdatePlanDto } from "./dto/update-plan.dto";
import { SuperadminRepository, type PlanRecord } from "./superadmin.repository";

@Injectable()
export class SuperadminService {
  constructor(private readonly repository: SuperadminRepository) {}

  async dashboard() {
    const dashboard = await this.repository.getDashboard();
    return {
      organizations: {
        active: Number(dashboard.organizations_active),
        suspended: Number(dashboard.organizations_suspended),
      },
      businesses: Number(dashboard.businesses),
      employees: Number(dashboard.employees),
      customers: Number(dashboard.customers),
      appointments: Number(dashboard.appointments),
      subscriptions: {
        active: Number(dashboard.subscriptions_active),
        trial: Number(dashboard.subscriptions_trial),
      },
    };
  }

  async listOrganizations(filters: ListSuperadminOrganizationsDto) {
    const result = await this.repository.listOrganizations(filters);
    return {
      pagination: {
        limit: filters.limit ?? 50,
        offset: filters.offset ?? 0,
        total: Number(result.total),
      },
      items: result.items.map((item) => this.organizationResponse(item)),
    };
  }

  async getOrganization(organizationId: string) {
    return this.organizationResponse(
      await this.getOrganizationOrFail(organizationId),
    );
  }

  async updateOrganizationStatus(
    organizationId: string,
    status: "ACTIVE" | "SUSPENDED",
    actorUserId: string,
  ) {
    const organization = await this.getOrganizationOrFail(organizationId);
    await this.repository.updateOrganizationStatus(organizationId, status);
    await this.repository.recordAudit(
      actorUserId,
      "ORGANIZATION_STATUS_UPDATED",
      "organization",
      organizationId,
      { status: organization.status },
      { status },
    );
    return this.getOrganization(organizationId);
  }

  async updateOrganizationSecurity(
    organizationId: string,
    require2faForAdmins: boolean,
    actorUserId: string,
  ) {
    await this.getOrganizationOrFail(organizationId);
    await this.repository.updateOrganizationSecurity(
      organizationId,
      require2faForAdmins,
    );
    await this.repository.recordAudit(
      actorUserId,
      "ORGANIZATION_SECURITY_UPDATED",
      "organization",
      organizationId,
      null,
      { require2faForAdmins },
    );
    return { organizationId, require2faForAdmins };
  }

  async listPlans() {
    return (await this.repository.listPlans()).map((plan) =>
      this.planResponse(plan),
    );
  }

  async createPlan(input: CreatePlanDto, actorUserId: string) {
    try {
      const plan = await this.repository.createPlan({
        ...input,
        code: input.code.trim().toLowerCase(),
        name: input.name.trim(),
      });
      await this.repository.recordAudit(
        actorUserId,
        "PLAN_CREATED",
        "plan",
        plan.code,
        null,
        this.planResponse(plan),
      );
      return this.planResponse(plan);
    } catch (error: unknown) {
      if (this.isDuplicateError(error))
        throw new ConflictException("Ya existe un plan con ese codigo");
      throw error;
    }
  }

  async updatePlan(
    planCode: string,
    input: UpdatePlanDto,
    actorUserId: string,
  ) {
    const existing = await this.repository.findPlan(planCode);
    if (!existing) throw new NotFoundException("Plan no encontrado");
    const plan = await this.repository.updatePlan(planCode, input);
    if (!plan) throw new NotFoundException("Plan no encontrado");
    await this.repository.recordAudit(
      actorUserId,
      "PLAN_UPDATED",
      "plan",
      planCode,
      this.planResponse(existing),
      this.planResponse(plan),
    );
    return this.planResponse(plan);
  }

  async removePlan(planCode: string, actorUserId: string): Promise<void> {
    const plan = await this.repository.findPlan(planCode);
    if (!plan) throw new NotFoundException("Plan no encontrado");
    try {
      if (!(await this.repository.removePlan(planCode)))
        throw new NotFoundException("Plan no encontrado");
      await this.repository.recordAudit(
        actorUserId,
        "PLAN_DELETED",
        "plan",
        planCode,
        this.planResponse(plan),
        null,
      );
    } catch (error: unknown) {
      if (this.isForeignKeyError(error))
        throw new ConflictException(
          "No se puede eliminar un plan con suscripciones asociadas",
        );
      throw error;
    }
  }

  async setSubscription(
    organizationId: string,
    input: SetOrganizationSubscriptionDto,
    actorUserId: string,
  ) {
    await this.getOrganizationOrFail(organizationId);
    const plan = await this.repository.findPlan(
      input.planCode.trim().toLowerCase(),
    );
    if (!plan || !plan.is_active)
      throw new NotFoundException("Plan activo no encontrado");
    const subscription = await this.repository.setSubscription(organizationId, {
      ...input,
      planCode: plan.code,
    });
    await this.repository.recordAudit(
      actorUserId,
      "ORGANIZATION_SUBSCRIPTION_SET",
      "organization",
      organizationId,
      null,
      subscription,
    );
    return subscription;
  }

  private async getOrganizationOrFail(organizationId: string) {
    const organization = await this.repository.findOrganization(organizationId);
    if (!organization)
      throw new NotFoundException("Organizacion no encontrada");
    return organization;
  }

  private organizationResponse(
    organization: Awaited<
      ReturnType<SuperadminRepository["findOrganization"]>
    > extends infer T
      ? Exclude<T, null>
      : never,
  ) {
    return {
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      email: organization.email,
      status: organization.status,
      createdAt: organization.created_at,
      businesses: Number(organization.business_count),
      employees: Number(organization.employee_count),
      subscription: organization.subscription_plan_code
        ? {
            planCode: organization.subscription_plan_code,
            status: organization.subscription_status,
          }
        : null,
    };
  }

  private planResponse(plan: PlanRecord) {
    return {
      code: plan.code,
      name: plan.name,
      maxEmployees: plan.max_employees,
      maxLocations: plan.max_locations,
      maxMonthlyAppointments: plan.max_monthly_appointments,
      canUseLoyalty: plan.can_use_loyalty,
      canUseAdvancedReports: plan.can_use_advanced_reports,
      canUseMultipleLocations: plan.can_use_multiple_locations,
      canUseSms: plan.can_use_sms,
      trialDays: plan.trial_days,
      isActive: plan.is_active,
      createdAt: plan.created_at,
      updatedAt: plan.updated_at,
    };
  }

  private isDuplicateError(error: unknown) {
    return (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "23505"
    );
  }
  private isForeignKeyError(error: unknown) {
    return (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "23503"
    );
  }
}
