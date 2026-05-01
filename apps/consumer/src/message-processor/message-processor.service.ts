import { Injectable, Logger } from '@nestjs/common';
import { NotificationEvent } from '@app/shared';
import { TelegramClientService } from '../telegram-client/telegram-client.service';

@Injectable()
export class MessageProcessorService {
  private readonly logger = new Logger(MessageProcessorService.name);

  constructor(private readonly telegramClient: TelegramClientService) {}

  async process(event: NotificationEvent): Promise<void> {
    this.logger.log(
      `Processing notification event ${event.id} (retryCount=${event.retryCount ?? 0})`,
    );

    try {
      await this.telegramClient.sendNotification(event);
      this.logger.log(`Successfully forwarded event ${event.id} to Telegram service`);
    } catch (error) {
      this.logger.error(
        `Failed to forward event ${event.id} to Telegram service`,
        error.message,
      );
      throw error;
    }
  }
}
