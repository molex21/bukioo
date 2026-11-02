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
type Template = {
  id: string;
  name: string;
  pattern: unknown;
  version: number;
  kind: "DAY" | "CYCLE";
};
type Reassignment = {
  appointmentId: string;
  employeeId: string;
  expectedEmployeeId: string;
  expectedUpdatedAt: string;
};

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
    entityType: "SCHEDULE" | "APPOINTMENT" = "SCHEDULE",
  ) {
    await client.query(
      `INSERT INTO audit_logs(organization_id,business_id,actor_user_id,action,entity_type,entity_id,new_values,old_values)
      VALUES($1,$2,$3,$8,$7,$4,$5::jsonb,$6::jsonb)`,
      [
        org,
        biz,
        actor,
        entity,
        JSON.stringify(change),
        oldValues ? JSON.stringify(oldValues) : null,
        entityType,
        entityType === "APPOINTMENT"
          ? "APPOINTMENT_UPDATED"
          : "SCHEDULE_CHANGED",
      ],
    );
  }
  async templates(biz: string, actor: string) {
    return this.repository.database.transaction(async (client) => {
      const context = await this.repository.authorize(client, biz, actor);
      return (
        await client.query<Template>(
          "SELECT id,name,pattern,version,kind FROM employee_shift_templates WHERE business_id=$1 AND organization_id=$2 AND archived_at IS NULL ORDER BY name",
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
    const kind = dto.kind ?? "CYCLE";
    if (
      kind === "DAY" &&
      (normalized.length !== 1 ||
        normalized[0].slice(1).some((day) => day.length))
    )
      throw new BadRequestException(
        "La plantilla de turno contiene un solo día.",
      );
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
        WHERE id=$3 AND business_id=$4 AND organization_id=$5 AND version=$6 AND archived_at IS NULL AND kind=$7 RETURNING id,name,pattern,version,kind`,
            [
              name,
              JSON.stringify(normalized),
              id,
              biz,
              org,
              integer(dto.expectedVersion, 1, 2147483646),
              kind,
            ],
          )
        : await client.query<Template>(
            "INSERT INTO employee_shift_templates(name,pattern,business_id,organization_id,kind) VALUES($1,$2,$3,$4,$5) RETURNING id,name,pattern,version,kind",
            [name, JSON.stringify(normalized), biz, org, kind],
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
        await client.query<
          Record<string, unknown> & {
            employeeId: string;
            date: string;
            workMinutes: string | null;
          }
        >(
          `SELECT e.id AS "employeeId",d::date::text AS date, s.origin,s.ambiguous,
        p.spans AS draft,
        (SELECT coalesce(jsonb_agg(jsonb_build_object('startAt',lower(r),'endAt',upper(r)) ORDER BY lower(r)),'[]') FROM unnest(s.presence) r) AS presence,
        (SELECT coalesce(jsonb_agg(jsonb_build_object('startAt',lower(r),'endAt',upper(r)) ORDER BY lower(r)),'[]') FROM unnest(s.attention) r) AS attention,
        (SELECT coalesce(sum(extract(epoch FROM upper(r)-lower(r)))/60,0) FROM unnest(s.presence) r) AS "presenceMinutes",
        scheduling_work_minutes($1,$2,e.id,d::date) AS "workMinutes",
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

  async weeklyBase(
    biz: string,
    actor: string,
    employeeId: string,
    inputDate?: string,
  ) {
    const emp = uuid(employeeId);
    return this.repository.database.transaction(async (client) => {
      const { organization_id: org, timezone } =
        await this.repository.authorize(client, biz, actor);
      const today = (
        await client.query<{ today: string }>(
          "SELECT (now() AT TIME ZONE $1)::date::text AS today",
          [timezone],
        )
      ).rows[0].today;
      const from = inputDate ? date(inputDate) : today;
      const versions = await this.repository.lock(client, biz, org, [emp]);
      const stored = (
        await client.query<{ pattern: unknown }>(
          "SELECT pattern FROM employee_weekly_bases WHERE organization_id=$1 AND business_id=$2 AND employee_id=$3 AND valid_from<=$4 ORDER BY valid_from DESC LIMIT 1",
          [org, biz, emp, from],
        )
      ).rows[0];
      if (!stored)
        await this.assertLegacyConvertible(client, org, biz, emp, from);
      const legacy = stored
        ? []
        : (
            await client.query<{
              day_of_week: number;
              start: number;
              end: number;
            }>(
              `SELECT day_of_week,(extract(epoch FROM start_time)/60)::int AS start,(extract(epoch FROM end_time)/60)::int AS end
         FROM employee_working_hours WHERE organization_id=$1 AND business_id=$2 AND employee_id=$3
         AND (valid_from IS NULL OR valid_from<=$4) AND (valid_to IS NULL OR valid_to>=$4) ORDER BY start_time`,
              [org, biz, emp, from],
            )
          ).rows;
      const week =
        stored?.pattern ??
        Array.from({ length: 7 }, (_, day) =>
          legacy
            .filter((h) => h.day_of_week === day)
            .map((h) => ({ start: h.start, end: h.end, pauses: [] })),
        );
      const next = (
        await client.query<{ date: string }>(
          "SELECT valid_from::text AS date FROM employee_weekly_bases WHERE organization_id=$1 AND business_id=$2 AND employee_id=$3 AND valid_from>$4 ORDER BY valid_from LIMIT 1",
          [org, biz, emp, from],
        )
      ).rows[0]?.date;
      return {
        week,
        version: versions[0].version,
        timezone,
        from,
        today,
        nextDate: next ?? null,
      };
    });
  }

  private async assertLegacyConvertible(
    client: PoolClient,
    org: string,
    biz: string,
    emp: string,
    from: string,
  ) {
    const incompatible = (
      await client.query<{ exists: boolean }>(
        `SELECT EXISTS(SELECT 1 FROM employee_working_hours WHERE organization_id=$1 AND business_id=$2 AND employee_id=$3
       AND (valid_to IS NULL OR valid_to >= $4) AND (valid_from>$4 OR valid_to IS NOT NULL
         OR extract(second FROM start_time)<>0 OR extract(second FROM end_time)<>0)) AS exists`,
        [org, biz, emp, from],
      )
    ).rows[0].exists;
    if (incompatible)
      throw new ConflictException(
        "Este horario tiene cambios por fecha o minutos parciales que necesitan una revisión antes de usar el nuevo editor. Se conservará sin modificar.",
      );
  }

  async reassignmentOptions(biz: string, actor: string, appointmentId: string) {
    return this.repository.database.transaction(async (client) => {
      const { organization_id: org } = await this.repository.authorize(
        client,
        biz,
        actor,
      );
      const appointment = (
        await client.query<{
          id: string;
          employee_id: string;
          updated: string;
          service_name: string;
          start_at: Date;
        }>(
          `SELECT a.id,a.employee_id,a.updated_at::text AS updated,s.name AS service_name,a.start_at FROM appointments a
         JOIN services s ON s.id=a.service_id AND s.business_id=a.business_id AND s.organization_id=a.organization_id
         WHERE a.id=$1 AND a.organization_id=$2 AND a.business_id=$3 AND a.status IN ('PENDING','CONFIRMED') AND a.start_at>now()`,
          [uuid(appointmentId), org, biz],
        )
      ).rows[0];
      if (!appointment)
        throw new NotFoundException(
          "La cita ya no está disponible para reasignar.",
        );
      const employees = (
        await client.query<{ id: string; name: string }>(
          `SELECT e.id,concat_ws(' ',e.first_name,e.last_name) AS name FROM employees e
         JOIN employee_services es ON es.employee_id=e.id AND es.business_id=e.business_id AND es.organization_id=e.organization_id
         JOIN appointments a ON a.service_id=es.service_id AND a.business_id=e.business_id AND a.organization_id=e.organization_id
         JOIN services s ON s.id=es.service_id AND s.business_id=e.business_id AND s.organization_id=e.organization_id
         WHERE a.id=$1 AND e.organization_id=$2 AND e.business_id=$3 AND e.is_active AND e.archived_at IS NULL AND s.is_active
         AND e.id<>a.employee_id AND scheduling_covers($2,$3,e.id,a.occupied_start_at,a.occupied_end_at)
         AND NOT EXISTS (SELECT 1 FROM appointments b WHERE b.organization_id=$2 AND b.business_id=$3 AND b.employee_id=e.id
           AND b.status IN ('PENDING','CONFIRMED') AND b.occupied_start_at<a.occupied_end_at AND b.occupied_end_at>a.occupied_start_at)
         ORDER BY e.first_name,e.last_name,e.id`,
          [appointment.id, org, biz],
        )
      ).rows;
      return {
        appointmentId: appointment.id,
        expectedEmployeeId: appointment.employee_id,
        expectedUpdatedAt: appointment.updated,
        serviceName: appointment.service_name,
        startAt: appointment.start_at,
        employees,
      };
    });
  }

  private async reassign(
    client: PoolClient,
    org: string,
    biz: string,
    actor: string,
    items: Reassignment[],
  ) {
    for (const item of [...items].sort((a, b) =>
      a.appointmentId.localeCompare(b.appointmentId),
    )) {
      const appointment = (
        await client.query<{
          service_id: string;
          occupied_start_at: Date;
          occupied_end_at: Date;
        }>(
          `SELECT service_id,occupied_start_at,occupied_end_at FROM appointments
         WHERE id=$1 AND organization_id=$2 AND business_id=$3 AND employee_id=$4 AND updated_at::text=$5
         AND status IN ('PENDING','CONFIRMED') AND start_at>now() FOR UPDATE`,
          [
            item.appointmentId,
            org,
            biz,
            item.expectedEmployeeId,
            item.expectedUpdatedAt,
          ],
        )
      ).rows[0];
      if (!appointment)
        throw new ConflictException(
          "Una cita cambió. Actualiza las citas afectadas antes de reasignar.",
        );
      const assigned = await client.query(
        `SELECT es.employee_id FROM employee_services es JOIN services s ON s.id=es.service_id
         AND s.organization_id=es.organization_id AND s.business_id=es.business_id
         WHERE es.organization_id=$1 AND es.business_id=$2 AND es.employee_id=$3 AND es.service_id=$4 AND s.is_active FOR SHARE OF es,s`,
        [org, biz, item.employeeId, appointment.service_id],
      );
      if (!assigned.rowCount)
        throw new ConflictException(
          "La persona elegida ya no tiene disponible ese servicio.",
        );
      const available = (
        await client.query<{ ok: boolean }>(
          `SELECT scheduling_covers($1,$2,$3,$4,$5) AND NOT EXISTS (
         SELECT 1 FROM appointments WHERE organization_id=$1 AND business_id=$2 AND employee_id=$3
         AND id<>$6 AND status IN ('PENDING','CONFIRMED') AND occupied_start_at<$5 AND occupied_end_at>$4) AS ok`,
          [
            org,
            biz,
            item.employeeId,
            appointment.occupied_start_at,
            appointment.occupied_end_at,
            item.appointmentId,
          ],
        )
      ).rows[0].ok;
      if (!available)
        throw new ConflictException(
          "La persona elegida ya no está disponible para esa cita.",
        );
      await client.query(
        "UPDATE appointments SET employee_id=$1,conflict_override=FALSE,updated_at=now() WHERE id=$2 AND organization_id=$3 AND business_id=$4",
        [item.employeeId, item.appointmentId, org, biz],
      );
      await this.audit(
        client,
        org,
        biz,
        actor,
        item.appointmentId,
        { operation: "appointmentReassigned", employeeId: item.employeeId },
        { employeeId: item.expectedEmployeeId },
        "APPOINTMENT",
      );
    }
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
      const raw = command.reassignments ?? [];
      if (!Array.isArray(raw) || raw.length > 50)
        throw new BadRequestException("Revisa las citas que deseas reasignar.");
      const reassignments: Reassignment[] = raw.map((value: unknown) => {
        if (!value || typeof value !== "object" || Array.isArray(value))
          throw new BadRequestException("Reasignación no válida.");
        const item = value as Record<string, unknown>;
        const source = uuid(item.expectedEmployeeId),
          target = uuid(item.employeeId);
        if (
          !ids.includes(source) ||
          source === target ||
          typeof item.expectedUpdatedAt !== "string" ||
          item.expectedUpdatedAt.length > 100
        )
          throw new BadRequestException(
            "Revisa el origen y destino de la cita.",
          );
        return {
          appointmentId: uuid(item.appointmentId),
          employeeId: target,
          expectedEmployeeId: source,
          expectedUpdatedAt: item.expectedUpdatedAt,
        };
      });
      if (
        new Set(reassignments.map((r) => r.appointmentId)).size !==
        reassignments.length
      )
        throw new BadRequestException("Hay citas repetidas en la selección.");
      if (command.type !== "assignment" && ids.length !== 1)
        throw new BadRequestException("Esta operación afecta a un empleado.");
      const versions = await this.repository.lock(
        client,
        biz,
        org,
        [
          ...new Set([...ids, ...reassignments.map((r) => r.employeeId)]),
        ].sort(),
      );
      const expected = command.expectedVersions;
      if (!expected || typeof expected !== "object" || Array.isArray(expected))
        throw new BadRequestException(
          "Actualiza el cuadrante antes de guardar.",
        );
      for (const item of versions)
        if (
          ids.includes(item.employee_id) &&
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
      await client.query("SET CONSTRAINTS ALL DEFERRED");
      let restoredDay: unknown;
      let estimated: Record<string, unknown> = {};
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
        if (command.type === "resetDay")
          restoredDay = (
            await client.query(
              `SELECT p.spans,p.origin,s.ambiguous,
              (SELECT coalesce(jsonb_agg(jsonb_build_object('startAt',lower(r),'endAt',upper(r)) ORDER BY lower(r)),'[]') FROM unnest(s.attention) r) AS attention
             FROM scheduling_pattern($1,$2,$3,$4::date) p
             CROSS JOIN scheduling_day($1,$2,$3,$4::date) s`,
              [org, biz, ids[0], command.date],
            )
          ).rows[0];
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
        await this.reassign(client, org, biz, actor, reassignments);
        if (preview) {
          let from = date(command.date ?? command.from);
          let to = command.to
            ? date(command.to)
            : new Date(
                Date.parse(from) +
                  (command.type === "weekly"
                    ? 6
                    : command.type === "assignment"
                      ? 41
                      : 1) *
                    86400000,
              )
                .toISOString()
                .slice(0, 10);
          let onlyDates: string[] | null = null;
          if (
            command.type === "dates" ||
            command.type === "days" ||
            command.type === "day"
          ) {
            const entries =
              command.type === "dates"
                ? (command.entries as {
                    date: string;
                    spans: { end: number }[];
                  }[])
                : (command.type === "days"
                    ? (command.dates as string[])
                    : [from]
                  ).map((day) => ({
                    date: day,
                    spans: command.spans as { end: number }[],
                  }));
            onlyDates = [
              ...new Set(
                entries.flatMap((e) => [
                  e.date,
                  ...(e.spans.some((s) => s.end > 1440)
                    ? [
                        new Date(Date.parse(e.date) + 86400000)
                          .toISOString()
                          .slice(0, 10),
                      ]
                    : []),
                ]),
              ),
            ].sort();
            from = onlyDates[0];
            to = onlyDates[onlyDates.length - 1];
          }
          const through = new Date(
            Math.min(Date.parse(to), Date.parse(from) + 41 * 86400000),
          )
            .toISOString()
            .slice(0, 10);
          const days = (
            await client.query<{
              employeeId: string;
              date: string;
              minutes: string | null;
            }>(
              `SELECT e AS "employeeId",d::date::text AS date,scheduling_work_minutes($1,$2,e,d::date) AS minutes
             FROM unnest($3::uuid[]) e CROSS JOIN generate_series($4::date::timestamp,$5::date::timestamp,interval '1 day') d
             WHERE ($6::text[] IS NULL OR d::date::text=ANY($6))`,
              [org, biz, ids, from, through, onlyDates],
            )
          ).rows.map((d) => ({
            ...d,
            minutes: d.minutes === null ? null : Number(d.minutes),
          }));
          estimated = {
            estimatedDays: days,
            estimatedTotalMinutes: days.some((d) => d.minutes === null)
              ? null
              : days.reduce((sum, d) => sum + (d.minutes ?? 0), 0),
            estimatedFrom: from,
            estimatedTo: through,
            estimatedTruncated:
              through < to || (command.type === "assignment" && !command.to),
          };
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
          return {
            ok: true,
            preview: true,
            employees: ids,
            conflicts: [],
            restoredDay,
            ...estimated,
          };
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
              dates: command.dates,
              entries: command.entries,
              week: command.week,
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
            restoredDay,
            ...estimated,
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
    if (command.type === "weekly") {
      const normalized = pattern([command.week])[0];
      const stored = await client.query(
        "SELECT 1 FROM employee_weekly_bases WHERE organization_id=$1 AND business_id=$2 AND employee_id=$3 AND valid_from<=$4 LIMIT 1",
        [org, biz, ids[0], from],
      );
      if (!stored.rowCount)
        await this.assertLegacyConvertible(client, org, biz, ids[0], from);
      await client.query(
        `INSERT INTO employee_weekly_bases(organization_id,business_id,employee_id,valid_from,pattern) VALUES($1,$2,$3,$4,$5)
         ON CONFLICT(employee_id,valid_from) DO UPDATE SET pattern=EXCLUDED.pattern,updated_at=now()`,
        [org, biz, ids[0], from, JSON.stringify(normalized)],
      );
      return;
    }
    if (command.type === "dates") {
      if (
        !Array.isArray(command.entries) ||
        !command.entries.length ||
        command.entries.length > 42
      )
        throw new BadRequestException("Selecciona entre uno y 42 días.");
      const entries = command.entries.map((entry: unknown) => {
        if (!entry || typeof entry !== "object" || Array.isArray(entry))
          throw new BadRequestException("Turnos por fecha no válidos.");
        const item = entry as Record<string, unknown>;
        return { date: date(item.date), spans: spans(item.spans) };
      });
      if (new Set(entries.map((e) => e.date)).size !== entries.length)
        throw new BadRequestException("Hay fechas repetidas.");
      for (const entry of entries) {
        await this.apply(
          client,
          org,
          biz,
          { type: "day", ...entry },
          ids,
          today,
          timezone,
          actor,
        );
        const result = await client.query<{ ambiguous: boolean }>(
          "SELECT ambiguous FROM scheduling_day($1,$2,$3,$4::date)",
          [org, biz, ids[0], entry.date],
        );
        if (result.rows[0]?.ambiguous)
          throw new BadRequestException(
            "Un turno coincide con el cambio de hora. Revisa la fecha.",
          );
      }
      return;
    }
    if (command.type === "days") {
      if (
        !Array.isArray(command.dates) ||
        !command.dates.length ||
        command.dates.length > 42
      )
        throw new BadRequestException("Selecciona entre uno y 42 días.");
      const dates = [...new Set(command.dates.map(date))].sort();
      if (dates[0] < today)
        throw new BadRequestException("No se modifican días pasados.");
      const normalized = spans(command.spans);
      for (const day of dates) {
        await this.apply(
          client,
          org,
          biz,
          { type: "day", date: day, spans: normalized },
          ids,
          today,
          timezone,
          actor,
        );
        const result = await client.query<{ ambiguous: boolean }>(
          "SELECT ambiguous FROM scheduling_day($1,$2,$3,$4::date)",
          [org, biz, ids[0], day],
        );
        if (result.rows[0]?.ambiguous)
          throw new BadRequestException(
            "Un turno coincide con una hora ambigua. Revisa las fechas.",
          );
      }
      return;
    }
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
          "SELECT id,name,pattern,version,kind FROM employee_shift_templates WHERE id=$1 AND business_id=$2 AND organization_id=$3 AND archived_at IS NULL FOR SHARE",
          [uuid(command.templateId), biz, org],
        )
      ).rows[0];
      if (!template) throw new NotFoundException("Plantilla no disponible.");
      if (template.kind !== "CYCLE")
        throw new BadRequestException(
          "Selecciona una rotación para una asignación repetitiva.",
        );
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
