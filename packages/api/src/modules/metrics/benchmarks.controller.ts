import { Controller, Get, Req, Query } from '@nestjs/common';
import { BenchmarkService } from './benchmark.service';
import { RequestWithUser } from '../../common/interfaces/request-with-user.interface';

@Controller('admin/benchmarks')
export class BenchmarksController {
  constructor(private readonly benchmarkService: BenchmarkService) {}

  @Get('sync')
  async getSyncBenchmarks(@Req() req: RequestWithUser, @Query('hours') hours?: string) {
    const hoursNum = hours ? parseInt(hours, 10) : 24;
    return this.benchmarkService.getStats(req.user.tenantId, hoursNum);
  }
}
