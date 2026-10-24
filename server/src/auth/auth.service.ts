import { ConflictException, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service.js';
import { RegisterUserDto } from './dto/register-user-dto.js';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async registerUser(data: RegisterUserDto) {
    const existingEmail = await this.prisma.db.orm.public.User
      .where({ email: data.email })
      .first();

    if (existingEmail) {
      throw new ConflictException('User with this email already exists');
    }

    const existingUsername = await this.prisma.db.orm.public.User
      .where({ username: data.username })
      .first();

    if (existingUsername) {
      throw new ConflictException('User with this username already exists');
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(data.password, saltRounds);

    const newUser = await this.prisma.db.orm.public.User.create({
      email: data.email,
      username: data.username,
      password: hashedPassword,
    });

    const { password, ...userWithoutPassword } = newUser;

    return {
      message: 'User registered successfully',
      user: userWithoutPassword,
    };
  }
}
