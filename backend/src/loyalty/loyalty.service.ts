import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { CreateLoyaltyLevelDto } from "./dto/create-loyalty-level.dto";
import { UpdateLoyaltyLevelDto } from "./dto/update-loyalty-level.dto";
import {
  LoyaltyRepository,
  type LoyaltyLevelRecord,
} from "./loyalty.repository";

@Injectable()
export class LoyaltyService {
  constructor(private readonly loyaltyRepository: LoyaltyRepository) {}

  async create(
    businessId: string,
    dto: CreateLoyaltyLevelDto,
    userId: string,
  ): Promise<LoyaltyLevelRecord> {
    await this.assertCanManageBusiness(userId, businessId);
    return this.loyaltyRepository.create(businessId, {
      ...dto,
      name: dto.name.trim(),
    });
  }

  async list(
    businessId: string,
    userId: string,
  ): Promise<LoyaltyLevelRecord[]> {
    await this.assertCanAccessBusiness(userId, businessId);
    return this.loyaltyRepository.listByBusiness(businessId);
  }

  async update(
    businessId: string,
    levelId: string,
    dto: UpdateLoyaltyLevelDto,
    userId: string,
  ): Promise<LoyaltyLevelRecord> {
    await this.assertCanManageBusiness(userId, businessId);
    const level = await this.getLevel(businessId, levelId);
    return this.loyaltyRepository.update(level, {
      ...dto,
      name: dto.name?.trim(),
    });
  }

  async remove(
    businessId: string,
    levelId: string,
    userId: string,
  ): Promise<void> {
    await this.assertCanManageBusiness(userId, businessId);
    const level = await this.getLevel(businessId, levelId);

    if ((await this.loyaltyRepository.countCustomers(level)) > 0) {
      throw new ConflictException(
        "No se puede eliminar un nivel con clientes asociados",
      );
    }

    if (!(await this.loyaltyRepository.remove(level))) {
      throw new NotFoundException("Nivel de fidelizacion no encontrado");
    }
  }

  private async assertCanAccessBusiness(
    userId: string,
    businessId: string,
  ): Promise<void> {
    if (!(await this.loyaltyRepository.canAccessBusiness(userId, businessId))) {
      throw new ForbiddenException("No tienes acceso a este negocio");
    }
  }

  private async assertCanManageBusiness(
    userId: string,
    businessId: string,
  ): Promise<void> {
    if (!(await this.loyaltyRepository.canManageBusiness(userId, businessId))) {
      throw new ForbiddenException(
        "No tienes permiso para gestionar fidelizacion",
      );
    }
  }

  private async getLevel(
    businessId: string,
    levelId: string,
  ): Promise<LoyaltyLevelRecord> {
    const level = await this.loyaltyRepository.findById(businessId, levelId);

    if (!level) {
      throw new NotFoundException("Nivel de fidelizacion no encontrado");
    }

    return level;
  }
}
