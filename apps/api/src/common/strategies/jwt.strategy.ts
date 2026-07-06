import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { validateJwtSecret } from '../config/env-validator.service';
import { UsersService } from '../../users/users.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
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
    const userId = payload.sub;
    const tenantId = payload.tenantId;

    // Verify the user still exists, belongs to the token tenant, and is active.
    // Fetch the current role from the database instead of trusting the token.
    const user = await this.usersService.findActiveByIdAndTenant(userId, tenantId);
    if (!user) {
      throw new UnauthorizedException('User is inactive, deleted, or not a member of this tenant');
    }

    // Normalise: expose both `sub` and `userId` so controllers can use either
    return {
      sub: user.id,
      userId: user.id,
      email: user.email,
      tenantId: user.tenantId,
      role: user.role,
    };
  }
}
