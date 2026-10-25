import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from './auth.guard.js';
import { AuthService } from '../auth.service.js';

describe('AuthGuard', () => {
  let guard: AuthGuard;
  let authService: { verifyAccessToken: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    authService = {
      verifyAccessToken: vi.fn(),
    };
    guard = new AuthGuard(authService as unknown as AuthService);
  });

  const createMockContext = (headers = {}, cookies = {}) => {
    const request = {
      headers,
      cookies,
      user: null,
    };
    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext;
  };

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should throw UnauthorizedException if no token is provided', async () => {
    const context = createMockContext();
    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('should authenticate with access_token cookie', async () => {
    const payload = { sub: '123', email: 'test@example.com' };
    authService.verifyAccessToken.mockResolvedValue(payload);

    const context = createMockContext({}, { access_token: 'valid-token' });
    const canActivate = await guard.canActivate(context);

    expect(canActivate).toBe(true);
    const req = context.switchToHttp().getRequest();
    expect(req.user).toEqual(payload);
  });

  it('should authenticate with Bearer authorization header', async () => {
    const payload = { sub: '123', email: 'test@example.com' };
    authService.verifyAccessToken.mockResolvedValue(payload);

    const context = createMockContext({
      authorization: 'Bearer valid-header-token',
    });
    const canActivate = await guard.canActivate(context);

    expect(canActivate).toBe(true);
    const req = context.switchToHttp().getRequest();
    expect(req.user).toEqual(payload);
  });

  it('should throw UnauthorizedException if token verification fails', async () => {
    authService.verifyAccessToken.mockRejectedValue(new Error('Invalid token'));

    const context = createMockContext({}, { access_token: 'invalid-token' });
    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });
});

