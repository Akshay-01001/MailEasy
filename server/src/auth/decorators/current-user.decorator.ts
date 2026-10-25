import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type {
  AuthenticatedRequest,
  JwtAccessPayload,
} from '../types/auth.types.js';

export type { JwtAccessPayload as CurrentUserPayload };

export const CurrentUser = createParamDecorator(
  (data: keyof JwtAccessPayload | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    return data && user ? user[data] : user;
  },
);
