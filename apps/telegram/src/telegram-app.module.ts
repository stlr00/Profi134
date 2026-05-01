import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TelegramModule } from './telegram/telegram.module';
import telegramConfig from './config/telegram.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [telegramConfig],
      envFilePath: ['.env', 'apps/telegram/.env'],
    }),
    TelegramModule,
  ],
})
export class TelegramAppModule {}
