jest.mock("node:child_process", () => ({
  spawnSync: jest.fn(),
}));

describe("run-turbo", () => {
  const originalPlatform = process.platform;

  beforeEach(() => {
    jest.resetModules();
  });

  afterEach(() => {
    Object.defineProperty(process, "platform", {
      value: originalPlatform,
    });
  });

  describe("buildTurboEnv", () => {
    function setPlatform(platform) {
      Object.defineProperty(process, "platform", {
        value: platform,
      });
    }

    it("prepends scripts/shims to PATH on Windows", () => {
      setPlatform("win32");
      const path = require("node:path");
      const { buildTurboEnv } = require("./run-turbo");
      const cwd = "C:\\repo";

      const env = buildTurboEnv(cwd);
      const pathKey =
        Object.keys(env).find((key) => key.toLowerCase() === "path") || "PATH";
      const parts = env[pathKey].split(";");

      expect(parts[0]).toBe(path.join(cwd, "scripts", "shims"));
    });

    it("includes node_modules/.bin in PATH on Windows", () => {
      setPlatform("win32");
      const path = require("node:path");
      const { buildTurboEnv } = require("./run-turbo");
      const cwd = "C:\\repo";

      const env = buildTurboEnv(cwd);
      const pathKey =
        Object.keys(env).find((key) => key.toLowerCase() === "path") || "PATH";
      const parts = env[pathKey].split(";");

      expect(parts).toContain(path.join(cwd, "node_modules", ".bin"));
    });

    it("prepends scripts/shims to PATH on Unix", () => {
      setPlatform("linux");
      const path = require("node:path");
      const { buildTurboEnv } = require("./run-turbo");
      const cwd = "/repo";

      const env = buildTurboEnv(cwd);
      const pathKey =
        Object.keys(env).find((key) => key.toLowerCase() === "path") || "PATH";
      const parts = env[pathKey].split(":");

      expect(parts[0]).toBe(path.join(cwd, "scripts", "shims"));
    });

    it("includes node_modules/.bin in PATH on Unix", () => {
      setPlatform("linux");
      const path = require("node:path");
      const { buildTurboEnv } = require("./run-turbo");
      const cwd = "/repo";

      const env = buildTurboEnv(cwd);
      const pathKey =
        Object.keys(env).find((key) => key.toLowerCase() === "path") || "PATH";
      const parts = env[pathKey].split(":");

      expect(parts).toContain(path.join(cwd, "node_modules", ".bin"));
    });

    it("places scripts/shims before node_modules/.bin", () => {
      const path = require("node:path");
      const { buildTurboEnv } = require("./run-turbo");
      const cwd = "/repo";

      const env = buildTurboEnv(cwd);
      const pathKey =
        Object.keys(env).find((key) => key.toLowerCase() === "path") || "PATH";
      const shimIndex = env[pathKey].indexOf(path.join(cwd, "scripts", "shims"));
      const binIndex = env[pathKey].indexOf(path.join(cwd, "node_modules", ".bin"));

      expect(shimIndex).toBeLessThan(binIndex);
    });
  });

  describe("runTurbo", () => {
    it("returns 0 when turbo exits successfully", () => {
      const { spawnSync } = require("node:child_process");
      spawnSync.mockReturnValue({ status: 0 });
      const { runTurbo } = require("./run-turbo");

      const exitCode = runTurbo(["build"], "/repo");

      expect(exitCode).toBe(0);
      expect(spawnSync).toHaveBeenCalledTimes(1);
      expect(spawnSync).toHaveBeenCalledWith(
        "turbo",
        ["build"],
        expect.objectContaining({
          cwd: "/repo",
          shell: process.platform === "win32",
          stdio: "inherit",
        }),
      );
    });

    it("falls back to pnpm -r run <task> when turbo exits with code 127", () => {
      const { spawnSync } = require("node:child_process");
      spawnSync
        .mockReturnValueOnce({ status: 127 })
        .mockReturnValueOnce({ status: 42 });
      const { runTurbo } = require("./run-turbo");

      const exitCode = runTurbo(["build"], "/repo");

      expect(exitCode).toBe(42);
      expect(spawnSync).toHaveBeenCalledTimes(2);
      expect(spawnSync).toHaveBeenNthCalledWith(
        2,
        "pnpm",
        ["-r", "run", "build"],
        expect.objectContaining({
          cwd: "/repo",
          shell: process.platform === "win32",
          stdio: "inherit",
        }),
      );
    });

    it("falls back to pnpm -r run <task> when turbo exits with code 3221225781", () => {
      const { spawnSync } = require("node:child_process");
      spawnSync
        .mockReturnValueOnce({ status: 3221225781 })
        .mockReturnValueOnce({ status: 7 });
      const { runTurbo } = require("./run-turbo");

      const exitCode = runTurbo(["dev"], "/repo");

      expect(exitCode).toBe(7);
      expect(spawnSync).toHaveBeenCalledTimes(2);
      expect(spawnSync).toHaveBeenNthCalledWith(
        2,
        "pnpm",
        ["-r", "run", "dev"],
        expect.objectContaining({
          cwd: "/repo",
          shell: process.platform === "win32",
          stdio: "inherit",
        }),
      );
    });

    it("returns unknown non-zero turbo status without falling back", () => {
      const { spawnSync } = require("node:child_process");
      spawnSync.mockReturnValue({ status: 1 });
      const { runTurbo } = require("./run-turbo");

      const exitCode = runTurbo(["build"], "/repo");

      expect(exitCode).toBe(1);
      expect(spawnSync).toHaveBeenCalledTimes(1);
      expect(spawnSync).not.toHaveBeenCalledWith(
        "pnpm",
        expect.anything(),
        expect.anything(),
      );
    });

    it("returns 1 when turbo result has no status", () => {
      const { spawnSync } = require("node:child_process");
      spawnSync.mockReturnValue({});
      const { runTurbo } = require("./run-turbo");

      const exitCode = runTurbo(["build"], "/repo");

      expect(exitCode).toBe(1);
    });
  });
});
