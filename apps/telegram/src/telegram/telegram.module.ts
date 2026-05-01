import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TelegramController } from './telegram.controller';
import { TelegramService } from './telegram.service';
import { TelegramBotClient } from './telegram-bot.client';

@Module({
  controllers: [TelegramController],
  providers: [
    TelegramService,
    TelegramBotClient,
    {
      provide: 'TELEGRAM_BOT_CONFIG',
      useFactory: (configService: ConfigService) => ({
        token: configService.get<string>('telegram.bot.token'),
        chatId: configService.get<string>('telegram.bot.chatId'),
        apiUrl: configService.get<string>('telegram.bot.apiUrl'),
      }),
      inject: [ConfigService],
    },
  ],
})
export class TelegramModule {}
