import { throwError, of } from "rxjs";
import { SyncBenchmarkInterceptor } from "./sync-benchmark.interceptor";

const createContext = (request: any) =>
  ({
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  }) as any;

describe("SyncBenchmarkInterceptor", () => {
  beforeEach(() => {
    jest.spyOn(Date, "now").mockReturnValue(1000);
    jest.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("records successful pull sync metrics", (done) => {
    const benchmarkService = { record: jest.fn().mockResolvedValue(undefined) };
    const interceptor = new SyncBenchmarkInterceptor(benchmarkService as any);
    const request = {
      url: "/sync/pull",
      user: { tenantId: "tenant-1" },
      body: { clientId: "client-1", changes: { products: [{ id: "p-1" }, { id: "p-2" }] } },
    };
    jest.spyOn(Date, "now").mockReturnValueOnce(1000).mockReturnValueOnce(1042);

    interceptor.intercept(createContext(request), { handle: () => of({ accepted: true }) } as any).subscribe({
      complete: () => {
        expect(benchmarkService.record).toHaveBeenCalledWith(
          "tenant-1",
          "client-1",
          "pull",
          "success",
          42,
          2,
          JSON.stringify(request.body).length,
        );
        done();
      },
    });
  });

  it("records failed push sync metrics with fallback client id", (done) => {
    const benchmarkService = { record: jest.fn().mockResolvedValue(undefined) };
    const interceptor = new SyncBenchmarkInterceptor(benchmarkService as any);
    const request = {
      url: "/sync/push",
      user: {},
      body: { changes: {} },
    };
    jest.spyOn(Date, "now").mockReturnValueOnce(2000).mockReturnValueOnce(2025);

    interceptor.intercept(createContext(request), { handle: () => of({ accepted: false }) } as any).subscribe({
      complete: () => {
        expect(benchmarkService.record).toHaveBeenCalledWith(
          undefined,
          "unknown",
          "push",
          "failure",
          25,
          0,
          JSON.stringify(request.body).length,
        );
        done();
      },
    });
  });

  it("records conflict status on 409 errors", (done) => {
    const benchmarkService = { record: jest.fn().mockResolvedValue(undefined) };
    const interceptor = new SyncBenchmarkInterceptor(benchmarkService as any);
    const request = {
      url: "/sync/push",
      user: { tenantId: "tenant-1" },
      body: { clientId: "client-1", changes: { products: [] } },
    };
    jest.spyOn(Date, "now").mockReturnValueOnce(3000).mockReturnValueOnce(3015);

    interceptor
      .intercept(
        createContext(request),
        { handle: () => throwError(() => ({ response: { status: 409 } })) } as any,
      )
      .subscribe({
        error: () => {
          expect(benchmarkService.record).toHaveBeenCalledWith(
            "tenant-1",
            "client-1",
            "push",
            "conflict",
            15,
            0,
            JSON.stringify(request.body).length,
          );
          done();
        },
      });
  });

  it("records generic failure status on non-conflict errors", (done) => {
    const benchmarkService = { record: jest.fn().mockResolvedValue(undefined) };
    const interceptor = new SyncBenchmarkInterceptor(benchmarkService as any);
    const request = {
      url: "/sync/push",
      user: { tenantId: "tenant-1" },
      body: { clientId: "client-1", changes: { products: [] } },
    };
    jest.spyOn(Date, "now").mockReturnValueOnce(4000).mockReturnValueOnce(4030);

    interceptor
      .intercept(
        createContext(request),
        { handle: () => throwError(() => ({ response: { status: 500 } })) } as any,
      )
      .subscribe({
        error: () => {
          expect(benchmarkService.record).toHaveBeenCalledWith(
            "tenant-1",
            "client-1",
            "push",
            "failure",
            30,
            0,
            JSON.stringify(request.body).length,
          );
          done();
        },
      });
  });
});
