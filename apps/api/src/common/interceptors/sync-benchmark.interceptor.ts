import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { BenchmarkService } from '../../modules/metrics/benchmark.service';
import { RequestWithUser } from '../interfaces/request-with-user.interface';

@Injectable()
export class SyncBenchmarkInterceptor implements NestInterceptor {
  constructor(private readonly benchmarkService: BenchmarkService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest<RequestWithUser>();
    const endpoint = req.url.includes('pull') ? 'pull' : 'push';
    const tenantId = req.user?.tenantId;
    const clientId = req.body?.clientId || 'unknown';
    const start = Date.now();
    let changesCount = 0;
    if (req.body?.changes?.products) changesCount = req.body.changes.products.length;
    const size = JSON.stringify(req.body ?? {}).length;

    if (!tenantId) {
      return next.handle();
    }

    return next.handle().pipe(
      tap({
        next: (res: any) => {
          const duration = Date.now() - start;
          const status = res?.accepted ? 'success' : 'failure';
          this.benchmarkService.record(tenantId, clientId, endpoint, status, duration, changesCount, size).catch(console.error);
        },
        error: (err: any) => {
          const duration = Date.now() - start;
          const status = err?.response?.status === 409 ? 'conflict' : 'failure';
          this.benchmarkService.record(tenantId, clientId, endpoint, status, duration, changesCount, size).catch(console.error);
        },
      }),
    );
  }
}
