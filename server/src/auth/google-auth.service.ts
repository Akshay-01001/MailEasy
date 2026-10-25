import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { GoogleTokenResponse, GoogleUserInfo } from './types/auth.types.js';

@Injectable()
export class GoogleAuthService {
  constructor(private readonly prismaService: PrismaService) {}

  /**
   * Generates the Google OAuth 2.0 authorization URL
   */
  getGoogleAuthUrl(): string {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const redirectUri =
      process.env.GOOGLE_CALLBACK_URL ||
      'http://localhost:8000/auth/google/callback';

    if (!clientId) {
      throw new InternalServerErrorException('Something Went Wrong');
    }

    const rootUrl = 'https://accounts.google.com/o/oauth2/v2/auth';
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      access_type: 'offline',
      prompt: 'select_account',
    });

    return `${rootUrl}?${params.toString()}`;
  }

  /**
   * Exchanges authorization code with Google, retrieves user profile,
   * and creates or finds the user in PostgreSQL.
   */
  async handleGoogleCallback(code: string) {
    if (!code) {
      throw new BadRequestException('Authorization code missing');
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri =
      process.env.GOOGLE_CALLBACK_URL ||
      'http://localhost:8000/auth/google/callback';

    if (!clientId || !clientSecret) {
      throw new InternalServerErrorException(
        'Google OAuth credentials are not configured in .env',
      );
    }

    // 1. Exchange authorization code for Google access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = (await tokenResponse.json()) as GoogleTokenResponse;

    if (!tokenResponse.ok || !tokenData.access_token) {
      throw new UnauthorizedException(
        tokenData.error_description ||
          'Failed to exchange authorization code with Google',
      );
    }

    // 2. Fetch user profile from Google using the access token
    const userinfoResponse = await fetch(
      'https://www.googleapis.com/oauth2/v3/userinfo',
      {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
        },
      },
    );

    if (!userinfoResponse.ok) {
      throw new UnauthorizedException(
        'Failed to fetch user profile from Google',
      );
    }

    const profile = (await userinfoResponse.json()) as GoogleUserInfo;

    if (!profile.email) {
      throw new BadRequestException(
        'Google account does not have an email address',
      );
    }

    // 3. Find or create user in our database
    let user = await this.prismaService.db.orm.public.User.where({
      providerId: profile.sub,
    }).first();

    if (!user) {
      const existingEmailUser =
        await this.prismaService.db.orm.public.User.where({
          email: profile.email,
        }).first();

      if (existingEmailUser) {
        if (existingEmailUser.authProvider === 'credentials') {
          throw new ConflictException(
            'An account with this email already exists with password. Please log in using your password.',
          );
        }
        user = existingEmailUser;
      } else {
        user = await this.prismaService.db.orm.public.User.create({
          name: profile.name || profile.email.split('@')[0],
          email: profile.email,
          authProvider: 'google',
          providerId: profile.sub,
          password: null,
          isVerified: profile.email_verified ?? true,
        });
      }
    }

    const { password: _password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }
}
