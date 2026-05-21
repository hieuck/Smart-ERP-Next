import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || configService?.get<string>('JWT_SECRET') || 'super_secret_jwt_key_for_smart_erp_next_2026',
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
