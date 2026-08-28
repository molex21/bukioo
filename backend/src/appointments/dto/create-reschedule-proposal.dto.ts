import {
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from "class-validator";
export class CreateRescheduleProposalDto {
  @IsOptional() @IsUUID() employeeId?: string;
  @IsDateString() startAt!: string;
  @IsOptional() @IsString() @MaxLength(1000) message?: string;
}
