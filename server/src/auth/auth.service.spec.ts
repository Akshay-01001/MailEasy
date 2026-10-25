import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { JwtService } from '@nestjs/jwt';

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: {
            db: {
              orm: {
                public: {
                  User: {
                    where: vi.fn(),
                    create: vi.fn(),
                  },
                  RefreshToken: {
                    where: vi.fn(),
                    create: vi.fn(),
                  },
                },
              },
            },
          },
        },
        {
          provide: JwtService,
          useValue: {
            signAsync: vi.fn(),
            verifyAsync: vi.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should hash tokens deterministically using HMAC-SHA256', () => {
    const token = 'sample-refresh-token';
    const hash1 = service.hashToken(token);
    const hash2 = service.hashToken(token);

    expect(hash1).toBeDefined();
    expect(typeof hash1).toBe('string');
    expect(hash1).toHaveLength(64); // SHA-256 hex is 64 characters
    expect(hash1).toEqual(hash2);
  });
});
