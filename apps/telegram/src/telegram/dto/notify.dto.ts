import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsObject, IsUUID } from 'class-validator';

export class NotifyDto {
  @ApiProperty({ description: 'Event unique identifier', format: 'uuid' })
  @IsUUID()
  id: string;

  @ApiProperty({ description: 'Notification message text' })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiPropertyOptional({ description: 'Notification title' })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;
}
