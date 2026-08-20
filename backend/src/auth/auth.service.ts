import { ConflictException, Injectable } from "@nestjs/common";
import * as argon2 from "argon2";
import { RegisterDto } from "./dto/register.dto";
import { UsersRepository } from "./users.repository";

@Injectable()
export class AuthService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async register(registerDto: RegisterDto) {
    const email = registerDto.email.trim().toLowerCase();

    const existingUser = await this.usersRepository.findByEmail(email);

    if (existingUser) {
      throw new ConflictException("Ya existe una cuenta con este email");
    }

    const passwordHash = await argon2.hash(registerDto.password, {
      type: argon2.argon2id,
    });

    const user = await this.usersRepository.create(email, passwordHash);

    return {
      id: user.id,
      email: user.email,
      emailVerified: user.email_verified_at !== null,
      createdAt: user.created_at,
    };
  }
}
