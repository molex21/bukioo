import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  accountCredentialsTemplate,
  appointmentReminderTemplate,
  emailVerificationTemplate,
  emailChangeTemplate,
  appointmentRescheduleTemplate,
  passwordResetTemplate,
  pointsExpirationTemplate,
} from "../email/templates";

export interface EmailVerificationMessage {
  email: string;
  token: string;
}
export interface EmailChangeMessage {
  email: string;
  token: string;
}

export interface AccountCredentialsMessage {
  email: string;
  temporaryPassword: string;
}

export interface PasswordResetMessage {
  email: string;
  token: string;
}
export interface AppointmentRescheduleMessage {
  email: string;
  referenceCode: string;
  startAt: Date;
  url: string;
  message?: string;
}
export interface PointsExpirationMessage {
  email: string;
  businessName: string;
  points: number;
  expiresAt: Date;
  timezone: string;
  daysBeforeExpiration: 30 | 7;
}
export interface AppointmentReminderMessage {
  email: string;
  businessName: string;
  referenceCode: string;
  serviceName: string;
  employeeName: string;
  startAt: Date;
  timezone: string;
}

export abstract class EmailProvider {
  abstract sendEmailVerification(
    message: EmailVerificationMessage,
  ): Promise<void>;
  abstract sendEmailChange(message: EmailChangeMessage): Promise<void>;
  abstract sendAccountCredentials(
    message: AccountCredentialsMessage,
  ): Promise<void>;
  abstract sendPasswordReset(message: PasswordResetMessage): Promise<void>;
  abstract sendAppointmentReschedule(
    message: AppointmentRescheduleMessage,
  ): Promise<void>;
  abstract sendPointsExpiration(
    message: PointsExpirationMessage,
  ): Promise<void>;
  abstract sendAppointmentReminder(
    message: AppointmentReminderMessage,
  ): Promise<void>;
}

@Injectable()
export class ResendEmailProvider implements EmailProvider {
  private readonly logger = new Logger(ResendEmailProvider.name);

  constructor(private readonly configService: ConfigService) {}

  async sendEmailVerification(
    message: EmailVerificationMessage,
  ): Promise<void> {
    const template = emailVerificationTemplate(message.token);
    await this.send(message.email, template);
  }

  async sendEmailChange(message: EmailChangeMessage): Promise<void> {
    await this.send(message.email, emailChangeTemplate(message.token));
  }

  async sendAccountCredentials(
    message: AccountCredentialsMessage,
  ): Promise<void> {
    const template = accountCredentialsTemplate(message.temporaryPassword);
    await this.send(message.email, template);
  }

  async sendPasswordReset(message: PasswordResetMessage): Promise<void> {
    await this.send(message.email, passwordResetTemplate(message.token));
  }
  async sendAppointmentReschedule(
    message: AppointmentRescheduleMessage,
  ): Promise<void> {
    await this.send(message.email, appointmentRescheduleTemplate(message));
  }

  async sendPointsExpiration(message: PointsExpirationMessage): Promise<void> {
    await this.send(message.email, pointsExpirationTemplate(message));
  }

  async sendAppointmentReminder(
    message: AppointmentReminderMessage,
  ): Promise<void> {
    await this.send(message.email, appointmentReminderTemplate(message));
  }

  private async send(
    email: string,
    template: { subject: string; text: string },
  ) {
    if (this.configService.get<boolean>("EMAIL_DELIVERY_ENABLED") === false) {
      return;
    }

    const apiKey = this.configService.get<string>("RESEND_API_KEY");
    const from = this.configService.get<string>("RESEND_FROM_EMAIL");

    if (!apiKey || !from) {
      this.logger.error({
        event: "email_delivery_failed",
        provider: "resend",
        reason: "missing_configuration",
      });
      throw new ServiceUnavailableException(
        "El envio de email no esta configurado",
      );
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [email],
        subject: template.subject,
        text: template.text,
      }),
    });

    if (!response.ok) {
      const details: unknown = await response.json().catch(() => null);
      this.logger.error({
        event: "email_delivery_failed",
        provider: "resend",
        providerStatus: response.status,
        ...this.describeRejection(details),
      });
      throw new ServiceUnavailableException("No se pudo enviar el email");
    }
  }

  private describeRejection(details: unknown) {
    const reasons: Record<string, string> = {
      validation_error: "invalid_email_request",
      missing_api_key: "missing_api_key",
      invalid_api_key: "invalid_api_key",
      restricted_api_key: "restricted_api_key",
      suspended_api_key: "suspended_api_key",
      invalid_permission: "insufficient_permissions",
      daily_quota_exceeded: "daily_quota_exceeded",
      monthly_quota_exceeded: "monthly_quota_exceeded",
      rate_limit_exceeded: "rate_limit_exceeded",
      invalid_parameter: "invalid_parameter",
      missing_required_field: "missing_required_field",
      application_error: "provider_internal_error",
      service_unavailable: "provider_unavailable",
    };
    if (typeof details !== "object" || details === null) {
      return { providerCode: "unknown", reason: "unknown_provider_error" };
    }
    const name = "name" in details ? details.name : undefined;
    const providerCode =
      typeof name === "string" && Object.hasOwn(reasons, name)
        ? name
        : "unknown";
    let reason = reasons[providerCode] ?? "unknown_provider_error";

    // External messages may echo recipients or secrets; emit fixed labels only.
    if (
      providerCode === "validation_error" &&
      "message" in details &&
      typeof details.message === "string"
    ) {
      const message = details.message.toLowerCase();
      if (message.includes("only send testing emails to your own email")) {
        reason = "testing_recipient_restriction";
      } else if (message.includes("domain is not verified")) {
        reason = "sender_domain_not_verified";
      }
    }
    return { providerCode, reason };
  }
}
