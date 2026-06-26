import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcryptjs";
import { db } from "@smart-erp/database";
import { tenants, users, refreshTokens } from "@smart-erp/database/schema";
import { eq, and } from "@smart-erp/database/drizzle";
import { UsersService } from "../users/users.service";
import { NotificationsGateway } from "../notifications/notifications.gateway";
import { I18nService } from "../i18n/i18n.service";

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private notificationsGateway: NotificationsGateway,
    private i18n: I18nService,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.usersService.findByEmail(email);
    if (!user || !user.passwordHash) return null;

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) return null;

    const { passwordHash, ...result } = user;
    return result;
  }

  async login(user: any) {
    const payload = {
      sub: user.id,
      email: user.email,
      tenantId: user.tenantId,
      role: user.role ?? "user",
    };
    const access_token = this.jwtService.sign(payload, { expiresIn: "15m" });
    const refresh_token = this.jwtService.sign(payload, { expiresIn: "7d" });
    const refreshHash = await bcrypt.hash(refresh_token, 10);
    await db.insert(refreshTokens).values({
      token: refreshHash,
      userId: user.id,
      tenantId: user.tenantId,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
    return {
      access_token,
      refresh_token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        tenantId: user.tenantId,
        role: user.role ?? "user",
      },
    };
  }

  async refresh(refreshToken: string) {
    let payload: { sub: string; email: string; tenantId: string; role: string };
    try {
      payload = this.jwtService.verify(refreshToken);
    } catch {
      throw new UnauthorizedException("Invalid or expired refresh token");
    }
    const [stored] = await db
      .select()
      .from(refreshTokens)
      .where(
        and(
          eq(refreshTokens.userId, payload.sub),
          eq(refreshTokens.revoked, false),
        ),
      )
      .limit(1);
    if (!stored) {
      throw new UnauthorizedException("Refresh token not found or revoked");
    }
    const tokenMatch = await bcrypt.compare(refreshToken, stored.token);
    if (!tokenMatch) {
      throw new UnauthorizedException("Refresh token mismatch");
    }
    await db
      .update(refreshTokens)
      .set({ revoked: true })
      .where(eq(refreshTokens.id, stored.id));
    return this.login({ id: payload.sub, email: payload.email, tenantId: payload.tenantId, role: payload.role, name: undefined });
  }

  async logout(userId: string) {
    await db
      .update(refreshTokens)
      .set({ revoked: true })
      .where(eq(refreshTokens.userId, userId));
  }

  async register(
    email: string,
    password: string,
    name?: string,
    tenantId?: string,
    companyName?: string,
  ) {
    const normalizedEmail = email.trim().toLowerCase();
    const existingUser = await this.usersService.findByEmail(normalizedEmail);
    if (existingUser) {
      throw new ConflictException("Email already in use");
    }

    const resolvedTenantId = tenantId ?? (await this.createTenantForSignup(companyName));
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert directly to include passwordHash (bypasses service which strips it)
    const [user] = await db
      .insert(users)
      .values({
        email: normalizedEmail,
        name: name ?? null,
        passwordHash: hashedPassword,
        tenantId: resolvedTenantId,
        role: tenantId ? "user" : "admin",
      })
      .returning();

    this.notificationsGateway.broadcast("user.registered", {
      id: user.id,
      email: user.email,
      name: user.name,
      tenantId: user.tenantId,
      timestamp: new Date().toISOString(),
    });

    return this.login(user);
  }

  private async createTenantForSignup(companyName?: string): Promise<string> {
    const normalizedName = companyName?.trim();
    if (!normalizedName) {
      throw new BadRequestException(
        this.i18n.t("validation.required", undefined, { field: "companyName" }),
      );
    }

    const baseSlug = this.slugify(normalizedName);
    const slug = await this.uniqueTenantSlug(baseSlug);
    const [tenant] = await db
      .insert(tenants)
      .values({
        name: normalizedName,
        slug,
      })
      .returning();

    return tenant.id;
  }

  private async uniqueTenantSlug(baseSlug: string): Promise<string> {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const slug = attempt === 0 ? baseSlug : `${baseSlug}-${attempt + 1}`;
      const [existing] = await db
        .select({ id: tenants.id })
        .from(tenants)
        .where(eq(tenants.slug, slug));
      if (!existing) return slug;
    }

    return `${baseSlug}-${Date.now().toString(36)}`;
  }

  private slugify(value: string): string {
    const slug = value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48);

    return slug || `tenant-${Date.now().toString(36)}`;
  }
}
