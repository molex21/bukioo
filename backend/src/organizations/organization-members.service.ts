import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { PoolClient } from "pg";
import { OrganizationMembersRepository } from "./organization-members.repository";
import type { ListOrganizationMembersDto } from "./dto/list-organization-members.dto";
import type { UpdateMemberRoleDto } from "./dto/update-member-role.dto";
import type { TransferOwnershipDto } from "../superadmin/dto/transfer-ownership.dto";
import type {
  UpdateMemberBusinessesDto,
  UpdateMemberStatusDto,
} from "./dto/update-member-access.dto";

@Injectable()
export class OrganizationMembersService {
  constructor(private readonly repository: OrganizationMembersRepository) {}

  private async authorize(
    client: PoolClient,
    organizationId: string,
    actorUserId: string,
    platform: boolean,
    mutation: boolean,
  ) {
    const organization = await this.repository.organization(
      client,
      organizationId,
      mutation,
    );
    const actor = await this.repository.actor(
      client,
      organizationId,
      actorUserId,
    );
    if (
      platform
        ? !actor?.is_superadmin
        : !actor?.role || !["OWNER", "ADMIN"].includes(actor.role)
    ) {
      throw new ForbiddenException("No tienes permiso para gestionar miembros");
    }
    if (!organization)
      throw new NotFoundException("Organizacion no encontrada");
    if (organization.status !== "ACTIVE" && (!platform || mutation)) {
      throw new ConflictException("La organizacion no esta activa");
    }
    return actor;
  }

  async list(
    organizationId: string,
    filters: ListOrganizationMembersDto,
    actorUserId: string,
    platform = false,
  ) {
    return this.repository.transaction(async (client) => {
      await this.authorize(
        client,
        organizationId,
        actorUserId,
        platform,
        false,
      );
      if (
        filters.businessId &&
        !(await this.repository.business(
          client,
          organizationId,
          filters.businessId,
        ))
      ) {
        throw new NotFoundException(
          "Negocio no encontrado en esta organizacion",
        );
      }
      const result = await this.repository.list(
        client,
        organizationId,
        filters,
      );
      return {
        pagination: {
          limit: filters.limit ?? 50,
          offset: filters.offset ?? 0,
          total: result.total,
        },
        items: result.items.map((member) => ({
          membershipId: member.id,
          userId: member.user_id,
          firstName: member.first_name,
          lastName: member.last_name,
          email: member.email,
          role: member.role,
          status: member.status,
          userStatus: member.user_status,
          businesses: member.businesses,
        })),
      };
    });
  }

  async getMemberForPlatform(
    organizationId: string,
    membershipId: string,
    actorUserId: string,
  ) {
    return this.repository.transaction(async (client) => {
      await this.authorize(client, organizationId, actorUserId, true, true);
      const member = await this.repository.member(
        client,
        organizationId,
        membershipId,
      );
      if (!member) {
        throw new NotFoundException(
          "Miembro no encontrado en esta organizacion",
        );
      }
      return member;
    });
  }

  async transferOwnership(
    organizationId: string,
    input: TransferOwnershipDto,
    actorUserId: string,
  ) {
    return this.repository.transaction(async (client) => {
      // Shares the organization lock with all other membership mutations.
      await this.authorize(client, organizationId, actorUserId, true, true);
      if (
        input.currentOwnerMembershipId.toLowerCase() ===
        input.newOwnerMembershipId.toLowerCase()
      ) {
        throw new BadRequestException("Selecciona un propietario diferente");
      }
      const previousOwner = await this.repository.member(
        client,
        organizationId,
        input.currentOwnerMembershipId,
      );
      const newOwner = await this.repository.member(
        client,
        organizationId,
        input.newOwnerMembershipId,
      );
      if (!previousOwner || !newOwner) {
        throw new NotFoundException(
          "Miembro no encontrado en esta organizacion",
        );
      }
      const owners = await this.repository.ownerMembershipIds(
        client,
        organizationId,
      );
      if (owners.length !== 1 || owners[0] !== previousOwner.id) {
        throw new ConflictException(
          "El propietario ha cambiado o no es unico. Actualiza el listado antes de continuar",
        );
      }
      if (
        newOwner.status !== "ACTIVE" ||
        newOwner.user_status !== "ACTIVE" ||
        !["ADMIN", "MANAGER", "EMPLOYEE"].includes(newOwner.role)
      ) {
        throw new ConflictException(
          "El nuevo propietario debe ser un miembro activo del personal con una cuenta activa",
        );
      }
      const previousBusinesses = await this.repository.assignedBusinesses(
        client,
        organizationId,
        previousOwner.user_id,
      );
      const newOwnerBusinesses = await this.repository.assignedBusinesses(
        client,
        organizationId,
        newOwner.user_id,
      );
      await this.repository.changeRole(
        client,
        organizationId,
        previousOwner,
        "ADMIN",
        [],
      );
      await this.repository.changeRole(
        client,
        organizationId,
        newOwner,
        "OWNER",
        [],
      );
      const result = {
        organizationId,
        previousOwner: {
          membershipId: previousOwner.id,
          userId: previousOwner.user_id,
          role: "ADMIN",
        },
        newOwner: {
          membershipId: newOwner.id,
          userId: newOwner.user_id,
          role: "OWNER",
        },
      };
      await this.repository.audit(
        client,
        organizationId,
        actorUserId,
        true,
        "ORGANIZATION_OWNERSHIP_TRANSFERRED",
        "ORGANIZATION",
        organizationId,
        {
          previousOwner: {
            ...result.previousOwner,
            role: previousOwner.role,
            businessIds: previousBusinesses,
          },
          newOwner: {
            ...result.newOwner,
            role: newOwner.role,
            businessIds: newOwnerBusinesses,
          },
        },
        result,
      );
      return result;
    });
  }

  async updateRole(
    organizationId: string,
    membershipId: string,
    input: UpdateMemberRoleDto,
    actorUserId: string,
    platform = false,
  ) {
    return this.repository.transaction(async (client) => {
      // Serialize role changes and recheck authority after acquiring the org lock.
      const actor = await this.authorize(
        client,
        organizationId,
        actorUserId,
        platform,
        true,
      );
      const member = await this.repository.member(
        client,
        organizationId,
        membershipId,
      );
      if (!member)
        throw new NotFoundException(
          "Miembro no encontrado en esta organizacion",
        );
      if (member.role === "OWNER")
        throw new ConflictException(
          "El propietario solo puede cambiar mediante una transferencia de propiedad",
        );
      if (member.status !== "ACTIVE" || member.user_status !== "ACTIVE")
        throw new ConflictException(
          "La cuenta y la membresia deben estar activas",
        );
      if (!["ADMIN", "MANAGER", "EMPLOYEE"].includes(member.role))
        throw new ConflictException(
          "Este miembro no tiene un rol de personal gestionable",
        );
      if (
        !platform &&
        actor.role === "ADMIN" &&
        (member.user_id === actorUserId ||
          member.role === "ADMIN" ||
          input.role === "ADMIN")
      )
        throw new ForbiddenException(
          "Un admin solo puede gestionar otros managers y empleados",
        );

      const previousBusinesses = await this.repository.assignedBusinesses(
        client,
        organizationId,
        member.user_id,
      );
      if (
        member.role === "ADMIN" &&
        input.role !== "ADMIN" &&
        input.businessIds === undefined
      ) {
        throw new BadRequestException(
          "Indica businessIds al quitar el acceso global; usa [] para no asignar negocios",
        );
      }
      if (input.role === "ADMIN" && input.businessIds !== undefined)
        throw new BadRequestException(
          "ADMIN tiene acceso global; no admite businessIds",
        );
      for (const id of input.businessIds ?? []) {
        const business = await this.repository.business(
          client,
          organizationId,
          id,
        );
        if (!business || business.status !== "ACTIVE")
          throw new NotFoundException(
            "Negocio activo no encontrado en esta organizacion",
          );
      }
      const businessIds =
        input.role === "ADMIN" ? [] : (input.businessIds ?? previousBusinesses);
      const unchanged =
        member.role === input.role &&
        [...previousBusinesses].sort().join() ===
          [...businessIds].sort().join();
      if (!unchanged) {
        await this.repository.changeRole(
          client,
          organizationId,
          member,
          input.role,
          businessIds,
        );
        await this.repository.audit(
          client,
          organizationId,
          actorUserId,
          platform,
          "MEMBER_ROLE_CHANGED",
          "ORGANIZATION_MEMBERSHIP",
          member.id,
          { role: member.role, businessIds: previousBusinesses },
          { userId: member.user_id, role: input.role, businessIds },
        );
      }
      return {
        membershipId: member.id,
        userId: member.user_id,
        role: input.role,
        status: member.status,
        accessMode:
          input.role === "ADMIN"
            ? "ALL_ACTIVE_BUSINESSES"
            : "ASSIGNED_BUSINESSES",
        businessIds,
      };
    });
  }

  async updateStatus(
    organizationId: string,
    membershipId: string,
    input: UpdateMemberStatusDto,
    actorUserId: string,
    platform = false,
  ) {
    return this.repository.transaction(async (client) => {
      const actor = await this.authorize(
        client,
        organizationId,
        actorUserId,
        platform,
        true,
      );
      const member = await this.repository.member(
        client,
        organizationId,
        membershipId,
      );
      if (!member)
        throw new NotFoundException(
          "Usuario no encontrado en esta organización",
        );
      if (member.user_id === actorUserId)
        throw new ForbiddenException(
          "No puedes suspender ni restablecer tu propio acceso",
        );
      if (!["ADMIN", "MANAGER", "EMPLOYEE"].includes(member.role))
        throw new ConflictException(
          "No se puede modificar el acceso del propietario ni de este tipo de usuario",
        );
      if (!platform && actor.role === "ADMIN" && member.role === "ADMIN")
        throw new ForbiddenException(
          "Un administrador solo puede gestionar empleados y responsables",
        );
      if (!["ACTIVE", "SUSPENDED"].includes(member.status))
        throw new ConflictException(
          "El usuario debe completar su invitación antes de gestionar el acceso",
        );
      if (
        member.status !== input.expectedStatus ||
        member.role !== input.expectedRole
      )
        throw new ConflictException(
          "Los accesos han cambiado. Actualiza el listado antes de continuar",
        );
      if (input.status === "ACTIVE" && member.user_status !== "ACTIVE")
        throw new ConflictException(
          "La cuenta del usuario debe estar activa antes de restablecer su acceso",
        );
      if (member.status !== input.status) {
        await this.repository.changeStatus(
          client,
          organizationId,
          membershipId,
          input.status,
        );
        await this.repository.audit(
          client,
          organizationId,
          actorUserId,
          platform,
          input.status === "SUSPENDED"
            ? "MEMBER_ACCESS_SUSPENDED"
            : "MEMBER_ACCESS_RESTORED",
          "ORGANIZATION_MEMBERSHIP",
          membershipId,
          { status: member.status },
          { status: input.status, userId: member.user_id, role: member.role },
        );
      }
      return {
        membershipId,
        userId: member.user_id,
        status: input.status,
        role: member.role,
      };
    });
  }

  async updateBusinesses(
    organizationId: string,
    membershipId: string,
    input: UpdateMemberBusinessesDto,
    actorUserId: string,
    platform = false,
  ) {
    return this.repository.transaction(async (client) => {
      const actor = await this.authorize(
        client,
        organizationId,
        actorUserId,
        platform,
        true,
      );
      const member = await this.repository.member(
        client,
        organizationId,
        membershipId,
      );
      if (!member)
        throw new NotFoundException(
          "Usuario no encontrado en esta organización",
        );
      if (!["MANAGER", "EMPLOYEE"].includes(member.role))
        throw new ConflictException(
          "Propietarios y administradores tienen acceso global; cambia primero su rol si corresponde",
        );
      if (!platform && actor.role === "ADMIN" && member.user_id === actorUserId)
        throw new ForbiddenException("No puedes modificar tus propios accesos");
      if (
        !["ACTIVE", "SUSPENDED"].includes(member.status) ||
        member.user_status !== "ACTIVE"
      )
        throw new ConflictException(
          "El usuario debe tener una cuenta activa y una vinculación activa o suspendida",
        );
      const previous = await this.repository.assignedBusinesses(
        client,
        organizationId,
        member.user_id,
      );
      const sameIds = (left: string[], right: string[]) =>
        [...left].sort().join() === [...right].sort().join();
      if (
        member.role !== input.expectedRole ||
        !sameIds(previous, input.expectedBusinessIds)
      )
        throw new ConflictException(
          "Las empresas o el rol han cambiado. Actualiza el listado antes de continuar",
        );
      for (const id of input.businessIds) {
        const business = await this.repository.business(
          client,
          organizationId,
          id,
        );
        if (
          !business ||
          (business.status !== "ACTIVE" && !previous.includes(id))
        )
          throw new NotFoundException(
            "Empresa activa no encontrada en esta organización",
          );
      }
      if (!sameIds(previous, input.businessIds)) {
        await this.repository.replaceBusinesses(
          client,
          organizationId,
          member.user_id,
          input.businessIds,
        );
        await this.repository.audit(
          client,
          organizationId,
          actorUserId,
          platform,
          "MEMBER_BUSINESSES_CHANGED",
          "ORGANIZATION_MEMBERSHIP",
          membershipId,
          { businessIds: previous },
          {
            businessIds: input.businessIds,
            userId: member.user_id,
            role: member.role,
          },
        );
      }
      return {
        membershipId,
        userId: member.user_id,
        role: member.role,
        status: member.status,
        businessIds: input.businessIds,
      };
    });
  }

  async linkEmployee(
    organizationId: string,
    businessId: string,
    input: { userId: string; color?: string; notes?: string },
    actorUserId: string,
    platform = false,
  ) {
    if (
      Object.entries(input).some(
        ([key, value]) =>
          value !== undefined && !["userId", "color", "notes"].includes(key),
      )
    ) {
      throw new BadRequestException(
        "Con userId solo se admiten color y notes; se conservan el perfil y el rol existentes",
      );
    }
    try {
      return await this.repository.transaction(async (client) => {
        await this.authorize(
          client,
          organizationId,
          actorUserId,
          platform,
          true,
        );
        const business = await this.repository.business(
          client,
          organizationId,
          businessId,
        );
        if (!business || business.status !== "ACTIVE")
          throw new NotFoundException(
            "Negocio activo no encontrado en esta organizacion",
          );
        const member = await this.repository.member(
          client,
          organizationId,
          input.userId,
          true,
        );
        if (!member)
          throw new NotFoundException(
            "Usuario no encontrado en esta organizacion",
          );
        if (
          member.status !== "ACTIVE" ||
          member.user_status !== "ACTIVE" ||
          member.role === "CLIENT"
        )
          throw new ConflictException(
            "El usuario debe ser un miembro activo del personal",
          );
        if (!["OWNER", "ADMIN"].includes(member.role)) {
          const assigned = await this.repository.assignedBusinesses(
            client,
            organizationId,
            input.userId,
          );
          if (!assigned.includes(businessId))
            throw new ConflictException(
              "El miembro no tiene acceso a este negocio",
            );
        }
        const existing = await this.repository.employee(
          client,
          organizationId,
          businessId,
          input.userId,
        );
        if (existing)
          throw new ConflictException(
            existing.is_active
              ? "El usuario ya tiene una ficha de empleado en este negocio"
              : "El usuario tiene una ficha archivada en este negocio; no se creara otra",
          );
        if (!member.first_name?.trim() || !member.last_name?.trim())
          throw new ConflictException(
            "Completa el nombre y apellidos del perfil del usuario antes de vincularlo",
          );
        const capacity = await this.repository.capacity(client, organizationId);
        if (
          capacity.maximum !== null &&
          Number(capacity.count) >= capacity.maximum
        )
          throw new ConflictException(
            `El plan actual permite hasta ${capacity.maximum} empleados activos`,
          );
        const employee = await this.repository.createEmployee(
          client,
          organizationId,
          businessId,
          member,
          input,
        );
        await this.repository.audit(
          client,
          organizationId,
          actorUserId,
          platform,
          "EMPLOYEE_LINKED",
          "EMPLOYEE",
          employee.id,
          null,
          { userId: member.user_id, businessId, role: member.role },
          businessId,
        );
        return employee;
      });
    } catch (error: unknown) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "23505"
      )
        throw new ConflictException(
          "El usuario ya tiene una ficha de empleado en este negocio",
        );
      throw error;
    }
  }
}
