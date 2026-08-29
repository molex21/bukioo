import { IsBoolean } from "class-validator";

export class UpdateAppointmentMembershipEligibilityDto {
  @IsBoolean()
  countsTowardMembership!: boolean;
}
