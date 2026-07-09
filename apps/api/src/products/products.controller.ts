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
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { randomUUID } from 'crypto';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { QueryProductDto } from './dto/query-product.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Products')
@Controller('products')
@UseGuards(JwtAuthGuard)
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  create(@Request() req: any, @Body() dto: CreateProductDto) {
    return this.productsService.create(req.user.tenantId, dto, req.user.sub);
  }

  @Post('upload-image')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }))
  uploadImage(@Request() req: any, @UploadedFile() file: any) {
    if (!file) {
      throw new BadRequestException('Image file is required');
    }

    const allowedTypes: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'image/gif': 'gif',
    };
    const extension = allowedTypes[file.mimetype];
    if (!extension) {
      throw new BadRequestException('Only JPG, PNG, WEBP, and GIF images are allowed');
    }

    const tenantId = String(req.user.tenantId);
    const uploadDir = join(process.cwd(), 'uploads', 'products', tenantId);
    if (!existsSync(uploadDir)) mkdirSync(uploadDir, { recursive: true });

    const filename = `${randomUUID()}.${extension}`;
    const relativePath = `/uploads/products/${tenantId}/${filename}`;
    writeFileSync(join(uploadDir, filename), file.buffer);

    return {
      imageUrl: relativePath,
      filename,
      size: file.size,
      mimeType: file.mimetype,
    };
  }

  @Get()
  findAll(@Request() req: any, @Query() query: QueryProductDto) {
    return this.productsService.findAll(req.user.tenantId, query);
  }

  @Get('sku/:sku')
  findBySku(@Request() req: any, @Param('sku') sku: string) {
    return this.productsService.findBySku(req.user.tenantId, sku);
  }

  @Get('by-barcode/:code')
  findByBarcode(@Request() req: any, @Param('code') code: string) {
    return this.productsService.findByBarcode(req.user.tenantId, code);
  }

  @Get('export')
  async exportProducts(@Request() req: any, @Query() query: QueryProductDto) {
    const items = await this.productsService.findAllForExport(req.user.tenantId, query);
    return { items };
  }

  @Get('categories')
  findCategories(@Request() req: any) {
    return this.productsService.findCategories(req.user.tenantId);
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
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        const isCsv = file.mimetype === 'text/csv' || file.originalname?.toLowerCase().endsWith('.csv');
        cb(null, isCsv);
      },
    }),
  )
  async importProducts(
    @Request() req: any,
    @UploadedFile() file: any,
  ) {
    if (!file) {
      throw new BadRequestException('A valid CSV file up to 5 MB is required');
    }
    return this.productsService.importFromCsv(req.user.tenantId, file.buffer);
  }

  @Get(':id/transactions')
  getTransactions(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.productsService.getTransactions(req.user.tenantId, id);
  }
}
