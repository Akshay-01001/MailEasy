import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { CredentialService } from '../credential.service.js';

export interface AuthenticatedRequest extends Request {
  user?: {
    email: string;
    id: string;
  };
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly credentialService: CredentialService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractTokenFromRequest(request);

    if (!token) {
      throw new UnauthorizedException('Authentication token missing');
    }

    try {
      const payload = await this.credentialService.verifyAccessToken(token);
      request.user = payload;
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired access token');
    }
  }

  private extractTokenFromRequest(request: Request): string | undefined {
    if (request.cookies?.access_token) {
      return request.cookies.access_token;
    }

    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    if (type === 'Bearer' && token) {
      return token;
    }

    return undefined;
  }
}
