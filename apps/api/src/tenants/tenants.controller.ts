import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  ForbiddenException,
  ParseUUIDPipe,
} from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('tenants')
@UseGuards(JwtAuthGuard)
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  private resolveTenantId(req: { user?: { tenantId?: string } }): string {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      throw new ForbiddenException('Tenant context is required');
    }
    return tenantId;
  }

  private assertAdmin(req: { user?: { role?: string } }): void {
    if (req.user?.role !== 'admin') {
      throw new ForbiddenException('Insufficient permissions');
    }
  }

  @Post()
  create(@Request() req: { user?: { role?: string } }, @Body() createTenantDto: CreateTenantDto) {
    this.assertAdmin(req);
    return this.tenantsService.create(createTenantDto);
  }

  @Get()
  findAll(@Request() req: { user?: { tenantId?: string } }) {
    return this.tenantsService.findAllForTenant(this.resolveTenantId(req));
  }

  @Get(':id')
  findOne(
    @Request() req: { user?: { tenantId?: string } },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.tenantsService.findOneForTenant(this.resolveTenantId(req), id);
  }

  @Patch(':id')
  update(
    @Request() req: { user?: { tenantId?: string; role?: string } },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateTenantDto: UpdateTenantDto,
  ) {
    this.assertAdmin(req);
    return this.tenantsService.updateForTenant(this.resolveTenantId(req), id, updateTenantDto);
  }

  @Delete(':id')
  remove(
    @Request() req: { user?: { tenantId?: string; role?: string } },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    this.assertAdmin(req);
    return this.tenantsService.removeForTenant(this.resolveTenantId(req), id);
  }
}
