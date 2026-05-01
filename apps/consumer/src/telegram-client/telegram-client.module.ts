import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TelegramClientService } from './telegram-client.service';

@Module({
  providers: [
    TelegramClientService,
    {
      provide: 'TELEGRAM_SERVICE_URL',
      useFactory: (configService: ConfigService) =>
        configService.get<string>('consumer.telegram.serviceUrl'),
      inject: [ConfigService],
    },
  ],
  exports: [TelegramClientService],
})
export class TelegramClientModule {}
