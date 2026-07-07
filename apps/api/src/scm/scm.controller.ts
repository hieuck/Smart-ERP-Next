import { Controller, Get, Post, Patch, Param, ParseUUIDPipe, UseGuards, Request } from '@nestjs/common';
import { ScmService } from './scm.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Supply Chain Management')
@UseGuards(JwtAuthGuard)
@Controller('scm')
export class ScmController {
  constructor(private readonly scmService: ScmService) {}

  @ApiOperation({ summary: 'List reorder suggestions' })
  @Get('suggestions')
  listSuggestions(@Request() req: any) {
    return this.scmService.listSuggestions(req.user.tenantId);
  }

  @ApiOperation({ summary: 'Run AI reorder engine' })
  @Post('suggestions/run')
  runEngine(@Request() req: any) {
    return this.scmService.generateReorderSuggestions(req.user.tenantId);
  }

  @ApiOperation({ summary: 'Approve a reorder suggestion' })
  @Patch('suggestions/:id/approve')
  approve(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.scmService.approveSuggestion(req.user.tenantId, id);
  }
}
