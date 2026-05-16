import { Controller, Get, Post, Body, UseGuards, Request, Param, Query, Patch } from '@nestjs/common';
import { TmsService } from './tms.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Transportation Management (TMS)')
@UseGuards(JwtAuthGuard)
@Controller('tms')
export class TmsController {
  constructor(private readonly tmsService: TmsService) {}

  @ApiOperation({ summary: 'List delivery trips' })
  @Get('trips')
  listTrips(@Request() req: any, @Query('driverId') driverId?: string) {
    return this.tmsService.listTrips(req.user.tenantId, driverId);
  }

  @ApiOperation({ summary: 'Get trip details and stops' })
  @Get('trips/:id')
  getTripDetails(@Request() req: any, @Param('id') id: string) {
    return this.tmsService.getTripDetails(req.user.tenantId, id);
  }

  @ApiOperation({ summary: 'Confirm delivery at a stop (PoD)' })
  @Patch('stops/:id/confirm')
  confirmDelivery(@Request() req: any, @Param('id') id: string, @Body() body: any) {
    return this.tmsService.confirmDelivery(req.user.tenantId, id, body);
  }

  @ApiOperation({ summary: 'Create a new trip' })
  @Post('trips')
  createTrip(@Request() req: any, @Body() body: any) {
    return this.tmsService.createTrip(req.user.tenantId, body);
  }

  @ApiOperation({ summary: 'List vehicles' })
  @Get('vehicles')
  listVehicles(@Request() req: any) {
    return this.tmsService.listVehicles(req.user.tenantId);
  }
}
