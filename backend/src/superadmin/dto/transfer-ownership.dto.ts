import { IsUUID } from "class-validator";

export class TransferOwnershipDto {
  @IsUUID()
  currentOwnerMembershipId!: string;

  @IsUUID()
  newOwnerMembershipId!: string;
}
