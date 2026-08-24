import { IsEmail, MaxLength } from "class-validator";

export class RequestEmailVerificationDto {
  @IsEmail()
  @MaxLength(320)
  email!: string;
}
