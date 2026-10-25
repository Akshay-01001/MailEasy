import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as crypto from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service.js';
import { RegisterUserDto } from './dto/register-user-dto.js';
import { LoginUserDto } from './dto/login-user-dto.js';
import { JwtService } from '@nestjs/jwt';
import type {
  AuthTokens,
  JwtAccessPayload,
  JwtRefreshPayload,
} from './types/auth.types.js';

@Injectable()
export class CredentialService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Hashes a refresh token before storing it in the database.
   * Uses HMAC-SHA256 with JWT_REFRESH_SECRET as a pepper.
   * Fast, deterministic for indexed lookup, and safe against database leaks.
   */
  hashToken(token: string): string {
    const secret = process.env.JWT_REFRESH_SECRET || 'fallback_secret';
    return crypto.createHmac('sha256', secret).update(token).digest('hex');
  }

  async registerUser(data: RegisterUserDto) {
    const existingEmail = await this.prisma.db.orm.public.User.where({
      email: data.email,
    }).first();

    if (existingEmail) {
      throw new ConflictException('User with this email already exists');
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(data.password, saltRounds);

    const newUser = await this.prisma.db.orm.public.User.create({
      email: data.email,
      name: data.username,
      authProvider: 'credentials',
      password: hashedPassword,
    });

    const { password: _password, ...userWithoutPassword } = newUser;

    return userWithoutPassword;
  }

  async credentialLogin(data: LoginUserDto) {
    const userDetails = await this.prisma.db.orm.public.User.where({
      email: data.email,
    }).first();

    if (!userDetails || !userDetails.password) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isPasswordMatch = await bcrypt.compare(
      data.password,
      userDetails.password,
    );

    if (!isPasswordMatch) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const { password: _password, ...userWithoutPassword } = userDetails;

    return userWithoutPassword;
  }

  /**
   * Generates a new access token (1h) and refresh token (7d).
   * Hashes the refresh token and stores it in the database.
   */
  async generateTokens(user: {
    id: string;
    email: string;
  }): Promise<AuthTokens> {
    const payload: JwtAccessPayload = {
      sub: user.id,
      email: user.email,
    };

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: process.env.JWT_ACCESS_SECRET,
      expiresIn: '1h',
    });

    const refreshPayload: Omit<JwtRefreshPayload, 'iat' | 'exp'> = {
      sub: user.id,
      tokenType: 'refresh',
      jti: crypto.randomUUID(),
    };

    const refreshToken = await this.jwtService.signAsync(refreshPayload, {
      secret: process.env.JWT_REFRESH_SECRET,
      expiresIn: '7d',
    });

    const tokenHash = this.hashToken(refreshToken);
    const expiresAt = new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000,
    ).toISOString();

    await this.prisma.db.orm.public.RefreshToken.create({
      tokenHash,
      userId: user.id,
      expiresAt,
    });

    return {
      accessToken,
      refreshToken,
    };
  }

  /**
   * Refresh Token Rotation (RTR):
   * 1. Verifies the token signature.
   * 2. Hashes incoming token and checks if it exists in DB.
   * 3. If missing -> detects reuse / breach -> revokes all user sessions.
   * 4. If found -> deletes old token from DB and issues a brand-new token pair.
   */
  async refreshToken(oldToken: string): Promise<AuthTokens> {
    if (!oldToken) {
      throw new UnauthorizedException('Refresh token missing');
    }

    let payload: JwtRefreshPayload;
    try {
      payload = await this.verifyRefreshToken(oldToken);
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (payload.tokenType !== 'refresh' || !payload.sub) {
      throw new UnauthorizedException('Invalid token type');
    }

    const oldTokenHash = this.hashToken(oldToken);

    const storedToken = await this.prisma.db.orm.public.RefreshToken.where({
      tokenHash: oldTokenHash,
    }).first();

    // Token reuse detection: Token has valid signature but is not in DB (already rotated or revoked)
    if (!storedToken) {
      await this.prisma.db.orm.public.RefreshToken.where({
        userId: payload.sub,
      }).deleteAll();
      throw new UnauthorizedException(
        'Security alert: Refresh token reuse detected. Please log in again.',
      );
    }

    // Delete the old used token from the database
    await this.prisma.db.orm.public.RefreshToken.where({
      tokenHash: oldTokenHash,
    }).delete();

    // Check expiration
    if (new Date(storedToken.expiresAt) < new Date()) {
      throw new UnauthorizedException('Refresh token has expired');
    }

    const user = await this.prisma.db.orm.public.User.where({
      id: payload.sub,
    }).first();

    if (!user) {
      throw new UnauthorizedException('User no longer exists');
    }

    // Issue brand-new token pair (assign user new token and store its hash in DB)
    return this.generateTokens({ id: user.id, email: user.email });
  }

  /**
   * Revoke a single refresh token from DB (on logout)
   */
  async revokeToken(token: string): Promise<void> {
    if (!token) return;
    const tokenHash = this.hashToken(token);
    await this.prisma.db.orm.public.RefreshToken.where({
      tokenHash,
    }).delete();
  }

  /**
   * Revoke all refresh tokens for a user (logout from all devices)
   */
  async revokeAllUserTokens(userId: string): Promise<void> {
    await this.prisma.db.orm.public.RefreshToken.where({
      userId,
    }).deleteAll();
  }

  async getProfile(userId: string) {
    const user = await this.prisma.db.orm.public.User.where({
      id: userId,
    }).first();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const { password: _password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async verifyAccessToken(token: string): Promise<JwtAccessPayload> {
    return await this.jwtService.verifyAsync<JwtAccessPayload>(token, {
      secret: process.env.JWT_ACCESS_SECRET,
    });
  }

  async verifyRefreshToken(token: string): Promise<JwtRefreshPayload> {
    return await this.jwtService.verifyAsync<JwtRefreshPayload>(token, {
      secret: process.env.JWT_REFRESH_SECRET,
    });
  }
}
