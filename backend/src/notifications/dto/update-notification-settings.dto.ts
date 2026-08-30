import { IsBoolean, IsInt, IsOptional, Max, Min } from "class-validator";

export class UpdateNotificationSettingsDto {
  @IsOptional()
  @IsBoolean()
  appointmentReminderEnabled?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(168)
  appointmentReminderHoursBefore?: number;
}
