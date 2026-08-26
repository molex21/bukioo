import { Test, TestingModule } from "@nestjs/testing";
import { CustomersRepository } from "./customers.repository";
import { CustomersService } from "./customers.service";

describe("CustomersService", () => {
  let service: CustomersService;
  const repositoryMock = {
    canAccessBusiness: jest.fn(),
    canManageBusiness: jest.fn(),
    create: jest.fn(),
    listByBusiness: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    anonymize: jest.fn(),
  };
  const customer = {
    id: "11111111-1111-4111-8111-111111111111",
    organization_id: "22222222-2222-4222-8222-222222222222",
    business_id: "33333333-3333-4333-8333-333333333333",
    user_id: null,
    first_name: "Ada",
    last_name: "Lovelace",
    email: "ada@example.com",
    phone: "+34600111222",
    notes: null,
    points_balance: 0,
    created_at: new Date(),
    updated_at: new Date(),
    anonymized_at: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomersService,
        { provide: CustomersRepository, useValue: repositoryMock },
      ],
    }).compile();
    service = module.get(CustomersService);
  });

  afterEach(() =>
    Object.values(repositoryMock).forEach((mock) => mock.mockReset()),
  );

  it("creates a normalized guest customer for a managed business", async () => {
    repositoryMock.canManageBusiness.mockResolvedValue(true);
    repositoryMock.create.mockResolvedValue(customer);

    await expect(
      service.create(
        customer.business_id,
        {
          firstName: " Ada ",
          email: " ADA@EXAMPLE.COM ",
          phone: " +34600111222 ",
        },
        "actor-id",
      ),
    ).resolves.toBe(customer);

    expect(repositoryMock.create).toHaveBeenCalledWith(
      customer.business_id,
      expect.objectContaining({ firstName: "Ada", email: "ada@example.com" }),
    );
  });

  it("rejects access to a customer outside the business", async () => {
    repositoryMock.canAccessBusiness.mockResolvedValue(true);
    repositoryMock.findById.mockResolvedValue(null);

    await expect(
      service.get(customer.business_id, customer.id, "employee-id"),
    ).rejects.toMatchObject({ status: 404 });
  });

  it("anonymizes instead of physically deleting a customer", async () => {
    repositoryMock.canManageBusiness.mockResolvedValue(true);
    repositoryMock.findById.mockResolvedValue(customer);
    repositoryMock.anonymize.mockResolvedValue(true);

    await expect(
      service.remove(customer.business_id, customer.id, "actor-id"),
    ).resolves.toBeUndefined();
    expect(repositoryMock.anonymize).toHaveBeenCalledWith(customer);
  });
});
