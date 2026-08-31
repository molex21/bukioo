import { Injectable } from "@nestjs/common";
import { DatabaseService } from "../database/database.service";
import type { CreateLoyaltyLevelDto } from "./dto/create-loyalty-level.dto";
import type { UpdateLoyaltyLevelDto } from "./dto/update-loyalty-level.dto";
import type { UpdateLoyaltySettingsDto } from "./dto/update-loyalty-settings.dto";
import type { LoyaltyRuleSnapshot } from "./loyalty.types";

export interface LoyaltyLevelRecord {
  id: string;
  organization_id: string;
  business_id: string;
  name: string;
  minimum_points: number;
  sort_order: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface LoyaltySettingsRecord {
  business_id: string;
  organization_id: string;
  loyalty_enabled: boolean;
  default_earning_type: "NONE" | "FIXED" | "AMOUNT_MULTIPLIER" | "BOTH";
  default_fixed_points: number | null;
  default_points_per_currency_unit: string | null;
  points_expiration_months: number | null;
}

export interface LoyaltyAppointmentInput {
  id: string;
  organization_id: string;
  business_id: string;
  customer_id: string;
  status: string;
  counts_toward_membership: boolean;
  price_amount: string | null;
  completed_at: Date | null;
  loyalty_rule_snapshot: LoyaltyRuleSnapshot | null;
}

export interface CustomerLoyaltyRecord {
  customerId: string;
  pointsBalance: number;
  currentLevel: {
    id: string;
    name: string;
    minimumPoints: number;
  } | null;
  transactions: Array<{
    id: string;
    type: string;
    points: number;
    reason: string | null;
    appointmentId: string | null;
    expiresAt: Date | null;
    createdAt: Date;
    appointment: {
      id: string;
      referenceCode: string;
      status: string;
      startAt: Date;
      endAt: Date;
      employee: { id: string; firstName: string; lastName: string };
      service: { id: string; name: string };
      priceAmount: string | null;
      currencyCode: string;
    } | null;
  }>;
}

export interface LoyaltyExpirationNoticeRecord {
  id: string;
  email: string;
  business_name: string;
  points: number;
  expires_at: Date;
  timezone: string;
  days_before_expiration: 30 | 7;
}

export interface LoyaltyRedemptionRecord {
  id: string;
  points: number;
  reason: string;
  created_at: Date;
}

@Injectable()
export class LoyaltyRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  async canAccessBusiness(
    userId: string,
    businessId: string,
  ): Promise<boolean> {
    const result = await this.databaseService.query<{ exists: boolean }>(
      `SELECT EXISTS (
        SELECT 1
        FROM businesses
        INNER JOIN organization_memberships
          ON organization_memberships.organization_id = businesses.organization_id
        INNER JOIN users ON users.id = organization_memberships.user_id
        WHERE businesses.id = $1
          AND businesses.status = 'ACTIVE'
          AND organization_memberships.user_id = $2
          AND organization_memberships.status = 'ACTIVE'
          AND users.status = 'ACTIVE'
          AND (
            organization_memberships.role IN ('OWNER', 'ADMIN')
            OR EXISTS (
              SELECT 1
              FROM business_memberships
              WHERE business_memberships.business_id = businesses.id
                AND business_memberships.user_id = $2
                AND business_memberships.organization_id = businesses.organization_id
            )
          )
      ) AS exists`,
      [businessId, userId],
    );

    return result.rows[0]?.exists ?? false;
  }

  async canManageBusiness(
    userId: string,
    businessId: string,
  ): Promise<boolean> {
    const result = await this.databaseService.query<{ exists: boolean }>(
      `SELECT EXISTS (
        SELECT 1
        FROM businesses
        INNER JOIN organization_memberships
          ON organization_memberships.organization_id = businesses.organization_id
        INNER JOIN users ON users.id = organization_memberships.user_id
        WHERE businesses.id = $1
          AND businesses.status = 'ACTIVE'
          AND organization_memberships.user_id = $2
          AND organization_memberships.status = 'ACTIVE'
          AND organization_memberships.role IN ('OWNER', 'ADMIN')
          AND users.status = 'ACTIVE'
      ) AS exists`,
      [businessId, userId],
    );

    return result.rows[0]?.exists ?? false;
  }

  async create(
    businessId: string,
    dto: CreateLoyaltyLevelDto,
  ): Promise<LoyaltyLevelRecord> {
    const result = await this.databaseService.query<LoyaltyLevelRecord>(
      `INSERT INTO loyalty_levels
        (organization_id, business_id, name, minimum_points, sort_order)
      SELECT organization_id, id, $2, $3, $4
      FROM businesses
      WHERE id = $1
      RETURNING id, organization_id, business_id, name, minimum_points,
        sort_order, is_active, created_at, updated_at`,
      [businessId, dto.name, dto.minimumPoints, dto.sortOrder ?? 0],
    );

    return result.rows[0];
  }

  async findSettingsByBusiness(
    businessId: string,
  ): Promise<LoyaltySettingsRecord | null> {
    const result = await this.databaseService.query<LoyaltySettingsRecord>(
      `SELECT business_id, organization_id, loyalty_enabled, default_earning_type,
        default_fixed_points, default_points_per_currency_unit,
        points_expiration_months
      FROM business_loyalty_settings
      WHERE business_id = $1
      LIMIT 1`,
      [businessId],
    );

    return result.rows[0] ?? null;
  }

  async updateSettings(
    settings: LoyaltySettingsRecord,
    dto: UpdateLoyaltySettingsDto,
  ): Promise<LoyaltySettingsRecord> {
    const result = await this.databaseService.query<LoyaltySettingsRecord>(
      `UPDATE business_loyalty_settings
      SET loyalty_enabled = COALESCE($1, loyalty_enabled),
          default_earning_type = COALESCE($2, default_earning_type),
          default_fixed_points = COALESCE($3, default_fixed_points),
          default_points_per_currency_unit = COALESCE(
            $4,
            default_points_per_currency_unit
          ),
          points_expiration_months = CASE
            WHEN $6 THEN $5
            ELSE points_expiration_months
          END
      WHERE business_id = $7 AND organization_id = $8
      RETURNING business_id, organization_id, loyalty_enabled, default_earning_type,
        default_fixed_points, default_points_per_currency_unit,
        points_expiration_months`,
      [
        dto.loyaltyEnabled,
        dto.defaultLoyaltyEarningType,
        dto.defaultLoyaltyFixedPoints,
        dto.defaultLoyaltyPointsPerCurrencyUnit,
        dto.pointsExpirationMonths,
        Object.prototype.hasOwnProperty.call(dto, "pointsExpirationMonths"),
        settings.business_id,
        settings.organization_id,
      ],
    );

    return result.rows[0];
  }

  async listByBusiness(businessId: string): Promise<LoyaltyLevelRecord[]> {
    const result = await this.databaseService.query<LoyaltyLevelRecord>(
      `SELECT id, organization_id, business_id, name, minimum_points,
        sort_order, is_active, created_at, updated_at
      FROM loyalty_levels
      WHERE business_id = $1
      ORDER BY minimum_points ASC, sort_order ASC, name ASC`,
      [businessId],
    );

    return result.rows;
  }

  async findById(
    businessId: string,
    levelId: string,
  ): Promise<LoyaltyLevelRecord | null> {
    const result = await this.databaseService.query<LoyaltyLevelRecord>(
      `SELECT id, organization_id, business_id, name, minimum_points,
        sort_order, is_active, created_at, updated_at
      FROM loyalty_levels
      WHERE id = $1 AND business_id = $2
      LIMIT 1`,
      [levelId, businessId],
    );

    return result.rows[0] ?? null;
  }

  async update(
    level: LoyaltyLevelRecord,
    dto: UpdateLoyaltyLevelDto,
  ): Promise<LoyaltyLevelRecord> {
    const result = await this.databaseService.query<LoyaltyLevelRecord>(
      `UPDATE loyalty_levels
      SET name = COALESCE($1, name),
          minimum_points = COALESCE($2, minimum_points),
          sort_order = COALESCE($3, sort_order),
          is_active = COALESCE($4, is_active),
          updated_at = NOW()
      WHERE id = $5 AND business_id = $6 AND organization_id = $7
      RETURNING id, organization_id, business_id, name, minimum_points,
        sort_order, is_active, created_at, updated_at`,
      [
        dto.name,
        dto.minimumPoints,
        dto.sortOrder,
        dto.isActive,
        level.id,
        level.business_id,
        level.organization_id,
      ],
    );

    return result.rows[0];
  }

  async countCustomers(level: LoyaltyLevelRecord): Promise<number> {
    const result = await this.databaseService.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count
      FROM customers
      WHERE loyalty_level_id = $1
        AND business_id = $2
        AND organization_id = $3
        AND anonymized_at IS NULL`,
      [level.id, level.business_id, level.organization_id],
    );

    return Number(result.rows[0]?.count ?? 0);
  }

  async remove(level: LoyaltyLevelRecord): Promise<boolean> {
    const result = await this.databaseService.query(
      `DELETE FROM loyalty_levels
      WHERE id = $1 AND business_id = $2 AND organization_id = $3`,
      [level.id, level.business_id, level.organization_id],
    );

    return (result.rowCount ?? 0) === 1;
  }

  async reconcileAppointment(
    appointment: LoyaltyAppointmentInput,
    actorUserId: string | null,
  ): Promise<void> {
    await this.databaseService.transaction(async (client) => {
      const settingsResult = await client.query<
        LoyaltySettingsRecord & { timezone: string }
      >(
        `SELECT settings.business_id, settings.organization_id,
          settings.loyalty_enabled, settings.default_earning_type,
          settings.default_fixed_points,
          settings.default_points_per_currency_unit,
          settings.points_expiration_months, businesses.timezone
        FROM business_loyalty_settings AS settings
        INNER JOIN businesses ON businesses.id = settings.business_id
          AND businesses.organization_id = settings.organization_id
        WHERE settings.business_id = $1
          AND settings.organization_id = $2
        FOR UPDATE OF settings`,
        [appointment.business_id, appointment.organization_id],
      );
      const settings = settingsResult.rows[0];
      if (!settings) return;

      const awardResult = await client.query<{
        is_active: boolean;
        is_expired: boolean;
        points_awarded: number;
      }>(
        `SELECT is_active, is_expired, points_awarded
        FROM appointment_loyalty_awards
        WHERE appointment_id = $1
        FOR UPDATE`,
        [appointment.id],
      );
      const award = awardResult.rows[0];
      const points = this.calculatePoints(
        appointment.loyalty_rule_snapshot,
        appointment.price_amount,
      );
      const qualifies =
        settings.loyalty_enabled &&
        appointment.status === "COMPLETED" &&
        appointment.counts_toward_membership &&
        points > 0;

      if (qualifies && !award?.is_active && !award?.is_expired) {
        const transaction = await client.query<{ id: string }>(
          `INSERT INTO loyalty_transactions
            (organization_id, business_id, customer_id, appointment_id, points,
             type, reason, created_by_user_id, expires_at)
          VALUES ($1, $2, $3, $4, $5, 'APPOINTMENT_EARNED', $6, $7,
            CASE WHEN $9::integer IS NULL THEN NULL ELSE
              (date_trunc('day', $8::timestamptz AT TIME ZONE $10)
                + make_interval(months => $9::integer)
                + interval '1 day - 1 millisecond') AT TIME ZONE $10
            END)
          RETURNING id`,
          [
            appointment.organization_id,
            appointment.business_id,
            appointment.customer_id,
            appointment.id,
            points,
            "Puntos por cita completada",
            actorUserId,
            appointment.completed_at ?? new Date(),
            settings.points_expiration_months,
            settings.timezone,
          ],
        );

        if (award) {
          await client.query(
            `UPDATE appointment_loyalty_awards
            SET points_awarded = $1, is_active = TRUE, is_expired = FALSE,
                last_award_transaction_id = $2
            WHERE appointment_id = $3`,
            [points, transaction.rows[0].id, appointment.id],
          );
        } else {
          await client.query(
            `INSERT INTO appointment_loyalty_awards
              (appointment_id, organization_id, business_id, customer_id,
               points_awarded, last_award_transaction_id)
            VALUES ($1, $2, $3, $4, $5, $6)`,
            [
              appointment.id,
              appointment.organization_id,
              appointment.business_id,
              appointment.customer_id,
              points,
              transaction.rows[0].id,
            ],
          );
        }
        await this.updateCustomerBalance(client, appointment, points);
      } else if (!qualifies && award?.is_active) {
        const transaction = await client.query<{ id: string }>(
          `INSERT INTO loyalty_transactions
            (organization_id, business_id, customer_id, appointment_id, points,
             type, reason, created_by_user_id)
          VALUES ($1, $2, $3, $4, $5, 'APPOINTMENT_REVERSED', $6, $7)
          RETURNING id`,
          [
            appointment.organization_id,
            appointment.business_id,
            appointment.customer_id,
            appointment.id,
            -award.points_awarded,
            "Reversion de puntos de cita",
            actorUserId,
          ],
        );
        await client.query(
          `UPDATE appointment_loyalty_awards
          SET is_active = FALSE, last_reversal_transaction_id = $1
          WHERE appointment_id = $2`,
          [transaction.rows[0].id, appointment.id],
        );
        await this.updateCustomerBalance(
          client,
          appointment,
          -award.points_awarded,
        );
      }
    });
  }

  async getCustomerLoyalty(
    businessId: string,
    customerId: string,
  ): Promise<CustomerLoyaltyRecord | null> {
    const customerResult = await this.databaseService.query<{
      id: string;
      points_balance: number;
      loyalty_level_id: string | null;
      level_name: string | null;
      minimum_points: number | null;
    }>(
      `SELECT customers.id, customers.points_balance, customers.loyalty_level_id,
        loyalty_levels.name AS level_name, loyalty_levels.minimum_points
      FROM customers
      LEFT JOIN loyalty_levels ON loyalty_levels.id = customers.loyalty_level_id
        AND loyalty_levels.business_id = customers.business_id
      WHERE customers.id = $1
        AND customers.business_id = $2
        AND customers.anonymized_at IS NULL
      LIMIT 1`,
      [customerId, businessId],
    );
    const customer = customerResult.rows[0];
    if (!customer) return null;

    const transactions = await this.databaseService.query<{
      id: string;
      type: string;
      points: number;
      reason: string | null;
      appointment_id: string | null;
      expires_at: Date | null;
      created_at: Date;
      reference_code: string | null;
      appointment_status: string | null;
      start_at: Date | null;
      end_at: Date | null;
      employee_id: string | null;
      employee_first_name: string | null;
      employee_last_name: string | null;
      service_id: string | null;
      service_name: string | null;
      price_amount: string | null;
      currency_code: string | null;
    }>(
      `SELECT loyalty_transactions.id, loyalty_transactions.type,
        loyalty_transactions.points, loyalty_transactions.reason,
        loyalty_transactions.appointment_id, loyalty_transactions.expires_at,
        loyalty_transactions.created_at, appointments.reference_code,
        appointments.status AS appointment_status, appointments.start_at,
        appointments.end_at, employees.id AS employee_id,
        employees.first_name AS employee_first_name,
        employees.last_name AS employee_last_name, services.id AS service_id,
        services.name AS service_name, appointments.price_amount,
        appointments.currency_code
      FROM loyalty_transactions
      LEFT JOIN appointments ON appointments.id = loyalty_transactions.appointment_id
        AND appointments.business_id = loyalty_transactions.business_id
      LEFT JOIN employees ON employees.id = appointments.employee_id
        AND employees.business_id = appointments.business_id
      LEFT JOIN services ON services.id = appointments.service_id
        AND services.business_id = appointments.business_id
      WHERE loyalty_transactions.customer_id = $1
        AND loyalty_transactions.business_id = $2
      ORDER BY loyalty_transactions.created_at DESC, loyalty_transactions.id DESC`,
      [customerId, businessId],
    );

    return {
      customerId: customer.id,
      pointsBalance: customer.points_balance,
      currentLevel: customer.loyalty_level_id
        ? {
            id: customer.loyalty_level_id,
            name: customer.level_name!,
            minimumPoints: customer.minimum_points!,
          }
        : null,
      transactions: transactions.rows.map((transaction) => ({
        id: transaction.id,
        type: transaction.type,
        points: transaction.points,
        reason: transaction.reason,
        appointmentId: transaction.appointment_id,
        expiresAt: transaction.expires_at,
        createdAt: transaction.created_at,
        appointment: transaction.reference_code
          ? {
              id: transaction.appointment_id!,
              referenceCode: transaction.reference_code,
              status: transaction.appointment_status!,
              startAt: transaction.start_at!,
              endAt: transaction.end_at!,
              employee: {
                id: transaction.employee_id!,
                firstName: transaction.employee_first_name!,
                lastName: transaction.employee_last_name!,
              },
              service: {
                id: transaction.service_id!,
                name: transaction.service_name!,
              },
              priceAmount: transaction.price_amount,
              currencyCode: transaction.currency_code!,
            }
          : null,
      })),
    };
  }

  async adjustCustomerPoints(input: {
    businessId: string;
    customerId: string;
    points: number;
    reason: string;
    actorUserId: string;
  }): Promise<void> {
    await this.databaseService.transaction(async (client) => {
      const customer = await client.query<{
        id: string;
        organization_id: string;
        business_id: string;
        points_balance: number;
      }>(
        `SELECT id, organization_id, business_id, points_balance
        FROM customers
        WHERE id = $1 AND business_id = $2 AND anonymized_at IS NULL
        FOR UPDATE`,
        [input.customerId, input.businessId],
      );
      const record = customer.rows[0];
      if (!record) throw new Error("LOYALTY_CUSTOMER_NOT_FOUND");
      if (record.points_balance + input.points < 0) {
        throw new Error("LOYALTY_NEGATIVE_BALANCE");
      }
      await client.query(
        `INSERT INTO loyalty_transactions
          (organization_id, business_id, customer_id, points, type, reason,
           created_by_user_id)
        VALUES ($1, $2, $3, $4, 'ADJUSTMENT', $5, $6)`,
        [
          record.organization_id,
          record.business_id,
          record.id,
          input.points,
          input.reason,
          input.actorUserId,
        ],
      );
      await this.updateCustomerBalance(client, record, input.points);
    });
  }

  async redeemCustomerPoints(input: {
    businessId: string;
    customerId: string;
    points: number;
    reason: string;
    actorUserId: string;
  }): Promise<LoyaltyRedemptionRecord> {
    return this.databaseService.transaction(async (client) => {
      const customerResult = await client.query<{
        id: string;
        organization_id: string;
        business_id: string;
        points_balance: number;
      }>(
        `SELECT id, organization_id, business_id, points_balance
        FROM customers
        WHERE id = $1 AND business_id = $2 AND anonymized_at IS NULL
        FOR UPDATE`,
        [input.customerId, input.businessId],
      );
      const customer = customerResult.rows[0];
      if (!customer) throw new Error("LOYALTY_CUSTOMER_NOT_FOUND");
      if (customer.points_balance < input.points) {
        throw new Error("LOYALTY_INSUFFICIENT_POINTS");
      }

      const lotsResult = await client.query<{
        id: string;
        points: number;
        allocated_points: string;
      }>(
        `SELECT source.id, source.points,
          COALESCE((
            SELECT SUM(allocations.points)
            FROM loyalty_redemption_allocations AS allocations
            WHERE allocations.source_transaction_id = source.id
          ), 0)::text AS allocated_points
        FROM loyalty_transactions AS source
        LEFT JOIN appointment_loyalty_awards AS awards
          ON awards.last_award_transaction_id = source.id
        WHERE source.customer_id = $1
          AND source.business_id = $2
          AND source.points > 0
          AND (
            source.type = 'ADJUSTMENT'
            OR (
              source.type = 'APPOINTMENT_EARNED'
              AND awards.is_active = TRUE
              AND awards.is_expired = FALSE
            )
          )
        ORDER BY source.expires_at ASC NULLS LAST, source.created_at ASC, source.id ASC
        FOR UPDATE OF source`,
        [customer.id, customer.business_id],
      );

      let remaining = input.points;
      const allocations = lotsResult.rows.flatMap((lot) => {
        const available = lot.points - Number(lot.allocated_points);
        if (available <= 0 || remaining === 0) return [];
        const points = Math.min(available, remaining);
        remaining -= points;
        return [{ sourceTransactionId: lot.id, points }];
      });
      if (remaining > 0) {
        throw new Error("LOYALTY_INSUFFICIENT_REDEEMABLE_POINTS");
      }

      const redemptionResult = await client.query<LoyaltyRedemptionRecord>(
        `INSERT INTO loyalty_transactions
          (organization_id, business_id, customer_id, points, type, reason,
           created_by_user_id)
        VALUES ($1, $2, $3, $4, 'REDEMPTION', $5, $6)
        RETURNING id, points, reason, created_at`,
        [
          customer.organization_id,
          customer.business_id,
          customer.id,
          -input.points,
          input.reason,
          input.actorUserId,
        ],
      );
      const redemption = redemptionResult.rows[0];
      for (const allocation of allocations) {
        await client.query(
          `INSERT INTO loyalty_redemption_allocations
            (organization_id, business_id, customer_id, redemption_transaction_id,
             source_transaction_id, points)
          VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            customer.organization_id,
            customer.business_id,
            customer.id,
            redemption.id,
            allocation.sourceTransactionId,
            allocation.points,
          ],
        );
      }
      await this.updateCustomerBalance(client, customer, -input.points);
      return redemption;
    });
  }

  async expireDuePoints(limit = 100): Promise<number> {
    const candidates = await this.databaseService.query<{ id: string }>(
      `SELECT loyalty_transactions.id
      FROM loyalty_transactions
      INNER JOIN appointment_loyalty_awards
        ON appointment_loyalty_awards.last_award_transaction_id = loyalty_transactions.id
      WHERE loyalty_transactions.type = 'APPOINTMENT_EARNED'
        AND loyalty_transactions.expires_at <= NOW()
        AND appointment_loyalty_awards.is_active = TRUE
        AND appointment_loyalty_awards.is_expired = FALSE
      ORDER BY loyalty_transactions.expires_at ASC
      LIMIT $1`,
      [limit],
    );

    let expired = 0;
    for (const candidate of candidates.rows) {
      if (await this.expireTransaction(candidate.id)) expired += 1;
    }
    return expired;
  }

  async prepareExpirationNotices(
    daysBeforeExpiration: 30 | 7,
  ): Promise<LoyaltyExpirationNoticeRecord[]> {
    const notificationType = `LOYALTY_POINTS_EXPIRING_${daysBeforeExpiration}_DAYS`;
    const result =
      await this.databaseService.query<LoyaltyExpirationNoticeRecord>(
        `WITH candidates AS (
        SELECT loyalty_transactions.id AS loyalty_transaction_id,
          loyalty_transactions.organization_id, loyalty_transactions.customer_id,
          customers.email, businesses.name AS business_name,
          (loyalty_transactions.points - COALESCE((
            SELECT SUM(loyalty_redemption_allocations.points)
            FROM loyalty_redemption_allocations
            WHERE loyalty_redemption_allocations.source_transaction_id = loyalty_transactions.id
          ), 0))::integer AS points, loyalty_transactions.expires_at,
          businesses.timezone
        FROM loyalty_transactions
        INNER JOIN appointment_loyalty_awards
          ON appointment_loyalty_awards.last_award_transaction_id = loyalty_transactions.id
        INNER JOIN customers ON customers.id = loyalty_transactions.customer_id
          AND customers.business_id = loyalty_transactions.business_id
        INNER JOIN businesses ON businesses.id = loyalty_transactions.business_id
          AND businesses.organization_id = loyalty_transactions.organization_id
        WHERE loyalty_transactions.type = 'APPOINTMENT_EARNED'
          AND appointment_loyalty_awards.is_active = TRUE
          AND appointment_loyalty_awards.is_expired = FALSE
          AND loyalty_transactions.points > COALESCE((
            SELECT SUM(loyalty_redemption_allocations.points)
            FROM loyalty_redemption_allocations
            WHERE loyalty_redemption_allocations.source_transaction_id = loyalty_transactions.id
          ), 0)
          AND (loyalty_transactions.expires_at AT TIME ZONE businesses.timezone)::date
            = ((NOW() AT TIME ZONE businesses.timezone)::date + $1::integer)
      ), prepared AS (
        INSERT INTO notifications (
          organization_id, customer_id, channel, type, destination, status,
          scheduled_at, loyalty_transaction_id
        )
        SELECT organization_id, customer_id, 'EMAIL', $2, email, 'PENDING', NOW(),
          loyalty_transaction_id
        FROM candidates
        ON CONFLICT (loyalty_transaction_id, type)
          WHERE type IN (
            'LOYALTY_POINTS_EXPIRING_30_DAYS',
            'LOYALTY_POINTS_EXPIRING_7_DAYS'
          )
        DO UPDATE SET status = 'PENDING', error_message = NULL,
          scheduled_at = NOW(), updated_at = NOW()
          WHERE notifications.status = 'FAILED'
        RETURNING id, loyalty_transaction_id, destination
      )
      SELECT prepared.id, prepared.destination AS email, candidates.business_name,
        candidates.points, candidates.expires_at, candidates.timezone,
        $1::integer AS days_before_expiration
      FROM prepared
      INNER JOIN candidates
        ON candidates.loyalty_transaction_id = prepared.loyalty_transaction_id`,
        [daysBeforeExpiration, notificationType],
      );
    return result.rows;
  }

  async markExpirationNoticeSent(notificationId: string): Promise<void> {
    await this.databaseService.query(
      `UPDATE notifications
      SET status = 'SENT', sent_at = NOW(), error_message = NULL
      WHERE id = $1`,
      [notificationId],
    );
  }

  async markExpirationNoticeFailed(
    notificationId: string,
    errorMessage: string,
  ): Promise<void> {
    await this.databaseService.query(
      `UPDATE notifications
      SET status = 'FAILED', error_message = $2
      WHERE id = $1`,
      [notificationId, errorMessage.slice(0, 1_000)],
    );
  }

  private async expireTransaction(transactionId: string): Promise<boolean> {
    return this.databaseService.transaction(async (client) => {
      const earnedResult = await client.query<{
        id: string;
        organization_id: string;
        business_id: string;
        customer_id: string;
        appointment_id: string;
        points: number;
      }>(
        `SELECT id, organization_id, business_id, customer_id, appointment_id, points
        FROM loyalty_transactions
        WHERE id = $1
          AND type = 'APPOINTMENT_EARNED'
          AND expires_at <= NOW()
        FOR UPDATE`,
        [transactionId],
      );
      const earned = earnedResult.rows[0];
      if (!earned) return false;

      const awardResult = await client.query<{ appointment_id: string }>(
        `SELECT appointment_id
        FROM appointment_loyalty_awards
        WHERE appointment_id = $1
          AND last_award_transaction_id = $2
          AND is_active = TRUE
          AND is_expired = FALSE
        FOR UPDATE`,
        [earned.appointment_id, earned.id],
      );
      if (!awardResult.rows[0]) return false;

      const allocatedResult = await client.query<{ points: string }>(
        `SELECT COALESCE(SUM(points), 0)::text AS points
        FROM loyalty_redemption_allocations
        WHERE source_transaction_id = $1`,
        [earned.id],
      );
      const remainingPoints =
        earned.points - Number(allocatedResult.rows[0]?.points ?? 0);

      if (remainingPoints <= 0) {
        await client.query(
          `UPDATE appointment_loyalty_awards
          SET is_active = FALSE, is_expired = TRUE
          WHERE appointment_id = $1`,
          [earned.appointment_id],
        );
        return true;
      }

      const expiration = await client.query<{ id: string }>(
        `INSERT INTO loyalty_transactions
          (organization_id, business_id, customer_id, appointment_id, points,
           type, reason, source_transaction_id)
        VALUES ($1, $2, $3, $4, $5, 'EXPIRY', $6, $7)
        ON CONFLICT (source_transaction_id) WHERE type = 'EXPIRY' DO NOTHING
        RETURNING id`,
        [
          earned.organization_id,
          earned.business_id,
          earned.customer_id,
          earned.appointment_id,
          -remainingPoints,
          "Caducidad de puntos",
          earned.id,
        ],
      );
      if (!expiration.rows[0]) return false;

      await client.query(
        `UPDATE appointment_loyalty_awards
        SET is_active = FALSE, is_expired = TRUE
        WHERE appointment_id = $1`,
        [earned.appointment_id],
      );
      await this.updateCustomerBalance(client, earned, -earned.points);
      return true;
    });
  }

  private calculatePoints(
    rule: LoyaltyRuleSnapshot | null,
    priceAmount: string | null,
  ): number {
    if (!rule || rule.type === "NONE") return 0;
    const price = Number(priceAmount ?? 0);
    const fixed =
      rule.type === "FIXED" || rule.type === "BOTH"
        ? (rule.fixedPoints ?? 0)
        : 0;
    const amount =
      rule.type === "AMOUNT_MULTIPLIER" || rule.type === "BOTH"
        ? Math.floor(price * (rule.pointsPerCurrencyUnit ?? 0))
        : 0;
    return fixed + amount;
  }

  private async updateCustomerBalance(
    client: { query: DatabaseService["query"] },
    customer:
      | Pick<
          LoyaltyAppointmentInput,
          "customer_id" | "business_id" | "organization_id"
        >
      | { id: string; business_id: string; organization_id: string },
    delta: number,
  ): Promise<void> {
    const customerId =
      "customer_id" in customer ? customer.customer_id : customer.id;
    const updated = await client.query<{ points_balance: number }>(
      `UPDATE customers
      SET points_balance = points_balance + $1,
          loyalty_level_id = (
            SELECT id
            FROM loyalty_levels
            WHERE business_id = $3
              AND organization_id = $4
              AND is_active = TRUE
              AND minimum_points <= customers.points_balance + $1
            ORDER BY minimum_points DESC, sort_order ASC
            LIMIT 1
          ),
          updated_at = NOW()
      WHERE id = $2 AND business_id = $3 AND organization_id = $4
      RETURNING points_balance`,
      [delta, customerId, customer.business_id, customer.organization_id],
    );
    if (!updated.rows[0]) throw new Error("LOYALTY_CUSTOMER_NOT_FOUND");
  }
}
