import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { QueryProductDto } from './dto/query-product.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('products')
@UseGuards(JwtAuthGuard)
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  create(@Request() req: any, @Body() dto: CreateProductDto) {
    return this.productsService.create(req.user.tenantId, dto, req.user.sub);
  }

  @Get()
  findAll(@Request() req: any, @Query() query: QueryProductDto) {
    return this.productsService.findAll(req.user.tenantId, query);
  }

  @Get('sku/:sku')
  findBySku(@Request() req: any, @Param('sku') sku: string) {
    return this.productsService.findBySku(req.user.tenantId, sku);
  }

  @Get('export')
  async exportProducts(@Request() req: any, @Query() query: QueryProductDto) {
    const items = await this.productsService.findAllForExport(req.user.tenantId, query);
    return { items };
  }

  @Get(':id')
  findOne(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Query('lang') lang?: string,
  ) {
    return this.productsService.findOne(req.user.tenantId, id, lang);
  }

  @Patch(':id')
  update(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.productsService.update(req.user.tenantId, id, dto, req.user.sub);
  }

  @Delete(':id')
  remove(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.productsService.remove(req.user.tenantId, id, req.user.sub);
  }

  @Patch(':id/stock')
  adjustStock(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body()
    body: {
      quantity: number;
      type: 'IN' | 'OUT' | 'ADJUSTMENT';
      notes?: string;
      reference?: string;
    },
  ) {
    return this.productsService.adjustStock(
      req.user.tenantId,
      id,
      body.quantity,
      body.type,
      body.notes,
      body.reference,
      req.user.sub,
    );
  }

  @Post('import')
  @UseInterceptors(FileInterceptor('file'))
  async importProducts(
    @Request() req: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.productsService.importFromCsv(req.user.tenantId, file.buffer);
  }

  @Get(':id/transactions')
  getTransactions(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.productsService.getTransactions(req.user.tenantId, id);
  }
}
