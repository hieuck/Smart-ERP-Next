const mockDb = {
  insert: jest.fn(),
  select: jest.fn(),
};

jest.mock("@smart-erp/database", () => ({ db: mockDb }));

jest.mock("@smart-erp/database/schema", () => ({
  tenants: {
    id: "tenants.id",
    slug: "tenants.slug",
  },
  users: {
    id: "users.id",
  },
}));

jest.mock("@smart-erp/database/drizzle", () => ({
  eq: jest.fn((field, value) => ({ field, op: "eq", value })),
}));

import { BadRequestException, ConflictException } from "@nestjs/common";
import * as bcrypt from "bcryptjs";
import { AuthService } from "./auth.service";

const selectQueue: any[][] = [];
const insertReturningQueue: any[][] = [];
const insertChains: any[] = [];

const makeSelectChain = (rows: any[]) => {
  const chain: any = {
    from: jest.fn(() => chain),
    where: jest.fn(() => Promise.resolve(rows)),
  };
  return chain;
};

const makeInsertChain = () => {
  const chain: any = {
    returning: jest.fn(() =>
      Promise.resolve(insertReturningQueue.shift() ?? []),
    ),
    values: jest.fn(() => chain),
  };
  insertChains.push(chain);
  return chain;
};

const createService = () => {
  const usersService = { findByEmail: jest.fn() };
  const jwtService = { sign: jest.fn(() => "signed-token") };
  const notificationsGateway = { broadcast: jest.fn() };
  const i18n = {
    t: jest.fn(
      (key: string, _lang?: string, args?: { field?: string }) =>
        `${key}:${args?.field ?? ""}`,
    ),
  };

  return {
    i18n,
    jwtService,
    notificationsGateway,
    service: new AuthService(
      usersService as any,
      jwtService as any,
      notificationsGateway as any,
      i18n as any,
    ),
    usersService,
  };
};

describe("AuthService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    selectQueue.length = 0;
    insertReturningQueue.length = 0;
    insertChains.length = 0;

    mockDb.select.mockImplementation(() =>
      makeSelectChain(selectQueue.shift() ?? []),
    );
    mockDb.insert.mockImplementation(() => makeInsertChain());
  });

  it("validates credentials and strips password hashes from the returned user", async () => {
    const { service, usersService } = createService();
    const passwordHash = await bcrypt.hash("Password123!", 4);
    usersService.findByEmail.mockResolvedValueOnce(null);
    await expect(
      service.validateUser("missing@example.com", "Password123!"),
    ).resolves.toBeNull();

    usersService.findByEmail.mockResolvedValueOnce({
      email: "nohash@example.com",
    });
    await expect(
      service.validateUser("nohash@example.com", "Password123!"),
    ).resolves.toBeNull();

    usersService.findByEmail.mockResolvedValueOnce({
      email: "wrong@example.com",
      passwordHash,
    });
    await expect(
      service.validateUser("wrong@example.com", "bad-password"),
    ).resolves.toBeNull();

    usersService.findByEmail.mockResolvedValueOnce({
      email: "owner@example.com",
      id: "user-1",
      name: "Owner",
      passwordHash,
      role: "admin",
      tenantId: "tenant-1",
    });

    await expect(
      service.validateUser("owner@example.com", "Password123!"),
    ).resolves.toEqual({
      email: "owner@example.com",
      id: "user-1",
      name: "Owner",
      role: "admin",
      tenantId: "tenant-1",
    });
  });

  it("signs login payloads with a default role", async () => {
    const { jwtService, service } = createService();

    await expect(
      service.login({
        email: "staff@example.com",
        id: "user-1",
        name: "Staff",
        tenantId: "tenant-1",
      }),
    ).resolves.toEqual({
      access_token: "signed-token",
      refresh_token: "signed-token",
      user: {
        email: "staff@example.com",
        id: "user-1",
        name: "Staff",
        role: "user",
        tenantId: "tenant-1",
      },
    });
    expect(jwtService.sign).toHaveBeenCalledWith(
      { email: "staff@example.com", role: "user", sub: "user-1", tenantId: "tenant-1" },
      { expiresIn: "15m" },
    );
  });

  it("creates a new tenant workspace and admin user for self-service signup", async () => {
    const { notificationsGateway, service, usersService } = createService();
    usersService.findByEmail.mockResolvedValueOnce(null);
    selectQueue.push([]);
    insertReturningQueue.push(
      [{ id: "tenant-1", name: "Cong ty Ca Phe", slug: "cong-ty-ca-phe" }],
      [
        {
          email: "owner@example.com",
          id: "user-1",
          name: "Owner",
          role: "admin",
          tenantId: "tenant-1",
        },
      ],
    );

    await expect(
      service.register(
        " Owner@Example.COM ",
        "Password123!",
        "Owner",
        undefined,
        "  Công ty Cà Phê  ",
      ),
    ).resolves.toMatchObject({
      access_token: "signed-token",
      user: {
        email: "owner@example.com",
        role: "admin",
        tenantId: "tenant-1",
      },
    });

    expect(usersService.findByEmail).toHaveBeenCalledWith("owner@example.com");
    expect(insertChains[0].values).toHaveBeenCalledWith({
      name: "Công ty Cà Phê",
      slug: "cong-ty-ca-phe",
    });
    expect(insertChains[1].values).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "owner@example.com",
        name: "Owner",
        role: "admin",
        tenantId: "tenant-1",
      }),
    );
    expect(notificationsGateway.broadcast).toHaveBeenCalledWith(
      "user.registered",
      expect.objectContaining({
        email: "owner@example.com",
        tenantId: "tenant-1",
      }),
    );
  });

  it("assigns staff role when joining an existing tenant", async () => {
    const { service, usersService } = createService();
    usersService.findByEmail.mockResolvedValueOnce(null);
    insertReturningQueue.push([
      {
        email: "staff@example.com",
        id: "user-2",
        name: "Staff",
        role: "user",
        tenantId: "tenant-1",
      },
    ]);

    await service.register(
      "staff@example.com",
      "Password123!",
      "Staff",
      "tenant-1",
    );

    expect(mockDb.select).not.toHaveBeenCalled();
    expect(insertChains[0].values).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "staff@example.com",
        role: "user",
        tenantId: "tenant-1",
      }),
    );

    usersService.findByEmail.mockResolvedValueOnce(null);
    insertReturningQueue.push([
      {
        email: "noname@example.com",
        id: "user-3",
        name: null,
        role: "user",
        tenantId: "tenant-1",
      },
    ]);

    await service.register(
      "noname@example.com",
      "Password123!",
      undefined,
      "tenant-1",
    );

    expect(insertChains[2].values).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "noname@example.com",
        name: null,
        role: "user",
        tenantId: "tenant-1",
      }),
    );
  });

  it("rejects duplicate emails and missing company names", async () => {
    const { service, usersService } = createService();
    usersService.findByEmail.mockResolvedValueOnce({ id: "existing" });
    await expect(
      service.register(
        "taken@example.com",
        "Password123!",
        "Taken",
        undefined,
        "Taken Co",
      ),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(mockDb.insert).not.toHaveBeenCalled();

    usersService.findByEmail.mockResolvedValueOnce(null);
    await expect(
      service.register("new@example.com", "Password123!", "New"),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("uses a unique tenant slug when the base slug is already taken", async () => {
    const { service, usersService } = createService();
    usersService.findByEmail.mockResolvedValueOnce(null);
    selectQueue.push([{ id: "tenant-existing" }], []);
    insertReturningQueue.push(
      [{ id: "tenant-2", name: "Demo Company", slug: "demo-company-2" }],
      [
        {
          email: "owner2@example.com",
          id: "user-3",
          name: "Owner 2",
          role: "admin",
          tenantId: "tenant-2",
        },
      ],
    );

    await service.register(
      "owner2@example.com",
      "Password123!",
      "Owner 2",
      undefined,
      "Demo Company",
    );

    expect(insertChains[0].values).toHaveBeenCalledWith({
      name: "Demo Company",
      slug: "demo-company-2",
    });
  });

  it("falls back when every tenant slug candidate is already taken", async () => {
    const { service } = createService();
    jest.spyOn(Date, "now").mockReturnValue(1770000000000);
    selectQueue.push(...Array.from({ length: 20 }, (_, index) => [{ id: `tenant-${index}` }]));

    await expect((service as any).uniqueTenantSlug("busy")).resolves.toBe("busy-ml4kasqo");
    expect((service as any).slugify("!!!")).toBe("tenant-ml4kasqo");
  });
});
