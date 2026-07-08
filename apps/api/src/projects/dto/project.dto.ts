import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  Min,
  Max,
  IsUUID,
  IsEnum,
  IsInt,
} from 'class-validator';

export class CreateProjectDto {
  @ApiProperty({ description: 'Project name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ description: 'Project description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Customer ID' })
  @IsOptional()
  @IsString()
  customerId?: string;

  @ApiPropertyOptional({ description: 'Project status', enum: ['planning', 'active', 'on_hold', 'completed', 'cancelled'] })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: 'Planned start date (ISO string)' })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Planned end date (ISO string)' })
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Project budget' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  budget?: number;

  @ApiPropertyOptional({ description: 'Currency code' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ description: 'Project manager user ID' })
  @IsOptional()
  @IsString()
  managerId?: string;
}

export class SubmitTimesheetDto {
  @ApiProperty({ description: 'Date of the timesheet entry (ISO string)' })
  @IsString()
  @IsNotEmpty()
  date: string;

  @ApiProperty({ description: 'Hours worked' })
  @IsNumber()
  @Min(0)
  @Max(24)
  hours: number;

  @ApiPropertyOptional({ description: 'Description of work' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Task ID this timesheet belongs to' })
  @IsOptional()
  @IsString()
  taskId?: string;

  @ApiPropertyOptional({ description: 'Whether the hours are billable (1 = true, 0 = false)' })
  @IsOptional()
  @IsInt()
  isBillable?: number;
}

export class CreateProjectTaskDto {
  @ApiProperty({ description: 'Task title' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ description: 'Task description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Task status', enum: ['todo', 'in_progress', 'review', 'done', 'blocked'] })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: 'Task priority', enum: ['low', 'medium', 'high', 'urgent'] })
  @IsOptional()
  @IsString()
  priority?: string;

  @ApiPropertyOptional({ description: 'Assigned user ID' })
  @IsOptional()
  @IsString()
  assignedToId?: string;

  @ApiPropertyOptional({ description: 'Due date (ISO string)' })
  @IsOptional()
  @IsString()
  dueDate?: string;

  @ApiPropertyOptional({ description: 'Estimated hours' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  estimatedHours?: number;
}

export class AllocateResourceDto {
  @ApiProperty({ description: 'User ID to allocate' })
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({ description: 'Role in the project' })
  @IsString()
  @IsNotEmpty()
  role: string;

  @ApiProperty({ description: 'Allocation percentage (0-100)' })
  @IsInt()
  @Min(0)
  @Max(100)
  allocationPercentage: number;
}
