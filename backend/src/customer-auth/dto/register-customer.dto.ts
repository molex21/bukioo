import { IsEmail, IsString, MaxLength, MinLength } from "class-validator";
export class RegisterCustomerDto {
  @IsEmail() @MaxLength(320) email!: string;
  @IsString() @MinLength(12) @MaxLength(128) password!: string;
}
