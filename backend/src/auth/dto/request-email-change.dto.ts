import { IsEmail, MaxLength } from "class-validator";

export class RequestEmailChangeDto {
  @IsEmail()
  @MaxLength(320)
  newEmail!: string;
}
