import { Controller, Post, Body, Req, Get, UseInterceptors } from '@nestjs/common';
import { SyncService } from './sync.service';
import { SyncBenchmarkInterceptor } from '../../common/interceptors/sync-benchmark.interceptor';
import { RequestWithUser } from '../../common/interfaces/request-with-user.interface';

@Controller('sync')
@UseInterceptors(SyncBenchmarkInterceptor)
export class SyncController {
  constructor(private syncService: SyncService) {}

  @Post('pull')
  async pull(@Req() req: RequestWithUser, @Body() body: { clientId: string; vectorClock: Record<string, number> }) {
    return this.syncService.pull(req.user.tenantId, body.clientId, body.vectorClock);
  }

  @Post('push')
  async push(@Req() req: RequestWithUser, @Body() body: { clientId: string; changes: any }) {
    return this.syncService.push(req.user.tenantId, body.clientId, body.changes);
  }

  @Get('metadata')
  async getMetadata(@Req() req: RequestWithUser, @Body() body: { clientId: string }) {
    return this.syncService.getMetadata(req.user.tenantId, body.clientId);
  }
}
