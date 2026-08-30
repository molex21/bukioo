import { Transform } from "class-transformer";
import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from "class-validator";

const notificationStatuses = [
  "PENDING",
  "SENT",
  "FAILED",
  "CANCELLED",
] as const;
const notificationChannels = ["EMAIL", "SMS", "IN_APP"] as const;

export class ListNotificationsDto {
  @IsOptional()
  @Transform(({ value }) => String(value).toUpperCase())
  @IsIn(notificationStatuses)
  status?: (typeof notificationStatuses)[number];

  @IsOptional()
  @Transform(({ value }) => String(value).toUpperCase())
  @IsIn(notificationChannels)
  channel?: (typeof notificationChannels)[number];

  @IsOptional()
  @IsString()
  @MaxLength(50)
  type?: string;

  @IsOptional()
  @IsUUID()
  appointmentId?: string;

  @IsOptional()
  @IsUUID()
  customerId?: string;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(0)
  offset?: number;
}
