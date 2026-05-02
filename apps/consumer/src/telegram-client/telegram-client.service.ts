import { Injectable, Logger, Inject } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { NotificationEvent } from '@app/shared';

@Injectable()
export class TelegramClientService {
  private readonly logger = new Logger(TelegramClientService.name);
  private readonly httpClient: AxiosInstance;

  constructor(
    @Inject('TELEGRAM_SERVICE_URL') private readonly serviceUrl: string,
  ) {
    this.httpClient = axios.create({
      baseURL: serviceUrl,
      timeout: 10000,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  async sendNotification(event: NotificationEvent): Promise<void> {
    try {
      await this.httpClient.post('/telegram/notify', {
        id: event.id,
        message: event.message,
        title: event.title,
        metadata: event.metadata,
      });
    } catch (error) {
      const status = error?.response?.status;
      const message = error?.response?.data?.message || error.message;
      this.logger.error(
        `Telegram service request failed for event ${event.id}: [${status}] ${message}`,
      );
      throw new Error(`Telegram service unavailable: ${message}`);
    }
  }
}
