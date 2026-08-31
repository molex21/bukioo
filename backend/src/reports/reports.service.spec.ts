import { ReportsRepository } from "./reports.repository";
import { ReportsService } from "./reports.service";

describe("ReportsService", () => {
  const repository = {
    canManageBusiness: jest.fn(),
    getOverview: jest.fn(),
    listAppointments: jest.fn(),
    exportAppointments: jest.fn(),
    getEmployeeReports: jest.fn(),
  };
  const service = new ReportsService(
    repository as unknown as ReportsRepository,
  );
  const filters = {
    from: "2026-08-01T00:00:00.000Z",
    to: "2026-09-01T00:00:00.000Z",
    employeeId: "11111111-1111-4111-8111-111111111111",
  };

  beforeEach(() => {
    repository.canManageBusiness.mockReset();
    repository.getOverview.mockReset();
    repository.listAppointments.mockReset();
    repository.exportAppointments.mockReset();
    repository.getEmployeeReports.mockReset();
  });

  it("returns a business overview for an owner or admin", async () => {
    repository.canManageBusiness.mockResolvedValue(true);
    repository.getOverview.mockResolvedValue({
      total_appointments: "12",
      pending_appointments: "1",
      confirmed_appointments: "2",
      completed_appointments: "6",
      cancelled_appointments: "2",
      no_show_appointments: "1",
      membership_eligible_appointments: "5",
      unique_customers: "8",
      completed_revenue_amount: "142.50",
      completed_revenue_currency_code: "EUR",
    });

    await expect(
      service.getOverview("business-id", filters, "admin-id"),
    ).resolves.toEqual({
      range: { from: filters.from, to: filters.to },
      filters: { employeeId: filters.employeeId, serviceId: null },
      appointments: {
        total: 12,
        pending: 1,
        confirmed: 2,
        completed: 6,
        cancelled: 2,
        noShow: 1,
        countsTowardMembership: 5,
      },
      customers: { unique: 8 },
      completedRevenue: { amount: "142.50", currencyCode: "EUR" },
    });
    expect(repository.getOverview).toHaveBeenCalledWith("business-id", filters);
  });

  it("rejects a reversed date range", async () => {
    await expect(
      service.getOverview(
        "business-id",
        { from: "2026-09-01T00:00:00.000Z", to: "2026-08-01T00:00:00.000Z" },
        "admin-id",
      ),
    ).rejects.toMatchObject({ status: 400 });
    expect(repository.canManageBusiness).not.toHaveBeenCalled();
  });

  it("rejects an employee without report permission", async () => {
    repository.canManageBusiness.mockResolvedValue(false);

    await expect(
      service.getOverview("business-id", filters, "employee-id"),
    ).rejects.toMatchObject({ status: 403 });
    expect(repository.getOverview).not.toHaveBeenCalled();
  });

  it("returns filtered report appointments with pagination", async () => {
    repository.canManageBusiness.mockResolvedValue(true);
    repository.listAppointments.mockResolvedValue({
      total: "1",
      items: [
        {
          id: "appointment-id",
          reference_code: "APT-123",
          status: "COMPLETED",
          start_at: new Date("2026-08-03T09:00:00.000Z"),
          end_at: new Date("2026-08-03T10:00:00.000Z"),
          price_amount: "35.00",
          currency_code: "EUR",
          counts_toward_membership: true,
          customer_id: "customer-id",
          customer_first_name: "Ana",
          customer_last_name: "Perez",
          employee_id: "employee-id",
          employee_first_name: "Luis",
          employee_last_name: "Diaz",
          service_id: "service-id",
          service_name: "Corte",
        },
      ],
    });
    const appointmentFilters = { ...filters, status: "COMPLETED" as const };

    await expect(
      service.listAppointments("business-id", appointmentFilters, "admin-id"),
    ).resolves.toMatchObject({
      pagination: { limit: 50, offset: 0, total: 1 },
      items: [
        {
          referenceCode: "APT-123",
          price: { amount: "35.00", currencyCode: "EUR" },
          countsTowardMembership: true,
          customer: { id: "customer-id", firstName: "Ana" },
          employee: { id: "employee-id", firstName: "Luis" },
          service: { id: "service-id", name: "Corte" },
        },
      ],
    });
    expect(repository.listAppointments).toHaveBeenCalledWith(
      "business-id",
      appointmentFilters,
    );
  });

  it("exports report appointments as a safe CSV", async () => {
    repository.canManageBusiness.mockResolvedValue(true);
    repository.exportAppointments.mockResolvedValue([
      {
        id: "appointment-id",
        reference_code: "=APT-123",
        status: "COMPLETED",
        start_at: new Date("2026-08-03T09:00:00.000Z"),
        end_at: new Date("2026-08-03T10:00:00.000Z"),
        price_amount: "35.00",
        currency_code: "EUR",
        counts_toward_membership: true,
        customer_id: "customer-id",
        customer_first_name: 'Ana, "La Grande"',
        customer_last_name: "Perez",
        employee_id: "employee-id",
        employee_first_name: "Luis",
        employee_last_name: "Diaz",
        service_id: "service-id",
        service_name: "Corte\nPremium",
      },
    ]);
    const exportFilters = { ...filters, status: "COMPLETED" as const };

    await expect(
      service.exportAppointments("business-id", exportFilters, "admin-id"),
    ).resolves.toContain(`"'=APT-123"`);
    await expect(
      service.exportAppointments("business-id", exportFilters, "admin-id"),
    ).resolves.toContain(`"Ana, ""La Grande"" Perez"`);
    await expect(
      service.exportAppointments("business-id", exportFilters, "admin-id"),
    ).resolves.toContain(`"Corte\nPremium"`);
  });

  it("exports report appointments as an XLSX workbook", async () => {
    repository.canManageBusiness.mockResolvedValue(true);
    repository.exportAppointments.mockResolvedValue([]);

    await expect(
      service.exportAppointmentsXlsx("business-id", filters, "admin-id"),
    ).resolves.toBeInstanceOf(Buffer);
  });

  it("returns employee performance for a managed business", async () => {
    repository.canManageBusiness.mockResolvedValue(true);
    repository.getEmployeeReports.mockResolvedValue([
      {
        employee_id: "employee-id",
        employee_first_name: "Luis",
        employee_last_name: "Diaz",
        employee_is_active: false,
        total_appointments: "10",
        pending_appointments: "1",
        confirmed_appointments: "1",
        completed_appointments: "6",
        cancelled_appointments: "1",
        no_show_appointments: "1",
        membership_eligible_appointments: "5",
        unique_customers: "8",
        completed_revenue_amount: "180.00",
        completed_revenue_currency_code: "EUR",
      },
    ]);
    const employeeFilters = {
      from: filters.from,
      to: filters.to,
      serviceId: "22222222-2222-4222-8222-222222222222",
    };

    await expect(
      service.getEmployeeReports("business-id", employeeFilters, "admin-id"),
    ).resolves.toMatchObject({
      filters: { serviceId: employeeFilters.serviceId },
      items: [
        {
          employee: { id: "employee-id", isActive: false },
          appointments: { total: 10, completed: 6, noShow: 1 },
          customers: { unique: 8 },
          completedRevenue: { amount: "180.00", currencyCode: "EUR" },
        },
      ],
    });
    expect(repository.getEmployeeReports).toHaveBeenCalledWith(
      "business-id",
      employeeFilters,
    );
  });
});
