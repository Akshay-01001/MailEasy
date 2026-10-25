import type { Request } from 'express';

export interface JwtAccessPayload {
  sub: string;
  email: string;
  iat?: number;
  exp?: number;
}

export interface JwtRefreshPayload {
  sub: string;
  tokenType: 'refresh';
  jti: string;
  iat?: number;
  exp?: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthenticatedRequest extends Request {
  user?: JwtAccessPayload;
}
