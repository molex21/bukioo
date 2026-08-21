import {
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from "class-validator";
import { RegisterDto } from "./register.dto";

export class OnboardDto extends RegisterDto {
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  organizationName!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(80)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  organizationSlug!: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  timezone?: string;
}
