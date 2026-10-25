import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller.js';
import { CredentialService } from './credential.service.js';
import { JwtModule } from '@nestjs/jwt';
import { AuthGuard } from './guards/auth.guard.js';
import { GoogleAuthService } from './google-auth.service.js';

@Module({
  imports: [JwtModule.register({})],
  controllers: [AuthController],
  providers: [CredentialService, AuthGuard, GoogleAuthService],
  exports: [CredentialService, AuthGuard, JwtModule],
})
export class AuthModule {}
