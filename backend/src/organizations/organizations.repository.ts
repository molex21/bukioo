import { Injectable } from "@nestjs/common";
import { DatabaseService } from "../database/database.service";

export interface OrganizationBrandingRecord {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  primary_color: string | null;
  updated_at: Date;
}

@Injectable()
export class OrganizationsRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  async updateBranding(
    organizationId: string,
    logoUrl: string | null | undefined,
  ): Promise<OrganizationBrandingRecord | null> {
    const result = await this.databaseService.query<OrganizationBrandingRecord>(
      `UPDATE organizations
      SET logo_url = $1,
          updated_at = NOW()
      WHERE id = $2
      RETURNING id, name, slug, logo_url, primary_color, updated_at`,
      [
        typeof logoUrl === "string" ? logoUrl.trim() : (logoUrl ?? null),
        organizationId,
      ],
    );

    return result.rows[0] ?? null;
  }
}
