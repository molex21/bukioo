import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { PoolClient } from "pg";
import { SchedulingRepository } from "./scheduling.repository";
import { date, integer, pattern, spans, uuid } from "./scheduling-domain";
import type { TemplateDto } from "./scheduling.dto";

const blockTypes = [
  "BREAK",
  "MEETING",
  "VACATION",
  "ABSENCE",
  "PERSONAL",
  "HOLIDAY",
  "MANUAL_BLOCK",
  "OTHER",
  "PERMISSION",
];
type Template = { id: string; name: string; pattern: unknown; version: number };

@Injectable()
export class SchedulingService {
  constructor(private readonly repository: SchedulingRepository) {}
  private async audit(
    client: PoolClient,
    org: string,
    biz: string,
    actor: string,
    entity: string,
    change: Record<string, unknown>,
    oldValues?: Record<string, unknown>,
  ) {
    await client.query(
      `INSERT INTO audit_logs(organization_id,business_id,actor_user_id,action,entity_type,entity_id,new_values,old_values)
      VALUES($1,$2,$3,'SCHEDULE_CHANGED','SCHEDULE',$4,$5::jsonb,$6::jsonb)`,
      [
        org,
        biz,
        actor,
        entity,
        JSON.stringify(change),
        oldValues ? JSON.stringify(oldValues) : null,
      ],
    );
  }
  async templates(biz: string, actor: string) {
    return this.repository.database.transaction(async (client) => {
      const context = await this.repository.authorize(client, biz, actor);
      return (
        await client.query<Template>(
          "SELECT id,name,pattern,version FROM employee_shift_templates WHERE business_id=$1 AND organization_id=$2 AND archived_at IS NULL ORDER BY name",
          [biz, context.organization_id],
        )
      ).rows;
    });
  }
  async saveTemplate(
    biz: string,
    actor: string,
    dto: TemplateDto,
    id?: string,
  ) {
    const normalized = pattern(dto.pattern),
      name = dto.name.trim();
    if (!name)
      throw new BadRequestException("Indica el nombre de la plantilla.");
    return this.repository.database.transaction(async (client) => {
      const { organization_id: org } = await this.repository.authorize(
        client,
        biz,
        actor,
      );
      const result = id
        ? await client.query<Template>(
            `UPDATE employee_shift_templates SET name=$1,pattern=$2,version=version+1,updated_at=now()
        WHERE id=$3 AND business_id=$4 AND organization_id=$5 AND version=$6 AND archived_at IS NULL RETURNING id,name,pattern,version`,
            [
              name,
              JSON.stringify(normalized),
              id,
              biz,
              org,
              integer(dto.expectedVersion, 1, 2147483646),
            ],
          )
        : await client.query<Template>(
            "INSERT INTO employee_shift_templates(name,pattern,business_id,organization_id) VALUES($1,$2,$3,$4) RETURNING id,name,pattern,version",
            [name, JSON.stringify(normalized), biz, org],
          );
      if (!result.rows[0])
        throw new ConflictException(
          "La plantilla cambió o ya no está disponible. Actualiza antes de guardar.",
        );
      await this.audit(client, org, biz, actor, result.rows[0].id, {
        operation: id ? "templateUpdated" : "templateCreated",
        name,
      });
      return result.rows[0];
    });
  }
  async archiveTemplate(
    biz: string,
    actor: string,
    id: string,
    version: unknown,
  ) {
    return this.repository.database.transaction(async (client) => {
      const { organization_id: org } = await this.repository.authorize(
        client,
        biz,
        actor,
      );
      const result = await client.query(
        "UPDATE employee_shift_templates SET archived_at=now(),version=version+1 WHERE id=$1 AND business_id=$2 AND organization_id=$3 AND version=$4 AND archived_at IS NULL RETURNING id",
        [id, biz, org, integer(version, 1, 2147483646)],
      );
      if (!result.rowCount)
        throw new ConflictException(
          "La plantilla cambió o ya no está disponible.",
        );
      await this.audit(client, org, biz, actor, id, {
        operation: "templateArchived",
      });
      return { archived: true };
    });
  }
  async quadrant(
    biz: string,
    actor: string,
    inputFrom: string,
    inputTo: string,
    employeeId?: string,
    inputOffset?: string,
  ) {
    const from = date(inputFrom),
      to = date(inputTo);
    if (from > to || (Date.parse(to) - Date.parse(from)) / 86400000 > 41)
      throw new BadRequestException("Consulta como máximo seis semanas.");
    const offset =
      inputOffset === undefined ? 0 : integer(Number(inputOffset), 0, 100000);
    if (employeeId) uuid(employeeId);
    return this.repository.database.transaction(async (client) => {
      const { organization_id: org, timezone } =
        await this.repository.authorize(client, biz, actor);
      const employees = (
        await client.query<{
          id: string;
          first_name: string;
          last_name: string;
          color: string | null;
          version: number;
          total: string;
        }>(
          `SELECT e.id,e.first_name,e.last_name,e.color,coalesce(v.version,0) AS version,count(*) OVER()::text AS total
        FROM employees e LEFT JOIN employee_schedule_versions v ON v.employee_id=e.id AND v.organization_id=e.organization_id AND v.business_id=e.business_id
        WHERE e.business_id=$1 AND e.organization_id=$2 AND e.is_active=TRUE AND e.archived_at IS NULL AND ($3::uuid IS NULL OR e.id=$3)
        ORDER BY e.first_name,e.last_name,e.id LIMIT 10 OFFSET $4`,
          [biz, org, employeeId ?? null, offset],
        )
      ).rows;
      const ids = employees.map((e) => e.id);
      const days = (
        await client.query(
          `SELECT e.id AS "employeeId",d::date::text AS date, s.origin,s.ambiguous,
        p.spans AS draft,
        (SELECT coalesce(jsonb_agg(jsonb_build_object('startAt',lower(r),'endAt',upper(r)) ORDER BY lower(r)),'[]') FROM unnest(s.presence) r) AS presence,
        (SELECT coalesce(jsonb_agg(jsonb_build_object('startAt',lower(r),'endAt',upper(r)) ORDER BY lower(r)),'[]') FROM unnest(s.attention) r) AS attention,
        (SELECT coalesce(sum(extract(epoch FROM upper(r)-lower(r)))/60,0) FROM unnest(s.presence) r) AS "presenceMinutes",
        (SELECT coalesce(sum(extract(epoch FROM upper(r)-lower(r)))/60,0) FROM unnest(s.attention) r) AS "attentionMinutes",
        (SELECT coalesce(jsonb_agg(jsonb_build_object('id',b.id,'employeeId',b.employee_id,'type',b.type,'startAt',b.start_at,'endAt',b.end_at,'reason',b.reason,'version',b.version)),'[]')
          FROM calendar_blocks b WHERE b.organization_id=$1 AND b.business_id=$2 AND (b.employee_id=e.id OR b.employee_id IS NULL)
          AND b.start_at<((d::date+1)::timestamp AT TIME ZONE $6) AND b.end_at>(d::timestamp AT TIME ZONE $6)) AS blocks
        FROM employees e CROSS JOIN generate_series($4::date::timestamp,$5::date::timestamp,interval '1 day') d
        CROSS JOIN LATERAL scheduling_day($1,$2,e.id,d::date) s CROSS JOIN LATERAL scheduling_pattern($1,$2,e.id,d::date) p
        WHERE e.id=ANY($3::uuid[]) AND e.business_id=$2 AND e.organization_id=$1 ORDER BY e.id,d`,
          [org, biz, ids, from, to, timezone],
        )
      ).rows;
      return {
        timezone,
        from,
        to,
        employees,
        days,
        total: Number(employees[0]?.total ?? 0),
        offset,
        limit: 10,
      };
    });
  }

  async change(
    biz: string,
    actor: string,
    command: Record<string, unknown>,
    preview: boolean,
  ) {
    return this.repository.database.transaction(async (client) => {
      const { organization_id: org, timezone } =
        await this.repository.authorize(client, biz, actor);
      if (
        !Array.isArray(command.employeeIds) ||
        command.employeeIds.length < 1 ||
        command.employeeIds.length > 50
      )
        throw new BadRequestException("Selecciona entre uno y 50 empleados.");
      const ids = [...new Set(command.employeeIds.map(uuid))].sort();
      if (command.type !== "assignment" && ids.length !== 1)
        throw new BadRequestException("Esta operación afecta a un empleado.");
      const versions = await this.repository.lock(client, biz, org, ids);
      const expected = command.expectedVersions;
      if (!expected || typeof expected !== "object" || Array.isArray(expected))
        throw new BadRequestException(
          "Actualiza el cuadrante antes de guardar.",
        );
      for (const item of versions)
        if (
          (expected as Record<string, unknown>)[item.employee_id] !==
          item.version
        )
          throw new ConflictException(
            "El cuadrante cambió. Actualiza y vuelve a revisar tu selección.",
          );
      const today = (
        await client.query<{ today: string }>(
          "SELECT (now() AT TIME ZONE $1)::date::text AS today",
          [timezone],
        )
      ).rows[0].today;
      await client.query("SAVEPOINT scheduling_preview");
      try {
        const previous = new Map<string, unknown>();
        for (const id of ids) {
          const result = await client.query(
            "SELECT spans,origin FROM scheduling_pattern($1,$2,$3,$4::date)",
            [org, biz, id, date(command.date ?? command.from)],
          );
          previous.set(id, result.rows[0]);
        }
        await this.apply(
          client,
          org,
          biz,
          command,
          ids,
          today,
          timezone,
          actor,
        );
        if (command.type === "day") {
          const result = await client.query<{ ambiguous: boolean }>(
            "SELECT ambiguous FROM scheduling_day($1,$2,$3,$4::date)",
            [org, biz, ids[0], command.date],
          );
          if (result.rows[0]?.ambiguous)
            throw new BadRequestException(
              "El cambio de hora hace ambiguo este turno. Elige una hora distinta.",
            );
        }
        for (const id of ids)
          await client.query("SELECT scheduling_assert_citations($1,$2,$3)", [
            org,
            biz,
            id,
          ]);
        await client.query("SET CONSTRAINTS ALL IMMEDIATE");
        if (preview) {
          await client.query("ROLLBACK TO SAVEPOINT scheduling_preview");
          return { ok: true, preview: true, employees: ids, conflicts: [] };
        }
        for (const id of ids) {
          const after: unknown = (
            await client.query(
              "SELECT spans,origin FROM scheduling_pattern($1,$2,$3,$4::date)",
              [org, biz, id, date(command.date ?? command.from)],
            )
          ).rows[0];
          await this.audit(
            client,
            org,
            biz,
            actor,
            id,
            {
              operation: command.type,
              from: command.from ?? command.date,
              to: command.to,
              pattern: after,
              templateId: command.templateId,
              phase:
                (command.phases as Record<string, unknown> | undefined)?.[id] ??
                command.phase,
              blockType: command.blockType,
              fullDays: command.fullDays,
            },
            {
              pattern: previous.get(id),
              version: versions.find((item) => item.employee_id === id)
                ?.version,
            },
          );
        }
        return { ok: true, preview: false, employees: ids, conflicts: [] };
      } catch (error: unknown) {
        await client.query("ROLLBACK TO SAVEPOINT scheduling_preview");
        if (
          preview &&
          typeof error === "object" &&
          error !== null &&
          "message" in error &&
          error.message === "scheduling_conflict"
        ) {
          const detail =
            "detail" in error && typeof error.detail === "string"
              ? (JSON.parse(error.detail) as unknown)
              : [];
          return {
            ok: false,
            preview: true,
            employees: ids,
            conflicts: detail,
          };
        }
        throw error;
      }
    });
  }
  private async apply(
    client: PoolClient,
    org: string,
    biz: string,
    command: Record<string, unknown>,
    ids: string[],
    today: string,
    timezone: string,
    actor: string,
  ) {
    const from = date(command.date ?? command.from);
    if (from < today)
      throw new BadRequestException(
        "Los días pasados se consultan, pero no se modifican desde el cuadrante.",
      );
    if (command.type === "day" || command.type === "resetDay") {
      if (command.type === "resetDay")
        await client.query(
          "DELETE FROM employee_schedule_exceptions WHERE employee_id=$1 AND business_id=$2 AND organization_id=$3 AND work_date=$4",
          [ids[0], biz, org, from],
        );
      else
        await client.query(
          `INSERT INTO employee_schedule_exceptions(employee_id,business_id,organization_id,work_date,spans) VALUES($1,$2,$3,$4,$5)
        ON CONFLICT(employee_id,work_date) DO UPDATE SET spans=EXCLUDED.spans,updated_at=now()`,
          [ids[0], biz, org, from, JSON.stringify(spans(command.spans))],
        );
      return;
    }
    if (command.type === "assignment") {
      const to = command.to ? date(command.to) : null;
      if (to && to < from)
        throw new BadRequestException(
          "La fecha final debe ser posterior al inicio.",
        );
      const template = (
        await client.query<Template>(
          "SELECT id,name,pattern,version FROM employee_shift_templates WHERE id=$1 AND business_id=$2 AND organization_id=$3 AND archived_at IS NULL FOR SHARE",
          [uuid(command.templateId), biz, org],
        )
      ).rows[0];
      if (!template) throw new NotFoundException("Plantilla no disponible.");
      if (command.templateVersion !== template.version)
        throw new ConflictException(
          "La plantilla cambió. Revisa la vista previa.",
        );
      const normalized = pattern(template.pattern);
      const phase = integer(command.phase ?? 0, 0, normalized.length - 1);
      const phases = command.phases;
      if (
        phases !== undefined &&
        (!phases || typeof phases !== "object" || Array.isArray(phases))
      )
        throw new BadRequestException(
          "Revisa las semanas iniciales del ciclo.",
        );
      const anchor = date(command.anchor ?? from);
      // El ancla es el lunes de la semana elegida; una asignación a mitad de
      // semana conserva el día real del ciclo, sin reiniciarlo en miércoles.
      const anchorMonday = (
        await client.query<{ value: string }>(
          "SELECT date_trunc('week',$1::date)::date::text AS value",
          [anchor],
        )
      ).rows[0].value;
      for (const id of ids) {
        // Conserva historia y la parte posterior a una asignación finita.
        const overlaps = (
          await client.query<{
            id: string;
            valid_from: string;
            valid_to: string | null;
          }>(
            `SELECT id,valid_from::text,valid_to::text FROM employee_shift_assignments WHERE employee_id=$1 AND business_id=$2 AND organization_id=$3 AND daterange(valid_from,valid_to,'[]') && daterange($4::date,$5::date,'[]') FOR UPDATE`,
            [id, biz, org, from, to],
          )
        ).rows;
        for (const old of overlaps) {
          if (to && (!old.valid_to || old.valid_to > to))
            await client.query(
              `INSERT INTO employee_shift_assignments(organization_id,business_id,employee_id,template_id,template_version,pattern_snapshot,anchor_date,phase_weeks,valid_from,valid_to)
            SELECT organization_id,business_id,employee_id,template_id,template_version,pattern_snapshot,anchor_date,phase_weeks,$2::date+1,valid_to FROM employee_shift_assignments WHERE id=$1`,
              [old.id, to],
            );
          if (old.valid_from < from)
            await client.query(
              "UPDATE employee_shift_assignments SET valid_to=$2::date-1 WHERE id=$1",
              [old.id, from],
            );
          else
            await client.query(
              "DELETE FROM employee_shift_assignments WHERE id=$1",
              [old.id],
            );
        }
        await client.query(
          `INSERT INTO employee_shift_assignments(organization_id,business_id,employee_id,template_id,template_version,pattern_snapshot,anchor_date,phase_weeks,valid_from,valid_to)
          VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
          [
            org,
            biz,
            id,
            template.id,
            template.version,
            JSON.stringify(normalized),
            anchorMonday,
            integer(
              (phases as Record<string, unknown> | undefined)?.[id] ?? phase,
              0,
              normalized.length - 1,
            ),
            from,
            to,
          ],
        );
      }
      return;
    }
    if (command.type === "absence" || command.type === "deleteBlock") {
      if (
        command.fullDays !== undefined &&
        typeof command.fullDays !== "boolean"
      )
        throw new BadRequestException(
          "Indica si la ausencia ocupa días completos.",
        );
      const id = command.blockId ? uuid(command.blockId) : null;
      if (command.type === "deleteBlock") {
        const result = await client.query(
          "DELETE FROM calendar_blocks WHERE id=$1 AND employee_id=$2 AND business_id=$3 AND organization_id=$4 AND start_at>=($5::date::timestamp AT TIME ZONE $6) RETURNING id",
          [id, ids[0], biz, org, today, timezone],
        );
        if (!result.rowCount)
          throw new NotFoundException("Ausencia no disponible para modificar.");
        return;
      }
      if (
        typeof command.blockType !== "string" ||
        !blockTypes.includes(command.blockType)
      )
        throw new BadRequestException("Tipo de ausencia no válido.");
      const to = date(command.to ?? from);
      if (to < from || (Date.parse(to) - Date.parse(from)) / 86400000 > 366)
        throw new BadRequestException("Revisa las fechas de la ausencia.");
      const startMinutes = command.fullDays
        ? 0
        : integer(command.start, 0, 1439);
      const endMinutes = command.fullDays
        ? 1440
        : integer(command.end, 0, 2879);
      const instants = (
        await client.query<{ a: Date | null; b: Date | null }>(
          `SELECT scheduling_instant($1::date::timestamp+make_interval(mins=>$3::int),$5) AS a,
        scheduling_instant($2::date::timestamp+make_interval(mins=>$4::int),$5) AS b`,
          [from, to, startMinutes, endMinutes, timezone],
        )
      ).rows[0];
      if (!instants.a || !instants.b || instants.a >= instants.b)
        throw new BadRequestException(
          "Estas horas no existen o son ambiguas por el cambio horario. Elige otras horas.",
        );
      if (
        command.reason !== undefined &&
        (typeof command.reason !== "string" || command.reason.length > 255)
      )
        throw new BadRequestException(
          "El motivo admite como máximo 255 caracteres.",
        );
      const reason =
        typeof command.reason === "string"
          ? command.reason.trim() || null
          : null;
      if (id) {
        const result = await client.query(
          `UPDATE calendar_blocks SET start_at=$1,end_at=$2,type=$3,reason=$4,version=version+1,updated_at=now()
          WHERE id=$5 AND employee_id=$6 AND business_id=$7 AND organization_id=$8 AND start_at>=($9::date::timestamp AT TIME ZONE $10) RETURNING id`,
          [
            instants.a,
            instants.b,
            command.blockType,
            reason,
            id,
            ids[0],
            biz,
            org,
            today,
            timezone,
          ],
        );
        if (!result.rowCount)
          throw new NotFoundException("Ausencia no disponible para modificar.");
      } else
        await client.query(
          `INSERT INTO calendar_blocks(organization_id,business_id,employee_id,type,start_at,end_at,reason,created_by_user_id)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8)`,
          [
            org,
            biz,
            ids[0],
            command.blockType,
            instants.a,
            instants.b,
            reason,
            actor,
          ],
        );
      return;
    }
    throw new BadRequestException("Operación no disponible.");
  }
}
