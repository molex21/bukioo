import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { CreateCustomerDto } from "./dto/create-customer.dto";
import { UpdateCustomerDto } from "./dto/update-customer.dto";
import {
  CustomersRepository,
  type CustomerRecord,
} from "./customers.repository";

@Injectable()
export class CustomersService {
  constructor(private readonly customersRepository: CustomersRepository) {}

  async create(
    businessId: string,
    dto: CreateCustomerDto,
    userId: string,
  ): Promise<CustomerRecord> {
    await this.assertCanManage(userId, businessId);
    return this.customersRepository.create(businessId, this.normalize(dto));
  }

  async list(businessId: string, userId: string): Promise<CustomerRecord[]> {
    await this.assertCanAccess(userId, businessId);
    return this.customersRepository.listByBusiness(businessId);
  }

  async get(
    businessId: string,
    customerId: string,
    userId: string,
  ): Promise<CustomerRecord> {
    await this.assertCanAccess(userId, businessId);
    return this.getCustomer(businessId, customerId);
  }

  async update(
    businessId: string,
    customerId: string,
    dto: UpdateCustomerDto,
    userId: string,
  ): Promise<CustomerRecord> {
    await this.assertCanManage(userId, businessId);
    const customer = await this.getCustomer(businessId, customerId);
    return this.customersRepository.update(customer, this.normalize(dto));
  }

  async remove(
    businessId: string,
    customerId: string,
    userId: string,
  ): Promise<void> {
    await this.assertCanManage(userId, businessId);
    const customer = await this.getCustomer(businessId, customerId);
    if (!(await this.customersRepository.anonymize(customer))) {
      throw new NotFoundException("Cliente no encontrado");
    }
  }

  private async assertCanAccess(
    userId: string,
    businessId: string,
  ): Promise<void> {
    if (
      !(await this.customersRepository.canAccessBusiness(userId, businessId))
    ) {
      throw new ForbiddenException("No tienes acceso a este negocio");
    }
  }

  private async assertCanManage(
    userId: string,
    businessId: string,
  ): Promise<void> {
    if (
      !(await this.customersRepository.canManageBusiness(userId, businessId))
    ) {
      throw new ForbiddenException("No tienes permiso para gestionar clientes");
    }
  }

  private async getCustomer(
    businessId: string,
    customerId: string,
  ): Promise<CustomerRecord> {
    const customer = await this.customersRepository.findById(
      businessId,
      customerId,
    );
    if (!customer) throw new NotFoundException("Cliente no encontrado");
    return customer;
  }

  private normalize<T extends CreateCustomerDto | UpdateCustomerDto>(
    dto: T,
  ): T {
    return {
      ...dto,
      firstName: dto.firstName?.trim(),
      lastName: dto.lastName?.trim(),
      email: dto.email?.trim().toLowerCase(),
      phone: dto.phone?.trim(),
      notes: dto.notes?.trim(),
    };
  }
}
