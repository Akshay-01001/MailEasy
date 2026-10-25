import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { CredentialService } from './credential.service.js';
import { RegisterUserDto } from './dto/register-user-dto.js';
import { LoginUserDto } from './dto/login-user-dto.js';
import { AuthGuard } from './guards/auth.guard.js';
import { CurrentUser } from './decorators/current-user.decorator.js';
import type { Request, Response } from 'express';
import { GoogleAuthService } from './google-auth.service.js';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly credentialService: CredentialService,
    private readonly googleAuthService: GoogleAuthService,
  ) {}

  @Post('register')
  async register(
    @Body() registerUserDto: RegisterUserDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const user = await this.credentialService.registerUser(registerUserDto);
    const { accessToken, refreshToken } =
      await this.credentialService.generateTokens({
        email: user.email,
        id: user.id,
      });

    this.setAuthCookies(res, accessToken, refreshToken);

    return {
      user,
      message: 'Registration Successful !!',
    };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() loginUserDto: LoginUserDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const user = await this.credentialService.credentialLogin(loginUserDto);
    const { accessToken, refreshToken } =
      await this.credentialService.generateTokens({
        email: user.email,
        id: user.id,
      });

    this.setAuthCookies(res, accessToken, refreshToken);

    return {
      user,
      message: 'Login Successful !!',
    };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = req.cookies?.refresh_token;

    if (!token) {
      throw new UnauthorizedException('Refresh token missing');
    }

    const { accessToken, refreshToken } =
      await this.credentialService.refreshToken(token);
    this.setAuthCookies(res, accessToken, refreshToken);

    return {
      message: 'Token refreshed successfully',
    };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = req.cookies?.refresh_token;
    if (token) {
      await this.credentialService.revokeToken(token);
    }
    this.clearAuthCookies(res);

    return {
      message: 'Logged out successfully',
    };
  }

  @Post('logout-all')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async logoutAll(
    @CurrentUser('sub') userId: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.credentialService.revokeAllUserTokens(userId);
    this.clearAuthCookies(res);

    return {
      message: 'Logged out from all devices successfully',
    };
  }

  @Get('me')
  @UseGuards(AuthGuard)
  async getProfile(@CurrentUser('sub') userId: string) {
    return this.credentialService.getProfile(userId);
  }

  private setAuthCookies(
    res: Response,
    accessToken: string,
    refreshToken: string,
  ) {
    const isProduction = process.env.NODE_ENV === 'production';

    res.cookie('access_token', accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      maxAge: 60 * 60 * 1000, // 1 hour
      path: '/',
    });

    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/',
    });
  }

  private clearAuthCookies(res: Response) {
    const isProduction = process.env.NODE_ENV === 'production';

    res.clearCookie('access_token', {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      path: '/',
    });

    res.clearCookie('refresh_token', {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      path: '/',
    });
  }
}
