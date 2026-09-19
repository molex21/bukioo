import { OmitType } from "@nestjs/mapped-types";
import { CreateBusinessDto } from "../../businesses/dto/create-business.dto";

export class CreateSuperadminBusinessDto extends OmitType(CreateBusinessDto, [
  "organizationId",
] as const) {}
