import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  accountCredentialsTemplate,
  emailVerificationTemplate,
} from "../email/templates";

export interface EmailVerificationMessage {
  email: string;
  token: string;
}

export interface AccountCredentialsMessage {
  email: string;
  temporaryPassword: string;
}

export abstract class EmailProvider {
  abstract sendEmailVerification(
    message: EmailVerificationMessage,
  ): Promise<void>;
  abstract sendAccountCredentials(
    message: AccountCredentialsMessage,
  ): Promise<void>;
}

@Injectable()
export class ResendEmailProvider implements EmailProvider {
  constructor(private readonly configService: ConfigService) {}

  async sendEmailVerification(
    message: EmailVerificationMessage,
  ): Promise<void> {
    const template = emailVerificationTemplate(message.token);
    await this.send(message.email, template);
  }

  async sendAccountCredentials(
    message: AccountCredentialsMessage,
  ): Promise<void> {
    const template = accountCredentialsTemplate(message.temporaryPassword);
    await this.send(message.email, template);
  }

  private async send(
    email: string,
    template: { subject: string; text: string },
  ) {
    const apiKey = this.configService.get<string>("RESEND_API_KEY");
    const from = this.configService.get<string>("RESEND_FROM_EMAIL");

    if (!apiKey || !from) {
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
      throw new ServiceUnavailableException("No se pudo enviar el email");
    }
  }
}
