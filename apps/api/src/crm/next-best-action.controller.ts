import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { NextBestActionService } from './next-best-action.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@Controller('crm/next-best-action')
@UseGuards(JwtAuthGuard)
export class NextBestActionController {
  constructor(private readonly nbaService: NextBestActionService) {}

  @Get('lead/:leadId')
  async getForLead(
    @Param('leadId') leadId: string,
    @CurrentUser() user: { tenantId: string; sub: string },
  ) {
    const action = await this.nbaService.getNextBestAction(leadId, user.tenantId);
    return action;
  }
}
