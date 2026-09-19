import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { AuthService } from "../auth/auth.service";
import type { LoginSessionMetadata } from "../auth/auth.service";
import { BusinessesRepository } from "../businesses/businesses.repository";
import { CreateBusinessDto } from "../businesses/dto/create-business.dto";
import { CreateSuperadminBusinessDto } from "./dto/create-superadmin-business.dto";
import { CreateSuperadminEmployeeDto } from "./dto/create-superadmin-employee.dto";
import { CreateSuperadminOrganizationDto } from "./dto/create-superadmin-organization.dto";
import { CreatePlanDto } from "./dto/create-plan.dto";
import { ListSuperadminBusinessesDto } from "./dto/list-superadmin-businesses.dto";
import { ListSuperadminEmployeesDto } from "./dto/list-superadmin-employees.dto";
import { ListSuperadminOrganizationsDto } from "./dto/list-superadmin-organizations.dto";
import { SetOrganizationSubscriptionDto } from "./dto/set-organization-subscription.dto";
import { UpdatePlanDto } from "./dto/update-plan.dto";
import { UpdateSuperadminBusinessDto } from "./dto/update-superadmin-business.dto";
import { ListPlatformAuditLogsDto } from "./dto/list-platform-audit-logs.dto";
import { SuperadminRepository, type PlanRecord } from "./superadmin.repository";
import { OrganizationMembersService } from "../organizations/organization-members.service";
import { RequestEmailChangeDto } from "../auth/dto/request-email-change.dto";
import { ConfirmEmailChangeDto } from "../auth/dto/confirm-email-change.dto";

@Injectable()
export class SuperadminService {
  constructor(
    private readonly repository: SuperadminRepository,
    private readonly authService: AuthService,
    private readonly businessesRepository: BusinessesRepository,
    private readonly members: OrganizationMembersService,
  ) {}

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

  async requestMemberEmailChange(
    organizationId: string,
    membershipId: string,
    input: RequestEmailChangeDto,
    actorUserId: string,
    metadata: LoginSessionMetadata = {},
  ) {
    const member = await this.members.getMemberForPlatform(
      organizationId,
      membershipId,
      actorUserId,
    );
    const newEmail = input.newEmail.trim().toLowerCase();
    await this.authService.requestEmailChange(
      member.user_id,
      { newEmail },
      metadata,
    );
    await this.repository.recordAudit(
      actorUserId,
      "USER_EMAIL_CHANGE_REQUESTED",
      "user",
      member.user_id,
      { email: member.email },
      { email: newEmail, organizationId, membershipId },
    );
    return { status: "accepted" as const };
  }

  async confirmMemberEmailChange(
    organizationId: string,
    membershipId: string,
    input: ConfirmEmailChangeDto,
    actorUserId: string,
    metadata: LoginSessionMetadata = {},
  ) {
    const member = await this.members.getMemberForPlatform(
      organizationId,
      membershipId,
      actorUserId,
    );
    const result = await this.authService.confirmEmailChange(
      member.user_id,
      input,
      metadata,
    );
    await this.repository.recordAudit(
      actorUserId,
      "USER_EMAIL_CHANGED",
      "user",
      member.user_id,
      { email: member.email },
      { email: result.email, organizationId, membershipId },
    );
    return result;
  }

  async createOrganization(
    input: CreateSuperadminOrganizationDto,
    actorUserId: string,
  ) {
    const onboarding = await this.authService.provisionOrganization(input);
    await this.repository.recordAudit(
      actorUserId,
      "ORGANIZATION_CREATED",
      "organization",
      onboarding.organization.id,
      null,
      onboarding.organization,
    );
    return onboarding;
  }

  async createOrganizationBusiness(
    organizationId: string,
    input: CreateSuperadminBusinessDto,
    actorUserId: string,
  ) {
    await this.getOrganizationOrFail(organizationId);
    try {
      const business = await this.businessesRepository.createForOrganization({
        organizationId,
        name: input.name.trim(),
        slug: input.slug.trim().toLowerCase(),
        email: input.email?.trim().toLowerCase(),
        phone: input.phone?.trim(),
        timezone: input.timezone?.trim(),
        logoUrl: input.logoUrl?.trim(),
      } satisfies CreateBusinessDto);
      await this.repository.recordAudit(
        actorUserId,
        "BUSINESS_CREATED",
        "business",
        business.id,
        null,
        business,
      );
      return business;
    } catch (error: unknown) {
      if (this.isDuplicateError(error)) {
        throw new ConflictException(
          "Ya existe un negocio con ese slug en la organizacion",
        );
      }
      throw error;
    }
  }

  async createBusinessEmployee(
    organizationId: string,
    businessId: string,
    input: CreateSuperadminEmployeeDto,
    actorUserId: string,
  ) {
    await this.getOrganizationOrFail(organizationId);
    await this.getOrganizationBusinessOrFail(organizationId, businessId);
    if (input.userId !== undefined) {
      return this.members.linkEmployee(
        organizationId,
        businessId,
        { ...input, userId: input.userId },
        actorUserId,
        true,
      );
    }
    if (
      !input.email ||
      !input.firstName?.trim() ||
      !input.lastName?.trim() ||
      !input.role
    ) {
      throw new BadRequestException(
        "Email, nombre, apellidos y rol son obligatorios para invitar",
      );
    }
    const employee = await this.authService.inviteEmployee({
      organizationId,
      businessId,
      email: input.email,
      firstName: input.firstName,
      lastName: input.lastName,
      phone: input.phone,
      color: input.color,
      role: input.role,
    });
    await this.repository.recordAudit(
      actorUserId,
      "EMPLOYEE_INVITED",
      "employee",
      employee.id,
      null,
      { organizationId, businessId, role: input.role, employee },
    );
    return employee;
  }

  async listOrganizationBusinesses(
    organizationId: string,
    filters: ListSuperadminBusinessesDto,
  ) {
    await this.getOrganizationOrFail(organizationId);
    const result = await this.repository.listOrganizationBusinesses(
      organizationId,
      filters,
    );
    return {
      pagination: {
        limit: filters.limit ?? 50,
        offset: filters.offset ?? 0,
        total: Number(result.total),
      },
      items: result.items.map((item) => this.businessResponse(item)),
    };
  }

  async getOrganizationBusiness(organizationId: string, businessId: string) {
    await this.getOrganizationOrFail(organizationId);
    return this.businessResponse(
      await this.getOrganizationBusinessOrFail(organizationId, businessId),
    );
  }

  async updateOrganizationBusiness(
    organizationId: string,
    businessId: string,
    input: UpdateSuperadminBusinessDto,
    actorUserId: string,
  ) {
    const previous = await this.getOrganizationBusinessOrFail(
      organizationId,
      businessId,
    );
    try {
      await this.repository.updateOrganizationBusiness(
        organizationId,
        businessId,
        input,
      );
    } catch (error: unknown) {
      if (this.isDuplicateError(error)) {
        throw new ConflictException(
          "Ya existe un negocio con ese slug en la organizacion",
        );
      }
      throw error;
    }
    const updated = await this.getOrganizationBusinessOrFail(
      organizationId,
      businessId,
    );
    await this.repository.recordAudit(
      actorUserId,
      "BUSINESS_UPDATED",
      "business",
      businessId,
      this.businessResponse(previous),
      this.businessResponse(updated),
    );
    return this.businessResponse(updated);
  }

  async listBusinessEmployees(
    organizationId: string,
    businessId: string,
    filters: ListSuperadminEmployeesDto,
  ) {
    await this.getOrganizationOrFail(organizationId);
    await this.getOrganizationBusinessOrFail(organizationId, businessId);
    const result = await this.repository.listBusinessEmployees(
      organizationId,
      businessId,
      filters,
    );
    return {
      pagination: {
        limit: filters.limit ?? 50,
        offset: filters.offset ?? 0,
        total: Number(result.total),
      },
      items: result.items.map((item) => ({
        id: item.id,
        userId: item.user_id,
        firstName: item.first_name,
        lastName: item.last_name,
        email: item.email,
        phone: item.phone,
        color: item.color,
        isActive: item.is_active,
        createdAt: item.created_at,
      })),
    };
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

  async listSubscriptions(organizationId: string) {
    await this.getOrganizationOrFail(organizationId);
    return (await this.repository.listSubscriptions(organizationId)).map(
      (item) => ({
        id: item.id,
        planCode: item.plan_code,
        status: item.status,
        trialStartedAt: item.trial_started_at,
        trialEndsAt: item.trial_ends_at,
        startsAt: item.starts_at,
        expiresAt: item.expires_at,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
      }),
    );
  }

  async listAuditLogs(filters: ListPlatformAuditLogsDto) {
    const result = await this.repository.listAuditLogs(filters);
    return {
      pagination: {
        limit: filters.limit ?? 50,
        offset: filters.offset ?? 0,
        total: Number(result.total),
      },
      items: result.items.map((item) => ({
        id: item.id,
        actorUserId: item.actor_user_id,
        actorEmail: item.actor_email,
        action: item.action,
        entityType: item.entity_type,
        entityId: item.entity_id,
        oldValues: item.old_values,
        newValues: item.new_values,
        createdAt: item.created_at,
      })),
    };
  }

  private async getOrganizationOrFail(organizationId: string) {
    const organization = await this.repository.findOrganization(organizationId);
    if (!organization)
      throw new NotFoundException("Organizacion no encontrada");
    return organization;
  }

  private async getOrganizationBusinessOrFail(
    organizationId: string,
    businessId: string,
  ) {
    const business = await this.repository.findOrganizationBusiness(
      organizationId,
      businessId,
    );
    if (!business) throw new NotFoundException("Negocio no encontrado");
    return business;
  }

  private businessResponse(
    business: Awaited<
      ReturnType<SuperadminRepository["findOrganizationBusiness"]>
    > extends infer T
      ? Exclude<T, null>
      : never,
  ) {
    return {
      id: business.id,
      organizationId: business.organization_id,
      name: business.name,
      slug: business.slug,
      email: business.email,
      phone: business.phone,
      timezone: business.timezone,
      logoUrl: business.logo_url,
      status: business.status,
      employeeCount: Number(business.employee_count),
      createdAt: business.created_at,
    };
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
