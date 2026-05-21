import { Controller, Post, Body, Req, Get, Query, UseGuards, UseInterceptors } from '@nestjs/common';
import { SyncService } from './sync.service';
import { SyncBenchmarkInterceptor } from '../../common/interceptors/sync-benchmark.interceptor';
import { RequestWithUser } from '../../common/interfaces/request-with-user.interface';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('sync')
@UseGuards(JwtAuthGuard)
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
  async getMetadata(@Req() req: RequestWithUser, @Query('clientId') clientId = 'web-e2e') {
    return this.syncService.getMetadata(req.user.tenantId, clientId);
  }
}
