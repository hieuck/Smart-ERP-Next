import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { validateJwtSecret } from '../config/env-validator.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    const secret = configService.getOrThrow<string>('JWT_SECRET');
    const issues = validateJwtSecret(secret);
    if (issues.length > 0) {
      throw new Error(issues.join('; '));
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: any) {
    // Normalise: expose both `sub` and `userId` so controllers can use either
    return {
      sub: payload.sub,
      userId: payload.sub,
      email: payload.email,
      tenantId: payload.tenantId,
      role: payload.role ?? 'user',
    };
  }
}
