import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Get,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { TelegramService } from './telegram.service';
import { NotifyDto } from './dto/notify.dto';
import { TelegramBotClient } from './telegram-bot.client';

@ApiTags('telegram')
@Controller('telegram')
export class TelegramController {
  constructor(
    private readonly telegramService: TelegramService,
    private readonly botClient: TelegramBotClient,
  ) {}

  @Post('notify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send a notification via Telegram Bot' })
  @ApiBody({ type: NotifyDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Notification sent successfully',
    schema: {
      properties: {
        success: { type: 'boolean', example: true },
        eventId: {
          type: 'string',
          example: '550e8400-e29b-41d4-a716-446655440000',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid request body',
  })
  @ApiResponse({
    status: HttpStatus.SERVICE_UNAVAILABLE,
    description: 'Telegram Bot API is unavailable',
  })
  async notify(@Body() dto: NotifyDto) {
    await this.telegramService.sendNotification(dto);
    return { success: true, eventId: dto.id };
  }

  @Get('health')
  @ApiOperation({ summary: 'Check Telegram service health' })
  @ApiResponse({
    status: HttpStatus.OK,
    schema: {
      properties: {
        status: { type: 'string', example: 'ok' },
        timestamp: { type: 'string' },
      },
    },
  })
  health() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
