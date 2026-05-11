import { Controller, Post, Get, Query, UseGuards } from '@nestjs/common';
import { ClvService } from './clv.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@Controller('analytics/clv')
@UseGuards(JwtAuthGuard)
export class ClvController {
  constructor(private readonly clvService: ClvService) {}

  @Post('compute')
  async compute(@CurrentUser() user: { tenantId: string; sub: string }) {
    await this.clvService.computeAndStore(user.tenantId);
    return { message: 'CLV computation completed' };
  }

  @Get('predictions')
  async getPredictions(
    @CurrentUser() user: { tenantId: string },
    @Query('segment') segment?: string,
  ) {
    const predictions = await this.clvService.getLatestPredictions(user.tenantId, segment);
    return predictions;
  }

  @Get('summary')
  async getSummary(@CurrentUser() user: { tenantId: string }) {
    const summary = await this.clvService.getSegmentationSummary(user.tenantId);
    return summary;
  }
}
