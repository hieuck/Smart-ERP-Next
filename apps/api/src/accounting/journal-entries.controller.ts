import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ParseUUIDPipe,
} from '@nestjs/common';
import { JournalEntriesService } from './journal-entries.service';
import { CreateJournalEntryDto } from './dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('accounting/entries')
export class JournalEntriesController {
  constructor(private readonly journalEntriesService: JournalEntriesService) {}

  @Post()
  create(@Request() req: any, @Body() dto: CreateJournalEntryDto) {
    return this.journalEntriesService.create(req.user.tenantId, req.user.sub, dto);
  }

  @Get()
  findAll(
    @Request() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('isPosted') isPosted?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    return this.journalEntriesService.findAll(req.user.tenantId, {
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
      isPosted: isPosted === 'true',
      fromDate: fromDate ? new Date(fromDate) : undefined,
      toDate: toDate ? new Date(toDate) : undefined,
    });
  }

  @Get('trial-balance')
  trialBalance(@Request() req: any, @Query('fromDate') fromDate?: string, @Query('toDate') toDate?: string) {
    return this.journalEntriesService.getTrialBalance(
      req.user.tenantId,
      fromDate ? new Date(fromDate) : undefined,
      toDate ? new Date(toDate) : undefined,
    );
  }

  @Get(':id')
  findOne(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.journalEntriesService.findOne(req.user.tenantId, id);
  }

  @Post(':id/post')
  post(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.journalEntriesService.post(req.user.tenantId, req.user.sub, id);
  }

  @Post(':id/reverse')
  reverse(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { reason?: string },
  ) {
    return this.journalEntriesService.reverse(req.user.tenantId, req.user.sub, id, body.reason);
  }
}
