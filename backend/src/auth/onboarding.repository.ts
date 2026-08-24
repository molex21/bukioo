import { Injectable } from "@nestjs/common";
import { DatabaseService } from "../database/database.service";

export interface CreateOnboardingInput {
  email: string;
  passwordHash: string;
  organizationName: string;
  organizationSlug: string;
  timezone: string;
}

export interface OnboardingRecord {
  user: {
    id: string;
    email: string;
    email_verified_at: Date | null;
    created_at: Date;
  };
  organization: {
    id: string;
    name: string;
    slug: string;
    timezone: string;
    created_at: Date;
  };
  business: {
    id: string;
    name: string;
    slug: string;
    timezone: string;
    created_at: Date;
  };
}

@Injectable()
export class OnboardingRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  async create(input: CreateOnboardingInput): Promise<OnboardingRecord> {
    return this.databaseService.transaction(async (client) => {
      const userResult = await client.query<OnboardingRecord["user"]>(
        `INSERT INTO users (email, password_hash, password_change_required)
        VALUES ($1, $2, TRUE)
        RETURNING id, email, email_verified_at, created_at`,
        [input.email, input.passwordHash],
      );
      const user = userResult.rows[0];

      const organizationResult = await client.query<
        OnboardingRecord["organization"]
      >(
        `INSERT INTO organizations (name, slug, email, timezone)
        VALUES ($1, $2, $3, $4)
        RETURNING id, name, slug, timezone, created_at`,
        [
          input.organizationName,
          input.organizationSlug,
          input.email,
          input.timezone,
        ],
      );
      const organization = organizationResult.rows[0];

      const businessResult = await client.query<OnboardingRecord["business"]>(
        `INSERT INTO businesses (organization_id, name, slug, email, timezone)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, name, slug, timezone, created_at`,
        [
          organization.id,
          organization.name,
          organization.slug,
          input.email,
          organization.timezone,
        ],
      );
      const business = businessResult.rows[0];

      await client.query(
        "INSERT INTO organization_settings (organization_id) VALUES ($1)",
        [organization.id],
      );
      await client.query(
        "INSERT INTO organization_locales (organization_id, locale, is_default) VALUES ($1, $2, TRUE)",
        [organization.id, "es"],
      );
      await client.query(
        "INSERT INTO organization_memberships (organization_id, user_id, role) VALUES ($1, $2, 'OWNER')",
        [organization.id, user.id],
      );
      await client.query(
        "INSERT INTO business_memberships (business_id, user_id, organization_id) VALUES ($1, $2, $3)",
        [business.id, user.id, organization.id],
      );

      return { user, organization, business };
    });
  }
}
