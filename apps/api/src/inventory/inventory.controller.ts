import {
  Controller, Get, Post, Body, Param, Query,
  UseGuards, Request, ParseUUIDPipe, UsePipes, ValidationPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { InventoryService } from './inventory.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AdjustInventoryDto } from './dto/adjust-inventory.dto';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { ReservationActionDto } from './dto/reservation-action.dto';

@ApiTags('Inventory')
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
@UseGuards(JwtAuthGuard)
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  /** Inventory transaction history for tenant */
  @ApiOperation({ summary: 'List inventory transactions' })
  @Get('transactions')
  getTransactions(
    @Request() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('productId') productId?: string,
    @Query('type') type?: string,
  ) {
    return this.inventoryService.getTransactions(req.user.tenantId, {
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
      productId,
      type,
    });
  }

  /** Manual stock adjustment */
  @ApiOperation({ summary: 'Adjust stock for a product' })
  @Post('adjust')
  adjust(
    @Request() req: any,
    @Body() body: AdjustInventoryDto,
  ) {
    return this.inventoryService.adjust(
      req.user.tenantId,
      req.user.sub,
      body.productId,
      body.quantity,
      body.type,
      body.notes,
      body.reference,
    );
  }

  /** List of products running low on stock */
  @ApiOperation({ summary: 'List low-stock products' })
  @Get('low-stock')
  getLowStock(@Request() req: any) {
    return this.inventoryService.getLowStock(req.user.tenantId);
  }

  /** Inventory summary overview */
  @ApiOperation({ summary: 'Get inventory summary' })
  @Get('summary')
  getSummary(@Request() req: any) {
    return this.inventoryService.getSummary(req.user.tenantId);
  }

  /** Reorder suggestions based on minStock/reorderQuantity */
  @ApiOperation({ summary: 'Get reorder suggestions' })
  @Get('reorder-suggestions')
  getReorderSuggestions(@Request() req: any) {
    return this.inventoryService.getReorderSuggestions(req.user.tenantId);
  }

  // ---------- Omnichannel Inventory Sync ----------

  /** Get available stock (after subtracting reservation + buffer) */
  @ApiOperation({ summary: 'Get available stock for a product' })
  @Get('available-stock/:productId')
  getAvailableStock(
    @Request() req: any,
    @Param('productId', ParseUUIDPipe) productId: string,
    @Query('storeId') storeId?: string,
  ) {
    return this.inventoryService.getAvailableStock(req.user.tenantId, productId, storeId);
  }

  /** Create reservation for marketplace order */
  @ApiOperation({ summary: 'Create a stock reservation' })
  @Post('reservations')
  createReservation(
    @Request() req: any,
    @Body() body: CreateReservationDto,
  ) {
    return this.inventoryService.createReservation(
      req.user.tenantId,
      body.storeId,
      body.externalOrderId,
      body.productId,
      body.quantity,
    );
  }

  /** Release reservation (when order is cancelled) */
  @ApiOperation({ summary: 'Release a stock reservation' })
  @Post('reservations/release')
  releaseReservation(
    @Request() req: any,
    @Body() body: ReservationActionDto,
  ) {
    return this.inventoryService.releaseReservation(req.user.tenantId, body.externalOrderId);
  }

  /** Consume reservation (when order is fulfilled) */
  @ApiOperation({ summary: 'Consume a stock reservation' })
  @Post('reservations/consume')
  consumeReservation(
    @Request() req: any,
    @Body() body: ReservationActionDto,
  ) {
    return this.inventoryService.consumeReservation(req.user.tenantId, body.externalOrderId);
  }

  /** Push available stock to marketplace */
  @ApiOperation({ summary: 'Push stock to a marketplace channel' })
  @Post('sync-channel-stock/:storeId')
  pushStockToMarketplace(
    @Request() req: any,
    @Param('storeId', ParseUUIDPipe) storeId: string,
  ) {
    return this.inventoryService.pushStockToMarketplace(req.user.tenantId, storeId);
  }

  /** Sync stock for all stores */
  @ApiOperation({ summary: 'Sync stock for all marketplace channels' })
  @Post('sync-all-stores-stock')
  syncAllStoresStock(@Request() req: any) {
    return this.inventoryService.syncAllStoresStock(req.user.tenantId);
  }
}
