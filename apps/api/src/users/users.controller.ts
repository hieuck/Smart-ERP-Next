import {
  Controller, Get, Post, Body, Patch, Param,
  Delete, UseGuards, Request, Query, ParseUUIDPipe,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  create(@Request() req: any, @Body() dto: CreateUserDto) {
    // Inject tenantId from JWT — users can only be created in their own tenant
    return this.usersService.create({ ...dto, tenantId: req.user.tenantId } as any);
  }

  @Get()
  findAll(@Request() req: any, @Query('search') search?: string) {
    return this.usersService.findAll(req.user.tenantId, search);
  }

  @Get('stats')
  getStats(@Request() req: any) {
    return this.usersService.getStats(req.user.tenantId);
  }

  @Get(':id')
  findOne(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.findOne(req.user.tenantId, id);
  }

  @Patch(':id')
  update(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.update(req.user.tenantId, id, dto);
  }

  @Delete(':id')
  remove(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.remove(req.user.tenantId, id);
  }
}
