import { IsString, MinLength } from "class-validator";
export class RespondRescheduleProposalDto {
  @IsString() @MinLength(32) token!: string;
}
