jest.mock("node:child_process", () => ({
  spawnSync: jest.fn(),
}));

jest.mock("node:fs", () => ({
  existsSync: jest.fn().mockReturnValue(true),
}));

const path = require("node:path");

function setPlatform(platform) {
  Object.defineProperty(process, "platform", {
    value: platform,
    configurable: true,
  });
}

describe("run-turbo", () => {
  const originalPlatform = process.platform;

  beforeEach(() => {
    jest.resetModules();
    setPlatform(originalPlatform);
  });

  afterEach(() => {
    Object.defineProperty(process, "platform", {
      value: originalPlatform,
      configurable: true,
    });
  });

  describe("buildTurboEnv", () => {
    it("prepends scripts/shims to PATH on Windows", () => {
      setPlatform("win32");
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
      const { buildTurboEnv } = require("./run-turbo");
      const cwd = "/repo";

      const env = buildTurboEnv(cwd);
      const pathKey =
        Object.keys(env).find((key) => key.toLowerCase() === "path") || "PATH";
      const parts = env[pathKey].split(":");

      expect(parts).toContain(path.join(cwd, "node_modules", ".bin"));
    });

    it("places scripts/shims before node_modules/.bin", () => {
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

  describe("resolveTurboBinary", () => {
    it("resolves local turbo.cmd on Windows", () => {
      setPlatform("win32");
      const { resolveTurboBinary } = require("./run-turbo");
      const cwd = "C:\\repo";

      const binary = resolveTurboBinary(cwd);
      expect(binary).toBe(path.join(cwd, "node_modules", ".bin", "turbo.cmd"));
    });

    it("resolves local turbo on Unix", () => {
      setPlatform("linux");
      const { resolveTurboBinary } = require("./run-turbo");
      const cwd = "/repo";

      const binary = resolveTurboBinary(cwd);
      expect(binary).toBe(path.join(cwd, "node_modules", ".bin", "turbo"));
    });

    it("falls back to global turbo when local binary is missing", () => {
      const fs = require("node:fs");
      fs.existsSync.mockReturnValue(false);
      setPlatform("linux");
      const { resolveTurboBinary } = require("./run-turbo");

      const binary = resolveTurboBinary("/repo");
      expect(binary).toBe("turbo");
      fs.existsSync.mockReturnValue(true);
    });
  });

  describe("runTurbo on Unix", () => {
    beforeEach(() => {
      setPlatform("linux");
    });

    it("returns 0 when turbo exits successfully", () => {
      const { spawnSync } = require("node:child_process");
      spawnSync.mockReturnValue({ status: 0 });
      const { runTurbo } = require("./run-turbo");

      const exitCode = runTurbo(["build"], "/repo");

      expect(exitCode).toBe(0);
      expect(spawnSync).toHaveBeenCalledTimes(1);
      expect(spawnSync).toHaveBeenCalledWith(
        expect.stringMatching(/node_modules[\\/]\.bin[\\/]turbo$/),
        ["build"],
        expect.objectContaining({
          cwd: "/repo",
          shell: false,
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
          shell: false,
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
          shell: false,
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

  describe("runTurbo on Windows", () => {
    beforeEach(() => {
      setPlatform("win32");
    });

    it("returns 0 when turbo exits successfully", () => {
      const { spawnSync } = require("node:child_process");
      spawnSync.mockReturnValue({ status: 0 });
      const { runTurbo } = require("./run-turbo");

      const exitCode = runTurbo(["build"], "C:\\repo");

      expect(exitCode).toBe(0);
      expect(spawnSync).toHaveBeenCalledTimes(1);
      expect(spawnSync).toHaveBeenCalledWith(
        "cmd.exe",
        [
          "/c",
          expect.stringMatching(/node_modules[\\/]\.bin[\\/]turbo\.cmd$/),
          "build",
        ],
        expect.objectContaining({
          cwd: "C:\\repo",
          shell: false,
          stdio: "inherit",
        }),
      );
    });

    it("falls back to cmd.exe /c pnpm -r run <task> when turbo exits with code 127", () => {
      const { spawnSync } = require("node:child_process");
      spawnSync
        .mockReturnValueOnce({ status: 127 })
        .mockReturnValueOnce({ status: 42 });
      const { runTurbo } = require("./run-turbo");

      const exitCode = runTurbo(["build"], "C:\\repo");

      expect(exitCode).toBe(42);
      expect(spawnSync).toHaveBeenCalledTimes(2);
      expect(spawnSync).toHaveBeenNthCalledWith(
        2,
        "cmd.exe",
        ["/c", "pnpm", "-r", "run", "build"],
        expect.objectContaining({
          cwd: "C:\\repo",
          shell: false,
          stdio: "inherit",
        }),
      );
    });

    it("falls back to cmd.exe /c pnpm -r run <task> when turbo exits with code 3221225781", () => {
      const { spawnSync } = require("node:child_process");
      spawnSync
        .mockReturnValueOnce({ status: 3221225781 })
        .mockReturnValueOnce({ status: 7 });
      const { runTurbo } = require("./run-turbo");

      const exitCode = runTurbo(["dev"], "C:\\repo");

      expect(exitCode).toBe(7);
      expect(spawnSync).toHaveBeenCalledTimes(2);
      expect(spawnSync).toHaveBeenNthCalledWith(
        2,
        "cmd.exe",
        ["/c", "pnpm", "-r", "run", "dev"],
        expect.objectContaining({
          cwd: "C:\\repo",
          shell: false,
          stdio: "inherit",
        }),
      );
    });

    it("returns unknown non-zero turbo status without falling back", () => {
      const { spawnSync } = require("node:child_process");
      spawnSync.mockReturnValue({ status: 1 });
      const { runTurbo } = require("./run-turbo");

      const exitCode = runTurbo(["build"], "C:\\repo");

      expect(exitCode).toBe(1);
      expect(spawnSync).toHaveBeenCalledTimes(1);
      expect(spawnSync).not.toHaveBeenCalledWith(
        "cmd.exe",
        ["/c", "pnpm", "-r", "run", "build"],
        expect.anything(),
      );
    });

    it("returns 1 when turbo result has no status", () => {
      const { spawnSync } = require("node:child_process");
      spawnSync.mockReturnValue({});
      const { runTurbo } = require("./run-turbo");

      const exitCode = runTurbo(["build"], "C:\\repo");

      expect(exitCode).toBe(1);
    });
  });

  describe("runTurbo validation", () => {
    it("rejects a task containing shell metacharacters", () => {
      const { spawnSync } = require("node:child_process");
      const { runTurbo } = require("./run-turbo");

      const exitCode = runTurbo(["build && echo injected"], "/repo");

      expect(exitCode).toBe(1);
      expect(spawnSync).not.toHaveBeenCalled();
    });

    it("rejects an empty task list", () => {
      const { spawnSync } = require("node:child_process");
      const { runTurbo } = require("./run-turbo");

      const exitCode = runTurbo([], "/repo");

      expect(exitCode).toBe(1);
      expect(spawnSync).not.toHaveBeenCalled();
    });

    it("rejects a disallowed task", () => {
      const { spawnSync } = require("node:child_process");
      const { runTurbo } = require("./run-turbo");

      const exitCode = runTurbo(["malicious"], "/repo");

      expect(exitCode).toBe(1);
      expect(spawnSync).not.toHaveBeenCalled();
    });
  });
});
