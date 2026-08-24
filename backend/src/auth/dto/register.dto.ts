import {
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsIn,
  IsOptional,
  IsUUID,
  MaxLength,
} from "class-validator";

export class RegisterDto {
  @IsEmail()
  @MaxLength(320)
  email!: string;

  @IsUUID()
  organizationId!: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsUUID("4", { each: true })
  businessIds!: string[];

  @IsOptional()
  @IsIn(["MANAGER", "EMPLOYEE"])
  role?: "MANAGER" | "EMPLOYEE";
}
