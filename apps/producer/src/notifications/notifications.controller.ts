import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Get,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { SendNotificationDto } from '@app/shared';
import { RabbitMQService } from '../rabbitmq/rabbitmq.service';

@ApiTags('notifications')
@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly rabbitMQService: RabbitMQService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Publish a notification event to RabbitMQ' })
  @ApiBody({ type: SendNotificationDto })
  @ApiResponse({
    status: HttpStatus.ACCEPTED,
    description: 'Notification event published to queue',
    schema: {
      properties: {
        id: { type: 'string', example: '550e8400-e29b-41d4-a716-446655440000' },
        status: { type: 'string', example: 'published' },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid request body',
  })
  @ApiResponse({
    status: HttpStatus.SERVICE_UNAVAILABLE,
    description: 'RabbitMQ connection not available',
  })
  async publish(@Body() dto: SendNotificationDto) {
    return this.notificationsService.sendNotification(dto);
  }

  @Get('health')
  @ApiOperation({ summary: 'Check service health and RabbitMQ connectivity' })
  @ApiResponse({
    status: HttpStatus.OK,
    schema: {
      properties: {
        status: { type: 'string', example: 'ok' },
        rabbitmq: { type: 'string', example: 'connected' },
        timestamp: { type: 'string' },
      },
    },
  })
  health() {
    return {
      status: 'ok',
      rabbitmq: this.rabbitMQService.isConnected ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString(),
    };
  }
}
