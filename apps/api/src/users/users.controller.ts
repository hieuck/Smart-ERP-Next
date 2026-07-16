import {
  Controller, Get, Post, Body, Patch, Param,
  Delete, UseGuards, Request, Query, ParseUUIDPipe,
  HttpCode, BadRequestException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { changePasswordSchema } from '@smart-erp/validation';
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
  findAll(
    @Request() req: any,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.usersService.findAll(req.user.tenantId, {
      search,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get('me')
  getMe(@Request() req: any) {
    return this.usersService.findOne(req.user.tenantId, req.user.sub);
  }

  @Get('stats')
  getStats(@Request() req: any) {
    return this.usersService.getStats(req.user.tenantId);
  }

  @Post('change-password')
  @HttpCode(204)
  async changePassword(@Request() req: any, @Body() body: { currentPassword: string; newPassword: string }) {
    const parsed = changePasswordSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.errors.map(e => e.message).join('; '));
    }
    await this.usersService.changePassword(req.user.sub, parsed.data.currentPassword, parsed.data.newPassword);
  }

  @Get(':id')
  findOne(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.findOne(req.user.tenantId, id);
  }

  // NOTE: @Patch('profile') must be declared before @Patch(':id'). NestJS
  // (Express) matches routes in declaration order, so if ':id' comes first a
  // request to PATCH /users/profile matches the :id param as the literal
  // string "profile" and is rejected by ParseUUIDPipe (issue #257).
  @Patch('profile')
  async updateProfile(@Request() req: any, @Body() dto: UpdateUserDto) {
    return this.usersService.updateProfile(req.user.tenantId, req.user.sub, dto);
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
